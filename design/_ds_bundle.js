/* @ds-bundle: {"format":3,"namespace":"StayFocusedDesignSystem_d2c06c","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"GlassFAB","sourcePath":"components/glass/GlassFAB.jsx"},{"name":"GlassNavBar","sourcePath":"components/glass/GlassNavBar.jsx"},{"name":"GlassTabBar","sourcePath":"components/glass/GlassTabBar.jsx"},{"name":"NowHero","sourcePath":"components/schedule/NowHero.jsx"},{"name":"ScheduleBlock","sourcePath":"components/schedule/ScheduleBlock.jsx"},{"name":"ScheduleGroup","sourcePath":"components/schedule/ScheduleBlock.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"532c762cfc05","components/core/Button.jsx":"64dd14055423","components/core/Card.jsx":"2ed914b95521","components/core/Chip.jsx":"a064bad7b957","components/glass/GlassFAB.jsx":"e7da8ca72bb0","components/glass/GlassNavBar.jsx":"89ff9095e52b","components/glass/GlassTabBar.jsx":"c3df0324c8b4","components/schedule/NowHero.jsx":"38663ed8c37f","components/schedule/ScheduleBlock.jsx":"cde74bbcf553","ui_kits/mobile/TodayScreen.jsx":"4e8b1ec42879","ui_kits/mobile/ios-frame.jsx":"be3343be4b51"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.StayFocusedDesignSystem_d2c06c = window.StayFocusedDesignSystem_d2c06c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tiny count / status badge. A dot or a small number — used on nav icons,
 * the FAB, and unread indicators.
 */
function Badge({
  count,
  dot = false,
  tone = "accent",
  style,
  ...rest
}) {
  const tones = {
    accent: {
      bg: "var(--accent)",
      fg: "var(--accent-foreground)"
    },
    red: {
      bg: "var(--red)",
      fg: "#fff"
    },
    green: {
      bg: "var(--green)",
      fg: "#fff"
    },
    neutral: {
      bg: "var(--text-muted)",
      fg: "#fff"
    }
  };
  const t = tones[tone] || tones.accent;
  if (dot) {
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "999px",
        background: t.bg,
        boxShadow: "0 0 0 2px var(--app-bg)",
        ...style
      }
    }, rest));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), count > 99 ? "99+" : count);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Stay Focused button. Flat, warm, gold accent on primary.
 * Variants: primary (gold), secondary (surface), ghost (text-only), danger.
 */
function Button({
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
    sm: {
      fontSize: "13px",
      padding: "0.4rem 0.7rem",
      height: "32px",
      gap: "0.35rem"
    },
    md: {
      fontSize: "14px",
      padding: "0.55rem 0.95rem",
      height: "40px",
      gap: "0.45rem"
    },
    lg: {
      fontSize: "15px",
      padding: "0.7rem 1.2rem",
      height: "48px",
      gap: "0.5rem"
    }
  };
  const variants = {
    primary: {
      background: "var(--accent)",
      color: "var(--accent-foreground)",
      border: "1px solid var(--accent-border)",
      boxShadow: "var(--shadow-low), var(--highlight-sheen)"
    },
    secondary: {
      background: "var(--surface-elevated)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-strong)",
      boxShadow: "var(--shadow-low)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid transparent"
    },
    danger: {
      background: "var(--red-light)",
      color: "var(--red)",
      border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
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
      ...style
    }
  }, rest), iconLeft ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, iconLeft) : null, children, iconRight ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, iconRight) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Flat content surface. The Stay Focused "flat" card — warm white, hairline
 * border, whisper-soft shadow. NEVER glass; content stays grounded.
 */
