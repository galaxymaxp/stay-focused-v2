import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { LearningMaterial } from "@stay-focused/shared";
import { loadCourseMaterials, useLibraryCourseSequence } from "./use-library-course-sequence";

const mocks = vi.hoisted(() => ({ owner: "owner", api: vi.fn(), read: vi.fn(), write: vi.fn(), epoch: 0 }));
vi.mock("../components/providers", () => ({ useAuth: () => ({ session: { user: { id: mocks.owner } }, api: mocks.api }) }));
vi.mock("./screen-snapshots", () => ({ readScreenSnapshot: mocks.read, writeScreenSnapshot: mocks.write, snapshotEpoch: () => mocks.epoch }));
let tree: ReactTestRenderer | undefined, current: ReturnType<typeof useLibraryCourseSequence>;
function Probe({ course = "course", enabled = true }) { current = useLibraryCourseSequence(course, enabled); return null; }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.resetAllMocks(); mocks.owner = "owner"; mocks.epoch = 0; mocks.read.mockResolvedValue(null);
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });

it("walks every material page, deduplicates IDs and caches only the complete sequence", async () => {
  mocks.api.mockResolvedValueOnce({ items: [{ id: "file:2", reviewerArtifactId: "two" }], nextOffset: 1 })
    .mockResolvedValueOnce({ items: [{ id: "file:1", reviewerArtifactId: "one" }, { id: "file:2", reviewerArtifactId: "two" }], nextOffset: null });
  await act(async () => { tree = create(createElement(Probe)); });
  expect(mocks.api.mock.calls.map(call => call[0])).toEqual([
    "/api/experience/courses/course/materials?offset=0", "/api/experience/courses/course/materials?offset=1",
  ]);
  expect(current.data).toEqual({ materials: [{ id: "file:2", reviewerArtifactId: "two" }, { id: "file:1", reviewerArtifactId: "one" }] });
  expect(mocks.write).toHaveBeenCalledWith("owner", "library-course-order:v1:course", current.data, 0);
});

it("keeps the previous complete sequence when a later page fails", async () => {
  const data = { materials: [{ id: "file:old", reviewerArtifactId: null }] };
  mocks.read.mockResolvedValue({ data });
  mocks.api.mockResolvedValueOnce({ items: [{ id: "file:partial" }], nextOffset: 1 }).mockRejectedValueOnce(Error("offline"));
  await act(async () => { tree = create(createElement(Probe)); });
  expect(current.data).toEqual(data); expect(current.error).toBe(true); expect(mocks.write).not.toHaveBeenCalled();
});

it("rejects repeated pagination offsets instead of publishing partial order", async () => {
  mocks.api.mockResolvedValue({ items: [], nextOffset: 0 });
  await expect(loadCourseMaterials(mocks.api, "course")).rejects.toThrow("Could not load every material");
  expect(mocks.api).toHaveBeenCalledOnce(); expect(mocks.write).not.toHaveBeenCalled();
});

it.each(["owner", "course", "epoch"] as const)("discards late results after a change to %s", async change => {
  let finish!: (page: { items: Pick<LearningMaterial, "id" | "reviewerArtifactId">[]; nextOffset: null }) => void;
  mocks.api.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockRejectedValueOnce(Error("offline"));
  await act(async () => { tree = create(createElement(Probe)); });
  if (change === "owner") mocks.owner = "other";
  if (change === "epoch") mocks.epoch++;
  if (change !== "epoch") await act(async () => tree!.update(createElement(Probe, { course: change === "course" ? "other" : "course" })));
  await act(async () => finish({ items: [{ id: "file:private-old", reviewerArtifactId: null }], nextOffset: null }));
  expect(current.data).toBeNull(); expect(mocks.write).not.toHaveBeenCalled();
});

it("makes no inventory request for ordinary sorts", async () => {
  await act(async () => { tree = create(createElement(Probe, { enabled: false })); });
  expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.api).not.toHaveBeenCalled();
});
