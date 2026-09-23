import { createElement, type ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationIntent } from "../../services/generationRecovery";
import { GenerationScreen } from "./GenerationScreen";

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  read: vi.fn(),
  push: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: { push: mocks.push, replace: vi.fn() },
  useLocalSearchParams: () => ({ intent: "pending-key" }),
}));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: { user: { id: "owner" } } }) }));
vi.mock("../../services/generationRecovery", () => ({
  acceptGeneration: mocks.accept,
  readGenerationIntents: mocks.read,
}));
vi.mock("../../services/localLibrary/deviceLibrary", () => ({ storeCompletedGeneration: vi.fn() }));
vi.mock("../../services/localLibrary/librarySync", () => ({ persistedArtifactId: () => null }));
vi.mock("./GenerationVisual", () => ({ GenerationVisual: "GenerationVisual" }));
vi.mock("./useExperience", () => ({
  useExperienceClient: () => ({ baseUrl: "https://api.example", accessToken: "token" }),
  useExperience: () => ({ data: null, error: null, refresh: vi.fn() }),
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
  it("does not accept on mount and accepts exactly once after explicit confirmation", async () => {
    const root = await render(createElement(GenerationScreen));
    expect(mocks.accept).not.toHaveBeenCalled();
    const confirm = root.findAll(node => String(node.type) === "Action").find(node => node.props.children === "Confirm generation")!;
    await act(async () => { await confirm.props.onPress(); });
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(mocks.accept).toHaveBeenCalledWith("owner", expect.anything(), pending);
  });

  it("collapses repeated confirmation taps into one acceptance operation", async () => {
    let release: ((value: GenerationIntent) => void) | undefined;
    mocks.accept.mockImplementation(() => new Promise<GenerationIntent>(resolve => { release = resolve; }));
    const root = await render(createElement(GenerationScreen));
    const confirm = root.findAll(node => String(node.type) === "Action").find(node => node.props.children === "Confirm generation")!;
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
    expect(root.findAll(node => String(node.type) === "Action" && node.props.children === "Confirm generation")).toHaveLength(0);
  });
});
