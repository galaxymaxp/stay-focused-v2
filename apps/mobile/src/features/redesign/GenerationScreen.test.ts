import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationView } from "@stay-focused/shared";
import type { GenerationIntent } from "../../services/generationRecovery";
import { GenerationScreen } from "./GenerationScreen";

vi.mock("../queue/useQueueItems", () => ({ useQueueItems: () => ({ show: vi.fn(), data: mocks.queueData }), useJobRead: (id: string | null) => { mocks.detailRead(id); return { data: id ? mocks.generation : null, job: { stage: 'generating_sections' }, error: null, refresh: vi.fn() }; } }));

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  read: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  generation: null as GenerationView | null,
  params: { intent: "pending-key" } as Record<string, string>,
  persistedId: null as string | null,
  storeCompleted: vi.fn(),
  focused: true,
  detailRead: vi.fn(),
  request: vi.fn(),
  key: vi.fn(),
  queueData: null as object | null,
}));
vi.mock('../../services/experienceApi', async original => ({ ...await original<typeof import('../../services/experienceApi')>(), experienceRequest: mocks.request, newRequestKey: mocks.key }));

vi.mock("expo-router", () => ({
  router: { push: mocks.push, replace: mocks.replace },
  useLocalSearchParams: () => mocks.params,
}));
vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => mocks.focused }));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: { user: { id: "owner" } } }) }));
vi.mock("../../services/generationRecovery", () => ({
  acceptGeneration: mocks.accept,
  readGenerationIntents: mocks.read,
}));
vi.mock("../../services/localLibrary/deviceLibrary", () => ({ storeCompletedGeneration: mocks.storeCompleted }));
vi.mock("../../services/localLibrary/librarySync", () => ({ persistedArtifactId: () => mocks.persistedId }));
vi.mock("./GenerationCore", () => ({ GenerationCore: "GenerationCore" }));
vi.mock("./useListPreferences", () => ({ useListPreferences: () => ({ prefs: { hidden: { queue: [] } }, hide: vi.fn() }) }));
vi.mock("../../design/appActivity", () => ({ useAppActivity: () => ({ refresh: vi.fn() }) }));
vi.mock("./useExperience", () => ({
  useExperienceClient: () => ({ baseUrl: "https://api.example", accessToken: "token" }),
  useExperience: () => ({ data: mocks.generation, error: null, refresh: vi.fn() }),
}));
vi.mock("../../design/theme", () => ({ useTheme: () => ({ reducedMotion: true, colors: {} }) }));
vi.mock("../../design/primitives", () => ({
  Action: "Action", Copy: "Copy", Notice: "Notice", Page: "Page", Surface: "Surface", RowLink: "RowLink", ContentIcon: "ContentIcon",
}));
vi.mock("lucide-react-native", () => ({ CheckCircle2: "CheckCircle2", CircleDashed: "CircleDashed", Clock3: "Clock3", AlertCircle: "AlertCircle" }));
vi.mock("react-native", () => ({
  View: "View",
  Easing: { out: (value: unknown) => value, ease: "ease" },
  Animated: {
    View: "AnimatedView",
    Value: class { setValue() {} },
    parallel: () => ({ start: (callback?: (value: { finished: boolean }) => void) => callback?.({ finished: true }), stop() {} }),
    timing: () => ({ start() {}, stop() {} }),
  },
}));

