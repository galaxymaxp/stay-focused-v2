import { describe, expect, it } from "vitest";

import { schedulableCanvasAssignmentIds } from "./canvas-task-scheduling";

const NOW = Date.parse("2026-09-26T08:00:00.000Z");
const FUTURE = "2026-09-28T15:59:00.000Z";

function assignment(id: string, overrides: Partial<{ course_id: string; due_at: string | null; submission_types: string[] }> = {}) {
  return { id, course_id: "course-a", due_at: FUTURE, submission_types: ["online_upload"], ...overrides };
}

function submission(assignment_id: string, overrides: Partial<{ submitted_at: string | null; excused: boolean | null; workflow_state: "submitted" | "unsubmitted" | "graded" | "pending_review" | null; missing: boolean | null }> = {}) {
  return { assignment_id, submitted_at: null, excused: null, workflow_state: "unsubmitted" as const, missing: null, ...overrides };
}

function eligible(input: Partial<Parameters<typeof schedulableCanvasAssignmentIds>[0]>) {
  return schedulableCanvasAssignmentIds({
    assignments: [],
    submissions: [],
    selectedCourseIds: new Set(["course-a"]),
    importedAssignmentIds: new Set(),
    now: NOW,
    ...input,
  });
}

describe("schedulable Canvas assignments", () => {
  it("schedules upcoming, unsubmitted work from synced courses without a manual import", () => {
    expect(eligible({ assignments: [assignment("b"), assignment("a")] })).toEqual(["a", "b"]);
  });

  it("leaves past-due and undated work visible but unscheduled", () => {
    expect(eligible({
      assignments: [
        assignment("past", { due_at: "2026-09-25T08:00:00.000Z" }),
        assignment("undated", { due_at: null }),
        assignment("invalid", { due_at: "not a date" }),
      ],
    })).toEqual([]);
  });

  it("skips work Canvas already counts as handed in or excused", () => {
    expect(eligible({
      assignments: [assignment("sent"), assignment("excused"), assignment("graded"), assignment("missing-graded")],
      submissions: [
        submission("sent", { submitted_at: "2026-09-25T08:00:00.000Z", workflow_state: "submitted" }),
        submission("excused", { excused: true }),
        submission("graded", { workflow_state: "graded", missing: false }),
        submission("missing-graded", { workflow_state: "graded", missing: true }),
      ],
    })).toEqual(["missing-graded"]);
  });

  it("never re-imports existing tasks, so their status and estimates are kept", () => {
    expect(eligible({ assignments: [assignment("a"), assignment("b")], importedAssignmentIds: new Set(["a"]) })).toEqual(["b"]);
  });

  it("ignores courses the student stopped syncing but keeps deadline-bearing work with no submission", () => {
    expect(eligible({
      assignments: [
        assignment("unsynced", { course_id: "course-b" }),
        assignment("not-graded", { submission_types: ["not_graded"] }),
      ],
    })).toEqual(["not-graded"]);
  });
});
