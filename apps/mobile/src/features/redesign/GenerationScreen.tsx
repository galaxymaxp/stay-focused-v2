import type {
  GenerationView,
  ProcessingJobListPage,
  ProcessingJobStatusView,
} from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { CheckCircle2, CircleDashed, Clock3, AlertCircle } from "lucide-react-native";

import { useAuth } from "../../auth";
import { Action, Copy, Notice, Page, Surface, RowLink, ContentIcon, SkeletonCards } from "../../design/primitives";
import { useAppActivity } from "../../design/appActivity";
import { useTheme } from "../../design/theme";
import { experienceRequest, newRequestKey } from "../../services/experienceApi";
import {
  acceptGeneration,
  discardGenerationIntents,
  readGenerationIntents,
  type GenerationIntent,
} from "../../services/generationRecovery";
import { storeCompletedGeneration } from "../../services/localLibrary/deviceLibrary";
import { persistedArtifactId } from "../../services/localLibrary/librarySync";
import { GenerationCore } from "./GenerationCore";
import { generationCoreState, generationMessages, queueSections, stalledInQueue } from "./presentation";
import { useExperience, useExperienceClient } from "./useExperience";
import { useListPreferences } from "./useListPreferences";

export function GenerationScreen() {
  const params = useLocalSearchParams<{ id?: string; intent?: string; start?: string }>();
  // Requests made from a Generate action start at once; only an old saved
  // request reopened from Queue still asks before it starts.
  const autoStart = params.start === "1";
  const autoStarted = useRef(false);
  const { session } = useAuth(),
    client = useExperienceClient();
  const [id, setId] = useState(params.id ?? null),
    [intent, setIntent] = useState<GenerationIntent | null>(null),
    [error, setError] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0),
    [confirming, setConfirming] = useState(false);
  const confirmationInFlight = useRef(false);
  const activity = useAppActivity();
  useEffect(() => {
    if (!params.intent || !session) return;
    let live = true;
    setError(null);
    void (async () => {
      const saved = (await readGenerationIntents(session.user.id)).find(
        (item) => item.key === params.intent,
      );
      if (!saved)
        throw new Error(
          "This request is no longer saved on this device. Check Queue.",
        );
      if (live) {
        setIntent(saved);
        if (saved.generationId) setId(saved.generationId);
      }
    })().catch((cause) => {
      if (live)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not reconnect this request.",
        );
    });
    return () => {
      live = false;
    };
  }, [params.intent, session, client, attempt]);
  async function confirmGeneration() {
    if (!session || !intent || id || confirmationInFlight.current) return;
    confirmationInFlight.current = true;
    setConfirming(true);
    setError(null);
    try {
      const accepted = await acceptGeneration(session.user.id, client, intent);
      setId(accepted.generationId!);
      setIntent(accepted);
      // The header orb should appear now, not on the next idle check.
      activity.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not confirm this request.");
    } finally {
      confirmationInFlight.current = false;
      setConfirming(false);
    }
  }
  useEffect(() => {
    if (!autoStart || !intent || id || autoStarted.current) return;
    autoStarted.current = true;
    void confirmGeneration();
  });
  const generation = useExperience<GenerationView>(
    id ? `/api/experience/generations/${encodeURIComponent(id)}` : null,
    3000,
    (value) =>
      ["queued", "preparing", "generating", "finalizing"].includes(value.state),
  );
  const data = generation.data;
  // Completed and cloud-persisted: keep a device copy for Library and offline reading.
  const persistedId = persistedArtifactId(data);
  const ownerUserId = session?.user.id;
  const latestView = useRef(data);
  latestView.current = data;
  useEffect(() => {
    // Once per persisted artifact; the polled view object changes every poll.
    const view = latestView.current;
    if (!persistedId || !ownerUserId || !view) return;
    void storeCompletedGeneration(ownerUserId, client, view).catch(() => {
      // Library reconciliation stores it on the next refresh.
    });
  }, [persistedId, ownerUserId, client]);
  const running =
    !data ||
    ["queued", "preparing", "generating", "finalizing"].includes(data.state);
  const stalled = !!data && stalledInQueue({ status: data.state, since: data.updatedAt });
  const [cancelling, setCancelling] = useState(false);
  async function cancelStalled() {
    if (!id || cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      await experienceRequest(client, `/api/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" });
      generation.refresh();
      activity.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel this generation.");
    } finally {
      setCancelling(false);
    }
  }
  return (
    <Page
      title=""
      back
    >
      <View
        style={{
          paddingTop: 40,
          paddingBottom: 32,
          alignItems: "center",
          gap: 24,
        }}
      >
        {intent && (
          <Copy muted size="caption">
            {intent.title}
          </Copy>
        )}
        <View
          accessibilityLiveRegion="polite"
          style={{ alignItems: "center", gap: 0, width: "100%" }}
        >
          <GenerationStatus message={stalled ? "Still waiting to start" : data ? generationMessages[data.state] : id ? "Connecting to your generation…" : intent && !autoStart ? "Ready to start" : "Starting your request…"} />
          <GenerationCore state={generationCoreState(data?.state ?? null, !!id)} />
          <Copy muted size="bodySmall" style={{ textAlign: "center", textAlignVertical: "center", width: 270, minHeight: 56, lineHeight: 20 }}>
            {id
              ? stalled
                ? "The generation service hasn’t picked this up. It may be busy or at its usage limit. Cancel and try again later."
                : running
                ? "You can leave this screen. We’ll keep working."
                : "View your saved work or return to Queue."
              : autoStart
                ? "You can leave this screen. We’ll keep working."
                : "This saved request hasn’t started yet."}
          </Copy>
          {intent && !id && (!autoStart || error) ? (
            <View style={{ width: 240 }}><Action disabled={confirming} pill onPress={() => void confirmGeneration()}>{confirming ? "Starting…" : autoStart ? "Try again" : "Start generation"}</Action></View>
          ) : null}
          {stalled ? (
            <View style={{ width: 240 }}><Action disabled={cancelling} pill onPress={() => void cancelStalled()}>{cancelling ? "Cancelling…" : "Cancel generation"}</Action></View>
          ) : null}
          <View style={{ width: 240 }}><Action secondary pill onPress={() => router.push("/generation-queue")}>View Queue</Action></View>
        </View>
        {(error || generation.error) && (
          <Notice>{error ?? generation.error}</Notice>
        )}
        {error && !id && !intent && (
          <Action secondary onPress={() => setAttempt((value) => value + 1)}>
            Reconnect request
          </Action>
        )}
        {generation.error && (
          <Action secondary onPress={generation.refresh}>
            Reconnect
          </Action>
        )}
        {data?.error && (
          <Notice>
            {data.error.code === "quiz_generation_failed"
              ? "The quiz could not be completed. Try another material."
              : "This generation could not be completed. Open Queue to review it."}
          </Notice>
        )}
        {data?.artifactId && (
          <Action
            onPress={() =>
              router.replace({
                pathname: "/artifact",
                params: { id: data.artifactId! },
              })
            }
          >
            Open in Library
          </Action>
        )}
      </View>
    </Page>
  );
}

function GenerationStatus({ message }: { message: string }) {
  const { reducedMotion } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(message);
  useEffect(() => {
    if (reducedMotion) {
      setVisible(message);
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    const out = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -4, duration: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]);
    out.start(({ finished }) => {
      if (!finished) return;
      setVisible(message);
      translateY.setValue(5);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    });
    return () => out.stop();
  }, [message, opacity, reducedMotion, translateY]);
  return (
    <Animated.View style={{ height: 78, width: 290, alignItems: "center", justifyContent: "center", opacity, transform: [{ translateY }] }}>
      <Copy size="h2" style={{ textAlign: "center", fontSize: 24, lineHeight: 30 }}>{visible}</Copy>
    </Animated.View>
  );
}
export function QueueScreen() {
  const queue = useExperience<ProcessingJobListPage>(
    "/api/jobs?scope=all&limit=50",
    5000,
  );
  const { session } = useAuth(),
    client = useExperienceClient();
  const [pending, setPending] = useState<GenerationIntent[]>([]),
    [more, setMore] = useState<ProcessingJobStatusView[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (session)
      void readGenerationIntents(session.user.id)
        .then((items) => {
          if (live) setPending(items.filter((item) => !item.generationId));
        })
        .catch(() => {
          if (live)
            setError(
              "Could not load local requests. Your accepted work is still on the server.",
            );
        });
    return () => {
      live = false;
    };
  }, [session, queue.data]);
  useEffect(() => {
    if (more.length === 0) setCursor(queue.data?.nextCursor ?? null);
  }, [queue.data, more.length]);
  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const page = await experienceRequest<ProcessingJobListPage>(
        client,
        `/api/jobs?scope=all&limit=50&cursor=${encodeURIComponent(cursor)}`,
      );
      setMore((old) => [...old, ...page.jobs]);
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load older generations.",
      );
    } finally {
      setBusy(false);
    }
  }
  const { prefs, hide } = useListPreferences();
  const cleared = new Set(prefs.hidden.queue);
  const jobs = [
    ...(queue.data?.jobs ?? []),
    ...more.filter(
      (job) => !queue.data?.jobs.some((current) => current.id === job.id),
    ),
  ].filter((job) => !cleared.has(job.id));
  const sections = queueSections(jobs);
  const attention = sections.find((section) => section.key === "attention")?.jobs ?? [];
  const completed = sections.find((section) => section.key === "completed")?.jobs ?? [];
  const needsAttention = attention.length > 0 || pending.length > 0;
  async function clearAttention() {
    for (const job of attention) hide("queue", job.id, true);
    if (session && pending.length) {
      try {
        await discardGenerationIntents(session.user.id, pending.map((item) => item.key));
        setPending([]);
      } catch {
        setError("Could not clear saved requests on this device.");
      }
    }
  }
  return (
    <Page
      title="Queue"
      back
      onRefresh={queue.refresh}
      actions={[{ label: "Uploads & recovery tools", onPress: () => router.push("/processing") }]}
    >
      {queue.error && <Notice>{queue.error}</Notice>}
      {error && <Notice>{error}</Notice>}
      {queue.loading && <SkeletonCards rows={2} label="Loading your generations" />}
      {needsAttention ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Copy size="h2">Needs attention</Copy>
          <Action secondary label="Clear items that need attention" onPress={() => void clearAttention()}>Clear</Action>
        </View>
      ) : null}
      {completed.length ? <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Copy size="h2">Completed</Copy>
        <Action secondary label={`Clear ${completed.length} completed Queue entries`} onPress={() => completed.forEach(job => hide("queue", job.id, true))}>Clear Completed</Action>
      </View> : null}
      {pending.map((item) => (
        <Surface key={item.key}>
          <RowLink inset icon={<ContentIcon kind={item.type} />} label={`Reconnect request: ${item.title}`}
            onPress={() =>
              router.push({
                pathname: "/generation",
                params: { intent: item.key },
              })
            }
          >
            <Copy size="h3">{item.title}</Copy>
            <Copy muted size="caption">Not started</Copy>
          </RowLink>
        </Surface>
      ))}
      {attention.map((job) => (
        <QueueCard key={job.id} job={job} onRefresh={queue.refresh} />
      ))}
      {sections.filter((section) => section.key !== "attention").map((section) => (
        <View key={section.key} style={{ gap: 8 }}>
          {section.key !== "completed" ? <Copy size="h2">{section.title}</Copy> : null}
          {section.jobs.map((job) => (
            <QueueCard key={job.id} job={job} onRefresh={queue.refresh} />
          ))}
        </View>
      ))}
      {queue.data && jobs.length === 0 && pending.length === 0 && (
        <Surface>
          <Copy size="h3">Nothing in your Queue</Copy>
          <Copy muted size="bodySmall">Reviewers and quizzes you generate appear here while they’re made, then stay in Library.</Copy>
        </Surface>
      )}
      {cursor && (
        <Action secondary disabled={busy} onPress={() => void loadMore()}>
          Older generations
        </Action>
      )}
    </Page>
  );
}
function QueueCard({
  job,
  onRefresh,
}: {
  job: ProcessingJobStatusView;
  onRefresh: () => void;
}) {
  const client = useExperienceClient();
  const { colors } = useTheme();
  const activity = useAppActivity();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [retryKey] = useState(newRequestKey);
  const type =
    job.jobType === "quiz_generation"
      ? "Quiz"
      : job.jobType === "activity_generation"
        ? "Activity Draft"
        : job.jobType === "document_extraction"
          ? "Material preparation"
          : "Reviewer";
  async function open() {
    if (busy) return;
    if (job.jobType === "document_extraction") {
      router.push("/processing");
      return;
    }
    if (job.status !== "succeeded") {
      router.push({ pathname: "/generation", params: { id: job.id } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await experienceRequest<GenerationView>(
        client,
        `/api/experience/generations/${encodeURIComponent(job.id)}`,
      );
      if (result.artifactId)
        router.push({
          pathname: "/artifact",
          params: { id: result.artifactId },
        });
      else setError("The saved output is no longer available.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not open this output.",
      );
    } finally {
      setBusy(false);
    }
  }
  const stalled = stalledInQueue({ status: job.status, since: job.updatedAt ?? job.createdAt });
  async function cancel() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await experienceRequest(client, `/api/jobs/${encodeURIComponent(job.id)}/cancel`, { method: "POST" });
      onRefresh();
      activity.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel this generation.");
    } finally {
      setBusy(false);
    }
  }
  async function retry() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await experienceRequest<ProcessingJobStatusView>(
        client,
        `/api/jobs/${encodeURIComponent(job.id)}/retry`,
        { method: "POST", key: retryKey },
      );
      onRefresh();
      activity.refresh();
      router.push({ pathname: "/generation", params: { id: result.id } });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not retry this generation.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Surface>
      <RowLink inset disabled={busy} label={job.status === "succeeded" ? `Open saved output: ${job.source.displayName || type}` : `View generation: ${job.source.displayName || type}`} onPress={() => void open()} icon={<ContentIcon kind={job.jobType === "quiz_generation" ? "quiz" : job.jobType === "activity_generation" ? "activity_output" : "reviewer"} />} trailing={job.status === "succeeded" ? <CheckCircle2 size={19} color={colors.success} /> : job.status === "running" ? <CircleDashed size={19} color={colors.accent} /> : job.status === "queued" ? <Clock3 size={19} color={colors.textMuted} /> : <AlertCircle size={19} color={colors.warning} />}>
      <Copy muted size="caption">{type}</Copy>
      <Copy size="h3">{job.source.displayName || type}</Copy>
      <Copy muted size="caption">
        {job.status === "succeeded"
          ? "Completed"
          : job.status === "running"
            ? "Generating"
            : job.status === "failed" || job.status === "expired"
              ? "Couldn’t finish"
              : job.status === "cancellation_requested"
                ? "Stopping"
                : job.status === "queued"
                  ? stalled ? "Hasn’t started · the generation service may be at its limit" : "Queued"
                  : "Cancelled"}
      </Copy>
      </RowLink>
      {stalled && (
        <Action secondary disabled={busy} onPress={() => void cancel()}>
          Cancel
        </Action>
      )}
      {job.retryable && ["failed", "expired"].includes(job.status) && (
        <Action secondary disabled={busy} onPress={() => void retry()}>
          Retry
        </Action>
      )}
      {error && <Notice>{error}</Notice>}
    </Surface>
  );
}
