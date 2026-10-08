"use client";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatSecondsLate,
  formatSyncGuidance,
  formatSyncStatusLabel,
  formatVisibleGrade,
  formatVisibleScore,
  getAssignmentStatusPresentation,
  mergeGradeAssignmentPages,
} from "../app-model/canvasGradePresentation";
import type {
  CanvasCourseGradeSummary,
  CanvasGradeAssignmentDetail,
  CanvasGradeAssignmentListItem,
  CanvasGradeAssignmentListPayload,
  CanvasSyncJobStatusView,
} from "../app-model/canvasGradeTypes";
import { SpringProgress } from "../components/count-up";
import { PageCrumb } from "../components/crumbs";
import { useAuth } from "../components/providers";
import { Heading, Icon, Notice, State } from "../components/ui";
import { generationKey } from "../lib/generation";
import { useAction, useResource } from "../lib/hooks";

// Web port of apps/mobile/src/features/courses/CanvasGradeScreen.tsx. Grades are
// read from Stay Focused's synchronized copy; Canvas is only contacted when the
// student starts a grade sync. On desktop the assignment opens beside the list.

interface CourseInventory {
  courses: { id: string; displayName: string; courseCode: string | null }[];
}
interface GradesContext {
  courseId: string;
  label: string;
}
const Context = createContext<GradesContext | null>(null);
const ACTIVE_JOB = ["queued", "running", "cancellation_requested"];
const PAGE_SIZE = 50;

function gradesPath(courseId: string) {
  return `/canvas/${encodeURIComponent(courseId)}/grades`;
}
function apiPath(courseId: string, rest = "") {
  return `/api/canvas/courses/${encodeURIComponent(courseId)}/grades${rest}`;
}

