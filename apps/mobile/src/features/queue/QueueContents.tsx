import type {
  GenerationView,
  ProcessingJobStatusView,
} from "@stay-focused/shared";
import { router } from "expo-router";
import { queueIsIdle, isProcessingJobRetryDenied, processingJobStoppedMessage } from "@stay-focused/shared";
import { useRef, useState } from "react";
import { View } from "react-native";
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  AlertCircle,
} from "lucide-react-native";
import {
  Action,
  Copy,
  Notice,
  Surface,
  RowLink,
  ContentIcon,
  SkeletonCards,
} from "../../design/primitives";
import { useAppActivity } from "../../design/appActivity";
import { useTheme } from "../../design/theme";
import { experienceRequest, newRequestKey } from "../../services/experienceApi";
import { stalledInQueue } from "../redesign/presentation";
import { useExperienceClient } from "../redesign/useExperience";
import { automaticQueueLabel } from "../redesign/automationPresentation";
import { radius, spacing } from "../../design/tokens";
import { useQueueItems, useQueueGroups } from "./useQueueItems";
import { queueProgress } from "./queuePresentation";
import { CourseBatchQueue } from './CourseBatchQueue';
export function QueueContents() {
  const queue = useQueueItems();
  const { sections, visiblePending, clearAttention, hide, error, jobs } = useQueueGroups();
  const groups = visiblePending.length && !sections.some(section => section.key === "attention")
    ? [...sections.filter(section => section.key !== "completed"), {key: "attention", title: "Needs attention", jobs: []}, ...sections.filter(section => section.key === "completed")]
    : sections;
  return <View style={{gap: spacing[2]}}>
    <CourseBatchQueue />
    {queue.error ? <Notice>{queue.error}</Notice> : null}
    {error ? <Notice>{error}</Notice> : null}
    {queue.loading ? <SkeletonCards rows={2} label="Loading your generations" /> : null}
    {groups.map(group => <View key={group.key} style={{gap: spacing[2]}}>
      <View style={{flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:spacing[2]}}>
        <Copy size="h2" style={{flexShrink:1,minWidth:0}}>{group.title}</Copy>
        {group.key === "attention" ? <Action secondary style={{minWidth:48}} label="Clear items that need attention" onPress={() => void clearAttention()}>Clear</Action> : null}
        {group.key === "completed" ? <Action secondary label={`Clear ${group.jobs.length} completed Queue entries`} onPress={() => group.jobs.forEach(job => hide("queue",job.id,true))}>Clear Completed</Action> : null}
      </View>
      {group.key === "attention" ? visiblePending.map(item => <Surface key={item.key}>
        <RowLink inset icon={<ContentIcon kind={item.type}/>} label={`Reconnect request: ${item.title}`} onPress={() => {queue.close();router.push({pathname:"/generation",params:{intent:item.key}});}}>
          <Copy size="h3">{item.title}</Copy><Copy muted size="caption">Not started</Copy>
        </RowLink>
      </Surface>) : null}
      {group.jobs.map(job => <QueueCard key={job.id} job={job} onRefresh={queue.refresh}/>)}
    </View>)}
    {queue.data && !queue.loading && !queue.error && !error && queueIsIdle({ jobs, pending: visiblePending, courseBatches: queue.data.courseBatches }) ? <Surface><Copy size="h3">Nothing generating right now.</Copy><Copy muted size="bodySmall">Reviewers and quizzes you generate appear here while they are made, then stay in Library.</Copy></Surface> : null}
  </View>;
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
  const { close } = useQueueItems();
  const locked = useRef(false);
  const [retryDenied, setRetryDenied] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [retryKey, setRetryKey] = useState(newRequestKey);
  const type =
    job.jobType === "quiz_generation"
      ? "Quiz"
      : job.jobType === "activity_generation"
        ? "Draft"
        : job.jobType === "document_extraction"
          ? "Material preparation"
          : "Reviewer";
  async function open() {
    if (locked.current) return;
    if (job.jobType === "document_extraction") {
      close();
      router.push("/processing");
      return;
    }
    if (job.status !== "succeeded") {
      close();
      router.push({ pathname: "/generation", params: { id: job.id } });
      return;
    }
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await experienceRequest<GenerationView>(
        client,
        `/api/experience/generations/${encodeURIComponent(job.id)}`,
      );
      if (result.artifactId) {
        close();
        router.push({
          pathname: "/artifact",
          params: { id: result.artifactId },
        });
      } else setError("The saved output is no longer available.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not open this output.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const stalled = stalledInQueue({
    status: job.status,
    since: job.updatedAt ?? job.createdAt,
  });
  async function cancel() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await experienceRequest(
        client,
        `/api/jobs/${encodeURIComponent(job.id)}/cancel`,
        { method: "POST" },
      );
      onRefresh();
      activity.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not cancel this generation.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function retry() {
    if (locked.current || retryDenied) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await experienceRequest<ProcessingJobStatusView>(
        client,
        `/api/jobs/${encodeURIComponent(job.id)}/retry`,
        { method: "POST", key: retryKey },
      );
      setRetryKey(newRequestKey());
      onRefresh();
      activity.refresh();
      close();
      router.push({ pathname: "/generation", params: { id: result.id } });
    } catch (cause) {
      if (isProcessingJobRetryDenied(cause)) setRetryDenied(true);
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not retry this generation.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Surface>
      <RowLink
        inset
        disabled={busy}
        label={
          job.status === "succeeded"
            ? `${job.jobType === "activity_generation" ? "Open Draft" : "Open saved output"}: ${job.source.displayName || type}`
            : `View generation: ${job.source.displayName || type}`
        }
        onPress={() => void open()}
        icon={
          <ContentIcon
            kind={
              job.jobType === "quiz_generation"
                ? "quiz"
                : job.jobType === "activity_generation"
                  ? "activity_output"
                  : "reviewer"
            }
          />
        }
        trailing={
          job.status === "succeeded" ? (
            <CheckCircle2 size={19} color={colors.success} />
          ) : job.status === "running" ? (
            <CircleDashed size={19} color={colors.accent} />
          ) : job.status === "queued" ? (
            <Clock3 size={19} color={colors.textMuted} />
          ) : (
            <AlertCircle size={19} color={colors.warning} />
          )
        }
      >
        <Copy muted size="caption">
          {type}
        </Copy>
        {job.status === "running" || job.status === "queued" ? (
          <Copy size="caption">{queueProgress(job)}</Copy>
        ) : null}
        {automaticQueueLabel(job) ? (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.blueSoft,
              borderRadius: radius.pill,
              paddingHorizontal: spacing[2],
              paddingVertical: spacing[1],
            }}
          >
            <Copy size="caption" color={colors.textPrimary}>
              {automaticQueueLabel(job)}
            </Copy>
          </View>
        ) : null}
        <Copy size="h3">{job.source.displayName || type}</Copy>
        <Copy muted size="caption">
          {job.status === "succeeded"
            ? job.jobType === "activity_generation"
              ? "Draft ready"
              : "Completed"
            : job.status === "running"
              ? "Generating"
              : job.status === "failed" || job.status === "expired"
                ? "Couldn’t finish"
                : job.status === "cancellation_requested"
                  ? "Stopping"
                  : job.status === "queued"
                    ? stalled
                      ? "Hasn’t started · the generation service may be at its limit"
                      : "Queued"
                    : "Cancelled"}
        </Copy>
      </RowLink>
      {stalled && (
        <Action secondary disabled={busy} onPress={() => void cancel()}>
          Cancel
        </Action>
      )}
      {job.status === "failed" ? <Copy muted size="caption">{processingJobStoppedMessage(job.stage)}{job.retryable && !retryDenied ? ". Your material is safe." : ""}</Copy> : null}
      {job.retryable && !retryDenied && ["failed", "expired"].includes(job.status) && (
        <Action secondary disabled={busy} onPress={() => void retry()}>
          Try again
        </Action>
      )}
      {error && <Notice>{error}</Notice>}
    </Surface>
  );
}
