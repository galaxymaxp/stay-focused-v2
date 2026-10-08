import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CanvasEmailOutboxRow, Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultNotificationPreferences, EMAIL_NOTIFICATION_TYPES } from "@stay-focused/shared/notification-preferences";
import { processCanvasEmailOutbox, renderCanvasEmail } from "./canvas-email";

const row: CanvasEmailOutboxRow = { id: "event-uuid-test", user_id: "private-user-id", course_id: "private-course-id", canvas_assignment_id: "123", canvas_announcement_id: null, type: "deadline_3_day", due_revision: 2, dedupe_key: "private-dedupe-key", payload: { title: "Network Security Activity", course: "CIT5", due_at: "2026-10-06T15:59:00Z", timezone: "Asia/Manila", old_due_at: "2026-10-10T15:59:00Z" }, scheduled_for: "2026-10-03T00:00:00Z", sent_at: null, failed_at: null, skipped_at: null, first_attempt_at: "2026-10-03T00:00:00Z", retry_count: 1, last_error: null, lease_owner: "worker", lease_expires_at: null, message_id: null, created_at: "2026-10-03T00:00:00Z" };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-03T08:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
function fixture(event: CanvasEmailOutboxRow, overrides: { prefs?: ReturnType<typeof defaultNotificationPreferences>; pending?: boolean; revision?: number; due?: string; sendFailure?: boolean } = {}) {
  const updates: Record<string, unknown>[] = [];
  let claimed = false;
  const rpc = vi.fn(async (name: string) => {
    if (name !== "claim_canvas_email_outbox_v1") return { data: overrides.pending ?? true, error: null };
    const data = claimed ? [] : [event]; claimed = true; return { data, error: null };
  });
  const from = (table: string) => {
    const values: Record<string, unknown> = {
      notification_preferences: overrides.prefs ?? defaultNotificationPreferences(), canvas_courses: { canvas_connection_id: "connection" }, canvas_course_sync_preferences: { selected: true }, canvas_connections: { status: "active" },
      canvas_assignments: { id: "local-assignment", due_at: overrides.due ?? new Date(Date.now() + 43200000).toISOString(), published: true }, canvas_notification_assignment_state: { due_revision: overrides.revision ?? 2 }, canvas_announcements: { published: true, workflow_state: "active" },
    };
    let update: Record<string, unknown> | null = null;
    const builder = {
      select: () => builder, eq: () => builder,
      update: (patch: Record<string, unknown>) => { update = patch; return builder; },
      maybeSingle: async () => ({ data: values[table], error: null }),
      then: (resolve: (value: unknown) => unknown) => { if (update) updates.push(update); return Promise.resolve(resolve({ data: [{ id: event.id }], error: null })); },
    };
    return builder;
  };
  const client = { rpc, from, auth: { admin: { getUserById: async () => ({ data: { user: { email: "student@example.org", email_confirmed_at: "2026-01-01" } }, error: null }) } } } as unknown as SupabaseClient<Database>;
  const send = vi.fn().mockResolvedValue(overrides.sendFailure ? { ok: false, code: "email_delivery_failed", retryable: true } : { ok: true, messageId: "receipt" });
  return { client, send, updates };
}
describe("Canvas email delivery", () => {
  it("preserves queued events when Resend configuration is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("RESEND_FROM_EMAIL", "");
    const { client } = fixture(row);
    await expect(processCanvasEmailOutbox(client, "worker", Date.now() + 60000)).rejects.toThrow("canvas_email_not_configured");
    expect(client.rpc).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
  it.each(EMAIL_NOTIFICATION_TYPES)("renders and sends %s using the existing provider with a stable event ID", async type => {
    const event = { ...row, type, canvas_announcement_id: type === "announcement" ? "announcement" : null, canvas_assignment_id: type === "announcement" ? null : "123" };
    const { client, send, updates } = fixture(event);
    expect((await processCanvasEmailOutbox(client, "worker", Date.now() + 60000, send)).sent).toBe(1);
    expect(send).toHaveBeenCalledWith({ type: "canvas_notification", eventId: row.id, recipient: "student@example.org", ...renderCanvasEmail(event) });
    expect(updates[0]?.message_id).toBe("receipt");
    expect(JSON.stringify(renderCanvasEmail(event))).not.toContain("private-");
  });
  it.each(EMAIL_NOTIFICATION_TYPES)("suppresses queued %s when global email was disabled", async type => {
    const { client, send } = fixture({ ...row, type }, { prefs: { ...defaultNotificationPreferences(), email_enabled: false } });
    expect((await processCanvasEmailOutbox(client, "worker", Date.now() + 60000, send)).skipped).toBe(1); expect(send).not.toHaveBeenCalled();
  });
  it.each(["announcement_email", "deadline_7_day"] as const)("respects a disabled individual %s preference at send time", async key => {
    const type = key === "announcement_email" ? "announcement" : "deadline_7_day";
    const { client, send } = fixture({ ...row, type }, { prefs: { ...defaultNotificationPreferences(), [key]: false } });
    await processCanvasEmailOutbox(client, "worker", Date.now() + 60000, send); expect(send).not.toHaveBeenCalled();
  });
  it.each([{ pending: false }, { revision: 3 }, { due: "2000-01-01T00:00:00Z" }])("suppresses completed, rescheduled or overdue queued reminders: %s", async overrides => {
    const { client, send } = fixture(row, overrides);
    await processCanvasEmailOutbox(client, "worker", Date.now() + 60000, send); expect(send).not.toHaveBeenCalled();
  });
  it("stores a retry with a safe error and releases the lease after temporary failure", async () => {
    const { client, send, updates } = fixture(row, { sendFailure: true });
    expect((await processCanvasEmailOutbox(client, "worker", Date.now() + 60000, send)).failed).toBe(1);
    expect(updates[0]).toMatchObject({ failed_at: null, last_error: "email_delivery_failed", lease_owner: null });
  });
  it("defers a retry before the saved reminder time without consuming a delivery attempt", async () => {
    vi.setSystemTime(new Date("2026-10-03T00:00:00Z"));
    const { client, send, updates } = fixture(row);
    await processCanvasEmailOutbox(client, "worker", Date.now() + 60000, send);
    expect(send).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ retry_count: 0, first_attempt_at: null, lease_owner: null });
    expect(updates[0]?.scheduled_for).toBe("2026-10-03T00:05:00.000Z");
  });
});
