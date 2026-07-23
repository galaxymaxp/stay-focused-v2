import { beforeEach, describe, expect, it, vi } from "vitest";

import { flushOfflineProcessingIntents } from "./processingOutboxStore";
import { reconcileReviewerProcessingOutbox } from "./processingOutboxReconciliation";

vi.mock("./processingOutboxStore", () => ({
  flushOfflineProcessingIntents: vi.fn(),
}));
vi.mock("./processingDraftStore", () => ({
  readProcessingDraft: vi.fn(),
  removeProcessingDraft: vi.fn(),
}));
vi.mock("./processingJobsApi", () => ({
  createReviewerJob: vi.fn(),
}));
vi.mock("./activeProcessingJobStore", () => ({
  upsertActiveProcessingJob: vi.fn(),
}));

describe("processing outbox reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shares one in-flight flush per account across foreground consumers", async () => {
    let resolveFlush:
      | ((value: {
          acceptedServerJobIds: readonly string[];
          remaining: readonly [];
        }) => void)
      | undefined;
    vi.mocked(flushOfflineProcessingIntents).mockReturnValue(
      new Promise((resolve) => {
        resolveFlush = resolve;
      }),
    );
    const input = {
      accessToken: "token-a",
      apiBaseUrl: "https://api.example.test",
      ownerUserId: "user-a",
    };

    const first = reconcileReviewerProcessingOutbox(input);
    const second = reconcileReviewerProcessingOutbox(input);

    expect(second).toBe(first);
    expect(flushOfflineProcessingIntents).toHaveBeenCalledTimes(1);
    resolveFlush?.({ acceptedServerJobIds: [], remaining: [] });
    await first;
  });
});
