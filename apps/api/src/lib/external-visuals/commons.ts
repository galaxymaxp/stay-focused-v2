import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { readBoundedText } from '../bounded-body';

export const COMMONS_CANDIDATE_CAP = 5;
export const COMMONS_IMAGE_WIDTH = 1200;
export const COMMONS_BODY_BYTES = 256 * 1024;
export const COMMONS_TIMEOUT_MS = 10000;
export const COMMONS_USER_AGENT = 'StayFocused/2.0 (student-requested educational visual references; https://github.com/galaxymaxp)';
export interface CommonsCandidate {
  readonly fileTitle: string; readonly title: string; readonly image: string; readonly sourceUrl: string;
  readonly credit: string; readonly license: 'Public domain' | 'CC0' | 'CC BY' | 'CC BY-SA';
  readonly licenseUrl: string; readonly width: number; readonly height: number;
}
const STOP = new Set('a an and are as at be by for from has in is it of on or that the this to with'.split(' '));
export function buildCommonsQuery(heading: string, text: string): string {
  const words = (value: string) => value.normalize('NFKC').match(/[\p{L}\p{N}][\p{L}\p{N}-]{2,40}/gu) ?? [];
  const headingWords = words(heading).slice(0, 10);
  const counts = new Map<string, number>();
  for (const word of words(text.slice(0, 16000))) {
    const key = word.toLowerCase();
    if (!STOP.has(key) && !headingWords.some(h => h.toLowerCase() === key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const terms = [...counts].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,4).map(([term])=>term);
  return [...headingWords, ...terms].join(' ').slice(0,300) || 'educational diagram';
}
export function stripAttribution(html: string): string {
  const visit = (node: DefaultTreeAdapterMap['childNode']): string => {
    if (node.nodeName === 'script' || node.nodeName === 'style') return '';
    if ('value' in node) return node.value;
    return 'childNodes' in node ? node.childNodes.map(visit).join(' ') : '';
  };
  return parseFragment(html.slice(0,16000)).childNodes.map(visit).join(' ').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,1000);
}
function record(value: unknown): Record<string,unknown> { return value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {}; }
function safeUrl(value: unknown, host: string): string | null {
  try { const url = new URL(String(value)); return url.protocol==='https:' && url.hostname===host && !url.username && !url.password && !url.port ? url.href : null; } catch { return null; }
}
export function commonsCandidates(payload: unknown, excluded: readonly string[] = []): readonly CommonsCandidate[] {
  const pages = record(record(payload).query).pages;
  const results: CommonsCandidate[] = [];
  const seen = new Set(excluded);
  for (const raw of Object.values(record(pages)).sort((a,b)=>Number(record(a).index??0)-Number(record(b).index??0)).slice(0,COMMONS_CANDIDATE_CAP)) {
    const page=record(raw); const info=record(Array.isArray(page.imageinfo)?page.imageinfo[0]:null);
    const meta=record(info.extmetadata); const field=(key:string)=>stripAttribution(String(record(meta[key]).value??''));
    const name=field('LicenseShortName'); const url=safeUrl(field('LicenseUrl'),'creativecommons.org') ?? safeUrl(field('LicenseUrl'),'commons.wikimedia.org');
    // Require both the declared short name and the canonical legal URL to agree.
    const license = /^CC BY-SA(?: [1-4]\.0)?$/i.test(name) && url?.match(/^https:\/\/creativecommons\.org\/licenses\/by-sa\/[1-4]\.0\//) ? 'CC BY-SA'
      : /^CC BY(?: [1-4]\.0)?$/i.test(name) && url?.match(/^https:\/\/creativecommons\.org\/licenses\/by\/[1-4]\.0\//) ? 'CC BY'
      : /^(CC0|CC0 1\.0)$/i.test(name) && url?.startsWith('https://creativecommons.org/publicdomain/zero/1.0/') ? 'CC0'
      : /^Public domain$/i.test(name) && (url?.startsWith('https://creativecommons.org/publicdomain/') || url?.startsWith('https://commons.wikimedia.org/wiki/Commons:')) ? 'Public domain' : null;
    const image=safeUrl(info.thumburl,'upload.wikimedia.org');
    const sourceUrl=safeUrl(info.descriptionurl,'commons.wikimedia.org');
    const width=info.thumbwidth;const height=info.thumbheight;const fileTitle=page.title;
    if(!license || !url || !image || !sourceUrl?.startsWith('https://commons.wikimedia.org/wiki/File:') ||
      typeof fileTitle!=='string' || !fileTitle.startsWith('File:') || fileTitle.length>500 || seen.has(fileTitle) ||
      !['image/png','image/jpeg','image/gif','image/webp','image/svg+xml'].includes(String(info.mime)) ||
      (info.mime==='image/svg+xml' && !new URL(image).pathname.endsWith('.png')) ||
      typeof width!=='number' || !Number.isInteger(width) || width<1 || width>COMMONS_IMAGE_WIDTH ||
      typeof height!=='number' || !Number.isInteger(height) || height<1 || height>10000) continue;
    const credit=[field('Artist'),field('Credit')].filter(Boolean).join(' · ').slice(0,2000);
    if(!credit && license!=='Public domain' && license!=='CC0') continue;
    seen.add(fileTitle);results.push({fileTitle,title:fileTitle.slice(5),image,sourceUrl,credit:credit||'Wikimedia Commons',license,licenseUrl:url,width,height});
  }
  return results;
}
export async function searchCommons(query: string, excluded: readonly string[] = [], fetcher: typeof fetch = fetch): Promise<readonly CommonsCandidate[]> {
  const url=new URL('https://commons.wikimedia.org/w/api.php');
  url.search=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:String(COMMONS_CANDIDATE_CAP),
    prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:String(COMMONS_IMAGE_WIDTH)}).toString();
  const controller=new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('commons_timeout'));},COMMONS_TIMEOUT_MS);});
  try {
    return await Promise.race([(async()=>{
      const response=await fetcher(url,{signal:controller.signal,headers:{'User-Agent':COMMONS_USER_AGENT,Accept:'application/json'},redirect:'error'});
      if(!response.ok) throw new Error('commons_unavailable');
      const body=await readBoundedText(new Request('https://local.test',{method:'POST',body:response.body,headers:response.headers,duplex:'half'} as RequestInit),COMMONS_BODY_BYTES);
      if(!body.ok)throw new Error('commons_body_invalid');
      const payload:unknown=JSON.parse(body.text);
      const data=record(payload);const pages=record(data.query).pages;
      if(data.error || (data.query!==undefined
        ? !pages || typeof pages!=='object' || Array.isArray(pages)
        : data.batchcomplete!==''))throw new Error('commons_response_invalid');
      return commonsCandidates(payload,excluded);
    })(),timeout]);
  } finally { clearTimeout(timer!); }
}
