"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps } from "react";

/** Reserve six pixels around cards; even very tall titles grow at most three per edge. */
export function CourseNavigation({ className = "", onPointerDown, onPointerUp,
  onPointerCancel, onPointerLeave, onBlur, onDragStart, ...props }: ComponentProps<typeof Link>) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => node.style.setProperty("--course-navigation-scale",
      String(Math.min(1.01, 1 + 6 / Math.max(1, node.offsetWidth, node.offsetHeight))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pressed) return;
    const release = () => setPressed(false);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    return () => {
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
    };
  }, [pressed]);
  return <Link {...props} ref={ref} className={`${className} course-navigation`} data-pressed={pressed || undefined}
    onPointerDown={event => {
      onPointerDown?.(event);
      if (event.isPrimary && event.button === 0 && !event.defaultPrevented) setPressed(true);
    }}
    onPointerUp={event => { setPressed(false); onPointerUp?.(event); }}
    onPointerCancel={event => { setPressed(false); onPointerCancel?.(event); }}
    onPointerLeave={event => { setPressed(false); onPointerLeave?.(event); }}
    onBlur={event => { setPressed(false); onBlur?.(event); }}
    onDragStart={event => { setPressed(false); onDragStart?.(event); }} />;
}
