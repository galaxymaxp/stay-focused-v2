import { palettes } from "./themeTokens";
const c = palettes.light;
/** Compatibility names for non-component presentation helpers. Components use the theme hook. */
export const colors = {
  background: c.backgroundPrimary,
  card: c.surfacePrimary,
  cardElevated: c.surfaceElevated,
  cardPressed: c.surfaceSecondary,
  accent: c.accent,
  accentPressed: c.accent,
  accentText: c.onAccent,
  textPrimary: c.textPrimary,
  textSecondary: c.textSecondary,
  textMuted: c.textMuted,
  border: c.separator,
  borderStrong: c.textMuted,
  error: c.danger,
  errorSurface: c.surfaceElevated,
  success: c.success,
  successSurface: c.surfaceElevated,
  transparent: "transparent",
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  page: 24,
  card: 24,
  control: 12,
  tight: 12,
  pill: 999,
} as const;

export const typography = {
  fontFamily: "System",
  display: 34,
  h1: 30,
  h2: 22,
  h3: 18,
  body: 16,
  bodySmall: 13,
  caption: 12,
  kicker: 11,
} as const;

export const shadows = {
  card: {
    shadowColor: "#4b3a22",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 1,
  },
} as const;

export const hitTarget = {
  min: 48,
} as const;
