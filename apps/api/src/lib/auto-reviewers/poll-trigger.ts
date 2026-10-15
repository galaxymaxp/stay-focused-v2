import type { Database, Json } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCanvasSyncJob } from "@/lib/canvas-sync-jobs/repository";
import { dispatchAcceptedCanvasSyncJob } from "@/lib/canvas-sync-jobs/google-dispatch";

type Client = SupabaseClient<Database>;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Only complete inventories reach this helper. Null previous evidence baselines
 * the course; it never interprets the semester's existing material as new. */
export function detectNewInstructionalModuleItems(
  prevFingerprint: Json | undefined,
  payload: Record<string, Json>,
): string[] {
  if (!Array.isArray(prevFingerprint) || !Array.isArray(payload.moduleItems)) return [];
  if (!prevFingerprint.every(id => typeof id === "string")) return [];
  const previous = new Set(prevFingerprint);
  return [...new Set(payload.moduleItems.flatMap(value => {
    const item = record(value);
    const id = item.canvas_module_item_id;
    return typeof id === "string" && (item.item_type === "File" || item.item_type === "Page") && !previous.has(id) ? [id] : [];
  }))];
}

export const moduleItemIds = (payload: Record<string, Json>): string[] =>
  Array.isArray(payload.moduleItems) ? [...new Set(payload.moduleItems.flatMap(value => {
    const id = record(value).canvas_module_item_id;
    return typeof id === "string" ? [id] : [];
  }))] : [];

interface Input { readonly userId: string; readonly courseId: string; readonly newItemCount: number; readonly now: number }
export interface PollTriggerDependencies {
  readonly create: typeof createCanvasSyncJob;
  readonly dispatch: typeof dispatchAcceptedCanvasSyncJob;
}

/** RPC atomically enforces preference, activity, ownership and rolling caps.
 * No preparation or generation runs in the poll's execution context. */
export async function maybeRequestContentSync(client: Client, input: Input,
  overrides: Partial<PollTriggerDependencies> = {}): Promise<boolean> {
  if (input.newItemCount <= 0) return false;
  try {
    const reserved = await client.rpc("reserve_canvas_poll_sync_v1", { p_user_id: input.userId, p_course_id: input.courseId });
    if (reserved.error) throw new Error("poll_sync_reservation_failed");
    if (!reserved.data) return false;
    const deps = { create: createCanvasSyncJob, dispatch: dispatchAcceptedCanvasSyncJob, ...overrides };
    const job = await deps.create(client, {
      userId: input.userId, courseId: input.courseId, jobType: "course_content",
      idempotencyKey: `poll-sync:${input.courseId}:${Math.floor(input.now / SIX_HOURS_MS)}`,
    });
    await deps.dispatch(job, { client });
    console.info("auto_reviewers.poll_sync_requested", { newItemCount: input.newItemCount, requested: 1 });
    return true;
  } catch {
    console.error("auto_reviewers.poll_sync_unavailable", { newItemCount: input.newItemCount, requested: 0 });
    return false;
  }
}
