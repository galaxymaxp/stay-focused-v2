import React from "react";

/**
 * Small status / metadata pill. Used for course names, grounding state,
 * counts, and inline tags. Tones map to the earthy semantic palette.
 */
export function Chip({ children, tone = "neutral", soft = true, iconLeft, style, ...rest }) {
  const tones = {
    neutral: { fg: "var(--text-secondary)", bg: "var(--surface-soft)", bd: "var(--border-strong)" },
    accent: { fg: "var(--accent-foreground)", bg: "var(--accent-light)", bd: "var(--accent-border)" },
    red: { fg: "var(--red)", bg: "var(--red-light)", bd: "color-mix(in srgb, var(--red) 30%, transparent)" },
    amber: { fg: "var(--amber)", bg: "var(--amber-light)", bd: "color-mix(in srgb, var(--amber) 30%, transparent)" },
    green: { fg: "var(--green)", bg: "var(--green-light)", bd: "color-mix(in srgb, var(--green) 30%, transparent)" },
    blue: { fg: "var(--blue)", bg: "var(--blue-light)", bd: "color-mix(in srgb, var(--blue) 30%, transparent)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontFamily: "var(--font-sans)",
        fontSize: "12px",
        fontWeight: "var(--weight-semibold)",
        lineHeight: 1,
        padding: "0.3rem 0.55rem",
        borderRadius: "var(--radius-pill)",
        color: t.fg,
        background: soft ? t.bg : "transparent",
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {iconLeft ? <span style={{ display: "inline-flex", opacity: 0.85 }}>{iconLeft}</span> : null}
      {children}
    </span>
  );
}

export default Chip;
