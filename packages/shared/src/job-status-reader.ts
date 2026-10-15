import type { ProcessingJobListPage } from "./index";

/** One owner/session's transport, owned and disposed by its mounted provider. */
export function createJobStatusReader(
  load: (
    detailId: string | null,
    signal: AbortSignal,
  ) => Promise<ProcessingJobListPage>,
) {
  const controller = new AbortController();
  let pending: {
    id: string | null;
    promise: Promise<ProcessingJobListPage>;
  } | null = null;
  function read(id: string | null = null): Promise<ProcessingJobListPage> {
    if (controller.signal.aborted)
      return Promise.reject(new Error("job_reader_disposed"));
    if (pending) {
      if (pending.id === id) return pending.promise;
      return pending.promise.catch(() => undefined).then(() => read(id));
    }
    const promise = Promise.resolve()
      .then(() => load(id, controller.signal))
      .finally(() => {
        if (pending?.promise === promise) pending = null;
      });
    pending = { id, promise };
    return promise;
  }
  return { read, dispose: () => controller.abort() };
}
