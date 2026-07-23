import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.hoisted(() => new Map<string, string>());

vi.mock("../auth/sessionStore", () => ({
  sessionStore: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => values.set(key, value)),
  },
}));

import {
  cancelOfflineProcessingIntent,
  enqueueOfflineProcessingIntent,
  flushOfflineProcessingIntents,
  readOfflineProcessingIntents,
} from "./processingOutboxStore";

describe("offline processing outbox", () => {
  beforeEach(() => values.clear());

  it("keeps an offline intent local and never labels it as a server job", async () => {
    const intent = await enqueueOfflineProcessingIntent(baseIntent());
    expect(intent.status).toBe("waiting_for_connection");
    expect(intent).not.toHaveProperty("serverJobId");
  });

  it("submits once after reconnect and preserves the idempotency key", async () => {
    await enqueueOfflineProcessingIntent(baseIntent());
    const submit = vi.fn(async (intent) => {
      expect(intent.idempotencyKey).toBe("reviewer:offline:1");
      return { status: "accepted" as const, serverJobId: "job-1" };
    });
    const flushed = await flushOfflineProcessingIntents({
      ownerUserId: "user-a",
      sourceExists: async () => true,
      submit,
    });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(flushed.acceptedServerJobIds).toEqual(["job-1"]);
    expect(flushed.remaining).toEqual([]);
  });

  it("keeps an ambiguous network failure for an idempotent retry", async () => {
    await enqueueOfflineProcessingIntent(baseIntent());
    const result = await flushOfflineProcessingIntents({
      ownerUserId: "user-a",
      sourceExists: async () => true,
      submit: async () => ({
        status: "retryable",
        errorCode: "ambiguous_creation_response",
      }),
    });
    expect(result.remaining).toMatchObject([
      {
        idempotencyKey: "reviewer:offline:1",
        status: "waiting_for_connection",
        attemptCount: 1,
      },
    ]);
  });

  it("blocks a deleted local source without submitting", async () => {
    await enqueueOfflineProcessingIntent(baseIntent());
    const submit = vi.fn();
    const result = await flushOfflineProcessingIntents({
      ownerUserId: "user-a",
      sourceExists: async () => false,
      submit,
    });
    expect(submit).not.toHaveBeenCalled();
    expect(result.remaining).toMatchObject([
      { status: "blocked", lastErrorCode: "local_source_missing" },
    ]);
  });

  it("lets the user cancel a local pending request", async () => {
    const intent = await enqueueOfflineProcessingIntent(baseIntent());
    await cancelOfflineProcessingIntent("user-a", intent.localRequestId);
    await expect(readOfflineProcessingIntents("user-a")).resolves.toEqual([]);
  });
});

function baseIntent() {
  return {
    ownerUserId: "user-a",
    operation: "artifact_generation" as const,
    sourceLocalReference: "draft:neutral-source",
    artifactType: "reviewer" as const,
    idempotencyKey: "reviewer:offline:1",
    localRequestId: "local-1",
    createdAt: "2026-07-23T00:00:00.000Z",
  };
}
