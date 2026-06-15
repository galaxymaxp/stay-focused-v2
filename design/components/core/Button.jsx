import React from "react";

/**
 * Stay Focused button. Flat, warm, gold accent on primary.
 * Variants: primary (gold), secondary (surface), ghost (text-only), danger.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  full = false,
  disabled = false,
  style,
  ...rest
}) {
  const sizes = {
    sm: { fontSize: "13px", padding: "0.4rem 0.7rem", height: "32px", gap: "0.35rem" },
    md: { fontSize: "14px", padding: "0.55rem 0.95rem", height: "40px", gap: "0.45rem" },
    lg: { fontSize: "15px", padding: "0.7rem 1.2rem", height: "48px", gap: "0.5rem" },
  };

  const variants = {
    primary: {
      background: "var(--accent)",
      color: "var(--accent-foreground)",
      border: "1px solid var(--accent-border)",
      boxShadow: "var(--shadow-low), var(--highlight-sheen)",
    },
    secondary: {
      background: "var(--surface-elevated)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-strong)",
      boxShadow: "var(--shadow-low)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid transparent",
    },
    danger: {
      background: "var(--red-light)",
      color: "var(--red)",
      border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)",
    },
  };

  return (
    <button
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: full ? "100%" : "auto",
        fontFamily: "var(--font-sans)",
        fontWeight: "var(--weight-semibold)",
        letterSpacing: "var(--tracking-tight)",
        borderRadius: "var(--radius-control)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        transition: "transform 140ms ease, background-color 140ms ease, box-shadow 140ms ease",
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {iconLeft ? <span style={{ display: "inline-flex" }}>{iconLeft}</span> : null}
      {children}
      {iconRight ? <span style={{ display: "inline-flex" }}>{iconRight}</span> : null}
    </button>
  );
}

export default Button;