export function GradesWorkspace({ courseId, children }: { courseId: string; children: ReactNode }) {
  const { api, session } = useAuth();
  const inventory = useResource<CourseInventory>("/api/canvas/courses", 0, "root");
  const summary = useResource<{ summary: CanvasCourseGradeSummary }>(apiPath(courseId, "/summary"), 0, "root");
  const list = useResource<CanvasGradeAssignmentListPayload>(
    apiPath(courseId, `?limit=${PAGE_SIZE}&offset=0`),
    0,
    "root",
  );
  const action = useAction(),
    more = useAction();
  const [extra, setExtra] = useState<{ items: readonly CanvasGradeAssignmentListItem[]; next: number | null } | null>(
    null,
  );
  const jobStore = `stay-focused-web-grade-sync:${session?.user.id}:${courseId}`;
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useResource<CanvasSyncJobStatusView>(jobId ? `/api/canvas/sync-jobs/${jobId}` : null, 5000);
  const selected = useSelectedLayoutSegment();
  const selectedId = selected ? decodeURIComponent(selected) : null;

  useEffect(() => {
    try {
      setJobId(sessionStorage.getItem(jobStore));
    } catch {
      /* The sync continues on the server either way. */
    }
  }, [jobStore]);
  // A finished sync refreshes the synchronized copy.
  const status = job.data?.status;
  const refreshList = list.refresh,
    refreshSummary = summary.refresh;
  useEffect(() => {
    if (!status || ACTIVE_JOB.includes(status)) return;
    setExtra(null);
    refreshList();
    refreshSummary();
  }, [status, refreshList, refreshSummary]);

  const course = inventory.data?.courses.find((c) => c.id === courseId);
  const label = course ? (course.courseCode ?? course.displayName) : "Course";
  const sync = list.data?.sync ?? summary.data?.summary.sync ?? null;
  const items = list.data ? mergeGradeAssignmentPages(list.data.items, extra?.items ?? []) : [];
  const nextOffset = extra ? extra.next : (list.data?.page.nextOffset ?? null);
  const active = !!status && ACTIVE_JOB.includes(status);

  function startSync() {
    if (!session) return;
    void action.run(async () => {
      const submission = generationKey(session.user.id, `grade-sync:${courseId}`, {});
      const accepted = await api<CanvasSyncJobStatusView>(apiPath(courseId, "/sync"), {
        method: "POST",
        key: submission.key,
      });
      submission.accepted();
      setJobId(accepted.id);
      try {
        sessionStorage.setItem(jobStore, accepted.id);
      } catch {
        /* The sync continues on the server either way. */
      }
    });
  }
  function jobAction(kind: "cancel" | "retry") {
    if (!jobId || !session) return;
    void action.run(async () => {
      const submission = generationKey(session.user.id, `grade-sync-retry:${jobId}`, {});
      const next = await api<CanvasSyncJobStatusView>(`/api/canvas/sync-jobs/${jobId}/${kind}`, {
        method: "POST",
        ...(kind === "retry" ? { key: submission.key } : {}),
      });
      if (kind === "retry") submission.accepted();
      if (next.id !== jobId) {
        setJobId(next.id);
        try {
          sessionStorage.setItem(jobStore, next.id);
        } catch {
          /* The sync continues on the server either way. */
        }
      } else job.refresh();
    });
  }
  function loadMore() {
    if (nextOffset === null) return;
    void more.run(async () => {
      const page = await api<CanvasGradeAssignmentListPayload>(
        apiPath(courseId, `?limit=${PAGE_SIZE}&offset=${nextOffset}`),
        { envelope: "root" },
      );
      setExtra((old) => ({
        items: mergeGradeAssignmentPages(old?.items ?? [], page.items),
        next: page.page.nextOffset,
      }));
    });
  }

  const current = summary.data?.summary;
  const currentScore =
    current?.currentScore.state === "visible" && current.currentScore.value !== null
      ? current.currentScore.value
      : null;
  return (
    <Context.Provider value={{ courseId, label }}>
      <div className={`course-workspace grades-workspace${selectedId ? " has-selection" : ""}`}>
        <div className="course-heading">
          <Heading
            title={course?.displayName ?? "Grades"}
            subtitle={course ? `Grades · ${formatSyncStatusLabel(sync)}` : undefined}
            crumb={selectedId ? null : `${label} grades`}
            back="/canvas"
            action={
              <div className="row wrap">
                <button
                  className="subtle"
                  aria-label="Reload grades"
                  disabled={list.loading}
                  onClick={() => {
                    setExtra(null);
                    list.refresh();
                    summary.refresh();
                  }}
                >
                  <Icon name="refresh-cw" />
                  <span className="desktop-only">Reload</span>
                </button>
                <button className="primary" disabled={action.busy || active} onClick={startSync}>
                  {active ? "Syncing grades…" : "Sync grades"}
                </button>
              </div>
            }
          />
        </div>
        {action.message && <Notice error>{action.message}</Notice>}
        {job.data && (
          <div className="surface grade-job" role="status">
            <div className="grow">
              <strong>
                {job.data.status === "succeeded"
                  ? job.data.outcome === "partial"
                    ? "Grade sync completed with warnings"
                    : "Grade sync complete"
                  : active
                    ? "Grade sync running"
                    : job.data.status === "cancelled"
                      ? "Grade sync cancelled"
                      : "Grade sync needs attention"}
              </strong>
              <span className="meta">
                {job.data.progress.message} · Updated {formatDateTime(job.data.updatedAt)}
              </span>
            </div>
            {active &&
              job.data.status !== "cancellation_requested" &&
              !["promoting_scopes", "storing_result"].includes(job.data.stage) && (
                <button className="subtle" disabled={action.busy} onClick={() => jobAction("cancel")}>
                  Cancel
                </button>
              )}
            {job.data.status === "failed" && job.data.retryable && (
              <button disabled={action.busy} onClick={() => jobAction("retry")}>
                Retry
              </button>
            )}
          </div>
        )}
        {current && (
          <section className="grade-summary" aria-label="Course grade">
            <div className="grade-stat lead">
              <span className="meta">Current grade</span>
              <strong>{formatVisibleGrade(current.currentGrade)}</strong>
              <span className="meta">{formatVisibleScore(current.currentScore)}</span>
              {currentScore !== null && (
                <SpringProgress value={Math.min(currentScore, 100)} max={100} label="Current score" />
              )}
            </div>
            <div className="grade-stat">
              <span className="meta">Final grade</span>
              <strong>{formatVisibleGrade(current.finalGrade)}</strong>
              <span className="meta">{formatVisibleScore(current.finalScore)}</span>
            </div>
            <div className="grade-stat">
              <span className="meta">Last successful sync</span>
              <strong className="small">{formatDateTime(sync?.lastSuccessfulSyncAt ?? null)}</strong>
              <span className="meta">{formatSyncGuidance(sync)}</span>
            </div>
          </section>
        )}
        <State resource={list} />
        {list.data && (
          <div className="course-split">
            <section className="pane-list" aria-label="Assignments">
              <div className="pane-scroll">
                <h2 className="pane-group-title">
                  <span>Assignments</span>
                  <span className="count-up">{items.length}</span>
                </h2>
                {items.map((item) => {
                  const state = getAssignmentStatusPresentation(item.normalizedStatus);
                  return (
                    <Link
                      key={item.id}
                      className="material-link grade-link"
                      href={`${gradesPath(courseId)}/${encodeURIComponent(item.id)}`}
                      aria-current={item.id === selectedId ? "page" : undefined}
                    >
                      <span className="grow">
                        <strong>{item.title}</strong>
                        <span className="meta">
                          Due {formatDate(item.dueAt)} · {formatVisibleScore(item.score, item.pointsPossible)}
                        </span>
                      </span>
                      <span className={`grade-pill ${state.tone}`}>{state.label}</span>
                    </Link>
                  );
                })}
                {items.length === 0 && (
                  <div className="pane-note">
                    <strong>{sync?.status === "never_synced" ? "No grade sync yet" : "No assignments found"}</strong>
                    <p className="muted">
                      {sync?.status === "never_synced"
                        ? "Sync grades to read this course's assignments from Canvas."
                        : "No synchronized Canvas assignments were found for this course."}
                    </p>
                  </div>
                )}
                {nextOffset !== null && (
                  <div className="pane-note">
                    <button disabled={more.busy} onClick={loadMore}>
                      {more.busy ? "Loading…" : "Load more assignments"}
                    </button>
                  </div>
                )}
                {more.message && (
                  <div className="pane-note">
                    <Notice error>{more.message} The loaded assignments remain visible.</Notice>
                  </div>
                )}
              </div>
            </section>
            <section className="pane-detail" aria-label="Selected assignment">
              {children}
            </section>
          </div>
        )}
      </div>
    </Context.Provider>
  );
}

