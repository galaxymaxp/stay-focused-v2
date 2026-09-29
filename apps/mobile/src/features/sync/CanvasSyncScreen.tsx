import { router } from "expo-router";
import { Check, ChevronDown, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, Pressable, TextInput, View } from "react-native";

import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { courseIdentity } from "../../design/courseIdentity";
import { CourseMark } from "../../design/CourseViews";
import { Action, Copy, Notice, Page, RowLink, Sheet, Surface } from "../../design/primitives";
import { animateNextLayout } from "../../design/SwipeRow";
import { motion, useTheme } from "../../design/theme";
import { hitTarget, radius, spacing } from "../../design/tokens";
import { COURSE_GRADES_PATHNAME, courseRouteParams } from "../../navigation/appRoutes";
import {
  connectCanvas,
  disconnectCanvas,
  getCanvasConnection,
  listCanvasCourses,
  type CanvasApiClientError,
  type CanvasConnectionSummary,
  type CanvasCourseInventoryItem,
} from "../../services/canvasApi";
import { useCanvasSync } from "./CanvasSyncProvider";
import { orderSyncCourses, syncRowState, visibleSyncCourses, type SyncRowState } from "./canvasSyncPresentation";

type Load =
  | { readonly state: "loading" }
  | { readonly state: "error"; readonly message: string }
  | { readonly state: "disconnected" }
  | { readonly state: "reconnect"; readonly connection: CanvasConnectionSummary }
  | { readonly state: "connected"; readonly connection: CanvasConnectionSummary; readonly courses: readonly CanvasCourseInventoryItem[] };

/** Plain words for the student; codes and HTTP details stay out of the UI. */
function friendlyError(error: CanvasApiClientError): string {
  switch (error.code) {
    case "network_error":
    case "request_aborted":
      return "You’re offline. Connect to the internet and try again.";
    case "invalid_canvas_token":
    case "missing_canvas_token":
      return "Canvas didn’t accept that access token. Create a new one in Canvas and try again.";
    case "invalid_canvas_url":
    case "missing_canvas_url":
      return "Check your school’s Canvas address, for example https://school.instructure.com.";
    case "rate_limited":
      return "Canvas is busy right now. Try again in a moment.";
    case "corrupted_credentials":
      return "Your Canvas connection needs to be set up again.";
    default:
      return "Canvas couldn’t be reached. Try again in a moment.";
  }
}

/**
 * Canvas course sync as one motion: search, tap, sync, done. Selection and the
 * durable sync jobs happen behind the single Sync tap; there is no separate
 * save step, confirmation or diagnostics.
 */
