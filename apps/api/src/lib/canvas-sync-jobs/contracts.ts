import type {
  CanvasSyncJobDatabaseRow,
  CanvasSyncJobStage,
  CanvasSyncJobStatus,
  CanvasSyncJobType,
  Json,
} from "@stay-focused/db";

export interface CanvasSyncJobStatusView {
  readonly id: string;
  readonly jobType: CanvasSyncJobType;
  readonly status: CanvasSyncJobStatus;
  readonly stage: CanvasSyncJobStage;
  readonly progress: {
    readonly completedUnits: number | null;
    readonly totalUnits: number | null;
    readonly unitLabel: "operations" | null;
    readonly message: string;
  };
  readonly course: {
    readonly id: string;
    readonly displayName: string;
    readonly courseCode: string | null;
  };
  readonly createdAt: string;
  readonly acceptedAt: string;
  readonly startedAt: string | null;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly failedAt: string | null;
  readonly cancellationRequestedAt: string | null;
  readonly errorCode: string | null;
  readonly safeErrorMessage: string | null;
  readonly retryable: boolean;
  readonly attemptCount: number;
  readonly resultAvailable: boolean;
  readonly resultSummary: Json | null;
}

export function toCanvasSyncJobStatusView(
  job: CanvasSyncJobDatabaseRow,
): CanvasSyncJobStatusView {
  const source = readRecord(job.source_metadata);
  return {
    id: job.id,
    jobType: job.job_type,
    status: job.status,
    stage: job.stage,
    progress: {
      completedUnits: job.completed_units,
      totalUnits: job.total_units,
      unitLabel: job.unit_label,
      message: job.status_message,
    },
    course: {
      id: job.course_id,
      displayName: readString(source?.displayName) ?? "Canvas course",
      courseCode: readString(source?.courseCode),
    },
    createdAt: job.created_at,
    acceptedAt: job.accepted_at,
    startedAt: job.started_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at,
    failedAt: job.failed_at,
    cancellationRequestedAt: job.cancellation_requested_at,
    errorCode: job.error_code,
    safeErrorMessage: job.safe_error_message,
    retryable: job.retryable,
    attemptCount: job.attempt_count,
    resultAvailable: job.status === "succeeded" && job.result_summary !== null,
    resultSummary: job.result_summary,
  };
}

function readRecord(value: Json): Record<string, Json | undefined> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, Json | undefined>
    : null;
}

function readString(value: Json | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
