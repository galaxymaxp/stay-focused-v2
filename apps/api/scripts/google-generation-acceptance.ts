/** Opt-in authenticated operator harness. Never imports old generated outputs as evidence. */
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { OAuth2Client } from "google-auth-library";
import { createProcessingJobServiceClient, requestProcessingJobCancellation, toProcessingJobStatusView } from "../src/lib/processing-jobs/repository";
import { createReviewerProcessingJob } from "../src/lib/processing-jobs/creation";
import { startReviewerGeneration } from "../src/lib/experience/generation";
import { startQuizGeneration } from "../src/lib/quiz/service";
import { startActivityGeneration } from "../src/lib/activity-maker/service";
import { dispatchGoogleJob, enqueueGoogleJob, googleTaskConfig, type GoogleJobReference } from "../src/lib/processing-jobs/google-cloud";
import { failProcessingJob, readProcessingJobState } from "../src/lib/processing-jobs/worker-repository";
import { ExperienceService } from "../src/lib/experience/service";
import { experienceRepository } from "../src/lib/experience/repository";
import { listCanvasReviewerSources } from "../src/lib/canvas-reviewer-sources";

const required = (key: string) => { const value = process.env[key]?.trim(); if (!value) throw new Error(`missing_${key}`); return value; };
const client = createProcessingJobServiceClient();
const owner = required("B37_OWNER_ID");
const label = required("B37_CASE");
const evidencePath = required("B37_EVIDENCE_PATH");
const idempotencyKey = `b37-google-${label}-${randomUUID()}`;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const auth = new OAuth2Client();
function refreshOperatorToken() {
  // CLI login stays outside the worker. Token remains in memory, never in evidence.
  const token = execFileSync(process.platform === "win32" ? "gcloud.cmd" : "gcloud", ["auth", "print-access-token", "--quiet"], {
    encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  auth.setCredentials({ access_token: token });
}
async function enqueue(reference: GoogleJobReference) {
  refreshOperatorToken();
  await enqueueGoogleJob(reference, { client: auth });
}
async function main() {
  // Disable the default local dispatch while admitting through existing services.
  delete process.env.GENERATION_BACKEND;
  process.env.PROCESSING_EXECUTION_BACKEND = "database_worker";
  const resumeId = process.env.B37_RESUME_JOB_ID;
  const previous = resumeId ? JSON.parse(readFileSync(evidencePath, "utf8")) as Record<string, unknown> : {};
  const started = typeof previous.startedAt === "string" ? Date.parse(previous.startedAt) : Date.now();
  let job;
  if (resumeId) {
    job = await readProcessingJobState(client, resumeId);
  } else if (label === "quiz") {
    const artifactId = required("B37_REVIEWER_ID");
    job = await startQuizGeneration(client, owner, { sourceType: "reviewer", sourceIds: [artifactId], reviewerArtifactId: artifactId, questionCount: 5, difficulty: "mixed" }, idempotencyKey);
  } else if (label === "activity") {
    job = await startActivityGeneration(client, owner, required("B37_ACTIVITY_ID"), { mode: "draft", materialIds: [] }, idempotencyKey);
  } else if (label === "cancel" || label === "failure") {
    job = await createReviewerProcessingJob({ client, userId: owner, idempotencyKey,
      source: { sourceText: "Disposable execution acceptance. This source must never be sent to an AI provider.", sourceTitle: `B37 ${label} acceptance`,
        ...(label === "failure" ? { sourcePrivateMetadata: { canvasDeferredResolutionVersion: "canvas-reviewer-source-v1" } } : {}),
      } });
  } else {
    job = await startReviewerGeneration(client, owner, { courseId: required("B37_COURSE_ID"), materialId: required("B37_MATERIAL_ID") }, idempotencyKey, { schedule: () => undefined });
  }
  if (job.user_id !== owner) throw new Error("acceptance_owner_mismatch");
  const prepared = await dispatchGoogleJob(job, { client, enqueue: async () => undefined });
  if (!prepared.google_dispatch_id || prepared.execution_backend !== "google_cloud") throw new Error("acceptance_backend_mismatch");
  const reference = { jobId: prepared.id, dispatchId: prepared.google_dispatch_id };
  // Save identity before enqueue so an operator can reconcile an interrupted harness.
  const evidence: Record<string, unknown> = { label, jobId: job.id, idempotencyKey, startedAt: new Date(started).toISOString(), ...previous };
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  if (label === "cancel") await requestProcessingJobCancellation(client, owner, job.id);
  let holder: string | undefined;
  if (process.env.B37_CONTROLLED_RETRY === "1" && !resumeId) {
    holder = `google-cloud:${randomUUID()}`;
    const claim = await client.rpc("claim_google_processing_job_v1", { p_job_id: job.id, p_dispatch_id: reference.dispatchId, p_worker_id: holder });
    if (claim.error || claim.data?.[0]?.lease_owner !== holder) throw new Error("acceptance_hold_failed");
  }
  await enqueue(reference);
  console.info("b37.accepted", { label, jobId: job.id });
  if (label === "cancel-running" && !resumeId) {
    let observedRunning = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      const state = await readProcessingJobState(client, job.id);
      if (state.status === "running") { observedRunning = true; break; }
      if (state.status !== "queued") break;
      await sleep(250);
    }
    await requestProcessingJobCancellation(client, owner, job.id);
    evidence.cancellationObservedRunning = observedRunning;
    if (!observedRunning) throw new Error("acceptance_running_state_not_observed");
  }
  if (holder) {
    const config = googleTaskConfig();
    const taskUrl = `https://cloudtasks.googleapis.com/v2/${config.parent}/tasks/generation-${job.id}-${reference.dispatchId}`;
    let observed = false;
    for (let attempt = 0; attempt < 24; attempt++) {
      const task = await auth.request<{ responseCount?: number; lastAttempt?: { responseStatus?: { code?: number } } }>({ url: taskUrl });
      // Cloud Tasks excludes some system errors (including UNAVAILABLE) from
      // responseCount; lastAttempt still records the actual 503 response.
      if (task.data.lastAttempt?.responseStatus?.code !== undefined) { evidence.controlledFirstResponse = task.data.lastAttempt.responseStatus.code; observed = true; break; }
      await sleep(5_000);
    }
    await failProcessingJob(client, { jobId: job.id, workerId: holder, errorCode: "b37_controlled_lease_failure", safeErrorMessage: "Validation retry requested.", retryable: true, automaticRetryable: true });
    if (!observed) throw new Error("acceptance_first_retry_not_observed");
  }
  const states: string[] = [];
  for (let attempt = 0; attempt < 240; attempt++) {
    job = await readProcessingJobState(client, job.id);
    if (states.at(-1) !== job.status) { states.push(job.status); console.info("b37.status", { label, jobId: job.id, status: job.status, stage: job.stage }); }
    if (["succeeded", "failed", "cancelled", "expired"].includes(job.status)) break;
    await sleep(5_000);
  }
  const view = toProcessingJobStatusView(job);
  const results = await client.from("processing_job_results").select("id").eq("job_id", job.id).eq("user_id", owner);
  const source = await client.from("processing_job_sources").select("id,user_id,source_kind,source_text,page_count,metadata").eq("id", job.source_snapshot_id).eq("user_id", owner).single();
  const checkpoints = await client.from("processing_job_checkpoints").select("checkpoint_key,payload").eq("job_id", job.id);
  if (results.error || source.error || checkpoints.error) throw new Error("acceptance_evidence_read_failed");
  Object.assign(evidence, { status: job.status, states, durationMs: Date.now() - started, attemptCount: job.attempt_count,
    errorCode: job.error_code, resultCount: results.data.length, statusView: view,
    source: { ownerLinked: source.data.user_id === owner, kind: source.data.source_kind, pageCount: source.data.page_count, characterCount: source.data.source_text?.length ?? 0 },
    checkpoints: checkpoints.data.map(row => ({ key: row.checkpoint_key,
      ...(row.checkpoint_key.startsWith("ai-first:calls:") ? { budget: row.payload } : {}),
    })), metrics: job.metrics });
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  if (job.status === "succeeded") {
    const service = new ExperienceService({ repository: experienceRepository(client), materials: (userId, courseId, offset) => listCanvasReviewerSources({ client, userId, courseId, offset }) });
    const library = await service.getLibrary(owner, { limit: 100 });
    const generation = await service.getGeneration(owner, job.id);
    const artifactId = generation.artifactId;
    if (!artifactId) throw new Error("acceptance_artifact_missing");
    const reopened = await service.getLibraryArtifact(owner, artifactId);
    Object.assign(evidence, { artifactId, reopenType: reopened.artifact.type, libraryVisible: library.items.some(item => item.id === artifactId), generationState: generation.state });
  }
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.info("b37.result", { label, jobId: job.id, status: job.status, durationMs: evidence.durationMs, artifactId: evidence.artifactId ?? null });
  if (job.status !== (label.startsWith("cancel") ? "cancelled" : label === "failure" ? "failed" : "succeeded")) process.exitCode = 1;
}
main().catch(error => { console.error("b37.acceptance_failed", { code: error instanceof Error && /^[a-z0-9_]+$/i.test(error.message) ? error.message : "acceptance_unavailable" }); process.exitCode = 1; });
