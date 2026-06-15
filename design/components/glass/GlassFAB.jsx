import React from "react";

/**
 * iOS 26 Liquid Glass floating action button. Gold-tinted glass orb with a
 * specular top edge. The single "create" affordance — new block / generate.
 */
export function GlassFAB({ icon, label, onClick, style, ...rest }) {
  const extended = Boolean(label);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={!extended && rest["aria-label"] ? rest["aria-label"] : undefined}
      style={{
        position: "absolute",
        right: "18px",
        bottom: "calc(86px + var(--app-safe-bottom))",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: extended ? "0.5rem" : 0,
        height: "56px",
        width: extended ? "auto" : "56px",
        padding: extended ? "0 20px 0 18px" : 0,
        borderRadius: "var(--radius-pill)",
        cursor: "pointer",
        color: "var(--accent-foreground)",
        background:
          "linear-gradient(180deg, var(--glass-tint-strong) 0%, var(--glass-tint) 60%), var(--glass-base)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        border: "1px solid color-mix(in srgb, var(--accent-border) 50%, var(--glass-hairline))",
        boxShadow: "var(--glass-shadow-float), var(--glass-inner)",
        fontFamily: "var(--font-sans)",
        fontSize: "15px",
        fontWeight: "var(--weight-bold)",
        letterSpacing: "var(--tracking-tight)",
        transition: "transform 140ms ease, box-shadow 160ms ease",
        ...style,
      }}
      {...rest}
    >
      <span style={{ display: "inline-flex" }} aria-hidden="true">{icon}</span>
      {extended ? label : null}
    </button>
  );
}

export default GlassFAB;
