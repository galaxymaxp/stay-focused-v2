import { createPlanModeStore } from '@stay-focused/shared';
import type { PlanMode } from '@stay-focused/shared/task-planning';
import { useSyncExternalStore } from 'react';

export const planModeStore = createPlanModeStore();
export function usePlanMode(): PlanMode {
  return useSyncExternalStore(planModeStore.subscribe, planModeStore.get, planModeStore.get);
}
