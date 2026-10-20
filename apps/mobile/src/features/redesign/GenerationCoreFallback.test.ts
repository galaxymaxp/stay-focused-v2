import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { GenerationCore } from "./GenerationCore";

vi.mock("expo", () => ({ requireOptionalNativeModule: () => null }));
vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => true }));
vi.mock("react-native", () => ({ View: "View" }));
vi.mock("../../design/theme", () => ({
  useTheme: () => ({ mode: "light", reducedMotion: true, active: true }),
}));
vi.mock("../generation-core/orbInteraction", () => ({
  useOrbInteraction: () => ({}),
}));
vi.mock("./GenerationVisual", () => ({ GenerationVisual: "GenerationVisual" }));

it.each([80, 170, 300, 340])(
  "sizes the no-ExpoGL fallback to the same %i-point canvas",
  async (size) => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        createElement(GenerationCore, { state: "generating", size }),
      );
    });
    expect(
      tree.root.findByType("GenerationVisual" as never).props,
    ).toMatchObject({ running: true, completed: false, size });
    await act(async () => tree.unmount());
  },
);
