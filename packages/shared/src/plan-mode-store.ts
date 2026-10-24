import { DEFAULT_PLAN_MODE, isPlanMode, type PlanMode } from './task-planning';

/**
 * The visible Today "Plan with" choice for the signed-in owner. Rendering
 * reads it synchronously; the per-owner preference sync applies cached and
 * server values and receives the owner's explicit choices.
 */
export interface PlanModeStore {
  get(): PlanMode;
  subscribe(listener: () => void): () => void;
  /** A cached or synced value. Invalid values are ignored. */
  apply(mode: unknown): void;
  /** The owner's choice: shown at once, then handed to the sync. */
  choose(mode: PlanMode): void;
  onChoice(listener: (mode: PlanMode) => void): () => void;
  /** Sign-out or owner change: back to the never-chosen default. */
  reset(): void;
}

export function createPlanModeStore(): PlanModeStore {
  let mode: PlanMode = DEFAULT_PLAN_MODE;
  const listeners = new Set<() => void>();
  const choices = new Set<(mode: PlanMode) => void>();
  const set = (next: PlanMode) => {
    if (next === mode) return;
    mode = next;
    for (const listener of [...listeners]) listener();
  };
  return {
    get: () => mode,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    apply(next) { if (isPlanMode(next)) set(next); },
    choose(next) {
      if (!isPlanMode(next)) return;
      set(next);
      for (const listener of [...choices]) listener(next);
    },
    onChoice(listener) { choices.add(listener); return () => { choices.delete(listener); }; },
    reset() { set(DEFAULT_PLAN_MODE); },
  };
}