let rendered: ReactTestRenderer | undefined;
const pending: GenerationIntent = { key: "pending-key", title: "Reviewer request", type: "reviewer", path: "/api/experience/generations", body: { courseId: "course" } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.key.mockImplementation(() => `retry-key-${mocks.key.mock.calls.length}`);
  mocks.params = { intent: "pending-key" };
  mocks.generation = null;
  mocks.focused = true;
  mocks.queueData = null;
  mocks.persistedId = null;
  mocks.storeCompleted.mockResolvedValue(undefined);
  mocks.read.mockResolvedValue([pending]);
  mocks.accept.mockResolvedValue({ ...pending, generationId: "job-id" });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
async function render(element: ReactElement) {
  await act(async () => { rendered = create(element); });
  return rendered!.root;
}

describe("Queue generation confirmation safety", () => {
  it("observes an admission that finishes after the first intent read without accepting again", async () => {
    let finish!: (value: GenerationIntent) => void;
    mocks.accept.mockImplementationOnce(() => new Promise<GenerationIntent>(resolve => { finish = resolve; }));
    // The originating Generate/Remake handler already invoked admission.
    const admission = mocks.accept("owner", {}, pending);
    await render(createElement(GenerationScreen));
    expect(mocks.detailRead).toHaveBeenLastCalledWith(null);
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    const accepted = { ...pending, generationId: "late-job" };
    await act(async () => { finish(accepted); await admission; });
    mocks.read.mockResolvedValue([accepted]);
    mocks.queueData = {};
    await act(async () => rendered!.update(createElement(GenerationScreen)));
    expect(mocks.detailRead).toHaveBeenLastCalledWith("late-job");
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    mocks.queueData = {};
    await act(async () => rendered!.update(createElement(GenerationScreen)));
    expect(mocks.accept).toHaveBeenCalledTimes(1);
  });
  it('releases the shared detail while covered and subscribes again on return', async () => {
    mocks.params = { id: 'job-id' };
    await render(createElement(GenerationScreen));
    expect(mocks.detailRead).toHaveBeenLastCalledWith('job-id');
    mocks.focused = false;
    await act(async () => rendered!.update(createElement(GenerationScreen)));
    expect(mocks.detailRead).toHaveBeenLastCalledWith(null);
    mocks.focused = true;
    await act(async () => rendered!.update(createElement(GenerationScreen)));
    expect(mocks.detailRead).toHaveBeenLastCalledWith('job-id');
  });
  it("starts a request made from a Generate action at once, exactly once", async () => {
    mocks.params = { intent: "pending-key", start: "1" };
    const root = await render(createElement(GenerationScreen));
    await act(async () => { await Promise.resolve(); });
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(root.findAll(node => String(node.type) === "Action" && node.props.children === "Start generation")).toHaveLength(0);
    const copy = root.findAll(node => String(node.type) === "Copy").map(node => String(node.props.children)).join(" ");
    expect(copy).not.toContain("Ready for confirmation");
  });

  it("an old saved request reopened from Queue waits for Start, then accepts exactly once", async () => {
    const root = await render(createElement(GenerationScreen));
    expect(mocks.accept).not.toHaveBeenCalled();
    // Nothing runs before confirmation, so the Knowledge Core waits quietly.
    expect(root.findAll(node => String(node.type) === "GenerationCore")[0]!.props.state).toBe("idle");
    const confirm = root.findAll(node => String(node.type) === "Action").find(node => node.props.children === "Start generation")!;
    await act(async () => { await confirm.props.onPress(); });
    expect(root.findAll(node => String(node.type) === "GenerationCore")[0]!.props.state).toBe("reading");
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(mocks.accept).toHaveBeenCalledWith("owner", expect.anything(), pending);
  });

  it("collapses repeated confirmation taps into one acceptance operation", async () => {
    let release: ((value: GenerationIntent) => void) | undefined;
    mocks.accept.mockImplementation(() => new Promise<GenerationIntent>(resolve => { release = resolve; }));
    const root = await render(createElement(GenerationScreen));
    const confirm = root.findAll(node => String(node.type) === "Action").find(node => node.props.children === "Start generation")!;
    let first: Promise<void> | undefined;
    await act(async () => {
      first = confirm.props.onPress();
      confirm.props.onPress();
      await Promise.resolve();
    });
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    await act(async () => {
      release?.({ ...pending, generationId: "job-id" });
      await first;
    });
  });

  it("reopens an already accepted intent without a second acceptance call", async () => {
    mocks.read.mockResolvedValue([{ ...pending, generationId: "job-id" }]);
    const root = await render(createElement(GenerationScreen));
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(root.findAll(node => String(node.type) === "Action" && node.props.children === "Start generation")).toHaveLength(0);
  });
});

describe("Draft generation result", () => {
  const failed = (retryable = true): GenerationView => ({ id: 'job-id', state: 'failed', artifactId: null, updatedAt: '2026-10-18', progress: null,
    error: { code: 'generation_failed', title: 'Could not finish', message: 'Could not finish.', retryable, action: retryable ? 'retry' : 'choose_material' } });
  it('does not replace a retried job with the original saved intent on Queue refresh', async () => {
    mocks.read.mockResolvedValue([{ ...pending, generationId: 'job-id' }]);
    mocks.generation = failed();
    const root = await render(createElement(GenerationScreen));
    mocks.request.mockResolvedValueOnce({ id: 'retry-current' });
    await act(async () => root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Try again')[0]!.props.onPress());
    expect(mocks.detailRead).toHaveBeenLastCalledWith('retry-current');
    mocks.queueData = {};
    await act(async () => rendered!.update(createElement(GenerationScreen)));
    expect(mocks.detailRead).toHaveBeenLastCalledWith('retry-current');
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  it('offers Try again with the real stage and safe-material copy; suppresses duplicate taps and makes fresh accepted attempts', async () => {
    mocks.params = { id: 'job-id' }; mocks.generation = failed();
    let accept!: (value: unknown) => void;
    mocks.request.mockReturnValueOnce(new Promise(resolve => { accept = resolve; }));
    const root = await render(createElement(GenerationScreen));
    const retry = () => root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Try again')[0]!;
    expect(JSON.stringify(rendered!.toJSON())).toContain('Stopped while building topics');
    expect(JSON.stringify(rendered!.toJSON())).toContain('Your material is safe.');
    await act(async () => { retry().props.onPress(); retry().props.onPress(); });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await act(async () => accept({ id: 'retry-1' }));
    mocks.generation = { ...failed(), id: 'retry-1' };
    await act(async () => rendered!.update(createElement(GenerationScreen)));
    mocks.request.mockResolvedValueOnce({ id: 'retry-2' });
    await act(async () => retry().props.onPress());
    expect(mocks.request.mock.calls[0]![2].key).not.toBe(mocks.request.mock.calls[1]![2].key);
    expect(mocks.request.mock.calls[1]![1]).toBe('/api/jobs/retry-1/retry');
    expect(mocks.replace).toHaveBeenLastCalledWith({ pathname: '/generation', params: { id: 'retry-2' } });
  });
  it.each(['processing_job_not_retryable', 'quiz_source_capacity_exceeded'])('removes Try again after %s, retaining safe server copy', async code => {
    mocks.params = { id: 'job-id' }; mocks.generation = failed();
    mocks.request.mockRejectedValueOnce(Object.assign(new Error('This job cannot be retried.'), { code }));
    const root = await render(createElement(GenerationScreen));
    await act(async () => root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Try again')[0]!.props.onPress());
    expect(root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Try again')).toHaveLength(0);
    expect(JSON.stringify(rendered!.toJSON())).toContain('This job cannot be retried.');
  });
  it('never offers Try again for a non-retryable job', async () => {
    mocks.params = { id: 'job-id' }; mocks.generation = failed(false);
    const root = await render(createElement(GenerationScreen));
    expect(root.findAll(node => String(node.type) === 'Action' && node.props.children === 'Try again')).toHaveLength(0);
  });
  it("reopens a completed assignment generation directly as the saved Draft", async () => {
    mocks.params = { id: "job-id" };
    mocks.generation = { id: "job-id", state: "completed", artifactId: "activity:saved", updatedAt: "2026-09-29", progress: null, error: null };
    const root = await render(createElement(GenerationScreen));
    const open = root.findAll(node => String(node.type) === "Action").find(node => node.props.children === "Open Draft")!;
    expect(open).toBeDefined();
    expect(root.findAll(node => String(node.type) === "Copy").map(node => String(node.props.children)).join(" ")).toContain("Draft ready");
    await act(async () => open.props.onPress());
    expect(mocks.replace).toHaveBeenCalledWith({ pathname: "/artifact", params: { id: "activity:saved" } });
    expect(mocks.accept).not.toHaveBeenCalled();
  });

  it("keeps Reviewer completion unchanged", async () => {
    mocks.params = { id: "job-id" };
    mocks.generation = { id: "job-id", state: "completed", artifactId: "artifact:saved", updatedAt: "2026-09-29", progress: null, error: null };
    const root = await render(createElement(GenerationScreen));
    expect(root.findAll(node => String(node.type) === "Action" && node.props.children === "Open in Library")).toHaveLength(1);
  });
  it('opens a completed durable Reviewer after attempting the offline Library copy', async () => {
    mocks.params = { id: 'job-id' };
    mocks.persistedId = 'artifact:saved';
    mocks.generation = { id: 'job-id', state: 'completed', artifactId: 'artifact:saved', updatedAt: '2026-09-29', progress: null, error: null };
    await render(createElement(GenerationScreen));
    await act(async () => { await Promise.resolve(); });
    expect(mocks.storeCompleted).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith({ pathname: '/artifact', params: { id: 'artifact:saved' } });
  });
  it('shows the typed failure reason while preserving access to Queue', async () => {
    mocks.params = { id: 'job-id' };
    mocks.generation = { id: 'job-id', state: 'failed', artifactId: null, updatedAt: '2026-09-29', progress: null,
      error: { code: 'insufficient_source', title: 'Not enough lesson content', message: 'Check the Canvas attachment.', retryable: false, action: 'choose_material' } };
    const root = await render(createElement(GenerationScreen));
    expect(root.findAll(node => String(node.type) === 'Notice').map(node => String(node.props.children)).join(' ')).toContain('Check the Canvas attachment.');
    expect(root.findAll(node => String(node.type) === 'Action' && node.props.children === 'View Queue')).toHaveLength(1);
  });
});
