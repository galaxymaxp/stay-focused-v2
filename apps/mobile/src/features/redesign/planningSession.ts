import { createPlanningSessionMemory } from '@stay-focused/shared';
import type { BuiltPlanningChoice } from './PlanningSheet';
export const todayPlanningMemory = createPlanningSessionMemory<BuiltPlanningChoice>();
