import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localMeasurements, type LocalMeasurement } from '@stay-focused/shared';

import { createLocalArtifactStore, type LocalArtifactStore } from "../../services/localLibrary/artifactStore";
import {
  OWNER_A,
  OWNER_B,
  openNodeSqlite,
  draftDetail,
  quizDetail,
  reviewerDetail,
} from "../../services/localLibrary/localLibrary.testSupport";
import { runOfflineCatchUp, stopOfflineCatchUp } from "../../services/localLibrary/offlineCatchUp";
import { migrateLocalLibrary } from "../../services/localLibrary/schema";
import { notifyOfflineImages } from "../../services/localLibrary/imageManifest";
import type { LocalSqlDatabase } from "../../services/localLibrary/sqlDatabase";
import { useLocalArtifact, useLocalLibrary } from "./useLocalLibrary";

const mocks = vi.hoisted(() => ({
  owner: "",
  focused: true,
  store: null as LocalArtifactStore | null,
  db: null as LocalSqlDatabase | null,
  request: vi.fn(),
  // Production memoizes the client per access token.
  client: { baseUrl: "https://api.example", accessToken: "token" },
}));
vi.mock("../../auth", () => ({
  useAuth: () => ({ session: mocks.owner ? { user: { id: mocks.owner }, accessToken: "token" } : null }),
}));
vi.mock("../../design/theme", () => ({ useTheme: () => ({ active: true }) }));
vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => mocks.focused }));
vi.mock("./useExperience", () => ({
  useExperienceClient: () => mocks.client,
}));
vi.mock("../../services/experienceApi", () => ({ experienceRequest: mocks.request }));
vi.mock('expo-file-system/legacy', () => ({ documentDirectory: null }));
vi.mock("../../services/localLibrary/localArtifactDatabase", () => ({
  getLocalArtifactStore: async () => mocks.store,
}));

class RemoteError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
const categories = { reviewer: { status: "available" }, quiz: { status: "available" }, activity_output: { status: "available" } };

let rendered: ReactTestRenderer | undefined;
let measurementEvents: LocalMeasurement[];
let removeMeasurementObserver: () => void;
let library: ReturnType<typeof useLocalLibrary>;
let artifact: ReturnType<typeof useLocalArtifact>;
function LibraryProbe() {
  library = useLocalLibrary();
  return null;
}
function ArtifactProbe({ id }: { id: string }) {
  artifact = useLocalArtifact(id);
  return null;
}
async function flush() {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  measurementEvents = [];
  let tick = 0;
  removeMeasurementObserver = localMeasurements.observe({ now: () => tick++, sink: event => { measurementEvents.push(event); } });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const { db } = openNodeSqlite();
  await migrateLocalLibrary(db);
  mocks.db = db;
  mocks.store = createLocalArtifactStore(db);
  mocks.owner = OWNER_A;
  mocks.focused = true;
  mocks.request.mockReset();
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  await stopOfflineCatchUp(OWNER_A);
  await stopOfflineCatchUp(OWNER_B);
  removeMeasurementObserver();
  expect(measurementEvents.every(event => Object.keys(event).every(key => ['name', 'outcome', 'durationMs', 'count'].includes(key)))).toBe(true);
  expect(JSON.stringify(measurementEvents)).not.toMatch(/11111111|22222222|api\.example|token|synthetic-|Cells/);
});

