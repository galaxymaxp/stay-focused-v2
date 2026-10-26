import { createPlanningSessionMemory } from '@stay-focused/shared';
import type { BuiltPlanningChoice } from './today-planner';
export const todayPlanningMemory = createPlanningSessionMemory<BuiltPlanningChoice>();
