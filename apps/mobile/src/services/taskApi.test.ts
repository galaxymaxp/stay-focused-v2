import { describe, expect, it, vi } from "vitest";

import { createTask, deleteTask, listTasks, updateTask } from "./taskApi";

const BASE = { apiBaseUrl: "https://api.example.test", accessToken: "token-1" };

function taskPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Draft chapter three",
    notes: null,
    status: "pending",
    priority: "high",
    dueAt: "2026-09-04T12:00:00.000Z",
    estimatedMinutes: 90,
    sourceType: "manual",
    canvasConnectionId: null,
    canvasCourseId: null,
    canvasAssignmentId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("listTasks", () => {
  it("requests a full page and returns the cursor for the next one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { tasks: [taskPayload()], nextCursor: "cursor-2" } }),
    );

    const result = await listTasks({ ...BASE, fetchImpl });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("expected success");
    expect(result.data.tasks).toHaveLength(1);
    expect(result.data.nextCursor).toBe("cursor-2");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/api/tasks?limit=50");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
  });

  it("passes status and cursor through to the route", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: { tasks: [], nextCursor: null } }),
    );

    await listTasks({ ...BASE, cursor: "cursor-2", fetchImpl, status: "completed" });

    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain("status=completed");
    expect(url).toContain("cursor=cursor-2");
  });

  it("drops rows that do not match the task contract", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          tasks: [taskPayload(), { id: "broken" }, taskPayload({ status: "archived" })],
          nextCursor: null,
        },
      }),
    );

    const result = await listTasks({ ...BASE, fetchImpl });

    if (!result.ok) throw new Error("expected success");
    expect(result.data.tasks).toHaveLength(1);
  });

  it("surfaces the route's own error message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        { ok: false, error: { code: "task_storage_failed", message: "Tasks could not be loaded." } },
        503,
      ),
    );

    const result = await listTasks({ ...BASE, fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: { code: "task_storage_failed", message: "Tasks could not be loaded.", status: 503 },
    });
  });

  it("reports a network failure without leaking the underlying error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:3000"));

    const result = await listTasks({ ...BASE, fetchImpl });

    if (result.ok) throw new Error("expected failure");
    expect(result.error.code).toBe("network_error");
    expect(result.error.message).not.toContain("ECONNREFUSED");
  });

  it("refuses to build a request without a session", async () => {
    const fetchImpl = vi.fn();

    const result = await listTasks({ ...BASE, accessToken: "  ", fetchImpl });

    expect(result).toMatchObject({ ok: false, error: { code: "missing_access_token" } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("createTask", () => {
  it("sends only fields the create route accepts", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: taskPayload() }, 201),
    );

    await createTask({
      ...BASE,
      dueAt: "2026-09-04T12:00:00.000Z",
      estimatedMinutes: 90,
      fetchImpl,
      notes: null,
      priority: "high",
      title: "Draft chapter three",
    });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      title: "Draft chapter three",
      notes: null,
      priority: "high",
      dueAt: "2026-09-04T12:00:00.000Z",
      estimatedMinutes: 90,
    });
  });

  it("omits absent optional fields so route defaults apply", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, data: taskPayload() }, 201));

    await createTask({ ...BASE, fetchImpl, title: "Read unit two" });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ title: "Read unit two" });
  });
});

describe("updateTask", () => {
  it("patches only what changed", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, data: taskPayload({ status: "completed" }) }),
    );

    const result = await updateTask({
      ...BASE,
      fetchImpl,
      status: "completed",
      taskId: "00000000-0000-4000-8000-000000000001",
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.example.test/api/tasks/00000000-0000-4000-8000-000000000001",
    );
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ status: "completed" });
    expect(result).toMatchObject({ ok: true });
  });

  it("refuses an empty patch the route would reject anyway", async () => {
    const fetchImpl = vi.fn();

    const result = await updateTask({ ...BASE, fetchImpl, taskId: "task-1" });

    expect(result).toMatchObject({ ok: false, error: { code: "invalid_request" } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("deleteTask", () => {
  it("deletes by id and reports success with no body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

    const result = await deleteTask({ ...BASE, fetchImpl, taskId: "task-1" });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/api/tasks/task-1");
    expect(init.method).toBe("DELETE");
    expect(result).toEqual({ ok: true, data: null });
  });

  it("reports a task that is already gone", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false, error: { code: "task_not_found", message: "Task was not found." } }, 404),
    );

    const result = await deleteTask({ ...BASE, fetchImpl, taskId: "task-1" });

    expect(result).toMatchObject({ ok: false, error: { code: "task_not_found", status: 404 } });
  });
});
