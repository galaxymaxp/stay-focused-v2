import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { GenerationView } from "@stay-focused/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { job } from "../testSupport/queueJob";

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  api: vi.fn(),
  replace: vi.fn(),
  key: vi.fn(),
  accepted: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("./queue-items", () => ({ useJobRead: mocks.read }));
vi.mock("next/dynamic", () => ({ default: () => "figure" }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("../components/providers", () => ({
  useAuth: () => ({ api: mocks.api, session: { user: { id: "owner" } } }),
}));
vi.mock("../components/ui", () => ({
  ContentIcon: "Icon",
  Heading: "Heading",
  Notice: "Notice",
  State: "aside",
}));
vi.mock("../components/count-up", () => ({ CountUp: "CountUp" }));
vi.mock("../lib/generation", () => ({
  generationEnabled: true,
  generationKey: mocks.key,
}));
const { GenerationScreen } = await import("./queue");
let rendered: ReactTestRenderer | undefined;
const generation: GenerationView = {
  id: "job-1",
  state: "generating",
  updatedAt: "2026-10-18T00:00:00Z",
  artifactId: null,
  progress: null,
  error: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.mockReset();
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.key.mockReturnValue({ key: "same-key", accepted: mocks.accepted });
  mocks.read.mockReturnValue({
    job: job(),
    data: generation,
    loading: false,
    error: null,
    refresh: mocks.refresh,
  });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
});
async function render() {
  await act(async () => {
    rendered = create(createElement(GenerationScreen, { id: "job-1" }));
  });
  return rendered!.root;
}
const output = () => JSON.stringify(rendered!.toJSON());

describe("web generation layout and actions", () => {
  it("keeps stalled cancellation as the only primary action in the shared column", async () => {
    mocks.read.mockReturnValue({
      job: job({ status: "queued", updatedAt: "2020-01-01T00:00:00Z" }),
      data: { ...generation, state: "queued", updatedAt: "2020-01-01T00:00:00Z" },
      loading: false, error: null, refresh: mocks.refresh,
    });
    const root = await render();
    const column = root.findByProps({ className: "generation-actions" });
    expect(column.findAll(node => typeof node.type === "string" && node.props.className?.split(" ").includes("primary"))).toHaveLength(1);
    const cancel = column.findByProps({ className: "primary" });
    expect(cancel.props.children).toBe("Cancel generation");
    expect(column.findAllByType("a").map(node => node.props.children)).toEqual(["Open Queue", "Leave, it keeps going"]);
    await act(async () => cancel.props.onClick());
    expect(mocks.api).toHaveBeenCalledWith("/api/jobs/job-1/cancel", { method: "POST" });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it("places the orb/status in the left pane and source, stages and running actions in details", async () => {
    mocks.read.mockReturnValue({
      job: job({
        source: {
          displayName: "Synthetic.pdf",
          sourceKind: "pdf",
          mimeType: "application/pdf",
          pageCount: 7,
        },
      }),
      data: generation,
      loading: false,
      error: null,
      refresh: mocks.refresh,
    });
    const root = await render();
    const orb = root.findByProps({ className: "generation-orb-pane" });
    expect(orb.findByType("h1").props["aria-live"]).toBe("polite");
    expect(orb.findAllByType("figure")).toHaveLength(1);
    const details = root.findByProps({ className: "generation-detail-pane" });
    expect(details.findByType("h2").props.children).toBe("Synthetic.pdf");
    expect(output()).toContain("pages");
    expect(
      details.findByType("ol").findAllByProps({ "aria-current": "step" }),
    ).toHaveLength(1);
    expect(
      details
        .findAllByType("a")
        .map((node) => [node.props.children, node.props.href]),
    ).toEqual([
      ["Open Queue", "/queue"],
      ["Leave, it keeps going", "/queue"],
    ]);
    expect(output()).toContain("Cancel generation");
    expect(details.findByProps({ role: "status" })).toBeTruthy();
  });
  it("names the failed stage and preserves MR3 retry acceptance/navigation", async () => {
    mocks.read.mockReturnValue({
      job: job({
        status: "failed",
        retryable: true,
        stage: "verifying_coverage",
      }),
      data: { ...generation, state: "failed" },
      loading: false,
      error: null,
      refresh: mocks.refresh,
    });
    mocks.api.mockResolvedValue({ id: "retry-id" });
    const root = await render();
    expect(output()).toContain("Stopped while checking the reviewer");
    expect(output()).toContain("Stopped here");
    expect(output()).not.toContain("Leave, it keeps going");
    await act(async () =>
      root
        .findByProps({ className: "button primary retry-button" })
        .props.onClick(),
    );
    expect(mocks.api).toHaveBeenCalledWith("/api/jobs/job-1/retry", {
      method: "POST",
      key: "same-key",
    });
    expect(mocks.accepted).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith("/generation/retry-id");
  });
  it("removes retry after a safe denial while retaining Queue", async () => {
    mocks.read.mockReturnValue({
      job: job({ status: "failed", retryable: true }),
      data: { ...generation, state: "failed" },
      loading: false,
      error: null,
      refresh: mocks.refresh,
    });
    mocks.api.mockRejectedValue(
      Object.assign(new Error("Safe denial"), {
        code: "processing_job_not_retryable",
      }),
    );
    const root = await render();
    await act(async () =>
      root
        .findByProps({ className: "button primary retry-button" })
        .props.onClick(),
    );
    expect(output()).not.toContain("Try again");
    expect(output()).toContain("Open Queue");
  });
  it.each([
    ["reviewer_generation", "Open reviewer"],
    ["quiz_generation", "Open quiz"],
    ["activity_generation", "Open Draft"],
  ] as const)(
    "keeps %s saved output primary and the existing automatic open",
    async (jobType, label) => {
      mocks.read.mockReturnValue({
        job: job({ status: "succeeded", jobType }),
        data: { ...generation, state: "completed", artifactId: "saved/output" },
        loading: false,
        error: null,
        refresh: mocks.refresh,
      });
      const root = await render();
      expect(
        root.findByProps({ className: "button primary" }).props,
      ).toMatchObject({ children: label, href: "/library/saved%2Foutput" });
      expect(output()).not.toContain("Try again");
      await act(async () => {
        vi.advanceTimersByTime(1400);
      });
      expect(mocks.replace).toHaveBeenCalledWith("/library/saved%2Foutput");
    },
  );
  it("retains preparation Continue and cancellation handlers", async () => {
    mocks.read.mockReturnValue({
      job: job({ status: "succeeded", jobType: "document_extraction" }),
      data: null,
      loading: false,
      error: null,
      refresh: mocks.refresh,
    });
    const root = await render();
    expect(
      root.findByProps({ className: "button primary" }).props,
    ).toMatchObject({
      children: "Continue",
      href: "/generate/new?extraction=job-1",
    });
    mocks.read.mockReturnValue({
      job: job({ jobType: "document_extraction" }),
      data: null,
      loading: false,
      error: null,
      refresh: mocks.refresh,
    });
    await act(async () =>
      rendered!.update(createElement(GenerationScreen, { id: "job-1" })),
    );
    await act(async () =>
      root
        .findAllByType("button")
        .find((node) => node.props.children === "Cancel preparation")!
        .props.onClick(),
    );
    expect(mocks.api).toHaveBeenCalledWith("/api/jobs/job-1/cancel", {
      method: "POST",
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it.each([true, false])(
    "retains the resource state with no ready layout (loading=%s)",
    async (loading) => {
      mocks.read.mockReturnValue({
        job: null,
        data: null,
        loading,
        error: loading ? null : "This generation is no longer available.",
        refresh: mocks.refresh,
      });
      const root = await render();
      expect(root.findByType("aside").props.resource.loading).toBe(loading);
      expect(
        root.findAllByProps({ className: "generation generation-layout" }),
      ).toHaveLength(0);
    },
  );
});