function Card({
  children,
  padding = "md",
  selected = false,
  accent = false,
  style,
  ...rest
}) {
  const pads = {
    none: 0,
    sm: "0.75rem",
    md: "1rem",
    lg: "1.25rem"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: selected ? "var(--surface-selected)" : accent ? "var(--surface-accent)" : "var(--surface-base)",
      border: `1px solid ${selected || accent ? "var(--accent-border)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-panel)",
      boxShadow: "var(--shadow-low)",
      padding: pads[padding] ?? pads.md,
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small status / metadata pill. Used for course names, grounding state,
 * counts, and inline tags. Tones map to the earthy semantic palette.
 */
function Chip({
  children,
  tone = "neutral",
  soft = true,
  iconLeft,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      fg: "var(--text-secondary)",
      bg: "var(--surface-soft)",
      bd: "var(--border-strong)"
    },
    accent: {
      fg: "var(--accent-foreground)",
      bg: "var(--accent-light)",
      bd: "var(--accent-border)"
    },
    red: {
      fg: "var(--red)",
      bg: "var(--red-light)",
      bd: "color-mix(in srgb, var(--red) 30%, transparent)"
    },
    amber: {
      fg: "var(--amber)",
      bg: "var(--amber-light)",
      bd: "color-mix(in srgb, var(--amber) 30%, transparent)"
    },
    green: {
      fg: "var(--green)",
      bg: "var(--green-light)",
      bd: "color-mix(in srgb, var(--green) 30%, transparent)"
    },
    blue: {
      fg: "var(--blue)",
      bg: "var(--blue-light)",
      bd: "color-mix(in srgb, var(--blue) 30%, transparent)"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), iconLeft ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      opacity: 0.85
    }
  }, iconLeft) : null, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassFAB.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * iOS 26 Liquid Glass floating action button. Gold-tinted glass orb with a
 * specular top edge. The single "create" affordance — new block / generate.
 */
function GlassFAB({
  icon,
  label,
  onClick,
  style,
  ...rest
}) {
  const extended = Boolean(label);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    "aria-label": !extended && rest["aria-label"] ? rest["aria-label"] : undefined,
    style: {
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
      background: "linear-gradient(180deg, var(--glass-tint-strong) 0%, var(--glass-tint) 60%), var(--glass-base)",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      border: "1px solid color-mix(in srgb, var(--accent-border) 50%, var(--glass-hairline))",
      boxShadow: "var(--glass-shadow-float), var(--glass-inner)",
      fontFamily: "var(--font-sans)",
      fontSize: "15px",
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-tight)",
      transition: "transform 140ms ease, box-shadow 160ms ease",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    },
    "aria-hidden": "true"
  }, icon), extended ? label : null);
}
Object.assign(__ds_scope, { GlassFAB });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassFAB.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassNavBar.jsx
try { (() => {
/**
 * iOS 26 Liquid Glass navigation bar — the top chrome of a screen. Translucent
 * gold-tinted glass with a leading mark/back control, a centered or leading
 * title, and an optional trailing action.
 */
function GlassNavBar({
  title,
  subtitle,
  leading,
  trailing,
  large = false,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      display: "flex",
      alignItems: large ? "flex-end" : "center",
      justifyContent: "space-between",
      gap: "0.6rem",
      padding: large ? "calc(8px + var(--app-safe-top)) 18px 12px" : "calc(6px + var(--app-safe-top)) 14px 8px",
      minHeight: "var(--nav-bar-height)",
      background: "linear-gradient(180deg, var(--glass-tint) 0%, transparent 70%), var(--glass-base)",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      borderBottom: "1px solid var(--glass-hairline)",
      boxShadow: "var(--glass-inner)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.55rem",
      minWidth: 0
    }
  }, leading ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, leading) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, subtitle ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, subtitle) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: large ? "var(--type-h1)" : "var(--type-h3)",
      fontWeight: large ? "var(--weight-heavy)" : "var(--weight-bold)",
      letterSpacing: "var(--tracking-tight)",
      color: "var(--text-primary)",
      lineHeight: 1.1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, title))), trailing ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      flexShrink: 0
    }
  }, trailing) : null);
}
Object.assign(__ds_scope, { GlassNavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassNavBar.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassTabBar.jsx
try { (() => {
const GLASS = {
  background: "linear-gradient(180deg, var(--glass-tint) 0%, transparent 55%), var(--glass-base)",
  WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  border: "1px solid var(--glass-hairline)",
  boxShadow: "var(--glass-shadow-float), var(--glass-inner)"
};

/**
 * iOS 26 Liquid Glass tab bar — a floating, inset capsule docked above the
 * home indicator. Gold-tinted glass; active tab gets a gold pill + label.
 */
function GlassTabBar({
  items = [],
  activeId,
  onSelect,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
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
      ...style
    }
  }, items.map(item => {
    const active = item.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      type: "button",
      onClick: () => onSelect && onSelect(item.id),
      "aria-current": active ? "page" : undefined,
      style: {
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
        background: active ? "linear-gradient(180deg, color-mix(in srgb, var(--accent) 92%, #fff 8%), var(--accent))" : "transparent",
        color: active ? "var(--accent-foreground)" : "var(--text-secondary)",
        boxShadow: active ? "var(--shadow-low), var(--highlight-sheen)" : "none",
        transition: "background 180ms ease, min-width 180ms ease, color 160ms ease",
        fontFamily: "var(--font-sans)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex"
      },
      "aria-hidden": "true"
    }, item.icon), active ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "10px",
        fontWeight: "var(--weight-bold)",
        letterSpacing: "0.01em"
      }
    }, item.label) : null);
  }));
}
Object.assign(__ds_scope, { GlassTabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassTabBar.jsx", error: String((e && e.message) || e) }); }

// components/schedule/NowHero.jsx
try { (() => {
const TONES = {
  accent: "var(--accent)",
  red: "var(--red)",
  amber: "var(--amber)",
  green: "var(--green)",
  blue: "var(--blue)",
  neutral: "var(--text-muted)"
};

/**
 * The Today screen's answer to "what should I do right now?".
 * An iOS-style focus card: clean elevated surface (no gradient), a category dot
 * + status label, a headline, a slim progress track, and a filled + tinted
 * action pair. Flat — the chrome around it carries the glass.
 */
function NowHero({
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
  style
}) {
  const dot = TONES[courseTone] || TONES.accent;
  const pct = Math.max(0, Math.min(1, progress));
  const btnBase = {
    height: 50,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.45rem",
    borderRadius: 14,
    fontFamily: "var(--font-sans)",
    fontSize: 16,
    fontWeight: "var(--weight-semibold)",
    letterSpacing: "-0.01em",
    cursor: "pointer",
    border: "none"
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      borderRadius: "var(--radius-page)",
      padding: "1.05rem 1.1rem 1.1rem",
      background: "var(--surface-elevated)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-medium)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.5rem"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.4rem",
      fontSize: 12,
      fontWeight: "var(--weight-bold)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: dot
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: dot
    }
  }), kicker), timeLeft ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-secondary)",
      fontVariantNumeric: "tabular-nums"
    }
  }, timeLeft) : null), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0.5rem 0 0",
      fontSize: 21,
      lineHeight: 1.2,
      letterSpacing: "-0.022em",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-primary)",
      textWrap: "balance"
    }
  }, title), (course || timeLabel) && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0.3rem 0 0",
      fontSize: 15,
      color: "var(--text-secondary)",
      letterSpacing: "-0.01em"
    }
  }, course, course && timeLabel ? "  ·  " : "", timeLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "0.9rem",
      height: 5,
      borderRadius: 999,
      background: "color-mix(in srgb, var(--text-muted) 16%, transparent)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct * 100}%`,
      height: "100%",
      borderRadius: 999,
      background: dot
    }
  })), reason ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0.7rem 0 0",
      fontSize: 13,
      lineHeight: 1.5,
      color: "var(--text-muted)"
    }
  }, reason) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "0.55rem",
      marginTop: "1rem"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onPrimary,
    style: {
      ...btnBase,
      flex: 1,
      background: "var(--accent)",
      color: "var(--accent-foreground)",
      boxShadow: "var(--highlight-sheen)"
    }
  }, startIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, startIcon) : null, primaryLabel), secondaryLabel ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSecondary,
    style: {
      ...btnBase,
      padding: "0 1.05rem",
      background: "var(--surface-soft)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-strong)"
    }
  }, secondaryLabel) : null));
}
Object.assign(__ds_scope, { NowHero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/schedule/NowHero.jsx", error: String((e && e.message) || e) }); }

// components/schedule/ScheduleBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Per-tone Liquid Glass palette for schedule blocks. Each block is a
 * translucent, blurred glass tile tinted with its course color. */
const TONES = {
  accent: {
    base: "var(--accent)",
    fg: "var(--accent-foreground)"
  },
  red: {
    base: "var(--red)",
    fg: "#3a160d"
  },
  amber: {
    base: "var(--amber)",
    fg: "#3a280d"
  },
  green: {
    base: "var(--green)",
    fg: "#16271b"
  },
  blue: {
    base: "var(--blue)",
    fg: "#132236"
  },
  neutral: {
    base: "var(--text-muted)",
    fg: "var(--text-primary)"
  }
};

/**
 * One block on the Today schedule — a full course-colored **Liquid Glass tile**.
 * The whole cell is tinted with the tone (translucent + blurred + specular top
 * edge), not a thin color bar. Leading time, title, subtitle, trailing
 * chevron / NOW pill / check. States: now (stronger tint, lifted), done
 * (faded), default.
 */
function ScheduleBlock({
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
  const fill = isNow ? 30 : 17; // % course color in the glass veil
  const edge = isNow ? 46 : 34; // rim hairline strength
  const ink = `color-mix(in srgb, ${t.base} 58%, var(--text-primary))`; // tone-tinted, adapts to theme

  const chevron = /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "13",
    viewBox: "0 0 8 13",
    fill: "none",
    "aria-hidden": "true",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 5.5L1 12",
    stroke: ink,
    strokeOpacity: "0.5",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
  const check = /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5",
    stroke: ink,
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }));
  let tail = trailing;
  if (!tail) {
    if (isNow) {
      tail = /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: "var(--weight-heavy)",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: t.fg,
          background: `color-mix(in srgb, ${t.base} 78%, white)`,
          borderRadius: 999,
          padding: "0.2rem 0.5rem",
          boxShadow: "var(--highlight-sheen)"
        }
      }, "Now");
    } else if (isDone) {
      tail = check;
    } else {
      tail = chevron;
    }
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    style: {
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
      boxShadow: isNow ? `var(--glass-shadow-float), var(--glass-inner)` : `0 4px 14px color-mix(in srgb, ${t.base} 14%, transparent), var(--glass-inner)`,
      transition: "transform 130ms ease, box-shadow 160ms ease",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      pointerEvents: "none",
      background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 40%)",
      mixBlendMode: "screen"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      justifyContent: "center",
      width: "46px",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: "var(--weight-bold)",
      lineHeight: 1.15,
      fontVariantNumeric: "tabular-nums",
      color: ink
    }
  }, time), endTime ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      lineHeight: 1.2,
      color: ink,
      opacity: 0.65,
      fontVariantNumeric: "tabular-nums"
    }
  }, endTime) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: "0.12rem",
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "-0.01em",
      lineHeight: 1.3,
      color: "var(--text-primary)",
      textDecoration: isDone ? "line-through" : "none",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, title), (course || meta) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      minWidth: 0
    }
  }, course ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: ink,
      whiteSpace: "nowrap"
    }
  }, course) : null, course && meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: ink,
      opacity: 0.5
    }
  }, "\xB7") : null, meta ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: ink,
      opacity: 0.78,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, meta) : null)), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      flexShrink: 0
    }
  }, tail));
}