export function GradesOverview() {
  return (
    <div className="pane-placeholder">
      <Icon name="square-check-big" />
      <h2>Choose an assignment</h2>
      <p className="muted">See its score, submission and late details from your last grade sync.</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grade-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function GradeAssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const grades = useContext(Context);
  const courseId = grades?.courseId ?? "";
  const detail = useResource<{ assignment: CanvasGradeAssignmentDetail }>(
    courseId ? apiPath(courseId, `/${encodeURIComponent(assignmentId)}`) : null,
    0,
    "root",
  );
  const a = detail.data?.assignment;
  const state = a ? getAssignmentStatusPresentation(a.normalizedStatus) : null;
  const late = a ? formatSecondsLate(a.secondsLate) : null;
  const yesNo = (value: boolean | null) => (value === null ? null : value ? "Yes" : "No");
  const optional: [string, string | null][] = a
    ? [
        ["Grading type", a.gradingType],
        ["Submission type", a.submissionType],
        ["Allowed submission types", a.submissionTypes.length ? a.submissionTypes.join(", ") : null],
        ["Submitted", a.submittedAt ? formatDateTime(a.submittedAt) : null],
        ["Graded", a.gradedAt ? formatDateTime(a.gradedAt) : null],
        ["Posted", a.postedAt ? formatDateTime(a.postedAt) : null],
        ["Attempt", a.attempt === null ? null : String(a.attempt)],
        ["Allowed attempts", a.allowedAttempts === null ? null : a.allowedAttempts < 0 ? "Unlimited" : String(a.allowedAttempts)],
        ["Late by", late],
        ["Late policy state", a.latePolicyStatus],
        ["Grade matches current submission", yesNo(a.gradeMatchesCurrentSubmission)],
        ["Points possible at sync", a.pointsPossibleAtSync === null ? null : formatNumber(a.pointsPossibleAtSync)],
      ]
    : [];
  return (
    <article className="grade-article" key={assignmentId}>
      <PageCrumb
        parent={grades ? { label: `${grades.label} grades`, href: gradesPath(grades.courseId) } : undefined}
        current={a?.title ?? "Assignment"}
      />
      <State resource={detail} />
      {a && state && (
        <>
          <header className="stack">
            <span className="meta">Assignment grade</span>
            <h2>{a.title}</h2>
            <div className="row wrap">
              <span className={`grade-pill ${state.tone}`}>{state.label}</span>
              <span className="meta">{state.description}</span>
            </div>
          </header>
          <div className="grade-scoreline">
            <div>
              <span className="meta">Score</span>
              <strong>{formatVisibleScore(a.score, a.pointsPossible)}</strong>
            </div>
            <div>
              <span className="meta">Grade</span>
              <strong>{formatVisibleGrade(a.grade)}</strong>
            </div>
          </div>
          <dl className="grade-facts">
            <Fact label="Due" value={a.dueAt ? formatDateTime(a.dueAt) : "No due date"} />
            <Fact label="Unlocks" value={a.unlockAt ? formatDateTime(a.unlockAt) : "Not set"} />
            <Fact label="Locks" value={a.lockAt ? formatDateTime(a.lockAt) : "Not set"} />
            {a.pointsPossible !== null && <Fact label="Points possible" value={formatNumber(a.pointsPossible)} />}
            {optional.map(([label, value]) => (value ? <Fact key={label} label={label} value={value} /> : null))}
            <Fact label="Last synchronized" value={formatDateTime(a.lastSyncedAt)} />
          </dl>
          {grades && (
            <Link className="button subtle" href={gradesPath(grades.courseId)}>
              Back to all assignments
            </Link>
          )}
        </>
      )}
    </article>
  );
}
