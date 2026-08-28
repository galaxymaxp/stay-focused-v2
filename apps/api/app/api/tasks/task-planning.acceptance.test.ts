import type { StudySessionRow, TaskRow } from "@stay-focused/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class RepositoryError extends Error {
    constructor(
      readonly code: string,
      readonly safeMessage: string,
    ) {
      super(safeMessage);
    }
  }
  return {
    RepositoryError,
    verifyBearerToken: vi.fn(),
    createCanvasServiceClient: vi.fn(),
    createOwnedTask: vi.fn(),
    listOwnedTasks: vi.fn(),
    findOwnedTask: vi.fn(),
    updateOwnedTask: vi.fn(),
    deleteOwnedTask: vi.fn(),
    importOwnedCanvasAssignments: vi.fn(),
    loadOwnedPlannerTasks: vi.fn(),
    persistOwnedStudyPlan: vi.fn(),
    listOwnedStudySessions: vi.fn(),
    findOwnedStudySession: vi.fn(),
    updateOwnedStudySession: vi.fn(),
    deleteOwnedStudySession: vi.fn(),
    taskRows: new Map<string, TaskRow>(),
    sessionRows: new Map<string, StudySessionRow>(),
    nextTask: 1,
    nextPlan: 90,
    nextSession: 100,
  };
});

vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.verifyBearerToken }));
vi.mock("@/lib/canvas-db", () => ({
  createCanvasServiceClient: mocks.createCanvasServiceClient,
}));
vi.mock("@/lib/task-planning-repository", () => ({
  TaskPlanningRepositoryError: mocks.RepositoryError,
  createOwnedTask: mocks.createOwnedTask,
  listOwnedTasks: mocks.listOwnedTasks,
  findOwnedTask: mocks.findOwnedTask,
  updateOwnedTask: mocks.updateOwnedTask,
  deleteOwnedTask: mocks.deleteOwnedTask,
  importOwnedCanvasAssignments: mocks.importOwnedCanvasAssignments,
  loadOwnedPlannerTasks: mocks.loadOwnedPlannerTasks,
  persistOwnedStudyPlan: mocks.persistOwnedStudyPlan,
  listOwnedStudySessions: mocks.listOwnedStudySessions,
  findOwnedStudySession: mocks.findOwnedStudySession,
  updateOwnedStudySession: mocks.updateOwnedStudySession,
  deleteOwnedStudySession: mocks.deleteOwnedStudySession,
  toTaskView,
  toStudySessionView,
}));

const tasksRoute = await import("./route");
const taskRoute = await import("./[taskId]/route");
const importRoute = await import("./import/canvas/route");
const previewRoute = await import("../study-plan/preview/route");
const applyRoute = await import("../study-plan/apply/route");
const sessionsRoute = await import("../study-sessions/route");
const sessionRoute = await import("../study-sessions/[sessionId]/route");

const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";
const ASSIGNMENT_A = "00000000-0000-4000-8000-0000000000aa";
const fakeClient = { kind: "stateful-fresh-context" };

