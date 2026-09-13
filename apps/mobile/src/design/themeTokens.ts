export type ThemePreference = "system" | "light" | "dark";
export const palettes = {
  light: {
    backgroundPrimary: "#F7F7F5",
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
  },
} as const;
export type ThemeColors = {
  readonly [K in keyof typeof palettes.light]: string;
};
export const motion = {
  small: 220,
  normal: 320,
  spatial: 480,
  ambient: 3200,
  spring: { damping: 18, stiffness: 180, mass: 0.8 },
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
