import { createHash } from "node:crypto";
import type { Database } from "@stay-focused/db";
import type { GenerationProvider } from "@stay-focused/engine";
import { heuristicTaskEstimateMinutes } from "@stay-focused/shared/task-planning";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCanvasHtmlToText } from "@/lib/canvas-content-normalization";

type Client = SupabaseClient<Database>;

export const TASK_ESTIMATE_BATCH = 10;
export const TASK_ESTIMATE_DAILY_AI_LIMIT = 40;
export const TASK_ESTIMATE_TIMEOUT_MS = 15_000;
export const TASK_ESTIMATE_DESCRIPTION_CHARS = 3000;
export const TASK_ESTIMATE_DEFAULT_MODEL = "gpt-5.4-2026-03-05";
export function taskEstimateModel(environment: Readonly<Record<string, string | undefined>> = process.env): string {
  return environment.TASK_ESTIMATE_MODEL?.trim() || TASK_ESTIMATE_DEFAULT_MODEL;
}

export interface EstimateCandidate {
  readonly taskId: string;
  readonly title: string;
  readonly courseLabel: string | null;
  readonly description: string;
  readonly submissionTypes: readonly string[];
  readonly pointsPossible: number | null;
  readonly gradingType: string | null;
  readonly fingerprint: string;
}

export function estimateFingerprint(input: Omit<EstimateCandidate, "taskId" | "courseLabel" | "fingerprint">): string {
  return createHash("sha256").update(JSON.stringify([
    input.title, input.description, [...input.submissionTypes].sort(), input.pointsPossible, input.gradingType,
  ])).digest("hex");
}

