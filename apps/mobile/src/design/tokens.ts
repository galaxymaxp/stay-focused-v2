export const colors = {
  background: "#1b1814",
  card: "#252018",
  cardElevated: "#2a2218",
  cardPressed: "#32291d",
  accent: "#f5a623",
  accentPressed: "#e8971f",
  accentText: "#241704",
  textPrimary: "#f0e6d3",
  textSecondary: "#cabaa4",
  textMuted: "#8a7a6a",
  border: "rgba(240, 230, 211, 0.1)",
  borderStrong: "rgba(240, 230, 211, 0.18)",
  error: "#d9897d",
  errorSurface: "rgba(217, 137, 125, 0.12)",
  success: "#8bb49a",
  successSurface: "rgba(139, 180, 154, 0.12)",
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
  page: 18,
  card: 14,
  control: 12,
  tight: 10,
  pill: 999,
} as const;

export const typography = {
  fontFamily: "System",
  display: 34,
  h1: 24,
  h2: 19,
  h3: 16,
  body: 15,
  bodySmall: 13,
  caption: 12,
  kicker: 11,
} as const;

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 2,
  },
} as const;

export const hitTarget = {
  min: 44,
} as const;
