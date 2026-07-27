import type { ProcessingJobDatabaseRow } from "@stay-focused/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
}));

vi.mock("./repository", () => ({
  createProcessingJobRecord: repositoryMocks.create,
  findProcessingJobByIdempotencyKey: repositoryMocks.find,
  ProcessingJobRepositoryError: class ProcessingJobRepositoryError extends Error {
    public constructor(public readonly code: string) {
      super(code);
    }
  },
}));

import {
  createExtractionProcessingJob,
  createReviewerProcessingJob,
  ProcessingJobCreationError,
  validateIdempotencyKey,
} from "./creation";

describe("durable processing job creation", () => {
  beforeEach(() => {
    repositoryMocks.create.mockReset();
    repositoryMocks.find.mockReset();
  });

  it("does not report acceptance until durable persistence resolves", async () => {
    let persist: ((job: ProcessingJobDatabaseRow) => void) | undefined;
    repositoryMocks.find.mockResolvedValue(null);
    repositoryMocks.create.mockImplementation(
      () => new Promise<ProcessingJobDatabaseRow>((resolve) => { persist = resolve; }),
    );

    let resolved = false;
    const pending = createReviewerProcessingJob({
      client: {} as never,
      idempotencyKey: "reviewer:acceptance:1",
      source: { sourceText: "Neutral source text about plant growth." },
      userId: "user-a",
    }).then((job) => {
      resolved = true;
      return job;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    const job = makeJob({ id: "job-accepted" });
    persist?.(job);
    await expect(pending).resolves.toBe(job);
  });

  it("returns the same persisted job for an identical idempotent replay", async () => {
    repositoryMocks.find.mockResolvedValueOnce(null);
    repositoryMocks.create.mockImplementation(async (_client, input) =>
      makeJob({
        id: "job-one",
        idempotency_key: input.idempotencyKey,
        request_fingerprint: input.requestFingerprint,
      }),
    );
    const input = {
      client: {} as never,
      idempotencyKey: "reviewer:duplicate:1",
      source: { sourceText: "A neutral passage about cell division." },
      userId: "user-a",
    } as const;
    const created = await createReviewerProcessingJob(input);
    repositoryMocks.find.mockResolvedValueOnce(created);

    await expect(createReviewerProcessingJob(input)).resolves.toBe(created);
    expect(repositoryMocks.create).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of an idempotency key for different work", async () => {
    repositoryMocks.find.mockResolvedValueOnce(null);
    repositoryMocks.create.mockImplementation(async (_client, input) =>
      makeJob({ request_fingerprint: input.requestFingerprint }),
    );
    const created = await createReviewerProcessingJob({
      client: {} as never,
      idempotencyKey: "reviewer:conflict:1",
      source: { sourceText: "First independent reading." },
      userId: "user-a",
    });
    repositoryMocks.find.mockResolvedValueOnce(created);

    await expect(
      createReviewerProcessingJob({
        client: {} as never,
        idempotencyKey: "reviewer:conflict:1",
        source: { sourceText: "A genuinely different reading." },
        userId: "user-a",
      }),
    ).rejects.toMatchObject({
      code: "processing_job_idempotency_conflict",
      retryable: false,
    });
  });

  it("does not deduplicate unrelated requests that use different keys", async () => {
    repositoryMocks.find.mockResolvedValue(null);
    repositoryMocks.create.mockImplementation(async (_client, input) =>
      makeJob({
        id: `job-${input.idempotencyKey}`,
        idempotency_key: input.idempotencyKey,
        request_fingerprint: input.requestFingerprint,
      }),
    );
    const source = { sourceText: "The same text may intentionally be studied twice." };
    const first = await createReviewerProcessingJob({
      client: {} as never,
      idempotencyKey: "reviewer:separate:1",
      source,
      userId: "user-a",
    });
    const second = await createReviewerProcessingJob({
      client: {} as never,
      idempotencyKey: "reviewer:separate:2",
      source,
      userId: "user-a",
    });

    expect(first.id).not.toBe(second.id);
    expect(repositoryMocks.create).toHaveBeenCalledTimes(2);
  });

  it("removes an unreferenced staged object after a different-payload race", async () => {
    const remove = vi.fn(async () => ({ data: [], error: null }));
    const upload = vi.fn(async () => ({ data: { path: "staged" }, error: null }));
    const assetQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    assetQuery.select.mockReturnValue(assetQuery);
    assetQuery.eq.mockReturnValue(assetQuery);
    assetQuery.is.mockReturnValue(assetQuery);
    assetQuery.limit.mockReturnValue(assetQuery);
    const client = {
      from: vi.fn(() => assetQuery),
      storage: { from: vi.fn(() => ({ remove, upload })) },
    } as never;
    repositoryMocks.find
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeJob({
          job_type: "document_extraction",
          request_fingerprint: "0".repeat(64),
          stage: "inspecting_document",
        }),
      );
    repositoryMocks.create.mockRejectedValueOnce(new Error("unique race"));

    await expect(
      createExtractionProcessingJob({
        client,
        idempotencyKey: "extraction:race:1",
        source: {
          bytes: new Uint8Array([1, 2, 3]),
          displayName: "neutral.pdf",
          mimeType: "application/pdf",
          sourceKind: "pdf",
        },
        userId: "user-a",
      }),
    ).rejects.toMatchObject({ code: "processing_job_idempotency_conflict" });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("queues orphan cleanup when an unreferenced staged object cannot be removed", async () => {
    const remove = vi.fn(async () => ({
      data: null,
      error: { message: "temporary storage failure" },
    }));
    const upload = vi.fn(async () => ({ data: { path: "staged" }, error: null }));
    const upsert = vi.fn(async () => ({ data: null, error: null }));
    const assetQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    assetQuery.select.mockReturnValue(assetQuery);
    assetQuery.eq.mockReturnValue(assetQuery);
    assetQuery.is.mockReturnValue(assetQuery);
    assetQuery.limit.mockReturnValue(assetQuery);
    const client = {
      from: vi.fn((table: string) =>
        table === "processing_cleanup_queue" ? { upsert } : assetQuery,
      ),
      storage: { from: vi.fn(() => ({ remove, upload })) },
    } as never;
    repositoryMocks.find.mockResolvedValue(null);
    repositoryMocks.create.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      createExtractionProcessingJob({
        client,
        idempotencyKey: "extraction:orphan:1",
        source: {
          bytes: new Uint8Array([3, 2, 1]),
          displayName: "neutral.pdf",
          mimeType: "application/pdf",
          sourceKind: "pdf",
        },
        userId: "user-a",
      }),
    ).rejects.toMatchObject({ code: "processing_job_persistence_failed" });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_user_id: "user-a",
        reason: "orphaned_staging",
        status: "pending",
        storage_bucket: "processing-job-sources",
      }),
      {
        ignoreDuplicates: true,
        onConflict: "storage_bucket,storage_object_path,reason",
      },
    );
  });

  it("validates the bounded safe idempotency-key format", () => {
    expect(validateIdempotencyKey("mobile:key_123")).toBe("mobile:key_123");
    expect(() => validateIdempotencyKey("short")).toThrow(ProcessingJobCreationError);
    expect(() => validateIdempotencyKey("not allowed spaces")).toThrow(
      ProcessingJobCreationError,
    );
  });
});

