import { describe, expect, it, vi } from 'vitest';
import { readFigureAvailability, readSectionFigures } from './sourceFigures';
const figure={id:'figure',url:'https://storage.example.test/image?short=token',width:256,height:160,page:2};
function client(data:unknown) {
  const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({ok:true,data})));
  return {baseUrl:'https://api.example.test',accessToken:'jwt',fetchImpl};
}
describe('source figures bearer client',()=>{
  it('fetches bounded section figures with the JWT and abort signal',async()=>{
    const c=client({figures:[figure]});const signal=new AbortController().signal;
    expect(await readSectionFigures(c,'artifact','section',signal)).toEqual([figure]);
    expect(c.fetchImpl).toHaveBeenCalledWith('https://api.example.test/api/reviewers/artifact/sections/section/figures',
      expect.objectContaining({signal:expect.any(AbortSignal),headers:expect.objectContaining({Authorization:'Bearer jwt'})}));
  });
  it('discovers all section icons in one request',async()=>{
    const c=client({sections:[{sectionId:'yes',hasFigures:true},{sectionId:'no',hasFigures:false}]});
    expect(await readFigureAvailability(c,'artifact')).toEqual(new Set(['yes']));expect(c.fetchImpl).toHaveBeenCalledOnce();
  });
  it.each([{...figure,url:'file:///private'},{...figure,width:0},{...figure,page:101},{...figure,slide:1},{...figure,height:1.5},
    {...figure,id:''}])('rejects unsafe or invalid images %j',async invalid=>{
    await expect(readSectionFigures(client({figures:[invalid]}),'a','s')).rejects.toThrow('figures_invalid');
  });
  it('rejects duplicate figures, oversized lists and malformed availability',async()=>{
    for(const figures of [[figure,figure],Array.from({length:13},(_,n)=>({...figure,id:String(n) }))])
      await expect(readSectionFigures(client({figures}),'a','s')).rejects.toThrow('figures_invalid');
    for(const sections of [[{sectionId:'s',hasFigures:'yes'}],[{sectionId:'s',hasFigures:true},{sectionId:'s',hasFigures:false}]])
      await expect(readFigureAvailability(client({sections}),'a')).rejects.toThrow('figures_invalid');
  });
});
