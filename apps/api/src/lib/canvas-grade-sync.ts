import type {
  CanvasClient,
  CanvasGradeAssignment,
  CanvasOwnSubmission,
} from "@stay-focused/canvas";
import { CanvasClientError } from "@stay-focused/canvas";
import type {
  CanvasAssignmentNormalizedStatus,
  CanvasConnectionRow,
  CanvasCourseGradeSyncFailureCategory,
  CanvasCourseGradeSyncStateRow,
  CanvasCourseRow,
  Database,
  Json,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CONNECTION_SECRET_COLUMNS,
  createCanvasClient,
  decryptConnectionToken,
  readConnection,
} from "@/lib/canvas-routes";
import {
  CANVAS_ASSIGNMENT_NORMALIZED_STATUSES,
  CanvasGradeSyncNormalizationError,
  createCanvasCourseGradeSummaryPayload,
  createCanvasGradeAssignmentSubmissionSnapshotPayload,
  type CanvasGradeSyncAssignmentSubmissionSnapshotPayload,
  type CanvasGradeSyncCourseSummaryPayload,
  type CanvasGradeSyncFailureCode,
} from "@/lib/canvas-grade-sync-normalize";

const COURSE_COLUMNS =
  "id,user_id,canvas_connection_id,canvas_course_id,name,course_code,workflow_state,enrollment_term_id,account_id,start_at,end_at,time_zone,public_syllabus,syllabus_body,canvas_updated_at,first_synced_at,last_synced_at,created_at,updated_at";
const SELECTED_PREFERENCE_COLUMNS = "id,selected";

export type CanvasCourseGradeSyncStatus = "succeeded" | "partial" | "failed";
export type CanvasCourseGradeSyncFamilyStatus =
  | "succeeded"
  | "unchanged"
  | "failed";
export type CanvasCourseGradeSummarySyncFamilyStatus =
  | CanvasCourseGradeSyncFamilyStatus
  | "not_applicable";

export interface CanvasCourseGradeSyncResult {
  readonly status: CanvasCourseGradeSyncStatus;
  readonly assignmentSubmission: {
    readonly status: CanvasCourseGradeSyncFamilyStatus;
    readonly assignmentCount: number;
    readonly submissionEvidenceCount: number;
    readonly persistedCount: number;
    readonly statusCounts: Record<CanvasAssignmentNormalizedStatus, number>;
    readonly failureCode?: CanvasGradeSyncFailureCode;
  };
  readonly courseGradeSummary: {
    readonly status: CanvasCourseGradeSummarySyncFamilyStatus;
    readonly visibleFieldCount: number;
    readonly failureCode?: CanvasGradeSyncFailureCode;
  };
  readonly lastCheckedAt: string;
  readonly lastSuccessfulSyncAt: string | null;
}

interface CanvasGradeSyncContext {
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourseRow;
  readonly token: string;
}

interface CanvasGradeSyncFailure {
  readonly code: CanvasGradeSyncFailureCode;
  readonly category: CanvasCourseGradeSyncFailureCategory;
}

interface CanvasGradeSyncStateSummary {
  readonly lastCheckedAt: string | null;
  readonly lastSuccessfulSyncAt: string | null;
}

interface CanvasGradeAssignmentSubmissionPersistenceResult {
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly markedAbsent: number;
  readonly persistedCount: number;
}

interface CanvasCourseGradeSummaryPersistenceResult {
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly visibleFieldCount: number;
}

