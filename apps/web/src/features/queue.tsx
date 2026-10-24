"use client";
import { useJobRead } from "./queue-items";
import {
  isProcessingJobRetryDenied,
  processingJobStoppedMessage,
  queueFailureReason,
  queueFailureTitle,
} from "@stay-focused/shared";
import type {
  GenerationView,
  ProcessingJobStatusView,
} from "@stay-focused/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
import { GenerationOrbSpace } from "./generation-orb-space";
import {
  generationSteps,
  STEP_REVEAL_MS,
  stepRevealQueue,
  type GenerationStepState,
} from "./generation-steps";

// Web counterparts of QueueScreen and GenerationScreen in
// apps/mobile/src/features/redesign/GenerationScreen.tsx.

// three.js loads only with the Generation screen, not the Queue list.
const GenerationOrb = dynamic(
  () => import("./day-clock/GenerationOrb").then((m) => m.GenerationOrb),
  { ssr: false, loading: () => <div className="generation-orb" /> },
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
  failureCount = 1,
}: {
  job: ProcessingJobStatusView;
  onRefresh: () => void;
  onOpen: () => void;
  failureCount?: number;
}) {
  const { api, session } = useAuth(),
    router = useRouter(),
    action = useAction();
  const type = typeLabel(job);
  const [retryDenied, setRetryDenied] = useState(false);
  const canRetry =
    job.retryable && ["failed", "expired"].includes(job.status) && !retryDenied;
  const title = job.source.displayName || type;
  const failed = job.status === 'failed' || job.status === 'expired';
  const displayTitle = queueFailureTitle(title);
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
    <div className={`queue-card${failed ? ' queue-failure-card' : ''}`}>
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
        <span className="grow queue-card-copy">
          <span className="meta">{type}</span>
          {failed ? <strong className="queue-failure-title" title={title} aria-label={title}>
            <span>{displayTitle.start}</span>{displayTitle.end ? <span>{displayTitle.end}</span> : null}
          </strong> : <strong>{title}</strong>}
          <span className={`meta queue-status ${tone}`}>{failed ? `Couldn't finish · ${queueFailureReason(job.jobType, job.stage)}` : status}</span>
          {failed && failureCount > 1 ? <span className="meta">Failed {failureCount} times</span> : null}
          {job.status === "running" || job.status === "queued" ? (
            <span className="meta">{queueProgress(job)}</span>
          ) : null}
          {job.status === "succeeded" ? (
            <span className="meta">Open</span>
          ) : null}
        </span>
        {!failed ? <span className={`queue-state ${tone}`} aria-hidden="true" /> : null}
      </button>
      {(stalled || canRetry) && (
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
              className={`button retry-button${failed ? ' queue-retry-pill' : ' subtle'}`}
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
      {failed ? <button className="queue-failure-circle" disabled={action.busy} onClick={open} aria-label={`View generation: ${title}`}>
        <span className={`queue-state ${tone}`} aria-hidden="true" />
      </button> : null}
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

/**
 * Server-reported step states, ticked off one at a time when a poll reveals
 * several finished stages at once. Instant under Reduce Motion.
 */
function useRevealedStates(next: readonly GenerationStepState[]) {
  const key = next.join(",");
  const [shown, setShown] = useState<readonly GenerationStepState[]>(next);
  const latest = useRef(shown);
  useEffect(() => {
    const target = key ? (key.split(",") as GenerationStepState[]) : [];
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const frames = reduced ? [target] : stepRevealQueue(latest.current, target);
    let index = 0;
    const show = () => {
      latest.current = frames[index]!;
      setShown(frames[index]!);
    };
    show();
    if (frames.length === 1) return;
    const timer = setInterval(() => {
      index += 1;
      show();
      if (index === frames.length - 1) clearInterval(timer);
    }, STEP_REVEAL_MS);
    return () => clearInterval(timer);
  }, [key]);
  return shown.length === next.length ? shown : next;
}

const stepStateWord = {
  done: "done",
  current: "in progress",
  failed: "stopped here",
  pending: "pending",
} satisfies Record<GenerationStepState, string>;

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
  const steps = job.data
    ? generationSteps(job.data.stage, job.data.status, job.data.jobType)
    : [];
  const shownStates = useRevealedStates(steps.map((step) => step.state));
  const progress = data?.progress ?? null;
  // Completed and saved: open it, as the app does, after a moment to read the
  // state. Keyed by the saved id, so re-renders (polls, step reveal) never
  // restart or cancel the wait.
  const savedId = data?.state === "completed" ? data.artifactId : null;
  const routerRef = useRef(router);
  routerRef.current = router;
  useEffect(() => {
    if (!savedId) return;
    const timer = setTimeout(
      () =>
        routerRef.current.replace(`/library/${encodeURIComponent(savedId)}`),
      1400,
    );
    return () => clearTimeout(timer);
  }, [savedId]);
  return (
    <section className="generation-page">
      <Heading title="" crumb="Generation" back="/generate" />
      <div className="generation-resource">
        {job.data ? <State resource={job} /> : null}
      </div>
      {!job.data && (
        <div className="generation generation-layout">
          <div className="generation-orb-pane">
            <GenerationOrbSpace>
              <GenerationOrb state="reading" />
            </GenerationOrbSpace>
            <GenerationStatus message={message} />
          </div>
          <GenerationDetails attention={!!view.error}>
            <div className="generation-detail-pane">
              <State resource={job} />
              <Link className="button" href="/queue">
                Open Queue
              </Link>
            </div>
          </GenerationDetails>
        </div>
      )}
      {job.data && (
        <div className="generation generation-layout">
          <div className="generation-orb-pane">
            <GenerationOrbSpace>
              <GenerationOrb
                state={
                  preparingSource
                    ? jobCoreState(job.data.status)
                    : generationCoreState(data?.state ?? null, true)
                }
              />
            </GenerationOrbSpace>
            <GenerationStatus message={message} />
            {progress && running && !stalled ? (
              <p className="generation-compact-progress meta" role="status">
                {progress.completed} of {progress.total} {progress.unit}
              </p>
            ) : null}
          </div>
          <GenerationDetails
            attention={
              !!(data?.error || action.message || view.error || stalled)
            }
          >
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
                {steps.map((step, index) => {
                  const state = shownStates[index] ?? step.state;
                  // Real section (or page) counts belong to the stage doing that work.
                  const counted =
                    state === "current" &&
                    !!progress &&
                    (progress.unit === "pages" ||
                      step.stage === "generating_sections");
                  return (
                    <li
                      key={step.stage}
                      data-state={state}
                      aria-current={
                        state === "current" || state === "failed"
                          ? "step"
                          : undefined
                      }
                    >
                      <span
                        className={`generation-step-segment${state === "current" ? " animated" : ""}`}
                        style={
                          counted
                            ? ({
                                "--fill": progress.completed / progress.total,
                              } as CSSProperties)
                            : undefined
                        }
                        aria-hidden="true"
                      />
                      <span>
                        {step.label}
                        <span className="sr-only">
                          , {stepStateWord[state]}
                        </span>
                      </span>
                      {state === "failed" && (
                        <span className="meta" aria-hidden="true">
                          Stopped here
                        </span>
                      )}
                      {counted && (
                        <span className="meta generation-step-count">
                          <CountUp value={progress.completed} /> of{" "}
                          {progress.total} {progress.unit}
                        </span>
                      )}
                    </li>
                  );
                })}
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
              {data?.error && (
                <Notice error>
                  {canRetry ? `${data.error.message} ` : ""}
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
                    <Link
                      className={stalled ? "button" : "button primary"}
                      href="/queue"
                    >
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
                    {preparingSource
                      ? "Cancel preparation"
                      : "Cancel generation"}
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
              {view.error && <Notice error>{view.error}</Notice>}
            </div>
          </GenerationDetails>
        </div>
      )}
    </section>
  );
}

/** One detail surface: normal desktop pane, native modal on small screens. */
function GenerationDetails({
  children,
  attention,
}: {
  children: ReactNode;
  attention: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const modal = dialog.current;
    modal?.showModal();
    const resize = () => {
      if (window.innerWidth > 760) {
        modal?.close();
        setOpen(false);
      }
    };
    if (modal) window.addEventListener("resize", resize);
    return () => {
      if (modal?.open) modal.close();
      if (modal) window.removeEventListener("resize", resize);
    };
  }, [open]);
  const close = () => {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <>
      <Link className="button generation-queue-shortcut" href="/queue">
        Open Queue
      </Link>
      <button
        ref={trigger}
        className="generation-details-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(true)}
      >
        {attention ? "Details, error and actions" : "Details and actions"}
      </button>
      <dialog
        ref={dialog}
        id={id}
        className="generation-details-dialog"
        aria-label="Generation details"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="generation-dialog-header">
          <strong>Generation details</strong>
          <button type="button" onClick={close}>
            Done
          </button>
        </div>
        <div className="generation-dialog-content">{children}</div>
      </dialog>
    </>
  );
}
