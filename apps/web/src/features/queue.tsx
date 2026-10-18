"use client";
import { useJobRead } from './queue-items';
import { isProcessingJobRetryDenied, processingJobStoppedMessage } from '@stay-focused/shared';
import type {
  GenerationView,
  ProcessingJobStatusView,
} from "@stay-focused/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  generationCoreState,
  generationMessages,
  stalledInQueue,
} from "../app-model/presentation";
import { CountUp } from "../components/count-up";
import { useAuth } from "../components/providers";
import { ContentIcon, Heading, Notice, State } from "../components/ui";
import { generationEnabled, generationKey } from "../lib/generation";
import { useAction } from "../lib/hooks";
import { queueProgress } from "./queue-presentation";
import { jobCoreState } from "./knowledge-core/coreModel";
import { generationSteps } from "./generation-steps";

// Web counterparts of QueueScreen and GenerationScreen in
// apps/mobile/src/features/redesign/GenerationScreen.tsx.

// three.js loads only with the Generation screen, not the Queue list.
const KnowledgeCore = dynamic(
  () => import("./knowledge-core/KnowledgeCore").then((m) => m.KnowledgeCore),
  { ssr: false, loading: () => <div className="knowledge-core" /> },
);

const typeLabel = (job: ProcessingJobStatusView) =>
  job.jobType === "quiz_generation"
    ? "Quiz"
    : job.jobType === "activity_generation"
      ? "Draft"
      : job.jobType === "document_extraction"
        ? "Material preparation"
        : "Reviewer";

export function QueueCard({
  job,
  onRefresh,
  onOpen,
}: {
  job: ProcessingJobStatusView;
  onRefresh: () => void;
  onOpen: () => void;
}) {
  const { api, session } = useAuth(),
    router = useRouter(),
    action = useAction();
  const type = typeLabel(job);
  const [retryDenied, setRetryDenied] = useState(false);
  const canRetry = job.retryable && ["failed", "expired"].includes(job.status) && !retryDenied;
  const title = job.source.displayName || type;
  const stalled = stalledInQueue({
    status: job.status,
    since: job.updatedAt ?? job.createdAt,
  });
  const status =
    job.status === "succeeded"
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
              : "Cancelled";
  const tone =
    job.status === "succeeded"
      ? "ok"
      : job.status === "running"
        ? "run"
        : job.status === "queued"
          ? "wait"
          : "warn";
  function open() {
    if (job.status !== "succeeded" || job.jobType === "document_extraction") {
      onOpen();
      router.push(`/generation/${encodeURIComponent(job.id)}`);
      return;
    }
    void action.run(async () => {
      const result = await api<GenerationView>(
        `/api/experience/generations/${encodeURIComponent(job.id)}`,
      );
      if (!result.artifactId)
        throw new Error("The saved output is no longer available.");
      onOpen();
      router.push(`/library/${encodeURIComponent(result.artifactId)}`);
    });
  }
  return (
    <div className="queue-card">
      <button
        className="queue-open"
        disabled={action.busy}
        aria-label={
          job.status === "succeeded"
            ? `${job.jobType === "activity_generation" ? "Open Draft" : "Open saved output"}: ${title}`
            : `View generation: ${title}`
        }
        onClick={open}
      >
        <ContentIcon
          kind={
            job.jobType === "quiz_generation"
              ? "quiz"
              : job.jobType === "activity_generation"
                ? "activity_output"
                : job.jobType === "document_extraction"
                  ? "pdf"
                  : "reviewer"
          }
        />
        <span className="grow">
          <span className="meta">{type}</span>
          <strong>{title}</strong>
          <span className={`meta queue-status ${tone}`}>{status}</span>
          {job.status === "running" || job.status === "queued" ? (
            <span className="meta">{queueProgress(job)}</span>
          ) : null}
          {job.status === "succeeded" ? (
            <span className="meta">Open</span>
          ) : null}
        </span>
        <span className={`queue-state ${tone}`} aria-hidden="true" />
      </button>
      {(stalled ||
        canRetry) && (
        <div className="row queue-card-actions">
          {stalled && (
            <button
              className="subtle"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await api(`/api/jobs/${encodeURIComponent(job.id)}/cancel`, {
                    method: "POST",
                  });
                  onRefresh();
                })
              }
            >
              Cancel
            </button>
          )}
          {canRetry && (
            <button
              className="button subtle retry-button"
              disabled={!generationEnabled || action.busy}
              onClick={() =>
                void action.run(async () => {
                  const key = generationKey(
                    session!.user.id,
                    `retry:${job.id}`,
                    {},
                  );
                  const result = await api<ProcessingJobStatusView>(
                    `/api/jobs/${encodeURIComponent(job.id)}/retry`,
                    { method: "POST", key: key.key },
                  ).catch((cause: unknown) => {
                    if (isProcessingJobRetryDenied(cause)) setRetryDenied(true);
                    throw cause;
                  });
                  key.accepted();
                  onRefresh();
                  onOpen();
                  router.push(`/generation/${encodeURIComponent(result.id)}`);
                })
              }
            >
              Try again
            </button>
          )}
        </div>
      )}
      {job.status === "failed" ? <p className="meta">{processingJobStoppedMessage(job.stage)}{canRetry ? ". Your material is safe." : ""}</p> : null}
      {action.message && <Notice error>{action.message}</Notice>}
    </div>
  );
}

