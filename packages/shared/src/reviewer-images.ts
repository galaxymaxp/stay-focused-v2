/** Ephemeral owner-scoped image data. Never persist this response in offline caches. */
export interface ReviewerFigure {
  readonly id: string; readonly url: string; readonly width: number; readonly height: number;
  readonly page?: number; readonly slide?: number;
}
export type ReviewerSnapshot = (
  | { available: false; reason: string; page?: number }
  | { available: true; status: 'rendering' | 'unrendered'; page: number }
  | { available: true; id?: string; url: string; page: number; width: number; height: number; sourceLabel: string }
) & { labelKind?: 'slide' };
export const REVIEWER_EXTERNAL_LABEL = 'External reference — not from your course material.';
export interface ReviewerReferenceVisual {
  status: 'found'; id: string; image: string; title: string; credit: string; license: string;
  licenseUrl: string; sourceUrl: string; label: typeof REVIEWER_EXTERNAL_LABEL;
  width: number; height: number; attemptCount: number;
}
export interface ReviewerSectionImages {
  sectionId: string; hasFigures: boolean; figures: readonly ReviewerFigure[];
  snapshot: ReviewerSnapshot; external?: ReviewerReferenceVisual;
}
export interface ReviewerImages {
  sections: readonly ReviewerSectionImages[];
  external: { checked: number; total: number; running: boolean };
}
export const REVIEWER_SNAPSHOT_CONCURRENCY = 3;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('reviewer_images_invalid');
  return value as Record<string, unknown>;
}
function positive(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= max;
}
function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function https(value: unknown, hosts?: readonly string[]): value is string {
  if (!text(value, 10000)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (!hosts || (hosts.includes(url.hostname) && !url.port)); } catch { return false; }
}
export function parseReviewerSnapshot(value: unknown): ReviewerSnapshot {
  const v = object(value);
  if (v.labelKind !== undefined && v.labelKind !== 'slide') throw new Error('reviewer_images_invalid');
  const label = v.labelKind === 'slide' ? { labelKind: 'slide' as const } : {};
  if (v.available === false && text(v.reason, 100) && (v.page === undefined || positive(v.page, 100)))
    return { available: false, reason: v.reason, ...(typeof v.page === 'number' ? {page:v.page} : {}), ...label };
  if (v.available !== true || !positive(v.page, 100)) throw new Error('reviewer_images_invalid');
  if (v.status === 'rendering' || v.status === 'unrendered') return {available:true,status:v.status,page:v.page,...label};
  if (!https(v.url) || !positive(v.width, 1400) || !positive(v.height, 10000) || !text(v.sourceLabel, 500)) throw new Error('reviewer_images_invalid');
  // Match the existing native parser: malformed legacy IDs never become Ask
  // references, but a valid image can still be displayed without that action.
  const identity=typeof v.id==='string' && /^[0-9a-f-]{36}$/i.test(v.id)?{id:v.id}:{};
  return {available:true,...identity,url:v.url,page:v.page,width:v.width,height:v.height,sourceLabel:v.sourceLabel,...label};
}
function parseReference(value: unknown): ReviewerReferenceVisual {
  const v = object(value);
  if (v.status !== 'found' || !text(v.id, 100) || !/^[a-f0-9]{64}$/.test(v.id) || v.label !== REVIEWER_EXTERNAL_LABEL ||
      !https(v.image, ['upload.wikimedia.org']) || !https(v.sourceUrl, ['commons.wikimedia.org']) ||
      !new URL(v.sourceUrl).pathname.startsWith('/wiki/File:') || !https(v.licenseUrl, ['creativecommons.org','commons.wikimedia.org']) ||
      !text(v.title, 500) || !text(v.credit, 2000) || !text(v.license, 100) || !['Public domain','CC0','CC BY','CC BY-SA'].includes(v.license) ||
      !positive(v.width, 1200) || !positive(v.height, 10000) || (v.attemptCount !== 1 && v.attemptCount !== 2)) throw new Error('reviewer_images_invalid');
  return {status:'found',id:v.id,image:v.image,title:v.title,credit:v.credit,license:v.license,licenseUrl:v.licenseUrl,sourceUrl:v.sourceUrl,label:REVIEWER_EXTERNAL_LABEL,width:v.width,height:v.height,attemptCount:v.attemptCount};
}
export function parseReviewerImages(value: unknown): ReviewerImages {
  const v = object(value), progress = object(v.external);
  if (!Array.isArray(v.sections) || v.sections.length > 100 || !Number.isSafeInteger(progress.checked) || Number(progress.checked) < 0 ||
      !Number.isSafeInteger(progress.total) || Number(progress.total) < 0 || typeof progress.running !== 'boolean') throw new Error('reviewer_images_invalid');
  const seen = new Set<string>();
  const sections = v.sections.map(raw => {
    const s = object(raw);
    if (!text(s.sectionId, 220) || !/^[a-zA-Z0-9_-]+$/.test(s.sectionId) || seen.has(s.sectionId) || typeof s.hasFigures !== 'boolean' || !Array.isArray(s.figures) || s.figures.length > 12) throw new Error('reviewer_images_invalid');
    seen.add(s.sectionId);
    const ids = new Set<string>();
    const figures = s.figures.map(rawFigure => {
      const f = object(rawFigure);
      if (!text(f.id, 100) || ids.has(f.id) || !https(f.url) || !positive(f.width, 10000) || !positive(f.height, 10000) ||
          (f.page !== undefined && !positive(f.page,100)) || (f.slide !== undefined && !positive(f.slide,100)) || (f.page !== undefined && f.slide !== undefined)) throw new Error('reviewer_images_invalid');
      ids.add(f.id);
      return {id:f.id,url:f.url,width:f.width,height:f.height,...(typeof f.page==='number'?{page:f.page}:{}),...(typeof f.slide==='number'?{slide:f.slide}:{})};
    });
    let external: ReviewerReferenceVisual | undefined;
    try { if (s.external !== undefined) external = parseReference(s.external); } catch { /* One stale external row must not hide course images. */ }
    return {sectionId:s.sectionId,hasFigures:s.hasFigures,figures,snapshot:parseReviewerSnapshot(s.snapshot),...(external?{external}:{})};
  });
  return {sections,external:{checked:Number(progress.checked),total:Number(progress.total),running:progress.running}};
}

