import React from "react";

/**
 * Tiny count / status badge. A dot or a small number — used on nav icons,
 * the FAB, and unread indicators.
 */
export function Badge({ count, dot = false, tone = "accent", style, ...rest }) {
  const tones = {
    accent: { bg: "var(--accent)", fg: "var(--accent-foreground)" },
    red: { bg: "var(--red)", fg: "#fff" },
    green: { bg: "var(--green)", fg: "#fff" },
    neutral: { bg: "var(--text-muted)", fg: "#fff" },
  };
  const t = tones[tone] || tones.accent;
  if (dot) {
    return (
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "999px",
          background: t.bg,
          boxShadow: "0 0 0 2px var(--app-bg)",
          ...style,
        }}
        {...rest}
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "18px",
        height: "18px",
        padding: "0 5px",
        borderRadius: "999px",
        background: t.bg,
        color: t.fg,
        fontFamily: "var(--font-sans)",
        fontSize: "11px",
        fontWeight: "var(--weight-bold)",
        lineHeight: 1,
        boxShadow: "0 0 0 2px var(--app-bg)",
        ...style,
      }}
      {...rest}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default Badge;
