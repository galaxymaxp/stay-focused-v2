import type { CanvasEmailOutboxRow, Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultNotificationPreferences, notificationEmailEnabled, validNotificationTimezone } from "@stay-focused/shared/notification-preferences";
import { sendTransactionalEmail, type EmailDeliveryResult } from "@/lib/transactional-email";

const SUBJECTS = { announcement: "New Canvas Announcement", new_assignment: "New Assignment", due_date_change: "Assignment Due Date Changed", deadline_7_day: "Assignment due within 7 days", deadline_3_day: "Assignment due within 3 days", deadline_due_today: "Assignment due today" } as const;
export function renderCanvasEmail(row: CanvasEmailOutboxRow): { subject: string; text: string } {
  const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as Record<string, unknown> : {};
  const timezone = validNotificationTimezone(payload.timezone) ? payload.timezone : "UTC";
  const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("en", { timeZone: timezone, dateStyle: "long", timeStyle: "short" }).format(new Date(value)) + ` (${timezone})` : "No due date";
  const lines = [`Course: ${String(payload.course ?? "Your course").slice(0, 500)}`, String(payload.title ?? "Canvas update").slice(0, 500)];
  if (row.type === "announcement") lines.push("Your instructor posted a new announcement in Canvas.");
  else {
    if (row.type === "due_date_change") lines.push(`Previous due date: ${date(payload.old_due_at)}`, `New due date: ${date(payload.due_at)}`);
    else lines.push(`Due: ${date(payload.due_at)}`);
    if (row.type.startsWith("deadline_") && typeof payload.due_at === "string") {
      const hours = Math.max(0, Math.ceil((Date.parse(payload.due_at) - Date.parse(row.created_at)) / 3600000));
      lines.push(hours > 24 ? `About ${Math.ceil(hours / 24)} days remaining when this reminder was prepared.` : `About ${hours} hours remaining when this reminder was prepared.`);
    }
  }
  lines.push("Open Stay Focused to view your course and tasks.", row.type === "announcement" ? "stayfocused:///announcements" : "stayfocused:///today");
  return { subject: SUBJECTS[row.type], text: lines.join("\n\n") };
}

