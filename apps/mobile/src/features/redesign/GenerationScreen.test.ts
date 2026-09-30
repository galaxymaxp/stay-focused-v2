import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationView } from "@stay-focused/shared";
import type { GenerationIntent } from "../../services/generationRecovery";
import { GenerationScreen } from "./GenerationScreen";

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  read: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  generation: null as GenerationView | null,
  params: { intent: "pending-key" } as Record<string, string>,
  persistedId: null as string | null,
  storeCompleted: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: { push: mocks.push, replace: mocks.replace },
  useLocalSearchParams: () => mocks.params,
}));
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
  mocks.params = { intent: "pending-key" };
  mocks.generation = null;
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
