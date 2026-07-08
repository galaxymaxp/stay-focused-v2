import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { colors, hitTarget, spacing, typography } from "../../design/tokens";
import {
  CANVAS_GRADE_LIST_DEFAULT_LIMIT,
  getCanvasCourseGradeAssignment,
  getCanvasCourseGradeSummary,
  getCanvasCourseGradeSyncStatus,
  listCanvasCourseGrades,
  syncCanvasCourseGrades,
  type CanvasApiClientError,
  type CanvasCourseGradeSummary,
  type CanvasGradeAssignmentDetail,
  type CanvasGradeAssignmentListItem,
  type CanvasGradeAssignmentListPayload,
  type CanvasGradeSyncPayload,
  type CanvasGradeSyncStatusPayload,
} from "../../services/canvasApi";
import { API_BASE_URL_SETUP_HINT } from "../../services/reviewerApi";
import {
  formatDate,
  formatDateTime,
  formatSecondsLate,
  formatSyncGuidance,
  formatSyncStatusLabel,
  formatVisibleGrade,
  formatVisibleScore,
  getAssignmentStatusPresentation,
  isNetworkGradeError,
  mergeGradeAssignmentPages,
  POST_SYNC_REFRESH_REQUESTS,
  shouldApplyGradeRequest,
  shouldReplaceAssignmentsAfterSync,
} from "./canvasGradePresentation";

interface CanvasGradeScreenProps {
  readonly courseId: string;
  readonly courseName: string;
  readonly onBackToCourses: () => void;
}

interface CanvasGradeDisplayError {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
}

type GradePage = CanvasGradeAssignmentListPayload["page"];

