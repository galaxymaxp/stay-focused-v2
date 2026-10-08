import { requestKey, type Api } from "./api";

type Job = { id: string; status: string };
type Inventory = {
  courses: { id: string; selectable: boolean }[];
  selectedCourseIds: string[];
};
export type RefreshPhase =
  | "idle"
  | "syncing"
  | "synced"
  | "partial"
  | "failed"
  | "unconfirmed"
  | "not_connected";
export type RefreshProgress = { finished: number; total: number };
const terminal = new Set(["succeeded", "failed", "cancelled", "expired"]);

function pause(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 3000);
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Starts only on an explicit Sync action. Failed admissions are part of the result. */
export async function performCanvasRefresh(
  api: Api,
  scope: string,
  signal: AbortSignal,
  onProgress: (progress: RefreshProgress) => void,
  wait: (signal: AbortSignal) => Promise<void> = pause,
): Promise<RefreshPhase> {
  signal.throwIfAborted();
  const { connection } = await api<{ connection: { status: string } | null }>(
    "/api/canvas/connection",
    { envelope: "root", signal },
  );
  if (!connection) return "not_connected";
  let courseIds = [scope];
  if (scope === "all") {
    const inventory = await api<Inventory>("/api/canvas/courses", {
      envelope: "root",
      signal,
    });
    const selected = new Set(inventory.selectedCourseIds);
    courseIds = [
      ...new Set(
        inventory.courses
          .filter((c) => selected.has(c.id) && c.selectable)
          .map((c) => c.id),
      ),
    ];
  }
  if (!courseIds.length) return "idle";
  const total = courseIds.length * 2;
  let rejected = 0;
  const jobs: Job[] = [];
  onProgress({ finished: 0, total });
  // Bound concurrency to one content/grades pair, even for accounts with many courses.
  for (const id of courseIds) {
    signal.throwIfAborted();
    const started = await Promise.allSettled(
      ["sync", "grades/sync"].map((path) =>
        api<Job>(`/api/canvas/courses/${encodeURIComponent(id)}/${path}`, {
          method: "POST",
          key: requestKey(),
          signal,
        }),
      ),
    );
    signal.throwIfAborted();
    for (const result of started) {
      if (result.status === "fulfilled") jobs.push(result.value);
      else rejected++;
    }
  }
  let pollingFailures = 0;
  for (let attempt = 0; attempt < 100; attempt++) {
    signal.throwIfAborted();
    const finished =
      rejected + jobs.filter((job) => terminal.has(job.status)).length;
    onProgress({ finished, total });
    if (finished === total) {
      const successes = jobs.filter((job) => job.status === "succeeded").length;
      return successes === total ? "synced" : successes ? "partial" : "failed";
    }
    await wait(signal);
    const pending = jobs.filter((job) => !terminal.has(job.status));
    const results = await Promise.allSettled(
      pending.map((job) =>
        api<Job>(`/api/canvas/sync-jobs/${encodeURIComponent(job.id)}`, {
          signal,
        }),
      ),
    );
    signal.throwIfAborted();
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const job = jobs.find((entry) => entry.id === pending[index]!.id);
        if (job) job.status = result.value.status;
      }
    });
    pollingFailures = results.some((result) => result.status === "rejected")
      ? pollingFailures + 1
      : 0;
    // A lost connection cannot establish that an accepted server job failed.
    if (pollingFailures >= 3) return "unconfirmed";
  }
  return "unconfirmed";
}
