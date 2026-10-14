import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCommonsQuery, commonsCandidates, searchCommons, stripAttribution, COMMONS_BODY_BYTES, COMMONS_TIMEOUT_MS, COMMONS_USER_AGENT } from './commons';
export const candidatePage=(license='CC BY-SA 4.0',licenseUrl='https://creativecommons.org/licenses/by-sa/4.0/')=>({index:1,title:'File:Cell.png',imageinfo:[{
  mime:'image/png',thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Cell.png/1200px-Cell.png',thumbwidth:1200,thumbheight:800,
  descriptionurl:'https://commons.wikimedia.org/wiki/File:Cell.png',extmetadata:{LicenseShortName:{value:license},LicenseUrl:{value:licenseUrl},Artist:{value:'<a href="private">Ada &amp; Ben</a>'},Credit:{value:'<b>Own work</b>'}}}]});
const payload=(page=candidatePage())=>({query:{pages:{'1':page}}});
afterEach(()=>vi.useRealTimers());
describe('bounded Commons search',()=>{
  it('builds deterministic heading/key-term queries without search operators',()=>{
    const text='The cell contains mitochondria. Mitochondria produce energy.';
    expect(buildCommonsQuery('Cell structure',text)).toBe(buildCommonsQuery('Cell structure',text));
    expect(buildCommonsQuery('Cell structure',text)).toContain('mitochondria');
    expect(buildCommonsQuery('"* insource:/x/',text)).not.toMatch(/["*:/]/);
    expect(buildCommonsQuery('x'.repeat(600),text).length).toBeLessThanOrEqual(300);
  });
  it('strips HTML, scripts and encoded attribution text',()=>{
    expect(stripAttribution('<script>bad()</script><b>Ada &amp; Ben</b>')).toBe('Ada & Ben');
    expect(commonsCandidates(payload())[0]?.credit).toBe('Ada & Ben · Own work');
  });
  it.each([['CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'],['CC BY 3.0','https://creativecommons.org/licenses/by/3.0/'],['CC0','https://creativecommons.org/publicdomain/zero/1.0/'],['Public domain','https://commons.wikimedia.org/wiki/Commons:Public_domain']])('keeps free %s', (name,url)=>{
    expect(commonsCandidates(payload(candidatePage(name,url)))).toHaveLength(1);
  });
  it.each(['CC BY-NC 4.0','CC BY-ND 4.0','All rights reserved','Fair use','CC BY-SA evil'])('skips non-free/unknown %s',license=>{
    expect(commonsCandidates(payload(candidatePage(license)))).toEqual([]);
  });
  it('rejects license URL mismatch, non-Commons images, raw SVG, oversize thumbnails and prior titles',()=>{
    expect(commonsCandidates(payload(candidatePage('CC BY 4.0')))).toEqual([]);
    const page=candidatePage();page.imageinfo[0]!.thumburl='https://other.example/image.png';expect(commonsCandidates(payload(page))).toEqual([]);
    const svg=candidatePage();svg.imageinfo[0]!.mime='image/svg+xml';svg.imageinfo[0]!.thumburl='https://upload.wikimedia.org/image.svg';expect(commonsCandidates(payload(svg))).toEqual([]);
    const huge=candidatePage();huge.imageinfo[0]!.thumbwidth=1201;expect(commonsCandidates(payload(huge))).toEqual([]);
    expect(commonsCandidates(payload(),['File:Cell.png'])).toEqual([]);
  });
  it('caps candidates and sets namespace, width, User-Agent and redirect denial',async()=>{
    const fetcher=vi.fn<typeof fetch>(async()=>Response.json(payload()));
    expect(await searchCommons('cell',[],fetcher)).toHaveLength(1);
    const [url,options]=fetcher.mock.calls[0]!;const params=new URL(String(url)).searchParams;
    expect(params.get('gsrlimit')).toBe('5');expect(params.get('gsrnamespace')).toBe('6');expect(params.get('iiurlwidth')).toBe('1200');
    expect(options).toMatchObject({redirect:'error',headers:{'User-Agent':COMMONS_USER_AGENT}});
    const pages=Object.fromEntries(Array.from({length:8},(_,i)=>[i,{...candidatePage(),title:`File:${i}.png`,index:i}]));
    expect(commonsCandidates({query:{pages}})).toHaveLength(5);
  });
  it('bounds bodies before allocating regardless of Content-Length',async()=>{
    let cancelled=false;
    const fetcher=vi.fn<typeof fetch>(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(COMMONS_BODY_BYTES+1));},cancel(){cancelled=true;}})));
    await expect(searchCommons('cell',[],fetcher)).rejects.toThrow('commons_body_invalid');expect(cancelled).toBe(true);
  });
  it('times out even when injected fetch never settles',async()=>{
    vi.useFakeTimers();const fetcher=vi.fn<typeof fetch>(()=>new Promise(()=>{}));
    const result=expect(searchCommons('cell',[],fetcher)).rejects.toThrow('commons_timeout');
    await vi.advanceTimersByTimeAsync(COMMONS_TIMEOUT_MS);await result;
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
  it('does not turn a failed/malformed provider response into an empty search',async()=>{
    await expect(searchCommons('cell',[],async()=>Response.json({error:{code:'failed'}}))).rejects.toThrow();
    await expect(searchCommons('cell',[],async()=>Response.json({query:{}}))).rejects.toThrow('commons_response_invalid');
    await expect(searchCommons('cell',[],async()=>Response.json({batchcomplete:false}))).rejects.toThrow('commons_response_invalid');
    await expect(searchCommons('cell',[],async()=>new Response('',{status:503}))).rejects.toThrow();
    expect(await searchCommons('cell',[],async()=>Response.json({batchcomplete:''}))).toEqual([]);
  });
});
