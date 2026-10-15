import type { GenerationProvider } from "@stay-focused/engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { estimateStore } from "./task-estimates.fixtures";
import { estimateFingerprint, estimateTasks, refreshCanvasTaskEstimates, TASK_ESTIMATE_TIMEOUT_MS, taskEstimateModel, type EstimateCandidate } from "./task-estimates";

const now = Date.parse("2026-10-12T00:00:00Z");
function candidate(taskId = "one"): EstimateCandidate {
  const details = { title: "Quiz", description: "Complete a quiz", submissionTypes: ["online_quiz"], pointsPossible: 10, gradingType: "points" };
  return { ...details, taskId, courseLabel: "CC6", fingerprint: estimateFingerprint(details) };
}
function provider(output: unknown): GenerationProvider {
  return { generate: vi.fn().mockResolvedValue(output) };
}
beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("batched task estimates", () => {
  it("uses low effort, structured output, rounds minutes and normalizes bounded notes", async () => {
    const fake = provider({ estimates: [{ taskId: "one", minutes: 43, reason: "  Short\n quiz  " }] });
    expect(await estimateTasks([candidate()], fake, { allowAi: true, model: "test-model" }))
      .toEqual([{ taskId: "one", minutes: 45, note: "Short quiz", source: "ai" }]);
    expect(fake.generate).toHaveBeenCalledWith(expect.objectContaining({ model: "test-model", maxOutputTokens: 1500, reasoningEffort: "low",
      schema: expect.objectContaining({ name: "task_time_estimates" }) }));
  });
  it.each([[], [{ taskId: "one", minutes: 9, reason: "Quiz" }], [{ taskId: "one", minutes: 601, reason: "Quiz" }],
    [{ taskId: "one", minutes: 30, reason: " " }], [null], [{ taskId: "one", minutes: 30.5, reason: "Quiz" }],
    [{ taskId: "one", minutes: 30, reason: "Quiz" }, { taskId: "one", minutes: 45, reason: "Other" }]].map(estimates => ({ estimates })))
    ("falls back only for invalid or missing task output: %j", async ({ estimates }) => {
      const output = { estimates: [...estimates, { taskId: "two", minutes: 90, reason: "Lab" }] };
      const result = await estimateTasks([candidate(), candidate("two")], provider(output), { allowAi: true });
      expect(result[0]).toMatchObject({ minutes: 30, source: "heuristic" });
      expect(result[1]).toMatchObject({ minutes: 90, source: "ai" });
    });
  it.each([null, undefined, "bad", { estimates: {} }])("handles malformed top-level output: %j", async output => {
    expect((await estimateTasks([candidate()], provider(output), { allowAi: true }))[0]?.source).toBe("heuristic");
  });
  it("falls back after provider failure without logging private errors", async () => {
    const fake = { generate: vi.fn().mockRejectedValue(new Error("private details")) };
    expect((await estimateTasks([candidate()], fake, { allowAi: true }))[0]?.source).toBe("heuristic");
    expect(console.warn).toHaveBeenCalledWith("task_estimates.refresh_failed", { code: "provider_unavailable", count: 1 });
  });
  it("times out at 15 seconds and clears the timer on successful completion", async () => {
    vi.useFakeTimers();
    const result = estimateTasks([candidate()], { generate: () => new Promise(() => {}) }, { allowAi: true });
    await vi.advanceTimersByTimeAsync(TASK_ESTIMATE_TIMEOUT_MS);
    expect((await result)[0]?.source).toBe("heuristic");
    await estimateTasks([candidate()], provider({ estimates: [{ taskId: "one", minutes: 30, reason: "Quiz" }] }), { allowAi: true });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("makes zero calls without AI permission or candidates", async () => {
    const fake = provider({});
    await estimateTasks([candidate()], fake, { allowAi: false });
    await estimateTasks([], fake, { allowAi: true });
    expect(fake.generate).not.toHaveBeenCalled();
  });
  it("sends at most ten tasks in one provider request", async () => {
    const fake = provider({ estimates: [] });
    await estimateTasks(Array.from({ length: 12 }, (_, i) => candidate(String(i))), fake, { allowAi: true });
    expect(fake.generate).toHaveBeenCalledOnce();
    const call = vi.mocked(fake.generate).mock.calls[0]![0];
    expect(JSON.parse(call.prompt).tasks).toHaveLength(10);
  });
  it("fingerprints all estimating inputs and ignores submission order", () => {
    const input = candidate();
    expect(estimateFingerprint(input)).toHaveLength(64);
    for (const change of [{ title: "New" }, { description: "New" }, { submissionTypes: ["online_upload"] }, { pointsPossible: 100 }, { gradingType: "percent" }]) {
      expect(estimateFingerprint({ ...input, ...change })).not.toBe(input.fingerprint);
    }
    expect(estimateFingerprint({ ...input, submissionTypes: ["a", "b"] })).toBe(estimateFingerprint({ ...input, submissionTypes: ["b", "a"] }));
    expect(taskEstimateModel({ TASK_ESTIMATE_MODEL: " model " })).toBe("model");
  });
});

describe("owner-scoped Canvas estimate refresh", () => {
  it("updates ten tasks, leaves the rest pending, and scopes every query", async () => {
    const store = estimateStore(12);
    await refreshCanvasTaskEstimates(store.client, "owner", null, now);
    expect(store.tasks.filter(t => t.estimate_source === "heuristic")).toHaveLength(10);
    expect(store.tasks.filter(t => t.estimate_source === "default")).toHaveLength(2);
    for (const query of store.queries) expect(query.filters).toContainEqual(["eq", "user_id", "owner"]);
  });
  it("preserves a concurrent user estimate", async () => {
    const store = estimateStore();
    store.state.beforeUpdate = () => Object.assign(store.tasks[0]!, { estimate_source: "user", estimated_minutes: 45, estimate_note: null });
    await refreshCanvasTaskEstimates(store.client, "owner", null, now);
    expect(store.tasks[0]).toMatchObject({ estimate_source: "user", estimated_minutes: 45 });
  });
  it("does not revisit unchanged heuristics over the daily cap but retries them later", async () => {
    const store = estimateStore();
    await refreshCanvasTaskEstimates(store.client, "owner", null, now);
    const fake = provider({ estimates: [{ taskId: store.tasks[0]!.id, minutes: 43, reason: "Short quiz" }] });
    store.state.recentAi = 40;
    const queryCount = store.queries.length;
    await refreshCanvasTaskEstimates(store.client, "owner", fake, now);
    expect(fake.generate).not.toHaveBeenCalled();
    expect(store.queries.slice(queryCount).filter(q => q.filters.some(f => f[1] === "updated_at"))).toHaveLength(0);
    store.state.recentAi = 0;
    await refreshCanvasTaskEstimates(store.client, "owner", fake, now);
    expect(store.tasks[0]).toMatchObject({ estimate_source: "ai", estimated_minutes: 45, estimate_note: "Short quiz" });
  });
  it("estimates changed AI content once, including edits beyond the prompt truncation", async () => {
    const store = estimateStore();
    store.assignments[0]!.description_html = "x".repeat(3100);
    const fake = provider({ estimates: [{ taskId: store.tasks[0]!.id, minutes: 70, reason: "Long instructions" }] });
    await refreshCanvasTaskEstimates(store.client, "owner", fake, now);
    await refreshCanvasTaskEstimates(store.client, "owner", fake, now);
    expect(fake.generate).toHaveBeenCalledOnce();
    store.assignments[0]!.description_html += " changed";
    await refreshCanvasTaskEstimates(store.client, "owner", fake, now);
    expect(fake.generate).toHaveBeenCalledTimes(2);
    expect(JSON.parse(vi.mocked(fake.generate).mock.calls[1]![0].prompt).tasks[0].instructions).toHaveLength(3000);
  });
  it("uses heuristics for a batch exceeding the remaining daily budget", async () => {
    const store = estimateStore(2); store.state.recentAi = 39;
    const fake = provider({});
    await refreshCanvasTaskEstimates(store.client, "owner", fake, now);
    expect(fake.generate).not.toHaveBeenCalled();
    expect(store.tasks.every(t => t.estimate_source === "heuristic")).toBe(true);
  });
  it("walks past an unchanged full page to reach new assignments", async () => {
    const store = estimateStore(101);
    for (let i = 0; i < 100; i++) {
      store.tasks[i]!.estimate_source = "ai";
      store.tasks[i]!.estimate_fingerprint = estimateFingerprint({ title: `Assignment ${i}`, description: "Complete the quiz.", submissionTypes: ["online_quiz"], pointsPossible: 10, gradingType: "points" });
    }
    await refreshCanvasTaskEstimates(store.client, "owner", null, now);
    expect(store.tasks[100]!.estimate_source).toBe("heuristic");
  });
  it("never throws or leaks academic content on storage failures", async () => {
    const store = estimateStore(); store.state.failTable = "canvas_assignments";
    await expect(refreshCanvasTaskEstimates(store.client, "owner", null, now)).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("task_estimates.refresh_failed", { code: "assignments_load_failed", count: 0 });
  });
});
