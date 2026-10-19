"use client";
/* Signed source URLs must not pass through a public image-optimization cache. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type PointerEvent } from 'react';

const fit = { scale: 1, x: 0, y: 0, originX: 50, originY: 50 };

/** Fit is stable: only the image transform changes during zoom and pan. */
export function ZoomableImage({ src, alt, onError }: { src: string; alt: string; onError: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [view, setView] = useState(fit);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ id: number; x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    // Computed layout dimensions retain fractional pixels and exclude the
    // dialog's existing entrance transform.
    const measure = () => { const style = getComputedStyle(node); setSize({ width: parseFloat(style.width), height: parseFloat(style.height) }); setView(fit); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const ratio = natural.width && natural.height ? Math.min(size.width / natural.width, size.height / natural.height) : 0;
  const width = natural.width * ratio, height = natural.height * ratio;
  const clamp = (offset: number, image: number, viewport: number, scale: number) => {
    const limit = Math.max(0, (image * scale - viewport) / 2);
    return Math.max(-limit, Math.min(limit, offset));
  };
  function toggle(x: number, y: number) {
    setView(current => current.scale > 1 ? fit : {
      scale: 2.5, x: clamp((size.width / 2 - x) * 1.5, width, size.width, 2.5),
      y: clamp((size.height / 2 - y) * 1.5, height, size.height, 2.5),
      originX: width ? Math.max(0, Math.min(100, (x - (size.width - width) / 2) / width * 100)) : 50,
      originY: height ? Math.max(0, Math.min(100, (y - (size.height - height) / 2) / height * 100)) : 50,
    });
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    const tapped = !gesture.current.moved && event.type === 'pointerup';
    // Touch browsers can omit click after pointer capture. Complete taps here,
    // then ignore the compatibility click when one is emitted.
    suppressClick.current = true;
    gesture.current = null; setDragging(false);
    if (tapped) {
      const bounds = event.currentTarget.getBoundingClientRect();
      toggle(event.clientX - bounds.left, event.clientY - bounds.top);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return <div ref={frame} className="reviewer-image-frame" role="button" tabIndex={0}
    aria-label={`${alt}. ${view.scale > 1 ? 'Zoom out' : 'Zoom in'}`} aria-pressed={view.scale > 1}
    style={{ cursor: view.scale > 1 ? 'zoom-out' : 'zoom-in', touchAction: view.scale > 1 ? 'none' : 'pan-y' }}
    onClick={event => {
      if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; }
      suppressClick.current = false;
      const bounds = event.currentTarget.getBoundingClientRect();
      toggle(event.detail === 0 ? size.width / 2 : event.clientX - bounds.left, event.detail === 0 ? size.height / 2 : event.clientY - bounds.top);
    }}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(size.width / 2, size.height / 2); } }}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick.current = false;
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: view.x, panY: view.y, moved: false };
      if (view.scale > 1) event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > 4) start.moved = true;
      if (view.scale === 1 || !start.moved) return;
      setDragging(true);
      setView({ ...view, x: clamp(start.panX + dx, width, size.width, view.scale), y: clamp(start.panY + dy, height, size.height, view.scale) });
    }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { gesture.current = null; setDragging(false); }}>
    <img src={src} alt={alt} draggable={false} decoding="async" onError={onError}
      onLoad={event => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      className="reviewer-zoom-image" style={{ width: ratio ? width : undefined, height: ratio ? height : undefined,
        // Store pan relative to the center so its clamp is independent of origin.
        transformOrigin: `${view.originX}% ${view.originY}%`,
        transform: `translate(${view.x + (view.scale - 1) * width * (view.originX / 100 - .5)}px, ${view.y + (view.scale - 1) * height * (view.originY / 100 - .5)}px) scale(${view.scale})`,
        transitionDuration: dragging ? '0ms' : undefined }} />
  </div>;
}
