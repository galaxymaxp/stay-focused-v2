export const colors = {
  background: "#f6f4ef",
  card: "#fffdf8",
  cardElevated: "#f1ecdf",
  cardPressed: "#eee5cf",
  accent: "#d7aa38",
  accentPressed: "#b88b24",
  accentText: "#2b210b",
  textPrimary: "#2a251d",
  textSecondary: "#5e5549",
  textMuted: "#817565",
  border: "rgba(78, 64, 45, 0.12)",
  borderStrong: "rgba(78, 64, 45, 0.22)",
  error: "#9b4c43",
  errorSurface: "#f7e9e5",
  success: "#52755f",
  successSurface: "#e8f0e9",
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
    shadowColor: "#4b3a22",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 1,
  },
} as const;

export const hitTarget = {
  min: 44,
} as const;
