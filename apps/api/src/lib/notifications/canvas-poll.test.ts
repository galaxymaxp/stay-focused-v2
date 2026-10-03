import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanvasCourseRow, Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pollingFetch, pollCanvasCourse } from "./canvas-poll";
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
  it("polls canonical metadata and independent failed scopes without downloading files or generating AI work", async () => {
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
    const builder = { select: () => builder, eq: () => builder, not: () => builder, order: () => builder, limit: () => builder, maybeSingle: async () => ({ data: { base_url: "https://canvas.example", posted_at: null }, error: null }) };
    const client = { from: () => builder, rpc } as unknown as SupabaseClient<Database>;
    const course: CanvasCourseRow = { id: "course", user_id: "owner", canvas_connection_id: "connection", canvas_course_id: "course-1", name: "Course", course_code: null, workflow_state: null, enrollment_term_id: null, account_id: null, start_at: null, end_at: null, time_zone: null, public_syllabus: null, syllabus_body: null, canvas_updated_at: null, first_synced_at: "2026-10-01", last_synced_at: "2026-10-01", created_at: "2026-10-01", updated_at: "2026-10-01" };
    expect(await pollCanvasCourse(client, course, "worker")).toEqual({ failures: 1 });
    const payload = rpc.mock.calls[0]?.[1].p_payload;
    expect(payload.assignments).toMatchObject([{ canvas_assignment_id: "123", name: "Task" }]);
    expect(payload.announcements).toBeNull();
    expect(payload.moduleItems).toMatchObject([{ canvas_content_id: "8", title: "Lesson PDF" }]);
    expect(requests).toHaveLength(5);
    expect(requests.some(path => /\/files\/|reviewer|pages/.test(path))).toBe(false);
  });
});