describe("useLocalLibrary", () => {
  it('finishes a held read as cancelled after unmount without publishing counts or starting queued work', async () => {
    mocks.request.mockRejectedValue(new RemoteError('connection'));
    await act(async () => { rendered = create(createElement(LibraryProbe)); }); await flush();
    const gate = deferred<void>();
    const original = mocks.store!.readLibraryOverview.bind(mocks.store!);
    const read = vi.spyOn(mocks.store!, 'readLibraryOverview').mockImplementation(async owner => { await gate.promise; return original(owner); });
    await act(async () => notifyOfflineImages(OWNER_A));
    await act(async () => notifyOfflineImages(OWNER_A));
    const saved = library;
    await act(async () => rendered!.unmount()); rendered = undefined;
    measurementEvents.length = 0;
    await act(async () => gate.resolve()); await flush();
    expect(read).toHaveBeenCalledTimes(1); expect(library).toBe(saved);
    expect(measurementEvents).toEqual([{ name: 'library.overview_read', outcome: 'cancelled', durationMs: expect.any(Number) }]);
  });

  it('keeps full saved-first results and errors when the optional sink throws', async () => {
    removeMeasurementObserver();
    removeMeasurementObserver = localMeasurements.observe({ now: () => 10, sink: () => { throw new Error('private observer'); } });
    await mocks.store!.upsertSummaries(OWNER_A, [draftDetail({ id: 'synthetic-saved' }).artifact]);
    mocks.request.mockRejectedValue(new RemoteError('connection'));
    await act(async () => { rendered = create(createElement(LibraryProbe)); }); await flush();
    expect(library.items).toEqual(await mocks.store!.listSummaries(OWNER_A));
    expect(library.errorCode).toBe('connection'); expect(library.refreshing).toBe(false);
  });

  it.each([0, 100, 240, 300])('coalesces overlapping progress reads and keeps the latest %i synthetic summaries', async (count) => {
    // Public synthetic workload, with a held device read to model a busy SQLite queue.
    const summaries = Array.from({ length: count }, (_, index) => draftDetail({ id: `activity:synthetic-${index}` }).artifact);
    await mocks.store!.upsertSummaries(OWNER_A, summaries);
    mocks.request.mockRejectedValue(new RemoteError('connection'));
    await act(async () => { rendered = create(createElement(LibraryProbe)); });
    await flush();
    const read = mocks.store!.listSummaries.bind(mocks.store!);
    const gate = deferred<void>();
    let active = 0;
    let maximum = 0;
    const list = vi.spyOn(mocks.store!, 'listSummaries').mockImplementation(async owner => {
      active += 1;
      maximum = Math.max(maximum, active);
      try { await gate.promise; return await read(owner); }
      finally { active -= 1; }
    });
    const statsQueries = vi.spyOn(mocks.db!, 'getFirstAsync');
    await act(async () => {
      notifyOfflineImages(OWNER_A);
      for (let index = 0; index < count; index += 1) notifyOfflineImages(OWNER_A);
    });
    // Every invalidation during a read must cause one fresh follow-up, not a
    // parallel owner-wide scan for every event. The follow-up sees late writes.
    const late = draftDetail({ id: 'activity:synthetic-late', title: 'Synthetic late write' }).artifact;
    await mocks.store!.upsertSummaries(OWNER_A, [late]);
    await act(async () => gate.resolve());
    await flush();
    const expected = await read(OWNER_A);
    const statsReads = statsQueries.mock.calls.filter(([sql]) => sql.includes('COUNT(*) AS total')).length;
    console.info('[PBR-AF1 synthetic Library]', JSON.stringify({ count, explicitNotifications: count + 1, lateWriteNotifications: 1, summaryReads: list.mock.calls.length, statsReads, maximumConcurrentReads: maximum }));
    expect(library.items).toEqual(expected);
    expect(library.offlineStats).toMatchObject({ total: count + 1 });
    expect(maximum).toBe(1);
    expect(list).toHaveBeenCalledTimes(2);
    expect(statsReads).toBe(2);
  });

  it('drops queued reads on owner change and never publishes a delayed prior-owner result', async () => {
    await mocks.store!.upsertSummaries(OWNER_A, [draftDetail({ id: 'synthetic-a' }).artifact]);
    await mocks.store!.upsertSummaries(OWNER_B, [draftDetail({ id: 'synthetic-b' }).artifact]);
    mocks.request.mockRejectedValue(new RemoteError('connection'));
    await act(async () => { rendered = create(createElement(LibraryProbe)); });
    await flush();
    const gate = deferred<void>();
    const read = mocks.store!.readLibraryOverview.bind(mocks.store!);
    const overview = vi.spyOn(mocks.store!, 'readLibraryOverview').mockImplementation(async owner => {
      if (owner === OWNER_A) await gate.promise;
      return read(owner);
    });
    await act(async () => { notifyOfflineImages(OWNER_A); });
    await act(async () => { notifyOfflineImages(OWNER_A); });
    mocks.owner = OWNER_B;
    await act(async () => rendered!.update(createElement(LibraryProbe)));
    await flush();
    expect(library.items.map(item => item.id)).toEqual(['activity:synthetic-b']);
    await act(async () => gate.resolve());
    await flush();
    expect(overview.mock.calls.filter(([owner]) => owner === OWNER_A)).toHaveLength(1);
    expect(library.items.map(item => item.id)).toEqual(['activity:synthetic-b']);
    expect(measurementEvents).toContainEqual({ name: 'library.overview_read', outcome: 'cancelled', durationMs: expect.any(Number) });
  });

  it('accepts a new invalidation after a failed local read without clearing saved content', async () => {
    mocks.request.mockRejectedValue(new RemoteError('connection'));
    await mocks.store!.upsertSummaries(OWNER_A, [draftDetail({ id: 'synthetic-saved' }).artifact]);
    await act(async () => { rendered = create(createElement(LibraryProbe)); });
    await flush();
    const overview = vi.spyOn(mocks.store!, 'readLibraryOverview').mockRejectedValueOnce(new Error('synthetic_busy'));
    await act(async () => notifyOfflineImages(OWNER_A));
    await flush();
    expect(measurementEvents.some(event => event.name === 'library.overview_read' && event.outcome === 'error')).toBe(true);
    expect(library.items.map(item => item.id)).toEqual(['activity:synthetic-saved']);
    await act(async () => { await mocks.store!.upsertSummaries(OWNER_A, [draftDetail({ id: 'synthetic-new' }).artifact]); });
    await flush();
    expect(overview.mock.calls.length).toBeGreaterThan(1);
    expect(library.items.map(item => item.id)).toEqual(['activity:synthetic-saved', 'activity:synthetic-new']);
    expect(library.offlineStats).toMatchObject({ total: 2 });
    expect(library.errorCode).toBe('connection');
  });

  it('keeps the shared job after blur and displays each committed item through its subscription', async () => {
    const details = [draftDetail({ id: 'activity:a' }), draftDetail({ id: 'activity:b' }), draftDetail({ id: 'activity:c' })];
    const pending = details.map(() => deferred<unknown>());
    mocks.request.mockImplementation((_client: unknown, path: string) => path.includes('?')
      ? Promise.resolve({ items: details.map(d => d.artifact), categories, nextOffset: null })
      : pending[details.findIndex(d => path.endsWith(encodeURIComponent(d.artifact.id)))]!.promise);
    const flight = runOfflineCatchUp(OWNER_A, mocks.client, { force: true });
    await act(async () => { rendered = create(createElement(LibraryProbe)); });
    await flush();
    expect(library.offlineStats).toMatchObject({ current: 0, total: 3 });
    expect(mocks.request.mock.calls.map(([, path]) => path)).toContain(`/api/experience/library/${encodeURIComponent(details[0]!.artifact.id)}`);
    await act(async () => pending[0]!.resolve(details[0])); await flush();
    expect(await mocks.store!.offlineStats(OWNER_A)).toMatchObject({ current: 1 });
    expect(library.offlineStats).toMatchObject({ current: 1, total: 3 });
    expect(library.refreshing).toBe(true);
    await act(async () => pending[1]!.resolve(details[1])); await flush();
    expect(library.offlineStats).toMatchObject({ current: 2, total: 3 });
    mocks.focused = false;
    await act(async () => rendered!.update(createElement(LibraryProbe)));
    await act(async () => { pending[2]!.resolve(details[2]); await flight; });
    expect(await mocks.store!.offlineStats(OWNER_A)).toMatchObject({ current: 3, total: 3 });
    expect(mocks.request.mock.calls.filter(([, path]) => String(path).includes('?'))).toHaveLength(1);
    mocks.focused = true;
    await act(async () => rendered!.update(createElement(LibraryProbe))); await flush();
    expect(library.offlineStats).toMatchObject({ current: 3, total: 3 });
  });
  it("joins a foreground catch-up instead of starting another reconcile", async () => {
    const page = deferred<unknown>();
    const detail = quizDetail();
    if (!('quiz' in detail)) throw new Error('fixture');
    const key = { quizId: detail.quiz.id, versionId: 'v1', questions: [{ id: 'q1', correctOptionIds: ['a'], explanation: 'Synthetic explanation' }] };
    mocks.request.mockImplementation((_client: unknown, path: string) => path.includes('?') ? page.promise : Promise.resolve(path.endsWith('/answer-key') ? key : detail));
    const foreground = runOfflineCatchUp(OWNER_A, mocks.client, { force: true });
    await act(async () => { rendered = create(createElement(LibraryProbe)); });
    await flush();
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      page.resolve({ items: [detail.artifact], categories, nextOffset: null });
      await foreground;
    });
    await flush();
    expect(mocks.request.mock.calls.map(([, path]) => path)).toEqual([
      '/api/experience/library?limit=100&offset=0',
      `/api/experience/library/${encodeURIComponent(detail.artifact.id)}`,
      `/api/experience/quizzes/${detail.quiz.id}/answer-key`,
    ]);
    expect(await mocks.store!.readQuizAnswerKey(OWNER_A, detail.quiz.id, detail.artifact.updatedAt)).toEqual(key);
    expect(library.items[0]?.offlineReady).toBe(true);
  });
  it("renders device-saved work before the cloud answers, then reconciles", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    const page = deferred<unknown>();
    mocks.request.mockImplementation((_client: unknown, path: string) =>
      path.startsWith("/api/experience/library?") ? page.promise : Promise.resolve(quizDetail()),
    );
    await act(async () => {
      rendered = create(createElement(LibraryProbe));
    });
    await flush();
    expect(library.items.map((item) => item.id)).toEqual([reviewerDetail().artifact.id]);
    expect(library.refreshing).toBe(true);

    page.resolve({ items: [reviewerDetail().artifact, quizDetail().artifact], categories, nextOffset: null });
    await flush();
    // Existing rows keep their positions while newly discovered work appends.
    expect(library.items.map((item) => item.id)).toEqual([reviewerDetail().artifact.id, quizDetail().artifact.id]);
    expect(library.refreshing).toBe(true); // Missing answer key now has a scheduled retry.
    expect(library.error).toBeNull();
    expect(library.offlineStats).toMatchObject({ total: 2, current: 1 });
    expect(library.items.filter(item => item.offlineReady).map(item => item.type)).toEqual(["quiz"]);
  });

  it("keeps device-saved work when the cloud refresh fails", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    await act(async () => {
      rendered = create(createElement(LibraryProbe));
    });
    await flush();
    expect(library.items).toHaveLength(1);
    expect(library.error).toBe("connection");
    expect(library.errorCode).toBe("connection");
    expect(library.offlineStats).toMatchObject({ total: 1, current: 0 });
    expect(library.items[0]?.offlineReady).toBe(false);
    expect(library.refreshing).toBe(false); // Offline recovery waits quietly without a checking label.
  });

  it("never shows another account's device copies after an account switch", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    mocks.owner = OWNER_B;
    await act(async () => {
      rendered = create(createElement(LibraryProbe));
    });
    await flush();
    expect(library.items).toEqual([]);
  });
});

