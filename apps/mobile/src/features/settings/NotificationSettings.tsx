import { useEffect, useState } from "react";
import { Pressable, Switch, TextInput, View } from "react-native";
import { type EmailPreferenceKey, type NotificationPreferences, parseNotificationPreferencePatch } from "@stay-focused/shared/notification-preferences";
import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { Copy, Notice, Surface } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { radius, spacing } from "../../design/tokens";
import { loadNotificationPreferences, saveNotificationPreferences } from "../../services/notificationPreferencesApi";

const UPDATES: readonly [EmailPreferenceKey, string][] = [["announcement_email", "New announcements"], ["new_assignment_email", "New tasks / assignments"], ["due_date_change_email", "Due date changes"]];
const REMINDERS: readonly [EmailPreferenceKey, string][] = [["deadline_7_day", "Due within 1 week"], ["deadline_3_day", "3 days before"], ["deadline_due_today", "Due today"]];
export function NotificationSettings() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState("08:00");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [reload, setReload] = useState(0);
  const userId = session?.user.id;
  const accessToken = session?.accessToken;
  useEffect(() => {
    let active = true;
    setPreferences(null);
    if (!userId || !accessToken) return;
    void loadNotificationPreferences({ baseUrl: getApiBaseUrl() ?? "", accessToken }, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC").then(value => {
      if (active) { setPreferences(value); setTime(value.reminder_time); setTimezone(value.timezone); setError(null); }
    }).catch(() => { if (active) setError("Could not load notification settings. Check your connection and retry."); });
    return () => { active = false; };
  }, [userId, accessToken, reload]);
  async function save(patch: Partial<NotificationPreferences>) {
    if (busy || !accessToken || !preferences) return;
    if (!parseNotificationPreferencePatch(patch)) { setError("Enter a time from 00:01 to 23:59 and a timezone such as Asia/Manila."); return; }
    setBusy(true); setError(null);
    try { setPreferences(await saveNotificationPreferences({ baseUrl: getApiBaseUrl() ?? "", accessToken }, patch)); }
    catch { setError("Could not save notification settings. Your previous settings are still saved."); }
    finally { setBusy(false); }
  }
  const toggle = (key: EmailPreferenceKey, label: string) => (
    <View key={key} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48, gap: spacing[3] }}>
      <Copy style={{ flex: 1 }}>{label}</Copy>
      <Switch accessibilityLabel={label} disabled={busy || !preferences} value={preferences?.[key] ?? false} onValueChange={value => void save({ [key]: value })} trackColor={{ false: colors.surfaceSecondary, true: colors.success }} thumbColor="#FFFFFF" />
    </View>
  );
  const inputStyle = { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, borderRadius: radius.control, padding: spacing[3], minHeight: 48 };
  return (
    <View style={{ gap: spacing[2] }}>
      <Copy muted size="caption" style={{ fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" }}>Notifications</Copy>
      <Surface style={{ gap: spacing[2] }}>
        {!preferences ? <Copy muted>{error ? "Notification settings are unavailable." : "Loading your notification settings…"}</Copy> : <>
          {toggle("email_enabled", "Email notifications")}
          <Copy muted size="caption">Canvas updates</Copy>
          {UPDATES.map(([key, label]) => toggle(key, label))}
          <Copy muted size="caption">Deadline reminders</Copy>
          {REMINDERS.map(([key, label]) => toggle(key, label))}
          <Copy muted size="caption">Individual choices stay saved while email notifications are off.</Copy>
          <Copy>Reminder time</Copy>
          <TextInput accessibilityLabel="Reminder time in 24-hour format" placeholder="08:00" placeholderTextColor={colors.textMuted} value={time} onChangeText={setTime} editable={!busy} maxLength={5} style={inputStyle} />
          <Copy muted size="caption">24-hour local time. Default: 8:00 AM.</Copy>
          <Copy>Timezone</Copy>
          <TextInput accessibilityLabel="Notification timezone" value={timezone} onChangeText={setTimezone} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={100} style={inputStyle} />
          <Pressable accessibilityRole="button" accessibilityLabel="Save reminder time and timezone" disabled={busy} onPress={() => void save({ reminder_time: time, timezone })} style={{ minHeight: 48, justifyContent: "center", opacity: busy ? 0.5 : 1 }}><Copy color={colors.accent}>{busy ? "Saving…" : "Save reminder schedule"}</Copy></Pressable>
          <Copy muted size="caption">Email</Copy><Copy>{session?.user.email ?? "No email address"}</Copy>
        </>}
        {error ? <><Notice>{error}</Notice><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={{ minHeight: 48, justifyContent: "center" }}><Copy color={colors.accent}>Reload settings</Copy></Pressable></> : null}
      </Surface>
    </View>
  );
}
