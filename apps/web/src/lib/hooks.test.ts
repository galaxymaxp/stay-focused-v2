import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { savedSnapshot } from "@stay-focused/shared";
import { useResource } from "./hooks";
import { SnapshotStatus } from "../components/snapshot-status";
import { useSavedMaterialPages } from "./use-saved-material-pages";
import type { LearningMaterial, CourseMaterials } from "@stay-focused/shared";

const mocks = vi.hoisted(() => ({ owner: "a", api: vi.fn(), read: vi.fn(), write: vi.fn(), list: vi.fn() }));
vi.mock("../components/providers", () => ({ useAuth: () => ({ session: { user: { id: mocks.owner } }, api: mocks.api }) }));
vi.mock("./screen-snapshots", () => ({ isScreenSnapshotPath: () => true, snapshotEpoch: () => 0, readScreenSnapshot: mocks.read, writeScreenSnapshot: mocks.write, removeScreenSnapshot: vi.fn(), listScreenSnapshots: mocks.list }));
type Data = { items: { id: string; title: string }[] };
let resource: ReturnType<typeof useResource<Data>>;
let rendered: ReactTestRenderer | undefined;
function Probe() { resource = useResource<Data>("/api/today?date=2026-10-15&utcOffsetMinutes=480"); return createElement("screen", null, JSON.stringify(resource.data), createElement(SnapshotStatus, resource)); }
async function flush() { await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); }); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  mocks.owner = "a"; mocks.api.mockReset(); mocks.read.mockReset(); mocks.write.mockReset();
  mocks.read.mockResolvedValue(null); mocks.write.mockResolvedValue(undefined);
  mocks.list.mockReset(); mocks.list.mockResolvedValue([]);
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; vi.unstubAllGlobals(); });
describe("saved-first website screens", () => {
  it("restores later material pages and preserves a concurrently accepted page", async () => {
    const material = (id: string): LearningMaterial => ({ id, courseId: "course", title: id, kind: "pdf", readiness: "ready", count: null,
      sourceId: id, reviewerArtifactId: null, moduleTitle: null, generation: { reviewer: { status: "available" }, quiz: { status: "available" }, activityAssistance: { status: "unavailable" } } });
    const saved: CourseMaterials = { items: [material("later")], nextOffset: 200, totalKnown: 250 };
    mocks.list.mockResolvedValue([savedSnapshot("a", "data:/api/experience/courses/course/materials?offset=100", saved)]);
    let pages!: ReturnType<typeof useSavedMaterialPages>;
    function PagesProbe() { pages = useSavedMaterialPages("course", 100, null); return null; }
    let resolve!: (value: CourseMaterials) => void;
    mocks.api.mockReturnValue(new Promise(yes => { resolve = yes; }));
    await act(async () => { rendered = create(createElement(PagesProbe)); }); await flush();
    expect(pages.items.map(item => item.id)).toEqual(["later"]);
    await act(async () => pages.acceptPage(200, { items: [material("last")], nextOffset: null, totalKnown: 250 }));
    await act(async () => resolve({ ...saved, items: [material("refreshed")] })); await flush();
    expect(pages.items.map(item => item.id)).toEqual(["refreshed", "last"]);
    expect(pages.nextOffset).toBeNull();
  });
  it("renders saved content while the API is unresolved, retains it on failure and retries", async () => {
    const data = { items: [{ id: "one", title: "Saved work" }] };
    mocks.read.mockResolvedValue(savedSnapshot("a", "key", data));
    let reject!: (error: Error) => void;
    mocks.api.mockReturnValue(new Promise((_yes, no) => { reject = no; }));
    await act(async () => { rendered = create(createElement(Probe)); }); await flush();
    expect(resource.data).toEqual(data); expect(resource.loading).toBe(false);
    expect(JSON.stringify(rendered!.toJSON())).toContain("Syncing…");
    await act(async () => reject(new Error("offline"))); await flush();
    expect(resource.data).toEqual(data); expect(JSON.stringify(rendered!.toJSON())).toContain("Couldn't refresh · Retry");
    mocks.api.mockResolvedValue({ items: [{ id: "one", title: "Fresh work" }] });
    await act(async () => resource.refresh()); await flush();
    expect(resource.data?.items[0]?.title).toBe("Fresh work");
    expect(JSON.stringify(rendered!.toJSON())).toContain("Updated just now");
  });
  it("hides the previous owner immediately on a mounted account switch", async () => {
    mocks.read.mockImplementation(async (owner: string) => owner === "a" ? savedSnapshot("a", "key", { items: [{ id: "private", title: "A only" }] }) : null);
    mocks.api.mockReturnValue(new Promise(() => {}));
    await act(async () => { rendered = create(createElement(Probe)); }); await flush();
    mocks.owner = "b";
    await act(async () => rendered!.update(createElement(Probe))); await flush();
    expect(resource.data).toBeNull(); expect(JSON.stringify(rendered!.toJSON())).not.toContain("A only");
  });
  it("silently falls back to network on storage miss and preserves an empty successful response", async () => {
    mocks.api.mockResolvedValue({ items: [] });
    await act(async () => { rendered = create(createElement(Probe)); }); await flush();
    expect(resource.data).toEqual({ items: [] }); expect(resource.loading).toBe(false);
    expect(mocks.write).toHaveBeenCalledOnce();
  });
  it("holds an open reviewer revision until the student applies it", async () => {
    type Reader = { reviewer: { sections: { id: string; title: string }[] } };
    let reader!: ReturnType<typeof useResource<Reader>>;
    function ReaderProbe() { reader = useResource<Reader>("/api/experience/library/reviewer:one", 0, "data", true); return null; }
    const old = { reviewer: { sections: [{ id: "s", title: "Original" }] } };
    const fresh = { reviewer: { sections: [{ id: "s", title: "New" }] } };
    mocks.read.mockResolvedValue(savedSnapshot("a", "key", old)); mocks.api.mockResolvedValue(fresh);
    await act(async () => { rendered = create(createElement(ReaderProbe)); }); await flush();
    expect(reader.data).toEqual(old); expect(reader.updateAvailable).toBe(true);
    await act(async () => reader.applyUpdate());
    expect(reader.data).toEqual(fresh); expect(reader.updateAvailable).toBe(false);
  });
});
