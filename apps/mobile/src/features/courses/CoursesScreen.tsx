import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CanvasCapability, CanvasCapabilityStatus } from "@stay-focused/canvas";

import { useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { colors, spacing, typography } from "../../design/tokens";
import {
  API_BASE_URL_SETUP_HINT,
} from "../../services/reviewerApi";
import {
  connectCanvas,
  disconnectCanvas,
  getCanvasCourseSyncHealth,
  getCanvasConnection,
  listCanvasCapabilities,
  listCanvasCourses,
  saveCanvasCoursePreferences,
  type CanvasApiClientError,
  type CanvasCapabilitySummary,
  type CanvasCourseInventoryItem,
  type CanvasCourseSyncHealth,
  type CanvasCourseSyncSummary,
  type CanvasConnectionSummary,
  type CanvasSyncJobStatusView,
} from "../../services/canvasApi";
import {
  cancelDurableCanvasSync,
  reconcileCanvasSyncJobs,
  startDurableCanvasSync,
} from "../../services/canvasSyncJobCoordinator";

interface CoursesScreenProps {
  readonly onCreateReviewer: () => void;
  readonly onCreateReviewerFromCanvas: (
    courseId: string,
    courseName: string,
  ) => void;
  readonly onOpenGrades: (courseId: string, courseName: string) => void;
  readonly onOpenLibrary: () => void;
}

interface CoursesDisplayError {
  readonly title: string;
  readonly message: string;
  readonly detail?: string;
}

const SUMMARY_CAPABILITIES: readonly CanvasCapability[] = [
  "courses",
  "modules",
  "grades",
  "files",
  "new_quizzes",
];

interface CourseSyncDisplayState {
  readonly status: "running" | "success" | "partial" | "failed";
  readonly progressMessage?: string;
  readonly summary?: CanvasCourseSyncSummary;
  readonly error?: CanvasApiClientError;
  readonly job?: CanvasSyncJobStatusView;
}

export function CoursesScreen({
  onCreateReviewer,
  onCreateReviewerFromCanvas,
  onOpenGrades,
  onOpenLibrary,
}: CoursesScreenProps) {
  const { isSigningOut, session, signOut } = useAuth();
  const [baseUrl, setBaseUrl] = useState("");
  const [personalAccessToken, setPersonalAccessToken] = useState("");
  const [connection, setConnection] = useState<CanvasConnectionSummary | null>(
    null,
  );
  const [courses, setCourses] = useState<readonly CanvasCourseInventoryItem[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<readonly string[]>([]);
  const [savedSelectedCourseIds, setSavedSelectedCourseIds] = useState<readonly string[]>([]);
  const [capabilities, setCapabilities] =
    useState<readonly CanvasCapabilitySummary[]>([]);
  const [courseSyncStates, setCourseSyncStates] = useState<
    Readonly<Record<string, CourseSyncDisplayState>>
  >({});
  const [courseHealthStates, setCourseHealthStates] = useState<
    Readonly<Record<string, CanvasCourseSyncHealth>>
  >({});
  const [error, setError] = useState<CoursesDisplayError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const [isSyncingSelected, setIsSyncingSelected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reconcileContentJobs = useCallback(async () => {
    const context = createRequestContext(session?.accessToken);
    const ownerUserId = session?.user.id;
    if (!context.ok || !ownerUserId) return;
    const reconciliation = await reconcileCanvasSyncJobs({
      ...context.value,
      ownerUserId,
    });
    const contentJobs = reconciliation.jobs.filter(
      (job) => job.jobType === "course_content",
    );
    if (contentJobs.length > 0) {
      setCourseSyncStates((current) => ({
        ...current,
        ...Object.fromEntries(
          contentJobs.map((job) => [job.course.id, displayStateForJob(job)]),
        ),
      }));
    }
    const newlyCompletedContent = reconciliation.newlyCompleted.filter(
      (job) => job.jobType === "course_content",
    );
    if (newlyCompletedContent.length > 0) {
      setSuccessMessage(
        newlyCompletedContent.some((job) => job.outcome === "partial")
          ? "Canvas sync completed, but some areas need attention."
          : "Canvas course synchronization is complete.",
      );
      await refreshConnectedCanvas(context.value);
    }
  }, [session?.accessToken, session?.user.id]);

  useEffect(() => {
    void reconcileContentJobs();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reconcileContentJobs();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void reconcileContentJobs();
    }, 5_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [reconcileContentJobs]);

  const loadCanvas = useCallback(async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      setIsLoading(false);
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getCanvasConnection({
        ...context.value,
        signal: abortController.signal,
      });

      if (!result.ok) {
        setError(formatCanvasError(result.error));
        return;
      }

      setConnection(result.data.connection);
      if (!result.data.connection) {
        setCourses([]);
        setSelectedCourseIds([]);
        setSavedSelectedCourseIds([]);
        setCourseSyncStates({});
        setCapabilities([]);
        return;
      }

      await refreshConnectedCanvas(context.value);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadCanvas();
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [loadCanvas]);

  const handleConnect = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    setIsConnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await connectCanvas({
        ...context.value,
        baseUrl,
        personalAccessToken,
      });

      if (result.ok) {
        setConnection(result.data.connection);
        setCapabilities(result.data.capabilities);
        setBaseUrl(result.data.connection.baseUrl);
        await refreshConnectedCanvas(context.value);
        setSuccessMessage("Canvas connected.");
      } else {
        setError(formatCanvasError(result.error));
      }
    } finally {
      setPersonalAccessToken("");
      setIsConnecting(false);
    }
  };

  const handleRefresh = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    setIsRefreshing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await refreshConnectedCanvas(context.value);
      setSuccessMessage("Canvas courses refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnectRequest = () => {
    Alert.alert(
      "Disconnect Canvas?",
      "Disconnect Canvas from Stay Focused? Saved reviewers and OCR sources will stay in your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            void handleDisconnect();
          },
        },
      ],
    );
  };

  const handleDisconnect = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    setIsDisconnecting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await disconnectCanvas(context.value);
      if (result.ok) {
        setConnection(null);
        setCourses([]);
        setSelectedCourseIds([]);
        setSavedSelectedCourseIds([]);
        setCourseSyncStates({});
        setCourseHealthStates({});
        setCapabilities([]);
        setPersonalAccessToken("");
        setSuccessMessage("Canvas disconnected.");
      } else {
        setError(formatCanvasError(result.error));
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  const refreshConnectedCanvas = async (context: {
    readonly apiBaseUrl: string;
    readonly accessToken: string;
  }) => {
    const [courseResult, capabilityResult] = await Promise.all([
      listCanvasCourses(context),
      listCanvasCapabilities(context),
    ]);

    if (courseResult.ok) {
      setCourses(courseResult.data.courses);
      setSelectedCourseIds(courseResult.data.selectedCourseIds);
      setSavedSelectedCourseIds(courseResult.data.selectedCourseIds);
      const healthResults = await Promise.all(
        courseResult.data.courses
          .filter((course) => course.selected)
          .map(async (course) => ({
            courseId: course.id,
            result: await getCanvasCourseSyncHealth({
              ...context,
              courseId: course.id,
            }),
          })),
      );
      setCourseHealthStates(
        Object.fromEntries(
          healthResults.flatMap(({ courseId, result }) =>
            result.ok ? [[courseId, result.data] as const] : []
          ),
        ),
      );
    } else {
      setError(formatCanvasError(courseResult.error));
    }

    if (capabilityResult.ok) {
      setCapabilities(capabilityResult.data);
    } else if (!courseResult.ok) {
      setCapabilities([]);
    } else {
      setError(formatCanvasError(capabilityResult.error));
    }
  };

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourseIds((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    );
    setSuccessMessage(null);
  };

  const handleSaveSelection = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    setIsSavingSelection(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await saveCanvasCoursePreferences({
        ...context.value,
        selectedCourseIds,
      });
      if (result.ok) {
        setSavedSelectedCourseIds(result.data.selectedCourseIds);
        setSelectedCourseIds(result.data.selectedCourseIds);
        setCourses((current) =>
          current.map((course) => ({
            ...course,
            selected: result.data.selectedCourseIds.includes(course.id),
          })),
        );
        setSuccessMessage("Course selection saved.");
      } else {
        setError(formatCanvasError(result.error));
      }
    } finally {
      setIsSavingSelection(false);
    }
  };

  const handleSyncSelected = async () => {
    const context = createRequestContext(session?.accessToken);
    if (!context.ok) {
      setError(context.error);
      return;
    }

    setIsSyncingSelected(true);
    setError(null);
    setSuccessMessage(null);
    setCourseSyncStates((current) => ({
      ...current,
      ...Object.fromEntries(
        savedSelectedCourseIds.map((courseId) => [
          courseId,
          { status: "running" as const },
        ]),
      ),
    }));

    try {
      const ownerUserId = session?.user.id;
      if (!ownerUserId) return;
      const courseById = new Map(courses.map((course) => [course.id, course]));
      const results = await Promise.all(
        savedSelectedCourseIds.map(async (courseId) => {
          const course = courseById.get(courseId);
          const result = await startDurableCanvasSync({
            ...context.value,
            courseDisplayName: course?.displayName ?? "Canvas course",
            courseId,
            jobType: "course_content",
            ownerUserId,
          });
          return { courseId, result };
        }),
      );
      setCourseSyncStates((current) => ({
        ...current,
        ...Object.fromEntries(
          results.map(({ courseId, result }) => [
            courseId,
            result.ok
              ? displayStateForJob(result.data)
              : {
                  status: "failed" as const,
                  error: result.error,
                },
          ]),
        ),
      }));
      const accepted = results.filter(({ result }) => result.ok).length;
      const failed = results.length - accepted;
      setSuccessMessage(
        failed === 0
          ? `${accepted} Canvas synchronization job${accepted === 1 ? "" : "s"} started. You can switch apps.`
          : `${accepted} started; ${failed} need attention.`,
      );
    } finally {
      setIsSyncingSelected(false);
    }
  };

  const handleSyncCourse = async (courseId: string) => {
    const context = createRequestContext(session?.accessToken);
    const ownerUserId = session?.user.id;
    if (!context.ok) {
      setError(context.error);
      return;
    }
    if (!ownerUserId) return;
    const course = courses.find((item) => item.id === courseId);
    setError(null);
    setSuccessMessage(null);
    setCourseSyncStates((current) => ({
      ...current,
      [courseId]: { status: "running", progressMessage: "Waiting to start" },
    }));
    const result = await startDurableCanvasSync({
      ...context.value,
      courseDisplayName: course?.displayName ?? "Canvas course",
      courseId,
      jobType: "course_content",
      ownerUserId,
    });
    setCourseSyncStates((current) => ({
      ...current,
      [courseId]: result.ok
        ? displayStateForJob(result.data)
        : { error: result.error, status: "failed" },
    }));
    setSuccessMessage(
      result.ok
        ? "Canvas synchronization started. You can switch apps."
        : null,
    );
  };

  const handleCancelCourseSync = async (courseId: string) => {
    const context = createRequestContext(session?.accessToken);
    const ownerUserId = session?.user.id;
    const job = courseSyncStates[courseId]?.job;
    if (!context.ok) {
      setError(context.error);
      return;
    }
    if (!ownerUserId || !job) return;
    const result = await cancelDurableCanvasSync({
      ...context.value,
      jobId: job.id,
      ownerUserId,
    });
    if (result.ok) {
      setCourseSyncStates((current) => ({
        ...current,
        [courseId]: displayStateForJob(result.data),
      }));
      setSuccessMessage(
        result.data.status === "cancellation_requested"
          ? "Cancellation requested."
          : "Canvas synchronization was cancelled.",
      );
    } else {
      setError(formatCanvasError(result.error));
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header} testID="courses-screen">
        <Text style={styles.kicker}>Courses</Text>
        <Text style={styles.title}>Canvas courses</Text>
        <Text style={styles.subtitle}>
          {session?.user.email ?? "Signed in account"}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button onPress={onCreateReviewer} variant="secondary">
          New reviewer
        </Button>
        <Button onPress={onOpenLibrary} variant="secondary">
          Study Library
        </Button>
        <Button loading={isSigningOut} onPress={signOut} variant="secondary">
          Log out
        </Button>
      </View>

      {error ? <ErrorCard error={error} /> : null}
      {successMessage ? <SuccessCard message={successMessage} /> : null}

      {isLoading ? (
        <Card style={styles.statusCard} testID="courses-loading">
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.statusTitle}>Checking Canvas connection...</Text>
        </Card>
      ) : connection ? (
        <ConnectedCanvasState
          capabilities={capabilities}
          connection={connection}
          courseHealthStates={courseHealthStates}
          courseSyncStates={courseSyncStates}
          courses={courses}
          isDisconnecting={isDisconnecting}
          isRefreshing={isRefreshing}
          isSavingSelection={isSavingSelection}
          isSyncingSelected={isSyncingSelected}
          onSaveSelection={handleSaveSelection}
          onDisconnect={handleDisconnectRequest}
          onCreateReviewerFromCanvas={onCreateReviewerFromCanvas}
          onOpenGrades={onOpenGrades}
          onRefresh={handleRefresh}
          onCancelCourseSync={handleCancelCourseSync}
          onSyncCourse={handleSyncCourse}
          onSyncSelected={handleSyncSelected}
          onToggleCourse={handleToggleCourse}
          savedSelectedCourseIds={savedSelectedCourseIds}
          selectedCourseIds={selectedCourseIds}
        />
      ) : (
        <DisconnectedCanvasState
          baseUrl={baseUrl}
          isConnecting={isConnecting}
          onChangeBaseUrl={(value) => {
            setBaseUrl(value);
            setError(null);
          }}
          onChangeToken={(value) => {
            setPersonalAccessToken(value);
            setError(null);
          }}
          onSubmit={handleConnect}
          personalAccessToken={personalAccessToken}
        />
      )}
    </Screen>
  );
}