export function CanvasGradeScreen({
  courseId,
  courseName,
  onBackToCourses,
}: CanvasGradeScreenProps) {
  const { session } = useAuth();
  const [summary, setSummary] = useState<CanvasCourseGradeSummary | null>(null);
  const [syncStatus, setSyncStatus] =
    useState<CanvasGradeSyncStatusPayload | null>(null);
  const [assignments, setAssignments] =
    useState<readonly CanvasGradeAssignmentListItem[]>([]);
  const [page, setPage] = useState<GradePage | null>(null);
  const [initialError, setInitialError] =
    useState<CanvasGradeDisplayError | null>(null);
  const [warning, setWarning] = useState<CanvasGradeDisplayError | null>(null);
  const [loadMoreError, setLoadMoreError] =
    useState<CanvasGradeDisplayError | null>(null);
  const [syncResult, setSyncResult] = useState<CanvasGradeSyncPayload | null>(
    null,
  );
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const assignmentCountRef = useRef(0);
  const hasLoadedDataRef = useRef(false);
  const hasLoadedData =
    assignments.length > 0 || summary !== null || syncStatus !== null;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    assignmentCountRef.current = assignments.length;
    hasLoadedDataRef.current = hasLoadedData;
  }, [assignments.length, hasLoadedData]);

  const loadGrades = useCallback(
    async ({
      replaceAssignments = true,
      reason,
    }: {
      readonly replaceAssignments?: boolean;
      readonly reason: "initial" | "reload" | "post-sync";
    }) => {
      const context = createRequestContext(session?.accessToken);
      if (!context.ok) {
        if (isMountedRef.current) {
          setInitialError(context.error);
          setIsLoadingInitial(false);
        }
        return;
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const requestCourseId = courseId;

      if (reason === "initial") {
        setIsLoadingInitial(true);
      }
      if (reason === "reload" || reason === "post-sync") {
        setIsReloading(true);
      }
      setInitialError(null);
      setWarning(null);
      setLoadMoreError(null);

      try {
        const [statusResult, summaryResult, listResult] = await Promise.all([
          getCanvasCourseGradeSyncStatus({
            ...context.value,
            courseId: requestCourseId,
            signal: abortController.signal,
          }),
          getCanvasCourseGradeSummary({
            ...context.value,
            courseId: requestCourseId,
            signal: abortController.signal,
          }),
          listCanvasCourseGrades({
            ...context.value,
            courseId: requestCourseId,
            limit: CANVAS_GRADE_LIST_DEFAULT_LIMIT,
            offset: 0,
            signal: abortController.signal,
          }),
        ]);

        if (
          !isMountedRef.current ||
          abortControllerRef.current !== abortController ||
          !shouldApplyGradeRequest({
            activeCourseId: courseId,
            latestRequestId: requestIdRef.current,
            requestCourseId,
            requestId,
          })
        ) {
          return;
        }

        const firstError = firstCanvasError([
          statusResult.ok ? null : statusResult.error,
          summaryResult.ok ? null : summaryResult.error,
          listResult.ok ? null : listResult.error,
        ]);

        if (statusResult.ok) {
          setSyncStatus(statusResult.data);
        }
        if (summaryResult.ok) {
          setSummary(summaryResult.data.summary);
        }
        if (listResult.ok) {
          if (replaceAssignments || assignmentCountRef.current === 0) {
            setAssignments(listResult.data.items);
            setPage(listResult.data.page);
          }
          setSyncStatus(listResult.data.sync);
        }

        if (firstError) {
          const displayError = formatCanvasGradeError(firstError);
          if (
            hasLoadedDataRef.current ||
            assignmentCountRef.current > 0 ||
            summaryResult.ok ||
            statusResult.ok
          ) {
            setWarning({
              ...displayError,
              message: isNetworkGradeError(firstError)
                ? "Already loaded grade data remains visible for this session. Reload when the connection returns."
                : displayError.message,
            });
          } else {
            setInitialError(displayError);
          }
        }
      } finally {
        if (isMountedRef.current && abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
          if (reason === "initial") {
            setIsLoadingInitial(false);
          }
          if (reason === "reload" || reason === "post-sync") {
            setIsReloading(false);
          }
        }
      }
    },
    [courseId, session?.accessToken],
  );

  useEffect(() => {
    assignmentCountRef.current = 0;
    hasLoadedDataRef.current = false;
    setSummary(null);
    setSyncStatus(null);
    setAssignments([]);
    setPage(null);
    setInitialError(null);
    setWarning(null);
    setLoadMoreError(null);
    setSyncResult(null);
    setSelectedAssignmentId(null);
    void loadGrades({ reason: "initial" });
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [courseId, loadGrades]);

  const handleReload = () => {
    void loadGrades({ reason: "reload" });
  };

  const handleSyncGrades = async () => {
    if (isSyncing) {
      return;
    }
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setWarning(context.error);
      return;
    }

    setIsSyncing(true);
    setWarning(null);
    setInitialError(null);
    setSyncResult(null);

    try {
      const result = await syncCanvasCourseGrades({
        ...context.value,
        courseId,
      });
      if (!isMountedRef.current) {
        return;
      }
      if (!result.ok) {
        setWarning(formatCanvasGradeError(result.error));
        return;
      }

      setSyncResult(result.data);
      const shouldReplaceAssignments = shouldReplaceAssignmentsAfterSync({
        loadedAssignmentCount: assignments.length,
        syncStatus: result.data.status,
      });
      if (POST_SYNC_REFRESH_REQUESTS.length > 0) {
        await loadGrades({
          reason: "post-sync",
          replaceAssignments: shouldReplaceAssignments,
        });
      }
      if (!isMountedRef.current) {
        return;
      }
      if (result.data.status === "partial") {
        setWarning({
          title: "Grade sync was partial",
          message: "Some synchronized grade information may be incomplete.",
        });
      }
      if (result.data.status === "failed") {
        setWarning({
          title: "Grade sync failed",
          message:
            "Already loaded grade data remains visible. Try syncing again after a short wait.",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  };

  const handleLoadMore = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setLoadMoreError(context.error);
      return;
    }
    if (!page?.hasMore || page.nextOffset === null || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const result = await listCanvasCourseGrades({
        ...context.value,
        courseId,
        limit: page.limit,
        offset: page.nextOffset,
      });
      if (!isMountedRef.current) {
        return;
      }
      if (result.ok) {
        setAssignments((current) =>
          mergeGradeAssignmentPages(current, result.data.items),
        );
        setPage(result.data.page);
        setSyncStatus(result.data.sync);
      } else {
        setLoadMoreError({
          ...formatCanvasGradeError(result.error),
          message: "The loaded assignments remain visible. Try loading more again.",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  };

  if (selectedAssignmentId) {
    return (
      <CanvasGradeAssignmentDetailView
        assignmentId={selectedAssignmentId}
        courseId={courseId}
        courseName={courseName}
        onBack={() => setSelectedAssignmentId(null)}
      />
    );
  }

  if (isLoadingInitial) {
    return (
      <Screen contentContainerStyle={styles.content}>
        <Header
          courseName={courseName}
          onBackToCourses={onBackToCourses}
          syncStatus={syncStatus}
        />
        <Card style={styles.statusCard} testID="canvas-grades-loading">
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.statusTitle}>Loading synchronized grades...</Text>
          <Text style={styles.statusText}>
            Stay Focused is reading synchronized data. Canvas is not syncing automatically.
          </Text>
        </Card>
      </Screen>
    );
  }

  const canShowLoadedContent = hasLoadedData || assignments.length > 0;

  return (
    <Screen contentContainerStyle={styles.content}>
      <Header
        courseName={courseName}
        onBackToCourses={onBackToCourses}
        syncStatus={syncStatus}
      />

      <View style={styles.actions}>
        <Button
          loading={isReloading}
          onPress={handleReload}
          testID="canvas-grades-reload-button"
          variant="secondary"
        >
          Reload view
        </Button>
        <Button
          loading={isSyncing}
          onPress={() => void handleSyncGrades()}
          testID="canvas-grades-sync-button"
          variant="primary"
        >
          Sync grades
        </Button>
      </View>

      {initialError && !canShowLoadedContent ? (
        <ErrorCard
          actionLabel="Retry"
          error={initialError}
          onAction={handleReload}
          testID="canvas-grades-initial-error"
        />
      ) : null}
      {warning ? <WarningCard error={warning} /> : null}
      {syncResult ? <SyncResultCard result={syncResult} /> : null}

      {syncStatus?.status === "never_synced" ? (
        <Card style={styles.statusCard} testID="canvas-grades-never-synced">
          <Text style={styles.statusTitle}>No grade sync yet</Text>
          <Text style={styles.statusText}>
            No grade synchronization has been completed for this course.
          </Text>
          <Button
            loading={isSyncing}
            onPress={() => void handleSyncGrades()}
            variant="primary"
          >
            Sync grades
          </Button>
        </Card>
      ) : null}

      {summary ? <CourseSummaryCard summary={summary} /> : null}
      {syncStatus ? <SyncStatusCard sync={syncStatus} /> : null}

      {page && assignments.length === 0 && !initialError ? (
        <Card style={styles.statusCard} testID="canvas-grades-empty">
          <Text style={styles.statusTitle}>No assignments found</Text>
          <Text style={styles.statusText}>
            No synchronized Canvas assignments were found for this course.
          </Text>
        </Card>
      ) : null}

      {assignments.length > 0 ? (
        <AssignmentList
          assignments={assignments}
          isLoadingMore={isLoadingMore}
          loadMoreError={loadMoreError}
          onLoadMore={() => void handleLoadMore()}
          onOpenAssignment={setSelectedAssignmentId}
          page={page}
        />
      ) : null}
    </Screen>
  );
}

function CanvasGradeAssignmentDetailView({
  assignmentId,
  courseId,
  courseName,
  onBack,
}: {
  readonly assignmentId: string;
  readonly courseId: string;
  readonly courseName: string;
  readonly onBack: () => void;
}) {
  const { session } = useAuth();
  const [assignment, setAssignment] =
    useState<CanvasGradeAssignmentDetail | null>(null);
  const [error, setError] = useState<CanvasGradeDisplayError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDetail = useCallback(async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      if (isMountedRef.current) {
        setError(context.error);
        setIsLoading(false);
      }
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getCanvasCourseGradeAssignment({
        ...context.value,
        assignmentId,
        courseId,
        signal: abortController.signal,
      });
      if (!isMountedRef.current || abortControllerRef.current !== abortController) {
        return;
      }
      if (result.ok) {
        setAssignment(result.data.assignment);
      } else {
        setError(formatCanvasGradeError(result.error));
      }
    } finally {
      if (isMountedRef.current && abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [assignmentId, courseId, session?.accessToken]);

  useEffect(() => {
    void loadDetail();
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [loadDetail]);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Button onPress={onBack} variant="ghost">
          Back to grades
        </Button>
        <Text style={styles.kicker}>Assignment grade</Text>
        <Text style={styles.title}>{courseName}</Text>
      </View>

      {isLoading ? (
        <Card style={styles.statusCard} testID="canvas-grade-detail-loading">
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.statusTitle}>Loading assignment details...</Text>
        </Card>
      ) : error ? (
        <ErrorCard
          actionLabel="Retry"
          error={error}
          onAction={() => void loadDetail()}
          testID="canvas-grade-detail-error"
        />
      ) : assignment ? (
        <AssignmentDetailCard assignment={assignment} />
      ) : null}
    </Screen>
  );
}

function Header({
  courseName,
  onBackToCourses,
  syncStatus,
}: {
  readonly courseName: string;
  readonly onBackToCourses: () => void;
  readonly syncStatus: CanvasGradeSyncStatusPayload | null;
}) {
  return (
    <View style={styles.header} testID="canvas-grades-screen">
      <Button onPress={onBackToCourses} variant="ghost">
        Back to courses
      </Button>
      <Text style={styles.kicker}>Grades</Text>
      <Text style={styles.title}>{courseName}</Text>
      <Text style={styles.subtitle}>{formatSyncStatusLabel(syncStatus)}</Text>
      <Text style={styles.summaryMeta}>
        Last successful sync {formatDateTime(syncStatus?.lastSuccessfulSyncAt ?? null)}
      </Text>
    </View>
  );
}

function CourseSummaryCard({
  summary,
}: {
  readonly summary: CanvasCourseGradeSummary;
}) {
  return (
    <Card style={styles.sectionCard} testID="canvas-grade-summary">
      <View style={styles.summaryHeader}>
        <Text style={styles.statusTitle}>Course grade summary</Text>
        <Text style={styles.statusText}>
          Canvas-provided values only. Stay Focused does not calculate a course total.
        </Text>
      </View>
      <GradeValueRow
        label="Current score"
        value={formatVisibleScore(summary.currentScore)}
      />
      <GradeValueRow
        label="Current grade"
        value={formatVisibleGrade(summary.currentGrade)}
      />
      <GradeValueRow label="Final score" value={formatVisibleScore(summary.finalScore)} />
      <GradeValueRow label="Final grade" value={formatVisibleGrade(summary.finalGrade)} />
      <Text style={styles.summaryMeta}>
        Summary synchronized {formatDateTime(summary.lastSyncedAt)}
      </Text>
    </Card>
  );
}

function SyncStatusCard({
  sync,
}: {
  readonly sync: CanvasGradeSyncStatusPayload;
}) {
  return (
    <Card style={styles.sectionCard} testID="canvas-grade-sync-status">
      <Text style={styles.statusTitle}>{formatSyncStatusLabel(sync)}</Text>
      <Text style={styles.statusText}>{formatSyncGuidance(sync)}</Text>
      <GradeValueRow label="Last checked" value={formatDateTime(sync.lastCheckedAt)} />
      <GradeValueRow
        label="Last successful sync"
        value={formatDateTime(sync.lastSuccessfulSyncAt)}
      />
      <GradeValueRow label="Assignment state" value={sync.assignmentSubmissionState} />
      <GradeValueRow label="Course summary state" value={sync.courseGradeSummaryState} />
      {sync.failureCode ? (
        <Text style={styles.warningText}>
          Safe failure code: {sync.failureCode}
        </Text>
      ) : null}
    </Card>
  );
}

function AssignmentList({
  assignments,
  isLoadingMore,
  loadMoreError,
  onLoadMore,
  onOpenAssignment,
  page,
}: {
  readonly assignments: readonly CanvasGradeAssignmentListItem[];
  readonly isLoadingMore: boolean;
  readonly loadMoreError: CanvasGradeDisplayError | null;
  readonly onLoadMore: () => void;
  readonly onOpenAssignment: (assignmentId: string) => void;
  readonly page: GradePage | null;
}) {
  return (
    <Card style={styles.sectionCard} testID="canvas-grade-assignment-list">
      <View style={styles.summaryHeader}>
        <Text style={styles.statusTitle}>Assignments</Text>
        <Text style={styles.statusText}>
          {assignments.length} synchronized assignments loaded
        </Text>
      </View>
      <View style={styles.assignmentList}>
        {assignments.map((assignment) => (
          <AssignmentRow
            assignment={assignment}
            key={assignment.id}
            onOpenAssignment={onOpenAssignment}
          />
        ))}
      </View>
      {loadMoreError ? <WarningCard error={loadMoreError} /> : null}
      {page?.hasMore ? (
        <Button
          loading={isLoadingMore}
          onPress={onLoadMore}
          testID="canvas-grades-load-more-button"
          variant="secondary"
        >
          Load more
        </Button>
      ) : null}
    </Card>
  );
}

function AssignmentRow({
  assignment,
  onOpenAssignment,
}: {
  readonly assignment: CanvasGradeAssignmentListItem;
  readonly onOpenAssignment: (assignmentId: string) => void;
}) {
  const status = getAssignmentStatusPresentation(assignment.normalizedStatus);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpenAssignment(assignment.id)}
      style={styles.assignmentRow}
      testID={`canvas-grade-assignment-${assignment.id}`}
    >
      <View style={styles.assignmentBody}>
        <Text style={styles.assignmentTitle}>{assignment.title}</Text>
        <Text style={styles.summaryMeta}>Due {formatDate(assignment.dueAt)}</Text>
        <StatusPill label={status.label} tone={status.tone} />
        <Text style={styles.statusText}>{status.description}</Text>
        <Text style={styles.summaryMeta}>
          Score: {formatVisibleScore(assignment.score, assignment.pointsPossible)}
        </Text>
        <Text style={styles.summaryMeta}>
          Grade: {formatVisibleGrade(assignment.grade)}
        </Text>
        {assignment.attempt !== null ? (
          <Text style={styles.summaryMeta}>Attempt {assignment.attempt}</Text>
        ) : null}
        {assignment.submittedAt ? (
          <Text style={styles.summaryMeta}>
            Submitted {formatDateTime(assignment.submittedAt)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.disclosure}>View details</Text>
    </Pressable>
  );
}

function AssignmentDetailCard({
  assignment,
}: {
  readonly assignment: CanvasGradeAssignmentDetail;
}) {
  const status = getAssignmentStatusPresentation(assignment.normalizedStatus);
  const secondsLate = formatSecondsLate(assignment.secondsLate);
  return (
    <Card style={styles.sectionCard} testID="canvas-grade-detail">
      <View style={styles.summaryHeader}>
        <Text style={styles.statusTitle}>{assignment.title}</Text>
        <StatusPill label={status.label} tone={status.tone} />
        <Text style={styles.statusText}>{status.description}</Text>
      </View>
      <GradeValueRow label="Due" value={formatNullableDate(assignment.dueAt)} />
      <GradeValueRow label="Unlocks" value={formatNullableDate(assignment.unlockAt)} />
      <GradeValueRow label="Locks" value={formatNullableDate(assignment.lockAt)} />
      {assignment.pointsPossible !== null ? (
        <GradeValueRow
          label="Points possible"
          value={String(assignment.pointsPossible)}
        />
      ) : null}
      <GradeValueRow
        label="Score"
        value={formatVisibleScore(assignment.score, assignment.pointsPossible)}
      />
      <GradeValueRow label="Grade" value={formatVisibleGrade(assignment.grade)} />
      {assignment.gradingType ? (
        <GradeValueRow label="Grading type" value={assignment.gradingType} />
      ) : null}
      {assignment.submissionType ? (
        <GradeValueRow label="Submission type" value={assignment.submissionType} />
      ) : null}
      {assignment.submissionTypes.length > 0 ? (
        <GradeValueRow
          label="Allowed submission types"
          value={assignment.submissionTypes.join(", ")}
        />
      ) : null}
      {assignment.submittedAt ? (
        <GradeValueRow
          label="Submitted"
          value={formatDateTime(assignment.submittedAt)}
        />
      ) : null}
      {assignment.gradedAt ? (
        <GradeValueRow label="Graded" value={formatDateTime(assignment.gradedAt)} />
      ) : null}
      {assignment.postedAt ? (
        <GradeValueRow label="Posted" value={formatDateTime(assignment.postedAt)} />
      ) : null}
      {assignment.attempt !== null ? (
        <GradeValueRow label="Attempt" value={String(assignment.attempt)} />
      ) : null}
      {assignment.allowedAttempts !== null ? (
        <GradeValueRow
          label="Allowed attempts"
          value={String(assignment.allowedAttempts)}
        />
      ) : null}
      {secondsLate ? <GradeValueRow label="Late by" value={secondsLate} /> : null}
      {assignment.latePolicyStatus ? (
        <GradeValueRow
          label="Late policy state"
          value={assignment.latePolicyStatus}
        />
      ) : null}
      {assignment.gradeMatchesCurrentSubmission !== null ? (
        <GradeValueRow
          label="Grade matches current submission"
          value={assignment.gradeMatchesCurrentSubmission ? "Yes" : "No"}
        />
      ) : null}
      {assignment.pointsPossibleAtSync !== null ? (
        <GradeValueRow
          label="Points possible at sync"
          value={String(assignment.pointsPossibleAtSync)}
        />
      ) : null}
      <GradeValueRow
        label="Last synchronized"
        value={formatDateTime(assignment.lastSyncedAt)}
      />
    </Card>
  );
}

function GradeValueRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.valueText}>{value}</Text>
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  readonly label: string;
  readonly tone: "neutral" | "success" | "warning" | "danger" | "muted";
}) {
  return (
    <View style={[styles.statusPill, statusToneStyle(tone)]}>
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function SyncResultCard({ result }: { readonly result: CanvasGradeSyncPayload }) {
  if (result.status === "succeeded") {
    return null;
  }
  return (
    <Card style={styles.statusCard} testID="canvas-grade-sync-result">
      <Text style={styles.statusTitle}>
        {result.status === "partial" ? "Grade sync partial" : "Grade sync failed"}
      </Text>
      <Text style={styles.statusText}>
        Assignment sync {result.assignmentSubmission.status}; course summary sync{" "}
        {result.courseGradeSummary.status}.
      </Text>
    </Card>
  );
}

function ErrorCard({
  actionLabel,
  error,
  onAction,
  testID,
}: {
  readonly actionLabel: string;
  readonly error: CanvasGradeDisplayError;
  readonly onAction: () => void;
  readonly testID: string;
}) {
  return (
    <View style={styles.errorBox} testID={testID}>
      <Text style={styles.errorTitle}>{error.title}</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      {error.detail ? <Text style={styles.errorDetail}>{error.detail}</Text> : null}
      <Button onPress={onAction} variant="secondary">
        {actionLabel}
      </Button>
    </View>
  );
}

function WarningCard({ error }: { readonly error: CanvasGradeDisplayError }) {
  return (
    <View style={styles.warningBox} testID="canvas-grades-warning">
      <Text style={styles.errorTitle}>{error.title}</Text>
      <Text style={styles.statusText}>{error.message}</Text>
      {error.detail ? <Text style={styles.errorDetail}>{error.detail}</Text> : null}
    </View>
  );
}

function createRequestContext(accessToken: string | undefined):
  | {
      readonly ok: true;
      readonly value: {
        readonly apiBaseUrl: string;
        readonly accessToken: string;
      };
    }
  | { readonly ok: false; readonly error: CanvasGradeDisplayError } {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    return {
      ok: false,
      error: {
        title: "API address needs setup",
        message: API_BASE_URL_SETUP_HINT,
      },
    };
  }

  const token = accessToken?.trim();
  if (!token) {
    return {
      ok: false,
      error: {
        title: "Login session expired",
        message: "Sign out and sign in again before using Canvas grades.",
      },
    };
  }

  return { ok: true, value: { apiBaseUrl, accessToken: token } };
}

function firstCanvasError(
  errors: readonly (CanvasApiClientError | null)[],
): CanvasApiClientError | null {
  return errors.find((error): error is CanvasApiClientError => error !== null) ?? null;
}

function formatCanvasGradeError(
  error: CanvasApiClientError,
): CanvasGradeDisplayError {
  const detail =
    error.status !== undefined
      ? `Details: HTTP ${error.status}, code ${error.apiCode ?? error.code}.`
      : `Details: code ${error.apiCode ?? error.code}.`;
  switch (error.code) {
    case "course_not_selected":
      return {
        title: "Course is not selected",
        message: "Select and save this Canvas course before reading grades.",
        detail,
      };
    case "course_not_found":
      return {
        title: "Course unavailable",
        message: "Canvas did not return this course for your connection.",
        detail,
      };
    case "assignment_not_found":
      return {
        title: "Assignment unavailable",
        message: "Canvas assignment grade data was not found.",
        detail,
      };
    case "unauthorized":
    case "missing_access_token":
      return {
        title: "Login session expired",
        message: "Sign out and sign in again before using Canvas grades.",
        detail,
      };
    case "network_error":
    case "request_aborted":
      return {
        title: "Could not reach the API",
        message: "Check the API address and network connection.",
        detail,
      };
    case "canvas_grade_data_unavailable":
      return {
        title: "Grade data unavailable",
        message: "Synchronized Canvas grade data is unavailable right now.",
        detail,
      };
    case "canvas_timeout":
    case "canvas_unavailable":
    case "rate_limited":
      return {
        title: "Canvas grades need a retry",
        message: error.message,
        detail,
      };
    case "payload_too_large":
    case "invalid_request":
      return {
        title: "Canvas grade request was not accepted",
        message: error.message,
        detail,
      };
    default:
      return {
        title: "Canvas grades could not load",
        message: error.message,
        detail,
      };
  }
}

function formatNullableDate(value: string | null): string {
  return value ? formatDateTime(value) : "Not provided";
}

function statusToneStyle(
  tone: "neutral" | "success" | "warning" | "danger" | "muted",
) {
  switch (tone) {
    case "success":
      return styles.statusSuccess;
    case "warning":
      return styles.statusWarning;
    case "danger":
      return styles.statusDanger;
    case "muted":
      return styles.statusMuted;
    case "neutral":
      return styles.statusNeutral;
  }
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[5],
  },
  header: {
    gap: spacing[2],
  },
  kicker: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h1,
    fontWeight: "800",
    lineHeight: 30,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 23,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  sectionCard: {
    gap: spacing[4],
  },
  statusCard: {
    alignItems: "flex-start",
    gap: spacing[3],
  },
  summaryHeader: {
    gap: spacing[1],
  },
  statusTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
    lineHeight: 21,
  },
  statusText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  summaryMeta: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  assignmentList: {
    gap: spacing[3],
  },
  assignmentRow: {
    alignItems: "flex-start",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing[3],
    minHeight: hitTarget.min,
    paddingBottom: spacing[3],
  },
  assignmentBody: {
    flex: 1,
    gap: spacing[1],
  },
  assignmentTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 21,
  },
  disclosure: {
    color: colors.accent,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "800",
    lineHeight: 20,
    minHeight: hitTarget.min,
    textAlign: "right",
  },
  valueRow: {
    alignItems: "flex-start",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing[3],
    justifyContent: "space-between",
    paddingBottom: spacing[2],
  },
  valueLabel: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 19,
  },
  valueText: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
    textAlign: "right",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  statusPillText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "800",
    lineHeight: 17,
  },
  statusSuccess: {
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
  },
  statusWarning: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.accent,
  },
  statusDanger: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
  },
  statusMuted: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.border,
  },
  statusNeutral: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderStrong,
  },
  warningText: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[3],
  },
  warningBox: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3],
  },
  errorTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 21,
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  errorDetail: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
});
