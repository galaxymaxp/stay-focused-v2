import { randomUUID } from "node:crypto";
import { GoogleAuth, type AuthClient } from "google-auth-library";
import type { ProcessingJobDatabaseRow } from "@stay-focused/db";
import { createProcessingJobServiceClient, type ProcessingJobServiceClient } from "./repository";
import { failProcessingJob, readProcessingJobState } from "./worker-repository";
import { ProcessingOperationError } from "./operation-error";

export interface GoogleJobReference {
  readonly jobId: string;
  readonly dispatchId: string;
}

export function parseGoogleJobReference(value: unknown): GoogleJobReference | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (Object.keys(record).sort().join(",") !== "dispatchId,jobId" ||
      typeof record.jobId !== "string" || !uuid.test(record.jobId) ||
      typeof record.dispatchId !== "string" || !uuid.test(record.dispatchId)) return null;
  return { jobId: record.jobId, dispatchId: record.dispatchId };
}

export function googleTaskConfig(environment: Readonly<Record<string, string | undefined>> = process.env) {
  const project = environment.GOOGLE_CLOUD_PROJECT_ID?.trim();
  const location = environment.GOOGLE_GENERATION_REGION?.trim();
  const queue = environment.GOOGLE_GENERATION_QUEUE?.trim();
  const serviceAccountEmail = environment.GOOGLE_TASKS_INVOKER_EMAIL?.trim();
  const workerUrl = environment.GOOGLE_GENERATION_WORKER_URL?.trim();
  if (!project || !location || !queue || !serviceAccountEmail || !workerUrl ||
      !/^[a-z][a-z0-9-]+$/.test(project) || !/^[a-z0-9-]+$/.test(location) ||
      !/^[a-z0-9-]+$/.test(queue) || !serviceAccountEmail.endsWith(`@${project}.iam.gserviceaccount.com`)) {
    throw new Error("google_generation_not_configured");
  }
  const url = new URL(workerUrl);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("google_generation_worker_url_invalid");
  }
  return { parent: `projects/${project}/locations/${location}/queues/${queue}`, workerUrl: url.origin, serviceAccountEmail };
}

export async function enqueueGoogleJob(reference: GoogleJobReference, dependencies: {
  readonly client?: Pick<AuthClient, "request">;
} = {}): Promise<void> {
  const config = googleTaskConfig();
  // ADC supports an attached identity or a workload-identity federation config.
  // The OCR static JSON credential is deliberately not used for dispatch.
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = dependencies.client ?? await auth.getClient();
  try {
    await client.request({
      url: `https://cloudtasks.googleapis.com/v2/${config.parent}/tasks`,
      method: "POST",
      data: { task: {
        name: `${config.parent}/tasks/generation-${reference.jobId}-${reference.dispatchId}`,
        dispatchDeadline: "1800s",
        httpRequest: {
          httpMethod: "POST", url: `${config.workerUrl}/tasks/generation`,
          headers: { "Content-Type": "application/json" },
          body: Buffer.from(JSON.stringify(reference)).toString("base64"),
          oidcToken: { serviceAccountEmail: config.serviceAccountEmail, audience: config.workerUrl },
        },
      } },
      timeout: 15_000,
      retry: false,
    });
  } catch (error) {
    // Deterministic task names make acceptance replay safe, including a lost response.
    if (typeof error === "object" && error !== null && "response" in error &&
        (error.response as { status?: number } | undefined)?.status === 409) return;
    throw new Error("google_generation_enqueue_failed");
  }
}

