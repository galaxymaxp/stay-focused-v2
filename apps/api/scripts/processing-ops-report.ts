import { loadEnvConfig } from "@next/env";

import { createProcessingJobServiceClient } from "../src/lib/processing-jobs/repository";

loadEnvConfig(process.cwd());

const SAMPLE_LIMIT = 1_000;
const RECENT_WINDOW_MS = 24 * 60 * 60_000;

async function main(): Promise<void> {
  const client = createProcessingJobServiceClient();
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();

  const [jobsResponse, workersResponse, cleanupResponse] = await Promise.all([
    client
      .from("processing_jobs")
      .select(
        "status,job_type,created_at,started_at,completed_at,attempt_count,error_code,metrics,source_metadata,reuse_of_job_id",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(SAMPLE_LIMIT),
    client
      .from("processing_worker_heartbeats")
      .select("status,capacity,active_job_count,last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(100),
    client
      .from("processing_cleanup_queue")
      .select("status,not_before,attempt_count")
      .neq("status", "completed")
      .order("not_before", { ascending: true })
      .limit(SAMPLE_LIMIT),
  ]);

  if (jobsResponse.error || workersResponse.error || cleanupResponse.error) {
    throw new Error("processing_ops_report_failed");
  }

  const jobs = jobsResponse.data;
  const durations = jobs
    .flatMap((job) =>
      job.started_at && job.completed_at
        ? [Date.parse(job.completed_at) - Date.parse(job.started_at)]
        : [],
    )
    .filter((duration) => duration >= 0)
    .sort((left, right) => left - right);
  const activeJobs = jobs.filter((job) =>
    ["queued", "running", "cancellation_requested"].includes(job.status),
  );
  const providerRateLimitFailures = jobs.filter(
    (job) => job.error_code === "provider_rate_limited",
  ).length;
  const providerCallCount = jobs.reduce(
    (total, job) => total + jsonNumber(job.metrics, "providerCallCount"),
    0,
  );
  const sourceByteCount = jobs.reduce(
    (total, job) =>
      total +
      jsonNumber(job.metrics, "sourceByteCount") +
      jsonNumber(job.source_metadata, "byteSize"),
    0,
  );

  console.info("processing_ops.report", {
    active: countBy(activeJobs, (job) => `${job.job_type}:${job.status}`),
    cleanupBacklog: countBy(
      cleanupResponse.data,
      (item) => item.status,
    ),
    durationMs: {
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
    },
    failures: countBy(
      jobs.filter((job) => job.status === "failed"),
      (job) => job.error_code ?? "unknown",
    ),
    oldestActiveAgeMs: activeJobs.length
      ? Date.now() -
        Math.min(...activeJobs.map((job) => Date.parse(job.created_at)))
      : 0,
    providerCallCount,
    providerRateLimitFailures,
    retryCount: jobs.reduce(
      (total, job) => total + Math.max(0, job.attempt_count - 1),
      0,
    ),
    reusedJobCount: jobs.filter((job) => job.reuse_of_job_id !== null).length,
    sampledRecentJobCount: jobs.length,
    sourceByteCount,
    workers: workersResponse.data.map((worker) => ({
      activeJobCount: worker.active_job_count,
      capacity: worker.capacity,
      lastSeenAgeMs: Date.now() - Date.parse(worker.last_seen_at),
      status: worker.status,
    })),
  });
}

function countBy<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function jsonNumber(
  value: string | number | boolean | object | readonly unknown[] | null,
  key: string,
): number {
  if (!value || Array.isArray(value) || typeof value !== "object") return 0;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : 0;
}

function percentile(values: readonly number[], fraction: number): number | null {
  if (values.length === 0) return null;
  return values[Math.min(values.length - 1, Math.floor(values.length * fraction))];
}

void main().catch((error: unknown) => {
  console.error("processing_ops.fatal", {
    errorCode:
      error instanceof Error && /^[a-z0-9_]+$/.test(error.message)
        ? error.message
        : "processing_ops_fatal",
  });
  process.exitCode = 1;
});
