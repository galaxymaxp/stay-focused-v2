import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanvasCourseRow, Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pollingFetch, pollCanvasCourse } from "./canvas-poll";
const trigger = vi.hoisted(() => vi.fn().mockResolvedValue(false));
vi.mock("@/lib/auto-reviewers/poll-trigger", async original => ({
  ...await original<typeof import("@/lib/auto-reviewers/poll-trigger")>(), maybeRequestContentSync: trigger,
}));
vi.mock("@/lib/canvas-routes", () => ({ decryptConnectionToken: () => "private-test-token" }));
afterEach(() => vi.unstubAllGlobals());
describe("Canvas poll request safety", () => {
  it.each([429, 503])("respects short Retry-After and retries %s with bounded attempts", async status => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("temporary", { status, headers: { "Retry-After": "1" } })).mockResolvedValue(new Response("[]"));
    const sleep = vi.fn().mockResolvedValue(undefined);
    expect((await pollingFetch(new AbortController().signal, fetch, sleep)("https://canvas.example")).status).toBe(200);
    expect(sleep).toHaveBeenCalledWith(1000); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("leaves long provider cooldowns for a subsequent scheduler run", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("temporary", { status: 429, headers: { "Retry-After": "120" } }));
    const sleep = vi.fn();
    expect((await pollingFetch(new AbortController().signal, fetch, sleep)("https://canvas.example")).status).toBe(429);
    expect(fetch).toHaveBeenCalledOnce(); expect(sleep).not.toHaveBeenCalled();
  });
  it("preserves a cooldown longer than the Canvas client's retry cap", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("temporary", { status: 429, headers: { "Retry-After": "600" } }));
    const defer = vi.fn();
    await pollingFetch(new AbortController().signal, fetch, vi.fn(), defer)("https://canvas.example");
    expect(defer).toHaveBeenCalledWith(600000);
  });
  it("stops after two retries and passes combined timeout signals", async () => {
    const fetch = vi.fn().mockImplementation(async (_input, options) => { expect(options.signal).toBeInstanceOf(AbortSignal); return new Response("temporary", { status: 503 }); });
    const sleep = vi.fn().mockResolvedValue(undefined);
    await pollingFetch(new AbortController().signal, fetch, sleep)("https://canvas.example", { signal: new AbortController().signal });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("requests one content sync after successful module apply despite an independent failed scope", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input); requests.push(url);
      if (url.includes("students/submissions")) return Response.json([]);
      if (url.includes("announcements")) return Response.json([], { status: 403 });
      if (url.includes("assignments")) return Response.json([{ id: 123, name: "Task", due_at: "2026-10-08T15:59:00Z", published: true, submission_types: ["online_upload"] }]);
      if (url.includes("/modules/4/items")) return Response.json([{ id: 5, title: "Lesson PDF", type: "File", content_id: 8 }]);
      return Response.json([{ id: 4, name: "Week 1", published: true, items_count: 1 }]);
    }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const builder = { select: () => builder, eq: () => builder, not: () => builder, order: () => builder, limit: () => builder, upsert, maybeSingle: async () => ({ data: { base_url: "https://canvas.example", posted_at: null, last_seen_module_item_ids: ["old"] }, error: null }) };
    const client = { from: () => builder, rpc } as unknown as SupabaseClient<Database>;
    const course: CanvasCourseRow = { id: "course", user_id: "owner", canvas_connection_id: "connection", canvas_course_id: "course-1", name: "Course", course_code: null, workflow_state: null, enrollment_term_id: null, account_id: null, start_at: null, end_at: null, time_zone: null, public_syllabus: null, syllabus_body: null, canvas_updated_at: null, first_synced_at: "2026-10-01", last_synced_at: "2026-10-01", created_at: "2026-10-01", updated_at: "2026-10-01" };
    expect(await pollCanvasCourse(client, course, "worker")).toEqual({ failures: 1 });
    const payload = rpc.mock.calls[0]?.[1].p_payload;
    expect(payload.assignments).toMatchObject([{ canvas_assignment_id: "123", name: "Task" }]);
    expect(payload.announcements).toBeNull();
    expect(payload.moduleItems).toMatchObject([{ canvas_content_id: "8", title: "Lesson PDF" }]);
    expect(requests).toHaveLength(5);
    expect(requests.some(path => /\/files\/|reviewer|pages/.test(path))).toBe(false);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ course_id: "course", last_seen_module_item_ids: ["5"] }));
    expect(trigger).toHaveBeenCalledWith(client, expect.objectContaining({ userId: "owner", courseId: "course", newItemCount: 1 }));
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(trigger.mock.invocationCallOrder.at(-1)!);
  });
  it.each(["baseline", "repeat", "failed_modules", "failed_apply"])("does not trigger for %s evidence", async evidence => {
    trigger.mockClear();
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/modules/4/items")) return Response.json([{ id: 5, title: "PDF", type: "File", content_id: 8 }]);
      if (url.endsWith("/modules?per_page=100")) return Response.json([{ id: 4, name: "Week", published: true }], { status: evidence === "failed_modules" ? 403 : 200 });
      if (url.includes("/modules")) return evidence === "failed_modules" ? Response.json([], { status: 403 }) : Response.json([{ id: 4, name: "Week", published: true }]);
      return Response.json([]);
    }));
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const builder = { select: () => builder, eq: () => builder, not: () => builder, order: () => builder, limit: () => builder, upsert, maybeSingle: async () => ({ data: { base_url: "https://canvas.example", posted_at: null, last_seen_module_item_ids: evidence === "baseline" ? undefined : ["5"] }, error: null }) };
    const client = { from: () => builder, rpc: vi.fn().mockResolvedValue({ error: evidence === "failed_apply" ? { message: "private" } : null }) } as unknown as SupabaseClient<Database>;
    const course = { id: "course", user_id: "owner", canvas_connection_id: "connection", canvas_course_id: "course-1", name: "Course" } as CanvasCourseRow;
    if (evidence === "failed_apply") await expect(pollCanvasCourse(client, course, "worker")).rejects.toThrow("canvas_notification_persistence_failed");
    else await pollCanvasCourse(client, course, "worker");
    expect(trigger).not.toHaveBeenCalled();
    if (evidence.startsWith("failed")) expect(upsert).not.toHaveBeenCalled();
  });
});
