import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  refresh: vi.fn(),
  queue: { open: true, anchor: { top: 80, right: 16 } },
}));
vi.mock("react-native", () => ({
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  View: "View",
  useWindowDimensions: () => ({ width: 400, height: 800 }),
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24 }),
}));
vi.mock("../../design/primitives", () => ({ Action: "Action", Copy: "Copy" }));
vi.mock("../../design/theme", () => ({ useTheme: () => ({ colors: {} }) }));
vi.mock("./QueueContents", () => ({ QueueContents: "QueueContents" }));
vi.mock("./useQueueItems", () => ({
  useQueueItems: () => ({
    ...mocks.queue,
    close: mocks.close,
    refresh: mocks.refresh,
  }),
}));
const { QueueDropdown } = await import("./QueueDropdown");
let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
it("anchors under the header and closes on outside tap and Android Back without motion", async () => {
  await act(async () => {
    rendered = create(createElement(QueueDropdown));
  });
  const root = rendered!.root;
  const modal = root.findByType("Modal" as never);
  expect(modal.props.animationType).toBe("none");
  const panel = root
    .findAllByType("View" as never)
    .find((n) => n.props.accessibilityViewIsModal)!;
  expect(panel.props.style.top).toBe(80);
  await act(async () => root.findByType("Pressable" as never).props.onPress());
  await act(async () => modal.props.onRequestClose());
  expect(mocks.close).toHaveBeenCalledTimes(2);
});
