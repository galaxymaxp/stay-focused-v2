import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createLocalArtifactStore, type LocalArtifactStore } from "../../services/localLibrary/artifactStore";
import { openNodeSqlite } from "../../services/localLibrary/localLibrary.testSupport";
import { migrateLocalLibrary } from "../../services/localLibrary/schema";
import { purgeScreenSnapshotsForOwner, screenSnapshotEpoch, writeScreenSnapshot } from "../../services/screenSnapshots";
import { useExperience } from "./useExperience";
import { SnapshotStatus } from "./SnapshotStatus";
import { useSavedMaterialPages } from "./useSavedMaterialPages";
import type { CourseMaterials, LearningMaterial } from "@stay-focused/shared";
import { openedMaterialOffsets } from "../../services/courseScreenMemory";

const mocks = vi.hoisted(() => ({ owner: "a", token: "token", active: true, focused: true, request: vi.fn(), store: null as LocalArtifactStore | null }));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: { user: { id: mocks.owner }, accessToken: mocks.token } }) }));
vi.mock("../../config/apiBaseUrl", () => ({ getApiBaseUrl: () => "https://unused.invalid" }));
vi.mock("../../design/theme", () => ({ useTheme: () => ({ active: mocks.active }) }));
vi.mock("../../design/primitives", () => ({ Copy: "copy" }));
vi.mock("react-native", () => ({ Pressable: "pressable" }));
vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => mocks.focused }));
vi.mock("../sync/CanvasSyncProvider", () => ({ useCanvasSync: () => ({ dataVersion: 0 }) }));
vi.mock("../../services/localLibrary/localArtifactDatabase", () => ({ getLocalArtifactStore: async () => mocks.store }));
vi.mock("../../services/experienceApi", () => ({ experienceRequest: mocks.request, ExperienceApiError: class extends Error {} }));
type Data = { items: { id: string; title: string }[] };
const path = "/api/today?date=2026-10-15&utcOffsetMinutes=480";
let result: ReturnType<typeof useExperience<Data>>;
let rendered: ReactTestRenderer | undefined;
let close: () => void;
function Probe() { result = useExperience<Data>(path); return createElement("screen", null, JSON.stringify(result.data), createElement(SnapshotStatus, result)); }
async function flush() { await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); }); }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const handle = openNodeSqlite(); close = handle.close;
  await migrateLocalLibrary(handle.db); mocks.store = createLocalArtifactStore(handle.db);
  mocks.owner = "a"; mocks.token = "token"; mocks.active = true; mocks.focused = true; mocks.request.mockReset();
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; close(); vi.useRealTimers(); });

