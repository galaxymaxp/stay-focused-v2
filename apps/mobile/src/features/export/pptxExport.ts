import { strToU8, zipSync } from 'fflate';
import { styledRuns, type ExportBlock, type ExportDocument } from './exportLayout';

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const EMU = 914400;
const groupRoot = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
const paragraph = (block: ExportBlock, size: number) => {
  const bullet = block.kind === 'bullet' ? '<a:buChar char="•"/>' : '<a:buNone/>';
  const runs = styledRuns(block).map(part => {
    const b = part.style === 'bold' || part.style === 'highlight' || block.kind === 'heading' || block.kind === 'question';
    const color = part.style === 'highlight' ? '126747' : '24332F';
    return `<a:r><a:rPr lang="en-US" sz="${size * 100}"${b ? ' b="1"' : ''}${part.style === 'underline' ? ' u="sng"' : ''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${esc(part.text)}</a:t></a:r>`;
  }).join('');
  return `<a:p><a:pPr algn="l" marL="${block.kind === 'bullet' ? 285750 : 0}" indent="${block.kind === 'bullet' ? -190500 : 0}">${bullet}</a:pPr>${runs}<a:endParaRPr lang="en-US"/></a:p>`;
};
const shape = (id: number, name: string, x: number, y: number, w: number, h: number, blocks: readonly ExportBlock[], size: number) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${Math.round(x * EMU)}" y="${Math.round(y * EMU)}"/><a:ext cx="${Math.round(w * EMU)}" cy="${Math.round(h * EMU)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"/><a:lstStyle/>${blocks.map(block => paragraph(block, size)).join('')}</p:txBody></p:sp>`;
const circle = (id: number, index: number) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Topic ${index}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${Math.round(0.6 * EMU)}" y="${Math.round(0.64 * EMU)}"/><a:ext cx="${Math.round(0.55 * EMU)}" cy="${Math.round(0.55 * EMU)}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="185A40"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="1300" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>${index}</a:t></a:r></a:p></p:txBody></p:sp>`;

type Slide = { title: string; blocks: ExportBlock[]; topic: number };
function slidesFrom(document: ExportDocument): Slide[] {
  const slides: Slide[] = [{ title: document.title, blocks: document.blocks.filter(block => block.kind === 'subtitle'), topic: 0 }];
  let topic = 0;
  for (const block of document.blocks) {
    if (block.kind === 'brand' || block.kind === 'title' || block.kind === 'subtitle') continue;
    if (block.kind === 'heading' || block.kind === 'question') {
      topic += 1; slides.push({ title: block.text.replace(/^Topic \d+ · /, ''), blocks: [], topic }); continue;
    }
    const content = block.kind === 'table' && block.rows ? block.rows.map(row => row.join('  |  ')).join('\n') : block.text;
    const words = content.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    let chunk = '';
    for (const word of words) {
      if (chunk && chunk.length + word.length + 1 > 420) { chunks.push(chunk); chunk = ''; }
      chunk += `${chunk ? ' ' : ''}${word}`;
    }
    if (chunk) chunks.push(chunk);
    for (const part of chunks) {
      let slide = slides[slides.length - 1]!;
      if (slide.blocks.reduce((sum, item) => sum + item.text.length, 0) + part.length > 420) {
        slide = { title: `${slide.title} (cont.)`, blocks: [], topic: slide.topic }; slides.push(slide);
      }
      slide.blocks.push({ kind: block.kind === 'table' ? 'body' : block.kind, text: part });
    }
  }
  return slides;
}

export function createStudyPptx(document: ExportDocument): Uint8Array {
  const slides = slidesFrom(document);
  const files: Record<string, Uint8Array> = {};
  const c = (value: string) => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${value}`);
  files['[Content_Types].xml'] = c(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`);
  files['_rels/.rels'] = c(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);
  files['ppt/presentation.xml'] = c(`<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  files['ppt/_rels/presentation.xml.rels'] = c(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}</Relationships>`);
  files['ppt/slideMasters/slideMaster1.xml'] = c(`<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree>${groupRoot}</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`);
  files['ppt/slideMasters/_rels/slideMaster1.xml.rels'] = c(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`);
  files['ppt/slideLayouts/slideLayout1.xml'] = c(`<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="blank" preserve="1"><p:cSld><p:spTree>${groupRoot}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  files['ppt/slideLayouts/_rels/slideLayout1.xml.rels'] = c(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
  files['ppt/theme/theme1.xml'] = c(`<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Stay Focused"><a:themeElements><a:clrScheme name="Study"><a:dk1><a:srgbClr val="24332F"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="185A40"/></a:dk2><a:lt2><a:srgbClr val="F3F7F3"/></a:lt2><a:accent1><a:srgbClr val="185A40"/></a:accent1><a:accent2><a:srgbClr val="78A28A"/></a:accent2><a:accent3><a:srgbClr val="D8E8D5"/></a:accent3><a:accent4><a:srgbClr val="A5C5AB"/></a:accent4><a:accent5><a:srgbClr val="4B8062"/></a:accent5><a:accent6><a:srgbClr val="E3EEDE"/></a:accent6><a:hlink><a:srgbClr val="185A40"/></a:hlink><a:folHlink><a:srgbClr val="185A40"/></a:folHlink></a:clrScheme><a:fontScheme name="Arial"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="Study"><a:fillStyleLst><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
  slides.forEach((slide, i) => {
    const titleSize = slide.title.length > 75 ? 22 : slide.title.length > 45 ? 27 : slide.topic ? 32 : 38;
    const title = shape(2, 'Title', slide.topic ? 1.35 : 0.75, slide.topic ? 0.68 : 1.25, 11.2, 0.7, [{ kind: 'heading', text: slide.title }], titleSize);
    const body = shape(3, 'Study content', 0.8, slide.topic ? 1.7 : 2.35, 11.7, 4.8, slide.blocks, slide.topic ? 18 : 22);
    const footer = shape(4, 'Footer', 0.8, 7.05, 11.7, 0.22, [{ kind: 'subtitle', text: `Stay Focused  ·  ${i + 1} / ${slides.length}` }], 10);
    files[`ppt/slides/slide${i + 1}.xml`] = c(`<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree>${groupRoot}${slide.topic ? circle(5, slide.topic) : ''}${title}${body}${footer}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
    files[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = c(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`);
  });
  return zipSync(files, { level: 6 });
}
