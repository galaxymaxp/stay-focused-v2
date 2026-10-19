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


/** Owner rollout acceptance requires no ambient motion under Reduce Motion. */
export const REDUCED_MOTION_RATE = 0;

/** Completion slows the same animation clock; only failure stops it. */
export function coreMotionRate(state: CoreState, reducedMotion: boolean, completion: number): number {
  if (state === "error" || reducedMotion) return 0;
  const rate = 1 - Math.max(0, Math.min(1, completion)) * 0.72;
  return rate;
}

export interface CoreMotionProfile {
  readonly activity: number;
  readonly completion: number;
  readonly error: number;
  /** Share of the orb's maximum angular velocity. */
  readonly spin: number;
  /** Speed of the orb's wavering light, as a share of its fastest. */
  readonly shimmer: number;
}

export const CORE_MOTION_PROFILES: Record<CoreState, CoreMotionProfile> = {
  idle: { activity: 0.12, completion: 0, error: 0, spin: 0.22, shimmer: 0.3 },
  reading: { activity: 0.42, completion: 0, error: 0, spin: 0.5, shimmer: 0.55 },
  generating: { activity: 0.86, completion: 0, error: 0, spin: 1, shimmer: 1 },
  finalizing: { activity: 0.3, completion: 0, error: 0, spin: 0.55, shimmer: 0.5 },
  complete: { activity: 0.04, completion: 1, error: 0, spin: 0.12, shimmer: 0.2 },
  error: { activity: 0, completion: 0, error: 1, spin: 0, shimmer: 0 },
};

/** The orb spins with the work: fastest while generating, slow once complete, still only on failure. */
export function coreSpinTarget(state: CoreState, reducedMotion: boolean): number {
  const spin = CORE_MOTION_PROFILES[state].spin;
  return reducedMotion ? 0 : spin;
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

/** Radians per second at full spin (generating), as the Knowledge Core renderer. */
export const CORE_MAX_SPIN = 0.9;

/** Eased state levels a renderer carries between frames. */
export interface CoreLevels {
  readonly state: CoreState;
  readonly activity: number;
  readonly error: number;
  readonly spin: number;
  readonly shimmer: number;
  /** Brief brighten after a live completion, decaying to zero. */
  readonly flash: number;
}

/** Completion settles as idle after its brief brighten. */
const levelProfile = (state: CoreState): CoreState =>
  state === "complete" ? "idle" : state;

export function createCoreLevels(state: CoreState, reducedMotion: boolean): CoreLevels {
  const target = levelProfile(state);
  return {
    state,
    activity: CORE_MOTION_PROFILES[target].activity,
    error: CORE_MOTION_PROFILES[target].error,
    spin: coreSpinTarget(target, reducedMotion),
    shimmer: coreShimmerTarget(target, reducedMotion),
    flash: 0,
  };
}

/** The Knowledge Core's easing, applied to the state the server last reported. */
export function stepCoreLevels(
  levels: CoreLevels,
  state: CoreState,
  deltaSeconds: number,
  reducedMotion: boolean,
): CoreLevels {
  const target = levelProfile(state);
  const profile = CORE_MOTION_PROFILES[target];
  const ease = reducedMotion ? 1 : 1 - Math.pow(0.002, deltaSeconds);
  const momentum = reducedMotion ? 1 : 1 - Math.pow(0.12, deltaSeconds);
  const flash = reducedMotion
    ? 0
    : state === "complete" && levels.state !== "complete"
      ? 1
      : levels.flash * Math.pow(0.02, deltaSeconds);
  return {
    state,
    activity: levels.activity + (profile.activity - levels.activity) * ease,
    error: levels.error + (profile.error - levels.error) * ease,
    spin: levels.spin + (coreSpinTarget(target, reducedMotion) - levels.spin) * momentum,
    shimmer: levels.shimmer + (coreShimmerTarget(target, reducedMotion) - levels.shimmer) * momentum,
    flash: flash < 0.005 ? 0 : flash,
  };
}

/**
 * What a state adds to the Today orb's idle body: the Knowledge Core's excess
 * over its own idle profile. Idle and settled completion add nothing.
 */
export function coreLevelsExtra(levels: CoreLevels, reducedMotion: boolean) {
  const idle = CORE_MOTION_PROFILES.idle;
  const extra = Math.max(0, levels.activity - idle.activity);
  return {
    life: extra * 0.65,
    glow: extra * 0.5 + levels.flash * 0.35,
    /** Added radians per second; a failed orb winds down to still. */
    spin: (levels.spin - coreSpinTarget("idle", reducedMotion)) * CORE_MAX_SPIN,
    rate: extra * 0.65,
    shimmerAmount: extra * 0.8 * (1 - levels.error),
    error: levels.error,
    /** Still easing or brightening: render at full frame rate. */
    lively: extra > 0.005 || levels.flash > 0 || (levels.error > 0.005 && levels.error < 0.995),
  };
}