interface CanvasGradeSyncDependencies {
  readonly beginSync?: (input: {
    readonly client: SupabaseClient<Database>;
    readonly connectionId: string;
    readonly courseId: string;
    readonly startedAt: string;
    readonly userId: string;
  }) => Promise<
    | { readonly ok: true; readonly state: CanvasGradeSyncStateSummary }
    | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
  >;
  readonly createCanvasClient?: (
    baseUrl: string,
    token: string,
  ) => Pick<
    CanvasClient,
    | "getOwnCourseGradeSummary"
    | "listCourseAssignments"
    | "listOwnCourseSubmissions"
  >;
  readonly finishSync?: (input: {
    readonly assignmentCount: number;
    readonly assignmentFamilyState: "succeeded" | "failed";
    readonly client: SupabaseClient<Database>;
    readonly completedAt: string;
    readonly connectionId: string;
    readonly courseGradeSummaryCount: number;
    readonly courseGradeSummaryFamilyState: "succeeded" | "failed";
    readonly courseId: string;
    readonly failure: CanvasGradeSyncFailure | null;
    readonly fingerprint: string | null;
    readonly fingerprintVersion: string | null;
    readonly status: CanvasCourseGradeSyncStatus;
    readonly submissionCount: number;
    readonly submissionFamilyState: "succeeded" | "failed";
    readonly userId: string;
  }) => Promise<
    | { readonly ok: true; readonly state: CanvasGradeSyncStateSummary }
    | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
  >;
  readonly loadContext?: (input: {
    readonly client: SupabaseClient<Database>;
    readonly courseId: string;
    readonly userId: string;
  }) => Promise<
    | { readonly ok: true; readonly value: CanvasGradeSyncContext }
    | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
  >;
  readonly logger?: {
    readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
    readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
  };
  readonly now?: () => Date;
  readonly persistAssignmentSubmissionSnapshot?: (input: {
    readonly client: SupabaseClient<Database>;
    readonly connectionId: string;
    readonly courseId: string;
    readonly snapshot: CanvasGradeSyncAssignmentSubmissionSnapshotPayload;
    readonly syncedAt: string;
    readonly userId: string;
  }) => Promise<
    | {
        readonly ok: true;
        readonly value: CanvasGradeAssignmentSubmissionPersistenceResult;
      }
    | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
  >;
  readonly persistCourseGradeSummary?: (input: {
    readonly client: SupabaseClient<Database>;
    readonly connectionId: string;
    readonly courseId: string;
    readonly summary: CanvasGradeSyncCourseSummaryPayload;
    readonly syncedAt: string;
    readonly userId: string;
  }) => Promise<
    | {
        readonly ok: true;
        readonly value: CanvasCourseGradeSummaryPersistenceResult;
      }
    | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
  >;
}

