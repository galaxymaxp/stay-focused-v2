import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  refresh: vi.fn(),
  queue: { open: true, loading: false, refreshing: false, anchor: { top: 80, right: 16 } },
}));
vi.mock("react-native", () => ({
  Modal: "Modal",
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  View: "View",
  useWindowDimensions: () => ({ width: 400, height: 800 }),
}));
vi.mock("lucide-react-native", () => ({ RefreshCw: "RefreshCw" }));
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
  mocks.queue.loading = false;
  mocks.queue.refreshing = false;
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
  await act(async () => root.findByProps({ testID: "queue-outside" }).props.onPress());
  await act(async () => modal.props.onRequestClose());
  expect(mocks.close).toHaveBeenCalledTimes(2);
});
it('uses a header icon with a 48-point target and ignores refresh taps while loading or refreshing', async () => {
  await act(async () => { rendered = create(createElement(QueueDropdown)); });
  const root = rendered!.root;
  const refresh = () => root.findByProps({ accessibilityLabel: 'Refresh queue' });
  expect(refresh().props.accessibilityRole).toBe('button');
  expect(refresh().props.style).toMatchObject({ minWidth: 48, minHeight: 48 });
  expect(root.findAllByType('Action' as never).map(node => node.props.children)).toEqual(['Close']);
  await act(async () => refresh().props.onPress());
  expect(mocks.refresh).toHaveBeenCalledOnce();
  for (const state of ['loading', 'refreshing'] as const) {
    mocks.queue[state] = true;
    await act(async () => rendered!.update(createElement(QueueDropdown)));
    expect(refresh().props.disabled).toBe(true);
    expect(refresh().props.accessibilityState).toEqual({ busy: true, disabled: true });
    expect(root.findAllByType('ActivityIndicator' as never)).toHaveLength(1);
    await act(async () => refresh().props.onPress());
    expect(mocks.refresh).toHaveBeenCalledOnce();
    mocks.queue[state] = false;
  }
  await act(async () => rendered!.update(createElement(QueueDropdown)));
  expect(refresh().props.disabled).toBe(false);
});
