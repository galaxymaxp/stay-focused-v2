import { createServer } from "node:http";
import { executeGoogleJob, parseGoogleJobReference } from "../src/lib/processing-jobs/google-cloud";
import { parseGoogleCanvasJobReference } from "../src/lib/canvas-sync-jobs/google-dispatch";
import { executeGoogleCanvasJob } from "../src/lib/canvas-sync-jobs/google-worker";
import { executeSourcePageSnapshot } from "../src/lib/source-page-snapshot-worker";
import { executePreparation } from '../src/lib/canvas-preparation/worker';
import { parsePreparationReference } from '../src/lib/canvas-preparation/contracts';

// Cloud Run IAM requires authenticated invocation. Do not deploy with allUsers.
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200).end("ok"); return;
  }
  const canvas = request.url === "/tasks/canvas-sync";
  const snapshot = request.url === "/tasks/page-snapshot";
  const preparation = request.url === '/tasks/canvas-preparation';
  if (request.method !== "POST" || (!canvas && !snapshot && !preparation && request.url !== "/tasks/generation")) {
    response.writeHead(404).end(); return;
  }
  let length = 0;
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of request) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      length += bytes.length;
      if (length > 1024) { response.writeHead(413).end(); return; }
      chunks.push(bytes);
    }
    let payload: unknown;
    try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { response.writeHead(400).end(); return; }
    const reference = preparation ? parsePreparationReference(payload) : canvas ? parseGoogleCanvasJobReference(payload) : parseGoogleJobReference(payload);
    if (!reference) { response.writeHead(400).end(); return; }
    const started = Date.now();
    const outcome = preparation ? await executePreparation(reference) : snapshot ? await executeSourcePageSnapshot(reference) : canvas ? await executeGoogleCanvasJob(reference) : await executeGoogleJob(reference);
    console.info(preparation ? "canvas_preparation.delivery" : snapshot ? "source_page_snapshot.delivery" : canvas ? "google_canvas.delivery" : "google_generation.delivery", { jobId: reference.jobId, outcome,
      durationMs: Date.now() - started, rssBytes: process.memoryUsage().rss });
    response.writeHead(outcome === "ack" ? 204 : 503).end();
  } catch {
    // Do not emit raw SDK errors, bodies, headers, URLs or credentials.
    console.warn(preparation ? "canvas_preparation.delivery_unavailable" : snapshot ? "source_page_snapshot.delivery_unavailable" : canvas ? "google_canvas.delivery_unavailable" : "google_generation.delivery_unavailable");
    response.writeHead(503).end();
  }
});
server.requestTimeout = 30_000; // Body reception; handler execution is separate.
server.listen(Number(process.env.PORT ?? 8080), "0.0.0.0");
process.on("SIGTERM", () => server.close());
