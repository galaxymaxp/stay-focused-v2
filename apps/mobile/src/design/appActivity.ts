import { createContext, useContext } from "react";

/**
 * Whether Stay Focused is working on something for the student right now:
 * a Canvas sync, or generation work that is queued or running. The header
 * Queue control turns into the mini activity orb while this is active.
 */
export interface AppActivity {
  readonly active: boolean;
  readonly syncing: boolean;
  readonly generating: number;
  readonly queued: number;
  /** Ask for a fresh check now (e.g. right after a generation is accepted). */
  readonly refresh: () => void;
}

export const IDLE_ACTIVITY: AppActivity = {
  active: false,
  syncing: false,
  generating: 0,
  queued: 0,
  refresh: () => {},
};

export const AppActivityContext = createContext<AppActivity>(IDLE_ACTIVITY);

export const useAppActivity = () => useContext(AppActivityContext);

/** Counts from the server's active job list; anything not queued is working. */
export function countActiveJobs(jobs: readonly { readonly status: string }[]): { generating: number; queued: number } {
  let generating = 0;
  let queued = 0;
  for (const job of jobs) {
    if (job.status === "queued") queued += 1;
    else if (job.status === "running" || job.status === "cancellation_requested") generating += 1;
  }
  return { generating, queued };
}