/**
 * Spaced stack of course-colored glass ScheduleBlock tiles, with an optional
 * inset section header. (No longer an inset container — each tile is its own
 * glass card.)
 */
function ScheduleGroup({
  header,
  right,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...style
    }
  }, (header || right) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      padding: "0 0.4rem",
      margin: "0 0 0.55rem"
    }
  }, header ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.02em",
      color: "var(--text-muted)"
    }
  }, header) : /*#__PURE__*/React.createElement("span", null), right ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)"
    }
  }, right) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 10
    }
  }, children));
}
Object.assign(__ds_scope, { ScheduleBlock, ScheduleGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/schedule/ScheduleBlock.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/TodayScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Today Schedule — the primary Stay Focused V2 surface.
 * Answers one question: "what should I do right now?"
 * Glass chrome (nav, tab bar, FAB) over flat content (hero + schedule rail). */

const {
  NowHero,
  ScheduleBlock,
  ScheduleGroup,
  GlassNavBar,
  GlassTabBar,
  GlassFAB,
  Button,
  Chip
} = window.StayFocusedDesignSystem_d2c06c;

// ---- inline icon set (stroke style matches Lucide) ----
function I(props) {
  const {
    d,
    fill = "none",
    s = 22,
    sw = 1.8
  } = props;
  return /*#__PURE__*/React.createElement("svg", {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: fill,
    stroke: fill === "none" ? "currentColor" : "none",
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, d);
}
const Icons = {
  play: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    fill: "currentColor",
    d: /*#__PURE__*/React.createElement("polygon", {
      points: "6 3 20 12 6 21 6 3"
    })
  }),
  plus: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    sw: 2,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 12h14M12 5v14"
    }))
  }),
  bell: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
    }))
  }),
  today: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 2v4M8 2v4M3 10h18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m9 16 2 2 4-4"
    }))
  }),
  book: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
    }))
  }),
  library: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m16 6 4 14M12 6v14M8 8v12M4 4v16"
    }))
  }),
  sparkles: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"
    }))
  }),
  close: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    sw: 2,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M18 6 6 18M6 6l12 12"
    }))
  }),
  clock: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 7v5l3 2"
    }))
  }),
  file: s => /*#__PURE__*/React.createElement(I, {
    s: s,
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 2v6h6"
    }))
  })
};

