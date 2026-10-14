"use client";
/* Signed source URLs must not pass through a public image-optimization cache. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../components/providers";
import { Notice } from "../../components/ui";
import { useAction, useResource } from "../../lib/hooks";

type Snapshot = { available: false; reason: string } | { available: true; page: number; labelKind?: "slide"; status?: "rendering" | "unrendered"; url?: string };
type Figure = { id: string; url: string; page?: number; slide?: number };
type External = ({ status: "found"; image: string; title: string; credit: string; license: string; licenseUrl: string; sourceUrl: string; label: string } | { status: "none"; message: string }) & { attemptCount: number };
export function SectionVisual({ artifactId, sectionId, hasFigures }: { artifactId: string; sectionId: string; hasFigures: boolean | undefined }) {
  const { api, session } = useAuth();
  const holder = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false), [online, setOnline] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [figures, setFigures] = useState<Figure[]>([]), [external, setExternal] = useState<External | null>(null), [zoom, setZoom] = useState(1), [externalZoom, setExternalZoom] = useState(false);
  const action = useAction();
  const path = `/api/reviewers/${encodeURIComponent(artifactId)}/sections/${encodeURIComponent(sectionId)}`;
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); if (!navigator.onLine) dialog.current?.close(); };
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    if (!holder.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "100px" });
    observer.observe(holder.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setSnapshot(null); setFigures([]); setExternal(null);
    if (!visible || !online || !session?.user.id) return;
    const controller = new AbortController();
    void api<Snapshot>(`${path}/snapshot?render=0`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setSnapshot(value); }).catch(() => undefined);
    return () => controller.abort();
  }, [api, path, visible, online, session?.user.id]);
  const label = snapshot?.available ? `From ${snapshot.labelKind === "slide" ? "slide" : "page"} ${snapshot.page}` : "Source diagrams";
  const sources = snapshot?.available || hasFigures;
  async function open() {
    setExternalZoom(false);
    if (hasFigures) { const value = await api<{ figures: Figure[] }>(`${path}/figures`); setFigures(value.figures); }
    if (snapshot?.available && !snapshot.url) setSnapshot(await api<Snapshot>(`${path}/snapshot`));
    setZoom(1); dialog.current?.showModal();
  }
  async function find(findAnother = false) {
    setExternal(await api<External>(`${path}/external-visual`, { method: "POST", body: { findAnother } }));
  }
  const image = externalZoom && external?.status === "found" ? external.image : snapshot?.available ? snapshot.url : undefined;
  const dialogLabel = externalZoom && external?.status === "found" ? external.label : label;
  return <div ref={holder} className="section-visual stack">
    {online && <>
      {sources ? <button disabled={action.busy} onClick={() => void action.run(open)}>{label}</button> : snapshot && hasFigures === false ? <button disabled={action.busy} onClick={() => void action.run(() => find())}>{action.busy ? "Finding a visual…" : "Find a visual"}</button> : null}
      {!sources && external && <div className="surface stack">
        {external.status === "none" ? <p>No reliable visual found</p> : <>
          <strong>{external.label}</strong>
          {/* Signed source URLs and Commons candidates are validated by the owner-scoped API. */}
          <img src={external.image} alt={external.title} style={{ maxWidth: "100%", maxHeight: 360, objectFit: "contain" }} />
          <button onClick={() => { setExternalZoom(true); setZoom(1); dialog.current?.showModal(); }}>Enlarge visual</button>
          <p><a href={external.sourceUrl} target="_blank" rel="noreferrer">{external.credit} · {external.license}</a> · <a href={external.licenseUrl} target="_blank" rel="noreferrer">License details</a></p>
        </>}
        {external.attemptCount < 2 && <button disabled={action.busy} onClick={() => void action.run(() => find(true))}>Find another</button>}
      </div>}
      {action.message && <Notice error>{action.message}</Notice>}
    </>}
    <dialog ref={dialog} aria-label={dialogLabel} className="surface stack" style={{ width: "min(94vw, 1000px)", maxHeight: "90vh" }}>
      <div className="row"><strong className="grow">{dialogLabel}</strong><button onClick={() => dialog.current?.close()}>Close</button></div>
      <label>Zoom<input type="range" min="1" max="4" step="0.25" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
      <div style={{ overflow: "auto", maxHeight: "70vh" }}>
        {image ? <img src={image} alt={dialogLabel} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} /> : snapshot?.available ? <p>{snapshot.status === "rendering" ? "Page preview is being prepared. Close and reopen shortly." : "Page preview unavailable"}</p> : null}
        {figures.map(figure => <img key={figure.id} src={figure.url} alt={figure.slide ? `Diagram from slide ${figure.slide}` : figure.page ? `Diagram from page ${figure.page}` : "Source diagram"} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} />)}
      </div>
    </dialog>
  </div>;
}

export function useFigureAvailability(artifactId: string | null) {
  return useResource<{ sections: { sectionId: string; hasFigures: boolean }[] }>(artifactId ? `/api/reviewers/${encodeURIComponent(artifactId)}/figures` : null).data;
}
