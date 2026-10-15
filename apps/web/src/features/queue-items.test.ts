import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { job } from "../testSupport/queueJob";
const mocks = vi.hoisted(() => ({ api: vi.fn(), owner: "a" }));
vi.mock("../components/providers", () => ({
  useAuth: () => ({ api: mocks.api, session: { user: { id: mocks.owner } } }),
}));
const { useQueueItems, countActiveJobs } = await import("./queue-items");
let source: ReturnType<typeof useQueueItems>;
function Probe({ open = false }: { open?: boolean }) {
  source = useQueueItems(open);
  return null;
}
let rendered: ReactTestRenderer | undefined,
  doc: EventTarget & { visibilityState: string },
  win: EventTarget;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.owner = "a";
  doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  win = new EventTarget();
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    document: doc,
    window: win,
  });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
});
it("counts running and stopping as generating, separately from queued work", () => {
  expect(
    countActiveJobs([
      { status: "running" },
      { status: "queued" },
      { status: "cancellation_requested" },
      { status: "failed" },
      { status: "succeeded" },
    ]),
  ).toEqual({ generating: 2, queued: 1 });
});
it("uses one visible-only adaptive poller, deduplicates wakes and stops after unmount", async () => {
  mocks.api.mockResolvedValue({ jobs: [job()], nextCursor: null });
  await act(async () => {
    rendered = create(createElement(Probe));
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(mocks.api).toHaveBeenCalledTimes(2);
  doc.visibilityState = "hidden";
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(mocks.api).toHaveBeenCalledTimes(2);
  let resolve!: (value: unknown) => void;
  mocks.api.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  doc.visibilityState = "visible";
  await act(async () => {
    doc.dispatchEvent(new Event("visibilitychange"));
    win.dispatchEvent(new Event("focus"));
  });
  expect(mocks.api).toHaveBeenCalledTimes(3);
  await act(async () => resolve({ jobs: [], nextCursor: null }));
  await act(async () => { await vi.advanceTimersByTimeAsync(29999); });
  expect(mocks.api).toHaveBeenCalledTimes(3);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(mocks.api).toHaveBeenCalledTimes(4);
  await act(async () => rendered!.unmount());
  rendered = undefined;
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(mocks.api).toHaveBeenCalledTimes(4);
});
it("acknowledges only observed failures and clears all data on an owner change", async () => {
  mocks.api.mockResolvedValue({
    jobs: [job({ status: "failed" })],
    nextCursor: null,
  });
  await act(async () => {
    rendered = create(createElement(Probe));
  });
  expect(source.unseenError).toBe(true);
  await act(async () => rendered!.update(createElement(Probe, { open: true })));
  expect(source.unseenError).toBe(false);
  await act(async () => rendered!.update(createElement(Probe)));
  expect(source.unseenError).toBe(false);
  mocks.api.mockResolvedValue({
    jobs: [job({ status: "expired", id: "new-failure" })],
    nextCursor: null,
  });
  await act(async () => source.refresh());
  expect(source.unseenError).toBe(true);
  mocks.owner = "b";
  mocks.api.mockReturnValue(new Promise(() => {}));
  await act(async () => rendered!.update(createElement(Probe)));
  expect(source.data).toBeNull();
  expect(source.generating).toBe(0);
  expect(source.unseenError).toBe(false);
});
it("retains the last server data during a failed refresh", async () => {
  mocks.api.mockResolvedValue({ jobs: [job()], nextCursor: null });
  await act(async () => {
    rendered = create(createElement(Probe));
  });
  mocks.api.mockRejectedValue(new Error("private provider detail"));
  await act(async () => source.refresh());
  expect(source.generating).toBe(1);
  expect(source.error).toBe("Couldn't refresh Queue. Try again.");
});
