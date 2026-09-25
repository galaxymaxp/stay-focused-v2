import type { ThemeColors } from "../../design/theme";

export const CORE_STATES = [
  "idle",
  "reading",
  "generating",
  "finalizing",
  "complete",
  "error",
] as const;

export type CoreState = (typeof CORE_STATES)[number];


/** Share of the normal clock kept under Reduced Motion: a slow drift, never a freeze. */
export const REDUCED_MOTION_RATE = 0.1;

/** Completion slows the same animation clock; only failure stops it. */
export function coreMotionRate(state: CoreState, reducedMotion: boolean, completion: number): number {
  if (state === "error") return 0;
  const rate = 1 - Math.max(0, Math.min(1, completion)) * 0.72;
  return reducedMotion ? Math.min(rate, REDUCED_MOTION_RATE) : rate;
}

export interface CoreMotionProfile {
  readonly activity: number;
  readonly intake: number;
  readonly order: number;
  readonly completion: number;
  readonly error: number;
  /** Share of the orb's maximum angular velocity. */
  readonly spin: number;
  /** Speed of the orb's wavering light, as a share of its fastest. */
  readonly shimmer: number;
}

export const CORE_MOTION_PROFILES: Record<CoreState, CoreMotionProfile> = {
  idle: { activity: 0.12, intake: 0, order: 0.28, completion: 0, error: 0, spin: 0.22, shimmer: 0.3 },
  reading: { activity: 0.42, intake: 1, order: 0.18, completion: 0, error: 0, spin: 0.5, shimmer: 0.55 },
  generating: { activity: 0.86, intake: 0.22, order: 0.08, completion: 0, error: 0, spin: 1, shimmer: 1 },
  finalizing: { activity: 0.3, intake: 0, order: 1, completion: 0, error: 0, spin: 0.55, shimmer: 0.5 },
  complete: { activity: 0.04, intake: 0, order: 1, completion: 1, error: 0, spin: 0.12, shimmer: 0.2 },
  error: { activity: 0, intake: 0, order: 0.35, completion: 0, error: 1, spin: 0, shimmer: 0 },
};

/** Under Reduced Motion the orb still turns, at most once every ~40 seconds. */
const REDUCED_MOTION_SPIN = 0.06;

/** The orb spins with the work: fastest while generating, slow once complete, still only on failure. */
export function coreSpinTarget(state: CoreState, reducedMotion: boolean): number {
  const spin = CORE_MOTION_PROFILES[state].spin;
  return reducedMotion ? Math.min(spin, REDUCED_MOTION_SPIN) : spin;
}

/** The orb's light wavers with the work. Reduced Motion keeps the glow steady instead. */
export function coreShimmerTarget(state: CoreState, reducedMotion: boolean): number {
  return reducedMotion ? 0 : CORE_MOTION_PROFILES[state].shimmer;
}

export const CORE_STATE_COPY: Record<CoreState, { readonly title: string; readonly detail: string }> = {
  idle: { title: "Ready when you are", detail: "The core is quiet and waiting." },
  reading: { title: "Reading your material…", detail: "Source fragments are being gathered." },
  generating: { title: "Bringing the important ideas together…", detail: "You can leave this screen. We’ll keep working." },
  finalizing: { title: "Saving your work…", detail: "The result is settling into place." },
  complete: { title: "Ready in your Library.", detail: "Your saved work is ready to open." },
  error: { title: "This generation couldn’t finish.", detail: "Open Queue to review the problem or try again." },
};

export type CoreLabTheme = "light" | "dark" | "uc_light" | "uc_dark";

export function coreLabTheme(
  key: CoreLabTheme,
  palettes: { readonly light: ThemeColors; readonly dark: ThemeColors },
  ucPalettes: { readonly light: ThemeColors; readonly dark: ThemeColors },
): { readonly colors: ThemeColors; readonly mode: "light" | "dark" } {
  if (key === "uc_light") return { colors: ucPalettes.light, mode: "light" };
  if (key === "uc_dark") return { colors: ucPalettes.dark, mode: "dark" };
  return { colors: palettes[key], mode: key };
}

export function coreAccessibilityLabel(state: CoreState): string {
  switch (state) {
    case "idle": return "Knowledge Core ready";
    case "reading": return "Knowledge Core reading source material";
    case "generating": return "Knowledge Core generating";
    case "finalizing": return "Knowledge Core finalizing";
    case "complete": return "Knowledge Core generation complete";
    case "error": return "Knowledge Core generation needs attention";
  }
}
