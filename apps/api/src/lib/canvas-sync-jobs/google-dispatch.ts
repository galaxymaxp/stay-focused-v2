import type { CanvasSyncJobDatabaseRow } from "@stay-focused/db";
import type { AuthClient } from "google-auth-library";

import { googleDispatcherClient, googleTaskConfig } from "@/lib/processing-jobs/google-cloud";
import { createCanvasSyncJobServiceClient, type CanvasSyncJobServiceClient } from "./repository";

export interface GoogleCanvasJobReference {
  readonly jobId: string;
  readonly dispatchId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseGoogleCanvasJobReference(value: unknown): GoogleCanvasJobReference | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "dispatchId,jobId" ||
      typeof record.jobId !== "string" || !UUID.test(record.jobId) ||
      typeof record.dispatchId !== "string" || !UUID.test(record.dispatchId)) return null;
  return { jobId: record.jobId, dispatchId: record.dispatchId };
}

/** Uses the existing generation queue, dispatcher identity, private Run service, and OIDC invoker. */
export async function enqueueGoogleCanvasJob(reference: GoogleCanvasJobReference, dependencies: {
  readonly client?: Pick<AuthClient, "request">;
} = {}): Promise<void> {
  const config = googleTaskConfig();
  const client = dependencies.client ?? await googleDispatcherClient();
  try {
    await client.request({
      url: `https://cloudtasks.googleapis.com/v2/${config.parent}/tasks`,
      method: "POST",
      data: { task: {
        name: `${config.parent}/tasks/canvas-${reference.jobId}-${reference.dispatchId}`,
        dispatchDeadline: "1800s",
        httpRequest: {
          httpMethod: "POST", url: `${config.workerUrl}/tasks/canvas-sync`,
          headers: { "Content-Type": "application/json" },
          body: Buffer.from(JSON.stringify(reference)).toString("base64"),
          oidcToken: { serviceAccountEmail: config.serviceAccountEmail, audience: config.workerUrl },
        },
      } },
      timeout: 15_000,
      retry: false,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "response" in error &&
        (error.response as { status?: number } | undefined)?.status === 409) return;
    const response = typeof error === "object" && error !== null && "response" in error
      ? error.response as { status?: number; data?: { error?: { status?: string } } }
      : undefined;
    console.info("google_canvas.enqueue_failed", {
      httpStatus: response?.status ?? null,
      category: response?.data?.error?.status ?? null,
    });
    throw new Error("canvas_sync_google_enqueue_failed");
  }
}

export async function dispatchAcceptedCanvasSyncJob(
  job: CanvasSyncJobDatabaseRow,
  dependencies: {
    readonly client?: CanvasSyncJobServiceClient;
    readonly enqueue?: (reference: GoogleCanvasJobReference) => Promise<void>;
  } = {},
): Promise<CanvasSyncJobDatabaseRow> {
  if (job.status !== "queued") return job;
  const client = dependencies.client ?? createCanvasSyncJobServiceClient();
  const { data, error } = await client.rpc("prepare_canvas_sync_job_google_dispatch_v1", { p_job_id: job.id });
  const prepared = data?.[0];
  if (error || !prepared) throw new CanvasGoogleDispatchError("canvas_sync_google_prepare_failed");
  if (prepared.status !== "queued") return prepared;
  if (!prepared.google_dispatch_id) throw new CanvasGoogleDispatchError("canvas_sync_google_prepare_failed");
  if (prepared.google_dispatched_at) return prepared;

  const reference = { jobId: prepared.id, dispatchId: prepared.google_dispatch_id };
  try {
    await (dependencies.enqueue ?? enqueueGoogleCanvasJob)(reference);
  } catch {
    const { error: failureError } = await client.rpc("mark_canvas_sync_job_google_dispatch_failed_v1", {
      p_job_id: prepared.id, p_dispatch_id: reference.dispatchId,
    });
    if (failureError) throw new CanvasGoogleDispatchError("canvas_sync_google_dispatch_state_unavailable");
    throw new CanvasGoogleDispatchError("canvas_sync_google_dispatch_failed");
  }

  // The worker may claim before this metadata write. The durable task is still accepted.
  const attached = await client.rpc("mark_canvas_sync_job_google_dispatched_v1", {
    p_job_id: prepared.id, p_dispatch_id: reference.dispatchId,
  });
  return attached.error ? prepared : attached.data?.[0] ?? prepared;
}

export class CanvasGoogleDispatchError extends Error {
  public readonly safeMessage = "Canvas synchronization could not be started. Try again.";
  public readonly retryable = true;
  public constructor(public readonly code:
    | "canvas_sync_google_prepare_failed"
    | "canvas_sync_google_dispatch_failed"
    | "canvas_sync_google_dispatch_state_unavailable") {
    super(code);
    this.name = "CanvasGoogleDispatchError";
  }
}
