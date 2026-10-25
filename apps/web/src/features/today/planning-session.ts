import { createPlanningSessionMemory } from '@stay-focused/shared';
import type { BuiltPlanningChoice } from './planning-sheet';
export const todayPlanningMemory = createPlanningSessionMemory<BuiltPlanningChoice>();
