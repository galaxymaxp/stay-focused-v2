import { randomUUID } from "node:crypto";
import { GoogleAuth } from "google-auth-library";

import type { CanvasSyncJobDatabaseRow, CanvasSyncJobUnitRow } from "@stay-focused/db";

import {
  CANVAS_SYNC_CONTENT_CONCURRENCY,
  claimCanvasSyncUnitBatch,
  createInitialCanvasSyncUnits,
  failCheckpointedCanvasSyncJob,
  initializeCanvasSyncPlan,
  readCanvasSyncPlanState,
} from "./checkpoints";
import { finalizeCheckpointedCanvasSync } from "./finalize";
import type { GoogleCanvasJobReference } from "./google-dispatch";
import { createCanvasSyncJobServiceClient, findCanvasSyncJob, type CanvasSyncJobServiceClient } from "./repository";
import { executeCanvasSyncUnit } from "./unit-executor";
import { CANVAS_WORKER_TOKEN_ENDPOINT } from "./worker-token-contract";

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "expired"]);
const DELIVERY_LIMIT_MS = 25 * 60_000;

/** One Cloud Tasks delivery. Claims and worker fencing are enforced by Supabase. */
export async function executeGoogleCanvasJob(reference: GoogleCanvasJobReference, dependencies: {
  readonly client?: CanvasSyncJobServiceClient;
  readonly run?: typeof runGoogleCanvasOperations;
  readonly loadToken?: typeof loadGoogleCanvasToken;
  readonly workerId?: string;
} = {}): Promise<"ack" | "retry"> {
  const client = dependencies.client ?? createCanvasSyncJobServiceClient();
  const workerId = dependencies.workerId ?? `google-canvas:${randomUUID()}`;
  const { data, error } = await client.rpc("claim_canvas_sync_job_google_v1", {
    p_job_id: reference.jobId, p_dispatch_id: reference.dispatchId, p_worker_id: workerId,
  });
  if (error) throw new Error("canvas_sync_google_claim_failed");
  const claimed = data?.[0];
  if (!claimed) {
    const current = await findCanvasSyncJob(client, reference.jobId);
    if (!current || current.google_dispatch_id !== reference.dispatchId || TERMINAL.has(current.status)) return "ack";
    return "retry";
  }

  let heartbeatLost = false;
  let heartbeatPending = false;
  const heartbeat = setInterval(() => {
    if (heartbeatPending) return;
    heartbeatPending = true;
    void Promise.resolve(client.rpc("heartbeat_canvas_sync_job_google_v1", {
      p_job_id: reference.jobId, p_dispatch_id: reference.dispatchId, p_worker_id: workerId,
    })).then(({ data: rows, error: heartbeatError }) => {
      if (heartbeatError || !rows?.[0]) heartbeatLost = true;
    }).catch(() => { heartbeatLost = true; }).finally(() => { heartbeatPending = false; });
  }, 20_000);
  let stage: "token_handoff" | "operations" = "token_handoff";
  try {
    const accessToken = await (dependencies.loadToken ?? loadGoogleCanvasToken)(reference, workerId);
    stage = "operations";
    await (dependencies.run ?? runGoogleCanvasOperations)(client, claimed, workerId, accessToken, () => heartbeatLost);
  } catch {
    console.warn("google_canvas.worker_interrupted", { jobId: reference.jobId, stage });
    const current = await findCanvasSyncJob(client, reference.jobId);
    if (current && current.worker_id === workerId && !TERMINAL.has(current.status)) {
      await failCheckpointedCanvasSyncJob(client, {
        code: stage === "token_handoff" ? "canvas_sync_token_unavailable" : "canvas_sync_interrupted",
        jobId: reference.jobId,
        message: stage === "token_handoff"
          ? "Canvas synchronization could not connect to the worker. Try again."
          : "Canvas synchronization was interrupted and can be retried.",
        retryable: true, workerId,
      });
    }
  } finally {
    clearInterval(heartbeat);
  }
  const final = await findCanvasSyncJob(client, reference.jobId);
  return !final || TERMINAL.has(final.status) ? "ack" : "retry";
}

