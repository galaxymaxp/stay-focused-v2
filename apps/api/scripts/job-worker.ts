import { loadEnvConfig } from "@next/env";

import { runProcessingWorker } from "../src/lib/processing-jobs/worker";

loadEnvConfig(process.cwd());

const abortController = new AbortController();
const once = process.argv.includes("--once");
const configuredConcurrency = Number(process.env.PROCESSING_WORKER_CONCURRENCY);

const requestShutdown = (): void => {
  if (!abortController.signal.aborted) {
    console.info("processing_worker.shutdown_requested");
    abortController.abort();
  }
};

process.once("SIGINT", requestShutdown);
process.once("SIGTERM", requestShutdown);

async function main(): Promise<void> {
  try {
    console.info("processing_worker.started", {
      mode: once ? "once" : "continuous",
      concurrency: Number.isInteger(configuredConcurrency)
        ? configuredConcurrency
        : "default",
    });
    await runProcessingWorker({
      ...(Number.isInteger(configuredConcurrency)
        ? { concurrency: configuredConcurrency }
        : {}),
      once,
      signal: abortController.signal,
    });
    console.info("processing_worker.stopped");
  } catch (error) {
    console.error("processing_worker.fatal", {
      errorCode:
        error instanceof Error && /^[a-z0-9_]+$/.test(error.message)
          ? error.message
          : "processing_worker_fatal",
    });
    process.exitCode = 1;
  }
}

void main();