function DisconnectedCanvasState({
  baseUrl,
  isConnecting,
  onChangeBaseUrl,
  onChangeToken,
  onSubmit,
  personalAccessToken,
}: {
  readonly baseUrl: string;
  readonly isConnecting: boolean;
  readonly onChangeBaseUrl: (value: string) => void;
  readonly onChangeToken: (value: string) => void;
  readonly onSubmit: () => void;
  readonly personalAccessToken: string;
}) {
  return (
    <Card style={styles.formCard} testID="canvas-disconnected-state">
      <Text style={styles.statusTitle}>Connect Canvas</Text>
      <Text style={styles.statusText}>
        Enter a personal access token generated from your own Canvas account.
        Stay Focused can access only Canvas information available to that
        account.
      </Text>
      <TextField
        autoCapitalize="none"
        autoComplete="off"
        inputMode="url"
        label="Canvas URL"
        onChangeText={onChangeBaseUrl}
        placeholder="https://school.instructure.com"
        testID="canvas-base-url-input"
        value={baseUrl}
      />
      <TextField
        autoCapitalize="none"
        autoComplete="off"
        label="Personal access token"
        onChangeText={onChangeToken}
        placeholder="Canvas token"
        secureTextEntry
        testID="canvas-token-input"
        textContentType="password"
        value={personalAccessToken}
      />
      <Button
        fullWidth
        loading={isConnecting}
        onPress={onSubmit}
        testID="canvas-connect-button"
        variant="primary"
      >
        Connect Canvas
      </Button>
      <Text style={styles.statusText}>
        The token stays yours, can be revoked in Canvas, and is stored encrypted
        by Stay Focused. Access still depends on school and course permissions.
      </Text>
    </Card>
  );
}

