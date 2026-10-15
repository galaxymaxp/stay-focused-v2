import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { zipSync, strToU8 } from 'fflate';
import { digest, encodeRgbaPng, extractFigures, filterFigures, FIGURE_MATERIAL_CAP, FIGURE_MAX_BYTES, rasterDimensions } from './extract';
import { extractOfficeStructure } from '../activity-maker/office-extraction';

function png(width=256,height=160,shade=100) { const rgba=new Uint8Array(width*height*4); for(let i=0;i<rgba.length;i+=4) rgba.set([shade,80,180,255],i); return encodeRgbaPng(rgba,width,height); }
const wrap=(body:string)=>`<p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r">${body}</p:sld>`;
const slide=(id:string)=>wrap(`<p:sp><p:txBody><a:p><a:r><a:t>Identical title</a:t></a:r></a:p></p:txBody></p:sp><p:pic><a:blip r:embed="${id}"/></p:pic>`);
const rel=(id:string,target:string)=>`<Relationships><Relationship Id="${id}" Target="${target}"/></Relationships>`;
describe('bounded grounded raster extraction',()=>{
  it('keeps a real PDF figure while dropping repeated logos and tiny icons',async()=>{
    const pdf=await PDFDocument.create();
    const figure=await pdf.embedPng(png());const logo=await pdf.embedPng(png(256,160,30));const tiny=await pdf.embedPng(png(16,16));
    for(let n=0;n<3;n++) {const page=pdf.addPage([600,800]);page.drawImage(logo,{x:20,y:650,width:150,height:100});page.drawImage(tiny,{x:20,y:20,width:16,height:16});
      if(n===1) page.drawImage(figure,{x:50,y:250,width:400,height:250});}
    const result=await extractFigures(await pdf.save(),'pdf');
    expect(result).toHaveLength(1);expect(result[0]).toMatchObject({pageNumber:2,width:256,height:160,mime:'image/png'});
    expect(rasterDimensions(result[0]!.bytes)).toMatchObject({width:256,height:160});
  });
  it('returns no figure for vector-only and full-page scanned PDFs',async()=>{
    const pdf=await PDFDocument.create();pdf.addPage([600,800]).drawRectangle({x:50,y:50,width:300,height:300});
    const scan=await pdf.embedPng(png(600,800));pdf.addPage([600,800]).drawImage(scan,{x:0,y:0,width:600,height:800});
    expect(await extractFigures(await pdf.save(),'pdf')).toEqual([]);
  });
  it('keeps separate idempotent positions for the same figure on two pages',async()=>{
    const pdf=await PDFDocument.create();const figure=await pdf.embedPng(png());
    for(let n=0;n<2;n++) pdf.addPage([600,800]).drawImage(figure,{x:50,y:250,width:400,height:250});
    const figures=await extractFigures(await pdf.save(),'pdf');
    expect(figures.map(f=>[f.pageNumber,f.position])).toEqual([[1,0],[2,1]]);
    expect(figures[0]!.sha256).toBe(figures[1]!.sha256);
  });
  it('keeps Office text preparation independent of broken image relationships',()=>{
    const zip=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="w"><w:body><w:p><w:r><w:t>Accepted text</w:t></w:r></w:p></w:body></w:document>'),
      'word/_rels/document.xml.rels':strToU8('broken image relationship')});
    expect(extractOfficeStructure(zip,'docx').text).toBe('Accepted text');
    expect(()=>extractOfficeStructure(zip,'docx',true)).toThrow('office_xml_invalid');
  });
  it('maps PPTX media in presentation relationship order, independent of filenames/titles',async()=>{
    const parts={
      'ppt/presentation.xml':strToU8('<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId r:id="second"/><p:sldId r:id="first"/></p:sldIdLst></p:presentation>'),
      'ppt/_rels/presentation.xml.rels':strToU8('<Relationships><Relationship Id="first" Target="slides/slide1.xml"/><Relationship Id="second" Target="slides/slide2.xml"/></Relationships>'),
      'ppt/slides/slide1.xml':strToU8(slide('image')), 'ppt/slides/slide2.xml':strToU8(slide('image')),
      'ppt/slides/_rels/slide1.xml.rels':strToU8(rel('image','../media/one.png')),
      'ppt/slides/_rels/slide2.xml.rels':strToU8(rel('image','../media/two.png')),
      'ppt/media/one.png':png(256,160,40), 'ppt/media/two.png':png(256,160,50),
    };
    const figures=await extractFigures(zipSync(parts),'pptx');
    expect(figures.map(f=>[f.slideNumber,f.sha256])).toEqual([[1,digest(parts['ppt/media/two.png'])],[2,digest(parts['ppt/media/one.png'])]]);
    expect(extractOfficeStructure(zipSync(parts),'pptx').drafts.map(b=>b.slideNumber)).toEqual([1,2]);
    expect(extractOfficeStructure(zipSync(parts),'pptx').drafts.map(b=>[b.pageNumber,b.slideNumber])).toEqual([[1,1],[2,2]]);
  });
  it('maps DOCX media to the nearest preceding emitted block, skipping a leading image',async()=>{
    const zip=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="w" xmlns:a="a" xmlns:r="r"><w:body><w:p><a:blip r:embed="image"/></w:p><w:p><w:r><w:t>First source block</w:t></w:r></w:p><w:p><a:blip r:embed="image"/></w:p><w:p><w:r><w:t>Second source block</w:t></w:r></w:p><w:p><a:blip r:embed="other"/></w:p></w:body></w:document>'),
      'word/_rels/document.xml.rels':strToU8('<Relationships><Relationship Id="image" Target="media/one.png"/><Relationship Id="other" Target="media/two.png"/></Relationships>'),
      'word/media/one.png':png(), 'word/media/two.png':png(256,160,20)});
    const figures=await extractFigures(zip,'docx');expect(figures.map(f=>f.blockId)).toEqual(['block-1','block-2']);
    expect(extractOfficeStructure(zip,'docx').text).toBe('First source block\n\nSecond source block');
  });
  it('enforces dimensions, area, byte and material caps and deduplicates repeated instances',()=>{
    const base={bytes:png(),mime:'image/png' as const,width:256,height:160,sha256:'a',pageNumber:1,position:0};
    const all=Array.from({length:70},(_,n)=>({...base,sha256:String(n),position:n}));
    all.push({...base,width:1,sha256:'tiny'}, {...base,bytes:new Uint8Array(FIGURE_MAX_BYTES+1),sha256:'large'});
    expect(filterFigures(all,100)).toHaveLength(FIGURE_MATERIAL_CAP);
    expect(filterFigures([base,base],1)).toHaveLength(1);
    expect(()=>encodeRgbaPng(new Uint8Array(1),256,160)).toThrow('figure_pixels_invalid');
  });
  it('skips unsupported media and rejects malformed/oversized original evidence',async()=>{
    const zip=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="w" xmlns:a="a" xmlns:r="r"><w:body><w:p><w:r><w:t>Source block</w:t></w:r><a:blip r:embed="image"/></w:p></w:body></w:document>'),
      'word/_rels/document.xml.rels':strToU8(rel('image','media/vector.svg')),'word/media/vector.svg':strToU8('<svg/>')});
    expect(await extractFigures(zip,'docx')).toEqual([]);
    await expect(extractFigures(new Uint8Array(20*1024*1024+1),'pdf')).rejects.toThrow('figure_source_too_large');
    await expect(extractFigures(new Uint8Array([1,2]),'pdf')).rejects.toThrow();
  });
  it('never resurrects a figure inside tracked-deleted DOCX content',async()=>{
    const zip=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="w" xmlns:a="a" xmlns:r="r"><w:body><w:p><w:r><w:t>Accepted block</w:t></w:r><w:del><w:r><a:blip r:embed="image"/></w:r></w:del></w:p></w:body></w:document>'),
      'word/_rels/document.xml.rels':strToU8(rel('image','media/deleted.png')),'word/media/deleted.png':png()});
    expect(await extractFigures(zip,'docx')).toEqual([]);
  });
});