describe("R5 API persistence and two-user acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskRows.clear();
    mocks.sessionRows.clear();
    mocks.nextTask = 1;
    mocks.nextPlan = 90;
    mocks.nextSession = 100;
    mocks.verifyBearerToken.mockImplementation(async (request: Request) => {
      const token = request.headers.get("authorization")?.replace("Bearer ", "");
      return token === USER_A || token === USER_B ? { id: token } : null;
    });
    mocks.createCanvasServiceClient.mockReturnValue(fakeClient);
    installStatefulRepository();
  });

  it("persists the full User A flow and denies every User B attack", async () => {
    const create = await tasksRoute.POST(jsonRequest("/api/tasks", USER_A, {
      title: "Prepare defense notes",
      priority: "high",
      dueAt: "2026-09-02T12:00:00.000Z",
      estimatedMinutes: 60,
    }));
    expect(create.status).toBe(201);
    const manualTask = readData<TaskView>(await create.json());

    const imported = await importRoute.POST(jsonRequest("/api/tasks/import/canvas", USER_A, {
      assignmentIds: [ASSIGNMENT_A],
    }));
    expect(imported.status).toBe(200);
    const importedBody = await imported.json() as { data: { tasks: TaskView[] } };
    const canvasTask = importedBody.data.tasks[0];
    expect(canvasTask).toMatchObject({ sourceType: "canvas", canvasAssignmentId: "canvas-101" });
    if (!canvasTask) throw new Error("Canvas task fixture was not imported.");

    const customizedImport = await taskRoute.PATCH(
      jsonRequest(`/api/tasks/${canvasTask.id}`, USER_A, {
        title: "My customized Canvas task",
        estimatedMinutes: 75,
      }),
      context("taskId", canvasTask.id),
    );
    expect(customizedImport.status).toBe(200);

    const repeated = await importRoute.POST(jsonRequest("/api/tasks/import/canvas", USER_A, {
      assignmentIds: [ASSIGNMENT_A],
    }));
    expect((await repeated.json() as { data: { tasks: Array<TaskView & { title: string; estimatedMinutes: number }> } }).data.tasks[0])
      .toMatchObject({
        id: canvasTask.id,
        title: "My customized Canvas task",
        estimatedMinutes: 75,
      });
    expect([...mocks.taskRows.values()].filter((task) => task.source_type === "canvas"))
      .toHaveLength(1);

    const planningBody = {
      planningRange: {
        startsAt: "2026-09-01T08:00:00.000Z",
        endsAt: "2026-09-01T12:00:00.000Z",
      },
      availability: [{
        startsAt: "2026-09-01T09:00:00.000Z",
        endsAt: "2026-09-01T11:30:00.000Z",
      }],
      taskIds: [manualTask.id, canvasTask.id],
    };
    const beforePreviewSessions = mocks.sessionRows.size;
    const preview = await previewRoute.POST(jsonRequest("/api/study-plan/preview", USER_A, planningBody));
    expect(preview.status).toBe(200);
    expect(mocks.sessionRows.size).toBe(beforePreviewSessions);
    expect((await preview.json() as { data: { sessions: unknown[] } }).data.sessions).toHaveLength(2);

    const applied = await applyRoute.POST(jsonRequest("/api/study-plan/apply", USER_A, planningBody));
    expect(applied.status).toBe(201);
    const appliedBody = await applied.json() as { data: { sessions: SessionView[] } };
    expect(appliedBody.data.sessions).toHaveLength(2);
    const session = appliedBody.data.sessions[0];
    expect(session).toBeDefined();

    const edited = await sessionRoute.PATCH(
      jsonRequest(`/api/study-sessions/${session?.id}`, USER_A, {
        startsAt: "2026-09-01T09:15:00.000Z",
        endsAt: "2026-09-01T10:15:00.000Z",
      }),
      context("sessionId", session?.id ?? ""),
    );
    expect(edited.status).toBe(200);

    // A fresh request/client context reads the same state.
    mocks.createCanvasServiceClient.mockReturnValue({ kind: "second-client" });
    const persistedTasks = await tasksRoute.GET(getRequest("/api/tasks", USER_A));
    expect((await persistedTasks.json() as { data: { tasks: TaskView[] } }).data.tasks).toHaveLength(2);
    const persistedSessions = await sessionsRoute.GET(getRequest("/api/study-sessions", USER_A));
    const persistedSessionRows = (await persistedSessions.json() as { data: { sessions: SessionView[] } }).data.sessions;
    expect(persistedSessionRows).toHaveLength(2);
    expect(persistedSessionRows.find((row) => row.id === session?.id)).toMatchObject({
      startsAt: "2026-09-01T09:15:00.000Z",
      endsAt: "2026-09-01T10:15:00.000Z",
    });

    // Gap A: a schedule read renders without a second paginated task walk.
    for (const row of persistedSessionRows) {
      expect(row.task).not.toBeNull();
      expect(row.task?.title).toBeTruthy();
      expect(Object.keys(row.task ?? {}).sort()).toEqual([
        "canvasCourseId",
        "dueAt",
        "id",
        "priority",
        "status",
        "title",
      ]);
    }
    expect(persistedSessionRows.map((row) => row.task?.title).sort()).toEqual([
      "My customized Canvas task",
      "Prepare defense notes",
    ]);
    expect(
      persistedSessionRows.find((row) => row.task?.id === canvasTask.id)?.task,
    ).toMatchObject({ canvasCourseId: "canvas-course-1", dueAt: "2026-09-03T12:00:00.000Z" });
    // The summary stays a summary: no notes or Canvas assignment identifiers.
    expect(JSON.stringify(persistedSessionRows)).not.toContain("canvas-101");

    await expectDenied(taskRoute.GET(
      getRequest(`/api/tasks/${manualTask.id}`, USER_B),
      context("taskId", manualTask.id),
    ));
    await expectDenied(taskRoute.PATCH(
      jsonRequest(`/api/tasks/${manualTask.id}`, USER_B, { title: "Attack" }),
      context("taskId", manualTask.id),
    ));
    await expectDenied(taskRoute.DELETE(
      getRequest(`/api/tasks/${manualTask.id}`, USER_B, "DELETE"),
      context("taskId", manualTask.id),
    ));
    await expectDenied(importRoute.POST(jsonRequest("/api/tasks/import/canvas", USER_B, {
      assignmentIds: [ASSIGNMENT_A],
    })));
    await expectDenied(previewRoute.POST(jsonRequest("/api/study-plan/preview", USER_B, planningBody)));
    await expectDenied(applyRoute.POST(jsonRequest("/api/study-plan/apply", USER_B, planningBody)));
    await expectDenied(sessionRoute.PATCH(
      jsonRequest(`/api/study-sessions/${session?.id}`, USER_B, {
        startsAt: "2026-09-01T10:00:00.000Z",
      }),
      context("sessionId", session?.id ?? ""),
    ));
    await expectDenied(sessionRoute.DELETE(
      getRequest(`/api/study-sessions/${session?.id}`, USER_B, "DELETE"),
      context("sessionId", session?.id ?? ""),
    ));

    const completed = await taskRoute.PATCH(
      jsonRequest(`/api/tasks/${manualTask.id}`, USER_A, { status: "completed" }),
      context("taskId", manualTask.id),
    );
    expect(readData<TaskView>(await completed.json())).toMatchObject({
      status: "completed",
    });

    // Gap C is now legible from the schedule read alone: a block whose task was
    // completed elsewhere reports it, so Today can render it without guessing.
    const afterCompletion = await sessionsRoute.GET(getRequest("/api/study-sessions", USER_A));
    const afterCompletionRows =
      (await afterCompletion.json() as { data: { sessions: SessionView[] } }).data.sessions;
    expect(
      afterCompletionRows.find((row) => row.task?.id === manualTask.id)?.task?.status,
    ).toBe("completed");
    const deletedSession = await sessionRoute.DELETE(
      getRequest(`/api/study-sessions/${session?.id}`, USER_A, "DELETE"),
      context("sessionId", session?.id ?? ""),
    );
    expect(deletedSession.status).toBe(200);
    const deletedTask = await taskRoute.DELETE(
      getRequest(`/api/tasks/${manualTask.id}`, USER_A, "DELETE"),
      context("taskId", manualTask.id),
    );
    expect(deletedTask.status).toBe(200);
  });

  it("rejects malformed task input, IDs, dates, status, estimates, and session intervals", async () => {
    expect((await tasksRoute.GET(new Request("http://localhost/api/tasks"))).status).toBe(401);
    for (const body of [
      { title: "" },
      { title: "Bad due", dueAt: "tomorrow" },
      { title: "Bad estimate", estimatedMinutes: 0 },
    ]) {
      expect((await tasksRoute.POST(jsonRequest("/api/tasks", USER_A, body))).status).toBe(400);
    }
    expect((await taskRoute.GET(
      getRequest("/api/tasks/nope", USER_A),
      context("taskId", "nope"),
    )).status).toBe(404);
    const created = readData<TaskView>(await (await tasksRoute.POST(
      jsonRequest("/api/tasks", USER_A, { title: "Valid" }),
    )).json());
    expect((await taskRoute.PATCH(
      jsonRequest(`/api/tasks/${created.id}`, USER_A, { status: "blocked" }),
      context("taskId", created.id),
    )).status).toBe(400);

    expect((await importRoute.POST(jsonRequest("/api/tasks/import/canvas", USER_A, {
      assignmentIds: [uuid(999)],
    }))).status).toBe(404);

    const sessionId = uuid(700);
    mocks.sessionRows.set(sessionId, sessionRow({
      id: sessionId,
      user_id: USER_A,
      starts_at: "2026-09-01T09:00:00.000Z",
      ends_at: "2026-09-01T10:00:00.000Z",
    }));
    expect((await sessionRoute.PATCH(
      jsonRequest(`/api/study-sessions/${sessionId}`, USER_A, {
        startsAt: "2026-09-01T11:00:00.000Z",
      }),
      context("sessionId", sessionId),
    )).status).toBe(400);
  });
});