function ConnectedCanvasState({
  capabilities,
  connection,
  courseHealthStates,
  courseSyncStates,
  courses,
  isDisconnecting,
  isRefreshing,
  isSavingSelection,
  isSyncingSelected,
  onDisconnect,
  onCreateReviewerFromCanvas,
  onCancelCourseSync,
  onOpenGrades,
  onRefresh,
  onSaveSelection,
  onSyncCourse,
  onSyncSelected,
  onToggleCourse,
  savedSelectedCourseIds,
  selectedCourseIds,
}: {
  readonly capabilities: readonly CanvasCapabilitySummary[];
  readonly connection: CanvasConnectionSummary;
  readonly courseHealthStates: Readonly<Record<string, CanvasCourseSyncHealth>>;
  readonly courseSyncStates: Readonly<Record<string, CourseSyncDisplayState>>;
  readonly courses: readonly CanvasCourseInventoryItem[];
  readonly isDisconnecting: boolean;
  readonly isRefreshing: boolean;
  readonly isSavingSelection: boolean;
  readonly isSyncingSelected: boolean;
  readonly onDisconnect: () => void;
  readonly onCreateReviewerFromCanvas: (
    courseId: string,
    courseName: string,
  ) => void;
  readonly onCancelCourseSync: (courseId: string) => void;
  readonly onOpenGrades: (courseId: string, courseName: string) => void;
  readonly onRefresh: () => void;
  readonly onSaveSelection: () => void;
  readonly onSyncCourse: (courseId: string) => void;
  readonly onSyncSelected: () => void;
  readonly onToggleCourse: (courseId: string) => void;
  readonly savedSelectedCourseIds: readonly string[];
  readonly selectedCourseIds: readonly string[];
}) {
  const selectedChanged = !sameStringSet(selectedCourseIds, savedSelectedCourseIds);
  const selectedCourses = courses.filter((course) =>
    selectedCourseIds.includes(course.id),
  );
  const likelyCurrent = courses.filter(
    (course) => course.classification === "likely_current",
  );
  const past = courses.filter(
    (course) => course.classification === "past_or_concluded",
  );
  const uncertain = courses.filter(
    (course) => course.classification === "other_or_uncertain",
  );
  const unavailable = courses.filter(
    (course) => course.classification === "unavailable",
  );

  return (
    <View style={styles.connectedStack} testID="canvas-connected-state">
      <Card style={styles.summaryCard} accent>
        <View style={styles.summaryHeader}>
          <Text style={styles.statusTitle}>{connection.canvasUserName}</Text>
          <Text style={styles.summaryMeta}>{formatCanvasHost(connection.baseUrl)}</Text>
          <Text style={styles.summaryMeta}>
            Last verified {formatDateTime(connection.lastVerifiedAt)}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button loading={isRefreshing} onPress={onRefresh} variant="primary">
            Refresh
          </Button>
          <Button
            loading={isSavingSelection}
            onPress={onSaveSelection}
            variant="secondary"
          >
            Save
          </Button>
          <Button
            disabled={
              savedSelectedCourseIds.length === 0 ||
              selectedChanged ||
              isSyncingSelected
            }
            loading={isSyncingSelected}
            onPress={onSyncSelected}
            variant="primary"
          >
            Sync selected
          </Button>
          <Button
            loading={isDisconnecting}
            onPress={onDisconnect}
            variant="danger"
          >
            Disconnect
          </Button>
        </View>
      </Card>

      <Card style={styles.summaryCard}>
        <Text style={styles.statusTitle}>Capability summary</Text>
        <View style={styles.capabilityList}>
          {SUMMARY_CAPABILITIES.map((capability) => (
            <CapabilitySummaryRow
              capability={capability}
              key={capability}
              status={findCapabilityStatus(capabilities, capability)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.summaryCard}>
        <Text style={styles.statusTitle}>Selected courses</Text>
        {selectedCourses.length === 0 ? (
          <Text style={styles.statusText}>
            No courses selected.
          </Text>
        ) : (
          <View style={styles.courseList}>
            {selectedCourses.map((course) => (
              <CourseSelectionRow
                course={course}
                health={courseHealthStates[course.id]}
                isSelected={selectedCourseIds.includes(course.id)}
                key={course.id}
                onCreateReviewerFromCanvas={onCreateReviewerFromCanvas}
                onCancelSync={onCancelCourseSync}
                onOpenGrades={onOpenGrades}
                onToggle={onToggleCourse}
                onSyncAgain={onSyncCourse}
                syncState={courseSyncStates[course.id]}
              />
            ))}
          </View>
        )}
        {selectedChanged ? (
          <Text style={styles.statusText}>Save selection before syncing.</Text>
        ) : null}
      </Card>

      <CourseSection
        courses={likelyCurrent}
        courseHealthStates={courseHealthStates}
        courseSyncStates={courseSyncStates}
        onCreateReviewerFromCanvas={onCreateReviewerFromCanvas}
        onCancelCourseSync={onCancelCourseSync}
        onOpenGrades={onOpenGrades}
        onToggleCourse={onToggleCourse}
        onSyncCourse={onSyncCourse}
        selectedCourseIds={selectedCourseIds}
        title="Likely current"
      />
      <CourseSection
        courses={past}
        courseHealthStates={courseHealthStates}
        courseSyncStates={courseSyncStates}
        onCreateReviewerFromCanvas={onCreateReviewerFromCanvas}
        onCancelCourseSync={onCancelCourseSync}
        onOpenGrades={onOpenGrades}
        onToggleCourse={onToggleCourse}
        onSyncCourse={onSyncCourse}
        selectedCourseIds={selectedCourseIds}
        title="Past or concluded"
      />
      <CourseSection
        courses={uncertain}
        courseHealthStates={courseHealthStates}
        courseSyncStates={courseSyncStates}
        onCreateReviewerFromCanvas={onCreateReviewerFromCanvas}
        onCancelCourseSync={onCancelCourseSync}
        onOpenGrades={onOpenGrades}
        onToggleCourse={onToggleCourse}
        onSyncCourse={onSyncCourse}
        selectedCourseIds={selectedCourseIds}
        title="Other or uncertain"
      />
      <CourseSection
        courses={unavailable}
        courseHealthStates={courseHealthStates}
        courseSyncStates={courseSyncStates}
        onCreateReviewerFromCanvas={onCreateReviewerFromCanvas}
        onCancelCourseSync={onCancelCourseSync}
        onOpenGrades={onOpenGrades}
        onToggleCourse={onToggleCourse}
        onSyncCourse={onSyncCourse}
        selectedCourseIds={selectedCourseIds}
        title="Unavailable"
      />
    </View>
  );
}

function CourseSection({
  courses,
  courseHealthStates,
  courseSyncStates,
  onCancelCourseSync,
  onCreateReviewerFromCanvas,
  onOpenGrades,
  onSyncCourse,
  onToggleCourse,
  selectedCourseIds,
  title,
}: {
  readonly courses: readonly CanvasCourseInventoryItem[];
  readonly courseHealthStates: Readonly<Record<string, CanvasCourseSyncHealth>>;
  readonly courseSyncStates: Readonly<Record<string, CourseSyncDisplayState>>;
  readonly onCancelCourseSync: (courseId: string) => void;
  readonly onCreateReviewerFromCanvas: (
    courseId: string,
    courseName: string,
  ) => void;
  readonly onOpenGrades: (courseId: string, courseName: string) => void;
  readonly onSyncCourse: (courseId: string) => void;
  readonly onToggleCourse: (courseId: string) => void;
  readonly selectedCourseIds: readonly string[];
  readonly title: string;
}) {
  if (courses.length === 0) {
    return null;
  }

  return (
    <Card style={styles.summaryCard}>
      <Text style={styles.statusTitle}>{title}</Text>
      <View style={styles.courseList}>
        {courses.map((course) => (
          <CourseSelectionRow
            course={course}
            health={courseHealthStates[course.id]}
            isSelected={selectedCourseIds.includes(course.id)}
            key={course.id}
            onCreateReviewerFromCanvas={onCreateReviewerFromCanvas}
            onCancelSync={onCancelCourseSync}
            onOpenGrades={onOpenGrades}
            onToggle={onToggleCourse}
            onSyncAgain={onSyncCourse}
            syncState={courseSyncStates[course.id]}
          />
        ))}
      </View>
    </Card>
  );
}

function CourseSelectionRow({
  course,
  health,
  isSelected,
  onCancelSync,
  onCreateReviewerFromCanvas,
  onOpenGrades,
  onSyncAgain,
  onToggle,
  syncState,
}: {
  readonly course: CanvasCourseInventoryItem;
  readonly health: CanvasCourseSyncHealth | undefined;
  readonly isSelected: boolean;
  readonly onCancelSync: (courseId: string) => void;
  readonly onCreateReviewerFromCanvas: (
    courseId: string,
    courseName: string,
  ) => void;
  readonly onOpenGrades: (courseId: string, courseName: string) => void;
  readonly onSyncAgain: (courseId: string) => void;
  readonly onToggle: (courseId: string) => void;
  readonly syncState: CourseSyncDisplayState | undefined;
}) {
  const disabled = !course.selectable;
  const canCreateReviewer = course.selected && hasCompletedSourceSync(course);
  const canOpenGrades = course.selected && course.selectable;
  const needsSync = course.selected && !hasCompletedSourceSync(course);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled }}
      disabled={disabled}
      onPress={() => onToggle(course.id)}
      style={[styles.courseRow, disabled ? styles.courseRowDisabled : null]}
      testID={`canvas-course-row-${course.id}`}
    >
      <View style={[styles.checkBox, isSelected ? styles.checkBoxSelected : null]}>
        <Text style={styles.checkMark}>{isSelected ? "x" : ""}</Text>
      </View>
      <View style={styles.courseBody}>
        <Text style={styles.courseTitle}>{course.displayName}</Text>
        <Text style={styles.summaryMeta}>{formatCourseMeta(course)}</Text>
        {course.unavailableReason ? (
          <Text style={styles.courseWarning}>{course.unavailableReason}</Text>
        ) : null}
        <Text style={styles.summaryMeta}>
          {formatCourseSyncState(syncState, course)}
        </Text>
        <Text style={styles.summaryMeta}>
          Health: {formatSyncHealth(health?.overallHealth ?? course.syncHealth?.overallHealth)}
        </Text>
        {health ? (
          <View style={styles.scopeHealthList} testID={`canvas-sync-health-${course.id}`}>
            {(["content", "announcements", "files", "grades"] as const).map(
              (scope) => (
                <Text key={scope} style={styles.scopeHealthText}>
                  {formatScopeName(scope)}: {formatSyncHealth(health.scopes[scope].health)}
                </Text>
              ),
            )}
          </View>
        ) : null}
        {syncState?.status === "running" && syncState.job &&
        syncState.job.stage !== "promoting_scopes" &&
        syncState.job.stage !== "storing_result" ? (
          <Button
            onPress={() => onCancelSync(course.id)}
            testID={`canvas-cancel-sync-${course.id}`}
            variant="danger"
          >
            Cancel
          </Button>
        ) : null}
        {syncState?.status !== "running" &&
        (
          health?.overallHealth === "needs_attention" ||
          health?.overallHealth === "stale"
        ) ? (
          <Button
            onPress={() => onSyncAgain(course.id)}
            testID={`canvas-sync-again-${course.id}`}
            variant="secondary"
          >
            Sync again
          </Button>
        ) : null}
        {canCreateReviewer ? (
          <Button
            onPress={() =>
              onCreateReviewerFromCanvas(course.id, course.displayName)
            }
            testID={`canvas-create-reviewer-${course.id}`}
            variant="primary"
          >
            Create reviewer
          </Button>
        ) : needsSync ? (
          <Text style={styles.courseWarning}>Sync this course first</Text>
        ) : null}
        {canOpenGrades ? (
          <Button
            onPress={() => onOpenGrades(course.id, course.displayName)}
            testID={`canvas-open-grades-${course.id}`}
            variant="secondary"
          >
            Grades
          </Button>
        ) : null}
      </View>
    </Pressable>
  );
}

