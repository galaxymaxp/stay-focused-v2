/** Seconds for ambient light to approach a changed source. No timers owned here. */
export const ORB_AMBIENT_RESPONSE = 0.24;

/** Exact exponential step: equal elapsed time has the same response at any rate. */
export function orbAmbientEase(delta: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return -Math.expm1(-delta / ORB_AMBIENT_RESPONSE);
}
