import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLibraryCourseSequence } from "./useLibraryCourseSequence";
const mocks = vi.hoisted(() => ({ owner: "owner", read: vi.fn(), write: vi.fn(), load: vi.fn(), client: { baseUrl: "https://api.test", accessToken: "token" } }));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: { user: { id: mocks.owner } } }) }));
vi.mock("./useExperience", () => ({ useExperienceClient: () => mocks.client }));
vi.mock("./courseReviewerActions", () => ({ loadCourseMaterials: mocks.load }));
vi.mock("../../services/screenSnapshots", () => ({ readScreenSnapshot: mocks.read, writeScreenSnapshot: mocks.write, screenSnapshotEpoch: () => 0 }));
let view: ReactTestRenderer | undefined;
let current: ReturnType<typeof useLibraryCourseSequence>;
function Probe() { current = useLibraryCourseSequence("course", true); return null; }
beforeEach(() => { vi.clearAllMocks(); mocks.owner = "owner"; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); });
afterEach(async () => { if (view) await act(async () => view!.unmount()); view = undefined; });
it("retains the complete saved sequence when an inventory refresh fails", async () => {
  const data = { materials: [{ id: "file:1", reviewerArtifactId: null }] };
  mocks.read.mockResolvedValue({ data }); mocks.load.mockRejectedValue(Error("offline"));
  await act(async () => { view = create(createElement(Probe)); });
  expect(current!.data).toEqual(data); expect(current!.error).toBe(true);
  expect(mocks.write).not.toHaveBeenCalled();
});
it("stores only a successfully completed inventory and separates each owner", async () => {
  mocks.read.mockResolvedValue(null); mocks.load.mockResolvedValue([{ id: "file:2", reviewerArtifactId: "reviewer" }, { id: "file:1", reviewerArtifactId: null }]);
  await act(async () => { view = create(createElement(Probe)); });
  expect(mocks.write).toHaveBeenCalledWith("owner", "library-course-order:v1:course", { materials: [{ id: "file:2", reviewerArtifactId: "reviewer" }, { id: "file:1", reviewerArtifactId: null }] }, 0);
  expect(current!.error).toBe(false);
});
it("discards a late inventory response after an account change", async () => {
  mocks.read.mockResolvedValue(null);
  let finish!: (items: { id: string; reviewerArtifactId: null }[]) => void;
  mocks.load.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockRejectedValueOnce(Error("offline"));
  await act(async () => { view = create(createElement(Probe)); });
  mocks.owner = "other";
  await act(async () => { view!.update(createElement(Probe)); });
  await act(async () => { finish([{ id: "private-old", reviewerArtifactId: null }]); });
  expect(current!.data).toBeNull(); expect(mocks.write).not.toHaveBeenCalled();
});