function CapabilitySummaryRow({
  capability,
  status,
}: {
  readonly capability: CanvasCapability;
  readonly status: CanvasCapabilityStatus;
}) {
  return (
    <View style={styles.capabilityRow}>
      <Text style={styles.capabilityName}>{formatCapabilityName(capability)}</Text>
      <Text style={[styles.capabilityStatus, capabilityStatusStyle(status)]}>
        {formatCapabilityStatus(status)}
      </Text>
    </View>
  );
}

function ErrorCard({ error }: { readonly error: CoursesDisplayError }) {
  return (
    <View style={styles.errorBox} testID="courses-error">
      <Text style={styles.errorTitle}>{error.title}</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      {error.detail ? <Text style={styles.errorDetail}>{error.detail}</Text> : null}
    </View>
  );
}

function SuccessCard({ message }: { readonly message: string }) {
  return (
    <View style={styles.successBox} testID="courses-success">
      <Text style={styles.successText}>{message}</Text>
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
  | { readonly ok: false; readonly error: CoursesDisplayError } {
  const apiBaseUrl = getApiBaseUrl();
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
        message: "Sign out and sign in again before using Canvas.",
      },
    };
  }

  return { ok: true, value: { apiBaseUrl, accessToken: token } };
}

function formatCanvasError(error: CanvasApiClientError): CoursesDisplayError {
  const detail =
    error.status !== undefined
      ? `Details: HTTP ${error.status}, code ${error.apiCode ?? error.code}.`
      : `Details: code ${error.apiCode ?? error.code}.`;

  switch (error.code) {
    case "invalid_api_base_url":
      return {
        title: "API address needs setup",
        message: error.message,
        detail,
      };
    case "missing_canvas_url":
    case "invalid_canvas_url":
      return {
        title: "Canvas URL needs a change",
        message: error.message,
        detail,
      };
    case "missing_canvas_token":
    case "invalid_canvas_token":
      return {
        title: "Canvas token was not accepted",
        message: error.message,
        detail,
      };
    case "permission_denied":
      return {
        title: "Canvas permission denied",
        message: "Canvas denied access for this token or course.",
        detail,
      };
    case "rate_limited":
      return {
        title: "Canvas is rate limiting",
        message: "Try again after a short wait.",
        detail,
      };
    case "canvas_timeout":
    case "canvas_unavailable":
    case "network_error":
      return {
        title: "Canvas is unavailable",
        message: error.message,
        detail,
      };
    case "missing_connection":
      return {
        title: "Connect Canvas",
        message: "Connect Canvas before loading courses.",
        detail,
      };
    case "course_not_found":
      return {
        title: "Course unavailable",
        message: "Canvas did not return that course for this connection.",
        detail,
      };
    case "course_not_selected":
      return {
        title: "Select the course",
        message: "Save the course selection before syncing it.",
        detail,
      };
    case "course_unavailable":
      return {
        title: "Course unavailable",
        message: "That course cannot currently be synchronized.",
        detail,
      };
    case "duplicate_course_submission":
      return {
        title: "Duplicate course",
        message: "Each selected course can be synced once per run.",
        detail,
      };
    case "corrupted_credentials":
      return {
        title: "Reconnect Canvas",
        message: "The saved Canvas connection could not be used.",
        detail,
      };
    default:
      return {
        title: "Canvas action failed",
        message: error.message,
        detail,
      };
  }
}

