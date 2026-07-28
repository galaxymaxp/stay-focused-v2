import { describe, expect, it, vi } from "vitest";

import type { CanvasSyncJobDatabaseRow, Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import { dispatchAcceptedCanvasSyncJob } from "./workflow-dispatch";

describe("Canvas workflow dispatch", () => {
  it("starts only after durable preparation and records the workflow run", async () => {
    const calls: string[] = [];
    const client = fakeClient(async (name) => {
      calls.push(name);
      if (name === "prepare_canvas_sync_job_workflow_dispatch_v1") {
        return [job()];
      }
      if (name === "attach_canvas_sync_job_workflow_v1") {
        return [{ ...job(), workflow_run_id: "run-1" }];
      }
      return [];
    });
    const startWorkflow = vi.fn(async () => {
      calls.push("start");
      return { runId: "run-1" };
    });

    const accepted = await dispatchAcceptedCanvasSyncJob(job(), {
      client,
      startWorkflow,
    });

    expect(accepted.workflow_run_id).toBe("run-1");
    expect(calls).toEqual([
      "prepare_canvas_sync_job_workflow_dispatch_v1",
      "start",
      "attach_canvas_sync_job_workflow_v1",
    ]);
  });

  it("does not start a second workflow for an already attached job", async () => {
    const startWorkflow = vi.fn();
    const attached = { ...job(), workflow_run_id: "run-existing" };

    const result = await dispatchAcceptedCanvasSyncJob(attached, {
      client: fakeClient(async () => []),
      startWorkflow,
    });

    expect(result).toBe(attached);
    expect(startWorkflow).not.toHaveBeenCalled();
  });
});

function job(): CanvasSyncJobDatabaseRow {
  return {
    accepted_at: "2026-07-28T00:00:00.000Z",
    attempt_count: 0,
    cancellation_requested_at: null,
    canvas_connection_id: "11111111-1111-4111-8111-111111111111",
    checkpoint_version: null,
    completed_at: null,
    completed_units: 0,
    course_id: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-07-28T00:00:00.000Z",
    deadline_at: null,
    error_code: null,
    failed_at: null,
    id: "33333333-3333-4333-8333-333333333333",
    idempotency_expires_at: "2026-08-04T00:00:00.000Z",
    idempotency_key: "canvas-key-1",
    job_type: "course_content",
    max_attempts: 3,
    request_fingerprint: "a".repeat(64),
    progress_total_known: true,
    retry_idempotency_key: null,
    retry_of_job_id: null,
    result_summary: null,
    result_outcome: null,
    retryable: false,
    safe_error_message: null,
    source_metadata: {},
    stage: "waiting_to_start",
    started_at: null,
    status: "queued",
    status_message: "Waiting to start",
    total_units: 1,
    unit_label: "operations",
    updated_at: "2026-07-28T00:00:00.000Z",
    user_id: "44444444-4444-4444-8444-444444444444",
    worker_id: null,
    workflow_dispatched_at: null,
    workflow_run_id: null,
  };
}

function fakeClient(
  response: (name: string) => Promise<readonly CanvasSyncJobDatabaseRow[]>,
): SupabaseClient<Database> {
  return {
    rpc: async (name: string) => ({
      data: await response(name),
      error: null,
    }),
  } as unknown as SupabaseClient<Database>;
}
