import { useState } from "react";
import { View } from "react-native";
import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { Action, Copy, Notice, Surface } from "../../design/primitives";
import { spacing } from "../../design/tokens";
import { disableCompletionNotifications, enableCompletionNotifications, sendCompletionNotificationTest } from "../../services/completionNotifications";

export function CompletionNotificationSettings() {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function run(action: typeof enableCompletionNotifications, success: string) {
    const apiBaseUrl = getApiBaseUrl();
    if (busy || !session || !apiBaseUrl) return;
    setBusy(true);
    try {
      const result = await action({ apiBaseUrl, accessToken: session.accessToken });
      setMessage(result.ok ? success : result.message);
    } catch { setMessage("The notification service is unavailable. Please try again."); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: spacing[2] }}>
    <Copy muted size="caption">Device notifications</Copy>
    <Surface style={{ gap: spacing[2] }}>
      <Copy>Know when your study material is ready.</Copy>
      <Action disabled={busy} onPress={() => void run(enableCompletionNotifications, "Notifications enabled on this device.")}>Enable notifications</Action>
      <Action secondary disabled={busy} onPress={() => void run(sendCompletionNotificationTest, "Test notification queued.")}>Send test notification</Action>
      <Action secondary disabled={busy} onPress={() => void run(disableCompletionNotifications, "Notifications disabled on this device.")}>Disable notifications</Action>
      {message ? <Notice>{message}</Notice> : null}
    </Surface>
  </View>;
}
