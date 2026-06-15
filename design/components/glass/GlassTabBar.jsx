import React from "react";

const GLASS = {
  background:
    "linear-gradient(180deg, var(--glass-tint) 0%, transparent 55%), var(--glass-base)",
  WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  border: "1px solid var(--glass-hairline)",
  boxShadow: "var(--glass-shadow-float), var(--glass-inner)",
};

/**
 * iOS 26 Liquid Glass tab bar — a floating, inset capsule docked above the
 * home indicator. Gold-tinted glass; active tab gets a gold pill + label.
 */
export function GlassTabBar({ items = [], activeId, onSelect, style }) {
  return (
    <nav
      style={{
        position: "absolute",
        left: "50%",
        bottom: "calc(14px + var(--app-safe-bottom))",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "7px",
        borderRadius: "var(--radius-pill)",
        ...GLASS,
        ...style,
      }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect && onSelect(item.id)}
            aria-current={active ? "page" : undefined}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              minWidth: active ? "64px" : "52px",
              height: "52px",
              padding: active ? "0 14px" : "0 8px",
              border: "none",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              background: active
                ? "linear-gradient(180deg, color-mix(in srgb, var(--accent) 92%, #fff 8%), var(--accent))"
                : "transparent",
              color: active ? "var(--accent-foreground)" : "var(--text-secondary)",
              boxShadow: active ? "var(--shadow-low), var(--highlight-sheen)" : "none",
              transition: "background 180ms ease, min-width 180ms ease, color 160ms ease",
              fontFamily: "var(--font-sans)",
            }}
          >
            <span style={{ display: "inline-flex" }} aria-hidden="true">{item.icon}</span>
            {active ? (
              <span style={{ fontSize: "10px", fontWeight: "var(--weight-bold)", letterSpacing: "0.01em" }}>
                {item.label}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export default GlassTabBar;
