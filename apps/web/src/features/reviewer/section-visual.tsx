"use client";
/* Signed source URLs must not pass through a public image-optimization cache. */
/* eslint-disable @next/next/no-img-element */
import { STUDY_OFFLINE, type StudyImageTarget, type StudyImageDownload } from "@stay-focused/shared";
import { downloadStudyImage } from './download-image';
import { Icon } from "../../components/ui";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../components/providers";
import { useResource } from "../../lib/hooks";

type Snapshot = { available: false; reason: string } | { available: true; id?: string; page: number; labelKind?: "slide"; status?: "rendering" | "unrendered"; url?: string };
type Figure = { id: string; url: string; page?: number; slide?: number };
export type ExternalVisual = { status: "found"; id?: string; image: string; title: string; credit: string; license: string; licenseUrl: string; sourceUrl: string; label: string; attemptCount: number };
type ReviewerVisuals = { sections: Record<string, ExternalVisual>; checked: number; total: number; running: boolean };

/**
 * Labeled reference visuals for the whole reviewer in one request. New reviewers get them at generation;
 * older ones are filled once in the background on first open, and the reader polls until that finishes.
 */
export function useReviewerVisuals(artifactId: string | null) {
  const { api, session } = useAuth();
  const [state, setState] = useState<ReviewerVisuals | null>(null);
  useEffect(() => {
    setState(null);
    if (!artifactId || !session?.user.id) return;
    const path = `/api/reviewers/${encodeURIComponent(artifactId)}/visuals`;
    let alive = true, polls = 0, idle = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const load = async (): Promise<ReviewerVisuals | null> => {
      try { const value = await api<ReviewerVisuals>(path); if (alive) setState(value); return value; } catch { return null; }
    };
    const poll = async () => {
      const value = await load();
      polls++; idle = value?.running ? 0 : idle + 1;
      // Keep polling while the batch runs; give it a few quiet polls to start; stop after ~4 minutes.
      if (alive && polls < 60 && idle < 4) timer = setTimeout(() => void poll(), 4000);
    };
    void (async () => {
      const first = await load();
      if (!alive || !first || (first.checked >= first.total && !first.running)) return;
      if (!first.running) { try { await api(path, { method: "POST", body: {} }); } catch { return; } }
      timer = setTimeout(() => void poll(), 3000);
    })();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [api, artifactId, session?.user.id]);
  return state?.sections ?? null;
}

export function SectionVisual({ artifactId, sectionId, hasFigures, external: initialExternal, onAsk, reviewerTitle = 'Reviewer', sectionTitle = 'Section' }: { artifactId: string; sectionId: string; hasFigures: boolean | undefined; external?: ExternalVisual; onAsk?: (image: StudyImageTarget) => void; reviewerTitle?: string; sectionTitle?: string }) {
  const { api, session } = useAuth();
  const holder = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false), [online, setOnline] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [figures, setFigures] = useState<Figure[]>([]);
  const [replacement, setReplacement] = useState<ExternalVisual | null>(null), [busy, setBusy] = useState(false);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string; image?: StudyImageTarget; download: StudyImageDownload } | null>(null), [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false), [saveNote, setSaveNote] = useState('');
  const savePending = useRef(false);
  const path = `/api/reviewers/${encodeURIComponent(artifactId)}/sections/${encodeURIComponent(sectionId)}`;
  const external = replacement ?? initialExternal;
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); if (!navigator.onLine) dialog.current?.close(); };
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    if (!holder.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "800px" });
    observer.observe(holder.current); return () => observer.disconnect();
  }, []);
  // Course visuals load inline: extracted figures first, otherwise the cited page/slide.
  useEffect(() => {
    if (!online) return;
    setSnapshot(null); setFigures([]);
    if (!visible || !online || !session?.user.id || hasFigures === undefined) return;
    const controller = new AbortController();
    void (async () => {
      try {
        if (hasFigures) {
          const value = await api<{ figures: Figure[] }>(`${path}/figures`, { signal: controller.signal });
          if (!controller.signal.aborted) setFigures(value.figures);
          return;
        }
        const probe = await api<Snapshot>(`${path}/snapshot?render=0`, { signal: controller.signal });
        if (controller.signal.aborted || !probe.available) return;
        setSnapshot(probe.url ? probe : await api<Snapshot>(`${path}/snapshot`, { signal: controller.signal }));
      } catch { /* No visual is a calm state. */ }
    })();
    return () => controller.abort();
  }, [api, path, visible, online, session?.user.id, hasFigures]);
  function open(src: string, alt: string, image: StudyImageTarget | undefined, kind: StudyImageDownload['kind']) {
    setZoomed({ src, alt, image, download: { uri: src, reviewerTitle, sectionTitle, kind,
      ...(kind === 'external_visual' && external ? { sourceTitle: external.title, attribution: `${external.credit} · ${external.license}` } : {}) } });
    setSaveNote(''); setZoom(1); dialog.current?.showModal();
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
  const frame = { padding: 0, border: 0, background: "#fff", borderRadius: 12, cursor: "zoom-in", overflow: "hidden" };
  return <div ref={holder} className="section-visual stack">
    {online && figures.length > 0 && <figure className="surface stack" style={{ margin: 0 }}>
      <span className="muted" style={caption}>From your course material</span>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: figures.length > 1 ? "repeat(auto-fill, minmax(220px, 1fr))" : "1fr" }}>
        {figures.map(figure => {
          const alt = figure.slide ? `Diagram from slide ${figure.slide}` : figure.page ? `Diagram from page ${figure.page}` : "Source diagram";
          const image: StudyImageTarget = {reference:{kind:'figure',id:figure.id},thumbnail:figure.url,label:alt};
          return <div key={figure.id} className="stack"><button type="button" aria-label={`Enlarge ${alt}`} onClick={() => open(figure.url, alt, image, 'figure')} style={frame}>
            <img src={figure.url} alt={alt} style={{ display: "block", width: "100%", maxHeight: 360, objectFit: "contain" }} />
          </button><AskImageButton image={image} online={online} onAsk={onAsk} /></div>;
        })}
      </div>
    </figure>}
    {online && !figures.length && snapshotUrl && <figure className="surface stack" style={{ margin: 0 }}>
      <span className="muted" style={caption}>{snapshotLabel} · your course material</span>
      <button type="button" aria-label={`Enlarge ${snapshotLabel}`} onClick={() => open(snapshotUrl, snapshotLabel, snapshotImage, 'page_snapshot')} style={frame}>
        <img src={snapshotUrl} alt={snapshotLabel} style={{ display: "block", width: "100%", maxHeight: 420, objectFit: "contain" }} />
      </button>
      <AskImageButton image={snapshotImage} online={online} onAsk={onAsk} />
    </figure>}
    {online && !hasSource && external && <figure className="surface stack" style={{ margin: 0 }}>
      <span className="muted" style={caption}>{external.label}</span>
      {/* Commons candidates are validated by the owner-scoped API. */}
      <button type="button" aria-label="Enlarge visual" onClick={() => open(external.image, external.title, externalImage, 'external_visual')} style={frame}>
        <img src={external.image} alt={external.title} style={{ display: "block", width: "100%", maxHeight: 380, objectFit: "contain" }} />
      </button>
      <AskImageButton image={externalImage} online={online} onAsk={onAsk} />
      <figcaption className="row" style={{ fontSize: 12, opacity: 0.7, flexWrap: "wrap", gap: 8 }}>
        <span className="grow"><a href={external.sourceUrl} target="_blank" rel="noreferrer">{external.credit.slice(0, 120)} · {external.license}</a> · <a href={external.licenseUrl} target="_blank" rel="noreferrer">License</a></span>
        {external.attemptCount < 2 && <button disabled={busy} onClick={() => void another()} style={{ fontSize: 12 }}>{busy ? "Finding…" : "Show a different one"}</button>}
      </figcaption>
    </figure>}
    {!online && (hasSource || external) && <AskImageButton online={false} />}
    <dialog ref={dialog} aria-label={zoomed?.alt ?? "Visual"} className="surface stack" style={{ width: "min(94vw, 1000px)", maxHeight: "90vh" }}>
      <div className="row"><strong className="grow">{zoomed?.alt}</strong><button onClick={() => dialog.current?.close()}>Close</button></div>
      <AskImageButton image={zoomed?.image} online={online} onAsk={image=>{dialog.current?.close();onAsk?.(image);}} />
      {session?.user.id && zoomed && <button className="subtle row" disabled={!online || saving} onClick={() => void save()}><Icon name="download" />{saving ? 'Saving…' : 'Save image'}</button>}
      {saveNote && <p role="status">{saveNote}</p>}
      <label>Zoom<input type="range" min="1" max="4" step="0.25" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
      <div style={{ overflow: "auto", maxHeight: "70vh" }}>
        {zoomed && <img src={zoomed.src} alt={zoomed.alt} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} />}
      </div>
    </dialog>
  </div>;
}

export function useFigureAvailability(artifactId: string | null) {
  return useResource<{ sections: { sectionId: string; hasFigures: boolean }[] }>(artifactId ? `/api/reviewers/${encodeURIComponent(artifactId)}/figures` : null).data;
}

function AskImageButton({ image, online, onAsk }: { image?: StudyImageTarget; online: boolean; onAsk?: (image: StudyImageTarget) => void }) {
  return <div className="stack">
    <button className="subtle row" disabled={!online || !image || !onAsk} onClick={() => image && onAsk?.(image)}>
      <Icon name="message-circle" />Ask about this image
    </button>
    {!online && <p className="meta">{STUDY_OFFLINE}</p>}
  </div>;
}
