export const PROCESSING_JOB_SOURCE_BUCKET = "processing-job-sources";

// A worker renews a 90-second lease every 25 seconds. This leaves multiple
// heartbeat opportunities before another worker may recover the job.
export const JOB_WORKER_LEASE_SECONDS = 90;
export const JOB_WORKER_HEARTBEAT_INTERVAL_MS = 25_000;

// Concurrency is deliberately bounded because OCR and reviewer jobs can each
// make multiple provider calls and retain sizeable source/result objects.
export const JOB_WORKER_DEFAULT_CONCURRENCY = 2;
export const JOB_WORKER_MAX_CONCURRENCY = 4;
export const JOB_WORKER_IDLE_POLL_INTERVAL_MS = 2_000;

// Provider calls receive their own deadlines; the overall job deadline remains
// longer so retry and persistence work can finish safely.
export const OCR_PROVIDER_CALL_TIMEOUT_MS = 45_000;
export const REVIEWER_PROVIDER_CALL_TIMEOUT_MS = 120_000;
export const EXTRACTION_JOB_DEADLINE_MS = 30 * 60_000;
export const REVIEWER_JOB_DEADLINE_MS = 45 * 60_000;
