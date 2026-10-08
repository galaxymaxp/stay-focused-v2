"use client";
import type {
  GenerationView,
  ProcessingJobListPage,
  ProcessingJobStatusView,
} from "@stay-focused/shared";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "../components/providers";
import { Empty, Heading, Notice, RowLink, State } from "../components/ui";
import { generationEnabled, generationKey } from "../lib/generation";
import { useAction, useResource } from "../lib/hooks";
const labels: Record<ProcessingJobStatusView["status"], string> = {
  queued: "Queued",
  running: "Generating",
  succeeded: "Completed",
  failed: "Couldn’t finish",
  expired: "Expired",
  cancelled: "Cancelled",
  cancellation_requested: "Cancelling",
};
export function QueueScreen() {
  const { api } = useAuth(),
    queue = useResource<ProcessingJobListPage>(
      "/api/jobs?scope=all&limit=30",
      5000,
    ),
    [extra, setExtra] = useState<ProcessingJobStatusView[]>([]),
    [historyLoaded, setHistoryLoaded] = useState(false),
    [cursor, setCursor] = useState<string | null>(null),
    action = useAction();
  useEffect(() => {
    if (!historyLoaded) setCursor(queue.data?.nextCursor ?? null);
  }, [queue.data, historyLoaded]);
  const jobs = Array.from(
    new Map(
      [...extra, ...(queue.data?.jobs ?? [])].map((job) => [job.id, job]),
    ).values(),
  );
  return (
    <>
      <Heading
        title="Queue"
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
      <div className="stack">
        <State resource={queue} />
        {(["Generating", "Needs attention", "Completed"] as const).map(
          (group) => {
            const rows = jobs.filter((j) =>
              group === "Generating"
                ? ["queued", "running", "cancellation_requested"].includes(
                    j.status,
                  )
                : group === "Completed"
                  ? j.status === "succeeded"
                  : ["failed", "expired", "cancelled"].includes(j.status),
            );
            return rows.length ? (
              <section className="stack" key={group}>
                <h2>{group}</h2>
                <div className="cards">
                  {rows.map((job) => (
                    <RowLink
                      key={job.id}
                      href={`/generation/${job.id}`}
                      title={job.source.displayName}
                      tag={
                        job.jobType === "document_extraction"
                          ? "Source preparation"
                          : job.jobType === "quiz_generation"
                            ? "Quiz"
                            : job.jobType === "activity_generation"
                              ? "Activity Output"
                              : "Reviewer"
                      }
                      detail={labels[job.status]}
                    />
                  ))}
                </div>
              </section>
            ) : null;
          },
        )}
        {queue.data && !jobs.length && (
          <Empty title="No generations yet.">
            Your in-progress and completed generations will appear here.
          </Empty>
        )}
        {cursor && (
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const page = await api<ProcessingJobListPage>(
                  `/api/jobs?scope=all&limit=30&cursor=${encodeURIComponent(cursor)}`,
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
        {action.message && <Notice error>{action.message}</Notice>}
      </div>
    </>
  );
}
export function GenerationScreen({ id }: { id: string }) {
  const { api, session } = useAuth(),
    job = useResource<ProcessingJobStatusView>(`/api/jobs/${id}`, 4000),
    view = useResource<GenerationView>(
      job.data?.status === "succeeded" &&
        job.data.jobType !== "document_extraction"
        ? `/api/experience/generations/${id}`
        : null,
    ),
    action = useAction();
  const active =
    job.data &&
    ["queued", "running", "cancellation_requested"].includes(job.data.status);
  const preparingSource = job.data?.jobType === "document_extraction";
  return (
    <>
      <Heading title="" back="/generate" />
      <State resource={job} />
      {job.data && (
        <div className="generation">
          <p className="meta">{job.data.source.displayName}</p>
          <h1>
            {job.data.status === "succeeded"
              ? preparingSource
                ? "Your source is ready."
                : "Your study material is ready."
              : active
                ? preparingSource
                  ? "Preparing your source…"
                  : job.data.jobType === "quiz_generation"
                    ? "Generating your quiz…"
                    : "Bringing the important ideas together…"
                : labels[job.data.status]}
          </h1>
          {active && (
            <Image
              unoptimized
              className="orb"
              src="/generation-orb.svg"
              alt=""
              width={200}
              height={200}
            />
          )}
          <p className="muted" role="status">
            {active
              ? "You can leave this screen. We’ll keep working."
              : job.data.status === "succeeded"
                ? preparingSource
                  ? "Return to Generate to create a study tool."
                  : "Open your saved output in Library."
                : "Your source is safe. You can choose another material and try again."}
          </p>
          {job.data.progress.completedUnits !== null &&
            job.data.progress.totalUnits !== null && (
              <p className="meta">
                {job.data.progress.completedUnits} of{" "}
                {job.data.progress.totalUnits} {job.data.progress.unitLabel}
              </p>
            )}
          {view.data?.artifactId && (
            <Link
              className="button primary"
              href={`/library/${encodeURIComponent(view.data.artifactId)}`}
            >
              Open saved output
            </Link>
          )}
          {job.data.status === "succeeded" && preparingSource && (
            <Link className="button primary" href="/generate">
              Continue to Generate
            </Link>
          )}
          {job.data.status === "succeeded" &&
            !preparingSource &&
            !view.data?.artifactId && (
              <Link className="button" href="/library">
                Open Library
              </Link>
            )}
          <Link className="button" href="/queue">
            View Queue
          </Link>
          {active && job.data.status !== "cancellation_requested" && (
            <button
              className="subtle danger"
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
          {job.data.retryable &&
            ["failed", "expired"].includes(job.data.status) && (
              <button
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
                      { method: "POST", key: key.key },
                    );
                    key.accepted();
                    location.assign(`/generation/${result.id}`);
                  })
                }
              >
                {preparingSource ? "Retry preparation" : "Retry generation"}
              </button>
            )}
          {action.message && <Notice error>{action.message}</Notice>}
        </div>
      )}
    </>
  );
}