export async function processCanvasEmailOutbox(client: SupabaseClient<Database>, workerId: string, deadline: number, send: typeof sendTransactionalEmail = sendTransactionalEmail): Promise<{ sent: number; skipped: number; failed: number }> {
  // Configuration outages must leave durable events queued, not consume attempts.
  if (send === sendTransactionalEmail && (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim())) throw new Error("canvas_email_not_configured");
  const stats = { sent: 0, skipped: 0, failed: 0 };
  for (let count = 0; count < 20 && Date.now() + 20_000 < deadline; count++) {
    // Claim one at a time: every provider request fits in its own 60s lease.
    const claim = await client.rpc("claim_canvas_email_outbox_v1", { p_worker_id: workerId, p_limit: 1 });
    if (claim.error) throw new Error("canvas_email_claim_failed");
    const row = claim.data?.[0];
    if (!row) break;
    try {
      const [prefs, course, selected] = await Promise.all([
        client.from("notification_preferences").select("*").eq("user_id", row.user_id).maybeSingle(),
        client.from("canvas_courses").select("canvas_connection_id").eq("id", row.course_id).eq("user_id", row.user_id).maybeSingle(),
        client.from("canvas_course_sync_preferences").select("selected").eq("course_id", row.course_id).eq("user_id", row.user_id).maybeSingle(),
      ]);
      if (prefs.error || course.error || selected.error) throw new Error("canvas_email_target_unavailable");
      const conn = course.data ? await client.from("canvas_connections").select("status").eq("id", course.data.canvas_connection_id).eq("user_id", row.user_id).maybeSingle() : null;
      if (conn?.error) throw new Error("canvas_email_connection_unavailable");
      let skip = !notificationEmailEnabled(prefs.data ?? defaultNotificationPreferences(), row.type) || !selected.data?.selected || conn?.data?.status !== "active";
      let deferReminder = false;
      if (row.canvas_assignment_id) {
        const assignment = await client.from("canvas_assignments").select("id,due_at,published").eq("user_id", row.user_id).eq("course_id", row.course_id).eq("canvas_assignment_id", row.canvas_assignment_id).maybeSingle();
        if (assignment.error) throw new Error("canvas_email_assignment_unavailable");
        skip ||= !assignment.data || assignment.data.published === false;
        if (row.type.startsWith("deadline_") && assignment.data) {
          const [state, pending] = await Promise.all([
            client.from("canvas_notification_assignment_state").select("due_revision").eq("course_id", row.course_id).eq("canvas_assignment_id", row.canvas_assignment_id).maybeSingle(),
            client.rpc("canvas_notification_assignment_pending_v1", { p_assignment_id: assignment.data.id }),
          ]);
          if (state.error || pending.error) throw new Error("canvas_email_deadline_unavailable");
          skip ||= state.data?.due_revision !== row.due_revision || !pending.data || !assignment.data.due_at || Date.parse(assignment.data.due_at) <= Date.now();
          const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as Record<string, unknown> : {};
          const timezone = prefs.data?.timezone ?? (validNotificationTimezone(payload.timezone) ? payload.timezone : "UTC");
          const local = (date: Date) => {
            const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
            const get = (name: string) => parts.find(part => part.type === name)?.value ?? "00";
            return { day: `${get("year")}-${get("month")}-${get("day")}`, minute: Number(get("hour")) * 60 + Number(get("minute")) };
          };
          const current = local(new Date());
          const time = (prefs.data?.reminder_time ?? "08:00").split(":").map(Number);
          deferReminder = current.minute === 0 || current.minute < time[0]! * 60 + time[1]!;
          if (row.type === "deadline_due_today" && assignment.data.due_at) deferReminder ||= local(new Date(assignment.data.due_at)).day !== current.day;
        }
      }
      if (row.canvas_announcement_id) {
        const announcement = await client.from("canvas_announcements").select("published,workflow_state").eq("user_id", row.user_id).eq("course_id", row.course_id).eq("canvas_announcement_id", row.canvas_announcement_id).maybeSingle();
        if (announcement.error) throw new Error("canvas_email_announcement_unavailable");
        skip ||= !announcement.data || announcement.data.published === false || ["deleted", "unpublished"].includes(announcement.data.workflow_state ?? "");
      }
      if (skip) {
        await finish(client, row, workerId, { skipped_at: new Date().toISOString(), last_error: "notification_no_longer_eligible" }); stats.skipped++; continue;
      }
      if (deferReminder) {
        await finish(client, row, workerId, { scheduled_for: new Date(Date.now() + 300000).toISOString(), retry_count: row.retry_count - 1, first_attempt_at: row.retry_count === 1 ? null : row.first_attempt_at });
        continue;
      }
      const user = await client.auth.admin.getUserById(row.user_id);
      if (user.error) throw new Error("canvas_email_recipient_unavailable");
      if (!user.data.user?.email || !user.data.user.email_confirmed_at) {
        await finish(client, row, workerId, { skipped_at: new Date().toISOString(), last_error: "verified_email_unavailable" }); stats.skipped++; continue;
      }
      const content = renderCanvasEmail(row);
      const result = await send({ type: "canvas_notification", eventId: row.id, recipient: user.data.user.email, ...content });
      await finishDelivery(client, row, workerId, result);
      if (result.ok) stats.sent++; else stats.failed++;
    } catch {
      // Never log raw academic content, authentication or provider errors.
      await finishDelivery(client, row, workerId, { ok: false, code: "email_delivery_failed", retryable: true }); stats.failed++;
    }
  }
  return stats;
}
async function finishDelivery(client: SupabaseClient<Database>, row: CanvasEmailOutboxRow, workerId: string, result: EmailDeliveryResult): Promise<void> {
  const now = new Date();
  await finish(client, row, workerId, result.ok ? { sent_at: now.toISOString(), message_id: result.messageId, last_error: null }
    : { failed_at: result.retryable && row.retry_count < 6 ? null : now.toISOString(), scheduled_for: new Date(now.getTime() + Math.min(3600000, 300000 * 2 ** row.retry_count)).toISOString(), last_error: result.code });
}
async function finish(client: SupabaseClient<Database>, row: CanvasEmailOutboxRow, workerId: string, update: Database["public"]["Tables"]["notification_outbox"]["Update"]): Promise<void> {
  const result = await client.from("notification_outbox").update({ ...update, lease_owner: null, lease_expires_at: null }).eq("id", row.id).eq("lease_owner", workerId).select("id");
  if (result.error || !result.data?.length) throw new Error("canvas_email_receipt_persistence_failed");
}
