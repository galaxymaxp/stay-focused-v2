import type { Database, StudySessionRow, TaskRow } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";

const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";
const TASK_A = "00000000-0000-4000-8000-000000000001";
const TASK_B = "00000000-0000-4000-8000-000000000002";
const SESSION_A = "00000000-0000-4000-8000-000000000101";
const SESSION_B = "00000000-0000-4000-8000-000000000102";

const UNRESOLVED_EMBED = {
  code: "PGRST200",
  message:
    "Could not find a relationship between 'study_sessions' and 'tasks' in the schema cache",
};

interface QueryState {
  readonly table: string;
  columns: string;
  readonly filters: Array<{ readonly op: string; readonly column: string; readonly value: unknown }>;
  update?: unknown;
  single: boolean;
}

type Handler = (state: QueryState) => { data: unknown; error: unknown };

/**
 * Records the exact queries the repository issues so the embed and fallback
 * paths can be distinguished, and so owner scoping can be asserted rather than
 * assumed.
 */
function createRecordingClient(handler: Handler) {
  const issued: QueryState[] = [];

  function createBuilder(table: string) {
    const state: QueryState = { table, columns: "", filters: [], single: false };
    const builder = {
      select(columns: string) {
        state.columns = columns;
        return builder;
      },
      update(value: unknown) {
        state.update = value;
        return builder;
      },
      eq(column: string, value: unknown) {
        state.filters.push({ op: "eq", column, value });
        return builder;
      },
      lt(column: string, value: unknown) {
        state.filters.push({ op: "lt", column, value });
        return builder;
      },
      gt(column: string, value: unknown) {
        state.filters.push({ op: "gt", column, value });
        return builder;
      },
      in(column: string, value: unknown) {
        state.filters.push({ op: "in", column, value });
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      maybeSingle() {
        state.single = true;
        issued.push(state);
        return Promise.resolve(handler(state));
      },
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
        issued.push(state);
        return Promise.resolve(handler(state)).then(resolve, reject);
      },
    };
    return builder;
  }

  const client = { from: (table: string) => createBuilder(table) };
  return {
    client: client as unknown as SupabaseClient<Database>,
    issued,
  };
}

function sessionRow(overrides: Partial<StudySessionRow> = {}): StudySessionRow {
  return {
    id: SESSION_A,
    user_id: USER_A,
    study_plan_id: "00000000-0000-4000-8000-000000000090",
    task_id: TASK_A,
    starts_at: "2026-09-01T09:00:00.000Z",
    ends_at: "2026-09-01T10:00:00.000Z",
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
    ...overrides,
  } as StudySessionRow;
}

function taskSummaryRow(overrides: Partial<TaskRow> = {}) {
  return {
    id: TASK_A,
    title: "Draft chapter three",
    status: "pending",
    priority: "high",
    due_at: "2026-09-04T12:00:00.000Z",
    canvas_course_id: "canvas-course-1",
    ...overrides,
  };
}

async function importRepository() {
  // The embed-support flag is module state, so each case starts from a clean
  // probe rather than inheriting the previous test's fallback decision.
  const { resetModules } = await import("vitest").then((module) => ({
    resetModules: module.vi.resetModules.bind(module.vi),
  }));
  resetModules();
  return import("./task-planning-repository");
}

