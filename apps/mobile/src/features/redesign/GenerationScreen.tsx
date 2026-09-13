import type {
  GenerationView,
  ProcessingJobListPage,
  ProcessingJobStatusView,
} from "@stay-focused/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "../../auth";
import { Action, Copy, Notice, Page, Surface } from "../../design/primitives";
import { experienceRequest, newRequestKey } from "../../services/experienceApi";
import {
  acceptGeneration,
  readGenerationIntents,
  type GenerationIntent,
} from "../../services/generationRecovery";
import { GenerationOrb } from "./GenerationOrb";
import { generationMessages } from "./presentation";
import { useExperience, useExperienceClient } from "./useExperience";

export function GenerationScreen() {
  const params = useLocalSearchParams<{ id?: string; intent?: string }>();
  const { session } = useAuth(),
    client = useExperienceClient();
  const [id, setId] = useState(params.id ?? null),
    [intent, setIntent] = useState<GenerationIntent | null>(null),
    [error, setError] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
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
      if (live) setIntent(saved);
      const accepted = await acceptGeneration(session.user.id, client, saved);
      if (live) {
        setId(accepted.generationId!);
        setIntent(accepted);
      }
    })().catch((cause) => {
      if (live)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not reconnect this request.",
        );
    });
    // Deliberately do not abort admission on Back. A retry reuses the saved key.
    return () => {
      live = false;
    };
  }, [params.intent, session, client, attempt]);
  const generation = useExperience<GenerationView>(
    id ? `/api/experience/generations/${encodeURIComponent(id)}` : null,
    3000,
    (value) =>
      ["queued", "preparing", "generating", "finalizing"].includes(value.state),
  );
  const data = generation.data;
  const running =
    !data ||
    ["queued", "preparing", "generating", "finalizing"].includes(data.state);
  return (
    <Page
      title=""
      back
      footer={
        <Action secondary onPress={() => router.push("/generation-queue")}>
          View Queue
        </Action>
      }
    >
      <View
        style={{
          minHeight: 520,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        {intent && (
          <Copy muted size="caption">
            {intent.title}
          </Copy>
        )}
        <View
          accessibilityLiveRegion="polite"
          style={{ alignItems: "center", gap: 8 }}
        >
          <Copy size="h2" style={{ textAlign: "center" }}>
            {data
              ? generationMessages[data.state]
              : id
                ? "Connecting to your generation…"
                : "Preparing your request…"}
          </Copy>
          <GenerationOrb running={running && !!id} />
          <Copy muted style={{ textAlign: "center" }}>
            {id
              ? running
                ? "You can leave this screen. We’ll keep working."
                : "View your saved work or return to Queue."
              : "You can leave this screen. Keep the app open until your request is accepted; Queue can reconnect it."}
          </Copy>
        </View>
        {(error || generation.error) && (
          <Notice>{error ?? generation.error}</Notice>
        )}
        {error && !id && (
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
  const jobs = [
    ...(queue.data?.jobs ?? []),
    ...more.filter(
      (job) => !queue.data?.jobs.some((current) => current.id === job.id),
    ),
  ];
  return (
    <Page
      title="Queue"
      subtitle="Your work keeps going."
      back
      onRefresh={queue.refresh}
    >
      {queue.error && <Notice>{queue.error}</Notice>}
      {error && <Notice>{error}</Notice>}
      {queue.loading && <Notice>Loading your generations…</Notice>}
      {pending.map((item) => (
        <Surface key={item.key}>
          <Copy size="h3">{item.title}</Copy>
          <Copy muted>Request needs confirmation</Copy>
          <Action
            secondary
            onPress={() =>
              router.push({
                pathname: "/generation",
                params: { intent: item.key },
              })
            }
          >
            Reconnect request
          </Action>
        </Surface>
      ))}
      {(["Generating", "Queued", "Completed", "Needs attention"] as const).map(
        (group) => {
          const selected = jobs.filter((job) =>
            group === "Generating"
              ? ["running", "cancellation_requested"].includes(job.status)
              : group === "Queued"
                ? job.status === "queued"
                : group === "Completed"
                  ? job.status === "succeeded"
                  : ![
                      "running",
                      "cancellation_requested",
                      "queued",
                      "succeeded",
                    ].includes(job.status),
          );
          return (
            <View key={group} style={{ gap: 12 }}>
              <Copy size="h2">{group}</Copy>
              {selected.length ? (
                selected.map((job) => (
                  <QueueCard key={job.id} job={job} onRefresh={queue.refresh} />
                ))
              ) : (
                <Copy muted>
                  {group === "Completed"
                    ? "No completed generations yet."
                    : "Nothing here right now."}
                </Copy>
              )}
            </View>
          );
        },
      )}
      {cursor && (
        <Action secondary disabled={busy} onPress={() => void loadMore()}>
          Older generations
        </Action>
      )}
      <Action secondary onPress={() => router.push("/processing")}>
        Uploads & recovery tools
      </Action>
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
      <Copy muted size="caption">
        {type}
      </Copy>
      <Copy size="h3">{job.source.displayName || type}</Copy>
      <Copy muted>
        {job.status === "succeeded"
          ? "Completed"
          : job.status === "running"
            ? "Generating"
            : job.status === "failed" || job.status === "expired"
              ? "Couldn’t finish"
              : job.status === "cancellation_requested"
                ? "Stopping"
                : job.status === "queued"
                  ? "Queued"
                  : "Cancelled"}
      </Copy>
      <Action secondary disabled={busy} onPress={() => void open()}>
        {job.status === "succeeded" ? "Open saved output" : "View generation"}
      </Action>
      {job.retryable && ["failed", "expired"].includes(job.status) && (
        <Action disabled={busy} onPress={() => void retry()}>
          Retry
        </Action>
      )}
      {error && <Notice>{error}</Notice>}
    </Surface>
  );
}