export async function dispatchGoogleJob(job: ProcessingJobDatabaseRow, dependencies: {
  readonly client?: ProcessingJobServiceClient;
  readonly enqueue?: (reference: GoogleJobReference) => Promise<void>;
} = {}): Promise<ProcessingJobDatabaseRow> {
  const client = dependencies.client ?? createProcessingJobServiceClient();
  const { data, error } = await client.rpc("prepare_google_processing_job_v1", { p_job_id: job.id });
  const prepared = data?.[0];
  if (error || !prepared) throw new Error("google_generation_prepare_failed");
  if (prepared.execution_backend !== "google_cloud" || prepared.status !== "queued" || !prepared.google_dispatch_id) return prepared;
  try {
    await (dependencies.enqueue ?? enqueueGoogleJob)({ jobId: prepared.id, dispatchId: prepared.google_dispatch_id });
  } catch {
    // An ambiguously accepted task can still claim this exact dispatch failure.
    const { error: failureError } = await client.from("processing_jobs").update({
      status: "failed", failed_at: new Date().toISOString(), updated_at: new Date().toISOString(), retryable: true,
      error_code: "google_generation_dispatch_failed", safe_error_message: "Processing could not be started. Try again.",
      status_message: "Needs attention",
    }).eq("id", prepared.id).eq("google_dispatch_id", prepared.google_dispatch_id).eq("status", "queued");
    if (failureError) throw new Error("google_generation_dispatch_state_unavailable");
    throw new Error("google_generation_dispatch_failed");
  }
  return prepared;
}

const terminal = new Set(["succeeded", "failed", "cancelled", "expired"]);

/** One queue delivery. Database fencing is authoritative, never task headers. */
export async function executeGoogleJob(reference: GoogleJobReference, dependencies: {
  readonly client?: ProcessingJobServiceClient;
  readonly run?: typeof runGoogleOperations;
} = {}): Promise<"ack" | "retry"> {
  const client = dependencies.client ?? createProcessingJobServiceClient();
  const workerId = `google-cloud:${randomUUID()}`;
  const { data, error } = await client.rpc("claim_google_processing_job_v1", {
    p_job_id: reference.jobId, p_dispatch_id: reference.dispatchId, p_worker_id: workerId,
  });
  if (error) throw new Error("google_generation_claim_failed");
  const job = data?.[0];
  if (!job || terminal.has(job.status)) return "ack";
  if (job.lease_owner !== workerId) return "retry";
  try {
    await (dependencies.run ?? runGoogleOperations)(job, workerId);
  } catch (error) {
    const state = await readProcessingJobState(client, job.id);
    if (terminal.has(state.status)) return "ack";
    if (state.lease_owner !== workerId) return "retry";
    const permanent = error instanceof ProcessingOperationError;
    await failProcessingJob(client, {
      jobId: job.id, workerId,
      errorCode: permanent ? "google_generation_interrupted" : "google_generation_retryable_failure",
      safeErrorMessage: "Processing was interrupted. Try again.",
      retryable: true, automaticRetryable: !permanent,
    });
  }
  const state = await readProcessingJobState(client, job.id);
  return terminal.has(state.status) ? "ack" : "retry";
}

export async function runGoogleOperations(job: ProcessingJobDatabaseRow, workerId: string): Promise<void> {
  const operations = await import("./operations");
  const jobId = job.id;
  const deadline = Date.now() + 25 * 60_000;
  function checkDeadline() {
    if (Date.now() > deadline) throw new Error("google_generation_delivery_deadline");
  }
  if (job.job_type === "quiz_generation") return operations.processQuizStep(jobId, workerId);
  if (job.job_type === "activity_generation") return operations.processActivityStep(jobId, workerId);
  const reviewer = job.job_type === "reviewer_generation";
  const pageCount = reviewer ? await operations.prepareCanvasReviewerExtractionStep(jobId, workerId) : null;
  if (pageCount !== null) {
    // Single-page inspection bounds memory. OCR retains the existing bounded chunks.
    for (let page = 1; page <= pageCount; page++) {
      checkDeadline();
      await operations.inspectPdfPageStep(jobId, workerId, page, pageCount);
    }
  }
  if (!reviewer || pageCount !== null) {
    const plan = await operations.prepareExtractionStep(jobId, workerId, reviewer);
    if (plan.kind === "image") await operations.extractImageStep(jobId, workerId);
    for (const chunk of plan.chunks) {
      checkDeadline();
      await operations.extractPdfChunkStep(jobId, workerId, chunk.index, chunk.pageNumbers, reviewer);
    }
    checkDeadline();
    if (reviewer) await operations.finalizeCanvasReviewerExtractionStep(jobId, workerId);
    else await operations.finalizeExtractionStep(jobId, workerId);
  }
  checkDeadline();
  if (reviewer) await operations.processAIReviewerStep(jobId, workerId);
}