export function CanvasSyncScreen({ focusCourseId = null }: { focusCourseId?: string | null }) {
  const { session } = useAuth();
  const { reducedMotion } = useTheme();
  const { courseStates, dataVersion, syncCourse, unsyncCourse } = useCanvasSync();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [options, setOptions] = useState<CanvasCourseInventoryItem | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const request = useCallback(() => {
    const apiBaseUrl = getApiBaseUrl();
    const accessToken = session?.accessToken?.trim();
    return apiBaseUrl && accessToken ? { apiBaseUrl, accessToken } : null;
  }, [session?.accessToken]);

  const reload = useCallback(async (quiet: boolean) => {
    const input = request();
    if (!input) {
      setLoad({ state: "error", message: "Sign in again to use Canvas." });
      return;
    }
    if (!quiet) setLoad({ state: "loading" });
    const connection = await getCanvasConnection(input);
    if (!connection.ok) {
      if (!quiet) setLoad({ state: "error", message: friendlyError(connection.error) });
      return;
    }
    if (!connection.data.connection) {
      setLoad({ state: "disconnected" });
      return;
    }
    if (connection.data.connection.status !== "active") {
      setLoad({ state: "reconnect", connection: connection.data.connection });
      return;
    }
    const courses = await listCanvasCourses(input);
    if (!courses.ok) {
      if (courses.error.code === "invalid_canvas_token") {
        setLoad({ state: "reconnect", connection: connection.data.connection });
        return;
      }
      if (!quiet) setLoad({ state: "error", message: friendlyError(courses.error) });
      return;
    }
    setLoad({ state: "connected", connection: connection.data.connection, courses: courses.data.courses });
  }, [request]);

  // First load, then a quiet refresh whenever a sync finishes or a course is unsynced.
  const firstLoad = useRef(true);
  useEffect(() => {
    void reload(!firstLoad.current);
    firstLoad.current = false;
  }, [reload, dataVersion]);

  const ordered = useMemo(
    () => (load.state === "connected" ? orderSyncCourses(load.courses, focusCourseId) : []),
    [focusCourseId, load],
  );
  const visible = visibleSyncCourses(ordered, query, expanded);
  const hasFailedCourse = visible.items.some((course) => courseStates[course.id] === "failed");

  async function sync(course: CanvasCourseInventoryItem) {
    setNote(null);
    const started = await syncCourse({ id: course.id, displayName: course.displayName });
    if (!started) setNote("That course couldn’t start syncing. Check your connection, then tap Retry.");
  }

  function disconnect() {
    Alert.alert("Disconnect Canvas?", "Your saved Reviewers, quizzes and activities stay in Stay Focused.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => {
          const input = request();
          if (!input) return;
          void disconnectCanvas(input).then((result) => {
            if (result.ok) setLoad({ state: "disconnected" });
            else setNote(friendlyError(result.error));
          });
        },
      },
    ]);
  }

  const connected = load.state === "connected";
  return (
    <Page
      back
      title="Canvas courses"
      subtitle={connected ? load.connection.baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : undefined}
      onRefresh={() => void reload(true)}
      actions={connected || load.state === "reconnect" ? [{ label: "Replace access token", onPress: () => {
        if (load.state === "connected") setLoad({ state: "reconnect", connection: load.connection });
      } }, { label: "Disconnect Canvas", onPress: disconnect }] : []}
      headerBelow={connected ? <CourseSearch value={query} onChange={setQuery} /> : undefined}
    >
      {load.state === "loading" ? <SyncSkeleton /> : null}
      {load.state === "error" ? (
        <Surface>
          <Copy size="h3">Canvas couldn’t load</Copy>
          <Copy muted>{load.message}</Copy>
          <Action secondary onPress={() => void reload(false)}>Try again</Action>
        </Surface>
      ) : null}
      {load.state === "disconnected" ? <ConnectCanvas onConnected={() => void reload(false)} request={request} /> : null}
      {load.state === "reconnect" ? <>
        <Notice>{load.connection.status === "disconnected" ? "Canvas is disconnected." : "Reconnect Canvas with a valid token to resume syncing."} Your saved sources, courses and study work remain available.</Notice>
        <ConnectCanvas initialBaseUrl={load.connection.baseUrl} onConnected={() => void reload(false)} request={request} />
      </> : null}
      {note ? <Notice>{note}</Notice> : null}
      {connected && hasFailedCourse && !note ? <Notice>Sync didn’t finish. Please try again later.</Notice> : null}
      {connected ? (
        <>
          {visible.items.length > 0 ? (
            <Surface style={{ padding: 0, gap: 0, overflow: "hidden" }}>
              {visible.items.map((course, index) => (
                <SyncCourseRow
                  key={course.id}
                  course={course}
                  first={index === 0}
                  // Rows revealed by "Show all" unfold in sequence below the first three.
                  revealDelay={!query && expanded && index >= 3 ? Math.min(index - 3, 8) * 28 : null}
                  state={syncRowState(course, courseStates[course.id])}
                  onSync={() => void sync(course)}
                  onOptions={() => setOptions(course)}
                />
              ))}
            </Surface>
          ) : (
            <Copy muted style={{ textAlign: "center", paddingVertical: spacing[4] }}>
              {query.trim() ? `No courses match “${query.trim()}”.` : "Canvas didn’t list any courses for this account."}
            </Copy>
          )}
          {!query.trim() && (visible.hiddenCount > 0 || expanded) && ordered.length > 3 ? (
            <Disclosure
              expanded={expanded}
              label={expanded ? "Show fewer" : `Show all ${ordered.length} courses`}
              onPress={() => {
                animateNextLayout(reducedMotion);
                setExpanded((value) => !value);
              }}
            />
          ) : null}
        </>
      ) : null}
      {options ? (
        <CourseOptions
          course={options}
          onClose={() => setOptions(null)}
          onSyncAgain={() => void sync(options)}
          onUnsync={() => {
            const course = options;
            void unsyncCourse(course.id).then((done) => {
              if (!done) setNote("Couldn’t stop syncing that course. Try again.");
            });
          }}
        />
      ) : null}
    </Page>
  );
}

function CourseSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
      <View
        style={{
          minHeight: 40,
          borderRadius: radius.control,
          backgroundColor: colors.surfaceSecondary,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: spacing[3],
          gap: spacing[2],
        }}
      >
        <Search size={16} color={colors.textSecondary} strokeWidth={1.9} />
        <TextInput
          accessibilityLabel="Search courses"
          testID="canvas-course-search"
          value={value}
          onChangeText={onChange}
          placeholder="Search courses..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, minHeight: 40, paddingVertical: 8, color: colors.textPrimary, fontSize: 15 }}
        />
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChange("")} hitSlop={8} style={{ minWidth: hitTarget.min - 8, minHeight: 40, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textMuted, alignItems: "center", justifyContent: "center" }}>
              <X size={12} color={colors.surfaceSecondary} strokeWidth={2.6} />
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const rowStatus: Record<SyncRowState, string> = {
  synced: "Synced",
  syncing: "Syncing",
  not_synced: "Not synced",
  failed: "Sync didn’t finish",
  unavailable: "Unavailable in Canvas",
};

function SyncCourseRow({
  course,
  first,
  state,
  revealDelay,
  onSync,
  onOptions,
}: {
  course: CanvasCourseInventoryItem;
  first: boolean;
  state: SyncRowState;
  revealDelay: number | null;
  onSync: () => void;
  onOptions: () => void;
}) {
  const { colors, reducedMotion } = useTheme();
  const identity = useMemo(() => courseIdentity({ id: course.id, name: course.displayName, code: course.courseCode }), [course.courseCode, course.displayName, course.id]);
  const reveal = useRef(new Animated.Value(revealDelay === null || reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (revealDelay === null || reducedMotion) return;
    const animation = Animated.timing(reveal, { toValue: 1, duration: motion.normal, delay: revealDelay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
    // Only rows mounted by the disclosure unfold; later renders never replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tap = state === "synced" ? onOptions : state === "not_synced" || state === "failed" ? onSync : undefined;
  const actionLabel = state === "synced" ? `${identity.title}, synced. Show course options` : state === "not_synced" ? `Sync ${identity.title}` : state === "failed" ? `Retry syncing ${identity.title}` : `${identity.title}, ${rowStatus[state]}`;
  return (
    <Animated.View style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        accessibilityState={{ disabled: !tap, busy: state === "syncing" }}
        testID={`canvas-sync-row-${course.id}`}
        disabled={!tap}
        onPress={tap}
        style={({ pressed }) => ({
          minHeight: 64,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2] + 2,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[3],
          borderTopWidth: first ? 0 : 1,
          borderColor: colors.separator,
          backgroundColor: pressed ? colors.surfaceSecondary : undefined,
          opacity: state === "unavailable" ? 0.55 : 1,
        })}
      >
        <CourseMark identity={identity} size={36} />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Copy size="bodySmall" numberOfLines={2} style={{ fontWeight: "600", fontSize: 15, lineHeight: 20 }}>{identity.title}</Copy>
          {identity.subtitle ? <Copy muted size="caption" numberOfLines={1}>{identity.subtitle}</Copy> : null}
        </View>
        <SyncControl state={state} />
      </Pressable>
    </Animated.View>
  );
}

/** One control per row that says what is true and what a tap will do. */
function SyncControl({ state }: { state: SyncRowState }) {
  const { colors, reducedMotion } = useTheme();
  const settled = useRef(new Animated.Value(1)).current;
  const previous = useRef(state);
  useEffect(() => {
    // Syncing → Synced lands with a small spring so "done" is felt, not read.
    if (previous.current === "syncing" && state === "synced" && !reducedMotion) {
      settled.setValue(0.6);
      Animated.spring(settled, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
    }
    previous.current = state;
  }, [reducedMotion, settled, state]);
  if (state === "syncing") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minWidth: 76, justifyContent: "flex-end" }}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
        <Copy size="caption" muted>Syncing</Copy>
      </View>
    );
  }
  if (state === "synced") {
    return (
      <Animated.View style={{ flexDirection: "row", alignItems: "center", gap: 4, minWidth: 76, justifyContent: "flex-end", opacity: settled, transform: [{ scale: settled }] }}>
        <Check size={15} color={colors.success} strokeWidth={2.4} />
        <Copy size="caption" color={colors.success} style={{ fontWeight: "600" }}>Synced</Copy>
      </Animated.View>
    );
  }
  if (state === "unavailable") return <Copy size="caption" muted>Unavailable</Copy>;
  const retry = state === "failed";
  return (
    <View style={{ minWidth: 64, height: 30, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: retry ? colors.orangeSoft : colors.blueSoft, alignItems: "center", justifyContent: "center" }}>
      <Copy size="caption" color={retry ? colors.warning : colors.accent} style={{ fontWeight: "700", fontSize: 13 }}>{retry ? "Retry" : "Sync"}</Copy>
    </View>
  );
}

