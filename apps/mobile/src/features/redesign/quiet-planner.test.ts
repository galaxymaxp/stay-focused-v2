import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { DeterministicStudyPlan } from "@stay-focused/shared/task-planning";
import { useQuietPlanner } from "./useQuietPlanner";
import { planningRequest } from "./presentation";

let tree: ReactTestRenderer | undefined;
let value: ReturnType<typeof useQuietPlanner>;
let identity = "owner:2026-10-24";
const load = vi.fn<(request: ReturnType<typeof planningRequest>) => Promise<DeterministicStudyPlan>>();
const result = (tag: string) => ({ sessions: [], unscheduledWork: [], algorithmVersion: tag }) as unknown as DeterministicStudyPlan;
function Harness() { value = useQuietPlanner(identity, load); return createElement("clock"); }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers(); load.mockReset(); identity = "owner:2026-10-24";
  await act(async () => { tree = create(createElement(Harness)); });
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.useRealTimers(); });
const tick = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const request = (start: number) => planningRequest("2026-10-24", start, 240);
it("coalesces at exactly 400ms and sends the latest cross-midnight request", async () => {
  load.mockResolvedValue(result("latest"));
  await act(async () => value.queuePreview(request(1320)));
  await tick(399); expect(load).not.toHaveBeenCalled();
  await act(async () => value.queuePreview(request(1410)));
  await tick(399); expect(load).not.toHaveBeenCalled();
  await tick(1); expect(load).toHaveBeenCalledExactlyOnceWith(request(1410));
  expect(value.previewRequest).toEqual(request(1410));
});
it.each(["resolve", "reject"] as const)("drops an older %s, including its idle state, while the new request runs", async old => {
  let resolveOld!: (plan: DeterministicStudyPlan) => void, rejectOld!: (error: Error) => void;
  let resolveNew!: (plan: DeterministicStudyPlan) => void;
  load.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }))
    .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve; }));
  await act(async () => value.queuePreview(request(1320))); await tick(400);
  await act(async () => value.queuePreview(request(1410))); await tick(400);
  expect(load).toHaveBeenCalledTimes(2); expect(value.previewing).toBe(true);
  await act(async () => old === "resolve" ? resolveOld(result("old")) : rejectOld(new Error("old error")));
  expect(value.preview).toBeNull(); expect(value.previewNote).toBeNull(); expect(value.previewing).toBe(true);
  await act(async () => resolveNew(result("new")));
  expect(value.preview?.algorithmVersion).toBe("new"); expect(value.previewing).toBe(false);
});
it("invalidates an old response immediately on the next commit, before its quiet period", async () => {
  let finish!: (plan: DeterministicStudyPlan) => void;
  load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => value.queuePreview(request(1320))); await tick(400);
  await act(async () => value.queuePreview(request(1410)));
  await act(async () => finish(result("stale")));
  expect(value.preview).toBeNull(); expect(value.previewRequest).toBeNull();
});
it.each(["owner", "date", "unmount", "drag"])("cancels queued work on %s", async change => {
  await act(async () => value.queuePreview(request(1320)));
  await act(async () => {
    if (change === "unmount") tree!.unmount();
    else if (change === "drag") value.clearPreview();
    else { identity = change === "owner" ? "other:2026-10-24" : "owner:2026-10-25"; tree!.update(createElement(Harness)); }
  });
  await tick(400); expect(load).not.toHaveBeenCalled(); expect(value.preview).toBeNull();
});
it("never lets an older slow result replace an already completed latest preview", async () => {
  let finish!: (plan: DeterministicStudyPlan) => void;
  load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(result("new"));
  await act(async () => value.queuePreview(request(1320))); await tick(400);
  await act(async () => value.queuePreview(request(1410))); await tick(400);
  await act(async () => finish(result("old")));
  expect(value.preview?.algorithmVersion).toBe("new"); expect(value.previewRequest).toEqual(request(1410));
});

it('drops an older selection at the same range and date before the next quiet period', async () => {
 let finish!: (value: DeterministicStudyPlan) => void;
 load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(result('new-selection'));
 const first = { ...request(1320), mode: 'reviewers_tasks' as const, selection: { order: 'smart' as const, items: [{ kind: 'task' as const, id: 'one' }] } };
 const second = { ...first, selection: { order: 'manual' as const, items: [{ kind: 'reviewer' as const, id: 'two' }] } };
 await act(async () => value.queuePreview(first)); await tick(400);
 await act(async () => value.queuePreview(second));
 await act(async () => finish(result('old-selection'))); expect(value.preview).toBeNull();
 await tick(400); expect(value.previewRequest).toEqual(second); expect(value.preview?.algorithmVersion).toBe('new-selection');
});
