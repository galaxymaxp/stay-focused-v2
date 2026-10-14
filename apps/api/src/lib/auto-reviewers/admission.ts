import { createHash, randomUUID } from "node:crypto";
import type { CanvasAutoReviewerCandidateRow, Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listCanvasReviewerSources,
  type CanvasReviewerSourceDescriptor,
} from "@/lib/canvas-reviewer-sources";
import { ExperienceFailure } from "@/lib/experience/errors";
import { startReviewerGeneration } from "@/lib/experience/generation";
import { dispatchAcceptedProcessingJob } from "@/lib/processing-jobs/workflow-dispatch";
import { readReviewedMaterialIds } from "./reviewed-materials";

type Client = SupabaseClient<Database>;

export const AUTO_REVIEWER_MAX_ADMISSIONS_PER_RUN = 3;
export const AUTO_REVIEWER_MAX_ADMISSIONS_PER_DAY = 5;
export const AUTO_REVIEWER_MAX_ATTEMPTS = 3;
export const AUTO_REVIEWER_RUN_BUDGET_MS = 90_000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const AUTO_REVIEWER_CANDIDATE_PAGE_SIZE = 200;
export const AUTO_REVIEWER_CANDIDATE_MAX_PAGES = 50;

export interface AutoReviewerRunResult {
  readonly status: "disabled" | "baselined" | "completed" | "unavailable";
  readonly admitted: number;
  readonly skipped: number;
  readonly deferred: number;
  readonly failed: number;
}

export interface AutoReviewerDependencies {
  readonly listMaterials: (client: Client, userId: string, courseId: string) => Promise<readonly CanvasReviewerSourceDescriptor[] | null>;
  readonly readReviewed: (client: Client, userId: string, courseId: string) => Promise<ReadonlySet<string>>;
  readonly start: (client: Client, userId: string, input: { courseId: string; materialId: string }, key: string, dependencies: { readonly brokeredCanvasToken?: string }) => Promise<{ readonly id: string }>;
  readonly now: () => number;
}

const defaultDependencies: AutoReviewerDependencies = {
  listMaterials: listAllMaterials,
  readReviewed: readReviewedMaterialIds,
  start: async (client, userId, input, key, dependencies) => {
    // A sync worker has no HTTP response lifecycle for Next.js after().
    // Await durable dispatch before saving the automatic admission receipt.
    const job = await startReviewerGeneration(client, userId, input, key, {
      ...dependencies,
      schedule: () => {},
    });
    return await dispatchAcceptedProcessingJob(job, { client });
  },
  now: () => Date.now(),
};

export function isAutoReviewerEligible(source: CanvasReviewerSourceDescriptor): boolean {
  if (source.type !== "file" && source.type !== "page") return false;
  return source.availability === "available" && source.capability === "ready";
}
function isPreparationCandidate(source:CanvasReviewerSourceDescriptor):boolean{
  return (source.type==='file'||source.type==='page') && (isAutoReviewerEligible(source) ||
    (source.capability==='needs_preparation' && (source.type==='page'||source.file?.canPrepare===true)) ||
    (source.capability==='failed' && source.file?.canPrepare===true));
}

/** Material that already existed when the course was baselined is never automatic. */
export function isNewSinceBaseline(source: CanvasReviewerSourceDescriptor, baselineAt: string): boolean {
  if (!source.updatedAt) return false;
  const updated = Date.parse(source.updatedAt);
  const baseline = Date.parse(baselineAt);
  return Number.isFinite(updated) && Number.isFinite(baseline) && updated > baseline;
}

export function materialRevision(source: CanvasReviewerSourceDescriptor): string {
  return source.updatedAt ?? "unversioned";
}

export function autoReviewerIdempotencyKey(input: {
  readonly userId: string;
  readonly courseId: string;
  readonly materialId: string;
  readonly revision: string;
}): string {
  const digest = createHash("sha256")
    .update(`${input.userId}|${input.courseId}|${input.materialId}|${input.revision}`)
    .digest("hex")
    .slice(0, 48);
  return `auto-reviewer:${digest}`;
}

