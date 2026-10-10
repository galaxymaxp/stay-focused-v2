"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../components/providers";
import { CourseMark } from "../components/course";
import { Empty, Heading, Icon, Notice, State } from "../components/ui";
import { dateLabel } from "../lib/api";
import { CanvasRefreshStatus, useCanvasRefresh } from "../lib/canvas-refresh";
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
export function CanvasScreen() {
  const { api } = useAuth(),
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
    [disconnect, setDisconnect] = useState(false);
  useEffect(() => {
    if (!dirty && inventory.data) setSelected(inventory.data.selectedCourseIds);
  }, [inventory.data, dirty]);
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
  const connected = connection.data?.connection ?? null;
  return (
    <>
      <Heading
        title="Canvas"
        subtitle="Your courses, connected."
        back="/generate"
      />
      <div className={connected ? "canvas-layout" : "stack reader"}>
        <aside className="stack canvas-aside">
          <State resource={connection} />
          {connection.data && !connected && (
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
          {connected && (
            <section className="surface stack canvas-account">
              <div className="row">
                <span className="content-icon">
                  <Icon name="globe" />
                </span>
                <div className="grow">
                  <h2>{connected.canvasUserName}</h2>
                  <p className="meta">{connected.baseUrl}</p>
                </div>
              </div>
              <span className="meta">
                <span className={`status-dot ${connected.status === "connected" ? "ready" : ""}`} />{" "}
                {connected.status} · Verified {dateLabel(connected.lastVerifiedAt)}
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
          )}

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
        </aside>
        {connected && (
          <section className="stack canvas-courses" aria-label="Your courses">
            <div className="row canvas-courses-head">
              <h2 className="grow">Your courses</h2>
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
            </div>
            <State resource={inventory} />
            {inventory.data && inventory.data.courses.length > 0 && (
              <div className="list-card">
                {inventory.data.courses.map((course) => (
                  <div className={`canvas-course${course.selected ? " selected" : ""}`} key={course.id}>
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
                      <CourseMark
                        course={{ id: course.id, code: course.courseCode, name: course.displayName }}
                        size={30}
                      />
                      <span className="grow">
                        <strong>{course.displayName}</strong>
                        <span className="meta">
                          {[
                            course.courseCode,
                            course.syncHealth?.overallHealth.replaceAll("_", " ") ?? "Not synced",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </label>
                    {course.selected && (
                      <div className="row wrap canvas-course-actions">
                        <Link className="button subtle" href={`/generate/${course.id}`}>
                          Open materials
                        </Link>
                        <Link className="button subtle" href={`/canvas/${course.id}/grades`}>
                          Grades
                        </Link>
                        {!dirty && course.classification !== "past_or_concluded" && (
                          <CourseSync courseId={course.id} onSynced={inventory.refresh} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {inventory.data?.courses.length === 0 && (
              <p className="muted">
                No courses were returned. Refresh courses to check again.
              </p>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function CourseSync({ courseId, onSynced }: { courseId: string; onSynced: () => void }) {
  const refresh = useCanvasRefresh(courseId, onSynced);
  return <CanvasRefreshStatus refresh={refresh} />;
}
