"use client";
import type {
  GenerationView,
  ProcessingJobListPage,
  ProcessingJobStatusView,
} from "@stay-focused/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  generationCoreState,
  generationMessages,
  queueSections,
  stalledInQueue,
} from "../app-model/presentation";
import { CountUp } from "../components/count-up";
import { useAuth } from "../components/providers";
import { ContentIcon, Heading, Notice, State } from "../components/ui";
import { generationEnabled, generationKey } from "../lib/generation";
import { useAction, useResource } from "../lib/hooks";
import { useListPreferences } from "../lib/list-preferences";
import { jobCoreState } from "./knowledge-core/coreModel";

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

export function QueueScreen() {
  const { api } = useAuth(),
    queue = useResource<ProcessingJobListPage>("/api/jobs?scope=all&limit=50", 5000),
    [extra, setExtra] = useState<ProcessingJobStatusView[]>([]),
    [historyLoaded, setHistoryLoaded] = useState(false),
    [cursor, setCursor] = useState<string | null>(null),
    action = useAction(),
    { prefs, hide } = useListPreferences();
  useEffect(() => {
    if (!historyLoaded) setCursor(queue.data?.nextCursor ?? null);
  }, [queue.data, historyLoaded]);
  const cleared = new Set(prefs.hidden.queue);
  const jobs = Array.from(
    new Map([...extra, ...(queue.data?.jobs ?? [])].map((job) => [job.id, job])).values(),
  ).filter((job) => !cleared.has(job.id));
  const sections = queueSections(jobs);
  const section = (key: string) => sections.find((s) => s.key === key);
  const active = sections.filter((s) => s.key === "generating" || s.key === "queued" || s.key === "attention");
  const completed = section("completed")?.jobs ?? [];
  return (
    <>
      <Heading
        title="Queue"
        subtitle="Reviewers, quizzes and drafts while they're made."
        back="/generate"
        action={
          <button
            className="subtle"
            onClick={() => {
              setHistoryLoaded(false);
              setExtra([]);
              queue.refresh();
            }}
          >
            Refresh
          </button>
        }
      />
      <State resource={queue} />
      {queue.data && jobs.length === 0 ? (
        <section className="surface stack queue-empty">
          <h2>Nothing in your Queue</h2>
          <p className="muted">
            Reviewers and quizzes you generate appear here while they&apos;re made, then
            stay in Library.
          </p>
          <Link className="button" href="/generate">
            Go to Generate
          </Link>
        </section>
      ) : (
        <div className="queue-layout">
          <div className="stack">
            {active.map((group) => (
              <section className="stack" key={group.key}>
                <div className="row between">
                  <h2>{group.key === "attention" ? "Needs attention" : group.title}</h2>
                  {group.key === "attention" && (
                    <button
                      className="subtle"
                      aria-label="Clear items that need attention"
                      onClick={() => group.jobs.forEach((job) => hide("queue", job.id, true))}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="list-card">
                  {group.jobs.map((job) => (
                    <QueueCard key={job.id} job={job} onRefresh={queue.refresh} />
                  ))}
                </div>
              </section>
            ))}
            {queue.data && active.length === 0 && (
              <p className="muted queue-idle">Nothing is generating right now.</p>
            )}
          </div>
          <div className="stack">
            {completed.length > 0 && (
              <section className="stack">
                <div className="row between">
                  <h2>Completed</h2>
                  <button
                    className="subtle"
                    aria-label={`Clear ${completed.length} completed Queue entries`}
                    onClick={() => completed.forEach((job) => hide("queue", job.id, true))}
                  >
                    Clear completed
                  </button>
                </div>
                <div className="list-card">
                  {completed.map((job) => (
                    <QueueCard key={job.id} job={job} onRefresh={queue.refresh} />
                  ))}
                </div>
              </section>
            )}
            {cursor && (
              <button
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const page = await api<ProcessingJobListPage>(
                      `/api/jobs?scope=all&limit=50&cursor=${encodeURIComponent(cursor)}`,
                    );
                    setExtra((old) => [...old, ...page.jobs]);
                    setHistoryLoaded(true);
                    setCursor(page.nextCursor);
                  })
                }
              >
                Load older generations
              </button>
            )}
          </div>
        </div>
      )}
      {action.message && <Notice error>{action.message}</Notice>}
    </>
  );
}