function findCapabilityStatus(
  capabilities: readonly CanvasCapabilitySummary[],
  capability: CanvasCapability,
): CanvasCapabilityStatus {
  return (
    capabilities.find((entry) => entry.capability === capability)?.status ??
    "not_tested"
  );
}

function formatCapabilityName(capability: CanvasCapability): string {
  switch (capability) {
    case "new_quizzes":
      return "New Quizzes";
    case "assignment_groups":
      return "Assignment groups";
    default:
      return capability
        .split("_")
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(" ");
  }
}

function formatCapabilityStatus(status: CanvasCapabilityStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "permission_denied":
      return "Permission dependent";
    case "not_enabled":
      return "Not enabled";
    case "not_supported":
      return "Not supported";
    case "temporarily_failed":
      return "Temporarily failed";
    case "not_tested":
      return "Not tested yet";
  }
}

function capabilityStatusStyle(status: CanvasCapabilityStatus) {
  if (status === "available") return styles.capabilityAvailable;
  if (status === "permission_denied" || status === "not_tested") {
    return styles.capabilityMuted;
  }
  return styles.capabilityWarning;
}

function formatCourseMeta(course: CanvasCourseInventoryItem): string {
  const parts = [
    course.courseCode,
    course.term?.name,
    formatCourseClassification(course.classification),
  ].filter((part): part is string => Boolean(part));
  return parts.join(" | ");
}

