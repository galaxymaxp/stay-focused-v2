export const EMAIL_NOTIFICATION_TYPES = ["announcement", "new_assignment", "due_date_change", "deadline_7_day", "deadline_3_day", "deadline_due_today"] as const;
export type EmailNotificationType = typeof EMAIL_NOTIFICATION_TYPES[number];
export const EMAIL_PREFERENCE_KEYS = ["email_enabled", "announcement_email", "new_assignment_email", "due_date_change_email", "deadline_7_day", "deadline_3_day", "deadline_due_today"] as const;
export type EmailPreferenceKey = typeof EMAIL_PREFERENCE_KEYS[number];
export interface NotificationPreferences {
  email_enabled: boolean;
  announcement_email: boolean;
  new_assignment_email: boolean;
  due_date_change_email: boolean;
  deadline_7_day: boolean;
  deadline_3_day: boolean;
  deadline_due_today: boolean;
  reminder_time: string;
  timezone: string;
}
export function defaultNotificationPreferences(timezone = "UTC"): NotificationPreferences {
  return { email_enabled: true, announcement_email: true, new_assignment_email: true, due_date_change_email: true, deadline_7_day: true, deadline_3_day: true, deadline_due_today: true, reminder_time: "08:00", timezone: validNotificationTimezone(timezone) ? timezone : "UTC" };
}
export function validNotificationTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}
export function parseNotificationPreferencePatch(value: unknown): Partial<NotificationPreferences> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const patch: Partial<NotificationPreferences> = {};
  for (const [key, entry] of Object.entries(value)) {
    if ((EMAIL_PREFERENCE_KEYS as readonly string[]).includes(key)) {
      if (typeof entry !== "boolean") return null;
      patch[key as EmailPreferenceKey] = entry;
    } else if (key === "reminder_time") {
      if (typeof entry !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry) || entry === "00:00") return null;
      patch.reminder_time = entry;
    } else if (key === "timezone") {
      if (!validNotificationTimezone(entry)) return null;
      patch.timezone = entry;
    } else return null;
  }
  return patch;
}
export function notificationEmailEnabled(preferences: NotificationPreferences, type: EmailNotificationType): boolean {
  const key = { announcement: "announcement_email", new_assignment: "new_assignment_email", due_date_change: "due_date_change_email", deadline_7_day: "deadline_7_day", deadline_3_day: "deadline_3_day", deadline_due_today: "deadline_due_today" } as const;
  return preferences.email_enabled && preferences[key[type]];
}