function Disclosure({ expanded, label, onPress }: { expanded: boolean; label: string; onPress: () => void }) {
  const { colors, reducedMotion } = useTheme();
  const turn = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) turn.setValue(expanded ? 1 : 0);
    else Animated.spring(turn, { toValue: expanded ? 1 : 0, ...motion.spring, useNativeDriver: true }).start();
  }, [expanded, reducedMotion, turn]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={label}
      testID="canvas-course-disclosure"
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: hitTarget.min, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}
    >
      <Copy size="bodySmall" color={colors.accent} style={{ fontWeight: "600" }}>{label}</Copy>
      <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
        <ChevronDown size={16} color={colors.accent} strokeWidth={2} />
      </Animated.View>
    </Pressable>
  );
}

/** Everything beyond syncing lives here, one tap away from a synced course. */
function CourseOptions({
  course,
  onClose,
  onSyncAgain,
  onUnsync,
}: {
  course: CanvasCourseInventoryItem;
  onClose: () => void;
  onSyncAgain: () => void;
  onUnsync: () => void;
}) {
  const { colors } = useTheme();
  const identity = courseIdentity({ id: course.id, name: course.displayName, code: course.courseCode });
  const then = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <Sheet title={identity.title} onClose={onClose}>
      <RowLink label="Study materials" onPress={then(() => router.push({ pathname: "/courses/[courseId]", params: { courseId: course.id, courseName: course.displayName, courseCode: course.courseCode ?? "" } }))}>
        <Copy>Study materials</Copy>
      </RowLink>
      <RowLink label="Grades" onPress={then(() => router.push({ pathname: COURSE_GRADES_PATHNAME, params: courseRouteParams({ courseId: course.id, courseName: course.displayName }) }))}>
        <Copy>Grades</Copy>
      </RowLink>
      <RowLink label="Sync again" onPress={then(onSyncAgain)}>
        <Copy>Sync again</Copy>
      </RowLink>
      <RowLink label="Stop syncing this course" trailing={null} onPress={then(onUnsync)}>
        <Copy color={colors.warning}>Stop syncing</Copy>
        <Copy muted size="caption">Your saved study work stays in Library.</Copy>
      </RowLink>
    </Sheet>
  );
}

function ConnectCanvas({ onConnected, request, initialBaseUrl = "" }: { initialBaseUrl?: string; onConnected: () => void; request: () => { apiBaseUrl: string; accessToken: string } | null }) {
  const { colors } = useTheme();
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = {
    minHeight: 44,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing[3],
    color: colors.textPrimary,
    fontSize: 15,
  } as const;
  async function connect() {
    const input = request();
    if (!input || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await connectCanvas({ ...input, baseUrl, personalAccessToken: token });
      if (result.ok) onConnected();
      else setError(friendlyError(result.error));
    } finally {
      setToken("");
      setBusy(false);
    }
  }
  return (
    <Surface style={{ gap: spacing[3] }}>
      <Copy size="h3">Connect Canvas</Copy>
      <Copy muted size="bodySmall">In Canvas, open Account → Settings → Approved Integrations → New Access Token. Create a token for your own account and paste it here. Reconnect using the same account and school.</Copy>
      <Copy muted size="caption">Enter your school’s Canvas domain. HTTPS is added automatically.</Copy>
      <TextInput accessibilityLabel="Canvas address" testID="canvas-base-url-input" value={baseUrl} onChangeText={setBaseUrl} placeholder="school.instructure.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} inputMode="url" style={field} />
      <TextInput accessibilityLabel="Canvas access token" testID="canvas-token-input" value={token} onChangeText={setToken} placeholder="Access token" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} secureTextEntry style={field} />
      <Action disabled={busy || !baseUrl.trim() || !token.trim()} onPress={() => void connect()} testID="canvas-connect-button">{busy ? "Connecting…" : "Connect"}</Action>
      {error ? <Notice>{error}</Notice> : null}
      <Copy muted size="caption">Your token is stored encrypted and can be revoked in Canvas at any time.</Copy>
    </Surface>
  );
}

function SyncSkeleton() {
  const { colors } = useTheme();
  return (
    <Surface style={{ padding: 0, gap: 0 }}>
      {[0, 1, 2].map((index) => (
        <View key={index} accessibilityLabel={index === 0 ? "Loading Canvas courses" : undefined} style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[3], borderTopWidth: index ? 1 : 0, borderColor: colors.separator }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceSecondary }} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ width: index === 1 ? "70%" : "55%", height: 12, borderRadius: 6, backgroundColor: colors.surfaceSecondary }} />
            <View style={{ width: "35%", height: 9, borderRadius: 5, backgroundColor: colors.surfaceSecondary }} />
          </View>
        </View>
      ))}
    </Surface>
  );
}
