import { randomUUID } from "node:crypto";

import {
  JOB_WORKER_DEFAULT_CONCURRENCY,
  JOB_WORKER_IDLE_POLL_INTERVAL_MS,
  JOB_WORKER_MAX_CONCURRENCY,
} from "./constants";
import { processClaimedJob } from "./processor";
import { createProcessingJobServiceClient } from "./repository";
import {
  claimProcessingJobs,
  recoverStaleProcessingJobs,
} from "./worker-repository";

export interface RunProcessingWorkerOptions {
  readonly concurrency?: number;
  readonly once?: boolean;
  readonly signal?: AbortSignal;
  readonly workerId?: string;
}

export async function runProcessingWorker(
  options: RunProcessingWorkerOptions = {},
): Promise<void> {
  const concurrency = normalizeConcurrency(options.concurrency);
  const once = options.once ?? false;
  const workerId = options.workerId ?? `worker-${randomUUID()}`;
  const client = createProcessingJobServiceClient();
  const active = new Set<Promise<void>>();

  await recoverStaleProcessingJobs(client);

  do {
    if (options.signal?.aborted) break;
    const capacity = Math.max(0, concurrency - active.size);
    if (capacity > 0) {
      const jobs = await claimProcessingJobs(client, workerId, capacity);
      for (const job of jobs) {
        const task: Promise<void> = processClaimedJob({ client, job, workerId })
          .then(() => undefined)
          .finally(() => active.delete(task));
        active.add(task);
      }
    }

    if (once) break;
    if (active.size > 0) {
      await Promise.race([
        ...active,
        waitForNextPoll(options.signal),
      ]);
    } else {
      await waitForNextPoll(options.signal);
    }
    await recoverStaleProcessingJobs(client);
  } while (!options.signal?.aborted);

  await Promise.allSettled(active);
}

function normalizeConcurrency(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value < 1) {
    return JOB_WORKER_DEFAULT_CONCURRENCY;
  }
  return Math.min(value, JOB_WORKER_MAX_CONCURRENCY);
}

async function waitForNextPoll(signal: AbortSignal | undefined): Promise<void> {
  if (signal?.aborted) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, JOB_WORKER_IDLE_POLL_INTERVAL_MS);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