export async function syncCanvasCourseGrades({
  client,
  courseId,
  dependencies = {},
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly dependencies?: CanvasGradeSyncDependencies;
  readonly userId: string;
}): Promise<CanvasCourseGradeSyncResult> {
  const now = dependencies.now ?? (() => new Date());
  const startedAtDate = now();
  const startedAt = startedAtDate.toISOString();
  const normalizedCourseId = courseId.trim();
  if (!normalizedCourseId) {
    return failureOnlyResult({
      checkedAt: startedAt,
      failure: {
        category: "unknown",
        code: "invalid_request",
      },
      lastSuccessfulSyncAt: null,
    });
  }

  const loadContext = dependencies.loadContext ?? defaultLoadContext;
  const context = await loadContext({
    client,
    courseId: normalizedCourseId,
    userId,
  });
  if (!context.ok) {
    return failureOnlyResult({
      checkedAt: startedAt,
      failure: context.failure,
      lastSuccessfulSyncAt: null,
    });
  }

  const beginSync = dependencies.beginSync ?? defaultBeginSync;
  const begin = await beginSync({
    client,
    connectionId: context.value.connection.id,
    courseId: context.value.course.id,
    startedAt,
    userId,
  });
  if (!begin.ok) {
    return failureOnlyResult({
      checkedAt: startedAt,
      failure: begin.failure,
      lastSuccessfulSyncAt: null,
    });
  }

  const canvas = (dependencies.createCanvasClient ?? createCanvasClient)(
    context.value.connection.base_url,
    context.value.token,
  );
  const syncedAt = now().toISOString();
  const assignmentFamily = await synchronizeAssignmentSubmissionFamily({
    canvas,
    client,
    connectionId: context.value.connection.id,
    courseCanvasId: context.value.course.canvas_course_id,
    courseId: context.value.course.id,
    dependencies,
    now: new Date(syncedAt),
    syncedAt,
    userId,
  });
  const summaryFamily = await synchronizeCourseGradeSummaryFamily({
    canvas,
    client,
    connectionId: context.value.connection.id,
    courseCanvasId: context.value.course.canvas_course_id,
    courseId: context.value.course.id,
    dependencies,
    syncedAt,
    userId,
  });

  const overallStatus = overallStatusForFamilies({
    assignmentSucceeded: assignmentFamily.failure === null,
    summarySucceeded: summaryFamily.failure === null,
  });
  const primaryFailure =
    assignmentFamily.failure ?? summaryFamily.failure ?? null;
  const completedAt = now().toISOString();
  const finishSync = dependencies.finishSync ?? defaultFinishSync;
  const finish = await finishSync({
    assignmentCount: assignmentFamily.assignmentCount,
    assignmentFamilyState:
      assignmentFamily.failure === null ? "succeeded" : "failed",
    client,
    completedAt,
    connectionId: context.value.connection.id,
    courseGradeSummaryCount: summaryFamily.failure === null ? 1 : 0,
    courseGradeSummaryFamilyState:
      summaryFamily.failure === null ? "succeeded" : "failed",
    courseId: context.value.course.id,
    failure: primaryFailure,
    fingerprint: assignmentFamily.snapshotFingerprint,
    fingerprintVersion: assignmentFamily.fingerprintVersion,
    status: overallStatus,
    submissionCount: assignmentFamily.submissionEvidenceCount,
    submissionFamilyState:
      assignmentFamily.failure === null ? "succeeded" : "failed",
    userId,
  });

  const stateFailure = finish.ok ? null : finish.failure;
  const resultStatus =
    stateFailure && overallStatus === "succeeded" ? "partial" : overallStatus;
  const result: CanvasCourseGradeSyncResult = {
    status: resultStatus,
    assignmentSubmission: assignmentFamily.result,
    courseGradeSummary: summaryFamily.result,
    lastCheckedAt: finish.ok
      ? (finish.state.lastCheckedAt ?? completedAt)
      : completedAt,
    lastSuccessfulSyncAt: finish.ok
      ? finish.state.lastSuccessfulSyncAt
      : begin.state.lastSuccessfulSyncAt,
  };

  logSafeSyncResult({
    durationMs: Math.max(0, Date.parse(completedAt) - startedAtDate.getTime()),
    logger: dependencies.logger,
    result,
    stateFailure,
  });
  return result;
}

