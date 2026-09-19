import type { ProcessingJobDatabaseRow } from "@stay-focused/db";
import { after } from "next/server";

interface BackgroundDispatchDependencies {
  readonly dispatch?: (job: ProcessingJobDatabaseRow) => Promise<unknown>;
  readonly schedule?: (task: () => Promise<void>) => void;
}

/**
 * Register workflow dispatch only after the HTTP response has been committed.
 * The callback captures the bounded job row, never source bytes or source text.
 */
export function scheduleAcceptedProcessingJobDispatch(
  job: ProcessingJobDatabaseRow,
  dependencies: BackgroundDispatchDependencies = {},
): void {
  const schedule = dependencies.schedule ?? after;
  schedule(async () => {
    try {
      const dispatch = dependencies.dispatch ??
        (await import("./workflow-dispatch")).dispatchAcceptedProcessingJob;
      await dispatch(job);
    } catch (error) {
      console.error("processing_workflow.background_dispatch_failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        jobId: job.id,
      });
    }
  });
}
