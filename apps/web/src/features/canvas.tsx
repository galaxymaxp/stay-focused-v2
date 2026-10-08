"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../components/providers";
import { Empty, Heading, Notice, State } from "../components/ui";
import { dateLabel } from "../lib/api";
import { generationKey } from "../lib/generation";
import { useAction, useResource } from "../lib/hooks";
// Narrow public projections of the existing Canvas routes, which use top-level envelopes.
interface Connection {
  id: string;
  baseUrl: string;
  canvasUserName: string;
  status: string;
  lastVerifiedAt: string;
}
interface Inventory {
  courses: {
    id: string;
    displayName: string;
    courseCode: string | null;
    selected: boolean;
    selectable: boolean;
    classification: string;
    syncHealth?: { overallHealth: string };
    lastSync: { completedAt: string | null } | null;
  }[];
  selectedCourseIds: string[];
}
interface SyncJob {
  id: string;
  status: string;
  course: { displayName: string };
  progress: { completedUnits: number | null; totalUnits: number | null };
}
export function CanvasScreen() {
  const { api, session } = useAuth(),
    connection = useResource<{ connection: Connection | null }>(
      "/api/canvas/connection",
      0,
      "root",
    ),
    inventory = useResource<Inventory>(
      connection.data?.connection ? "/api/canvas/courses" : null,
      0,
      "root",
    ),
    action = useAction();
  const [baseUrl, setBaseUrl] = useState(""),
    [token, setToken] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [dirty, setDirty] = useState(false),
    [disconnect, setDisconnect] = useState(false),
    [jobId, setJobId] = useState<string | null>(null);
  const job = useResource<SyncJob>(
    jobId ? `/api/canvas/sync-jobs/${jobId}` : null,
    5000,
  );
  useEffect(() => {
    if (!dirty && inventory.data) setSelected(inventory.data.selectedCourseIds);
  }, [inventory.data, dirty]);
  const refreshInventory = inventory.refresh;
  useEffect(() => {
    if (
      ["succeeded", "failed", "cancelled", "expired"].includes(
        job.data?.status ?? "",
      )
    )
      refreshInventory();
  }, [job.data?.status, refreshInventory]);
  useEffect(() => {
    try {
      setJobId(
        sessionStorage.getItem(
          `stay-focused-web-canvas-sync:${session?.user.id}`,
        ),
      );
    } catch {
      /* No persisted sync shortcut available. */
    }
  }, [session?.user.id]);
  function connect(e: FormEvent) {
    e.preventDefault();
    void action.run(async () => {
      try {
        await api("/api/canvas/connection", {
          method: "PUT",
          body: { baseUrl, personalAccessToken: token },
          envelope: "root",
        });
        connection.refresh();
        action.setMessage(
          "Canvas connected. Choose the courses you want to use.",
        );
      } finally {
        setToken("");
      }
    });
  }
  return (
    <>
      <Heading
        title="Canvas"
        subtitle="Your courses, connected."
        back="/generate"
      />
      <div className="stack reader">
        <State resource={connection} />
        {connection.data && !connection.data.connection && (
          <>
            <Empty title="Connect your Canvas courses.">
              Use your school’s Canvas address and your personal access token.
            </Empty>
            <form onSubmit={connect} className="surface stack">
              <label>
                Canvas address
                <input
                  type="url"
                  required
                  placeholder="https://your-school.instructure.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </label>
              <label>
                Personal access token
                <input
                  type="password"
                  autoComplete="off"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </label>
              <p className="meta">
                Canvas access is read-only. Your token is encrypted by the
                shared backend and is never saved in browser storage.
              </p>
              <button className="primary" disabled={action.busy}>
                {action.busy ? "Connecting…" : "Connect Canvas"}
              </button>
            </form>
          </>
        )}
        {connection.data?.connection && (
          <>
            <section className="surface stack">
              <h2>{connection.data.connection.canvasUserName}</h2>
              <p className="muted">{connection.data.connection.baseUrl}</p>
              <span className="meta">
                {connection.data.connection.status} · Verified{" "}
                {dateLabel(connection.data.connection.lastVerifiedAt)}
              </span>
              <div className="row wrap">
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await api("/api/canvas/sync", {
                        method: "POST",
                        body: { mode: "incremental" },
                        envelope: "root",
                      });
                      inventory.refresh();
                      action.setMessage(
                        "Course inventory refreshed. Sync selected course content below.",
                      );
                    })
                  }
                >
                  Refresh courses
                </button>
                <button
                  className="subtle danger"
                  onClick={() => setDisconnect(true)}
                >
                  Disconnect Canvas
                </button>
              </div>
            </section>
            <h2>Your courses</h2>
            <State resource={inventory} />
            {inventory.data?.courses.map((course) => (
              <div className="surface stack" key={course.id}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    disabled={!course.selectable || action.busy}
                    checked={selected.includes(course.id)}
                    onChange={(e) => {
                      setDirty(true);
                      setSelected((old) =>
                        e.target.checked
                          ? [...old, course.id]
                          : old.filter((id) => id !== course.id),
                      );
                    }}
                  />
                  <strong>{course.displayName}</strong>
                </label>
                <p className="meta">
                  {course.courseCode} ·{" "}
                  {course.syncHealth?.overallHealth.replaceAll("_", " ") ??
                    "Not synced"}
                </p>
                {course.selected && (
                  <div className="row wrap">
                    <Link
                      className="button subtle"
                      href={`/generate/${course.id}`}
                    >
                      Open materials
                    </Link>
                    <Link
                      className="button subtle"
                      href={`/canvas/${course.id}/grades`}
                    >
                      Grades
                    </Link>
                    <button
                      disabled={action.busy || dirty}
                      onClick={() =>
                        void action.run(async () => {
                          const submission = generationKey(
                              session!.user.id,
                              `canvas-sync:${course.id}`,
                              {},
                            ),
                            accepted = await api<SyncJob>(
                              `/api/canvas/courses/${course.id}/sync`,
                              { method: "POST", key: submission.key },
                            );
                          submission.accepted();
                          setJobId(accepted.id);
                          try {
                            sessionStorage.setItem(
                              `stay-focused-web-canvas-sync:${session!.user.id}`,
                              accepted.id,
                            );
                          } catch {
                            /* Sync persists on the server. */
                          }
                          action.setMessage(
                            "Course sync accepted. You can leave this page.",
                          );
                        })
                      }
                    >
                      Sync course content
                    </button>
                  </div>
                )}
              </div>
            ))}
            {inventory.data?.courses.length === 0 && (
              <p className="muted">
                No courses were returned. Refresh courses to check again.
              </p>
            )}
            {inventory.data && (
              <button
                className="primary"
                disabled={action.busy || !dirty}
                onClick={() =>
                  void action.run(async () => {
                    await api("/api/canvas/course-preferences", {
                      method: "PUT",
                      body: { selectedCourseIds: selected },
                      envelope: "root",
                    });
                    setDirty(false);
                    inventory.refresh();
                    action.setMessage("Course selection saved.");
                  })
                }
              >
                Save course selection
              </button>
            )}
          </>
        )}
        {job.data && (
          <Notice>
            {job.data.course.displayName}:{" "}
            {job.data.status.replaceAll("_", " ")}
            {job.data.progress.totalUnits !== null
              ? ` · ${job.data.progress.completedUnits ?? 0} of ${job.data.progress.totalUnits} operations`
              : ""}
          </Notice>
        )}
        {jobId && <State resource={job} />}
        {disconnect && (
          <div className="surface stack" role="alert">
            <p>Disconnect Canvas? Future course sync will stop.</p>
            <div className="row">
              <button onClick={() => setDisconnect(false)}>
                Keep connection
              </button>
              <button
                className="danger"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api("/api/canvas/connection", {
                      method: "DELETE",
                      envelope: "root",
                    });
                    setDisconnect(false);
                    setJobId(null);
                    connection.refresh();
                  })
                }
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
        {action.message && <Notice>{action.message}</Notice>}
      </div>
    </>
  );
}
