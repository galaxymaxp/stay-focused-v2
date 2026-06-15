import React from "react";

/**
 * Flat content surface. The Stay Focused "flat" card — warm white, hairline
 * border, whisper-soft shadow. NEVER glass; content stays grounded.
 */
export function Card({ children, padding = "md", selected = false, accent = false, style, ...rest }) {
  const pads = { none: 0, sm: "0.75rem", md: "1rem", lg: "1.25rem" };
  return (
    <div
      style={{
        background: selected ? "var(--surface-selected)" : accent ? "var(--surface-accent)" : "var(--surface-base)",
        border: `1px solid ${selected || accent ? "var(--accent-border)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-panel)",
        boxShadow: "var(--shadow-low)",
        padding: pads[padding] ?? pads.md,
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
