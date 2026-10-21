/** Seconds for ambient light to approach a changed source. No timers owned here. */
export const ORB_AMBIENT_RESPONSE = 0.24;

/** Exact exponential step: equal elapsed time has the same response at any rate. */
export function orbAmbientEase(delta: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return -Math.expm1(-delta / ORB_AMBIENT_RESPONSE);
}

/** Explicit context; layout size must never select the lighting profile. */
export type OrbVariant = 'clock' | 'standalone';
export const ORB_AMBIENT_PROFILES = {
  clock: { size: 2.92, inner: 0.975, rise: 1.20, fade: 1.06, outer: 1.44,
    maskGain: 1, intensity: 1, canvasScale: 1 },
  // Body radius is .95. Normalize to the clock mask's .7603 peak, then halve
  // strength, so the stronger edge coverage does not undo the softer intensity.
  standalone: { size: 3.6, inner: 0.95 * 0.9, rise: 0.95, fade: 0.95, outer: 0.95 * 1.7,
    maskGain: 0.76, intensity: 0.5, canvasScale: 1.2 },
} as const;
