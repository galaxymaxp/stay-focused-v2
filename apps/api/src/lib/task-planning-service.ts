import type { Database } from "@stay-focused/db";
import {
  generateDeterministicStudyPlan,
  type DeterministicStudyPlan,
  type StudyPlanningRequest,
} from "@stay-focused/shared/task-planning";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import {
  loadOwnedPlannerTasks,
  persistOwnedStudyPlan,
  toStudySessionView,
} from "@/lib/task-planning-repository";

export class OwnedPlanningError extends Error {
  constructor(
    readonly code: "task_not_found",
    readonly safeMessage: string,
  ) {
    super(safeMessage);
    this.name = "OwnedPlanningError";
  }
}

export async function previewOwnedStudyPlan(
  client: SupabaseClient<Database>,
  userId: string,
  request: StudyPlanningRequest,
): Promise<DeterministicStudyPlan> {
  const tasks = await loadOwnedPlannerTasks(client, userId, request.taskIds);
  if (request.taskIds && tasks.length !== request.taskIds.length) {
    throw new OwnedPlanningError(
      "task_not_found",
      "One or more pending tasks were not found.",
    );
  }
  return generateDeterministicStudyPlan({
    tasks,
    planningRange: request.planningRange,
    availability: request.availability,
  });
}

export async function applyOwnedStudyPlan(
  client: SupabaseClient<Database>,
  userId: string,
  request: StudyPlanningRequest,
) {
  const plan = await previewOwnedStudyPlan(client, userId, request);
  const inputHash = createHash("sha256")
    .update(
      JSON.stringify({
        algorithmVersion: plan.algorithmVersion,
        planningRange: plan.planningRange,
        availability: plan.availability,
        sessions: plan.sessions,
        unscheduledWork: plan.unscheduledWork,
      }),
      "utf8",
    )
    .digest("hex");
  const persisted = await persistOwnedStudyPlan(client, userId, plan, inputHash);
  return {
    studyPlanId: persisted.studyPlanId,
    algorithmVersion: plan.algorithmVersion,
    planningRange: plan.planningRange,
    sessions: persisted.sessions.map(toStudySessionView),
    unscheduledWork: plan.unscheduledWork,
  } as const;
}