function installStatefulRepository(): void {
  mocks.createOwnedTask.mockImplementation(async (_client: unknown, insert: TaskRow) => {
    const row = taskRow({ ...insert, id: uuid(mocks.nextTask++), user_id: insert.user_id });
    mocks.taskRows.set(row.id, row);
    return row;
  });
  mocks.listOwnedTasks.mockImplementation(async (_client: unknown, userId: string) =>
    [...mocks.taskRows.values()].filter((row) => row.user_id === userId));
  mocks.findOwnedTask.mockImplementation(async (_client: unknown, userId: string, taskId: string) => {
    const row = mocks.taskRows.get(taskId);
    return row?.user_id === userId ? row : null;
  });
  mocks.updateOwnedTask.mockImplementation(async (
    _client: unknown,
    userId: string,
    taskId: string,
    update: Partial<TaskRow>,
  ) => {
    const row = mocks.taskRows.get(taskId);
    if (!row || row.user_id !== userId) return null;
    const updated = { ...row, ...update, updated_at: new Date().toISOString() };
    mocks.taskRows.set(taskId, updated);
    return updated;
  });
  mocks.deleteOwnedTask.mockImplementation(async (_client: unknown, userId: string, taskId: string) => {
    const row = mocks.taskRows.get(taskId);
    return row?.user_id === userId ? mocks.taskRows.delete(taskId) : false;
  });
  mocks.importOwnedCanvasAssignments.mockImplementation(async (
    _client: unknown,
    userId: string,
    assignmentIds: readonly string[],
  ) => {
    if (userId !== USER_A || assignmentIds.some((id) => id !== ASSIGNMENT_A)) {
      throw new mocks.RepositoryError("canvas_assignment_not_found", "Not found");
    }
    const existing = [...mocks.taskRows.values()].find(
      (row) => row.user_id === userId && row.canvas_assignment_id === "canvas-101",
    );
    if (existing) return [existing];
    const row = taskRow({
      id: uuid(mocks.nextTask++),
      user_id: userId,
      title: "Canvas assignment",
      source_type: "canvas",
      canvas_connection_id: uuid(800),
      canvas_course_id: "canvas-course-1",
      canvas_assignment_id: "canvas-101",
      canvas_assignment_row_id: ASSIGNMENT_A,
      due_at: "2026-09-03T12:00:00.000Z",
      estimated_minutes: 60,
    });
    mocks.taskRows.set(row.id, row);
    return [row];
  });
  mocks.loadOwnedPlannerTasks.mockImplementation(async (
    _client: unknown,
    userId: string,
    taskIds?: readonly string[],
  ) => [...mocks.taskRows.values()]
    .filter((row) => row.user_id === userId && row.status === "pending" &&
      (!taskIds || taskIds.includes(row.id)))
    .map((row) => ({
      id: row.id,
      title: row.title,
      dueAt: row.due_at,
      estimatedMinutes: row.estimated_minutes,
      priority: row.priority,
      createdAt: row.created_at,
    })));
  mocks.persistOwnedStudyPlan.mockImplementation(async (
    _client: unknown,
    userId: string,
    plan: { sessions: readonly { taskId: string; startsAt: string; endsAt: string }[] },
  ) => {
    const planId = uuid(mocks.nextPlan++);
    const sessions = plan.sessions.map((session) => {
      const row = sessionRow({
        id: uuid(mocks.nextSession++),
        user_id: userId,
        study_plan_id: planId,
        task_id: session.taskId,
        starts_at: session.startsAt,
        ends_at: session.endsAt,
      });
      mocks.sessionRows.set(row.id, row);
      return withOwnedTask(row);
    });
    return { studyPlanId: planId, sessions };
  });
  mocks.listOwnedStudySessions.mockImplementation(async (_client: unknown, userId: string) =>
    [...mocks.sessionRows.values()]
      .filter((row) => row.user_id === userId)
      .map(withOwnedTask));
  mocks.findOwnedStudySession.mockImplementation(async (
    _client: unknown,
    userId: string,
    sessionId: string,
  ) => {
    const row = mocks.sessionRows.get(sessionId);
    return row?.user_id === userId ? row : null;
  });
  mocks.updateOwnedStudySession.mockImplementation(async (
    _client: unknown,
    userId: string,
    sessionId: string,
    update: Partial<StudySessionRow>,
  ) => {
    const row = mocks.sessionRows.get(sessionId);
    if (!row || row.user_id !== userId) return null;
    const updated = { ...row, ...update, updated_at: new Date().toISOString() };
    mocks.sessionRows.set(sessionId, updated);
    return withOwnedTask(updated);
  });
  mocks.deleteOwnedStudySession.mockImplementation(async (
    _client: unknown,
    userId: string,
    sessionId: string,
  ) => mocks.sessionRows.get(sessionId)?.user_id === userId
    ? mocks.sessionRows.delete(sessionId)
    : false);
}

