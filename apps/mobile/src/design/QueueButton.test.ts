import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ activity: { active: false, syncing: false, generating: 0, queued: 0, refresh: () => {} } }));
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));
vi.mock("../../assets/queue/orb-dark.png", () => ({ default: "orb-dark" }));
vi.mock("../../assets/queue/orb-light.png", () => ({ default: "orb-light" }));
vi.mock("./appActivity", () => ({ useAppActivity: () => state.activity }));
vi.mock("./theme", async () => {
  const tokens = await import("./themeTokens");
  return { ...tokens, shouldAnimate: () => false, useTheme: () => ({ colors: tokens.palettes.dark, mode: "dark", reducedMotion: true, active: true }) };
});
vi.mock("react-native", () => {
  class Value { setValue() {} stopAnimation() {} interpolate(config: unknown) { return config; } }
  return {
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    Easing: { out: () => 0, cubic: 0, linear: 0 },
    Animated: { View: "AnimatedView", Image: "AnimatedImage", Value, timing: () => ({ start() {} }), spring: () => ({ start() {} }), loop: () => ({ start() {}, stop() {} }) },
  };
});

const { QueueButton } = await import("./QueueButton");
let rendered: ReactTestRenderer | undefined;
beforeEach(() => Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }));
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
async function render() {
  await act(async () => {
    rendered = create(createElement(QueueButton));
  });
  return rendered!.root;
}

describe("QueueButton", () => {
  it("is a still orb with no count when nothing is queued", async () => {
    state.activity = { active: false, syncing: false, generating: 0, queued: 0, refresh: () => {} };
    const root = await render();
    expect(root.findAll((node) => String(node.type) === "AnimatedImage")).toHaveLength(1);
    expect(root.findAll((node) => node.props.testID === "queue-count")).toHaveLength(0);
    expect(root.findAll((node) => node.props.testID === "queue-button")[0]!.props.accessibilityLabel).toBe("Open Queue");
  });

  it("shows how much work is queued on the left while generating", async () => {
    state.activity = { active: true, syncing: false, generating: 1, queued: 2, refresh: () => {} };
    const root = await render();
    const count = root.findAll((node) => node.props.testID === "queue-count")[0]!;
    expect(count.findByType("Text" as never).props.children).toBe(3);
    const row = root.findAll((node) => node.props.testID === "queue-button")[0]!;
    expect(row.props.accessibilityLabel).toBe("Open Queue, 1 generating, 2 queued");
  });
});