function makeJob(
  overrides: Partial<ProcessingJobDatabaseRow> = {},
): ProcessingJobDatabaseRow {
  const now = "2026-07-23T00:00:00.000Z";
  return {
    accepted_at: now,
    attempt_count: 0,
    cancellation_requested_at: null,
    completed_at: null,
    completed_units: null,
    created_at: now,
    error_code: null,
    expires_at: "2026-07-24T00:00:00.000Z",
    failed_at: null,
    heartbeat_at: null,
    execution_backend: "database_worker",
    workflow_run_id: null,
    workflow_dispatched_at: null,
    source_version_id: null,
    artifact_type: "reviewer",
    generation_policy_version: "reviewer-policy-v1",
    engine_version: "engine-stage0-6-v1",
    schema_version: "reviewer-output-v1",
    provider_id: "openai:gpt-4o",
    settings_fingerprint: "a".repeat(64),
    language: "auto",
    output_mode: "standard",
    reuse_mode: "fresh",
    reuse_of_job_id: null,
    reuse_candidate_artifact_version_id: null,
    scheduled_for: now,
    priority_class: 100,
    id: "job-default",
    idempotency_expires_at: "2026-08-22T00:00:00.000Z",
    idempotency_key: "reviewer:default:1",
    job_type: "reviewer_generation",
    lease_expires_at: null,
    lease_owner: null,
    max_attempts: 3,
    metrics: {},
    next_attempt_at: now,
    request_fingerprint: "fingerprint",
    result_id: null,
    retry_of_job_id: null,
    retryable: false,
    safe_error_message: null,
    source_metadata: {
      displayName: "Neutral source",
      mimeType: "text/plain",
      sourceKind: "text",
    },
    source_snapshot_id: "source-1",
    stage: "preparing_source",
    started_at: null,
    status: "queued",
    status_message: "Waiting to start",
    total_units: null,
    unit_label: null,
    updated_at: now,
    user_id: "user-a",
    ...overrides,
  };
}