it('TC2 skips Today polling and focus reads during a drag, then preserves lifecycle and explicit refresh', async () => {
  vi.useFakeTimers(); const paused = { current: false };
  function ClockProbe() { result = useExperience<Data>(path, 1000, undefined, undefined, Infinity, paused); return null; }
  mocks.request.mockResolvedValue({ items: [] });
  await act(async () => { rendered = create(createElement(ClockProbe)); }); await flush();
  expect(mocks.request).toHaveBeenCalledTimes(1); mocks.request.mockClear();
  paused.current = true;
  mocks.focused = false;
  await act(async () => rendered!.update(createElement(ClockProbe)));
  mocks.focused = true;
  await act(async () => rendered!.update(createElement(ClockProbe))); await flush();
  await act(async () => { vi.advanceTimersByTime(1000); }); await flush();
  expect(mocks.request).not.toHaveBeenCalled(); expect(result.data).toEqual({ items: [] });
  paused.current = false;
  await act(async () => { vi.advanceTimersByTime(1000); }); await flush();
  expect(mocks.request).toHaveBeenCalledTimes(1);
  await act(async () => result.refresh()); await flush(); expect(mocks.request).toHaveBeenCalledTimes(2);
  mocks.active = false; await act(async () => rendered!.update(createElement(ClockProbe)));
  mocks.active = true; await act(async () => rendered!.update(createElement(ClockProbe))); await flush();
  expect(mocks.request).toHaveBeenCalledTimes(3);
});
describe("saved-first mobile screens", () => {
  it("restores later material pages with exact owner/offset and retains a newly loaded page during background refresh", async () => {
    const material = (id: string): LearningMaterial => ({ id, courseId: "course", title: id, kind: "pdf", readiness: "ready", count: null,
      sourceId: id, reviewerArtifactId: null, moduleTitle: null, generation: { reviewer: { status: "available" }, quiz: { status: "available" }, activityAssistance: { status: "unavailable" } } });
    const saved = { items: [material("later")], nextOffset: 200, totalKnown: 250 };
    await mocks.store!.saveScreenSnapshot("a", "/api/experience/courses/course/materials?offset=100", saved);
    let pages!: ReturnType<typeof useSavedMaterialPages>;
    function PagesProbe() { pages = useSavedMaterialPages("course", 100, null); return null; }
    let resolve!: (value: CourseMaterials) => void;
    mocks.request.mockReturnValue(new Promise(yes => { resolve = yes; }));
    await act(async () => { rendered = create(createElement(PagesProbe)); }); await flush();
    expect(pages.items.map(item => item.id)).toEqual(["later"]);
    expect(openedMaterialOffsets.get("a:later")).toBe(100);
    expect(openedMaterialOffsets.has("b:later")).toBe(false);
    await act(async () => pages.acceptPage(200, { items: [material("last")], nextOffset: null, totalKnown: 250 }));
    await act(async () => resolve({ ...saved, items: [material("refreshed")] })); await flush();
    expect(pages.items.map(item => item.id)).toEqual(["refreshed", "last"]);
    expect(pages.nextOffset).toBeNull();
  });
  it("renders the saved agenda before the network resolves and preserves it on failure with Retry", async () => {
    const data = { items: [{ id: "one", title: "Saved agenda" }] };
    await mocks.store!.saveScreenSnapshot("a", path, data);
    let reject!: (error: Error) => void;
    mocks.request.mockReturnValue(new Promise((_resolve, no) => { reject = no; }));
    await act(async () => { rendered = create(createElement(Probe)); }); await flush();
    expect(result.data).toEqual(data); expect(result.loading).toBe(false);
    expect(JSON.stringify(rendered!.toJSON())).toContain("Syncing…");
    await act(async () => reject(new Error("offline"))); await flush();
    expect(result.data).toEqual(data);
    expect(JSON.stringify(rendered!.toJSON())).toContain("Couldn't refresh · Retry");
    mocks.request.mockResolvedValue({ items: [{ id: "one", title: "Fresh agenda" }] });
    await act(async () => result.refresh()); await flush();
    expect(result.data?.items[0]?.title).toBe("Fresh agenda");
    expect(JSON.stringify(rendered!.toJSON())).toContain("Updated just now");
  });
  it("never renders the previous owner when an already-mounted screen switches accounts", async () => {
    await mocks.store!.saveScreenSnapshot("a", path, { items: [{ id: "private", title: "A only" }] });
    mocks.request.mockReturnValue(new Promise(() => {}));
    await act(async () => { rendered = create(createElement(Probe)); }); await flush();
    expect(result.data?.items).toHaveLength(1);
    mocks.owner = "b";
    await act(async () => rendered!.update(createElement(Probe))); await flush();
    expect(result.data).toBeNull(); expect(JSON.stringify(rendered!.toJSON())).not.toContain("A only");
  });
  it("sign-out purge fences delayed writes and leaves another owner's rows intact", async () => {
    const epoch = screenSnapshotEpoch("a");
    await mocks.store!.saveScreenSnapshot("a", path, { items: [] });
    await mocks.store!.saveScreenSnapshot("b", path, { items: [] });
    await purgeScreenSnapshotsForOwner("a");
    await writeScreenSnapshot("a", path, { items: [{ id: "late", title: "Late" }] }, epoch);
    expect(await mocks.store!.readScreenSnapshot("a", path)).toBeNull();
    expect(await mocks.store!.readScreenSnapshot("b", path)).not.toBeNull();
  });
  it("preserves the in-memory view during access-token rotation and treats an empty snapshot as data", async () => {
    await mocks.store!.saveScreenSnapshot("a", path, { items: [] });
    mocks.request.mockReturnValue(new Promise(() => {}));
    await act(async () => { rendered = create(createElement(Probe)); }); await flush();
    mocks.token = "rotated";
    await act(async () => rendered!.update(createElement(Probe))); await flush();
    expect(result.data).toEqual({ items: [] }); expect(result.loading).toBe(false);
  });
});
