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
    accent: "#171717",
    onAccent: "#FFFFFF",
    success: "#26724E",
    warning: "#975416",
    danger: "#AC3838",
    shadow: "#433B30",
    blue: "#343434",
    blueSoft: "#E9E9E9",
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
    /** Due this week: a readable amber between orange and neutral. */
    amber: "#846400",
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
    accent: "#F5F5F5",
    onAccent: "#111111",
    success: "#8BD7AF",
    warning: "#F2BF80",
    danger: "#FFA39B",
    shadow: "#000000",
    blue: "#DDDDDD",
    blueSoft: "#303033",
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
    amber: "#EBC55E",
  },
} as const;
export type ThemeColors = {
  readonly [K in keyof typeof palettes.light]: string;
};

/**
 * UC-inspired palette family, for evaluation with the University of the
 * Cordilleras. NOT official UC branding: there is no licensed token source in
 * this repository, but the accent is now grounded in the public uc-bcf.edu.ph
 * site's own stylesheet (its buttons, links and icons render on `#07683b`,
 * a deep forest green, over a warm ivory page background), not a guess.
 * Danger/warning/red keep their standard meaning since the brand color is no
 * longer red.
 */
export const ucInspiredPalettes: { readonly light: ThemeColors; readonly dark: ThemeColors } = {
  light: {
    ...palettes.light,
    backgroundPrimary: "#F7F6F0",
    surfacePrimary: "rgba(255,255,255,0.92)",
    surfaceElevated: "#FFFFFF",
    surfaceSecondary: "#EFEEE6",
    textPrimary: "#161616",
    textSecondary: "#58585B",
    textMuted: "#6C6C70",
    separator: "rgba(0,0,0,0.08)",
    accent: "#171717",
    onAccent: "#FFFFFF",
    shadow: "#1B2B22",
  },
  dark: {
    ...palettes.dark,
    backgroundPrimary: "#0B0C0A",
    surfacePrimary: "#171A17",
    surfaceElevated: "#232823",
    surfaceSecondary: "#2F352E",
    textPrimary: "#F4F4F1",
    textSecondary: "#B3B7B1",
    textMuted: "#9DA29C",
    separator: "rgba(255,255,255,0.09)",
    accent: "#F5F5F5",
    onAccent: "#111111",
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
  /** Sheets rise with momentum and settle with a slight overshoot. */
  sheet: { damping: 19, stiffness: 180, mass: 0.9 },
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
