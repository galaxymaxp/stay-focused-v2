"use client";
/* Signed source URLs must not pass through a public image-optimization cache. */
/* eslint-disable @next/next/no-img-element */
import { STUDY_OFFLINE, type StudyImageTarget, type StudyImageDownload, type ReviewerSectionImages } from "@stay-focused/shared";
import { downloadStudyImage } from './download-image';
import { Icon } from "../../components/ui";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../components/providers";
import { ZoomableImage } from './zoomable-image';
import { ImageHelpIcon } from './image-help-icon';

type Snapshot = { available: false; reason: string } | { available: true; id?: string; page: number; labelKind?: "slide"; status?: "rendering" | "unrendered"; url?: string };
type Figure = { id: string; url: string; page?: number; slide?: number };
export type ExternalVisual = { status: "found"; id?: string; image: string; title: string; credit: string; license: string; licenseUrl: string; sourceUrl: string; label: string; attemptCount: number };
export function SectionVisual({ artifactId, sectionId, visual, eagerCount = 0, refreshOnce, external: initialExternal, onAsk, reviewerTitle = 'Reviewer', sectionTitle = 'Section' }: { artifactId: string; sectionId: string; visual?: ReviewerSectionImages; eagerCount?: number; refreshOnce?: () => Promise<boolean>; external?: ExternalVisual; onAsk?: (image: StudyImageTarget) => void; reviewerTitle?: string; sectionTitle?: string }) {
  const { api, session } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [online, setOnline] = useState(false);
  const snapshot: Snapshot | null = visual?.snapshot ?? null, figures: readonly Figure[] = visual?.figures ?? [];
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(new Set());
  const [replacement, setReplacement] = useState<ExternalVisual | null>(null), [busy, setBusy] = useState(false);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string; grounding: string; details?: ExternalVisual; image?: StudyImageTarget; download: StudyImageDownload } | null>(null);
  const [saving, setSaving] = useState(false), [saveNote, setSaveNote] = useState('');
  const savePending = useRef(false);
  const path = `/api/reviewers/${encodeURIComponent(artifactId)}/sections/${encodeURIComponent(sectionId)}`;
  const external = replacement ?? visual?.external ?? initialExternal;
  const [failedImage, setFailedImage] = useState<string | null>(null), [retry, setRetry] = useState(0);
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const imageKey = (src: string) => `${src}:${retry}`;
  function imageFailed(src: string) { setFailedImage(imageKey(src)); console.warn('reviewer.external_image_failed'); }
  function retryImage() { setFailedImage(null); setRetry(n => n + 1); }
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); if (!navigator.onLine) dialog.current?.close(); };
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  // Browser image errors do not expose an HTTP status. Treat a source-image error
  // as a possible expired signature and use the shared once-per-reader refresh.
  async function sourceFailed(src: string) {
    setFailedSources(previous => new Set([...previous, src]));
    await refreshOnce?.();
  }
  useEffect(() => {
    setZoomed(current => {
      if (!current?.image || current.image.reference.kind === 'external_visual') return current;
      const figure = visual?.figures.find(f => f.id === current.image!.reference.id);
      const page = visual?.snapshot;
      const src = figure?.url ?? (page?.available && 'url' in page && page.id === current.image.reference.id ? page.url : undefined);
      return src && src !== current.src ? {...current,src,image:{...current.image,thumbnail:src},download:{...current.download,uri:src}} : current;
    });
  }, [visual]);
  function open(src: string, alt: string, image: StudyImageTarget | undefined, kind: StudyImageDownload['kind']) {
    setZoomed({ src, alt, image, grounding: kind === 'external_visual' && external ? external.label : `${alt} · your course material`,
      ...(kind === 'external_visual' && external ? { details: external } : {}), download: { uri: src, reviewerTitle, sectionTitle, kind,
      ...(kind === 'external_visual' && external ? { sourceTitle: external.title, attribution: `${external.credit} · ${external.license}` } : {}) } });
    setSaveNote(''); dialog.current?.showModal();
  }
  async function save() {
    if (!zoomed || !session?.user.id || !online || savePending.current) return;
    savePending.current = true; setSaving(true); setSaveNote('');
    try {
      await downloadStudyImage(zoomed.download);
      setSaveNote(zoomed.download.attribution ? `Image downloaded. ${zoomed.download.attribution}` : 'Image downloaded.');
    } catch { setSaveNote('Could not download this image. Try again when connected.'); }
    finally { savePending.current = false; setSaving(false); }
  }
  async function another() {
    setBusy(true);
    try {
      const value = await api<ExternalVisual | { status: "none" }>(`${path}/external-visual`, { method: "POST", body: { findAnother: true } });
      if (value.status === "found") setReplacement(value);
    } catch { /* keep the current image */ } finally { setBusy(false); }
  }
  const snapshotUrl = snapshot?.available ? snapshot.url : undefined;
  const snapshotLabel = snapshot?.available ? `From ${snapshot.labelKind === "slide" ? "slide" : "page"} ${snapshot.page}` : "";
  const snapshotImage: StudyImageTarget | undefined = snapshot?.available && snapshot.id && snapshotUrl ? {reference:{kind:'page_snapshot',id:snapshot.id},thumbnail:snapshotUrl,label:snapshotLabel} : undefined;
  const externalImage: StudyImageTarget | undefined = external?.id ? {reference:{kind:'external_visual',id:external.id},thumbnail:external.image,label:external.title} : undefined;
  const hasSource = figures.length > 0 || !!snapshotUrl;
  const caption = { fontSize: 12, letterSpacing: 0.3, textTransform: "uppercase" as const, opacity: 0.7 };
  const frame = { aspectRatio: "16 / 10", width: "100%", maxHeight: 420, padding: 0, border: 0, background: "#fff", borderRadius: 12, cursor: "zoom-in", overflow: "hidden" };
  return <div className="section-visual stack">
    {online && !figures.length && !snapshotUrl && !external && snapshot?.available && <div aria-label="Preparing source page" style={{aspectRatio:'16 / 10',maxHeight:420,width:'100%'}} />}
    {online && figures.length > 0 && <figure className="surface stack" style={{ margin: 0 }}>
      <span className="muted" style={caption}>From your course material</span>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: figures.length > 1 ? "repeat(auto-fill, minmax(220px, 1fr))" : "1fr" }}>
        {figures.map((figure, index) => {
          const alt = figure.slide ? `Diagram from slide ${figure.slide}` : figure.page ? `Diagram from page ${figure.page}` : "Source diagram";
          const image: StudyImageTarget = {reference:{kind:'figure',id:figure.id},thumbnail:figure.url,label:alt};
          return <div key={figure.id} className="stack"><button type="button" aria-label={`Enlarge ${alt}`} onClick={() => open(figure.url, alt, image, 'figure')} style={frame}>
            {failedSources.has(figure.url) ? <SourceImageError /> : <img src={figure.url} alt={alt} loading={index < eagerCount ? 'eager' : 'lazy'} decoding="async" onError={() => void sourceFailed(figure.url)} style={{ display: "block", width: "100%", height: "100%", maxHeight: 360, objectFit: "contain" }} />}
          </button><AskImageButton image={image} online={online} onAsk={onAsk} /></div>;
        })}
      </div>
    </figure>}
    {online && !figures.length && snapshotUrl && <figure className="surface stack" style={{ margin: 0 }}>
      <span className="muted" style={caption}>{snapshotLabel} · your course material</span>
      <button type="button" aria-label={`Enlarge ${snapshotLabel}`} onClick={() => open(snapshotUrl, snapshotLabel, snapshotImage, 'page_snapshot')} style={frame}>
        {failedSources.has(snapshotUrl) ? <SourceImageError /> : <img src={snapshotUrl} alt={snapshotLabel} loading={eagerCount > 0 ? 'eager' : 'lazy'} decoding="async" onError={() => void sourceFailed(snapshotUrl)} style={{ display: "block", width: "100%", height: "100%", maxHeight: 420, objectFit: "contain" }} />}
      </button>
      <AskImageButton image={snapshotImage} online={online} onAsk={onAsk} />
    </figure>}
    {online && !hasSource && external && <figure className="surface stack" style={{ margin: 0 }}>
      <span className="muted" style={caption}>{external.label}</span>
      {/* Commons candidates are validated by the owner-scoped API. */}
      {failedImage === imageKey(external.image) ? <ExternalImageError sourceUrl={external.sourceUrl} onRetry={retryImage} /> : <button type="button" aria-label={`Enlarge ${external.title}`} aria-busy={loadedImage !== imageKey(external.image)} onClick={() => open(external.image, external.title, externalImage, 'external_visual')} style={{...frame,position:'relative'}}>
        <img loading={eagerCount > 0 ? "eager" : "lazy"} decoding="async" key={imageKey(external.image)} src={external.image} alt={external.title} onLoad={() => setLoadedImage(imageKey(external.image))} onError={() => imageFailed(external.image)} style={{ display: "block", width: "100%", height: "100%", maxHeight: 380, objectFit: "contain" }} />
        {loadedImage !== imageKey(external.image) && <span role="status" className="muted" style={{position:'absolute',inset:0,display:'grid',placeItems:'center',pointerEvents:'none'}}>Loading image…</span>}
      </button>}
      <AskImageButton image={externalImage} online={online} onAsk={onAsk} />
      {external.attemptCount < 2 && <button disabled={busy} onClick={() => void another()} style={{ fontSize: 12 }}>{busy ? "Finding…" : "Show a different one"}</button>}
    </figure>}
    {!online && (hasSource || external) && <AskImageButton online={false} />}
    <dialog ref={dialog} aria-label={zoomed?.alt ?? "Visual"} className="surface stack" style={{ width: "min(94vw, 1000px)", maxHeight: "90vh", overflow: "auto" }}
      onClose={() => setZoomed(null)} onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
      }}>
      <div className="row"><strong className="grow">{zoomed?.alt}</strong><button onClick={() => dialog.current?.close()}>Close</button></div>
      {zoomed && <span className="muted" style={caption}>{zoomed.grounding}</span>}
      {zoomed?.details && <div className="row" aria-label="Image details" style={{ fontSize: 12, flexWrap: "wrap", gap: 8 }}>
        <a href={zoomed.details.sourceUrl} target="_blank" rel="noreferrer">{zoomed.details.credit} · {zoomed.details.license}</a>
        <a href={zoomed.details.licenseUrl} target="_blank" rel="noreferrer">License</a>
      </div>}
      <div className="reviewer-image-actions">
        <AskImageButton image={zoomed?.image} online={online} hideOfflineNote onAsk={image=>{dialog.current?.close();onAsk?.(image);}} />
        {session?.user.id && zoomed && <button className="subtle row reviewer-image-action" disabled={!online || saving} onClick={() => void save()}><Icon name="download" />{saving ? 'Saving…' : 'Save image'}</button>}
      </div>
      {!online && <p className="meta">{STUDY_OFFLINE}</p>}
      {saveNote && <p role="status">{saveNote}</p>}
      <div>
        {zoomed && (zoomed.details && failedImage === imageKey(zoomed.src) ? <ExternalImageError sourceUrl={zoomed.details.sourceUrl} onRetry={retryImage} />
          : failedSources.has(zoomed.src) ? <SourceImageError /> : <ZoomableImage key={imageKey(zoomed.src)} src={zoomed.src} alt={zoomed.alt} onError={zoomed.details ? () => imageFailed(zoomed.src) : () => void sourceFailed(zoomed.src)} />)}
      </div>
    </dialog>
  </div>;
}

function ExternalImageError({sourceUrl,onRetry}:{sourceUrl:string;onRetry:()=>void}) {
  return <div className="stack">
    <p role="alert">{"Image couldn't load"}</p>
    <button type="button" onClick={onRetry}>Retry</button>
    <a href={sourceUrl} target="_blank" rel="noreferrer">Open on Commons</a>
  </div>;
}

function SourceImageError() { return <p role="status">Image unavailable. Try reopening the reviewer when connected.</p>; }

function AskImageButton({ image, online, onAsk, hideOfflineNote = false }: { image?: StudyImageTarget; online: boolean; onAsk?: (image: StudyImageTarget) => void; hideOfflineNote?: boolean }) {
  return <div className="stack">
    <button className="subtle row reviewer-image-action" disabled={!online || !image || !onAsk} onClick={() => image && onAsk?.(image)}>
      <ImageHelpIcon />Ask about this image
    </button>
    {!online && !hideOfflineNote && <p className="meta">{STUDY_OFFLINE}</p>}
  </div>;
}
