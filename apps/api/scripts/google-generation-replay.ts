/** Duplicate delivery acceptance: terminal Google jobs only; never creates jobs. */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { OAuth2Client } from "google-auth-library";
import { createProcessingJobServiceClient } from "../src/lib/processing-jobs/repository";
import { readProcessingJobState } from "../src/lib/processing-jobs/worker-repository";
import { googleTaskConfig } from "../src/lib/processing-jobs/google-cloud";

async function main() {
  const jobId = process.env.B37_REPLAY_JOB_ID;
  const owner = process.env.B37_OWNER_ID;
  const evidence = process.env.B37_EVIDENCE_PATH;
  if (!jobId || !owner || !evidence) throw new Error("replay_configuration_missing");
  const client = createProcessingJobServiceClient();
  const job = await readProcessingJobState(client, jobId);
  if (job.user_id !== owner || job.execution_backend !== "google_cloud" || !job.google_dispatch_id ||
      !["succeeded", "cancelled", "failed"].includes(job.status)) throw new Error("replay_requires_owned_terminal_google_job");
  async function snapshot() {
    const state = await readProcessingJobState(client, job!.id);
    const results = await client.from("processing_job_results").select("id").eq("job_id", job!.id).eq("user_id", owner!);
    const checkpoints = await client.from("processing_job_checkpoints").select("checkpoint_key,updated_at").eq("job_id", job!.id).order("checkpoint_key");
    const versions = await client.from("generated_artifact_versions").select("id").eq("generation_job_id", job!.id).eq("user_id", owner!);
    if (results.error || checkpoints.error || versions.error) throw new Error("replay_snapshot_unavailable");
    return { status: state.status, attemptCount: state.attempt_count, sourceId: state.source_snapshot_id,
      resultIds: results.data.map(row => row.id), versionIds: versions.data.map(row => row.id), checkpoints: checkpoints.data };
  }
  const before = await snapshot();
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: execFileSync(process.platform === "win32" ? "gcloud.cmd" : "gcloud",
    ["auth", "print-access-token", "--quiet"], { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] }).trim() });
  const config = googleTaskConfig();
  const name = `${config.parent}/tasks/b37-replay-${job.id}-${randomUUID()}`;
  await auth.request({ method: "POST", url: `https://cloudtasks.googleapis.com/v2/${config.parent}/tasks`, data: { task: {
    name, dispatchDeadline: "1800s", httpRequest: { httpMethod: "POST", url: `${config.workerUrl}/tasks/generation`,
      headers: { "Content-Type": "application/json" }, body: Buffer.from(JSON.stringify({ jobId: job.id, dispatchId: job.google_dispatch_id })).toString("base64"),
      oidcToken: { serviceAccountEmail: config.serviceAccountEmail, audience: config.workerUrl },
    },
  } } });
  let acknowledged = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2_000));
    try { await auth.request({ url: `https://cloudtasks.googleapis.com/v2/${name}` }); }
    catch (error) {
      if (typeof error === "object" && error !== null && "response" in error && (error.response as { status?: number })?.status === 404) { acknowledged = true; break; }
      throw new Error("replay_observation_unavailable");
    }
  }
  const after = await snapshot();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  writeFileSync(evidence, JSON.stringify({ jobId, taskName: name.split("/").at(-1), acknowledged, unchanged, before, after }, null, 2));
  console.info("b37.replay", { jobId, acknowledged, unchanged });
  if (!acknowledged || !unchanged) process.exitCode = 1;
}
main().catch(() => { console.error("b37.replay_failed"); process.exitCode = 1; });