function QueueCard({ job, onRefresh }: { job: ProcessingJobStatusView; onRefresh: () => void }) {
  const { api, session } = useAuth(),
    router = useRouter(),
    action = useAction();
  const type = typeLabel(job);
  const title = job.source.displayName || type;
  const stalled = stalledInQueue({ status: job.status, since: job.updatedAt ?? job.createdAt });
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
      router.push(`/generation/${encodeURIComponent(job.id)}`);
      return;
    }
    void action.run(async () => {
      const result = await api<GenerationView>(
        `/api/experience/generations/${encodeURIComponent(job.id)}`,
      );
      if (!result.artifactId) throw new Error("The saved output is no longer available.");
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
        </span>
        <span className={`queue-state ${tone}`} aria-hidden="true" />
      </button>
      {(stalled || (job.retryable && ["failed", "expired"].includes(job.status))) && (
        <div className="row queue-card-actions">
          {stalled && (
            <button
              className="subtle"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await api(`/api/jobs/${encodeURIComponent(job.id)}/cancel`, { method: "POST" });
                  onRefresh();
                })
              }
            >
              Cancel
            </button>
          )}
          {job.retryable && ["failed", "expired"].includes(job.status) && (
            <button
              className="subtle"
              disabled={!generationEnabled || action.busy}
              onClick={() =>
                void action.run(async () => {
                  const key = generationKey(session!.user.id, `retry:${job.id}`, {});
                  const result = await api<ProcessingJobStatusView>(
                    `/api/jobs/${encodeURIComponent(job.id)}/retry`,
                    { method: "POST", key: key.key },
                  );
                  key.accepted();
                  onRefresh();
                  router.push(`/generation/${encodeURIComponent(result.id)}`);
                })
              }
            >
              Retry
            </button>
          )}
        </div>
      )}
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
  const { api, session } = useAuth(),
    router = useRouter(),
    job = useResource<ProcessingJobStatusView>(`/api/jobs/${id}`, 3000),
    preparingSource = job.data?.jobType === "document_extraction",
    view = useResource<GenerationView>(
      job.data && !preparingSource ? `/api/experience/generations/${id}` : null,
      3000,
    ),
    action = useAction();
  const data = view.data;
  const running = job.data
    ? ["queued", "running", "cancellation_requested"].includes(job.data.status)
    : true;
  const isDraft = job.data?.jobType === "activity_generation" || data?.artifactId?.startsWith("activity:") === true;
  const stalled = !!data && stalledInQueue({ status: data.state, since: data.updatedAt });
  const canRetry = !!job.data?.retryable && ["failed", "expired"].includes(job.data.status);
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
    if (!artifactId || data.state !== "completed" || opened.current === artifactId) return;
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
        <div className="generation">
          <p className="meta">{job.data.source.displayName}</p>
          <GenerationStatus message={message} />
          <KnowledgeCore
            state={
              preparingSource
                ? jobCoreState(job.data.status)
                : generationCoreState(data?.state ?? null, true)
            }
          />
          <p className="muted generation-note" role="status">
            {stalled
              ? "The generation service hasn’t picked this up. It may be busy or at its usage limit. Cancel and try again later."
              : running
                ? "You can leave this screen. We’ll keep working."
                : job.data.status === "succeeded"
                  ? preparingSource
                    ? "Return to Generate to create a study tool."
                    : "Opening it in your Library."
                  : "Your source is safe. You can choose another material and try again."}
          </p>
          {data?.progress && (
            <p className="meta">
              <CountUp value={data.progress.completed} /> of {data.progress.total}{" "}
              {data.progress.unit}
            </p>
          )}
          {data?.error && (
            <Notice error>
              {canRetry
                ? "This didn’t pass its checks. Retry uses the same settings and topics."
                : data.error.code === "quiz_generation_failed"
                  ? "The quiz could not be completed. Try another material."
                  : data.error.message}
            </Notice>
          )}
          <div className="generation-actions">
            {data?.artifactId && (
              <Link className="button primary" href={`/library/${encodeURIComponent(data.artifactId)}`}>
                {isDraft ? "Open Draft" : "Open saved output"}
              </Link>
            )}
            {job.data.status === "succeeded" && preparingSource && (
              <Link className="button primary" href={`/generate/new?extraction=${encodeURIComponent(id)}`}>
                Continue
              </Link>
            )}
            {running && job.data.status !== "cancellation_requested" && (
              <button
                className={stalled ? "primary" : "subtle danger"}
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api(`/api/jobs/${id}/cancel`, { method: "POST" });
                    job.refresh();
                    view.refresh();
                  })
                }
              >
                {preparingSource ? "Cancel preparation" : "Cancel generation"}
              </button>
            )}
            {canRetry && (
              <button
                className="primary"
                disabled={!generationEnabled || action.busy}
                onClick={() =>
                  void action.run(async () => {
                    if (!generationEnabled)
                      throw new Error("Generation is unavailable in this environment.");
                    const key = generationKey(session!.user.id, `retry:${id}`, {});
                    const result = await api<ProcessingJobStatusView>(`/api/jobs/${id}/retry`, {
                      method: "POST",
                      key: key.key,
                    });
                    key.accepted();
                    router.replace(`/generation/${result.id}`);
                  })
                }
              >
                Retry
              </button>
            )}
            <Link className="button" href="/queue">
              View Queue
            </Link>
          </div>
          {action.message && <Notice error>{action.message}</Notice>}
        </div>
      )}
    </>
  );
}