/** The status line swaps with a short lift, like the app's GenerationStatus. */
function GenerationStatus({ message }: { message: string }) {
  return (
    <h1 className="generation-status" key={message} aria-live="polite">
      {message}
    </h1>
  );
}

export function GenerationScreen({ id }: { id: string }) {
  const [retryDeniedId, setRetryDeniedId] = useState<string | null>(null);
  const { api, session } = useAuth(),
    router = useRouter(),
    shared = useJobRead(id),
    job = { ...shared, data: shared.job },
    preparingSource = job.data?.jobType === "document_extraction",
    view = shared,
    action = useAction();
  const data = view.data;
  const running = job.data
    ? ["queued", "running", "cancellation_requested"].includes(job.data.status)
    : true;
  const isDraft =
    job.data?.jobType === "activity_generation" ||
    data?.artifactId?.startsWith("activity:") === true;
  const stalled =
    !!data && stalledInQueue({ status: data.state, since: data.updatedAt });
  const canRetry =
    !!job.data?.retryable &&
    ["failed", "expired"].includes(job.data.status) &&
    retryDeniedId !== id;
  const message = !job.data
    ? "Connecting to your generation…"
    : stalled
      ? "Still waiting to start"
      : preparingSource
        ? job.data.status === "succeeded"
          ? "Your source is ready."
          : running
            ? "Preparing your source…"
            : "This preparation couldn’t finish."
        : data
          ? isDraft && data.state === "completed"
            ? "Draft ready"
            : data.state === "completed"
              ? "Your study material is ready."
              : generationMessages[data.state]
          : running
            ? generationMessages.queued
            : "This generation couldn’t finish.";
  // Completed and saved: open it, as the app does, after a moment to read the state.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    const artifactId = data?.artifactId;
    if (
      !artifactId ||
      data.state !== "completed" ||
      opened.current === artifactId
    )
      return;
    opened.current = artifactId;
    const timer = setTimeout(
      () => router.replace(`/library/${encodeURIComponent(artifactId)}`),
      1400,
    );
    return () => clearTimeout(timer);
  }, [data, router]);
  return (
    <>
      <Heading title="" crumb="Generation" back="/generate" />
      <State resource={job} />
      {job.data && (
        <div className="generation generation-layout">
          <div className="generation-orb-pane">
            <KnowledgeCore
              state={
                preparingSource
                  ? jobCoreState(job.data.status)
                  : generationCoreState(data?.state ?? null, true)
              }
            />
            <GenerationStatus message={message} />
          </div>
          <div className="generation-detail-pane">
            <section className="generation-material" aria-label="Material">
              <p className="meta">{typeLabel(job.data)}</p>
              <h2>{job.data.source.displayName}</h2>
              {job.data.source.pageCount != null && (
                <p className="muted">
                  {job.data.source.pageCount}{" "}
                  {job.data.source.pageCount === 1 ? "page" : "pages"}
                </p>
              )}
            </section>
            <ol className="generation-steps" aria-label="Generation steps">
              {generationSteps(
                job.data.stage,
                job.data.status,
                job.data.jobType,
              ).map((step) => (
                <li
                  key={step.stage}
                  data-state={step.state}
                  aria-current={
                    step.state === "current" || step.state === "failed"
                      ? "step"
                      : undefined
                  }
                >
                  <span>{step.label}</span>
                  <span className="meta">
                    {step.state === "done"
                      ? "Done"
                      : step.state === "current"
                        ? "In progress"
                        : step.state === "failed"
                          ? "Stopped here"
                          : "Pending"}
                  </span>
                </li>
              ))}
            </ol>
            <p className="muted generation-note" role="status">
              {stalled
                ? "The generation service hasn’t picked this up. It may be busy or at its usage limit. Cancel and try again later."
                : running
                  ? "You can leave this screen. We’ll keep working."
                  : job.data.status === "succeeded"
                    ? preparingSource
                      ? "Return to Generate to create a study tool."
                      : "Opening it in your Library."
                    : canRetry
                      ? `${processingJobStoppedMessage(job.data.stage)}. Your material is safe.`
                      : processingJobStoppedMessage(job.data.stage)}
            </p>
            {data?.progress && (
              <p className="meta">
                <CountUp value={data.progress.completed} /> of{" "}
                {data.progress.total} {data.progress.unit}
              </p>
            )}
            {data?.error && (
              <Notice error>
                {canRetry
                  ? "Try again with the same material and settings."
                  : data.error.code === "quiz_generation_failed"
                    ? "The quiz could not be completed. Try another material."
                    : data.error.message}
              </Notice>
            )}
            <div className="generation-actions">
              {data?.artifactId && (
                <Link
                  className="button primary"
                  href={`/library/${encodeURIComponent(data.artifactId)}`}
                >
                  {isDraft
                    ? "Open Draft"
                    : job.data.jobType === "quiz_generation"
                      ? "Open quiz"
                      : "Open reviewer"}
                </Link>
              )}
              {job.data.status === "succeeded" && preparingSource && (
                <Link
                  className="button primary"
                  href={`/generate/new?extraction=${encodeURIComponent(id)}`}
                >
                  Continue
                </Link>
              )}
              {running && (
                <>
                  <Link className="button primary" href="/queue">
                    Open Queue
                  </Link>
                  <Link className="button subtle" href="/queue">
                    Leave, it keeps going
                  </Link>
                </>
              )}
              {running && job.data.status !== "cancellation_requested" && (
                <button
                  className={stalled ? "primary" : "subtle danger"}
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await api(`/api/jobs/${id}/cancel`, { method: "POST" });
                      job.refresh();
                    })
                  }
                >
                  {preparingSource ? "Cancel preparation" : "Cancel generation"}
                </button>
              )}
              {canRetry && (
                <button
                  className="button primary retry-button"
                  disabled={!generationEnabled || action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      if (!generationEnabled)
                        throw new Error(
                          "Generation is unavailable in this environment.",
                        );
                      const key = generationKey(
                        session!.user.id,
                        `retry:${id}`,
                        {},
                      );
                      const result = await api<ProcessingJobStatusView>(
                        `/api/jobs/${id}/retry`,
                        {
                          method: "POST",
                          key: key.key,
                        },
                      ).catch((cause: unknown) => {
                        if (isProcessingJobRetryDenied(cause))
                          setRetryDeniedId(id);
                        throw cause;
                      });
                      key.accepted();
                      router.replace(`/generation/${result.id}`);
                    })
                  }
                >
                  Try again
                </button>
              )}
              {!running && (
                <Link className="button" href="/queue">
                  Open Queue
                </Link>
              )}
            </div>
            {action.message && <Notice error>{action.message}</Notice>}
          </div>
        </div>
      )}
    </>
  );
}
