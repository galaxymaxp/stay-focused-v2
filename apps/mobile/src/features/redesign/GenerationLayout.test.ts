import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GenerationLayout } from "./GenerationLayout";

const mocks = vi.hoisted(() => ({ fontScale: 1 }));
vi.mock("react-native", () => ({
  View: "View",
  useWindowDimensions: () => ({ fontScale: mocks.fontScale }),
}));
vi.mock("../../design/primitives", () => ({
  Action: "Action",
  Copy: "Copy",
  Sheet: "Sheet",
}));
vi.mock("./GenerationCore", () => ({ GenerationCore: "GenerationCore" }));
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  mocks.fontScale = 1;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
});

it.each([
  [320, 530, 230],
  [350, 734, 340],
  [372, 805, 340],
  [600, 250, 100],
])(
  "fits the intact canvas in a measured %ix%i post-chrome viewport",
  async (width, height, slotHeight) => {
    await act(async () => {
      tree = create(
        createElement(GenerationLayout, {
          status: "Queued",
          state: "reading",
          note: "Accepted work keeps going.",
        }),
      );
    });
    const root = tree!.root;
    await act(async () => {
      root
        .findByProps({ testID: "generation-viewport" })
        .props.onLayout({ nativeEvent: { layout: { width, height } } });
      root
        .findByProps({ testID: "generation-orb-space" })
        .props.onLayout({
          nativeEvent: { layout: { width, height: slotHeight } },
        });
    });
    const core = root.findByType("GenerationCore" as never);
    expect(core.props.size).toBe(Math.min(width, slotHeight, 340));
    expect(core.props.size).toBeLessThanOrEqual(height);
    expect(
      root.findByProps({ testID: "generation-viewport" }).props.style,
    ).not.toHaveProperty("overflow", "hidden");
  },
);

it("keeps full title, note, error and all actions in the enlarged-text disclosure, closing it before Queue", async () => {
  mocks.fontScale = 2;
  const queue = vi.fn();
  const title = "A very long title ".repeat(100),
    error = "Full safe error ".repeat(100);
  await act(async () => {
    tree = create(
      createElement(GenerationLayout, {
        title,
        status: "Could not finish",
        state: "error",
        note: "Saved work is safe.",
        notices: error,
        attention: true,
        actions: (close) =>
          createElement(
            "button",
            {
              onPress: () => {
                close();
                queue();
              },
            },
            "View Queue",
          ),
      }),
    );
  });
  const root = tree!.root;
  expect(root.findAllByType("button")).toHaveLength(0);
  const trigger = root.findByType("Action" as never);
  expect(trigger.props.children).toBe("Details and actions");
  await act(async () => trigger.props.onPress());
  const sheet = root.findByType("Sheet" as never);
  expect(
    sheet.findAllByType("Copy" as never).map((node) => node.props.children),
  ).toContain(title);
  expect(sheet.children).toContain(error);
  await act(async () => sheet.findByType("button").props.onPress());
  expect(queue).toHaveBeenCalledOnce();
  expect(root.findAllByType("Sheet" as never)).toHaveLength(0);
});
