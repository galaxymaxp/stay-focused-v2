"use client";
import { useEffect, useState } from "react";
import { EMAIL_PREFERENCE_KEYS, parseNotificationPreferencePatch, type NotificationPreferences } from "@stay-focused/shared/notification-preferences";
import { useAuth } from "../components/providers";
import { Notice, State } from "../components/ui";
import { useAction, useResource } from "../lib/hooks";

const labels = {
  email_enabled: "Email notifications", announcement_email: "New announcements",
  new_assignment_email: "New tasks / assignments", due_date_change_email: "Due date changes",
  deadline_7_day: "Due within 1 week", deadline_3_day: "3 days before", deadline_due_today: "Due today",
};
export function NotificationSettings() {
  const { api } = useAuth();
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const resource = useResource<{ preferences: NotificationPreferences }>(`/api/notification-preferences?timezone=${encodeURIComponent(timezone)}`);
  const automatic = useResource<{ enabled: boolean }>("/api/auto-reviewer-preferences");
  const [automaticEnabled, setAutomaticEnabled] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const action = useAction();
  useEffect(() => { setPreferences(resource.data?.preferences ?? null); }, [resource.data]);
  useEffect(() => { if (automatic.data) setAutomaticEnabled(automatic.data.enabled); }, [automatic.data]);
  async function save(patch: Partial<NotificationPreferences>) {
    if (!parseNotificationPreferencePatch(patch)) throw new Error("Choose a reminder time after midnight and a valid timezone.");
    const value = await api<{ preferences: NotificationPreferences }>("/api/notification-preferences", { method: "PATCH", body: patch });
    setPreferences(value.preferences);
  }
  return <>
    <section className="surface stack">
      <h2>Canvas reviewers</h2>
      <State resource={automatic} />
      {automatic.data && <label className="check-row"><input type="checkbox" checked={automaticEnabled} disabled={action.busy} onChange={event => {
        const enabled = event.target.checked;
        const previous = automaticEnabled;
        setAutomaticEnabled(enabled);
        void action.run(async () => {
          try { await api("/api/auto-reviewer-preferences", { method: "PATCH", body: { enabled } }); automatic.refresh(); }
          catch (error) { setAutomaticEnabled(previous); throw error; }
        });
      }} />Create reviewers automatically</label>}
      <p className="muted">Create a reviewer when Canvas sync finds new lecture material. Turning this off keeps your saved reviewers.</p>
    </section>
    <section className="surface stack">
      <h2>Notifications</h2>
      <State resource={resource} />
      {preferences && <>
        {EMAIL_PREFERENCE_KEYS.map(key => <label className="check-row" key={key}>
          <input type="checkbox" checked={preferences[key]} disabled={action.busy} onChange={event => { const value = event.target.checked; void action.run(() => save({ [key]: value })); }} />{labels[key]}
        </label>)}
        <p className="muted">Your choices stay saved while email is off.</p>
        <label>Reminder time<input type="time" value={preferences.reminder_time} disabled={action.busy} onChange={event => setPreferences({ ...preferences, reminder_time: event.target.value })} /></label>
        <label>Timezone<input value={preferences.timezone} disabled={action.busy} onChange={event => setPreferences({ ...preferences, timezone: event.target.value })} maxLength={100} /></label>
        <button disabled={action.busy} onClick={() => void action.run(() => save({ reminder_time: preferences.reminder_time, timezone: preferences.timezone }))}>Save reminder schedule</button>
      </>}
      {action.message && <Notice error>{action.message}</Notice>}
    </section>
  </>;
}
