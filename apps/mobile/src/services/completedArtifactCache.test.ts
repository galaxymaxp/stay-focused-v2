import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.hoisted(() => new Map<string, string>());

vi.mock("../auth/sessionStore", () => ({
  sessionStore: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => values.set(key, value)),
  },
}));

import {
  cacheCompletedArtifact,
  listCachedArtifactMetadata,
  markCachedArtifactServerState,
  readCachedArtifact,
} from "./completedArtifactCache";

describe("completed artifact cache", () => {
  beforeEach(() => values.clear());

  it("opens a cached reviewer without network access", async () => {
    await cacheCompletedArtifact(entry());
    await expect(
      readCachedArtifact("user-a", "artifact-version-1"),
    ).resolves.toMatchObject({
      title: "Neutral reviewer",
      payload: { reviewer: { title: "Neutral reviewer" } },
    });
  });

  it("isolates cached payloads by account", async () => {
    await cacheCompletedArtifact(entry());
    await expect(
      readCachedArtifact("user-b", "artifact-version-1"),
    ).resolves.toBeNull();
  });

  it("labels a cached artifact stale when the server has a newer version", async () => {
    await cacheCompletedArtifact(entry());
    await markCachedArtifactServerState({
      ownerUserId: "user-a",
      artifactVersionId: "artifact-version-1",
      latestServerVersionId: "artifact-version-2",
    });
    await expect(listCachedArtifactMetadata("user-a")).resolves.toMatchObject([
      { isStale: true, latestServerVersionId: "artifact-version-2" },
    ]);
  });

  it("evicts large payloads while preserving essential metadata", async () => {
    await cacheCompletedArtifact({
      ...entry(),
      payload: { reviewer: { body: "x".repeat(100_000) } },
    });
    await expect(listCachedArtifactMetadata("user-a")).resolves.toMatchObject([
      { artifactVersionId: "artifact-version-1", payloadAvailable: false },
    ]);
  });

  it("does not silently overwrite an entry carrying an unsynced edit", async () => {
    await cacheCompletedArtifact({
      ...entry(),
      payload: { reviewer: { title: "Local draft" } },
      unsyncedSourceEdit: true,
    });
    await cacheCompletedArtifact({
      ...entry(),
      payload: { reviewer: { title: "Server copy" } },
    });
    await expect(
      readCachedArtifact("user-a", "artifact-version-1"),
    ).resolves.toMatchObject({
      payload: { reviewer: { title: "Local draft" } },
      unsyncedSourceEdit: true,
    });
  });
});

function entry() {
  return {
    artifactVersionId: "artifact-version-1",
    processingJobId: "job-1",
    ownerUserId: "user-a",
    artifactType: "reviewer" as const,
    sourceVersionId: "source-version-1",
    sourceContentSha256: "a".repeat(64),
    title: "Neutral reviewer",
    createdAt: "2026-07-23T00:00:00.000Z",
    payload: { reviewer: { title: "Neutral reviewer" } },
  };
}
