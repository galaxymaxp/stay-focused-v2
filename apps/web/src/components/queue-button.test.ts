vi.mock('../features/course-batch-queue', () => ({ CourseBatchQueue: () => null }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { job } from '../testSupport/queueJob';
const mocks = vi.hoisted(() => ({
  data: {
    sections: [] as { key: string; title: string; jobs: import('@stay-focused/shared').ProcessingJobStatusView[] }[],
    data: { jobs: [], nextCursor: null, courseBatches: undefined as import('@stay-focused/shared').CourseBatchQueue | undefined },
    loading: false,
    refreshing: false,
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
  mocks.data.sections = [];
  mocks.data.data.courseBatches = undefined;
  mocks.data.loading = false;
  mocks.data.refreshing = false;
  mocks.router.replace.mockImplementation((path: string) => {
    mocks.search = new URLSearchParams(path.split("?")[1]?.split("#")[0]);
  });
  doc = new EventTarget();
  Object.assign(doc, { documentElement: { dataset: { theme: 'light' } } });
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
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
  expect(mocks.buttonFocus).toHaveBeenCalled();
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
  mocks.data.sections = [{ key: 'running', title: 'Generating', jobs: [job({ status: 'running' })] }];
  const root = await render();
  expect(
    root.findAll((n) => n.props.className === "queue-count shown")[0]!.props
      .children,
  ).toBe(2);
  expect(
    root.findAll((n) => n.props.className === "queue-error-dot"),
  ).toHaveLength(1);
  await act(async () => root.findAllByType("button")[0]!.props.onClick());
  expect(JSON.stringify(rendered!.toJSON())).not.toContain('Nothing generating right now.');
  mocks.data.generating = 0;
  mocks.data.queued = 0;
  mocks.data.unseenError = false;
  mocks.data.sections = [];
  await act(async () => rendered!.update(createElement(QueueButton)));
  expect(root.findAllByType('p')[0]!.props.children).toBe('Nothing generating right now.');
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

it('uses an icon refresh in the header and ignores taps while loading or refreshing', async () => {
  const root = await render();
  await act(async () => root.findAllByType('button')[0]!.props.onClick());
  mocks.data.refresh.mockClear();
  const refresh = () => root.findByProps({ 'aria-label': 'Refresh queue' });
  expect(refresh().props.className).toBe('icon-button');
  expect(refresh().parent!.props.className).toContain('queue-popover-header');
  expect(refresh().findByType('span').props.style.maskImage).toBe('url(/icons/refresh-cw.svg)');
  await act(async () => refresh().props.onClick());
  expect(mocks.data.refresh).toHaveBeenCalledOnce();
  for (const state of ['loading', 'refreshing'] as const) {
    mocks.data[state] = true;
    await act(async () => rendered!.update(createElement(QueueButton)));
    expect(refresh().props.disabled).toBe(true);
    expect(refresh().props['aria-busy']).toBe(true);
    await act(async () => refresh().props.onClick());
    expect(mocks.data.refresh).toHaveBeenCalledOnce();
    mocks.data[state] = false;
  }
});
it('finished batches allow idle while partial summaries alone prevent it', async () => {
  mocks.data.data.courseBatches = { requests: [], summaries: [{ batchKey: 'batch', done: 4, total: 4 }] };
  const root = await render();
  await act(async () => root.findAllByType('button')[0]!.props.onClick());
  expect(JSON.stringify(rendered!.toJSON())).toContain('Nothing generating right now.');
  mocks.data.data.courseBatches = { requests: [], summaries: [{ batchKey: 'batch', done: 3, total: 4 }] };
  await act(async () => rendered!.update(createElement(QueueButton)));
  expect(JSON.stringify(rendered!.toJSON())).not.toContain('Nothing generating right now.');
});
it.each(['running', 'queued', 'failed', 'expired', 'cancellation_requested', 'cancelled', 'succeeded'] as const)('idle considers visible %s jobs even with other sections', async status => {
  mocks.data.sections = [{ key: 'section', title: 'Section', jobs: [job({ status })] }];
  const root = await render();
  await act(async () => root.findAllByType('button')[0]!.props.onClick());
  expect(JSON.stringify(rendered!.toJSON()).includes('Nothing generating right now.')).toBe(status === 'succeeded');
});
it.each(['waiting', 'quota', 'failed'] as const)('a %s batch request prevents idle independently of sections', async state => {
  mocks.data.data.courseBatches = { summaries: [], requests: [{ id: 'r', batchKey: 'b', courseId: 'c', materialId: 'm', title: 'Lesson', state, jobId: null, nextAvailableAt: null }] };
  const root = await render();
  await act(async () => root.findAllByType('button')[0]!.props.onClick());
  expect(JSON.stringify(rendered!.toJSON())).not.toContain('Nothing generating right now.');
});
