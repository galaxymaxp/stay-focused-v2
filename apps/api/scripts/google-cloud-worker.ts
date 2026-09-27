import { createServer } from "node:http";
import { executeGoogleJob, parseGoogleJobReference } from "../src/lib/processing-jobs/google-cloud";

// Cloud Run IAM requires authenticated invocation. Do not deploy with allUsers.
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200).end("ok"); return;
  }
  if (request.method !== "POST" || request.url !== "/tasks/generation") {
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
    const reference = parseGoogleJobReference(payload);
    if (!reference) { response.writeHead(400).end(); return; }
    const started = Date.now();
    const outcome = await executeGoogleJob(reference);
    console.info("google_generation.delivery", { jobId: reference.jobId, outcome,
      durationMs: Date.now() - started, rssBytes: process.memoryUsage().rss });
    response.writeHead(outcome === "ack" ? 204 : 503).end();
  } catch {
    // Do not emit raw SDK errors, bodies, headers, URLs or credentials.
    console.warn("google_generation.delivery_unavailable");
    response.writeHead(503).end();
  }
});
server.requestTimeout = 30_000; // Body reception; handler execution is separate.
server.listen(Number(process.env.PORT ?? 8080), "0.0.0.0");
process.on("SIGTERM", () => server.close());
