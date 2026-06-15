import React from "react";

const TONES = {
  accent: "var(--accent)", red: "var(--red)", amber: "var(--amber)",
  green: "var(--green)", blue: "var(--blue)", neutral: "var(--text-muted)",
};

/**
 * The Today screen's answer to "what should I do right now?".
 * An iOS-style focus card: clean elevated surface (no gradient), a category dot
 * + status label, a headline, a slim progress track, and a filled + tinted
 * action pair. Flat — the chrome around it carries the glass.
 */
export function NowHero({
  kicker = "Now",
  title,
  course,
  courseTone = "accent",
  reason,
  timeLabel,
  timeLeft,
  progress = 0.32,
  primaryLabel = "Start now",
  onPrimary,
  secondaryLabel = "Snooze 15m",
  onSecondary,
  startIcon,
  style,
}) {
  const dot = TONES[courseTone] || TONES.accent;
  const pct = Math.max(0, Math.min(1, progress));

  const btnBase = {
    height: 50, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
    borderRadius: 14, fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: "var(--weight-semibold)",
    letterSpacing: "-0.01em", cursor: "pointer", border: "none",
  };

  return (
    <section
      style={{
        position: "relative",
        borderRadius: "var(--radius-page)",
        padding: "1.05rem 1.1rem 1.1rem",
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-medium)",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: 12, fontWeight: "var(--weight-bold)",
          letterSpacing: "0.06em", textTransform: "uppercase", color: dot }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />
          {kicker}
        </span>
        {timeLeft ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{timeLeft}</span>
        ) : null}
      </div>

      <h2 style={{ margin: "0.5rem 0 0", fontSize: 21, lineHeight: 1.2, letterSpacing: "-0.022em",
        fontWeight: "var(--weight-bold)", color: "var(--text-primary)", textWrap: "balance" }}>
        {title}
      </h2>

      {(course || timeLabel) && (
        <p style={{ margin: "0.3rem 0 0", fontSize: 15, color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
          {course}{course && timeLabel ? "  ·  " : ""}{timeLabel}
        </p>
      )}

      {/* iOS-style progress track */}
      <div style={{ marginTop: "0.9rem", height: 5, borderRadius: 999, background: "color-mix(in srgb, var(--text-muted) 16%, transparent)", overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 999, background: dot }} />
      </div>

      {reason ? (
        <p style={{ margin: "0.7rem 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>{reason}</p>
      ) : null}

      <div style={{ display: "flex", gap: "0.55rem", marginTop: "1rem" }}>
        <button type="button" onClick={onPrimary}
          style={{ ...btnBase, flex: 1, background: "var(--accent)", color: "var(--accent-foreground)", boxShadow: "var(--highlight-sheen)" }}>
          {startIcon ? <span style={{ display: "inline-flex" }}>{startIcon}</span> : null}
          {primaryLabel}
        </button>
        {secondaryLabel ? (
          <button type="button" onClick={onSecondary}
            style={{ ...btnBase, padding: "0 1.05rem", background: "var(--surface-soft)", color: "var(--text-primary)", border: "1px solid var(--border-strong)" }}>
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default NowHero;
