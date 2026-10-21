"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/** Accumulate slow drags; ignore direction jitter smaller than 12px. */
export function nextScrollVisibility(previous: { hidden: boolean; anchor: number }, scrollY: number) {
  const y = Math.max(0, scrollY);
  if (!Number.isFinite(y)) return previous;
  if (y === 0) return { hidden: false, anchor: 0 };
  const anchor = previous.hidden ? Math.max(previous.anchor, y) : Math.min(previous.anchor, y);
  if (!previous.hidden && y - anchor >= 12) return { hidden: true, anchor: y };
  if (previous.hidden && anchor - y >= 12) return { hidden: false, anchor: y };
  return { hidden: previous.hidden, anchor };
}

export function useHideOnScroll({ forceVisible = false }: { forceVisible?: boolean } = {}) {
  const [hidden, setHidden] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [height, setHeight] = useState(0);
  const element = useRef<HTMLElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const measureRef = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    element.current = node;
    if (!node) return;
    const measure = () => setHeight(node.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      observer.current = new ResizeObserver(measure);
      observer.current.observe(node);
    }
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  const decision = useRef({ hidden: false, anchor: 0 });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const phone = window.matchMedia("(max-width: 760px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reset = () => {
      if (element.current) setHeight(element.current.getBoundingClientRect().height);
      decision.current = { hidden: false, anchor: Math.max(0, window.scrollY) };
      setHidden(false);
      setNarrow(phone.matches);
      setReducedMotion(motion.matches);
    };
    const scroll = () => {
      const next = !phone.matches || forceVisible
        ? { hidden: false, anchor: Math.max(0, window.scrollY) }
        : nextScrollVisibility(decision.current, window.scrollY);
      if (next.hidden !== decision.current.hidden) setHidden(next.hidden);
      decision.current = next;
    };
    reset();
    window.addEventListener("scroll", scroll, { passive: true });
    phone.addEventListener("change", reset);
    motion.addEventListener("change", reset);
    return () => {
      window.removeEventListener("scroll", scroll);
      phone.removeEventListener("change", reset);
      motion.removeEventListener("change", reset);
    };
  }, [forceVisible]);

  const collapsed = narrow && !forceVisible && hidden;
  const style: CSSProperties | undefined = narrow ? {
    position: "absolute", top: 0, left: 0, right: 0,
    transform: collapsed ? "translateY(calc(-100% - 16px))" : "translateY(0)",
    opacity: collapsed ? 0 : 1,
    transition: reducedMotion ? "none" : "transform 200ms ease, opacity 200ms ease",
    pointerEvents: collapsed ? "none" : "auto",
  } : undefined;
  const slotStyle: CSSProperties = narrow
    ? { position: "sticky", top: 0, zIndex: 2, height, pointerEvents: "none" }
    : { display: "contents" };
  return { hidden: collapsed, style, slotStyle, measureRef };
}
