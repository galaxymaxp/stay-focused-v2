import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { job } from "../testSupport/queueJob";
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  push: vi.fn(),
  key: vi.fn(),
  accepted: vi.fn(),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("../components/providers", () => ({
  useAuth: () => ({ api: mocks.api, session: { user: { id: "owner" } } }),
}));
vi.mock("../components/ui", () => ({
  ContentIcon: "Icon",
  Heading: "Heading",
  Notice: "Notice",
  State: "State",
}));
vi.mock("../lib/generation", () => ({
  generationEnabled: true,
  generationKey: mocks.key,
}));
const { QueueCard } = await import("./queue");
let rendered: ReactTestRenderer | undefined;
const close = vi.fn(),
  refresh = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.key.mockReturnValue({ key: "stable-key", accepted: mocks.accepted });
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    window: new EventTarget(),
  });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
});
async function render(j = job()) {
  await act(async () => {
    rendered = create(
      createElement(QueueCard, { job: j, onRefresh: refresh, onOpen: close }),
    );
  });
  return rendered!.root;
}
describe("web Queue actions", () => {
  it('keeps the reason and full-labelled middle-truncated title inside one card with a secondary retry button', async () => {
    const title = 'Synthetic material '.repeat(12) + '.pdf';
    const root = await render(job({ status: 'failed', retryable: true, jobType: 'quiz_generation', source: { ...job().source, displayName: title } }));
    const card = root.findByProps({ className: 'queue-card queue-failure-card' });
    const reason = card.findAllByType('span').find(node => node.props.children === "Couldn't finish · Stopped while building questions. Your material is safe.");
    expect(reason).toBeDefined();
    expect(card.findByProps({ title }).props['aria-label']).toBe(title);
    const retry = card.findAllByType('button').find(node => node.props.children === 'Try again')!;
    expect(retry.props.className).toContain('queue-retry-pill');
    expect(root.findAllByType('p')).toHaveLength(0);
  });
  it('renders the count and exact unknown-stage fallback, including expired jobs', async () => {
    await act(async () => { rendered = create(createElement(QueueCard, {job: job({status:'expired', stage:'future' as never}), failureCount:3, onRefresh:refresh, onOpen:close})); });
    const output = JSON.stringify(rendered!.toJSON());
    expect(output).toContain("Couldn't finish · Stopped before finishing. Your material is safe.");
    expect(output).toContain('Failed');
    expect(output).toContain('times');
  });
  it.each(['processing_job_not_retryable', 'quiz_source_capacity_exceeded'])('removes Try again after %s', async code => {
    mocks.api.mockRejectedValueOnce(Object.assign(new Error('Safe rejection.'), { code }));
    const root = await render(job({ status: 'failed', retryable: true, stage: 'generating_sections' }));
    expect(JSON.stringify(rendered!.toJSON())).toContain('Stopped while building topics');
    await act(async () => root.findAllByType('button').find(node => node.props.children === 'Try again')!.props.onClick());
    expect(root.findAllByType('button').some(node => node.props.children === 'Try again')).toBe(false);
    expect(JSON.stringify(rendered!.toJSON())).toContain('Safe rejection.');
  });
  it("double-tap Retry posts once with the existing owner/job key and opens its accepted job", async () => {
    let resolve!: (value: unknown) => void;
    mocks.api.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const root = await render(job({ status: "failed", retryable: true }));
    const retry = root
      .findAllByType("button")
      .find((n) => n.props.children === "Try again")!;
    await act(async () => {
      retry.props.onClick();
      retry.props.onClick();
    });
    expect(mocks.api).toHaveBeenCalledTimes(1);
    expect(mocks.key).toHaveBeenCalledWith("owner", "retry:job-1", {});
    expect(mocks.api).toHaveBeenCalledWith("/api/jobs/job-1/retry", {
      method: "POST",
      key: "stable-key",
    });
    await act(async () => resolve({ id: "retry-id" }));
    expect(mocks.accepted).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledWith("/generation/retry-id");
    expect(close).toHaveBeenCalled();
  });
  it("retains the retry identity after request failure", async () => {
    mocks.api.mockRejectedValueOnce(new Error("offline"));
    const root = await render(job({ status: "expired", retryable: true }));
    await act(async () =>
      root
        .findAllByType("button")
        .find((n) => n.props.children === "Try again")!
        .props.onClick(),
    );
    expect(mocks.accepted).not.toHaveBeenCalled();
    mocks.api.mockResolvedValueOnce({ id: "recovered" });
    await act(async () =>
      root
        .findAllByType("button")
        .find((n) => n.props.children === "Try again")!
        .props.onClick(),
    );
    expect(mocks.api.mock.calls[1]![1].key).toBe("stable-key");
  });
  it("resolves persisted output before opening the same Library target", async () => {
    mocks.api.mockResolvedValue({ artifactId: "activity:draft" });
    const root = await render(
      job({ status: "succeeded", jobType: "activity_generation" }),
    );
    await act(async () => root.findAllByType("button")[0]!.props.onClick());
    expect(mocks.push).toHaveBeenCalledWith("/library/activity%3Adraft");
    expect(close).toHaveBeenCalled();
  });
  it("keeps extraction and active job Open on their generation detail target", async () => {
    const root = await render(
      job({ status: "succeeded", jobType: "document_extraction" }),
    );
    await act(async () => root.findAllByType("button")[0]!.props.onClick());
    expect(mocks.push).toHaveBeenCalledWith("/generation/job-1");
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("does not navigate when a completed output is missing", async () => {
    mocks.api.mockResolvedValue({ artifactId: null });
    const root = await render(job({ status: "succeeded" }));
    await act(async () => root.findAllByType("button")[0]!.props.onClick());
    expect(mocks.push).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
