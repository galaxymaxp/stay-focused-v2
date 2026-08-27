import { describe, expect, it } from "vitest";

import {
  generateDeterministicStudyPlan,
  MAX_STUDY_SESSION_MINUTES,
  PlanningValidationError,
  validateCreateTaskInput,
  validatePatchTaskInput,
  validateStudyPlanningRequest,
  type PlannerTask,
  type TaskPriority,
} from "./task-planning";

const RANGE = {
  startsAt: "2026-09-01T08:00:00.000Z",
  endsAt: "2026-09-03T18:00:00.000Z",
} as const;

describe("deterministic study planner", () => {
  it("fits one task into one window", () => {
    const result = plan([task(1, { estimatedMinutes: 45 })], [
      window("2026-09-01T09:00:00.000Z", "2026-09-01T10:00:00.000Z"),
    ]);

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      taskId: id(1),
      startsAt: "2026-09-01T09:00:00.000Z",
      endsAt: "2026-09-01T09:45:00.000Z",
      durationMinutes: 45,
    });
    expect(result.unscheduledWork).toEqual([]);
  });

  it("packs multiple tasks into one window in stable order", () => {
    const result = plan(
      [task(2, { estimatedMinutes: 30 }), task(1, { estimatedMinutes: 20 })],
      [window("2026-09-01T09:00:00.000Z", "2026-09-01T10:00:00.000Z")],
    );

    expect(result.sessions.map((session) => session.taskId)).toEqual([id(1), id(2)]);
    expect(result.sessions.map((session) => session.startsAt)).toEqual([
      "2026-09-01T09:00:00.000Z",
      "2026-09-01T09:20:00.000Z",
    ]);
  });

  it("splits long work at the named maximum and across windows", () => {
    const result = plan([task(1, { estimatedMinutes: 150 })], [
      window("2026-09-01T09:00:00.000Z", "2026-09-01T10:00:00.000Z"),
      window("2026-09-01T11:00:00.000Z", "2026-09-01T13:00:00.000Z"),
    ]);

    expect(MAX_STUDY_SESSION_MINUTES).toBe(90);
    expect(result.sessions.map((session) => session.durationMinutes)).toEqual([60, 90]);
  });

  it("schedules deterministically over multiple days", () => {
    const result = plan([task(1, { estimatedMinutes: 120 })], [
      window("2026-09-01T17:00:00.000Z", "2026-09-01T18:00:00.000Z"),
      window("2026-09-02T08:00:00.000Z", "2026-09-02T09:00:00.000Z"),
    ]);

    expect(result.sessions.map((session) => session.startsAt)).toEqual([
      "2026-09-01T17:00:00.000Z",
      "2026-09-02T08:00:00.000Z",
    ]);
  });

  it("orders by deadline before priority", () => {
    const result = plan(
      [
        task(1, { dueAt: "2026-09-02T12:00:00.000Z", priority: "high" }),
        task(2, { dueAt: "2026-09-01T12:00:00.000Z", priority: "low" }),
      ],
      [window("2026-09-01T09:00:00.000Z", "2026-09-01T11:00:00.000Z")],
    );

    expect(result.sessions[0]?.taskId).toBe(id(2));
  });

  it("uses priority and then creation/id as deterministic tie breakers", () => {
    const result = plan(
      [
        task(3, { priority: "low" }),
        task(2, { priority: "high", createdAt: "2026-08-02T00:00:00.000Z" }),
        task(1, { priority: "high", createdAt: "2026-08-01T00:00:00.000Z" }),
      ],
      [window("2026-09-01T09:00:00.000Z", "2026-09-01T12:00:00.000Z")],
    );

    expect(result.sessions.map((session) => session.taskId)).toEqual([
      id(1),
      id(2),
      id(3),
    ]);
  });

  it("returns every minute that cannot fit instead of dropping work", () => {
    const result = plan([task(1, { estimatedMinutes: 100 })], [
      window("2026-09-01T09:00:00.000Z", "2026-09-01T09:30:00.000Z"),
    ]);

    expect(result.unscheduledWork).toEqual([
      {
        taskId: id(1),
        taskTitle: "Task 1",
        estimatedMinutes: 100,
        scheduledMinutes: 30,
        unscheduledMinutes: 70,
        reason: "insufficient_availability",
      },
    ]);
  });

  it("uses time before a deadline first and marks unavoidable late work", () => {
    const result = plan(
      [task(1, { dueAt: "2026-09-01T09:30:00.000Z", estimatedMinutes: 60 })],
      [window("2026-09-01T09:00:00.000Z", "2026-09-01T10:30:00.000Z")],
    );

    expect(result.sessions.map((session) => session.durationMinutes)).toEqual([30, 30]);
    expect(result.sessions.map((session) => session.scheduledAfterDeadline)).toEqual([
      false,
      true,
    ]);
  });

  it("handles already-overdue work predictably at the earliest availability", () => {
    const result = plan(
      [task(1, { dueAt: "2026-08-31T23:00:00.000Z" })],
      [window("2026-09-01T09:00:00.000Z", "2026-09-01T10:00:00.000Z")],
    );

    expect(result.sessions[0]).toMatchObject({
      startsAt: "2026-09-01T09:00:00.000Z",
      scheduledAfterDeadline: true,
    });
  });

  it("clips and merges overlapping availability deterministically", () => {
    const validation = validateStudyPlanningRequest({
      planningRange: RANGE,
      availability: [
        window("2026-09-01T07:00:00.000Z", "2026-09-01T09:30:00.000Z"),
        window("2026-09-01T09:00:00.000Z", "2026-09-01T10:00:00.000Z"),
      ],
    });

    expect(validation).toEqual({
      ok: true,
      value: {
        planningRange: RANGE,
        availability: [
          window("2026-09-01T08:00:00.000Z", "2026-09-01T10:00:00.000Z"),
        ],
      },
    });
  });

  it("rejects malformed ranges, availability, estimates, and duplicate IDs", () => {
    expect(
      validateStudyPlanningRequest({
        planningRange: { startsAt: RANGE.endsAt, endsAt: RANGE.startsAt },
        availability: [window(RANGE.startsAt, RANGE.endsAt)],
      }),
    ).toMatchObject({ ok: false });
    expect(validateStudyPlanningRequest({ planningRange: RANGE, availability: [] })).toMatchObject({
      ok: false,
    });
    expect(validateCreateTaskInput({ title: "Bad", estimatedMinutes: 0 })).toMatchObject({
      ok: false,
    });
    expect(validatePatchTaskInput({ estimatedMinutes: -1 })).toMatchObject({ ok: false });
    expect(() =>
      plan([task(1, { estimatedMinutes: 0 })], [window(RANGE.startsAt, RANGE.endsAt)]),
    ).toThrow(PlanningValidationError);
    expect(() =>
      plan([task(1), task(1)], [window(RANGE.startsAt, RANGE.endsAt)]),
    ).toThrow("unique");
  });

  it("returns identical normalized output for equivalent repeated input", () => {
    const tasks = [task(2), task(1, { priority: "high", estimatedMinutes: 120 })];
    const windows = [
      window("2026-09-01T09:00:00+00:00", "2026-09-01T12:00:00+00:00"),
    ];

    expect(plan(tasks, windows)).toEqual(plan([...tasks], [...windows]));
  });
});

function plan(tasks: readonly PlannerTask[], availability: readonly ReturnType<typeof window>[]) {
  return generateDeterministicStudyPlan({ tasks, planningRange: RANGE, availability });
}

function task(
  number: number,
  overrides: Partial<{
    readonly createdAt: string;
    readonly dueAt: string | null;
    readonly estimatedMinutes: number;
    readonly priority: TaskPriority;
  }> = {},
): PlannerTask {
  return {
    id: id(number),
    title: `Task ${number}`,
    dueAt: null,
    estimatedMinutes: 30,
    priority: "medium",
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function id(number: number): string {
  return `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function window(startsAt: string, endsAt: string) {
  return { startsAt, endsAt } as const;
}
