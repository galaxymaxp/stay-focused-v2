vi.mock('../features/course-batch-queue', () => ({ CourseBatchQueue: () => null }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  data: {
    sections: [],
    data: { jobs: [], nextCursor: null },
    loading: false,
    error: null,
    generating: 0,
    queued: 0,
    unseenError: false,
    refresh: vi.fn(),
  },
  search: new URLSearchParams(),
  pathname: "/today",
  router: { replace: vi.fn() },
  buttonFocus: vi.fn(),
  panelFocus: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => mocks.search,
  useRouter: () => mocks.router,
  redirect: mocks.redirect,
}));
vi.mock("../features/queue-items", () => ({
  useQueueItems: () => mocks.data,
  countActiveJobs: vi.fn(),
}));
vi.mock("../features/queue", () => ({ QueueCard: "QueueCard" }));
vi.mock("../lib/list-preferences", () => ({
  useListPreferences: () => ({
    prefs: { hidden: { queue: [] } },
    hide: vi.fn(),
  }),
}));
const { QueueButton } = await import("./queue-button");
const { default: QueuePage } = await import("../../app/(app)/queue/page");
let rendered: ReactTestRenderer | undefined, doc: EventTarget, win: EventTarget;
const buttonNode = { focus: mocks.buttonFocus },
  panelNode = { focus: mocks.panelFocus };
const rootNode = {
  contains: (node: unknown) => node === buttonNode || node === panelNode,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = new URLSearchParams();
  mocks.pathname = "/today";
  mocks.data.generating = 0;
  mocks.data.queued = 0;
  mocks.data.unseenError = false;
  mocks.router.replace.mockImplementation((path: string) => {
    mocks.search = new URLSearchParams(path.split("?")[1]?.split("#")[0]);
  });
  doc = new EventTarget();
  win = Object.assign(new EventTarget(), { location: { hash: "" } });
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    document: doc,
    window: win,
  });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
async function render() {
  await act(async () => {
    rendered = create(createElement(QueueButton), {
      createNodeMock: (element) => {
        const props = element.props as Record<string, unknown>;
        return props.className === "queue-control"
          ? rootNode
          : props.id === "queue-popover"
            ? panelNode
            : props["data-testid"] === "queue-button"
              ? buttonNode
              : null;
      },
    });
  });
  return rendered!.root;
}
it("opens from its native keyboard-operable button, focuses the popover, closes on Esc and restores focus", async () => {
  const root = await render();
  const button = root.findByType("button");
  expect(button.props.type).toBe("button");
  expect(button.props["aria-expanded"]).toBe(false);
  await act(async () => button.props.onClick());
  expect(button.props["aria-expanded"]).toBe(true);
  expect(button.props["aria-controls"]).toBe("queue-popover");
  expect(mocks.panelFocus).toHaveBeenCalledOnce();
  expect(root.findAll((n) => n.props.role === "dialog")).toHaveLength(1);
  const esc = Object.assign(new Event("keydown", { cancelable: true }), {
    key: "Escape",
  });
  await act(async () => { doc.dispatchEvent(esc); });
  expect(button.props["aria-expanded"]).toBe(false);
  expect(esc.defaultPrevented).toBe(true);
  expect(mocks.buttonFocus).toHaveBeenCalled();
});
it("closes on an outside pointer and when focus leaves the popover", async () => {
  const root = await render();
  const button = root.findAllByType("button")[0]!;
  await act(async () => button.props.onClick());
  await act(async () => { doc.dispatchEvent(new Event("pointerdown")); });
  expect(button.props["aria-expanded"]).toBe(false);
  await act(async () => button.props.onClick());
  const dialog = root.findAll((n) => n.props.role === "dialog")[0]!;
  await act(async () => dialog.props.onBlur({ relatedTarget: {} }));
  expect(button.props["aria-expanded"]).toBe(false);
});
it("consumes queue=open without removing other params, and accepts in-place View Queue requests", async () => {
  mocks.search = new URLSearchParams("queue=open&keep=yes");
  const root = await render();
  expect(root.findAllByType("button")[0]!.props["aria-expanded"]).toBe(true);
  expect(mocks.router.replace).toHaveBeenCalledWith("/today?keep=yes", {
    scroll: false,
  });
  const esc = Object.assign(new Event("keydown"), { key: "Escape" });
  await act(async () => { doc.dispatchEvent(esc); });
  await act(async () => { win.dispatchEvent(new Event("sf:queue-open")); });
  expect(root.findAllByType("button")[0]!.props["aria-expanded"]).toBe(true);
});
it("shows a running-only badge, an unseen failure dot, and the exact idle empty state", async () => {
  mocks.data.generating = 2;
  mocks.data.queued = 5;
  mocks.data.unseenError = true;
  const root = await render();
  expect(
    root.findAll((n) => n.props.className === "queue-count shown")[0]!.props
      .children,
  ).toBe(2);
  expect(
    root.findAll((n) => n.props.className === "queue-error-dot"),
  ).toHaveLength(1);
  await act(async () => root.findAllByType("button")[0]!.props.onClick());
  expect(root.findAllByType("p")[0]!.props.children).toBe(
    "Nothing generating right now.",
  );
  mocks.data.generating = 0;
  mocks.data.unseenError = false;
  await act(async () => rendered!.update(createElement(QueueButton)));
  expect(
    root.findAll((n) => n.props.className === "queue-count shown"),
  ).toHaveLength(0);
  expect(
    root.findAll((n) => n.props.className === "queue-error-dot"),
  ).toHaveLength(0);
});
it("redirects the old web Queue route to Today with the popover intent", () => {
  QueuePage();
  expect(mocks.redirect).toHaveBeenCalledWith("/today?queue=open");
});
