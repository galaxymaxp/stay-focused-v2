import type {
  CanvasCourseSyncScopeStateRow,
  CanvasSyncJobDatabaseRow,
} from "@stay-focused/db";
import { describe, expect, it } from "vitest";

import { createCanvasCourseSyncHealthView } from "@/lib/canvas-sync-health";
import {
  CANVAS_SYNC_CHECKPOINT_VERSION,
  CANVAS_SYNC_GRADE_CONCURRENCY,
  CANVAS_SYNC_JOB_DEADLINE_MS,
  CANVAS_SYNC_UNIT_LEASE_SECONDS,
  createCanvasSyncUnit,
  createInitialCanvasSyncUnits,
} from "./checkpoints";
import { toCanvasSyncJobStatusView } from "./contracts";

describe("Canvas incremental sync checkpoints", () => {
  it("creates deterministic, subject-neutral content and grade plans", () => {
    const content = createInitialCanvasSyncUnits(job("course_content"));
    const repeated = createInitialCanvasSyncUnits(job("course_content"));
    const grades = createInitialCanvasSyncUnits(job("course_grades"));

    expect(content.map((unit) => unit.unitKind)).toEqual([
      "modules_page",
      "pages_page",
      "assignment_groups_page",
      "assignments_page",
      "announcements_page",
      "files_page",
    ]);
    expect(repeated).toEqual(content);
    expect(grades.map((unit) => unit.unitKind)).toEqual([
      "grade_assignments_page",
      "submissions_page",
      "grade_summary_page",
    ]);
    expect(JSON.stringify([...content, ...grades])).not.toMatch(
      /security|malware|networking/i,
    );
  });

  it("includes checkpoint identity and bounds leases, concurrency, and deadline", () => {
    const first = createCanvasSyncUnit(
      "modules_page",
      "content",
      1,
      true,
      { cursor: "opaque-page-2" },
    );
    const same = createCanvasSyncUnit(
      "modules_page",
      "content",
      1,
      true,
      { cursor: "opaque-page-2" },
    );
    const changed = createCanvasSyncUnit(
      "modules_page",
      "content",
      2,
      true,
      { cursor: "opaque-page-2" },
    );

    expect(first.unitKey).toBe(same.unitKey);
    expect(first.unitKey).not.toBe(changed.unitKey);
    expect(first.unitKey).toMatch(/^[a-f0-9]{64}$/);
    expect(CANVAS_SYNC_CHECKPOINT_VERSION).toBe("canvas-sync-v2");
    expect(CANVAS_SYNC_UNIT_LEASE_SECONDS).toBe(90);
    expect(CANVAS_SYNC_GRADE_CONCURRENCY).toBe(2);
    expect(CANVAS_SYNC_JOB_DEADLINE_MS).toBe(30 * 60_000);
  });

  it("exposes nullable expanding totals and typed partial outcomes", () => {
    const view = toCanvasSyncJobStatusView({
      ...job("course_content"),
      completed_units: 4,
      progress_total_known: false,
      result_outcome: "partial",
      status: "succeeded",
      total_units: null,
    });

    expect(view).toMatchObject({
      outcome: "partial",
      progress: {
        completedUnits: 4,
        isTotalKnown: false,
        totalUnits: null,
      },
    });
  });
});

describe("Canvas course sync health", () => {
  it("reports independent healthy and stale scopes with safe counts", () => {
    const view = createCanvasCourseSyncHealthView(
      "course-1",
      [
        scopeState("content", "healthy", { synced_count: 8 }),
        scopeState("announcements", "partial", {
          stale_count: 2,
          temporarily_failed_count: 1,
        }),
        scopeState("files", "stale", { stale_count: 3 }),
      ],
      null,
    );

    expect(view).toMatchObject({
      attentionScopeCount: 1,
      overallHealth: "needs_attention",
      staleScopeCount: 1,
      scopes: {
        announcements: {
          counts: { stale: 2, temporarilyFailed: 1 },
          health: "needs_attention",
        },
        content: { counts: { synced: 8 }, health: "healthy" },
        files: { health: "stale" },
        grades: { health: "not_synced" },
      },
    });
  });

  it("lets an active durable job override stale aggregate health", () => {
    const active = job("course_content");
    const view = createCanvasCourseSyncHealthView(
      active.course_id,
      [scopeState("content", "stale")],
      { ...active, status: "running" },
    );
    expect(view.overallHealth).toBe("syncing");
    expect(view.activeJob).toMatchObject({
      id: active.id,
      jobType: "course_content",
      status: "running",
    });
  });
});

function job(
  jobType: CanvasSyncJobDatabaseRow["job_type"],
): CanvasSyncJobDatabaseRow {
  return {
    accepted_at: "2026-07-28T00:00:00.000Z",
    attempt_count: 1,
    cancellation_requested_at: null,
    canvas_connection_id: "11111111-1111-4111-8111-111111111111",
    checkpoint_version: CANVAS_SYNC_CHECKPOINT_VERSION,
    completed_at: null,
    completed_units: 0,
    course_id: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-07-28T00:00:00.000Z",
    deadline_at: "2026-07-28T00:30:00.000Z",
    error_code: null,
    failed_at: null,
    id: "33333333-3333-4333-8333-333333333333",
    idempotency_expires_at: "2026-08-27T00:00:00.000Z",
    idempotency_key: "neutral-job-key",
    job_type: jobType,
    max_attempts: 3,
    progress_total_known: false,
    request_fingerprint: "a".repeat(64),
    result_outcome: null,
    result_summary: null,
    retry_idempotency_key: null,
    retry_of_job_id: null,
    retryable: false,
    safe_error_message: null,
    source_metadata: {
      courseCode: "BIO-101",
      displayName: "Biology",
    },
    stage: "planning_sync",
    started_at: "2026-07-28T00:00:01.000Z",
    status: "running",
    status_message: "Planning Canvas synchronization",
    total_units: null,
    unit_label: "operations",
    updated_at: "2026-07-28T00:00:01.000Z",
    user_id: "44444444-4444-4444-8444-444444444444",
    worker_id: "vercel-workflow:run-1",
    workflow_dispatched_at: "2026-07-28T00:00:00.500Z",
    workflow_run_id: "run-1",
  };
}

function scopeState(
  scope: CanvasCourseSyncScopeStateRow["scope"],
  healthStatus: CanvasCourseSyncScopeStateRow["health_status"],
  overrides: Partial<CanvasCourseSyncScopeStateRow> = {},
): CanvasCourseSyncScopeStateRow {
  return {
    canvas_connection_id: "11111111-1111-4111-8111-111111111111",
    course_id: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-07-28T00:00:00.000Z",
    deleted_count: 0,
    health_status: healthStatus,
    id: `${scope}-health`,
    last_checked_at: "2026-07-28T00:01:00.000Z",
    last_job_id: "33333333-3333-4333-8333-333333333333",
    last_successful_at:
      healthStatus === "healthy" ? "2026-07-28T00:01:00.000Z" : null,
    metadata_only_count: 0,
    retryable: healthStatus !== "healthy",
    safe_error_code: healthStatus === "healthy" ? null : "canvas_unavailable",
    safe_message:
      healthStatus === "healthy" ? null : "Some Canvas data stayed unchanged.",
    scope,
    stale_count: 0,
    synced_count: 0,
    temporarily_failed_count: 0,
    updated_at: "2026-07-28T00:01:00.000Z",
    user_id: "44444444-4444-4444-8444-444444444444",
    ...overrides,
  };
}