describe("useLocalArtifact", () => {
  it("holds a changed reviewer until the student explicitly accepts it", async () => {
    const original = reviewerDetail();
    const fresh = reviewerDetail({ title: "Updated cells", updatedAt: "2026-10-15T00:00:00Z" });
    await mocks.store!.upsertDetail(OWNER_A, "r", original);
    mocks.request.mockResolvedValue(fresh);
    await act(async () => { rendered = create(createElement(ArtifactProbe, { id: original.artifact.id })); });
    await flush();
    expect(artifact.data).toEqual(original);
    expect(artifact.updateAvailable).toBe(true);
    await act(async () => artifact.applyUpdate());
    expect(artifact.data).toEqual(fresh);
    expect(artifact.updateAvailable).toBe(false);
    expect((await mocks.store!.readDetail(OWNER_A, original.artifact.id))?.detail).toEqual(fresh);
  });
  it("identifies a missing device body on a connection failure", async () => {
    await mocks.store!.upsertSummaries(OWNER_A, [quizDetail().artifact]);
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    await act(async () => { rendered = create(createElement(ArtifactProbe, { id: quizDetail().artifact.id })); });
    await flush();
    expect(artifact.data).toBeNull();
    expect(artifact.offlineMissing).toBe(true);
    expect(artifact.loading).toBe(false);
  });
  it("opens a saved artifact offline from the device copy", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "q", quizDetail());
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    await act(async () => {
      rendered = create(createElement(ArtifactProbe, { id: quizDetail().artifact.id }));
    });
    await flush();
    expect(artifact.data).toEqual(quizDetail());
    expect(artifact.deviceCopy).toBe(true);
    expect(artifact.error).toBeNull();
  });

  it("shows the device copy without waiting for the cloud", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    mocks.request.mockReturnValue(new Promise(() => undefined));
    await act(async () => {
      rendered = create(createElement(ArtifactProbe, { id: reviewerDetail().artifact.id }));
    });
    await flush();
    expect(artifact.data).toEqual(reviewerDetail());
    expect(artifact.loading).toBe(false);
  });

  it("removes the device copy when the server confirms the artifact is gone", async () => {
    await mocks.store!.upsertDetail(OWNER_A, "r", reviewerDetail());
    mocks.request.mockRejectedValue(new RemoteError("not_found"));
    await act(async () => {
      rendered = create(createElement(ArtifactProbe, { id: reviewerDetail().artifact.id }));
    });
    await flush();
    expect(artifact.data).toBeNull();
    expect(artifact.error).toBe("not_found");
    await expect(mocks.store!.listSummaries(OWNER_A)).resolves.toEqual([]);
  });
});

describe("saved Draft revision", () => {
  it("updates the open Draft and export source immediately, then reopens that revision offline without a duplicate", async () => {
    const original = draftDetail();
    await mocks.store!.upsertDetail(OWNER_A, original.artifact.id, original);
    mocks.request.mockRejectedValue(new RemoteError("connection"));
    await act(async () => { rendered = create(createElement(ArtifactProbe, { id: original.artifact.id })); });
    await flush();
    const edited = draftDetail({ title: "Edited scenario", revision: 2, updatedAt: "2026-09-29T04:00:00Z", status: "edited" });
    await act(async () => artifact.storeConfirmed(edited));
    await flush();
    expect(artifact.data).toEqual(edited);
    expect(artifact.deviceCopy).toBe(false);
    await act(async () => rendered!.unmount());
    await act(async () => { rendered = create(createElement(ArtifactProbe, { id: original.artifact.id })); });
    await flush();
    expect(artifact.data).toEqual(edited);
    expect(artifact.deviceCopy).toBe(true);
    expect((await mocks.store!.listSummaries(OWNER_A)).map(item => item.id)).toEqual([original.artifact.id]);
  });
});