async function synchronizeAssignmentSubmissionFamily({
  canvas,
  client,
  connectionId,
  courseCanvasId,
  courseId,
  dependencies,
  now,
  syncedAt,
  userId,
}: {
  readonly canvas: Pick<
    CanvasClient,
    "listCourseAssignments" | "listOwnCourseSubmissions"
  >;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseCanvasId: string;
  readonly courseId: string;
  readonly dependencies: CanvasGradeSyncDependencies;
  readonly now: Date;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<{
  readonly assignmentCount: number;
  readonly failure: CanvasGradeSyncFailure | null;
  readonly fingerprintVersion: string | null;
  readonly result: CanvasCourseGradeSyncResult["assignmentSubmission"];
  readonly snapshotFingerprint: string | null;
  readonly submissionEvidenceCount: number;
}> {
  try {
    const [assignments, submissions] = await fetchAssignmentSubmissionEvidence({
      canvas,
      courseCanvasId,
    });
    const snapshot = createCanvasGradeAssignmentSubmissionSnapshotPayload({
      assignments,
      now,
      submissions,
    });
    const persist =
      dependencies.persistAssignmentSubmissionSnapshot ??
      defaultPersistAssignmentSubmissionSnapshot;
    const persisted = await persist({
      client,
      connectionId,
      courseId,
      snapshot,
      syncedAt,
      userId,
    });
    if (!persisted.ok) {
      return failedAssignmentFamily(persisted.failure);
    }

    const changed =
      persisted.value.inserted +
      persisted.value.updated +
      persisted.value.markedAbsent;
    return {
      assignmentCount: snapshot.assignmentCount,
      failure: null,
      fingerprintVersion: snapshot.fingerprintVersion,
      snapshotFingerprint: snapshot.snapshotFingerprint,
      submissionEvidenceCount: snapshot.submissionEvidenceCount,
      result: {
        assignmentCount: snapshot.assignmentCount,
        persistedCount: persisted.value.persistedCount,
        status: changed > 0 ? "succeeded" : "unchanged",
        statusCounts: snapshot.statusCounts,
        submissionEvidenceCount: snapshot.submissionEvidenceCount,
      },
    };
  } catch (error) {
    return failedAssignmentFamily(mapGradeSyncFailure(error));
  }
}

async function synchronizeCourseGradeSummaryFamily({
  canvas,
  client,
  connectionId,
  courseCanvasId,
  courseId,
  dependencies,
  syncedAt,
  userId,
}: {
  readonly canvas: Pick<CanvasClient, "getOwnCourseGradeSummary">;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseCanvasId: string;
  readonly courseId: string;
  readonly dependencies: CanvasGradeSyncDependencies;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<{
  readonly failure: CanvasGradeSyncFailure | null;
  readonly result: CanvasCourseGradeSyncResult["courseGradeSummary"];
}> {
  try {
    const summary = await canvas.getOwnCourseGradeSummary(courseCanvasId);
    const payload = createCanvasCourseGradeSummaryPayload(summary);
    const persist =
      dependencies.persistCourseGradeSummary ?? defaultPersistCourseGradeSummary;
    const persisted = await persist({
      client,
      connectionId,
      courseId,
      summary: payload,
      syncedAt,
      userId,
    });
    if (!persisted.ok) {
      return failedCourseGradeSummaryFamily(persisted.failure);
    }

    const changed = persisted.value.inserted + persisted.value.updated;
    return {
      failure: null,
      result: {
        status: payload.notApplicable
          ? "not_applicable"
          : changed > 0
            ? "succeeded"
            : "unchanged",
        visibleFieldCount: payload.visibleFieldCount,
      },
    };
  } catch (error) {
    return failedCourseGradeSummaryFamily(mapGradeSyncFailure(error));
  }
}

async function fetchAssignmentSubmissionEvidence({
  canvas,
  courseCanvasId,
}: {
  readonly canvas: Pick<
    CanvasClient,
    "listCourseAssignments" | "listOwnCourseSubmissions"
  >;
  readonly courseCanvasId: string;
}): Promise<readonly [readonly CanvasGradeAssignment[], readonly CanvasOwnSubmission[]]> {
  const assignments = await canvas.listCourseAssignments(courseCanvasId);
  const submissions = await canvas.listOwnCourseSubmissions(courseCanvasId);
  return [assignments, submissions] as const;
}

function failedAssignmentFamily(
  failure: CanvasGradeSyncFailure,
): {
  readonly assignmentCount: number;
  readonly failure: CanvasGradeSyncFailure;
  readonly fingerprintVersion: null;
  readonly result: CanvasCourseGradeSyncResult["assignmentSubmission"];
  readonly snapshotFingerprint: null;
  readonly submissionEvidenceCount: number;
} {
  return {
    assignmentCount: 0,
    failure,
    fingerprintVersion: null,
    snapshotFingerprint: null,
    submissionEvidenceCount: 0,
    result: {
      assignmentCount: 0,
      failureCode: failure.code,
      persistedCount: 0,
      status: "failed",
      statusCounts: emptyStatusCounts(),
      submissionEvidenceCount: 0,
    },
  };
}

function failedCourseGradeSummaryFamily(
  failure: CanvasGradeSyncFailure,
): {
  readonly failure: CanvasGradeSyncFailure;
  readonly result: CanvasCourseGradeSyncResult["courseGradeSummary"];
} {
  return {
    failure,
    result: {
      failureCode: failure.code,
      status: "failed",
      visibleFieldCount: 0,
    },
  };
}

async function defaultLoadContext({
  client,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasGradeSyncContext }
  | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
> {
  const connection = await readConnection(client, userId, CONNECTION_SECRET_COLUMNS);
  if (!connection.ok) {
    return { ok: false, failure: storageFailure() };
  }
  if (!connection.row) {
    return {
      ok: false,
      failure: {
        category: "resource_not_found",
        code: "canvas_connection_missing",
      },
    };
  }
  if (connection.row.user_id !== userId || connection.row.status !== "active") {
    return {
      ok: false,
      failure: {
        category: "authentication_failure",
        code: "canvas_authentication_failed",
      },
    };
  }

  const { data: course, error: courseError } = await client
    .from("canvas_courses")
    .select(COURSE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connection.row.id)
    .eq("id", courseId)
    .maybeSingle();
  if (courseError) {
    return { ok: false, failure: storageFailure() };
  }
  if (!course) {
    return {
      ok: false,
      failure: {
        category: "resource_not_found",
        code: "canvas_course_not_found",
      },
    };
  }

  const { data: preference, error: preferenceError } = await client
    .from("canvas_course_sync_preferences")
    .select(SELECTED_PREFERENCE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connection.row.id)
    .eq("course_id", courseId)
    .eq("selected", true)
    .maybeSingle();
  if (preferenceError) {
    return { ok: false, failure: storageFailure() };
  }
  if (!preference) {
    return {
      ok: false,
      failure: {
        category: "resource_not_found",
        code: "canvas_course_not_selected",
      },
    };
  }

  try {
    return {
      ok: true,
      value: {
        connection: connection.row,
        course: course as CanvasCourseRow,
        token: decryptConnectionToken(connection.row),
      },
    };
  } catch {
    return {
      ok: false,
      failure: {
        category: "authentication_failure",
        code: "canvas_authentication_failed",
      },
    };
  }
}

async function defaultBeginSync({
  client,
  connectionId,
  courseId,
  startedAt,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly startedAt: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly state: CanvasGradeSyncStateSummary }
  | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
> {
  const { data, error } = await client
    .rpc("begin_canvas_course_grade_sync", {
      p_canvas_connection_id: connectionId,
      p_course_id: courseId,
      p_started_at: startedAt,
      p_user_id: userId,
    })
    .single();
  if (error || !data) {
    return {
      ok: false,
      failure: isRpcMessage(error, "canvas_grade_sync_in_progress")
        ? {
            category: "partial_sync",
            code: "canvas_sync_in_progress",
          }
        : storageFailure(),
    };
  }
  const state = data as Pick<
    CanvasCourseGradeSyncStateRow,
    "last_checked_at" | "last_successful_sync_at"
  >;
  return {
    ok: true,
    state: {
      lastCheckedAt: state.last_checked_at,
      lastSuccessfulSyncAt: state.last_successful_sync_at,
    },
  };
}

async function defaultPersistAssignmentSubmissionSnapshot({
  client,
  connectionId,
  courseId,
  snapshot,
  syncedAt,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly snapshot: CanvasGradeSyncAssignmentSubmissionSnapshotPayload;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<
  | {
      readonly ok: true;
      readonly value: CanvasGradeAssignmentSubmissionPersistenceResult;
    }
  | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
> {
  const { data, error } = await client
    .rpc("replace_canvas_course_assignment_submission_snapshot", {
      p_assignments: snapshot.assignments as unknown as Json,
      p_canvas_connection_id: connectionId,
      p_course_id: courseId,
      p_fingerprint_version: snapshot.fingerprintVersion,
      p_snapshot_fingerprint: snapshot.snapshotFingerprint,
      p_synced_at: syncedAt,
      p_user_id: userId,
    })
    .single();
  if (error || !data) {
    return { ok: false, failure: storageFailure() };
  }
  const result = data as {
    readonly assignments_inserted: number;
    readonly assignments_updated: number;
    readonly assignments_unchanged: number;
    readonly assignments_marked_absent: number;
    readonly persisted_count: number;
  };
  return {
    ok: true,
    value: {
      inserted: result.assignments_inserted,
      markedAbsent: result.assignments_marked_absent,
      persistedCount: result.persisted_count,
      unchanged: result.assignments_unchanged,
      updated: result.assignments_updated,
    },
  };
}

async function defaultPersistCourseGradeSummary({
  client,
  connectionId,
  courseId,
  summary,
  syncedAt,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly summary: CanvasGradeSyncCourseSummaryPayload;
  readonly syncedAt: string;
  readonly userId: string;
}): Promise<
  | {
      readonly ok: true;
      readonly value: CanvasCourseGradeSummaryPersistenceResult;
    }
  | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
> {
  const { data, error } = await client
    .rpc("upsert_canvas_course_grade_summary", {
      p_canvas_connection_id: connectionId,
      p_course_id: courseId,
      p_summary: summary as unknown as Json,
      p_synced_at: syncedAt,
      p_user_id: userId,
    })
    .single();
  if (error || !data) {
    return { ok: false, failure: storageFailure() };
  }
  const result = data as {
    readonly summaries_inserted: number;
    readonly summaries_updated: number;
    readonly summaries_unchanged: number;
    readonly visible_field_count: number;
  };
  return {
    ok: true,
    value: {
      inserted: result.summaries_inserted,
      unchanged: result.summaries_unchanged,
      updated: result.summaries_updated,
      visibleFieldCount: result.visible_field_count,
    },
  };
}

async function defaultFinishSync({
  assignmentCount,
  assignmentFamilyState,
  client,
  completedAt,
  connectionId,
  courseGradeSummaryCount,
  courseGradeSummaryFamilyState,
  courseId,
  failure,
  fingerprint,
  fingerprintVersion,
  status,
  submissionCount,
  submissionFamilyState,
  userId,
}: {
  readonly assignmentCount: number;
  readonly assignmentFamilyState: "succeeded" | "failed";
  readonly client: SupabaseClient<Database>;
  readonly completedAt: string;
  readonly connectionId: string;
  readonly courseGradeSummaryCount: number;
  readonly courseGradeSummaryFamilyState: "succeeded" | "failed";
  readonly courseId: string;
  readonly failure: CanvasGradeSyncFailure | null;
  readonly fingerprint: string | null;
  readonly fingerprintVersion: string | null;
  readonly status: CanvasCourseGradeSyncStatus;
  readonly submissionCount: number;
  readonly submissionFamilyState: "succeeded" | "failed";
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly state: CanvasGradeSyncStateSummary }
  | { readonly ok: false; readonly failure: CanvasGradeSyncFailure }
> {
  const { data, error } = await client
    .rpc("finish_canvas_course_grade_sync", {
      p_assignment_count: assignmentCount,
      p_assignment_family_state: assignmentFamilyState,
      p_canvas_connection_id: connectionId,
      p_completed_at: completedAt,
      p_course_grade_summary_count: courseGradeSummaryCount,
      p_course_grade_summary_family_state: courseGradeSummaryFamilyState,
      p_course_id: courseId,
      p_failure_category: failure?.category ?? null,
      p_failure_code: failure?.code ?? null,
      p_fingerprint_version: fingerprintVersion,
      p_source_fingerprint: fingerprint,
      p_status: status,
      p_submission_count: submissionCount,
      p_submission_family_state: submissionFamilyState,
      p_user_id: userId,
    })
    .single();
  if (error || !data) {
    return { ok: false, failure: storageFailure() };
  }
  const state = data as Pick<
    CanvasCourseGradeSyncStateRow,
    "last_checked_at" | "last_successful_sync_at"
  >;
  return {
    ok: true,
    state: {
      lastCheckedAt: state.last_checked_at,
      lastSuccessfulSyncAt: state.last_successful_sync_at,
    },
  };
}

function mapGradeSyncFailure(error: unknown): CanvasGradeSyncFailure {
  if (error instanceof CanvasGradeSyncNormalizationError) {
    return {
      category: "normalization_failure",
      code: "canvas_grade_sync_failed",
    };
  }
  if (error instanceof CanvasClientError) {
    switch (error.code) {
      case "canvas_unauthorized":
      case "missing_access_token":
        return {
          category: "authentication_failure",
          code: "canvas_authentication_failed",
        };
      case "canvas_forbidden":
        return {
          category: "permission_denied",
          code: "canvas_permission_denied",
        };
      case "canvas_not_found":
        return {
          category: "resource_not_found",
          code: "canvas_course_not_found",
        };
      case "canvas_rate_limited":
        return { category: "rate_limited", code: "canvas_rate_limited" };
      case "canvas_timeout":
        return { category: "timeout", code: "canvas_timeout" };
      case "canvas_malformed_json":
      case "canvas_invalid_response":
        return {
          category: "malformed_response",
          code: "canvas_grade_sync_failed",
        };
      case "canvas_pagination_rejected":
        return {
          category: "pagination_rejected",
          code: "canvas_grade_sync_failed",
        };
      case "canvas_redirect_rejected":
        return {
          category: "redirect_rejected",
          code: "canvas_grade_sync_failed",
        };
      case "canvas_network_error":
      case "canvas_unavailable":
      case "canvas_request_failed":
      case "invalid_base_url":
      case "canvas_file_download_failed":
      case "canvas_file_download_timeout":
      case "canvas_file_redirect_rejected":
      case "canvas_file_too_large":
        return { category: "network_error", code: "canvas_unavailable" };
    }
  }
  return {
    category: "unknown",
    code: "canvas_grade_sync_failed",
  };
}

function overallStatusForFamilies({
  assignmentSucceeded,
  summarySucceeded,
}: {
  readonly assignmentSucceeded: boolean;
  readonly summarySucceeded: boolean;
}): CanvasCourseGradeSyncStatus {
  if (assignmentSucceeded && summarySucceeded) {
    return "succeeded";
  }
  if (assignmentSucceeded || summarySucceeded) {
    return "partial";
  }
  return "failed";
}

function failureOnlyResult({
  checkedAt,
  failure,
  lastSuccessfulSyncAt,
}: {
  readonly checkedAt: string;
  readonly failure: CanvasGradeSyncFailure;
  readonly lastSuccessfulSyncAt: string | null;
}): CanvasCourseGradeSyncResult {
  return {
    status: "failed",
    assignmentSubmission: {
      assignmentCount: 0,
      failureCode: failure.code,
      persistedCount: 0,
      status: "failed",
      statusCounts: emptyStatusCounts(),
      submissionEvidenceCount: 0,
    },
    courseGradeSummary: {
      failureCode: failure.code,
      status: "failed",
      visibleFieldCount: 0,
    },
    lastCheckedAt: checkedAt,
    lastSuccessfulSyncAt,
  };
}

function emptyStatusCounts(): Record<CanvasAssignmentNormalizedStatus, number> {
  return Object.fromEntries(
    CANVAS_ASSIGNMENT_NORMALIZED_STATUSES.map((status) => [status, 0]),
  ) as Record<CanvasAssignmentNormalizedStatus, number>;
}

function storageFailure(): CanvasGradeSyncFailure {
  return {
    category: "persistence_failure",
    code: "canvas_storage_failed",
  };
}

function isRpcMessage(error: unknown, message: string): boolean {
  return (
    isRecord(error) &&
    typeof error.message === "string" &&
    error.message.includes(message)
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function logSafeSyncResult({
  durationMs,
  logger,
  result,
  stateFailure,
}: {
  readonly durationMs: number;
  readonly logger: CanvasGradeSyncDependencies["logger"] | undefined;
  readonly result: CanvasCourseGradeSyncResult;
  readonly stateFailure: CanvasGradeSyncFailure | null;
}): void {
  const metadata = {
    assignmentCount: result.assignmentSubmission.assignmentCount,
    assignmentStatus: result.assignmentSubmission.status,
    durationMs,
    operation: "canvas_grade_sync",
    status: result.status,
    summaryStatus: result.courseGradeSummary.status,
    visibleFieldCount: result.courseGradeSummary.visibleFieldCount,
    ...(stateFailure ? { stateFailureCode: stateFailure.code } : {}),
  };
  if (result.status === "failed") {
    logger?.warn?.("canvas_grade_sync_finished", metadata);
  } else {
    logger?.info?.("canvas_grade_sync_finished", metadata);
  }
}