const INSTRUCTIONS = [
  "You estimate how many minutes a typical college student needs to complete each assignment, including reading the instructions, doing the work and submitting it.",
  "Use only the assignment details given. Do not assume extra requirements.",
  "Return one estimate per task id, as a whole number of minutes between 10 and 600, plus a short reason (at most 100 characters) that names what drives the time, for example 'Two short reflection paragraphs' or 'Coding lab with three exercises and a file upload'.",
  "If the details are too thin to judge, use the submission type and points, and say 'Based on assignment type'.",
].join(" ");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["estimates"],
  properties: {
    estimates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["taskId", "minutes", "reason"],
        properties: {
          taskId: { type: "string" },
          minutes: { type: "integer" },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;

export interface EstimateResult { readonly taskId: string; readonly minutes: number; readonly note: string; readonly source: "ai" | "heuristic" }

export async function estimateTasks(
  candidates: readonly EstimateCandidate[],
  provider: GenerationProvider | null,
  options: { readonly model?: string; readonly allowAi: boolean },
): Promise<readonly EstimateResult[]> {
  const fallback = (candidate: EstimateCandidate): EstimateResult => ({
    taskId: candidate.taskId,
    minutes: heuristicTaskEstimateMinutes({
      submissionTypes: candidate.submissionTypes,
      pointsPossible: candidate.pointsPossible,
      descriptionCharacters: candidate.description.length,
    }),
    note: "Based on assignment type",
    source: "heuristic",
  });
  if (!provider || !options.allowAi || candidates.length === 0) return candidates.map(fallback);

  const batch = candidates.slice(0, TASK_ESTIMATE_BATCH);
  const prompt = JSON.stringify({ tasks: batch.map((c) => ({
    taskId: c.taskId, title: c.title, course: c.courseLabel, submissionTypes: c.submissionTypes,
    pointsPossible: c.pointsPossible, gradingType: c.gradingType, instructions: c.description,
  })) });
  let output: unknown;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    output = await Promise.race([
      provider.generate({
        model: options.model ?? taskEstimateModel(),
        maxOutputTokens: 1500,
        reasoningEffort: "low",
        instructions: INSTRUCTIONS,
        prompt,
        schema: { name: "task_time_estimates", description: "Minutes per assignment", schema: SCHEMA },
      }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("task_estimate_timeout")), TASK_ESTIMATE_TIMEOUT_MS); }),
    ]);
  } catch {
    refreshFailed("provider_unavailable", batch.length);
    return candidates.map(fallback);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
  const byId = new Map<string, { minutes: number; reason: string }>();
  const estimates = isRecord(output) ? output.estimates : undefined;
  const duplicateIds = new Set<string>();
  if (Array.isArray(estimates)) {
    for (const item of estimates) {
      if (!isRecord(item)) continue;
      const value = item;
      if (typeof value.taskId === "string" && Number.isInteger(value.minutes) && typeof value.reason === "string") {
        if (byId.has(value.taskId)) duplicateIds.add(value.taskId);
        byId.set(value.taskId, { minutes: value.minutes as number, reason: value.reason });
      }
    }
  }
  const results = candidates.map((candidate): EstimateResult => {
    const found = byId.get(candidate.taskId);
    if (!batch.includes(candidate) || duplicateIds.has(candidate.taskId) || !found || found.minutes < 10 || found.minutes > 600 || !found.reason.trim()) return fallback(candidate);
    return {
      taskId: candidate.taskId,
      minutes: Math.round(found.minutes / 5) * 5,
      note: found.reason.trim().replace(/\s+/g, " ").slice(0, 100),
      source: "ai",
    };
  });
  const invalidCount = results.slice(0, batch.length).filter(result => result.source === "heuristic").length;
  if (invalidCount > 0) refreshFailed("invalid_output", invalidCount);
  return results;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function refreshFailed(code: string, count: number): void {
  console.warn("task_estimates.refresh_failed", { code, count });
}

/** Refresh a bounded batch; owner filters and compare-and-set preserve student edits. */
export async function refreshCanvasTaskEstimates(
  client: Client,
  userId: string,
  provider: GenerationProvider | null,
  now: number,
): Promise<void> {
  let candidateCount = 0;
  try {
    const counted = await client.from("tasks").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("estimate_source", "ai")
      .gte("estimated_at", new Date(now - 86_400_000).toISOString());
    if (counted.error || counted.count === null) { refreshFailed("count_failed", 0); return; }
    const recentAiCount = counted.count;
    const candidates: EstimateCandidate[] = [];
    const revisions = new Map<string, { source: "default" | "heuristic" | "ai"; updatedAt: string; unchanged: boolean }>();
    // Walk pages so unchanged estimates cannot hide later pending assignments.
    const pageSize = 100;
    for (let offset = 0; candidates.length < TASK_ESTIMATE_BATCH; offset += pageSize) {
      const tasks = await client.from("tasks")
        .select("id,canvas_assignment_row_id,estimate_source,estimate_fingerprint,updated_at")
        .eq("user_id", userId).eq("source_type", "canvas").eq("status", "pending")
        .in("estimate_source", ["default", "heuristic", "ai"])
        .order("due_at", { ascending: true, nullsFirst: false }).order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (tasks.error || !tasks.data) { refreshFailed("tasks_load_failed", candidates.length); return; }
      if (tasks.data.length === 0) break;
      const assignmentIds = tasks.data.flatMap(t => t.canvas_assignment_row_id ? [t.canvas_assignment_row_id] : []);
      if (assignmentIds.length === 0) {
        if (tasks.data.length < pageSize) break;
        continue;
      }
      const assignments = await client.from("canvas_assignments")
        .select("id,course_id,name,description_html,submission_types,points_possible,grading_type")
        .eq("user_id", userId).in("id", assignmentIds);
      if (assignments.error || !assignments.data) { refreshFailed("assignments_load_failed", candidates.length); return; }
      const courses = await client.from("canvas_courses").select("id,course_code,name")
        .eq("user_id", userId).in("id", [...new Set(assignments.data.map(a => a.course_id))]);
      if (courses.error || !courses.data) { refreshFailed("courses_load_failed", candidates.length); return; }
      const byAssignment = new Map(assignments.data.map(a => [a.id, a]));
      const byCourse = new Map(courses.data.map(c => [c.id, c.course_code || c.name]));
      for (const task of tasks.data) {
        const assignment = task.canvas_assignment_row_id ? byAssignment.get(task.canvas_assignment_row_id) : null;
        if (!assignment || task.estimate_source === "user") continue;
        const fullDescription = normalizeCanvasHtmlToText(assignment.description_html);
        const details = { title: assignment.name, description: fullDescription,
          submissionTypes: assignment.submission_types, pointsPossible: assignment.points_possible, gradingType: assignment.grading_type };
        const fingerprint = estimateFingerprint(details);
        const unchanged = task.estimate_fingerprint === fingerprint;
        if (task.estimate_source === "ai" && unchanged) continue;
        if (task.estimate_source === "heuristic" && unchanged && (!provider || recentAiCount >= TASK_ESTIMATE_DAILY_AI_LIMIT)) continue;
        candidates.push({ ...details, description: fullDescription.slice(0, TASK_ESTIMATE_DESCRIPTION_CHARS),
          taskId: task.id, courseLabel: byCourse.get(assignment.course_id) ?? null, fingerprint });
        revisions.set(task.id, { source: task.estimate_source, updatedAt: task.updated_at, unchanged });
        if (candidates.length === TASK_ESTIMATE_BATCH) break;
      }
      if (tasks.data.length < pageSize) break;
    }
    candidateCount = candidates.length;
    const allowAi = recentAiCount + candidateCount <= TASK_ESTIMATE_DAILY_AI_LIMIT;
    const results = await estimateTasks(candidates, provider, { allowAi });
    // A near-cap batch cannot get AI. Avoid rewriting unchanged heuristic rows.
    for (const result of results) {
      const candidate = candidates.find(c => c.taskId === result.taskId)!;
      const revision = revisions.get(result.taskId)!;
      if (result.source === "heuristic" && revision.source === "heuristic" && revision.unchanged && !allowAi) continue;
      const saved = await client.from("tasks").update({ estimated_minutes: result.minutes,
        estimate_source: result.source, estimate_note: result.note, estimate_fingerprint: candidate.fingerprint,
        estimated_at: new Date(now).toISOString() })
        .eq("user_id", userId).eq("id", result.taskId)
        .in("estimate_source", ["default", "heuristic", "ai"])
        .eq("estimate_source", revision.source).eq("updated_at", revision.updatedAt);
      if (saved.error) { refreshFailed("update_failed", candidateCount); return; }
    }
  } catch {
    refreshFailed("storage_failed", candidateCount);
  }
}
