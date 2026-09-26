import type { CanvasAssignmentRow, CanvasAssignmentSubmissionRow } from "@stay-focused/db";

import {
  isActionableCanvasAssignment,
  isSubmittedCanvasSubmission,
} from "@/lib/experience/mappers";

/**
 * Canvas assignments the planner may schedule without the student adding them
 * to Tasks first. Only work Canvas gives enough information to place is
 * eligible: a future deadline, from a course the student still syncs, not
 * already handed in, and not already a task. Past-due work stays visible as
 * overdue but is never silently scheduled into the student's time.
 */
export function schedulableCanvasAssignmentIds(input: {
  readonly assignments: readonly Pick<CanvasAssignmentRow, "id" | "course_id" | "due_at" | "submission_types">[];
  readonly submissions: readonly Pick<CanvasAssignmentSubmissionRow, "assignment_id" | "submitted_at" | "excused" | "workflow_state" | "missing">[];
  readonly selectedCourseIds: ReadonlySet<string>;
  readonly importedAssignmentIds: ReadonlySet<string>;
  readonly now: number;
}): string[] {
  const submitted = new Set(
    input.submissions.filter(isSubmittedCanvasSubmission).map((submission) => submission.assignment_id),
  );
  return input.assignments
    .filter((assignment) => {
      const due = assignment.due_at ? Date.parse(assignment.due_at) : Number.NaN;
      return (
        Number.isFinite(due) &&
        due > input.now &&
        input.selectedCourseIds.has(assignment.course_id) &&
        isActionableCanvasAssignment(assignment) &&
        !submitted.has(assignment.id) &&
        !input.importedAssignmentIds.has(assignment.id)
      );
    })
    .map((assignment) => assignment.id)
    .sort();
}
