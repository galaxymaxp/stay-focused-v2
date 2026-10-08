import type { GenerationView, LibraryArtifactDetail, LibraryOverview } from "@stay-focused/shared";
import { describe, expect, it, vi } from "vitest";

import { createLocalArtifactStore } from "./artifactStore";
import {
  persistCompletedGeneration,
  persistedArtifactId,
  reconcileLibrary,
  refreshArtifactDetail,
  type LibraryRemote,
} from "./librarySync";
import { OWNER_A, draftDetail, openNodeSqlite, quizDetail, reviewerDetail } from "./localLibrary.testSupport";
import { migrateLocalLibrary } from "./schema";

const categories: LibraryOverview["categories"] = {
  reviewer: { status: "available" },
  quiz: { status: "available" },
  activity_output: { status: "available" },
};

class RemoteError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function setup() {
  const { db } = openNodeSqlite();
  await migrateLocalLibrary(db);
  return createLocalArtifactStore(db);
}

function remoteWith(details: readonly LibraryArtifactDetail[], pageSize = 100): LibraryRemote & {
  fetchPage: ReturnType<typeof vi.fn>;
  fetchDetail: ReturnType<typeof vi.fn>;
} {
  const items = details.map((detail) => detail.artifact);
  return {
    fetchPage: vi.fn(async (offset: number) => ({
      items: items.slice(offset, offset + pageSize),
      categories,
      nextOffset: offset + pageSize < items.length ? offset + pageSize : null,
    })),
    fetchDetail: vi.fn(async (id: string) => {
      const found = details.find((detail) => detail.artifact.id === id);
      if (!found) throw new RemoteError("not_found");
      return found;
    }),
  };
}

function generation(state: GenerationView["state"], artifactId: string | null): GenerationView {
  return { id: "job-1", state, updatedAt: "2026-09-20T09:00:00.000Z", progress: null, artifactId, error: null };
}

describe("cloud reconciliation", () => {
  it("inserts remote artifacts, hydrates their bodies, and makes them readable offline", async () => {
    const store = await setup();
    const remote = remoteWith([reviewerDetail(), quizDetail(), draftDetail()]);
    const result = await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    expect(result).toEqual({ categories, listComplete: true, hydrated: 3, supersededReviewerIds: [] });

    const offline = remoteWith([]);
    offline.fetchDetail.mockRejectedValue(new RemoteError("connection"));
    for (const detail of [reviewerDetail(), quizDetail(), draftDetail()]) {
      await expect(store.readDetail(OWNER_A, detail.artifact.id)).resolves.toMatchObject({ detail });
    }
    expect(offline.fetchDetail).not.toHaveBeenCalled();
  });

  it("walks every page and is idempotent on repeat", async () => {
    const store = await setup();
    const remote = remoteWith([reviewerDetail(), quizDetail(), draftDetail()], 2);
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    expect(remote.fetchPage).toHaveBeenCalledTimes(2);
    const again = await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    expect(again.hydrated).toBe(0);
    await expect(store.listSummaries(OWNER_A)).resolves.toHaveLength(3);
  });

  it("notifies the Library once the list is local, before bodies are fetched", async () => {
    const store = await setup();
    const remote = remoteWith([reviewerDetail()]);
    const seen: number[] = [];
    await reconcileLibrary({
      store,
      ownerUserId: OWNER_A,
      remote,
      onListReconciled: async () => {
        seen.push((await store.listSummaries(OWNER_A)).length);
        expect(remote.fetchDetail).not.toHaveBeenCalled();
      },
    });
    expect(seen).toEqual([1]);
  });

  it("keeps every local artifact when the cloud refresh fails", async () => {
    const store = await setup();
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote: remoteWith([reviewerDetail(), quizDetail()]) });
    const failing = remoteWith([]);
    failing.fetchPage.mockRejectedValue(new RemoteError("connection"));
    await expect(reconcileLibrary({ store, ownerUserId: OWNER_A, remote: failing })).rejects.toThrow("connection");
    await expect(store.listSummaries(OWNER_A)).resolves.toHaveLength(2);
    await expect(store.readDetail(OWNER_A, reviewerDetail().artifact.id)).resolves.not.toBeNull();
  });

  it("retains an artifact that is merely absent from the remote list", async () => {
    const store = await setup();
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote: remoteWith([reviewerDetail(), quizDetail()]) });
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote: remoteWith([quizDetail()]) });
    await expect(store.listSummaries(OWNER_A)).resolves.toHaveLength(2);
  });

  it("removes a local copy only on an explicit owner-scoped not_found for that artifact", async () => {
    const store = await setup();
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote: remoteWith([reviewerDetail()]) });
    const deleted = remoteWith([]);
    await expect(
      refreshArtifactDetail({ store, ownerUserId: OWNER_A, remote: deleted, artifactId: reviewerDetail().artifact.id }),
    ).rejects.toThrow("not_found");
    await expect(store.listSummaries(OWNER_A)).resolves.toEqual([]);
  });

  it("keeps the local copy when opening an artifact fails for any other reason", async () => {
    const store = await setup();
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote: remoteWith([reviewerDetail()]) });
    for (const code of ["connection", "unavailable", "sign_in_required", "rate_limited"]) {
      const failing = remoteWith([]);
      failing.fetchDetail.mockRejectedValue(new RemoteError(code));
      await expect(
        refreshArtifactDetail({ store, ownerUserId: OWNER_A, remote: failing, artifactId: reviewerDetail().artifact.id }),
      ).rejects.toThrow(code);
    }
    await expect(store.listSummaries(OWNER_A)).resolves.toHaveLength(1);
  });

  it("stops hydrating quietly when offline and resumes on the next refresh", async () => {
    const store = await setup();
    const remote = remoteWith([reviewerDetail(), quizDetail()]);
    remote.fetchDetail.mockRejectedValueOnce(new RemoteError("connection"));
    const first = await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    expect(first.hydrated).toBe(0);
    expect(remote.fetchDetail).toHaveBeenCalledTimes(1);
    const second = await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    expect(second.hydrated).toBe(2);
  });

  it("applies duplicate remote responses once", async () => {
    const store = await setup();
    const remote = remoteWith([quizDetail()]);
    remote.fetchPage.mockResolvedValue({ items: [quizDetail().artifact, quizDetail().artifact], categories, nextOffset: null });
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    await expect(store.listSummaries(OWNER_A)).resolves.toHaveLength(1);
  });
});

