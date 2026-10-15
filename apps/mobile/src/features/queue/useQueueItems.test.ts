import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { job } from "../../testSupport/queueJob";
const mocks = vi.hoisted(() => ({
  owner: "a",
  sessions: { a: { user: { id: "a" } }, b: { user: { id: "b" } } },
  client: { baseUrl: "local", accessToken: "synthetic" },
  request: vi.fn(),
  read: vi.fn(),
  courses: {
    items: [
      { id: "past", courseState: "past" },
      { id: "current", courseState: "current" },
    ],
  },
  wake: null as null | ((state: string) => void),
}));
vi.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (_name: string, fn: (s: string) => void) => {
      mocks.wake = fn;
      return { remove: vi.fn() };
    },
  },
}));
vi.mock("../../auth", () => ({
  useAuth: () => ({ session: mocks.sessions[mocks.owner as "a" | "b"] }),
}));
vi.mock("../../services/experienceApi", () => ({
  experienceRequest: mocks.request,
}));
vi.mock("../../services/generationRecovery", () => ({
  readGenerationIntents: mocks.read,
  attributeGenerationIntent: vi.fn(),
  discardGenerationIntents: vi.fn(),
}));
vi.mock("../redesign/useExperience", () => ({
  useExperienceClient: () => mocks.client,
  useExperience: () => ({ data: mocks.courses }),
}));
vi.mock("../redesign/useListPreferences", () => ({
  useListPreferences: () => ({
    prefs: { hidden: { queue: [] } },
    hide: vi.fn(),
  }),
}));
const { useQueueSource, useQueueGroups, QueueItemsContext, useJobRead } = await import(
  "./useQueueItems"
);
let source: ReturnType<typeof useQueueSource>,
  groups: ReturnType<typeof useQueueGroups>;
function Pending() {
  groups = useQueueGroups();
  return null;
}
function Probe() {
  source = useQueueSource();
  return createElement(
    QueueItemsContext.Provider,
    { value: source },
    createElement(Pending),
  );
}
let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.owner = "a";
  mocks.read.mockResolvedValue([]);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
});
it("shares counts and data, polls adaptively, marks failures seen, and isolates account changes", async () => {
  mocks.request.mockResolvedValue({
    jobs: [job(), job({ id: "failed", status: "failed" })],
    nextCursor: null,
  });
  await act(async () => {
    rendered = create(createElement(Probe));
  });
  expect(source.generating).toBe(1);
  expect(source.unseenError).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
  expect(mocks.request).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(mocks.request).toHaveBeenCalledTimes(2);
  await act(async () => source.show());
  expect(source.unseenError).toBe(false);
  await act(async () => source.close());
  expect(source.unseenError).toBe(false);
  mocks.request.mockResolvedValue({ jobs: [], nextCursor: null });
  await act(async () => source.refresh());
  const count = mocks.request.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(29999); });
  expect(mocks.request).toHaveBeenCalledTimes(count);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(mocks.request).toHaveBeenCalledTimes(count + 1);
  mocks.owner = "b";
  mocks.request.mockReturnValue(new Promise(() => {}));
  await act(async () => rendered!.update(createElement(Probe)));
  expect(source.data).toBeNull();
  expect(source.generating).toBe(0);
  expect(source.open).toBe(false);
});
it("retains CQ1 past-course exclusion for local unaccepted requests", async () => {
  mocks.request.mockResolvedValue({ jobs: [], nextCursor: null });
  mocks.read.mockResolvedValue([
    {
      key: "past-request",
      title: "old",
      courseId: "past",
      body: {},
      generationId: null,
    },
    {
      key: "current-request",
      title: "new",
      courseId: "current",
      body: {},
      generationId: null,
    },
  ]);
  await act(async () => {
    rendered = create(createElement(Probe));
  });
  expect(groups.visiblePending.map((item) => item.key)).toEqual([
    "current-request",
  ]);
});

it('shares AppActivity and detail in one request and deduplicates simultaneous refreshes', async () => {
  let detail!: ReturnType<typeof useJobRead>;
  function Detail() { detail = useJobRead('job'); return null; }
  function WithDetail() {
    source = useQueueSource();
    return createElement(QueueItemsContext.Provider, { value: source }, createElement(Detail));
  }
  mocks.request.mockResolvedValue({ jobs: [job()], nextCursor: null, detailId: 'job', detail: { job: job(), generation: { id: 'job', state: 'generating', artifactId: null } } });
  await act(async () => { rendered = create(createElement(WithDetail)); });
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(mocks.request.mock.calls[0]![1]).toContain('&detailId=job');
  expect(detail.data?.state).toBe('generating');
  await act(async () => { source.refresh(); detail.refresh(); });
  expect(mocks.request).toHaveBeenCalledTimes(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(mocks.request).toHaveBeenCalledTimes(3);
});
