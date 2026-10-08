"use client";
import type { ActivityDetail, ActivitySummary } from "@stay-focused/shared";
import type {
  TaskView,
  TaskPriority,
} from "@stay-focused/shared/task-planning";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/providers";
import { CourseMark } from "../components/course";
import { Empty, Heading, Icon, Notice, RowLink, State } from "../components/ui";
import { available, capabilityNote, urgencyOf } from "../app-model/presentation";
import { generationEnabled, generationKey } from "../lib/generation";
import { dateLabel, safeUrl } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
type TaskPage = { tasks: TaskView[]; nextCursor: string | null };
export function TasksScreen() {
  const { api } = useAuth(),
    tasks = useResource<TaskPage>("/api/tasks?limit=50"),
    activities = useResource<{ items: ActivitySummary[] }>(
      `/api/experience/activities?utcOffsetMinutes=${-new Date().getTimezoneOffset()}`,
    );
  const [group, setGroup] = useState("now"),
    [form, setForm] = useState(false),
    [extra, setExtra] = useState<TaskView[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    action = useAction();
  useEffect(() => {
    setExtra([]);
    setCursor(tasks.data?.nextCursor ?? null);
  }, [tasks.data]);
  const all = [...(tasks.data?.tasks ?? []), ...extra];
  const rows: ActivitySummary[] = [
    ...all.map((task) => ({
      id: `task:${task.id}`,
      taskId: task.id,
      course: null,
      title: task.title,
      dueAt: task.dueAt,
      status: task.status,
      priority: task.priority,
      estimatedMinutes: task.estimatedMinutes,
      submissionTypes: [],
      source:
        task.sourceType === "canvas" ? ("canvas" as const) : ("local" as const),
      isOverdue: !!task.dueAt && Date.parse(task.dueAt) < Date.now(),
      urgency:
        task.dueAt && Date.parse(task.dueAt) < Date.now() + 86400000
          ? ("now" as const)
          : task.dueAt && Date.parse(task.dueAt) < Date.now() + 3 * 86400000
            ? ("next" as const)
            : ("later" as const),
      hasGeneratedDraft: false,
    })),
    ...(activities.data?.items.filter(
      (a) => a.source === "canvas" && !a.taskId,
    ) ?? []),
  ];
  const filtered = rows.filter((item) =>
    group === "completed"
      ? item.status === "completed" || item.status === "submitted"
      : item.status !== "completed" &&
        item.status !== "submitted" &&
        item.urgency === group,
  );
  return (
    <>
      <Heading
        title="Tasks"
        action={
          <button
            className="icon-button"
            onClick={() => setForm(!form)}
            aria-label={form ? "Close new task" : "Add task"}
          >
            {form ? "−" : "+"}
          </button>
        }
      />
      <div className="stack">
        {form && (
          <TaskForm
            busy={action.busy}
            onSave={(body) =>
              void action.run(async () => {
                await api("/api/tasks", { method: "POST", body });
                setForm(false);
                tasks.refresh();
                activities.refresh();
              })
            }
          />
        )}
        <div className="segments" aria-label="Task groups">
          {["now", "next", "later", "completed"].map((value) => (
            <button
              key={value}
              aria-pressed={value === group}
              onClick={() => setGroup(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <State resource={tasks} />
        <State resource={activities} />
        {filtered.map((item) => (
          <div className="row" key={item.id}>
            <div className="grow">
              <RowLink
                href={`/tasks/${encodeURIComponent(item.id)}`}
                title={item.title}
                icon="square-check-big"
                tag={item.course?.name}
                detail={`${dateLabel(item.dueAt)}${item.estimatedMinutes ? ` · ${item.estimatedMinutes} min` : ""}`}
              />
            </div>
            {item.taskId && (
              <button
                className="icon-button"
                aria-label={`${item.status === "completed" ? "Reopen" : "Complete"} ${item.title}`}
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api(`/api/tasks/${item.taskId}`, {
                      method: "PATCH",
                      body: {
                        status:
                          item.status === "completed" ? "pending" : "completed",
                      },
                    });
                    tasks.refresh();
                    activities.refresh();
                  })
                }
              >
                {item.status === "completed" ? "✓" : "○"}
              </button>
            )}
          </div>
        ))}
        {tasks.data && activities.data && !filtered.length && (
          <Empty
            title={
              group === "completed"
                ? "No completed tasks yet."
                : "Nothing here right now."
            }
          >
            Add a task or{" "}
            <Link href="/canvas">sync your Canvas deadlines.</Link>
          </Empty>
        )}
        {cursor && (
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const page = await api<TaskPage>(
                  `/api/tasks?limit=50&cursor=${encodeURIComponent(cursor)}`,
                );
                setExtra((old) => [...old, ...page.tasks]);
                setCursor(page.nextCursor);
              })
            }
          >
            Load more tasks
          </button>
        )}
        {action.message && <Notice error>{action.message}</Notice>}
      </div>
    </>
  );
}
function TaskForm({
  busy,
  onSave,
  task,
}: {
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  task?: TaskView;
}) {
  const [title, setTitle] = useState(task?.title ?? ""),
    [notes, setNotes] = useState(task?.notes ?? ""),
    [priority, setPriority] = useState<TaskPriority>(
      task?.priority ?? "medium",
    ),
    [minutes, setMinutes] = useState(task?.estimatedMinutes ?? 30),
    [due, setDue] = useState(() => {
      if (!task?.dueAt) return "";
      const d = new Date(task.dueAt);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    });
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      title: title.trim(),
      notes: notes.trim() || null,
      priority,
      estimatedMinutes: minutes,
      dueAt: due ? new Date(due).toISOString() : null,
    });
  }
  return (
    <form className="surface stack" onSubmit={submit}>
      <h2>{task ? "Edit task" : "New task"}</h2>
      <label>
        Title
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Notes
        <textarea
          aria-label="Notes"
          maxLength={5000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <div className="row wrap">
        <label>
          Due date
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label>
          Estimated minutes
          <input
            type="number"
            min={1}
            max={1440}
            required
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </label>
        <label>
          Priority
          <select
            aria-label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <button className="primary" disabled={busy || !title.trim()}>
        {busy ? "Saving…" : "Save task"}
      </button>
    </form>
  );
}
export function TaskDetailScreen({ id }: { id: string }) {
  const { api, session } = useAuth(),
    router = useRouter(),
    activity = useResource<ActivityDetail>(
      `/api/experience/activities/${encodeURIComponent(id)}`,
    ),
    task = useResource<TaskView>(
      id.startsWith("task:") ? `/api/tasks/${id.slice(5)}` : null,
    ),
    action = useAction(),
    draft = useAction();
  const [editing, setEditing] = useState(false),
    [deleting, setDeleting] = useState(false);
  const data = activity.data;
  const assistance = data?.generation.activityAssistance;
  const canDraft = generationEnabled && available(assistance);
  // The app's Create Draft: an AI first draft of this activity, saved to Library.
  function createDraft() {
    if (!data || !session || !canDraft) return;
    void draft.run(async () => {
      const key = generationKey(session.user.id, `draft:${data.id}`, { mode: "draft" });
      const view = await api<{ id: string }>(
        `/api/experience/activities/${encodeURIComponent(data.id)}/generate`,
        { method: "POST", body: { mode: "draft" }, key: key.key },
      );
      key.accepted();
      router.push(`/generation/${encodeURIComponent(view.id)}`);
    });
  }
  const urgency = data ? urgencyOf(data) : null;
  return (
    <>
      <Heading
        title={data?.title ?? "Task"}
        subtitle={data?.course?.name ?? (data ? "Personal task" : undefined)}
        back="/tasks"
      />
      <State resource={activity} />
      {id.startsWith("task:") && <State resource={task} />}
      {data && (
        <div className="detail-layout">
          <div className="stack detail-main">
            <div className="row wrap detail-facts">
              {data.course && <CourseMark course={data.course} size={34} />}
              <span className={`meta due ${urgency ?? ""}`}>
                {data.dueAt ? `Due ${dateLabel(data.dueAt)}` : "No due date"}
              </span>
              <span className="badge">{data.priority} priority</span>
              <span className="badge">{data.status.replaceAll("_", " ")}</span>
            </div>
            <section className="surface stack">
              <h2>Instructions</h2>
              {data.instructions ? (
                <p className="instructions">{data.instructions}</p>
              ) : (
                <p className="muted">No instructions provided.</p>
              )}
            </section>
            {data.resources.length > 0 && (
              <section className="stack">
                <h2>Resources</h2>
                <div className="list-card">
                  {data.resources.map((r, i) => {
                    const href = safeUrl(r.url);
                    return href ? (
                      <a key={i} className="resource-row" href={href} target="_blank" rel="noopener noreferrer">
                        <Icon name="file-text" />
                        <span className="grow">{r.title}</span>
                        <Icon name="chevron-right" />
                      </a>
                    ) : null;
                  })}
                </div>
              </section>
            )}
            {editing && task.data && (
              <section className="surface stack">
                <h2>Edit task</h2>
                <TaskForm
                  key={task.data.updatedAt}
                  task={task.data}
                  busy={action.busy}
                  onSave={(body) =>
                    void action.run(async () => {
                      await api(`/api/tasks/${task.data!.id}`, { method: "PATCH", body });
                      setEditing(false);
                      task.refresh();
                      activity.refresh();
                    })
                  }
                />
              </section>
            )}
          </div>
          <aside className="stack detail-aside">
            <section className="surface stack">
              <h2>Create Draft</h2>
              <p className="muted">
                A first draft for this activity from its instructions and your course material, saved to your
                Library. You can leave while it works.
              </p>
              <button className="primary" disabled={!canDraft || draft.busy} onClick={createDraft}>
                {draft.busy ? "Starting…" : "Create Draft"}
              </button>
              {!available(assistance) && <p className="meta">{capabilityNote(assistance)}</p>}
              {!generationEnabled && <p className="meta">Generation is unavailable in this environment.</p>}
              {draft.message && <Notice error>{draft.message}</Notice>}
            </section>
            {task.data && (
              <section className="surface stack">
                <h2>Task</h2>
                <button
                  className={task.data.status === "completed" ? "" : "primary"}
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      await api(`/api/tasks/${task.data!.id}`, {
                        method: "PATCH",
                        body: { status: task.data!.status === "completed" ? "pending" : "completed" },
                      });
                      task.refresh();
                      activity.refresh();
                    })
                  }
                >
                  {task.data.status === "completed" ? "Reopen task" : "Complete task"}
                </button>
                <button onClick={() => setEditing(!editing)}>{editing ? "Cancel editing" : "Edit task"}</button>
                <button className="danger subtle" onClick={() => setDeleting(true)}>
                  Delete task
                </button>
                {deleting && (
                  <div className="stack finish-confirm" role="alert">
                    <p>Delete this task and its study sessions?</p>
                    <div className="row wrap">
                      <button onClick={() => setDeleting(false)}>Keep task</button>
                      <button
                        className="danger"
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(async () => {
                            await api(`/api/tasks/${task.data!.id}`, { method: "DELETE", envelope: "root" });
                            router.push("/tasks");
                          })
                        }
                      >
                        Delete task permanently
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
            {data.source === "canvas" && !data.taskId && (
              <button
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await api("/api/tasks/import/canvas", {
                      method: "POST",
                      body: { assignmentIds: [id.slice(id.indexOf(":") + 1)] },
                    });
                    activity.refresh();
                    action.setMessage("Assignment added to your tasks.");
                  })
                }
              >
                Add to my tasks
              </button>
            )}
            {data.outputs.length > 0 && (
              <section className="stack">
                <h2>Made for this</h2>
                {data.outputs.map((output) => (
                  <RowLink
                    key={output.id}
                    href={`/library/${encodeURIComponent(output.id)}`}
                    title={output.title}
                    tag="Saved output"
                    icon="file-text"
                  />
                ))}
              </section>
            )}
            {action.message && <Notice>{action.message}</Notice>}
          </aside>
        </div>
      )}
    </>
  );
}