// small round glass icon button for the nav bar
function GlassIconButton({
  children,
  onClick,
  badge
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    "aria-label": "Notifications",
    style: {
      position: "relative",
      width: 40,
      height: 40,
      borderRadius: 999,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--text-secondary)",
      background: "linear-gradient(180deg, var(--glass-tint) 0%, transparent 60%), var(--glass-base)",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
      border: "1px solid var(--glass-hairline)",
      boxShadow: "var(--glass-inner)"
    }
  }, children, badge ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 6,
      right: 7,
      width: 8,
      height: 8,
      borderRadius: 999,
      background: "var(--red)",
      boxShadow: "0 0 0 2px var(--surface-elevated)"
    }
  }) : null);
}
function SectionLabel({
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      margin: "1.4rem 2px 0.6rem"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, children), right ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)"
    }
  }, right) : null);
}

// flat "free time" divider between blocks
function FreeGap({
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      padding: "0.3rem 0.5rem",
      margin: "0.95rem 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--border-subtle)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--text-muted)",
      whiteSpace: "nowrap"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--border-subtle)"
    }
  }));
}
const NOW_TASK = {
  title: "Draft Chapter 3 — Methodology",
  course: "CS 198 · Thesis",
  timeLabel: "2:00 – 3:30 PM",
  timeLeft: "1h 12m left",
  progress: 0.32,
  reason: "Due Friday, and this is your only free 90-minute block today."
};
const LATER = [{
  id: "r1",
  time: "3:30",
  endTime: "4:00",
  tone: "blue",
  course: "MATH 211",
  title: "Review series & sequences",
  meta: "quiz Thursday"
}, {
  id: "r2",
  time: "5:00",
  endTime: "6:00",
  tone: "green",
  course: "BIO 102",
  title: "Read Ch. 7 — Cellular Respiration",
  meta: "60 min"
}, {
  id: "r3",
  time: "7:30",
  endTime: "8:00",
  tone: "accent",
  course: "CS 198",
  title: "Office hours — thesis adviser",
  meta: "Zoom"
}];
const DONE = [{
  id: "d1",
  time: "9:00",
  tone: "green",
  course: "BIO 102",
  title: "Morning flashcard review"
}, {
  id: "d2",
  time: "11:00",
  tone: "amber",
  course: "MATH 211",
  title: "Stats problem set §4.2"
}];

