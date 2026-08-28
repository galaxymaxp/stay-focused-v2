import type { TaskView } from "@stay-focused/shared/task-planning";
import { describe, expect, it } from "vitest";

import {
  canStartPlanning,
  compareTasks,
  describeSource,
  describeWorkload,
  formatDueLabel,
  formatEstimate,
  groupPendingTasks,
  resolveGroup,
  sortCompleted,
  summarizeWork,
} from "./workPresentation";

// A fixed local "now": Wednesday 2026-09-02, 10:00 local time.
const NOW = new Date(2026, 8, 2, 10, 0, 0);

function task(overrides: Partial<TaskView> & Pick<TaskView, "id">): TaskView {
  return {
    title: "Read chapter",
    notes: null,
    status: "pending",
    priority: "medium",
    dueAt: null,
    estimatedMinutes: 30,
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

function localDue(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month, day, hour, 0, 0).toISOString();
}

describe("resolveGroup", () => {
  it("separates overdue, today, the next week, later, and undated work", () => {
    expect(resolveGroup(task({ id: "a", dueAt: localDue(2026, 8, 1) }), NOW)).toBe("overdue");
    expect(resolveGroup(task({ id: "b", dueAt: localDue(2026, 8, 2, 18) }), NOW)).toBe("today");
    expect(resolveGroup(task({ id: "c", dueAt: localDue(2026, 8, 5) }), NOW)).toBe("upcoming");
    expect(resolveGroup(task({ id: "d", dueAt: localDue(2026, 8, 25) }), NOW)).toBe("later");
    expect(resolveGroup(task({ id: "e", dueAt: null }), NOW)).toBe("undated");
  });

  it("treats a deadline earlier today as overdue, not as due today", () => {
    // 8:00 has passed at 10:00; the student cannot still do it "today".
    expect(resolveGroup(task({ id: "a", dueAt: localDue(2026, 8, 2, 8) }), NOW)).toBe("overdue");
  });

  it("keeps the seventh day inside the upcoming window and the eighth outside", () => {
    expect(resolveGroup(task({ id: "a", dueAt: localDue(2026, 8, 9, 9) }), NOW)).toBe("upcoming");
    expect(resolveGroup(task({ id: "b", dueAt: localDue(2026, 8, 10, 9) }), NOW)).toBe("later");
  });

  it("falls back to undated rather than crashing on an unparseable deadline", () => {
    expect(resolveGroup(task({ id: "a", dueAt: "not-a-date" }), NOW)).toBe("undated");
  });
});

describe("groupPendingTasks", () => {
  it("omits completed work and empty groups", () => {
    const groups = groupPendingTasks(
      [
        task({ id: "done", status: "completed", completedAt: "2026-09-01T12:00:00.000Z" }),
        task({ id: "late", dueAt: localDue(2026, 8, 1) }),
        task({ id: "none" }),
      ],
      NOW,
    );

    expect(groups.map((group) => group.id)).toEqual(["overdue", "undated"]);
    expect(groups.flatMap((group) => group.tasks.map((entry) => entry.id))).not.toContain("done");
  });

  it("orders groups by urgency regardless of input order", () => {
    const groups = groupPendingTasks(
      [
        task({ id: "later", dueAt: localDue(2026, 8, 25) }),
        task({ id: "none" }),
        task({ id: "today", dueAt: localDue(2026, 8, 2, 18) }),
        task({ id: "overdue", dueAt: localDue(2026, 8, 1) }),
        task({ id: "soon", dueAt: localDue(2026, 8, 5) }),
      ],
      NOW,
    );

    expect(groups.map((group) => group.id)).toEqual([
      "overdue",
      "today",
      "upcoming",
      "later",
      "undated",
    ]);
  });

  it("returns nothing when every task is completed", () => {
    expect(
      groupPendingTasks([task({ id: "a", status: "completed" })], NOW),
    ).toEqual([]);
  });
});

describe("compareTasks", () => {
  it("orders by deadline, then priority, then creation, matching the planner", () => {
    const ordered = [
      task({ id: "c", dueAt: localDue(2026, 8, 5), priority: "low" }),
      task({ id: "a", dueAt: localDue(2026, 8, 3), priority: "low" }),
      task({ id: "b", dueAt: localDue(2026, 8, 5), priority: "high" }),
    ].sort(compareTasks);

    expect(ordered.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts undated work last even when it is high priority", () => {
    const ordered = [
      task({ id: "undated", priority: "high" }),
      task({ id: "dated", dueAt: localDue(2026, 8, 25), priority: "low" }),
    ].sort(compareTasks);

    expect(ordered.map((entry) => entry.id)).toEqual(["dated", "undated"]);
  });

  it("breaks a full tie on id so ordering is stable", () => {
    const ordered = [task({ id: "b" }), task({ id: "a" })].sort(compareTasks);
    expect(ordered.map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});

describe("summarizeWork and describeWorkload", () => {
  it("counts open, overdue, due-today, and completed work", () => {
    const summary = summarizeWork(
      [
        task({ id: "a", dueAt: localDue(2026, 8, 1) }),
        task({ id: "b", dueAt: localDue(2026, 8, 2, 18) }),
        task({ id: "c" }),
        task({ id: "d", status: "completed", completedAt: "2026-09-01T00:00:00.000Z" }),
      ],
      NOW,
    );

    expect(summary).toEqual({
      pendingCount: 3,
      overdueCount: 1,
      dueTodayCount: 1,
      completedCount: 1,
    });
  });

  it("describes only what is true and stays silent with no open work", () => {
    expect(
      describeWorkload({ pendingCount: 3, overdueCount: 1, dueTodayCount: 2, completedCount: 0 }),
    ).toBe("3 open · 1 overdue · 2 due today");
    expect(
      describeWorkload({ pendingCount: 2, overdueCount: 0, dueTodayCount: 0, completedCount: 5 }),
    ).toBe("2 open");
    expect(
      describeWorkload({ pendingCount: 0, overdueCount: 0, dueTodayCount: 0, completedCount: 4 }),
    ).toBeNull();
  });
});

describe("formatDueLabel", () => {
  it("says when work is due without relying on colour", () => {
    expect(formatDueLabel(localDue(2026, 8, 2, 18), NOW)).toEqual({
      text: "Today 6:00 PM",
      isOverdue: false,
    });
    expect(formatDueLabel(localDue(2026, 8, 3, 9), NOW)).toEqual({
      text: "Tomorrow 9:00 AM",
      isOverdue: false,
    });
    expect(formatDueLabel(localDue(2026, 8, 5, 14), NOW)?.text).toBe("Saturday 2:00 PM");
    expect(formatDueLabel(localDue(2026, 8, 25, 14), NOW)?.text).toBe("Sep 25");
  });

  it("states overdue work in words as well as flagging it", () => {
    expect(formatDueLabel(localDue(2026, 8, 2, 8), NOW)).toEqual({
      text: "Was due 8:00 AM",
      isOverdue: true,
    });
    expect(formatDueLabel(localDue(2026, 8, 1, 8), NOW)).toEqual({
      text: "Overdue by 1 day",
      isOverdue: true,
    });
    expect(formatDueLabel(localDue(2026, 7, 30, 8), NOW)?.text).toBe("Overdue by 3 days");
  });

  it("renders nothing for missing or invalid deadlines", () => {
    expect(formatDueLabel(null, NOW)).toBeNull();
    expect(formatDueLabel("not-a-date", NOW)).toBeNull();
  });
});

describe("formatEstimate", () => {
  it("reads naturally across the supported range", () => {
    expect(formatEstimate(30)).toBe("30 min");
    expect(formatEstimate(60)).toBe("1 hour");
    expect(formatEstimate(120)).toBe("2 hours");
    expect(formatEstimate(90)).toBe("1h 30m");
    expect(formatEstimate(1440)).toBe("24 hours");
  });
});

describe("describeSource", () => {
  it("names Canvas provenance in words and never shows the raw course id", () => {
    const canvasTask = task({
      id: "a",
      sourceType: "canvas",
      canvasCourseId: "1234567",
      canvasAssignmentId: "998877",
      canvasConnectionId: "conn-1",
    });

    expect(describeSource(canvasTask)).toBe("From Canvas");
    expect(describeSource(canvasTask)).not.toContain("1234567");
    expect(describeSource(task({ id: "b" }))).toBeNull();
  });
});

describe("sortCompleted", () => {
  it("shows the most recently finished work first", () => {
    const ordered = sortCompleted([
      task({ id: "old", status: "completed", completedAt: "2026-09-01T08:00:00.000Z" }),
      task({ id: "new", status: "completed", completedAt: "2026-09-02T08:00:00.000Z" }),
      task({ id: "pending" }),
    ]);

    expect(ordered.map((entry) => entry.id)).toEqual(["new", "old"]);
  });

  it("falls back to updatedAt when completedAt is absent", () => {
    const ordered = sortCompleted([
      task({ id: "a", status: "completed", completedAt: null, updatedAt: "2026-09-01T00:00:00.000Z" }),
      task({ id: "b", status: "completed", completedAt: null, updatedAt: "2026-09-03T00:00:00.000Z" }),
    ]);

    expect(ordered.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});

describe("canStartPlanning", () => {
  it("requires at least one pending task", () => {
    expect(canStartPlanning([task({ id: "a" })])).toBe(true);
    expect(canStartPlanning([task({ id: "a", status: "completed" })])).toBe(false);
    expect(canStartPlanning([])).toBe(false);
  });
});