async function listAllMaterials(client: Client, userId: string, courseId: string): Promise<readonly CanvasReviewerSourceDescriptor[] | null> {
  const inventory = await listCanvasReviewerSources({ client, userId, courseId, completeInventory: true });
  // The complete, bounded owner inventory must never become a partial baseline.
  return inventory.ok && !inventory.value.pagination.hasMore ? inventory.value.sources : null;
}

export async function runAutomaticReviewerAdmission(
  client: Client,
  input: { readonly userId: string; readonly courseId: string; readonly brokeredCanvasToken?: string },
  overrides: Partial<AutoReviewerDependencies> = {},
): Promise<AutoReviewerRunResult> {
  const runId = randomUUID();
  const lease = { p_user_id: input.userId, p_run_id: runId };
  const claimed = await client.rpc("claim_canvas_auto_reviewer_admission_v1", lease);
  if (claimed.error || !claimed.data) return { status: "unavailable", admitted: 0, skipped: 0, deferred: 0, failed: 0 };
  try {
    return await admitWithLease(client, input, overrides, async () => {
      const renewed = await client.rpc("claim_canvas_auto_reviewer_admission_v1", lease);
      return !renewed.error && renewed.data;
    });
  } finally {
    // Admission result must survive a transient release failure; expiry recovers it.
    try { await client.rpc("release_canvas_auto_reviewer_admission_v1", lease); }
    catch { console.error("auto_reviewers.lease_release_failed", { code: "auto_reviewer_lease_release_failed" }); }
  }
}

