import { randomUUID } from "node:crypto";
import { createCanvasServiceClient } from "@/lib/canvas-db";
import { processCanvasMetadataPolls } from "@/lib/notifications/canvas-poll";
import { processCanvasEmailOutbox } from "@/lib/notifications/canvas-email";
import { authorizedCanvasCron } from "@/lib/notifications/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request): Promise<Response> {
  if (!authorizedCanvasCron(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const worker = randomUUID();
  const deadline = Date.now() + 260_000;
  try {
    const client = createCanvasServiceClient();
    const sync = await processCanvasMetadataPolls(client, worker, deadline - 65_000);
    const queued = await client.rpc("queue_canvas_deadline_emails_v1", {});
    if (queued.error) throw new Error("canvas_reminder_queue_failed");
    const email = await processCanvasEmailOutbox(client, worker, deadline);
    const backlog = await client.rpc("count_canvas_notification_poll_backlog_v1", {});
    if (backlog.error) throw new Error("canvas_poll_backlog_unavailable");
    return Response.json({ ok: sync.failed === 0, sync, remindersQueued: queued.data, email, coursesAwaitingPoll: backlog.data ?? 0 }, { status: sync.failed ? 207 : 200 });
  } catch { return Response.json({ ok: false, error: "canvas_notification_job_failed" }, { status: 503 }); }
}
