import { OAuth2Client } from "google-auth-library";

import { createCanvasServiceClient } from "@/lib/canvas-db";
import { decryptConnectionToken } from "@/lib/canvas-routes";
import { loadCanvasSyncCheckpointContext } from "@/lib/canvas-sync-jobs/checkpoints";
import { CANVAS_WORKER_TOKEN_ENDPOINT, parseCanvasWorkerTokenRequest } from "@/lib/canvas-sync-jobs/worker-token-contract";

export const runtime = "nodejs";
export const maxDuration = 30;

const verifier = new OAuth2Client();
const NO_STORE = { "Cache-Control": "no-store, private", "Pragma": "no-cache" };

/** Private service-to-service credential handoff for one already claimed job. */
export async function POST(request: Request): Promise<Response> {
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim();
  if (!project || !/^[a-z][a-z0-9-]+$/.test(project)) return new Response(null, { status: 503, headers: NO_STORE });
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.length > 10_000) {
    return new Response(null, { status: 401, headers: NO_STORE });
  }
  try {
    const ticket = await verifier.verifyIdToken({
      idToken: authorization.slice(7), audience: CANVAS_WORKER_TOKEN_ENDPOINT,
    });
    const identity = ticket.getPayload();
    if (identity?.email !== `generation-worker@${project}.iam.gserviceaccount.com` ||
        identity.email_verified !== true) {
      return new Response(null, { status: 403, headers: NO_STORE });
    }
  } catch {
    return new Response(null, { status: 401, headers: NO_STORE });
  }

  const body = await readBoundedBody(request);
  if (body === null) return new Response(null, { status: 400, headers: NO_STORE });
  let parsed: unknown;
  try { parsed = JSON.parse(body) as unknown; }
  catch { return new Response(null, { status: 400, headers: NO_STORE }); }
  const input = parseCanvasWorkerTokenRequest(parsed);
  if (!input) return new Response(null, { status: 400, headers: NO_STORE });

  try {
    const context = await loadCanvasSyncCheckpointContext(createCanvasServiceClient(), input.jobId);
    const job = context?.job;
    if (!job || job.status !== "running" || job.google_dispatch_id !== input.dispatchId ||
        job.worker_id !== input.workerId ||
        !job.google_worker_lease_expires_at || Date.parse(job.google_worker_lease_expires_at) <= Date.now() ||
        !job.deadline_at || Date.parse(job.deadline_at) <= Date.now()) {
      return new Response(null, { status: 404, headers: NO_STORE });
    }
    const accessToken = decryptConnectionToken(context.connection);
    return Response.json({ accessToken }, { headers: NO_STORE });
  } catch {
    return new Response(null, { status: 503, headers: NO_STORE });
  }
}

async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 512) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
