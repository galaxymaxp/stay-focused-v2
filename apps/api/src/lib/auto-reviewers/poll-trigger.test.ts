import { describe, expect, it, vi } from "vitest";
import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { detectNewInstructionalModuleItems, maybeRequestContentSync, moduleItemIds } from "./poll-trigger";

const items = [
  { canvas_module_item_id: "1", item_type: "File", title: "Edited" },
  { canvas_module_item_id: "2", item_type: "Page" },
  { canvas_module_item_id: "3", item_type: "Assignment" },
  { canvas_module_item_id: "4", item_type: "File" },
];
describe("poll instructional evidence", () => {
  it("returns only new File/Page IDs, deduplicated", () => {
    expect(detectNewInstructionalModuleItems(["1"], { moduleItems: [...items, items[1]!] })).toEqual(["2", "4"]);
    expect(moduleItemIds({ moduleItems: items })).toEqual(["1", "2", "3", "4"]);
  });
  it("changed existing items trigger none", () => {
    expect(detectNewInstructionalModuleItems(["1", "2", "3", "4"], { moduleItems: items })).toEqual([]);
  });
  it("baselines missing/hash-only evidence and preserves failed scope evidence", () => {
    for (const previous of [undefined, "hash", [123]]) expect(detectNewInstructionalModuleItems(previous, { moduleItems: items })).toEqual([]);
    expect(detectNewInstructionalModuleItems(["1"], { moduleItems: null })).toEqual([]);
  });
});

const input = { userId: "owner", courseId: "course", newItemCount: 2, now: Date.parse("2026-10-13T00:00:00Z") };
function setup(allowed = true) {
  const rpc = vi.fn().mockResolvedValue({ data: allowed, error: null });
  const client = { rpc } as unknown as SupabaseClient<Database>;
  const create = vi.fn().mockResolvedValue({ id: "accepted-job" });
  const dispatch = vi.fn().mockResolvedValue({ id: "accepted-job" });
  return { client, rpc, create, dispatch };
}
describe("bounded poll sync admission", () => {
  it("requests and awaits exactly one durable sync for multiple new items", async () => {
    const s = setup();
    expect(await maybeRequestContentSync(s.client, input, s)).toBe(true);
    expect(s.create).toHaveBeenCalledOnce();
    expect(s.create).toHaveBeenCalledWith(s.client, { userId: "owner", courseId: "course", jobType: "course_content", idempotencyKey: `poll-sync:course:${Math.floor(input.now / 21600000)}` });
    expect(s.dispatch).toHaveBeenCalledWith({ id: "accepted-job" }, { client: s.client });
  });
  it.each(["repeat bucket", "automation disabled", "inactive owner", "daily cap"])("does not request when atomic reservation denies %s", async () => {
    const s = setup(false);
    expect(await maybeRequestContentSync(s.client, input, s)).toBe(false);
    expect(s.create).not.toHaveBeenCalled(); expect(s.dispatch).not.toHaveBeenCalled();
  });
  it("does not reserve for unchanged material", async () => {
    const s = setup();
    expect(await maybeRequestContentSync(s.client, { ...input, newItemCount: 0 }, s)).toBe(false);
    expect(s.rpc).not.toHaveBeenCalled();
  });
  it.each(["create", "dispatch"] as const)("swallows %s errors and logs only counts", async phase => {
    const s = setup(); s[phase].mockRejectedValue(new Error("secret academic payload"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await maybeRequestContentSync(s.client, input, s)).toBe(false);
    expect(log).toHaveBeenCalledWith("auto_reviewers.poll_sync_unavailable", { newItemCount: 2, requested: 0 });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  });
  it("fails closed on reservation storage error", async () => {
    const s = setup(); s.rpc.mockResolvedValue({ data: null, error: { message: "private" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await maybeRequestContentSync(s.client, input, s)).toBe(false);
    expect(s.create).not.toHaveBeenCalled();
  });
});
