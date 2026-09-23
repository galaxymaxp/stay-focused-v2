import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  listCourseInventory: vi.fn(),
  readConnection: vi.fn(),
}));
vi.mock("@/lib/canvas-routes", () => ({
  CONNECTION_SECRET_COLUMNS: "*",
  createCanvasClient: () => ({ listCourseInventory: mocks.listCourseInventory }),
  decryptConnectionToken: () => "token",
  mapCanvasClientError: () => ({ status: 503, code: "canvas_unavailable", message: "Canvas is unavailable." }),
  readConnection: mocks.readConnection,
}));

import { classifyStoredCanvasCourse, loadCanvasCourseInventory } from "./canvas-course-selection";

type Row = Record<string, unknown>;
const now = new Date("2026-09-24T00:00:00Z");
const connection = { id: "connection", user_id: "owner", base_url: "https://canvas.example" };
function courseRow(id: string, overrides: Row = {}): Row {
  return { id, user_id: "owner", canvas_connection_id: "connection", canvas_course_id: `canvas-${id}`, name: id, course_code: id, workflow_state: "available", start_at: null, end_at: null, ...overrides };
}

/** Minimal PostgREST-shaped reader: eq/in filters over in-memory tables. */
function fakeClient(tables: Record<string, Row[]>) {
  const writes: string[] = [];
  const from = (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    let single = false;
    const builder = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: (column: string, value: unknown) => { filters.push(row => row[column] === value); return builder; },
      in: (column: string, values: unknown[]) => { filters.push(row => values.includes(row[column])); return builder; },
      maybeSingle: () => { single = true; return builder; },
      upsert: () => { writes.push(table); return builder; },
      then: (resolve: (value: { data: unknown; error: null }) => void) => {
        const rows = (tables[table] ?? []).filter(row => filters.every(filter => filter(row)));
        resolve({ data: single ? rows[0] ?? null : rows, error: null });
      },
    };
    return builder;
  };
  return { client: { from } as unknown as SupabaseClient<Database>, writes };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readConnection.mockResolvedValue({ ok: true, row: connection });
  mocks.listCourseInventory.mockRejectedValue(new Error("Canvas offline"));
});

describe("classifyStoredCanvasCourse", () => {
  it("uses only explicit completion and saved dates, never titles", () => {
    expect(classifyStoredCanvasCourse({ workflow_state: "completed", start_at: null, end_at: null }, now).classification).toBe("past_or_concluded");
    expect(classifyStoredCanvasCourse({ workflow_state: "available", start_at: null, end_at: "2026-01-01T00:00:00Z" }, now).classification).toBe("past_or_concluded");
    expect(classifyStoredCanvasCourse({ workflow_state: "available", start_at: "2026-08-01T00:00:00Z", end_at: "2026-12-01T00:00:00Z" }, now).classification).toBe("likely_current");
    expect(classifyStoredCanvasCourse({ workflow_state: "available", start_at: null, end_at: null }, now).classification).toBe("other_or_uncertain");
    expect(classifyStoredCanvasCourse({ workflow_state: "deleted", start_at: null, end_at: null }, now).classification).toBe("unavailable");
  });
});

describe("loadCanvasCourseInventory stored fallback", () => {
  const tables = () => ({
    canvas_courses: [
      courseRow("synced", { end_at: "2026-01-01T00:00:00Z" }),
      courseRow("unselected"),
      courseRow("foreign", { user_id: "other" }),
    ],
    canvas_course_sync_preferences: [
      { id: "p1", user_id: "owner", canvas_connection_id: "connection", course_id: "synced", selected: true, display_order: 0, updated_at: "2026-09-01" },
      { id: "p2", user_id: "other", canvas_connection_id: "connection", course_id: "foreign", selected: true, display_order: 0, updated_at: "2026-09-01" },
    ],
    canvas_course_sync_states: [
      { id: "s1", user_id: "owner", canvas_connection_id: "connection", canvas_course_id: "canvas-synced", course_id: "synced", last_checked_at: "2026-09-20", last_successful_sync_at: "2026-09-20", consecutive_failure_count: 0, last_failure_code: null },
    ],
    canvas_sync_runs: [],
  });

  it("keeps the Sync page strict when Canvas cannot list courses", async () => {
    const { client } = fakeClient(tables());
    const result = await loadCanvasCourseInventory({ client, now, userId: "owner" });
    expect(result).toMatchObject({ ok: false, status: 503, code: "canvas_unavailable" });
  });

  it("serves owner-scoped stored courses and database sync state for read-only callers", async () => {
    const { client, writes } = fakeClient(tables());
    const result = await loadCanvasCourseInventory({ allowStoredFallback: true, client, now, userId: "owner" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.classificationSource).toBe("stored");
    expect(writes).toEqual([]);
    expect(result.value.courses.map(course => [course.id, course.classification, course.selected, course.lastSync?.status ?? null])).toEqual([
      ["synced", "past_or_concluded", true, "success"],
      ["unselected", "other_or_uncertain", false, null],
    ]);
  });

  it("uses live Canvas classification when Canvas responds", async () => {
    mocks.listCourseInventory.mockResolvedValue([
      { id: "canvas-synced", name: "synced", courseCode: "synced", workflowState: "available", startAt: null, endAt: null, term: { id: "t", name: "2026-27-1T", startAt: "2026-08-01T00:00:00Z", endAt: "2026-12-01T00:00:00Z" }, enrollments: [] },
    ]);
    const data = tables();
    const { client, writes } = fakeClient(data);
    const result = await loadCanvasCourseInventory({ allowStoredFallback: true, client, now, userId: "owner" });
    expect(result.ok && result.value.classificationSource).toBe("canvas");
    expect(result.ok && result.value.courses.find(course => course.id === "synced")).toMatchObject({ classification: "likely_current", term: { name: "2026-27-1T" } });
    expect(writes).toEqual(["canvas_courses"]);
  });
});
