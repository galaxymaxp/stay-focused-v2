import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  CanvasCapability,
  CanvasCapabilityStatus,
  CanvasCourse,
} from "@stay-focused/canvas";

import { useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { colors, spacing, typography } from "../../design/tokens";
import {
  API_BASE_URL_SETUP_HINT,
} from "../../services/reviewerApi";
import {
  connectCanvas,
  disconnectCanvas,
  getCanvasConnection,
  listCanvasCapabilities,
  listCanvasCourses,
  type CanvasApiClientError,
  type CanvasCapabilitySummary,
  type CanvasConnectionSummary,
} from "../../services/canvasApi";

interface CoursesScreenProps {
  readonly onCreateReviewer: () => void;
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

export function CoursesScreen({
  onCreateReviewer,
  onOpenLibrary,
}: CoursesScreenProps) {
  const { isSigningOut, session, signOut } = useAuth();
  const [baseUrl, setBaseUrl] = useState("");
  const [personalAccessToken, setPersonalAccessToken] = useState("");
  const [connection, setConnection] = useState<CanvasConnectionSummary | null>(
    null,
  );
  const [courses, setCourses] = useState<readonly CanvasCourse[]>([]);
  const [capabilities, setCapabilities] =
    useState<readonly CanvasCapabilitySummary[]>([]);
  const [error, setError] = useState<CoursesDisplayError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        setCourses(result.data.courses);
        setCapabilities(result.data.capabilities);
        setBaseUrl(result.data.connection.baseUrl);
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
      setCourses(courseResult.data);
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
          courses={courses}
          isDisconnecting={isDisconnecting}
          isRefreshing={isRefreshing}
          onDisconnect={handleDisconnectRequest}
          onRefresh={handleRefresh}
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
        Stay Focused uses Canvas access to find your courses and check which
        course features your school allows. Course content import comes later.
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
        Canvas access depends on school and course permissions. Some features
        may stay unavailable even after connection.
      </Text>
    </Card>
  );
}

function ConnectedCanvasState({
  capabilities,
  connection,
  courses,
  isDisconnecting,
  isRefreshing,
  onDisconnect,
  onRefresh,
}: {
  readonly capabilities: readonly CanvasCapabilitySummary[];
  readonly connection: CanvasConnectionSummary;
  readonly courses: readonly CanvasCourse[];
  readonly isDisconnecting: boolean;
  readonly isRefreshing: boolean;
  readonly onDisconnect: () => void;
  readonly onRefresh: () => void;
}) {
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
        <Text style={styles.statusTitle}>Available courses</Text>
        {courses.length === 0 ? (
          <Text style={styles.statusText}>
            Canvas did not return available courses for this token.
          </Text>
        ) : (
          <View style={styles.courseList}>
            {courses.map((course) => (
              <View key={course.id} style={styles.courseRow}>
                <Text style={styles.courseTitle}>{course.name}</Text>
                <Text style={styles.summaryMeta}>
                  {course.courseCode ?? "No course code"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
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
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing[1],
    paddingBottom: spacing[3],
  },
  courseTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "800",
    lineHeight: 21,
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
