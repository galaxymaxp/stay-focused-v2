/** Velocity is in dp/ms; require a deliberate downward gesture even for a flick. */
export function shouldDismissImage(dy: number, vy: number, zoom: number, scrollTop: number): boolean {
  return [dy, vy, zoom, scrollTop].every(Number.isFinite) && zoom === 1 && scrollTop <= 0 &&
    (dy >= 120 || (dy >= 24 && vy >= 0.9));
}