describe("Queue → Library completion", () => {
  it.each(["queued", "preparing", "generating", "finalizing", "failed", "cancelling", "cancelled"] as const)(
    "does not store a %s generation",
    async (state) => {
      const store = await setup();
      const remote = remoteWith([reviewerDetail()]);
      expect(persistedArtifactId(generation(state, reviewerDetail().artifact.id))).toBeNull();
      await expect(
        persistCompletedGeneration({ store, ownerUserId: OWNER_A, remote, generation: generation(state, reviewerDetail().artifact.id) }),
      ).resolves.toBeNull();
      expect(remote.fetchDetail).not.toHaveBeenCalled();
      await expect(store.listSummaries(OWNER_A)).resolves.toEqual([]);
    },
  );

  it("does not store a completed generation the server has not linked to a persisted artifact", async () => {
    const store = await setup();
    const remote = remoteWith([reviewerDetail()]);
    await expect(
      persistCompletedGeneration({ store, ownerUserId: OWNER_A, remote, generation: generation("completed", null) }),
    ).resolves.toBeNull();
    await expect(store.listSummaries(OWNER_A)).resolves.toEqual([]);
  });

  it.each([
    ["Reviewer", reviewerDetail()],
    ["Quiz", quizDetail()],
    ["Activity output", draftDetail()],
  ])("stores the authoritative cloud copy of a completed %s once", async (_label, detail) => {
    const store = await setup();
    const remote = remoteWith([detail]);
    const view = generation("completed", detail.artifact.id);
    await expect(persistCompletedGeneration({ store, ownerUserId: OWNER_A, remote, generation: view })).resolves.toBe("inserted");
    await expect(persistCompletedGeneration({ store, ownerUserId: OWNER_A, remote, generation: view })).resolves.toBe("unchanged");
    await expect(store.readDetail(OWNER_A, detail.artifact.id)).resolves.toMatchObject({ detail });
  });

  it("stores nothing when the completed artifact cannot be fetched", async () => {
    const store = await setup();
    const remote = remoteWith([]);
    remote.fetchDetail.mockRejectedValue(new RemoteError("connection"));
    await expect(
      persistCompletedGeneration({ store, ownerUserId: OWNER_A, remote, generation: generation("completed", "reviewer:x") }),
    ).rejects.toThrow("connection");
    await expect(store.listSummaries(OWNER_A)).resolves.toEqual([]);
  });
});
