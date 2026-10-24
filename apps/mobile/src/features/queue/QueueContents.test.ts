import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { job } from "../../testSupport/queueJob";
import { queueItems } from "./queuePresentation";
const mocks = vi.hoisted(() => ({
  jobs: [] as import("@stay-focused/shared").ProcessingJobStatusView[],
  courseBatches: undefined as import('@stay-focused/shared').CourseBatchQueue | undefined,
  pending: [] as { key: string; title: string; type: string }[],
  error: null as string | null,
  request: vi.fn(),
  close: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  key: vi.fn(() => "stable-retry-key"),
}));
vi.mock("expo-router", () => ({ router: { push: mocks.push } }));
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable" }));
vi.mock("lucide-react-native", () => ({
  CheckCircle2: "Icon",
  CircleDashed: "Icon",
  Clock3: "Icon",
  AlertCircle: "Icon",
}));
vi.mock("../../design/primitives", () => ({
  Action: "Action",
  Copy: "Copy",
  Notice: "Notice",
  Surface: "Surface",
  RowLink: "RowLink",
  ContentIcon: "Icon",
  SkeletonCards: "Skeleton",
}));
vi.mock("../../design/theme", () => ({ useTheme: () => ({ colors: {} }) }));
vi.mock("../../design/appActivity", () => ({
  useAppActivity: () => ({ refresh: mocks.refresh }),
}));
vi.mock("../../services/experienceApi", () => ({
  experienceRequest: mocks.request,
  newRequestKey: mocks.key,
}));
vi.mock("../redesign/useExperience", () => ({
  useExperienceClient: () => ({ baseUrl: "local", accessToken: "synthetic" }),
}));
vi.mock("./useQueueItems", () => ({
  useQueueItems: () => ({
    data: { jobs: mocks.jobs, courseBatches: mocks.courseBatches },
    error: mocks.error,
    refresh: mocks.refresh,
    close: mocks.close,
  }),
  useQueueGroups: () => {
    const sections = queueItems(mocks.jobs);
    return {
      sections,
      attention: sections.find((s) => s.key === "attention")?.jobs ?? [],
      completed: sections.find((s) => s.key === "completed")?.jobs ?? [],
      visiblePending: mocks.pending,
      needsAttention: false,
      clearAttention: vi.fn(),
      hide: vi.fn(),
      error: null,
      jobs: mocks.jobs,
    };
  },
}));
const { QueueContents } = await import("./QueueContents");
let rendered: ReactTestRenderer | undefined;
function copyText() {
  return rendered!.root.findAllByType('Copy' as never)
    .flatMap(node => node.props.children)
    .filter(value => typeof value === 'string' || typeof value === 'number').join(' ');
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.courseBatches = undefined;
  mocks.pending = [];
  mocks.error = null;
  mocks.request.mockReset();
  mocks.key.mockReset().mockReturnValue('stable-retry-key');
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

it('finished batches and completed outputs allow idle without batch progress; partial batches prevent it', async () => {
  mocks.jobs = [job({ status: 'succeeded' })];
  mocks.courseBatches = { requests: [], summaries: [{ batchKey: 'batch', done: 4, total: 4 }] };
  await render();
  expect(copyText()).toContain('Nothing generating right now.');
  expect(copyText()).not.toContain(' of ');
  mocks.courseBatches = { requests: [], summaries: [{ batchKey: 'batch', done: 3, total: 4 }] };
  await act(async () => rendered!.update(createElement(QueueContents)));
  expect(copyText()).not.toContain('Nothing generating right now.');
  expect(copyText()).not.toContain('Reviewers and quizzes you generate');
});
it.each(['running', 'queued', 'failed', 'expired', 'cancellation_requested', 'cancelled'] as const)('never says idle with a visible %s job', async status => {
  mocks.jobs = [job({ status })];
  await render();
  expect(copyText()).not.toContain('Nothing generating right now.');
});
it('pending intents and refresh failures prevent the idle message', async () => {
  mocks.jobs = [];
  mocks.pending = [{ key: 'intent', title: 'Unaccepted request', type: 'reviewer' }];
  await render();
  expect(copyText()).not.toContain('Nothing generating right now.');
  mocks.pending = [];
  mocks.error = 'Could not refresh Queue.';
  await act(async () => rendered!.update(createElement(QueueContents)));
  expect(copyText()).not.toContain('Nothing generating right now.');
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
async function render() {
  await act(async () => {
    rendered = create(createElement(QueueContents));
  });
  return rendered!.root;
}
describe("mobile Queue dropdown actions", () => {
  it('renders only the latest failure per kind/material with count, quiz reason and pill retry', async () => {
    const title='Very long synthetic source '.repeat(8)+'.pdf';
    mocks.jobs=[job({id:'old',status:'failed',retryable:true,failedAt:'2026-10-23'}),job({id:'latest',status:'failed',retryable:true,origin:'automatic',failedAt:'2026-10-24'}),job({id:'quiz',jobType:'quiz_generation',status:'failed',retryable:true,source:{...job().source,displayName:title}})];
    const root=await render();
    expect(root.findAllByType('Surface' as never)).toHaveLength(2);
    expect(copyText()).toContain('Failed 2 times');
    expect(copyText()).toContain('Auto');
    expect(copyText()).toContain("Couldn't finish · Stopped while building questions. Your material is safe.");
    expect(root.findAllByType('RowLink' as never).some(node=>node.props.label.startsWith(`View generation: ${title}`))).toBe(true);
    const retry=root.findAllByType('Action' as never).find(node=>node.props.children==='Try again')!;
    expect(retry.props).toMatchObject({secondary:true,pill:true});
    mocks.request.mockResolvedValueOnce({id:'accepted'});
    await act(async()=>retry.props.onPress());
    expect(mocks.request.mock.calls[0]![1]).toBe('/api/jobs/latest/retry');
    expect(mocks.jobs).toHaveLength(3);
  });
  it('uses a fresh key after an accepted retry even when the original card remains mounted', async () => {
    mocks.jobs = [job({ status: 'failed', retryable: true })];
    mocks.key.mockReturnValueOnce('attempt-one').mockReturnValueOnce('attempt-two');
    mocks.request.mockResolvedValueOnce({ id: 'child-one' }).mockResolvedValueOnce({ id: 'child-two' });
    const root = await render();
    const retry = () => root.findAllByType('Action' as never).find(node => node.props.children === 'Try again')!;
    await act(async () => retry().props.onPress());
    await act(async () => retry().props.onPress());
    expect(mocks.request.mock.calls.map(call => call[2].key)).toEqual(['attempt-one', 'attempt-two']);
  });
  it.each(['processing_job_not_retryable', 'quiz_source_capacity_exceeded'])('removes Try again after %s', async code => {
    mocks.jobs = [job({ status: 'failed', retryable: true, stage: 'generating_sections' })];
    mocks.request.mockRejectedValueOnce(Object.assign(new Error('Safe rejection.'), { code }));
    const root = await render();
    expect(root.findAllByType('Copy' as never).flatMap(node => node.props.children).join(' ')).toContain('Stopped while building topics');
    await act(async () => root.findAllByType('Action' as never).find(node => node.props.children === 'Try again')!.props.onPress());
    expect(root.findAllByType('Action' as never).some(node => node.props.children === 'Try again')).toBe(false);
    expect(root.findAllByType('Notice' as never).map(node => node.props.children).join(' ')).toContain('Safe rejection.');
  });
  it("posts a retry once during a double tap, reuses the key after failure, and opens the accepted job", async () => {
    mocks.jobs = [job({ status: "failed", retryable: true })];
    let reject!: (e: Error) => void;
    mocks.request.mockReturnValueOnce(
      new Promise((_, r) => {
        reject = r;
      }),
    );
    const root = await render();
    const retry = root
      .findAllByType("Action" as never)
      .find((n) => n.props.children === "Try again")!;
    await act(async () => {
      retry.props.onPress();
      retry.props.onPress();
    });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    expect(mocks.request.mock.calls[0]!.slice(1)).toEqual([
      "/api/jobs/job-1/retry",
      { method: "POST", key: "stable-retry-key" },
    ]);
    await act(async () => reject(new Error("Unavailable")));
    mocks.request.mockResolvedValueOnce({ id: "retry-job" });
    await act(async () =>
      root
        .findAllByType("Action" as never)
        .find((n) => n.props.children === "Try again")!
        .props.onPress(),
    );
    expect(mocks.request.mock.calls[1]![2].key).toBe("stable-retry-key");
    expect(mocks.close).toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: "/generation",
      params: { id: "retry-job" },
    });
  });
  it("resolves completed output before opening the original artifact destination and keeps Auto", async () => {
    mocks.jobs = [job({ status: "succeeded", origin: "automatic" })];
    mocks.request.mockResolvedValue({ artifactId: "saved-id" });
    const root = await render();
    await act(async () => root.findByType("RowLink" as never).props.onPress());
    expect(mocks.request.mock.calls[0]![1]).toBe(
      "/api/experience/generations/job-1",
    );
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: "/artifact",
      params: { id: "saved-id" },
    });
    expect(
      root
        .findAllByType("Copy" as never)
        .some((n) => n.props.children === "Auto"),
    ).toBe(true);
  });
  it("keeps extraction jobs on the processing route and active jobs on generation", async () => {
    mocks.jobs = [job({ jobType: "document_extraction" })];
    const root = await render();
    await act(async () => root.findByType("RowLink" as never).props.onPress());
    expect(mocks.push).toHaveBeenCalledWith("/processing");
    mocks.jobs = [job()];
    await act(async () => rendered!.update(createElement(QueueContents)));
    await act(async () => root.findByType("RowLink" as never).props.onPress());
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: "/generation",
      params: { id: "job-1" },
    });
  });
  it("does not publish a missing result and shows the requested empty copy", async () => {
    mocks.jobs = [job({ status: "succeeded" })];
    mocks.request.mockResolvedValue({ artifactId: null });
    const root = await render();
    await act(async () => root.findByType("RowLink" as never).props.onPress());
    expect(mocks.push).not.toHaveBeenCalled();
    mocks.jobs = [];
    await act(async () => rendered!.update(createElement(QueueContents)));
    expect(JSON.stringify(rendered!.toJSON())).toContain(
      "Nothing generating right now.",
    );
  });
});
