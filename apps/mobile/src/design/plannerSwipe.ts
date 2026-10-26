export const PLANNER_SWIPE_THRESHOLD = 104;
/** Velocity never turns a short planner swipe into an exclusion. */
export function plannerSwipeAction(distance: number): 'skip' | 'remove' | null {
  if (!Number.isFinite(distance) || Math.abs(distance) <= PLANNER_SWIPE_THRESHOLD) return null;
  return distance > 0 ? 'skip' : 'remove';
}
