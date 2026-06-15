import React from "react";

/**
 * iOS 26 Liquid Glass navigation bar — the top chrome of a screen. Translucent
 * gold-tinted glass with a leading mark/back control, a centered or leading
 * title, and an optional trailing action.
 */
export function GlassNavBar({ title, subtitle, leading, trailing, large = false, style }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: large ? "flex-end" : "center",
        justifyContent: "space-between",
        gap: "0.6rem",
        padding: large
          ? "calc(8px + var(--app-safe-top)) 18px 12px"
          : "calc(6px + var(--app-safe-top)) 14px 8px",
        minHeight: "var(--nav-bar-height)",
        background:
          "linear-gradient(180deg, var(--glass-tint) 0%, transparent 70%), var(--glass-base)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        borderBottom: "1px solid var(--glass-hairline)",
        boxShadow: "var(--glass-inner)",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", minWidth: 0 }}>
        {leading ? <span style={{ display: "inline-flex" }}>{leading}</span> : null}
        <div style={{ minWidth: 0 }}>
          {subtitle ? (
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              {subtitle}
            </div>
          ) : null}
          <div
            style={{
              fontSize: large ? "var(--type-h1)" : "var(--type-h3)",
              fontWeight: large ? "var(--weight-heavy)" : "var(--weight-bold)",
              letterSpacing: "var(--tracking-tight)",
              color: "var(--text-primary)",
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        </div>
      </div>
      {trailing ? <span style={{ display: "inline-flex", flexShrink: 0 }}>{trailing}</span> : null}
    </header>
  );
}

export default GlassNavBar;
