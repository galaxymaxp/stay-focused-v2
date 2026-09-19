import { start } from "workflow/api";

import { processingJobWorkflow } from "@/workflows/processing-job";

export async function startProcessingJobWorkflow(
  jobId: string,
): Promise<{ readonly runId: string }> {
  const started = await start(processingJobWorkflow, [jobId]);
  return { runId: started.runId };
}