async function admitWithLease(
  client: Client,
  input: { readonly userId: string; readonly courseId: string; readonly brokeredCanvasToken?: string },
  overrides: Partial<AutoReviewerDependencies>,
  renewLease: () => Promise<boolean>,
): Promise<AutoReviewerRunResult> {
  const deps = { ...defaultDependencies, ...overrides };
  const { userId, courseId } = input;
  const startedAt = deps.now();
  const empty = { admitted: 0, skipped: 0, deferred: 0, failed: 0 };

  const preference = await client
    .from("canvas_auto_reviewer_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (preference.error) return { status: "unavailable", ...empty };
  if (preference.data && !preference.data.enabled) return { status: "disabled", ...empty };

  const materials = await deps.listMaterials(client, userId, courseId);
  if (!materials) return { status: "unavailable", ...empty };
  const eligible = materials.filter(isPreparationCandidate);
  const byId = new Map(eligible.map((source) => [source.id, source]));

  const state = await client
    .from("canvas_auto_reviewer_course_state")
    .select("baseline_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (state.error) return { status: "unavailable", ...empty };

  const rows = eligible.map((source) => ({
    user_id: userId,
    course_id: courseId,
    material_id: source.id,
    material_revision: materialRevision(source),
    status: !state.data
      ? ("baseline" as const)
      : isNewSinceBaseline(source, state.data.baseline_at) ? ("pending" as const) : ("baseline" as const),
  }));

  if (rows.length > 0) {
    const seeded = await client
      .from("canvas_auto_reviewer_candidates")
      .upsert(rows, { onConflict: "user_id,course_id,material_id,material_revision", ignoreDuplicates: true });
    if (seeded.error) return { status: "unavailable", ...empty };
  }

  if (!state.data) {
    const baselined = await client
      .from("canvas_auto_reviewer_course_state")
      .upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
    if (baselined.error) return { status: "unavailable", ...empty };
    return { status: "baselined", ...empty };
  }

  const admittedToday = await client
    .from("canvas_auto_reviewer_candidates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "admitted")
    .gte("updated_at", new Date(deps.now() - DAY_MS).toISOString());
  if (admittedToday.error) return { status: "unavailable", ...empty };
  let dailyRemaining = Math.max(0, AUTO_REVIEWER_MAX_ADMISSIONS_PER_DAY - (admittedToday.count ?? 0));

  const open: Pick<CanvasAutoReviewerCandidateRow, "id" | "material_id" | "material_revision" | "attempt_count">[] = [];
  let complete = false;
  for (let page = 0; page < AUTO_REVIEWER_CANDIDATE_MAX_PAGES; page++) {
    const offset = page * AUTO_REVIEWER_CANDIDATE_PAGE_SIZE;
    const result = await client
    .from("canvas_auto_reviewer_candidates")
    .select("id, material_id, material_revision, attempt_count")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .in("status", ["pending", "deferred_quota"])
    .lt("attempt_count", AUTO_REVIEWER_MAX_ATTEMPTS)
    .order("id", { ascending: true }).range(offset, offset + AUTO_REVIEWER_CANDIDATE_PAGE_SIZE - 1);
    if (result.error || !result.data) return { status: "unavailable", ...empty };
    open.push(...result.data);
    if (result.data.length < AUTO_REVIEWER_CANDIDATE_PAGE_SIZE) { complete = true; break; }
  }
  if (!complete) return { status: "unavailable", ...empty };

  // Only candidates whose exact revision is still listed and eligible are admitted.
  const queue = open
    .filter((row) => {
      const source = byId.get(row.material_id);
      return source !== undefined && materialRevision(source) === row.material_revision;
    })
    .sort((left, right) =>
      (Date.parse(byId.get(right.material_id)?.updatedAt ?? "") || 0) - (Date.parse(byId.get(left.material_id)?.updatedAt ?? "") || 0) || left.id.localeCompare(right.id),
    );
  if (queue.length === 0) return { status: "completed", ...empty };

  const reviewed = await deps.readReviewed(client, userId, courseId);
  const counts = { ...empty };
  let runRemaining = AUTO_REVIEWER_MAX_ADMISSIONS_PER_RUN;
  let awaitingPreparation = 0;

  for (const row of queue) {
    const update = async (patch: Partial<CanvasAutoReviewerCandidateRow>) => {
      const saved = await client
        .from("canvas_auto_reviewer_candidates")
        .update({ ...patch, updated_at: new Date(deps.now()).toISOString() })
        .eq("id", row.id)
        .eq("user_id", userId);
      if (saved.error) throw new ExperienceFailure(503, "unavailable");
    };

    if (reviewed.has(row.material_id)) {
      await update({ status: "skipped_existing" });
      counts.skipped++;
      continue;
    }
    if (!isAutoReviewerEligible(byId.get(row.material_id)!)) {
      await update({ status: "pending", failure_code: "awaiting_preparation" });
      counts.skipped++;
      awaitingPreparation++;
      continue;
    }
    if (runRemaining === 0 || dailyRemaining === 0 || deps.now() - startedAt > AUTO_REVIEWER_RUN_BUDGET_MS) break;
    if (!await renewLease()) return { status: "unavailable", ...counts };

    let job: { readonly id: string };
    try {
      job = await deps.start(
        client,
        userId,
        { courseId, materialId: row.material_id },
        autoReviewerIdempotencyKey({ userId, courseId, materialId: row.material_id, revision: row.material_revision }),
        { brokeredCanvasToken: input.brokeredCanvasToken },
      );
    } catch (error) {
      if (error instanceof ExperienceFailure && error.status === 429) {
        await update({ status: "deferred_quota", failure_code: "rate_limited" });
        counts.deferred++;
        break; // The shared quota is exhausted; the next sync resumes.
      }
      const attempts = row.attempt_count + 1;
      const code = error instanceof ExperienceFailure ? error.code : "auto_reviewer_admission_failed";
      await update({
        status: attempts >= AUTO_REVIEWER_MAX_ATTEMPTS ? "failed" : "pending",
        failure_code: String(code).slice(0, 80),
        attempt_count: attempts,
      });
      counts.failed++;
      // Collect and continue: one bad material never blocks the rest.
      continue;
    }
    // A receipt write failure ends this run; it is not a source failure.
    // The deterministic request key reconnects the accepted job on retry.
    await update({ status: "admitted", processing_job_id: job.id, failure_code: null, attempt_count: row.attempt_count + 1 });
    counts.admitted++;
    runRemaining--;
    dailyRemaining--;
  }
  if (awaitingPreparation > 0) console.info("auto_reviewers.awaiting_preparation", { count: awaitingPreparation });
  return { status: "completed", ...counts };
}
