import type { ActivitySummary } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";

import { groupCourseTasks, relativeDue, summarizeTaskCourses, taskGroupOf } from "./tasksPresentation";

const now = Date.parse("2026-09-25T02:00:00.000Z");
const day = 86_400_000;
const capstone = { id: "capstone", code: "CIT6 | CITCS 3N GROUP A", name: "CIT6 | CITCS 3N GROUP A | CAPSTONE PROJECT 1" };
const security = { id: "security", code: null, name: "IT Security" };

function task(id: string, overrides: Partial<ActivitySummary>): ActivitySummary {
  return {
    id,
    taskId: null,
    course: capstone,
    title: id,
    dueAt: null,
    status: "unknown",
    priority: "medium",
    estimatedMinutes: null,
    submissionTypes: [],
    source: "canvas",
    isOverdue: false,
    urgency: "later",
    hasGeneratedDraft: false,
    ...overrides,
  };
}
const at = (offset: number) => new Date(now + offset).toISOString();

describe("Tasks presentation", () => {
  it("classifies from real status and deadlines only", () => {
    expect(taskGroupOf(task("m", { isOverdue: true, dueAt: at(-day) }), now)).toBe("missing");
    expect(taskGroupOf(task("s", { dueAt: at(3 * day) }), now)).toBe("due_soon");
    expect(taskGroupOf(task("u", { dueAt: at(30 * day) }), now)).toBe("upcoming");
    expect(taskGroupOf(task("n", { dueAt: null }), now)).toBe("upcoming");
    expect(taskGroupOf(task("c", { status: "completed", isOverdue: false }), now)).toBe("completed");
    expect(taskGroupOf(task("x", { status: "submitted", dueAt: at(-day) }), now)).toBe("completed");
  });

  it("orders a course by attention: missing, due soon, upcoming (undated last), completed", () => {
    const groups = groupCourseTasks([
      task("undated", {}),
      task("later", { dueAt: at(20 * day) }),
      task("soon-2", { dueAt: at(5 * day) }),
      task("soon-1", { dueAt: at(1 * day) }),
      task("missed-old", { isOverdue: true, dueAt: at(-5 * day) }),
      task("missed-new", { isOverdue: true, dueAt: at(-1 * day) }),
      task("done", { status: "completed", dueAt: at(-3 * day) }),
    ], now);
    expect(groups.map((group) => [group.key, group.items.map((item) => item.id)])).toEqual([
      ["missing", ["missed-new", "missed-old"]],
      ["due_soon", ["soon-1", "soon-2"]],
      ["upcoming", ["later", "undated"]],
      ["completed", ["done"]],
    ]);
  });

  it("counts due, missing and completed per course without estimating", () => {
    const summaries = summarizeTaskCourses([
      task("a", { dueAt: at(day) }),
      task("b", { isOverdue: true, dueAt: at(-day) }),
      task("c", { status: "submitted" }),
      task("d", { status: "completed" }),
      task("e", { course: security, dueAt: at(2 * day) }),
      task("p", { course: null, source: "local" }),
    ]);
    expect(summaries.map(({ key, due, missing, completed, total }) => ({ key, due, missing, completed, total }))).toEqual([
      { key: "capstone", due: 1, missing: 1, completed: 2, total: 4 },
      { key: "security", due: 1, missing: 0, completed: 0, total: 1 },
      { key: "personal", due: 1, missing: 0, completed: 0, total: 1 },
    ]);
  });

  it("puts courses with missing work first, then the nearest deadline", () => {
    const summaries = summarizeTaskCourses([
      task("far", { course: security, dueAt: at(9 * day) }),
      task("near", { course: { id: "near", code: null, name: "Near" }, dueAt: at(day) }),
      task("missed", { isOverdue: true, dueAt: at(-day) }),
    ]);
    expect(summaries.map((summary) => summary.key)).toEqual(["capstone", "near", "security"]);
  });

  it("writes relative deadlines for the next few days", () => {
    const today = new Date(now);
    today.setHours(23, 59, 0, 0);
    expect(relativeDue(today.toISOString(), now)).toMatch(/^Today, /);
    expect(relativeDue(null, now)).toBe("No deadline");
  });
});
