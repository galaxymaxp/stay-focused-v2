import { FREE_TIME_ERROR, validFreeTime } from "@stay-focused/shared";
import { Ellipsis } from "lucide-react-native";
import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Action, Copy } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { radius, spacing, typography } from "../../design/tokens";

export interface ClockTimeFields { hour: string; minute: string; pm: boolean }
export function clockTimeFields(value: number, hour12: boolean): ClockTimeFields {
  const hour = Math.floor(value / 60) % 24;
  return { hour: String(hour12 ? hour % 12 || 12 : hour).padStart(2, "0"), minute: String(value % 60).padStart(2, "0"), pm: hour >= 12 };
}
export function clockTimeMinutes(value: ClockTimeFields, hour12: boolean) {
  if (!/^\d{1,2}$/.test(value.hour) || !/^\d{1,2}$/.test(value.minute)) return NaN;
  const hour = Number(value.hour), minute = Number(value.minute);
  if (minute > 59 || hour < (hour12 ? 1 : 0) || hour > (hour12 ? 12 : 23)) return NaN;
  return (hour12 ? hour % 12 + (value.pm ? 12 : 0) : hour) * 60 + minute;
}
/** Measured native Modal, matching ReviewerActions and the existing safe-area bounds. */
export function ClockOptions({ start, end, locked, onToggleLock, onCommit, disabled }: {
  start: number; end: number; locked: boolean; onToggleLock: () => void;
  onCommit: (start: number, end: number) => void; disabled: boolean;
}) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const [hour12] = useState(() => {
    const cycle = Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
    return cycle === "h11" || cycle === "h12";
  });
  const [from, setFrom] = useState(() => clockTimeFields(start, hour12));
  const [to, setTo] = useState(() => clockTimeFields(end, hour12));
  const [error, setError] = useState<string | null>(null);
  const close = () => setAnchor(null);
  const top = anchor ? Math.max(insets.top, Math.min(anchor.top, height / 2)) : 0;
  const fields = (label: string, value: ClockTimeFields, update: (value: ClockTimeFields) => void) => <View style={{ gap: spacing[1] }}>
    <Copy size="caption" muted>{label}</Copy>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
      {(["hour", "minute"] as const).map((part, index) => <TextInput key={part} accessibilityLabel={index === 0 ? label : `${label} minute`}
        keyboardType="number-pad" maxLength={2} value={value[part]} selectTextOnFocus
        onChangeText={text => { update({ ...value, [part]: text }); setError(null); }}
        style={{ width: 58, minHeight: 44, borderWidth: 1, borderColor: colors.separator, borderRadius: radius.control,
          color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, textAlign: "center", fontSize: typography.body }} />)}
      {hour12 && <Pressable accessibilityRole="button" accessibilityLabel={`${label} AM or PM`} onPress={() => update({ ...value, pm: !value.pm })}
        style={{ minHeight: 44, paddingHorizontal: spacing[2], justifyContent: "center" }}><Copy>{value.pm ? "PM" : "AM"}</Copy></Pressable>}
    </View>
  </View>;
  return <>
    <View ref={trigger} collapsable={false} style={{ position: "absolute", top: 0, right: 0 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Clock options" accessibilityState={{ expanded: !!anchor }}
        onPress={() => {
          setFrom(clockTimeFields(start, hour12)); setTo(clockTimeFields(end, hour12)); setError(null);
          trigger.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h, right: Math.max(insets.right + spacing[2], width - x - w) }));
        }} style={({ pressed }) => ({ width: 44, height: 44, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.55 : 1 })}>
        <Ellipsis size={20} color={colors.textMuted} />
      </Pressable>
    </View>
    {anchor && <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close clock options" onPress={close} style={{ position: "absolute", inset: 0 }} />
        <View accessibilityViewIsModal style={{ position: "absolute", top, right: anchor.right,
          width: Math.min(width - insets.left - insets.right - spacing[4], 300), maxHeight: height - top - insets.bottom - spacing[4],
          backgroundColor: colors.surfaceElevated, borderColor: colors.separator, borderWidth: 1, borderRadius: radius.card, padding: spacing[3] }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing[3] }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Copy>Lock clock</Copy><Switch accessibilityLabel="Lock clock" value={locked} onValueChange={onToggleLock} />
            </View>

            <Copy size="h3">Free time</Copy>
            {fields("Free time starts", from, setFrom)}
            {fields("Free time ends", to, setTo)}
            {error && <View accessibilityRole="alert"><Copy color={colors.danger}>{error}</Copy></View>}
            <Action disabled={disabled} onPress={() => {
              const nextStart = clockTimeMinutes(from, hour12), nextEnd = clockTimeMinutes(to, hour12);
              if (!validFreeTime({ start: nextStart, end: nextEnd })) { setError(FREE_TIME_ERROR); return; }
              onCommit(nextStart, nextEnd); close();
            }}>Save free time</Action>
          </ScrollView>
        </View>
      </View>
    </Modal>}
  </>;
}
