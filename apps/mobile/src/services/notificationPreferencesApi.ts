import { parseNotificationPreferencePatch, type NotificationPreferences } from "@stay-focused/shared/notification-preferences";
import { experienceRequest, type ExperienceClient } from "./experienceApi";

export async function loadNotificationPreferences(client: ExperienceClient, timezone: string): Promise<NotificationPreferences> {
  return (await experienceRequest<{ preferences: NotificationPreferences }>(client, `/api/notification-preferences?timezone=${encodeURIComponent(timezone)}`)).preferences;
}
export async function saveNotificationPreferences(client: ExperienceClient, patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  if (!parseNotificationPreferencePatch(patch)) throw new Error("invalid_notification_preferences");
  return (await experienceRequest<{ preferences: NotificationPreferences }>(client, "/api/notification-preferences", { method: "PATCH", body: patch })).preferences;
}
