export type ThemePreference = "system" | "light" | "dark";
export const palettes = {
  light: {
    backgroundPrimary: "#F7F6F2",
    surfacePrimary: "rgba(255,255,255,0.84)",
    surfaceElevated: "#FFFFFF",
    surfaceSecondary: "#F1F0EC",
    textPrimary: "#111111",
    textSecondary: "#62615E",
    textMuted: "#74716B",
    separator: "rgba(0,0,0,0.07)",
    accent: "#245DC8",
    onAccent: "#FFFFFF",
    success: "#26724E",
    warning: "#975416",
    danger: "#AC3838",
    shadow: "#433B30",
    blue: "#285FC1",
    blueSoft: "#E5EDFF",
    orange: "#A84B16",
    orangeSoft: "#FFF0E3",
    green: "#26724E",
    greenSoft: "#E4F2E9",
    violet: "#7250AE",
    violetSoft: "#EEE8FA",
    red: "#B13C36",
    redSoft: "#FCE9E5",
    findMatch: "#FBE9A6",
    findActive: "#F4C542",
  },
  dark: {
    backgroundPrimary: "#000000",
    surfacePrimary: "#1C1C1E",
    surfaceElevated: "#2C2C2E",
    surfaceSecondary: "#3A3A3C",
    textPrimary: "#FFFFFF",
    textSecondary: "#B0B0B3",
    textMuted: "#A0A0A5",
    separator: "rgba(255,255,255,0.08)",
    accent: "#AACBFF",
    onAccent: "#102444",
    success: "#8BD7AF",
    warning: "#F2BF80",
    danger: "#FFA39B",
    shadow: "#000000",
    blue: "#A9C8FF",
    blueSoft: "#263A59",
    orange: "#F2B679",
    orangeSoft: "#48301F",
    green: "#91D5B1",
    greenSoft: "#203E33",
    violet: "#CFBAF2",
    violetSoft: "#352A49",
    red: "#FFABA3",
    redSoft: "#4B2928",
    findMatch: "#5A4B1B",
    findActive: "#A98423",
  },
} as const;
export type ThemeColors = {
  readonly [K in keyof typeof palettes.light]: string;
};

/**
 * UC-inspired palette family, for evaluation with the University of the
 * Cordilleras. NOT official UC branding: no verified UC brand source or token
 * exists in this repository, so the crimson accent is an approximation chosen
 * for contrast, not a sanctioned institutional value. Red is reserved for
 * selection, primary actions, active controls and progress; surfaces stay
 * neutral, and "danger" moves to burnt orange so overdue work never reads as
 * the brand color.
 */
export const ucInspiredPalettes: { readonly light: ThemeColors; readonly dark: ThemeColors } = {
  light: {
    ...palettes.light,
    backgroundPrimary: "#F6F6F4",
    surfacePrimary: "rgba(255,255,255,0.92)",
    surfaceElevated: "#FFFFFF",
    surfaceSecondary: "#EFEFED",
    textPrimary: "#161616",
    textSecondary: "#58585B",
    textMuted: "#6C6C70",
    separator: "rgba(0,0,0,0.08)",
    accent: "#9E1B32",
    onAccent: "#FFFFFF",
    danger: "#B4470F",
    warning: "#8A5A10",
    shadow: "#2B2B2B",
    red: "#9E1B32",
    redSoft: "#F7E4E7",
  },
  dark: {
    ...palettes.dark,
    backgroundPrimary: "#0B0B0C",
    surfacePrimary: "#19191B",
    surfaceElevated: "#252527",
    surfaceSecondary: "#323235",
    textPrimary: "#F4F4F4",
    textSecondary: "#B3B3B7",
    textMuted: "#9D9DA2",
    separator: "rgba(255,255,255,0.09)",
    accent: "#F08C99",
    onAccent: "#3B0B14",
    danger: "#FFB27D",
    red: "#F08C99",
    redSoft: "#46222A",
  },
};

export type PaletteFamily = "standard" | "uc_inspired";

export function paletteFor(family: PaletteFamily, mode: "light" | "dark"): ThemeColors {
  return family === "uc_inspired" ? ucInspiredPalettes[mode] : palettes[mode];
}
export const motion = {
  press: 140,
  small: 180,
  normal: 240,
  spatial: 320,
  ambient: 3200,
  spring: { damping: 22, stiffness: 260, mass: 0.8 },
} as const;
export const iconSize = { small: 18, normal: 22, tab: 23, hero: 32 } as const;
export const contentColors = {
  study: "#8DAFF0",
  free: "#91CDB2",
  classes: "#E5BC76",
  other: "#B7A1D8",
  violet: "#9C74EF",
  pink: "#ED8BCC",
  blue: "#6A9DEE",
  warm: "#F7C99E",
} as const;
export function resolveTheme(
  preference: ThemePreference,
  system: string | null | undefined,
) {
  return preference === "system"
    ? system === "dark"
      ? "dark"
      : "light"
    : preference;
}
export function shouldAnimate(
  reduced: boolean,
  active: boolean,
  focused = true,
) {
  return !reduced && active && focused;
}
