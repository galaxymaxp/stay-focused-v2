import type { TaskView } from "@stay-focused/shared/task-planning";
import type { Api } from "./api";

// Import unlinked Canvas activities first, including paper hand-ins Canvas
// cannot detect, then use the same task status update on every work surface.
export async function setWorkDone(
  api: Api,
  work: { readonly id: string; readonly taskId: string | null },
  done: boolean,
): Promise<void> {
  let taskId = work.taskId;
  if (!taskId) {
    if (!work.id.startsWith("canvas:")) throw new Error("This item can't be marked done.");
    const assignmentId = work.id.slice("canvas:".length);
    const imported = await api<{ tasks: TaskView[] }>("/api/tasks/import/canvas", {
      method: "POST",
      body: { assignmentIds: [assignmentId] },
    });
    taskId = imported.tasks[0]?.id ?? null;
    if (!taskId) throw new Error("This item can't be marked done right now.");
  }
  await api(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: { status: done ? "completed" : "pending" },
  });
}
