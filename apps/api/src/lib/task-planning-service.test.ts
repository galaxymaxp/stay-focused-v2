import type { Database, StudySessionRow } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadOwnedPlannerTasks: vi.fn(),
  persistOwnedStudyPlan: vi.fn(),
}));

vi.mock("@/lib/task-planning-repository", () => ({
  loadOwnedPlannerTasks: mocks.loadOwnedPlannerTasks,
  persistOwnedStudyPlan: mocks.persistOwnedStudyPlan,
  toStudySessionView: (row: StudySessionRow) => ({
    id: row.id,
    studyPlanId: row.study_plan_id,
    taskId: row.task_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
}));

const service = await import("./task-planning-service");
const client = {} as SupabaseClient<Database>;
const request = {
  planningRange: {
    startsAt: "2026-09-01T08:00:00.000Z",
    endsAt: "2026-09-01T12:00:00.000Z",
  },
  availability: [
    {
      startsAt: "2026-09-01T09:00:00.000Z",
      endsAt: "2026-09-01T11:00:00.000Z",
    },
  ],
  taskIds: ["00000000-0000-4000-8000-000000000001"],
} as const;

describe("owned study planning service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadOwnedPlannerTasks.mockResolvedValue([
      {
        id: request.taskIds[0],
        title: "Read chapter",
        dueAt: "2026-09-02T12:00:00.000Z",
        estimatedMinutes: 60,
        priority: "high",
        createdAt: "2026-08-30T00:00:00.000Z",
      },
    ]);
  });

  it("previews without invoking persistence", async () => {
    const plan = await service.previewOwnedStudyPlan(client, "user-a", request);

    expect(plan.sessions).toHaveLength(1);
    expect(plan.unscheduledWork).toEqual([]);
    expect(mocks.persistOwnedStudyPlan).not.toHaveBeenCalled();
    expect(mocks.loadOwnedPlannerTasks).toHaveBeenCalledWith(
      client,
      "user-a",
      request.taskIds,
    );
  });

  it("rejects explicit foreign or completed task IDs safely", async () => {
    mocks.loadOwnedPlannerTasks.mockResolvedValue([]);

    await expect(service.previewOwnedStudyPlan(client, "user-a", request)).rejects.toMatchObject({
      code: "task_not_found",
    });
    expect(mocks.persistOwnedStudyPlan).not.toHaveBeenCalled();
  });

  it("reruns planning and persists the normalized result once", async () => {
    mocks.persistOwnedStudyPlan.mockImplementation(
      async (_client: unknown, _userId: string, plan: { sessions: readonly { taskId: string; startsAt: string; endsAt: string }[] }) => ({
        studyPlanId: "00000000-0000-4000-8000-000000000099",
        sessions: plan.sessions.map((session, index) => sessionRow(index + 1, session)),
      }),
    );

    const applied = await service.applyOwnedStudyPlan(client, "user-a", request);

    expect(applied.studyPlanId).toBe("00000000-0000-4000-8000-000000000099");
    expect(applied.sessions).toHaveLength(1);
    expect(mocks.persistOwnedStudyPlan).toHaveBeenCalledOnce();
    expect(mocks.persistOwnedStudyPlan.mock.calls[0]?.[3]).toMatch(/^[a-f0-9]{64}$/);
  });
});

function sessionRow(
  index: number,
  session: { readonly taskId: string; readonly startsAt: string; readonly endsAt: string },
): StudySessionRow {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    user_id: "user-a",
    study_plan_id: "00000000-0000-4000-8000-000000000099",
    task_id: session.taskId,
    starts_at: session.startsAt,
    ends_at: session.endsAt,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  };
}