// ---- Do Now bottom sheet (flat content over a dim scrim) ----
function DoNowSheet({
  task,
  onClose
}) {
  const [preset, setPreset] = React.useState("Study reviewer");
  const [type, setType] = React.useState("Outline + notes");
  const fieldStyle = {
    width: "100%",
    appearance: "none",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
    background: "var(--surface-soft)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-control)",
    padding: "0.6rem 0.75rem"
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 80,
      display: "flex",
      alignItems: "flex-end",
      background: "rgba(31, 25, 19, 0.32)",
      WebkitBackdropFilter: "blur(2px)",
      backdropFilter: "blur(2px)",
      animation: "sfFade 220ms ease"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      background: "var(--surface-elevated)",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTop: "1px solid var(--border-subtle)",
      boxShadow: "0 -18px 40px rgba(28,22,14,0.18)",
      padding: "0.7rem 1.1rem calc(1.4rem + var(--app-safe-bottom))",
      animation: "sfSlideUp 280ms cubic-bezier(0.22,1,0.36,1)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 5,
      borderRadius: 999,
      background: "var(--border-hover)",
      margin: "0 auto 1rem"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "0.6rem"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Generate output"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0.3rem 0 0",
      fontSize: 19,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: "var(--text-primary)"
    }
  }, task.title)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Close",
    style: {
      flexShrink: 0,
      width: 34,
      height: 34,
      borderRadius: 999,
      border: "1px solid var(--border-strong)",
      background: "var(--surface-base)",
      color: "var(--text-secondary)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, Icons.close(18))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "0.4rem",
      flexWrap: "wrap",
      marginTop: "0.7rem"
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    tone: "accent"
  }, task.course), /*#__PURE__*/React.createElement(Chip, {
    tone: "green"
  }, "Grounded \xB7 4 modules")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0.9rem 0 0",
      fontSize: 13,
      lineHeight: 1.6,
      color: "var(--text-secondary)"
    }
  }, "Pick a preset and output type. If readable source text is weak, Stay Focused generates a scaffold instead of inventing content."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "0.7rem",
      marginTop: "0.9rem"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "grid",
      gap: "0.3rem"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Preset"), /*#__PURE__*/React.createElement("select", {
    value: preset,
    onChange: e => setPreset(e.target.value),
    style: fieldStyle
  }, /*#__PURE__*/React.createElement("option", null, "Study reviewer"), /*#__PURE__*/React.createElement("option", null, "Quiz pack"), /*#__PURE__*/React.createElement("option", null, "Deep-learn notes"), /*#__PURE__*/React.createElement("option", null, "Draft answer"))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "grid",
      gap: "0.3rem"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Output type"), /*#__PURE__*/React.createElement("select", {
    value: type,
    onChange: e => setType(e.target.value),
    style: fieldStyle
  }, /*#__PURE__*/React.createElement("option", null, "Outline + notes"), /*#__PURE__*/React.createElement("option", null, "Flashcards"), /*#__PURE__*/React.createElement("option", null, "Summary"), /*#__PURE__*/React.createElement("option", null, "Practice questions")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "0.55rem",
      marginTop: "1.1rem"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconLeft: Icons.sparkles(18),
    full: true,
    onClick: onClose
  }, "Generate output"))));
}

