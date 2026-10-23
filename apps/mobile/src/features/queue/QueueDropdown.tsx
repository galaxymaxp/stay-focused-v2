import {
  Modal,
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Action, Copy } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { density, hitTarget, radius, spacing } from "../../design/tokens";
import { QueueContents } from "./QueueContents";
import { useQueueItems } from "./useQueueItems";

export function QueueDropdown() {
  const queue = useQueueItems();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, Math.min(queue.anchor.top, height / 3));
  const refreshing = queue.loading || queue.refreshing;
  // Native Modal handles Android Back via onRequestClose. No slide/scale motion.
  return (
    <Modal
      visible={queue.open}
      transparent
      animationType="none"
      onRequestClose={queue.close}
    >
      <View style={{ flex: 1 }}>
        <Pressable
          testID="queue-outside"
          accessibilityRole="button"
          accessibilityLabel="Close Queue"
          onPress={queue.close}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            position: "absolute",
            top,
            right: Math.min(queue.anchor.right, 20),
            width: Math.min(width - 32, 400),
            maxHeight: height - top - insets.bottom - 20,
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.separator,
            borderWidth: 1,
            borderRadius: radius.card,
            padding: spacing[3],
            gap: spacing[2],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing[2],
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Copy size="h2" style={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}>Queue</Copy>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh queue"
              accessibilityState={{ busy: refreshing, disabled: refreshing }}
              disabled={refreshing}
              onPress={() => { if (!refreshing) queue.refresh(); }}
              style={{ minWidth: hitTarget.min, minHeight: hitTarget.min, alignItems: "center", justifyContent: "center" }}
            >
              {refreshing ? <ActivityIndicator color={colors.accent} /> : <RefreshCw size={density.utilityIcon} color={colors.accent} />}
            </Pressable>
            <Action secondary style={{ minWidth: hitTarget.min }} onPress={queue.close}>
              Close
            </Action>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing[2] }}
          >
            {queue.open ? <QueueContents /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
