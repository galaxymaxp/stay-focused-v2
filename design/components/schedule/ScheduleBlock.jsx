import React from "react";

/* Per-tone Liquid Glass palette for schedule blocks. Each block is a
 * translucent, blurred glass tile tinted with its course color. */
const TONES = {
  accent: { base: "var(--accent)", fg: "var(--accent-foreground)" },
  red:    { base: "var(--red)",    fg: "#3a160d" },
  amber:  { base: "var(--amber)",  fg: "#3a280d" },
  green:  { base: "var(--green)",  fg: "#16271b" },
  blue:   { base: "var(--blue)",   fg: "#132236" },
  neutral:{ base: "var(--text-muted)", fg: "var(--text-primary)" },
};

/**
 * One block on the Today schedule — a full course-colored **Liquid Glass tile**.
 * The whole cell is tinted with the tone (translucent + blurred + specular top
 * edge), not a thin color bar. Leading time, title, subtitle, trailing
 * chevron / NOW pill / check. States: now (stronger tint, lifted), done
 * (faded), default.
 */
export function ScheduleBlock({
  time,
  endTime,
  title,
  course,
  tone = "neutral",
  state = "default",
  meta,
  trailing,
  onClick,
  style,
  ...rest
}) {
  const isNow = state === "now";
  const isDone = state === "done";
  const t = TONES[tone] || TONES.neutral;

  // tint strengths
  const fill = isNow ? 30 : 17;          // % course color in the glass veil
  const edge = isNow ? 46 : 34;          // rim hairline strength
  const ink = `color-mix(in srgb, ${t.base} 58%, var(--text-primary))`; // tone-tinted, adapts to theme

  const chevron = (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M1 1l6 5.5L1 12" stroke={ink} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const check = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M20 6 9 17l-5-5" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  let tail = trailing;
  if (!tail) {
    if (isNow) {
      tail = (
        <span style={{ fontSize: 10, fontWeight: "var(--weight-heavy)", letterSpacing: "0.07em", textTransform: "uppercase",
          color: t.fg, background: `color-mix(in srgb, ${t.base} 78%, white)`, borderRadius: 999, padding: "0.2rem 0.5rem",
          boxShadow: "var(--highlight-sheen)" }}>
          Now
        </span>
      );
    } else if (isDone) {
      tail = check;
    } else {
      tail = chevron;
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: "0.8rem",
        width: "100%",
        textAlign: "left",
        padding: "0.85rem 0.95rem",
        borderRadius: "var(--radius-panel)",
        cursor: onClick ? "pointer" : "default",
        opacity: isDone ? 0.6 : 1,
        fontFamily: "var(--font-sans)",
        // course-colored Liquid Glass
        background: `linear-gradient(180deg, color-mix(in srgb, ${t.base} ${fill + 8}%, transparent) 0%, color-mix(in srgb, ${t.base} ${fill}%, transparent) 60%), var(--glass-base)`,
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        border: `1px solid color-mix(in srgb, ${t.base} ${edge}%, transparent)`,
        boxShadow: isNow
          ? `var(--glass-shadow-float), var(--glass-inner)`
          : `0 4px 14px color-mix(in srgb, ${t.base} 14%, transparent), var(--glass-inner)`,
        transition: "transform 130ms ease, box-shadow 160ms ease",
        ...style,
      }}
      {...rest}
    >
      {/* specular top sheen */}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 40%)", mixBlendMode: "screen" }} />

      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", width: "46px", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: "var(--weight-bold)", lineHeight: 1.15, fontVariantNumeric: "tabular-nums", color: ink }}>{time}</span>
        {endTime ? (
          <span style={{ fontSize: 11, lineHeight: 1.2, color: ink, opacity: 0.65, fontVariantNumeric: "tabular-nums" }}>{endTime}</span>
        ) : null}
      </span>

      <span style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.12rem", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: "var(--weight-semibold)", letterSpacing: "-0.01em", lineHeight: 1.3,
          color: "var(--text-primary)", textDecoration: isDone ? "line-through" : "none",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        {(course || meta) && (
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
            {course ? <span style={{ fontSize: 13, fontWeight: 700, color: ink, whiteSpace: "nowrap" }}>{course}</span> : null}
            {course && meta ? <span style={{ fontSize: 13, color: ink, opacity: 0.5 }}>·</span> : null}
            {meta ? <span style={{ fontSize: 13, color: ink, opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</span> : null}
          </span>
        )}
      </span>

      <span style={{ position: "relative", display: "flex", alignItems: "center", flexShrink: 0 }}>{tail}</span>
    </button>
  );
}

/**
 * Spaced stack of course-colored glass ScheduleBlock tiles, with an optional
 * inset section header. (No longer an inset container — each tile is its own
 * glass card.)
 */
export function ScheduleGroup({ header, right, children, style }) {
  return (
    <div style={{ ...style }}>
      {(header || right) && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 0.4rem", margin: "0 0 0.55rem" }}>
          {header ? <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", color: "var(--text-muted)" }}>{header}</span> : <span />}
          {right ? <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>{right}</span> : null}
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

export default ScheduleBlock;
