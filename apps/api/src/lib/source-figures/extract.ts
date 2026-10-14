import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { extractOfficeStructure } from '../activity-maker/office-extraction';
import { finalizeStructuredBlockDrafts } from '../canvas-structured-blocks';

export const FIGURE_MIN_DIMENSION = 128;
export const FIGURE_MIN_AREA = 32768;
export const FIGURE_MAX_PIXELS = 16_000_000;
export const FIGURE_MAX_BYTES = 5 * 1024 * 1024;
export const FIGURE_MATERIAL_CAP = 60;
export const FIGURE_REPEAT_MIN_LOCATIONS = 3;
export const FIGURE_REPEAT_SHARE = 0.5;
export const FIGURE_MIN_PAGE_SHARE = 0.01;
export const FIGURE_MAX_PAGE_SHARE = 0.85;
export const FIGURE_EXTRACTION_TIMEOUT_MS = 15000;
const MAX_IMAGE_OPERATIONS = 2000;
export const FIGURE_MAX_CANDIDATE_BYTES = 40 * 1024 * 1024;

export interface ExtractedFigure {
  readonly bytes: Uint8Array; readonly mime: 'image/png' | 'image/jpeg';
  readonly width: number; readonly height: number; readonly sha256: string;
  readonly pageNumber?: number; readonly slideNumber?: number; readonly blockId?: string;
  readonly position: number;
}
export const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export function filterFigures(figures: readonly ExtractedFigure[], locationCount: number): readonly ExtractedFigure[] {
  const locations = new Map<string, Set<string>>();
  for (const f of figures) {
    const seen = locations.get(f.sha256) ?? new Set<string>();
    seen.add(String(f.pageNumber ?? f.slideNumber ?? f.blockId)); locations.set(f.sha256, seen);
  }
  const seen = new Set<string>();
  return figures.filter(f => {
    const repeats = locations.get(f.sha256)!.size;
    const key = `${f.sha256}:${f.pageNumber ?? f.slideNumber ?? f.blockId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return f.width >= FIGURE_MIN_DIMENSION && f.height >= FIGURE_MIN_DIMENSION &&
      f.width * f.height >= FIGURE_MIN_AREA && f.width * f.height <= FIGURE_MAX_PIXELS &&
      f.bytes.length > 0 && f.bytes.length <= FIGURE_MAX_BYTES &&
      !(repeats >= FIGURE_REPEAT_MIN_LOCATIONS && repeats / locationCount > FIGURE_REPEAT_SHARE);
  }).slice(0, FIGURE_MATERIAL_CAP);
}

/** PNG/JPEG only. Office vectors and external relationships are never fetched. */
export function rasterDimensions(bytes: Uint8Array): { width: number; height: number; mime: 'image/png' | 'image/jpeg' } | null {
  const b = Buffer.from(bytes);
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii',12,16) === 'IHDR')
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), mime: 'image/png' };
  if (b[0] !== 255 || b[1] !== 216) return null;
  for (let offset = 2; offset + 4 < b.length;) {
    if (b[offset++] !== 255) return null;
    while (b[offset] === 255) offset++;
    const marker = b[offset++];
    if (marker === 217 || marker === 218) return null;
    if (marker === 1 || (marker !== undefined && marker >= 208 && marker <= 215)) continue;
    const length = b.readUInt16BE(offset);
    if (length < 2 || offset + length > b.length) return null;
    if (marker !== undefined && [192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
      if (length < 7) return null;
      return { width: b.readUInt16BE(offset+5), height: b.readUInt16BE(offset+3), mime: 'image/jpeg' };
    }
    offset += length;
  }
  return null;
}

// Pure JavaScript PNG encoding of the exact decoded raster; no rendering/enhancement.
export function encodeRgbaPng(data: Uint8Array, width: number, height: number): Uint8Array {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      width * height > FIGURE_MAX_PIXELS || data.length !== width * height * 4) throw new Error('figure_pixels_invalid');
  const scan = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) scan.set(data.subarray(y*width*4,(y+1)*width*4), y*(width*4+1)+1);
  function chunk(type: string, payload: Uint8Array): Buffer {
    const b = Buffer.alloc(payload.length+12); b.writeUInt32BE(payload.length,0); b.write(type,4,'ascii'); b.set(payload,8);
    let crc = 0xffffffff;
    for (const byte of b.subarray(4,-4)) { crc ^= byte; for(let i=0;i<8;i++) crc = (crc>>>1) ^ ((crc&1) ? 0xedb88320 : 0); }
    b.writeUInt32BE((crc^0xffffffff)>>>0,b.length-4); return b;
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width,0); header.writeUInt32BE(height,4); header[8]=8; header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scan)),chunk('IEND',new Uint8Array())]);
}

export async function extractFigures(bytes: Uint8Array, kind: 'pdf' | 'pptx' | 'docx'): Promise<readonly ExtractedFigure[]> {
  if (bytes.length > 20 * 1024 * 1024) throw new Error('figure_source_too_large');
  if (kind !== 'pdf') {
    const office = extractOfficeStructure(bytes,kind,true);
    const figures: ExtractedFigure[] = [];
    // Ordinals are the same splitter used by accepted Canvas block manifests.
    const ordinalFor = (index: number) => finalizeStructuredBlockDrafts({ drafts: office.drafts.slice(0,index), sourceOrdinal: 1 }).length;
    for (const [position, anchor] of office.anchors.entries()) {
      if (position >= MAX_IMAGE_OPERATIONS) throw new Error('figure_operations_limit');
      const image = office.parts[anchor.path]; if (!image || image.length > FIGURE_MAX_BYTES) continue;
      const dimensions = rasterDimensions(image); if (!dimensions) continue;
      figures.push({ bytes:image,sha256:digest(image),...dimensions,position,
        ...(anchor.slideNumber ? {slideNumber:anchor.slideNumber} : {blockId:`block-${ordinalFor(anchor.blockOrdinal!)}`}) });
    }
    return filterFigures(figures, office.drafts.length);
  }
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({data:bytes.slice(),isOffscreenCanvasSupported:false,isImageDecoderSupported:false,
    useSystemFonts:false,disableFontFace:true,isEvalSupported:false});
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { timedOut = true; reject(new Error('figure_timeout')); }, FIGURE_EXTRACTION_TIMEOUT_MS);
  });
  try {
    return await Promise.race([deadline, (async () => {
    const pdf = await task.promise; if (pdf.numPages > 100) throw new Error('figure_pages_invalid');
    const figures: ExtractedFigure[] = []; let operations = 0; let candidateBytes = 0;
    for (let number=1; number<=pdf.numPages; number++) {
      if (timedOut) throw new Error('figure_timeout');
      const page = await pdf.getPage(number); const list = await page.getOperatorList();
      const viewport = page.getViewport({scale:1});
      let matrix = [1,0,0,1,0,0]; const stack: number[][] = [];
      for (let i=0;i<list.fnArray.length;i++) {
        if (timedOut) throw new Error('figure_timeout');
        const op = list.fnArray[i]; const args: unknown[] = list.argsArray[i];
        if(op===OPS.save) { stack.push([...matrix]); continue; }
        if(op===OPS.restore) { matrix=stack.pop()??[1,0,0,1,0,0]; continue; }
        if(op===OPS.transform && args.length===6 && args.every(v=>typeof v==='number')) {
          const [a,b,c,d,e,f] = args as number[]; const m=matrix;
          matrix=[m[0]!*a!+m[2]!*b!,m[1]!*a!+m[3]!*b!,m[0]!*c!+m[2]!*d!,m[1]!*c!+m[3]!*d!,m[0]!*e!+m[2]!*f!+m[4]!,m[1]!*e!+m[3]!*f!+m[5]!]; continue;
        }
        if(op!==OPS.paintImageXObject && op!==OPS.paintInlineImageXObject) continue;
        if(++operations>MAX_IMAGE_OPERATIONS) throw new Error('figure_operations_limit');
        const area=Math.abs(matrix[0]!*matrix[3]!-matrix[1]!*matrix[2]!)/(viewport.width*viewport.height);
        if(area<FIGURE_MIN_PAGE_SHARE || area>=FIGURE_MAX_PAGE_SHARE) continue; // scanned page/background fallback
        const id=args[0];
        const value: unknown = op===OPS.paintInlineImageXObject ? id : typeof id==='string'
          ? await new Promise(resolve=>(id.startsWith('g_')?page.commonObjs:page.objs).get(id,resolve)) : null;
        if(!value || typeof value!=='object') continue;
        const image=value as Record<string,unknown>;
        const {width,height,kind,data}=image;
        if(typeof width!=='number' || typeof height!=='number' || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
          width<FIGURE_MIN_DIMENSION || height<FIGURE_MIN_DIMENSION || width*height<FIGURE_MIN_AREA || width*height>FIGURE_MAX_PIXELS ||
          !(data instanceof Uint8Array || data instanceof Uint8ClampedArray) || ![1,2,3].includes(Number(kind))) continue;
        const rgba=new Uint8Array(width*height*4);
        if(kind===3 && data.length===rgba.length) rgba.set(data);
        else if(kind===2 && data.length===width*height*3) {
          for(let p=0;p<width*height;p++) { rgba.set(data.subarray(p*3,p*3+3),p*4); rgba[p*4+3]=255; }
        } else if(kind===1 && data.length===Math.ceil(width/8)*height) {
          for(let y=0;y<height;y++) for(let x=0;x<width;x++) {const pixel=(y*width+x)*4;const shade=(data[y*Math.ceil(width/8)+(x>>3)]!&(128>>(x&7)))?255:0;rgba.set([shade,shade,shade,255],pixel);}
        } else continue;
        const png=encodeRgbaPng(rgba,width,height);
        candidateBytes += png.length;
        if (candidateBytes > FIGURE_MAX_CANDIDATE_BYTES) throw new Error('figure_candidate_bytes_limit');
        figures.push({bytes:png,mime:'image/png',sha256:digest(png),width,height,pageNumber:number,position:operations-1});
      }
      page.cleanup();
    }
    return filterFigures(figures,pdf.numPages);
    })()]);
  } finally { clearTimeout(timer); await task.destroy(); }
}