export async function runGoogleCanvasOperations(
  client: CanvasSyncJobServiceClient,
  claimed: CanvasSyncJobDatabaseRow,
  workerId: string,
  accessToken: string,
  heartbeatLost: () => boolean,
): Promise<void> {
  const deliveryDeadline = Date.now() + DELIVERY_LIMIT_MS;
  if (claimed.status === "running") {
    const initialized = await initializeCanvasSyncPlan(client, {
      jobId: claimed.id, units: createInitialCanvasSyncUnits(claimed), workerId,
    });
    if (!initialized) throw new Error("canvas_sync_plan_unavailable");
  }

  while (true) {
    if (heartbeatLost() || Date.now() >= deliveryDeadline) throw new Error("canvas_sync_delivery_interrupted");
    const job = await findCanvasSyncJob(client, claimed.id);
    if (!job || TERMINAL.has(job.status) || job.worker_id !== workerId) return;
    if (job.status === "cancellation_requested") {
      await finalizeCheckpointedCanvasSync(client, { jobId: job.id, workerId, accessToken });
      return;
    }

    const units = await claimCanvasSyncUnitBatch(client, {
      jobId: job.id, limit: CANVAS_SYNC_CONTENT_CONCURRENCY, workerId,
    });
    if (units.length > 0) {
      await Promise.all(units.map((unit) => executeCanvasSyncUnit(client, { unitId: unit.id, workerId, accessToken })));
      continue;
    }

    const state = await readCanvasSyncPlanState(client, job.id);
    if (!state.units.some(isActiveUnit)) {
      const final = await finalizeCheckpointedCanvasSync(client, { jobId: job.id, workerId, accessToken });
      if (final.status !== "pending") return;
    }
    const waitUntil = Math.min(nextWakeAt(state.units, state.nextAvailableAt), Date.now() + 30_000);
    await new Promise((resolve) => setTimeout(resolve, Math.max(1_000, waitUntil - Date.now())));
  }
}

/** Obtain only the claimed job's Canvas token from the bounded Vercel API. */
export async function loadGoogleCanvasToken(
  reference: GoogleCanvasJobReference,
  workerId: string,
  dependencies: {
    readonly request?: () => Promise<{ readonly data?: { readonly accessToken?: unknown } }>;
    readonly delay?: (ms: number) => Promise<void>;
  } = {},
): Promise<string> {
  const request = dependencies.request ?? (async () => {
    const client = await new GoogleAuth().getIdTokenClient(CANVAS_WORKER_TOKEN_ENDPOINT);
    return client.request<{ accessToken?: unknown }>({
      url: CANVAS_WORKER_TOKEN_ENDPOINT,
      method: "POST",
      data: { ...reference, workerId },
      // The Vercel handoff route can spend its full 30-second runtime budget
      // under load; let its response arrive before treating it as a timeout.
      timeout: 35_000,
      retry: false,
    });
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await request();
      const token = response.data?.accessToken;
      if (typeof token === "string" && token.length >= 8 && token.length <= 4096) return token;
      break;
    } catch (error) {
      const status = typeof error === "object" && error !== null && "response" in error
        ? (error.response as { status?: number } | undefined)?.status
        : undefined;
      if (attempt > 0 || (typeof status === "number" && status < 500)) break;
      console.warn("google_canvas.token_handoff_retry", { jobId: reference.jobId });
      await (dependencies.delay ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms))))(500);
    }
  }
  throw new Error("canvas_sync_token_unavailable");
}

function isActiveUnit(unit: CanvasSyncJobUnitRow): boolean {
  return unit.status === "queued" || unit.status === "running" || unit.status === "retry_wait";
}

function nextWakeAt(units: readonly CanvasSyncJobUnitRow[], retryAt: string | null): number {
  const candidates = [retryAt, ...units.map((unit) => unit.status === "running"
    ? unit.lease_expires_at : unit.status === "retry_wait" ? unit.available_at : null)]
    .filter((value): value is string => Boolean(value))
    .map(Date.parse).filter(Number.isFinite);
  return candidates.length > 0 ? Math.min(...candidates) : Date.now() + 1_000;
}
