import type {
  GenerationView,
} from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";


import { useAuth } from "../../auth";
import { Action, Copy, Notice, Page } from "../../design/primitives";
import { useAppActivity } from "../../design/appActivity";
import { useTheme } from "../../design/theme";
import { experienceRequest, newRequestKey } from "../../services/experienceApi";
import {
  acceptGeneration,
  readGenerationIntents,
  type GenerationIntent,
} from "../../services/generationRecovery";
import { storeCompletedGeneration } from "../../services/localLibrary/deviceLibrary";
import { persistedArtifactId } from "../../services/localLibrary/librarySync";
import { GenerationCore } from "./GenerationCore";
import { generationCoreState, generationMessages, stalledInQueue } from "./presentation";
import { useExperience, useExperienceClient } from "./useExperience";
import { useQueueItems } from "../queue/useQueueItems";



export function GenerationScreen() {
  const params = useLocalSearchParams<{ id?: string; intent?: string; start?: string; quiz?: string }>();
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
  const queue = useQueueItems();
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
  const isDraft = intent?.type === "activity_output" || data?.artifactId?.startsWith("activity:") === true;
  // Completed and cloud-persisted: keep a device copy for Library and offline reading.
  const persistedId = persistedArtifactId(data);
  const ownerUserId = session?.user.id;
  const openedCompletedArtifact = useRef<string | null>(null);
  const latestView = useRef(data);
  latestView.current = data;
  useEffect(() => {
    // Once per persisted artifact; the polled view object changes every poll.
    const view = latestView.current;
    if (!persistedId || !ownerUserId || !view) return;
    void storeCompletedGeneration(ownerUserId, client, view)
      .catch(() => {
        // Library reconciliation stores it on the next refresh.
      })
      .finally(() => {
        if (openedCompletedArtifact.current === persistedId) return;
        openedCompletedArtifact.current = persistedId;
        router.replace({ pathname: "/artifact", params: { id: persistedId, ...(params.quiz === "1" ? { quiz: "1" } : {}) } });
      });
  }, [persistedId, ownerUserId, client, params.quiz]);
  const running =
    !data ||
    ["queued", "preparing", "generating", "finalizing"].includes(data.state);
  const stalled = !!data && stalledInQueue({ status: data.state, since: data.updatedAt });
  const [cancelling, setCancelling] = useState(false);
  // One key per failed screen: a double tap returns the same retry instead of a second job.
  const [retryKey] = useState(newRequestKey);
  const [retrying, setRetrying] = useState(false);
  const canRetry = data?.state === "failed" && data.error?.retryable === true;
  async function retryFailed() {
    if (!id || retrying) return;
    setRetrying(true);
    setError(null);
    try {
      const result = await experienceRequest<{ id: string }>(client, `/api/jobs/${encodeURIComponent(id)}/retry`, { method: "POST", key: retryKey });
      activity.refresh();
      router.replace({ pathname: "/generation", params: { id: result.id, ...(params.quiz === "1" ? { quiz: "1" } : {}) } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not retry this generation.");
    } finally {
      setRetrying(false);
    }
  }
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
          <GenerationStatus message={stalled ? "Still waiting to start" : data ? isDraft && data.state === "completed" ? "Draft ready" : generationMessages[data.state] : id ? "Connecting to your generation…" : intent && !autoStart ? "Ready to start" : "Starting your request…"} />
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
          {canRetry ? (
            <View style={{ width: 240 }}><Action disabled={retrying} pill onPress={() => void retryFailed()}>{retrying ? "Retrying…" : "Retry"}</Action></View>
          ) : null}
          <View style={{ width: 240 }}><Action secondary pill onPress={() => queue.show()}>View Queue</Action></View>
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
            {canRetry
              ? "This didn’t pass its checks. Retry uses the same settings and topics."
              : data.error.code === "activity_source_unavailable"
                ? data.error.message
                : data.error.code === "quiz_generation_failed"
                  ? "The quiz could not be completed. Try another material."
                  : data.error.message}
          </Notice>
        )}
        {data?.artifactId && (
          <Action
            onPress={() =>
              router.replace({
                pathname: "/artifact",
                params: { id: data.artifactId!, ...(params.quiz === "1" ? { quiz: "1" } : {}) },
              })
            }
          >
            {isDraft ? "Open Draft" : "Open in Library"}
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