interface TaskView {
  readonly id: string;
  readonly status: string;
  readonly sourceType: string;
  readonly canvasAssignmentId: string | null;
}

interface SessionView {
  readonly id: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly task: {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly priority: string;
    readonly dueAt: string | null;
    readonly canvasCourseId: string | null;
  } | null;
}

function taskRow(overrides: Partial<TaskRow> & Pick<TaskRow, "id" | "user_id" | "title">): TaskRow {
  return {
    notes: null,
    status: "pending",
    priority: "medium",
    due_at: null,
    estimated_minutes: 30,
    source_type: "manual",
    canvas_connection_id: null,
    canvas_course_id: null,
    canvas_assignment_id: null,
    canvas_assignment_row_id: null,
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
    completed_at: null,
    ...overrides,
  } as TaskRow;
}

function sessionRow(
  overrides: Partial<StudySessionRow> & Pick<StudySessionRow, "id" | "user_id" | "starts_at" | "ends_at">,
): StudySessionRow {
  return {
    study_plan_id: null,
    task_id: uuid(1),
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
    ...overrides,
  } as StudySessionRow;
}

function toTaskView(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    estimatedMinutes: row.estimated_minutes,
    sourceType: row.source_type,
    canvasConnectionId: row.canvas_connection_id,
    canvasCourseId: row.canvas_course_id,
    canvasAssignmentId: row.canvas_assignment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function toStudySessionView(row: StudySessionRow & { task?: TaskRow | null }) {
  const task = row.task ?? null;
  return {
    id: row.id,
    studyPlanId: row.study_plan_id,
    taskId: row.task_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    task: task
      ? {
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueAt: task.due_at,
          canvasCourseId: task.canvas_course_id,
        }
      : null,
  };
}

/** Mirrors the repository decorating sessions with their owned task. */
function withOwnedTask(row: StudySessionRow): StudySessionRow & { task: TaskRow | null } {
  const task = mocks.taskRows.get(row.task_id);
  return { ...row, task: task?.user_id === row.user_id ? task : null };
}

function jsonRequest(path: string, userId: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${userId}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(path: string, userId: string, method = "GET"): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { authorization: `Bearer ${userId}` },
  });
}

function context<Key extends string>(key: Key, value: string) {
  return { params: Promise.resolve({ [key]: value } as Record<Key, string>) };
}

function readData<T>(body: unknown): T {
  return (body as { data: T }).data;
}

async function expectDenied(responsePromise: Promise<Response>): Promise<void> {
  const response = await responsePromise;
  expect([404, 503]).toContain(response.status);
  expect(JSON.stringify(await response.json()).toLowerCase()).not.toContain("user-a");
}

function uuid(number: number): string {
  return `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}