function formatCourseClassification(
  classification: CanvasCourseInventoryItem["classification"],
): string {
  switch (classification) {
    case "likely_current":
      return "Likely current";
    case "past_or_concluded":
      return "Past or concluded";
    case "other_or_uncertain":
      return "Other or uncertain";
    case "unavailable":
      return "Unavailable";
  }
}

function formatCourseSyncState(
  syncState: CourseSyncDisplayState | undefined,
  course: CanvasCourseInventoryItem,
): string {
  if (syncState?.status === "running") {
    return syncState.progressMessage ?? "Sync running";
  }
  if (syncState?.summary) {
    return `Sync ${syncState.summary.status} | ${formatDuration(syncState.summary.durationMs)}`;
  }
  if (syncState?.error) {
    return `Sync failed | ${syncState.error.code}`;
  }
  if (!course.lastSync) {
    return "Not synced yet";
  }
  if (course.lastSync.status === "running") {
    return "Sync running";
  }
  const date = course.lastSync.completedAt ?? course.lastSync.lastCheckedAt;
  return `Last sync ${course.lastSync.status}${date ? ` | ${formatDateTime(date)}` : ""}`;
}

function hasCompletedSourceSync(course: CanvasCourseInventoryItem): boolean {
  if (!course.lastSync || course.lastSync.status === "running") {
    return false;
  }
  if (course.lastSync.status === "success" || course.lastSync.status === "partial") {
    return Boolean(course.lastSync.completedAt ?? course.lastSync.lastCheckedAt);
  }
  return Boolean(course.lastSync.lastSuccessfulSyncAt);
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function displayStateForJob(
  job: CanvasSyncJobStatusView,
): CourseSyncDisplayState {
  if (
    job.status === "queued" ||
    job.status === "running" ||
    job.status === "cancellation_requested"
  ) {
    return {
      job,
      status: "running",
      progressMessage: job.progress.message,
    };
  }
  if (job.status === "succeeded") {
    return job.outcome === "partial"
      ? {
          job,
          status: "partial",
          progressMessage: "Sync completed, but some areas need attention",
        }
      : {
          job,
          status: "success",
          progressMessage:
            job.outcome === "unchanged"
              ? "Already up to date"
              : "Synchronization complete",
        };
  }
  return {
    job,
    status: "failed",
    error: {
      code: "storage_failed",
      message:
        job.safeErrorMessage ??
        (job.status === "cancelled"
          ? "Canvas synchronization was cancelled."
          : "Canvas synchronization needs attention."),
    },
  };
}

function formatSyncHealth(
  health: CanvasCourseSyncHealth["overallHealth"] | undefined,
): string {
  switch (health) {
    case "not_synced":
      return "Not synced";
    case "syncing":
      return "Syncing";
    case "healthy":
      return "Healthy";
    case "needs_attention":
      return "Needs attention";
    case "stale":
      return "Stale";
    default:
      return "Not checked";
  }
}

function formatScopeName(scope: keyof CanvasCourseSyncHealth["scopes"]): string {
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function formatCanvasHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  formCard: {
    gap: spacing[4],
  },
  connectedStack: {
    gap: spacing[4],
  },
  summaryCard: {
    gap: spacing[4],
  },
  summaryHeader: {
    gap: spacing[1],
  },
  statusCard: {
    alignItems: "flex-start",
    gap: spacing[2],
  },
  statusTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
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
  scopeHealthList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  scopeHealthText: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  capabilityList: {
    gap: spacing[2],
  },
  capabilityRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing[3],
    justifyContent: "space-between",
    paddingBottom: spacing[2],
  },
  capabilityName: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 19,
  },
  capabilityStatus: {
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "800",
    lineHeight: 19,
    textAlign: "right",
  },
  capabilityAvailable: {
    color: colors.success,
  },
  capabilityMuted: {
    color: colors.textMuted,
  },
  capabilityWarning: {
    color: colors.error,
  },
  courseList: {
    gap: spacing[3],
  },
  courseRow: {
    alignItems: "flex-start",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing[1],
    paddingBottom: spacing[3],
  },
  courseRowDisabled: {
    opacity: 0.58,
  },
  checkBox: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: 4,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    marginRight: spacing[2],
    marginTop: 1,
    width: 22,
  },
  checkBoxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accentPressed,
  },
  checkMark: {
    color: colors.accentText,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "900",
    lineHeight: 15,
    textAlign: "center",
  },
  courseBody: {
    flex: 1,
    gap: spacing[1],
  },
  courseTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 21,
  },
  courseWarning: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  errorBox: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
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
  successBox: {
    backgroundColor: colors.successSurface,
    borderColor: colors.success,
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing[3],
  },
  successText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    fontWeight: "700",
    lineHeight: 19,
  },
});