// ---- placeholder tab content for non-Today tabs ----
function ComingSoon({
  icon,
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      placeItems: "center",
      height: "100%",
      padding: "2rem",
      textAlign: "center",
      gap: "0.6rem"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: "var(--text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      maxWidth: 220
    }
  }, "This surface isn\u2019t part of the Today demo \u2014 tap Today to return."));
}
function TodayScreen() {
  const [tab, setTab] = React.useState("today");
  const [sheet, setSheet] = React.useState(false);
  const logo = /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.svg",
    width: "28",
    height: "28",
    alt: "",
    style: {
      display: "block"
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--app-bg)"
    }
  }, /*#__PURE__*/React.createElement(GlassNavBar, {
    subtitle: "Tuesday \xB7 June 14",
    title: "Today",
    large: true,
    leading: logo,
    trailing: /*#__PURE__*/React.createElement(GlassIconButton, {
      badge: true
    }, Icons.bell(20)),
    style: {
      paddingTop: "56px"
    }
  }), tab === "today" ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0.4rem 1rem calc(150px + var(--app-safe-bottom))"
    }
  }, /*#__PURE__*/React.createElement(NowHero, _extends({}, NOW_TASK, {
    startIcon: Icons.play(18),
    onPrimary: () => setSheet(true)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "1.4rem"
    }
  }, /*#__PURE__*/React.createElement(ScheduleGroup, {
    header: "Later today",
    right: "3 blocks"
  }, /*#__PURE__*/React.createElement(ScheduleBlock, _extends({}, LATER[0], {
    onClick: () => setSheet(true)
  })), /*#__PURE__*/React.createElement(ScheduleBlock, _extends({}, LATER[1], {
    onClick: () => setSheet(true)
  })), /*#__PURE__*/React.createElement(ScheduleBlock, _extends({}, LATER[2], {
    onClick: () => setSheet(true)
  })))), /*#__PURE__*/React.createElement(FreeGap, {
    label: "Free \xB7 4:00 \u2013 5:00 PM"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ScheduleGroup, {
    header: "Earlier",
    right: "2 done"
  }, DONE.map(b => /*#__PURE__*/React.createElement(ScheduleBlock, _extends({
    key: b.id
  }, b, {
    state: "done"
  })))))) : tab === "courses" ? /*#__PURE__*/React.createElement(ComingSoon, {
    icon: Icons.book(40),
    label: "Courses"
  }) : /*#__PURE__*/React.createElement(ComingSoon, {
    icon: Icons.library(40),
    label: "Study Library"
  }), /*#__PURE__*/React.createElement(GlassFAB, {
    icon: Icons.sparkles(22),
    label: "Generate",
    onClick: () => setSheet(true),
    style: {
      bottom: "calc(96px + var(--app-safe-bottom))"
    }
  }), /*#__PURE__*/React.createElement(GlassTabBar, {
    activeId: tab,
    onSelect: setTab,
    style: {
      bottom: "calc(26px + var(--app-safe-bottom))"
    },
    items: [{
      id: "today",
      label: "Today",
      icon: Icons.today(22)
    }, {
      id: "courses",
      label: "Courses",
      icon: Icons.book(22)
    }, {
      id: "library",
      label: "Library",
      icon: Icons.library(22)
    }]
  }), sheet ? /*#__PURE__*/React.createElement(DoNowSheet, {
    task: NOW_TASK,
    onClose: () => setSheet(false)
  }) : null);
}
window.TodayScreen = TodayScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/TodayScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/ios-frame.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.GlassFAB = __ds_scope.GlassFAB;

__ds_ns.GlassNavBar = __ds_scope.GlassNavBar;

__ds_ns.GlassTabBar = __ds_scope.GlassTabBar;

__ds_ns.NowHero = __ds_scope.NowHero;

__ds_ns.ScheduleBlock = __ds_scope.ScheduleBlock;

__ds_ns.ScheduleGroup = __ds_scope.ScheduleGroup;

})();
