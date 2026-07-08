import type {
  CanvasApiClientError,
  CanvasGradeAssignmentListItem,
  CanvasGradeSyncStatusPayload,
  CanvasGradeVisibilityState,
  CanvasNormalizedAssignmentStatus,
  CanvasVisibleGrade,
  CanvasVisibleScore,
} from "../../services/canvasApi";

export type CanvasGradeStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export interface CanvasGradeStatusPresentation {
  readonly label: string;
  readonly description: string;
  readonly tone: CanvasGradeStatusTone;
  readonly icon: string;
}

export const INITIAL_GRADE_READ_REQUESTS = [
  "syncStatus",
  "summary",
  "assignmentList",
] as const;

export const POST_SYNC_REFRESH_REQUESTS = [
  "syncStatus",
  "summary",
  "firstAssignmentPage",
] as const;

const STATUS_PRESENTATION: Record<
  CanvasNormalizedAssignmentStatus,
  CanvasGradeStatusPresentation
> = {
  unknown: {
    description: "Stay Focused cannot safely determine the state.",
    icon: "help-circle",
    label: "Unknown",
    tone: "muted",
  },
  excused: {
    description: "Canvas marks this assignment as excused.",
    icon: "circle-check",
    label: "Excused",
    tone: "success",
  },
  unavailable: {
    description: "This assignment is not currently available in Stay Focused.",
    icon: "circle-off",
    label: "Unavailable",
    tone: "muted",
  },
  locked: {
    description: "This assignment is not currently open.",
    icon: "lock",
    label: "Locked",
    tone: "neutral",
  },
  missing: {
    description: "Canvas explicitly marks this assignment missing.",
    icon: "circle-alert",
    label: "Missing",
    tone: "danger",
  },
  graded_hidden: {
    description: "Canvas indicates grading state, but the grade is hidden.",
    icon: "eye-off",
    label: "Grade hidden",
    tone: "neutral",
  },
  graded: {
    description: "A visible grade or score is available.",
    icon: "badge-check",
    label: "Graded",
    tone: "success",
  },
  submitted_late: {
    description: "Submitted, and Canvas marks it late.",
    icon: "clock-alert",
    label: "Submitted late",
    tone: "warning",
  },
  submitted: {
    description: "Canvas shows submission evidence.",
    icon: "send",
    label: "Submitted",
    tone: "success",
  },
  late_unsubmitted: {
    description: "Canvas marks it late, but submission evidence is incomplete.",
    icon: "clock",
    label: "Late, submission unclear",
    tone: "warning",
  },
  available: {
    description: "Available to work on or inspect.",
    icon: "circle",
    label: "Available",
    tone: "neutral",
  },
  upcoming: {
    description: "Upcoming according to synchronized Canvas state.",
    icon: "calendar",
    label: "Upcoming",
    tone: "neutral",
  },
  no_due_date: {
    description: "Canvas provides no due date.",
    icon: "calendar-minus",
    label: "No due date",
    tone: "muted",
  },
};

export function getAssignmentStatusPresentation(
  status: CanvasNormalizedAssignmentStatus,
): CanvasGradeStatusPresentation {
  return STATUS_PRESENTATION[status];
}

export function mergeGradeAssignmentPages(
  existing: readonly CanvasGradeAssignmentListItem[],
  incoming: readonly CanvasGradeAssignmentListItem[],
): readonly CanvasGradeAssignmentListItem[] {
  const seen = new Set(existing.map((item) => item.id));
  const appended = incoming.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
  return [...existing, ...appended];
}

export function shouldApplyGradeRequest({
  activeCourseId,
  latestRequestId,
  requestCourseId,
  requestId,
}: {
  readonly activeCourseId: string;
  readonly latestRequestId: number;
  readonly requestCourseId: string;
  readonly requestId: number;
}): boolean {
  return activeCourseId === requestCourseId && latestRequestId === requestId;
}

export function shouldReplaceAssignmentsAfterSync({
  loadedAssignmentCount,
  syncStatus,
}: {
  readonly loadedAssignmentCount: number;
  readonly syncStatus: "succeeded" | "partial" | "failed";
}): boolean {
  return syncStatus !== "failed" || loadedAssignmentCount === 0;
}

export function formatVisibleScore(
  score: CanvasVisibleScore,
  pointsPossible?: number | null,
): string {
  if (score.state !== "visible") {
    return formatVisibilityState(score.state, "score");
  }
  const scoreText =
    score.value === null ? "Canvas has not provided a visible score" : formatNumber(score.value);
  if (pointsPossible === null || pointsPossible === undefined) {
    return scoreText;
  }
  return `${scoreText} / ${formatNumber(pointsPossible)}`;
}

export function formatVisibleGrade(grade: CanvasVisibleGrade): string {
  if (grade.state !== "visible") {
    return formatVisibilityState(grade.state, "grade");
  }
  return grade.value?.trim() || "Visible grade provided";
}

export function formatVisibilityState(
  state: CanvasGradeVisibilityState,
  valueKind: "grade" | "score",
): string {
  switch (state) {
    case "hidden":
      return valueKind === "grade"
        ? "Grade hidden in Canvas"
        : "Score hidden in Canvas";
    case "unavailable":
      return valueKind === "grade"
        ? "Course grade unavailable"
        : "Score unavailable";
    case "not_applicable":
      return "Not applicable";
    case "unknown":
      return valueKind === "grade"
        ? "Canvas has not provided a visible grade"
        : "Canvas has not provided a visible score";
    case "visible":
      return "Visible";
  }
}

export function formatSyncStatusLabel(
  sync: CanvasGradeSyncStatusPayload | null,
): string {
  if (!sync) {
    return "Sync status unknown";
  }
  if (sync.stale && sync.status !== "never_synced") {
    return "Stale synchronized data";
  }
  switch (sync.status) {
    case "never_synced":
      return "Never synced";
    case "running":
      return "Sync running";
    case "succeeded":
      return "Latest sync complete";
    case "partial":
      return "Latest sync partial";
    case "failed":
      return "Latest sync failed";
  }
}

export function formatSyncGuidance(
  sync: CanvasGradeSyncStatusPayload | null,
): string {
  if (!sync) {
    return "Stay Focused could not read grade synchronization status.";
  }
  if (sync.status === "never_synced") {
    return "No grade synchronization has completed for this course.";
  }
  if (sync.status === "running") {
    return "Grade synchronization is already running for this course.";
  }
  if (sync.status === "partial") {
    return "Some synchronized grade information may be incomplete.";
  }
  if (sync.status === "failed") {
    return "The latest grade synchronization failed. Already loaded data can stay visible.";
  }
  if (sync.stale) {
    return "Data remains visible, but it may be older than the freshness window.";
  }
  return "Showing synchronized Canvas grade data from Stay Focused.";
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "No due date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatSecondsLate(value: number | null): string | null {
  if (value === null) {
    return null;
  }
  if (value < 60) {
    return `${value} seconds late`;
  }
  const minutes = Math.floor(value / 60);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} late`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} late`;
  }
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} late`;
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function isNetworkGradeError(error: CanvasApiClientError): boolean {
  return error.code === "network_error" || error.code === "request_aborted";
}
