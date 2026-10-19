import type { GenerationView, LibraryArtifactDetail, LibraryOverview } from "@stay-focused/shared";
import { describe, expect, it, vi } from "vitest";

import { createLocalArtifactStore } from "./artifactStore";
import {
  hydrateLibraryBodies,
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
  it('removes explicitly superseded reviewers while retaining mere list absences', async () => {
    const store = await setup();
    const detail = reviewerDetail();
    await store.upsertDetail(OWNER_A, detail.artifact.id, detail);
    const remote = remoteWith([]);
    remote.fetchPage.mockResolvedValue({ items: [], categories, nextOffset: null, supersededReviewerIds: [detail.artifact.id] });
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    expect(await store.readDetail(OWNER_A, detail.artifact.id)).toBeNull();
    expect(await store.readImageManifest(OWNER_A, detail.artifact.id)).toBeNull();
  });
  it("inserts remote artifacts, hydrates their bodies, and makes them readable offline", async () => {
    const store = await setup();
    const remote = remoteWith([reviewerDetail(), quizDetail(), draftDetail()]);
    const result = await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    expect(result).toEqual({ categories, listComplete: true, hydrated: 3, supersededReviewerIds: [], bodyStoppedBy: "done" });

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
    expect(remote.fetchDetail).toHaveBeenCalledTimes(3);
    await expect(store.listSummaries(OWNER_A)).resolves.toHaveLength(3);
  });

  it('does not strand inventory beyond ten advancing pages', async () => {
    const store = await setup();
    const details = Array.from({ length: 11 }, (_, n) => draftDetail({ id: `page-${n}` }));
    const remote = remoteWith(details, 1);
    const result = await reconcileLibrary({ store, ownerUserId: OWNER_A, remote });
    expect(result.listComplete).toBe(true);
    expect(remote.fetchPage).toHaveBeenCalledTimes(11);
    expect(await store.offlineStats(OWNER_A)).toMatchObject({ total: 11, current: 11 });
  });

  it('downloads only a changed version during repeated background catch-up', async () => {
    const store = await setup();
    const original = reviewerDetail();
    await reconcileLibrary({ store, ownerUserId: OWNER_A, remote: remoteWith([original]) });
    const same = remoteWith([original]);
    expect((await reconcileLibrary({ store, ownerUserId: OWNER_A, remote: same })).hydrated).toBe(0);
    expect(same.fetchDetail).not.toHaveBeenCalled();
    const changed = { ...original, artifact: { ...original.artifact, updatedAt: '2026-10-15T10:00:00.000Z' } };
    const newer = remoteWith([changed]);
    expect((await reconcileLibrary({ store, ownerUserId: OWNER_A, remote: newer })).hydrated).toBe(1);
    expect(newer.fetchDetail).toHaveBeenCalledTimes(1);
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


describe('batched body hydration', () => {
  async function missing(count: number) {
    const store = await setup();
    const details = Array.from({ length: count }, (_, n) => ({ ...reviewerDetail(), artifact: { ...reviewerDetail().artifact, id: 'reviewer:' + n } }));
    await store.upsertSummaries(OWNER_A, details.map(detail => detail.artifact));
    return { store, remote: remoteWith(details), ownerUserId: OWNER_A };
  }
  it('publishes all 45 committed bodies individually', async () => {
    const input = await missing(45);
    const progress = vi.fn();
    expect(await hydrateLibraryBodies({ ...input, onProgress: progress })).toEqual({ hydrated: 45, stoppedBy: 'done' });
    expect(progress).toHaveBeenCalledTimes(45);
    expect((await input.store.offlineStats(OWNER_A)).current).toBe(0);
    expect(await input.store.idsNeedingBody(OWNER_A, 100)).toEqual([]);
  });
  it('stops offline without removing rows', async () => {
    const input = await missing(3);
    input.remote.fetchDetail.mockRejectedValue(new RemoteError('connection'));
    expect(await hydrateLibraryBodies(input)).toEqual({ hydrated: 0, stoppedBy: 'offline' });
    expect(await input.store.listSummaries(OWNER_A)).toHaveLength(3);
  });
  it('skips artifact failures with no loop, allowing later bodies to hydrate', async () => {
    const input = await missing(45);
    input.remote.fetchDetail.mockRejectedValueOnce(new RemoteError('unavailable'));
    expect(await hydrateLibraryBodies(input)).toEqual({ hydrated: 44, stoppedBy: 'retry' });
    expect(input.remote.fetchDetail).toHaveBeenCalledTimes(45);
  });
  it('cancels before saving an in-flight body', async () => {
    const input = await missing(3); let cancelled = false;
    input.remote.fetchDetail.mockImplementationOnce(async () => { cancelled = true; return reviewerDetail(); });
    expect(await hydrateLibraryBodies({ ...input, isCancelled: () => cancelled })).toMatchObject({ stoppedBy: 'cancelled' });
    expect((await input.store.offlineStats(OWNER_A)).current).toBe(0);
    expect(input.remote.fetchDetail).toHaveBeenCalledTimes(1);
  });
  it('checks time budget between requests', async () => {
    const input = await missing(3); let ticks = 0;
    expect(await hydrateLibraryBodies({ ...input, now: () => ticks++ < 3 ? 0 : 60_001 })).toEqual({ hydrated: 1, stoppedBy: 'limit' });
  });
  it('bounds a large run to 300 bodies', async () => {
    const input = await missing(305);
    expect(await hydrateLibraryBodies(input)).toEqual({ hydrated: 300, stoppedBy: 'limit' });
  });
});