describe("study session reads carry an owned task summary", () => {
  let repository: Awaited<ReturnType<typeof importRepository>>;

  beforeEach(async () => {
    repository = await importRepository();
  });

  it("embeds the task summary through the composite owner foreign key", async () => {
    const { client, issued } = createRecordingClient((state) => {
      if (state.table !== "study_sessions") {
        throw new Error(`Unexpected fallback query against ${state.table}.`);
      }
      return {
        data: [{ ...sessionRow(), task: taskSummaryRow() }],
        error: null,
      };
    });

    const sessions = await repository.listOwnedStudySessions(client, USER_A, { limit: 100 });

    expect(issued).toHaveLength(1);
    expect(issued[0]?.columns).toContain("tasks!study_sessions_task_owner_fkey");
    expect(issued[0]?.filters).toContainEqual({ op: "eq", column: "user_id", value: USER_A });
    expect(sessions[0]?.task).toMatchObject({ id: TASK_A, title: "Draft chapter three" });
  });

  it("falls back to one bounded owner-scoped lookup when the embed cannot resolve", async () => {
    const { client, issued } = createRecordingClient((state) => {
      if (state.table === "tasks") {
        return { data: [taskSummaryRow(), taskSummaryRow({ id: TASK_B, title: "Read unit two" })], error: null };
      }
      if (state.columns.includes("tasks!")) {
        return { data: null, error: UNRESOLVED_EMBED };
      }
      return {
        data: [sessionRow(), sessionRow({ id: SESSION_B, task_id: TASK_B })],
        error: null,
      };
    });

    const sessions = await repository.listOwnedStudySessions(client, USER_A, { limit: 100 });

    expect(issued.map((state) => state.table)).toEqual([
      "study_sessions",
      "study_sessions",
      "tasks",
    ]);
    const lookup = issued[2];
    expect(lookup?.filters).toContainEqual({ op: "eq", column: "user_id", value: USER_A });
    expect(lookup?.filters).toContainEqual({ op: "in", column: "id", value: [TASK_A, TASK_B] });
    expect(sessions.map((session) => session.task?.title)).toEqual([
      "Draft chapter three",
      "Read unit two",
    ]);
  });

  it("probes the embed once and reuses the fallback for later reads", async () => {
    const { client, issued } = createRecordingClient((state) => {
      if (state.table === "tasks") return { data: [taskSummaryRow()], error: null };
      if (state.columns.includes("tasks!")) return { data: null, error: UNRESOLVED_EMBED };
      return { data: [sessionRow()], error: null };
    });

    await repository.listOwnedStudySessions(client, USER_A, { limit: 100 });
    issued.length = 0;
    await repository.listOwnedStudySessions(client, USER_A, { limit: 100 });

    expect(issued.map((state) => state.table)).toEqual(["study_sessions", "tasks"]);
    expect(issued.some((state) => state.columns.includes("tasks!"))).toBe(false);
  });

  it("deduplicates task lookups when several blocks share one task", async () => {
    const { client, issued } = createRecordingClient((state) => {
      if (state.table === "tasks") return { data: [taskSummaryRow()], error: null };
      if (state.columns.includes("tasks!")) return { data: null, error: UNRESOLVED_EMBED };
      return { data: [sessionRow(), sessionRow({ id: SESSION_B })], error: null };
    });

    const sessions = await repository.listOwnedStudySessions(client, USER_A, { limit: 100 });

    expect(issued.at(-1)?.filters).toContainEqual({ op: "in", column: "id", value: [TASK_A] });
    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.task?.id === TASK_A)).toBe(true);
  });

  it("surfaces a genuine storage failure instead of silently falling back", async () => {
    const { client, issued } = createRecordingClient(() => ({
      data: null,
      error: { code: "57014", message: "canceling statement due to statement timeout" },
    }));

    await expect(
      repository.listOwnedStudySessions(client, USER_A, { limit: 100 }),
    ).rejects.toMatchObject({ code: "task_storage_failed" });
    expect(issued).toHaveLength(1);
  });

  it("returns a degraded row rather than dropping a block with no resolvable task", async () => {
    const { client } = createRecordingClient((state) => {
      if (state.table === "tasks") return { data: [], error: null };
      if (state.columns.includes("tasks!")) return { data: null, error: UNRESOLVED_EMBED };
      return { data: [sessionRow()], error: null };
    });

    const sessions = await repository.listOwnedStudySessions(client, USER_A, { limit: 100 });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.task).toBeNull();
  });

  it("decorates a moved block so PATCH matches the list contract", async () => {
    const { client, issued } = createRecordingClient((state) => {
      if (state.table === "tasks") return { data: [taskSummaryRow()], error: null };
      return { data: sessionRow({ starts_at: "2026-09-01T14:00:00.000Z" }), error: null };
    });

    const updated = await repository.updateOwnedStudySession(client, USER_A, SESSION_A, {
      starts_at: "2026-09-01T14:00:00.000Z",
    });

    expect(updated?.task).toMatchObject({ id: TASK_A, status: "pending" });
    expect(issued.at(-1)?.filters).toContainEqual({ op: "eq", column: "user_id", value: USER_A });
  });

  it("returns null for a session owned by someone else without a task lookup", async () => {
    const { client, issued } = createRecordingClient(() => ({ data: null, error: null }));

    const updated = await repository.updateOwnedStudySession(client, USER_B, SESSION_A, {
      starts_at: "2026-09-01T14:00:00.000Z",
    });

    expect(updated).toBeNull();
    expect(issued.every((state) => state.table === "study_sessions")).toBe(true);
  });
});

describe("toStudySessionView", () => {
  it("projects exactly the approved six task fields", async () => {
    const repository = await importRepository();

    const view = repository.toStudySessionView({
      ...sessionRow(),
      task: taskSummaryRow() as never,
    });

    expect(view.task).toEqual({
      id: TASK_A,
      title: "Draft chapter three",
      status: "pending",
      priority: "high",
      dueAt: "2026-09-04T12:00:00.000Z",
      canvasCourseId: "canvas-course-1",
    });
    expect(Object.keys(view.task ?? {})).toHaveLength(6);
  });

  it("never leaks notes, estimates, or Canvas identifiers into a schedule read", async () => {
    const repository = await importRepository();

    const view = repository.toStudySessionView({
      ...sessionRow(),
      task: {
        ...taskSummaryRow(),
        notes: "Private study notes that must not travel with the schedule.",
        estimated_minutes: 240,
        canvas_assignment_id: "canvas-101",
      } as never,
    });

    expect(JSON.stringify(view)).not.toContain("Private study notes");
    expect(JSON.stringify(view)).not.toContain("canvas-101");
    expect(JSON.stringify(view)).not.toContain("240");
  });

  it("keeps the session fields the existing contract already published", async () => {
    const repository = await importRepository();

    const view = repository.toStudySessionView({ ...sessionRow(), task: null });

    expect(view).toMatchObject({
      id: SESSION_A,
      studyPlanId: "00000000-0000-4000-8000-000000000090",
      taskId: TASK_A,
      startsAt: "2026-09-01T09:00:00.000Z",
      endsAt: "2026-09-01T10:00:00.000Z",
      task: null,
    });
  });
});
