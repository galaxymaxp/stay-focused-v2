import { router } from "expo-router";
import { AlertCircle, RefreshCw } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Copy } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { hitTarget, spacing } from "../../design/tokens";
import { describeSyncState } from "../../services/canvasAccountSync";
import { useCanvasSync } from "./CanvasSyncProvider";

/**
 * One quiet line that states how fresh Canvas data is. It becomes prominent
 * only when something needs the student: a failure, offline, or setup.
 */
export function SyncStatus() {
  const { snapshot, sync } = useCanvasSync();
  const { colors } = useTheme();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const state = describeSyncState(snapshot, now);
  const syncing = snapshot.phase === "syncing";
  const attention = state.action !== null;
  const onAction = () => {
    if (state.action === "settings") router.push("/canvas-settings");
    else void sync();
  };
  return (
    <View
      accessibilityLiveRegion="polite"
      testID="canvas-sync-status"
      style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], minHeight: 32 }}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : attention ? (
        <AlertCircle size={15} color={colors.warning} strokeWidth={1.8} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Copy size="caption" color={attention ? colors.textPrimary : colors.textSecondary} style={{ fontWeight: attention ? "600" : "400" }}>
          {state.title}
          {state.detail ? <Copy size="caption" muted>{`  ·  ${state.detail}`}</Copy> : null}
        </Copy>
      </View>
      {syncing ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state.action === "settings" ? "Open Canvas settings" : attention ? "Retry Canvas sync" : "Sync Canvas now"}
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: hitTarget.min, minWidth: hitTarget.min, alignItems: "flex-end", justifyContent: "center", opacity: pressed ? 0.55 : 1 })}
        >
          {attention ? (
            <Copy size="caption" color={colors.accent} style={{ fontWeight: "600" }}>
              {state.action === "settings" ? "Open" : "Retry"}
            </Copy>
          ) : (
            <RefreshCw size={16} color={colors.textSecondary} strokeWidth={1.8} />
          )}
        </Pressable>
      )}
    </View>
  );
}
