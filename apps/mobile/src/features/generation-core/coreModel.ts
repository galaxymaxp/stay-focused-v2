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

/** Completion slows the same animation clock; only failure/accessibility pauses it. */
export function coreMotionRate(state: CoreState, reducedMotion: boolean, completion: number): number {
  if (reducedMotion || state === "error") return 0;
  return 1 - Math.max(0, Math.min(1, completion)) * 0.72;
}

export interface CoreMotionProfile {
  readonly activity: number;
  readonly intake: number;
  readonly order: number;
  readonly completion: number;
  readonly error: number;
}

export const CORE_MOTION_PROFILES: Record<CoreState, CoreMotionProfile> = {
  idle: { activity: 0.12, intake: 0, order: 0.28, completion: 0, error: 0 },
  reading: { activity: 0.42, intake: 1, order: 0.18, completion: 0, error: 0 },
  generating: { activity: 0.86, intake: 0.22, order: 0.08, completion: 0, error: 0 },
  finalizing: { activity: 0.3, intake: 0, order: 1, completion: 0, error: 0 },
  complete: { activity: 0.04, intake: 0, order: 1, completion: 1, error: 0 },
  error: { activity: 0, intake: 0, order: 0.35, completion: 0, error: 1 },
};

export const CORE_STATE_COPY: Record<CoreState, { readonly title: string; readonly detail: string }> = {
  idle: { title: "Ready when you are", detail: "The core is quiet and waiting." },
  reading: { title: "Reading your material…", detail: "Source fragments are being gathered." },
  generating: { title: "Bringing the important ideas together…", detail: "You can leave this screen. We’ll keep working." },
  finalizing: { title: "Saving your work…", detail: "The result is settling into place." },
  complete: { title: "Ready in your Library.", detail: "Your saved work is ready to open." },
  error: { title: "This generation couldn’t finish.", detail: "Open Queue to review the problem or try again." },
};

export type CoreLabTheme = "light" | "dark" | "uc_light" | "uc_dark";

/** Restrained analogous palettes, not a full-spectrum hue cycle. */
export function coreRibbonPalette(accent: string, mode: "light" | "dark"): readonly [string, string, string] {
  const uc = ["#9e1b32", "#f08c99"].includes(accent.toLowerCase());
  if (uc) return mode === "dark"
    ? ["#D47A91", "#9E79CF", "#E4AE9F"]
    : ["#A83A59", "#7955AC", "#C67F70"];
  return mode === "dark"
    ? ["#528DFA", "#9672E0", "#56C1CF"]
    : ["#3567C7", "#7954B6", "#3299AB"];
}

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
