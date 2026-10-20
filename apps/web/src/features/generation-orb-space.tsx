"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fit the complete square canvas and its touch layer to the remaining slot. */
export function GenerationOrbSpace({ children }: { children: ReactNode }) {
  const slot = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  useEffect(() => {
    const node = slot.current;
    if (!node) return;
    const measure = () =>
      setSize(Math.max(0, Math.min(340, node.clientWidth, node.clientHeight)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={slot} className="generation-orb-space">
      <div
        className="generation-orb-square"
        style={{ width: size, height: size }}
      >
        {children}
      </div>
    </div>
  );
}
