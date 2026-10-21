import { createRequire } from "node:module";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  focused: true,
  handle: { state: { current: null }, wake: { current: null } },
}));
vi.mock("expo", () => ({ requireOptionalNativeModule: () => ({}) }));
vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => mocks.focused }));
vi.mock("../../design/theme", () => ({ useTheme: () => ({ mode: "dark", reducedMotion: false, active: true }) }));
vi.mock("react-native", () => ({ View: "View" }));
vi.mock("../generation-core/orbInteraction", () => ({ useOrbInteraction: () => mocks.handle, OrbTouchLayer: "OrbTouchLayer" }));
vi.mock("./GenerationVisual", () => ({ GenerationVisual: "GenerationVisual" }));

// GenerationCore loads DayOrb lazily with require; stand in for the GL module.
const require = createRequire(import.meta.url);
const previousTsx = require.extensions[".tsx"];
let path = "", tree: ReactTestRenderer | undefined;
beforeEach(() => {
  mocks.focused = true;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  require.extensions[".tsx"] = () => {};
  path = require.resolve("./DayOrb");
  require.cache[path] = { id: path, filename: path, loaded: true, exports: { DayOrb: "DayOrb", DAY_ORB_FILL: 0.5 } } as NodeJS.Module;
});
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  delete require.cache[path];
  if (previousTsx) require.extensions[".tsx"] = previousTsx;
  else delete require.extensions[".tsx"];
});

it.each([80, 170, 300, 340])("renders the Today orb and its ball-only touch target at size %i", async size => {
  const { GenerationCore } = await import("./GenerationCore");
  await act(async () => { tree = create(createElement(GenerationCore, { state: "generating", size })); });
  const orb = tree!.root.findByType("DayOrb" as never), touch = tree!.root.findByType("OrbTouchLayer" as never);
  expect(orb.props).toMatchObject({ variant: "standalone", state: "generating", size, live: true, mode: "dark", reducedMotion: false });
  expect(orb.props.interaction).toBe(mocks.handle);
  expect(touch.props).toMatchObject({ interaction: mocks.handle, size: size / 2, left: size / 4, top: size / 4 });
});

it("stops rendering when the generation screen is not focused", async () => {
  mocks.focused = false;
  const { GenerationCore } = await import("./GenerationCore");
  await act(async () => { tree = create(createElement(GenerationCore, { state: "error" })); });
  expect(tree!.root.findByType("DayOrb" as never).props).toMatchObject({ state: "error", live: false, size: 300 });
});
