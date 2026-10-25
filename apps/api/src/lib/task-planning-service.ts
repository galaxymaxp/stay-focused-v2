import type { Database } from "@stay-focused/db";
import type { GenerationProvider } from "@stay-focused/engine";
import {
  generateContentStudyPlan,
  generateDeterministicStudyPlan,
  type DeterministicStudyPlan,
  type StudyPlanningRequest,
} from "@stay-focused/shared/task-planning";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { createServerOpenAIProvider } from "@/providers";
import { refreshCanvasTaskEstimates, TASK_ESTIMATE_TIMEOUT_MS } from "@/lib/task-estimates";

import {
  importSchedulableCanvasAssignments,
  loadOwnedPlannerTasks,
  loadOwnedReviewerCandidates,
  loadOwnedPlanningCandidates,
  importOwnedCanvasAssignments,
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
  now = Date.now(),
  provider?: GenerationProvider | null,
): Promise<DeterministicStudyPlan> {
  if (request.selection) {
    let candidates = await loadOwnedPlanningCandidates(client, userId, request, now);
    const selection = request.selection;
    let all = [...candidates.courses.flatMap(course => course.items), ...candidates.personalItems];
    const allowedCourses = new Set(candidates.courses.map(course => course.id));
    const itemMap = () => new Map(all.flatMap(item => [[`${item.kind}:${item.id}`, item] as const,
      ...(item.kind === 'task' && item.canvasAssignmentId ? [[`task:${item.canvasAssignmentId}`, item] as const] : [])]));
    let ownedItems = itemMap();
    if (selection.courseIds?.some(id => !allowedCourses.has(id)) || selection.items?.some(item => {
      const candidate = ownedItems.get(`${item.kind}:${item.id}`);
      return !candidate || (selection.courseIds && (!candidate.courseId || !selection.courseIds.includes(candidate.courseId)));
    })) throw new OwnedPlanningError("task_not_found", "One or more selected items were not found.");
    const mode = request.mode ?? "tasks";
    const chosen = selection.items?.map(item => ownedItems.get(`${item.kind}:${item.id}`)!) ?? all.filter(item =>
      (!selection.courseIds || (!!item.courseId && selection.courseIds.includes(item.courseId))) && !item.openedWithin24h);
    if (new Set(chosen.map(item => `${item.kind}:${item.id}`)).size !== chosen.length) throw new OwnedPlanningError('task_not_found', 'One or more selected items were not found.');
    const imports = chosen.filter(item => item.kind === 'task' && item.needsTaskImport && mode !== 'reviewers').map(item => item.canvasAssignmentId!);
    if (imports.length) {
      // Local idempotent projection of already synchronized evidence, never a
      // Canvas sync, Library refetch, provider call or estimate refresh.
      for (let offset = 0; offset < imports.length; offset += 100) await importOwnedCanvasAssignments(client, userId, imports.slice(offset, offset + 100));
      candidates = await loadOwnedPlanningCandidates(client, userId, request, now);
      all = [...candidates.courses.flatMap(course => course.items), ...candidates.personalItems];
      ownedItems = itemMap();
    }
    const effectiveItems = chosen.map(item => {
      const resolved = ownedItems.get(`${item.kind}:${item.canvasAssignmentId ?? item.id}`);
      if (!resolved || (resolved.needsTaskImport && mode !== 'reviewers')) throw new OwnedPlanningError('task_not_found', 'One or more selected items were not found.');
      return { kind: resolved.kind, id: resolved.id };
    });
    const explicit = new Set(selection.items?.map(item => `${item.kind}:${item.id}`));
    const reviewers = all.filter(item => item.kind === "reviewer" && (!item.openedWithin24h || explicit.has(`reviewer:${item.id}`)))
      .sort((a, b) => (a.smartRank ?? 0) - (b.smartRank ?? 0))
      .map(item => ({ id: item.id, title: item.title, courseId: item.courseId, estimatedMinutes: item.estimateMinutes }));
    const tasks = all.filter(item => item.kind === "task").map(item => ({ id: item.id, title: item.title, courseId: item.courseId,
      estimatedMinutes: item.estimateMinutes, dueAt: item.dueAt, priority: item.priority, createdAt: item.createdAt }));
    return generateContentStudyPlan({ mode, tasks, reviewers, planningRange: request.planningRange, availability: request.availability,
      selection: { ...selection, items: effectiveItems } });
  }
  // An omitted mode is the original tasks-only plan. Reviewers mode never
  // touches task work, so it skips the Canvas import and estimate refresh.
  const { mode } = request;
  const plansTasks = mode !== "reviewers";
  // Planning the student's whole day includes their synced Canvas work
  // automatically. An explicit task selection plans exactly those tasks.
  if (plansTasks && !request.taskIds) {
    await importSchedulableCanvasAssignments(client, userId, now);
    await refreshCanvasTaskEstimates(client, userId, provider === undefined ? estimateProvider() : provider, now);
  }
  const tasks = plansTasks ? await loadOwnedPlannerTasks(client, userId, request.taskIds) : [];
  if (plansTasks && request.taskIds && tasks.length !== request.taskIds.length) {
    throw new OwnedPlanningError(
      "task_not_found",
      "One or more pending tasks were not found.",
    );
  }
  if (!mode) {
    return generateDeterministicStudyPlan({
      tasks,
      planningRange: request.planningRange,
      availability: request.availability,
    });
  }
  const reviewers = mode === "tasks" ? [] : await loadOwnedReviewerCandidates(client, userId, request.planningRange, now);
  return generateContentStudyPlan({
    mode,
    tasks,
    reviewers,
    planningRange: request.planningRange,
    availability: request.availability,
  });
}

export async function applyOwnedStudyPlan(
  client: SupabaseClient<Database>,
  userId: string,
  request: StudyPlanningRequest,
  now = Date.now(),
  provider?: GenerationProvider | null,
) {
  const plan = await previewOwnedStudyPlan(client, userId, request, now, provider);
  const inputHash = createHash("sha256")
    .update(
      JSON.stringify({
        algorithmVersion: plan.algorithmVersion,
        planningRange: plan.planningRange,
        availability: plan.availability,
        sessions: plan.sessions,
        unscheduledWork: plan.unscheduledWork,
        ...(request.selection ? { selection: request.selection } : {}),
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
    ...(plan.mode ? { mode: plan.mode } : {}),
    ...(plan.notFit ? { notFit: plan.notFit } : {}),
  } as const;
}

function estimateProvider(): GenerationProvider | null {
  try {
    return createServerOpenAIProvider({ timeoutMs: TASK_ESTIMATE_TIMEOUT_MS, maxRetries: 0 });
  } catch {
    return null;
  }
}