export type ReviewerImageRequest = (path: string, options: { signal: AbortSignal; method?: 'POST'; body?: unknown }) => Promise<unknown>;
/** One open read, bounded background admission/polling, and one shared URL refresh per reader lifetime. */
export function createReviewerImageLoader(artifactId: string, request: ReviewerImageRequest, publish: (data: ReviewerImages | null) => void, signal: AbortSignal) {
  const base = `/api/reviewers/${encodeURIComponent(artifactId)}`;
  let current: ReviewerImages | null = null, refreshed = false, generation = 0, externalStarted = false;
  let slots = 0;
  const waiting: (() => void)[] = [], admitted = new Set<string>();
  const snapshotRequest = async (path: string) => {
    if (slots >= REVIEWER_SNAPSHOT_CONCURRENCY) await new Promise<void>(resolve=>waiting.push(resolve)); else slots++;
    try {if (signal.aborted) throw new Error('aborted');return await request(path,{signal});}
    finally {const wake=waiting.shift();if(wake)wake();else slots--;}
  };
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const emit = () => { if (!signal.aborted) publish(current); };
  signal.addEventListener('abort', () => { for (const timer of timers) clearTimeout(timer); timers.clear(); }, {once:true});
  const later = (work: () => void, ms: number) => {
    if (signal.aborted) return;
    const timer = setTimeout(() => {timers.delete(timer);if (!signal.aborted) work();}, ms);timers.add(timer);
  };
  const load = async (background: boolean) => {
    const run = ++generation;
    try {
      const data = parseReviewerImages(await request(`${base}/figures`, {signal}));
      if (signal.aborted || run !== generation) return;
      current = data; emit();
      if (background) {
        // One queue for all sections, independent of scroll. Rendering is admitted once;
        // subsequent passes only read persisted server state. Five polls maximum.
        let queue = data.sections.filter(s => !s.figures.length && s.snapshot.available && !('url' in s.snapshot));
        const batch = async (admit: boolean, pass: number) => {
          let next = 0;
          await Promise.all(Array.from({length:Math.min(REVIEWER_SNAPSHOT_CONCURRENCY,queue.length)}, async () => {
            while (!signal.aborted && run === generation && next < queue.length) {
              const section = queue[next++]!;
              try {
                const key = `${section.sectionId}:${section.snapshot.available ? section.snapshot.page : ''}`;
                const render = admit && !admitted.has(key) && section.snapshot.available && 'status' in section.snapshot && section.snapshot.status === 'unrendered';
                if (render) admitted.add(key);
                const snapshot = parseReviewerSnapshot(await snapshotRequest(`${base}/sections/${encodeURIComponent(section.sectionId)}/snapshot${render?'':'?render=0'}`));
                if (signal.aborted || run !== generation || !current) return;
                current = {...current,sections:current.sections.map(s => s.sectionId === section.sectionId ? {...s,snapshot} : s)};emit();
              } catch { /* Safe unavailable state; no retry admission on failed evidence. */ }
            }
          }));
          if (signal.aborted || run !== generation) return;
          queue = (current?.sections ?? []).filter(s => queue.some(q=>q.sectionId===s.sectionId) && s.snapshot.available && 'status' in s.snapshot && s.snapshot.status === 'rendering');
          if (queue.length && pass < 5) later(()=>void batch(false,pass+1),3000);
        };
        void batch(true,0);
        // Preserve legacy external-visual filling, without delaying cached source URLs.
        if (data.external.checked < data.external.total || data.external.running) {
          let polls=0,idle=0;
          const poll = async () => {
            try {
              const raw=object(await request(`${base}/visuals`,{signal}));
              if (signal.aborted || run!==generation || !current) return;
              const found=object(raw.sections);
              current={...current,sections:current.sections.map(s=>{
                try {return found[s.sectionId] ? {...s,external:parseReference(found[s.sectionId])}:s;} catch {return s;}
              })};emit();
              idle=raw.running===true?0:idle+1;
              if (++polls<60 && idle<4 && !(Number(raw.checked)>=Number(raw.total) && !raw.running)) later(()=>void poll(),4000);
            } catch { /* Keep cached course visuals. */ }
          };
          void (async()=>{
            try {if (!data.external.running && !externalStarted) {externalStarted=true;await request(`${base}/visuals`,{signal,method:'POST',body:{}});}
              if (run===generation) later(()=>void poll(),4000);
            } catch { /* Keep stored external visuals. */ }
          })();
        }
      }
    } catch { if (!signal.aborted && run===generation) {current=null;emit();} }
  };
  return {
    load: () => load(true),
    refreshOnce: async () => {if (refreshed || signal.aborted) return false;refreshed=true;await load(true);return !signal.aborted && current!==null;},
  };
}
