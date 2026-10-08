import { ASSIST_LABELS, ASSIST_RESULT_LABELS, ASSIST_TYPES, type AssistType } from "@stay-focused/shared";
import { AlertCircle, Sparkles, X } from "lucide-react-native";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Pressable, View } from "react-native";

import { Copy } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { radius, spacing } from "../../design/tokens";
import type { AssistMark, AssistReadyEvent } from "./assistStore";

/**
 * One breathing loop shared by every passage that is generating, on the native
 * driver, so any number of pending passages cost a single animation.
 */
const pulse = new Animated.Value(0);
let pulseUsers = 0;
let pulseLoop: Animated.CompositeAnimation | null = null;
function useSharedPulse(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    pulseUsers += 1;
    if (!pulseLoop) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
          Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
        ]),
      );
      pulseLoop.start();
    }
    return () => {
      pulseUsers -= 1;
      if (pulseUsers === 0) {
        pulseLoop?.stop();
        pulseLoop = null;
      }
    };
  }, [enabled]);
}

/**
 * The tint behind a Reviewer passage: it breathes blue while Study Assist is
 * generating for it, and stays green once a result is ready until the student
 * opens it. Selected key points (hold to select) get the accent tint.
 */
export function PassageMark({ mark, selected = false, quiet = false, onPress, children }: { mark: AssistMark; selected?: boolean; quiet?: boolean; onPress?: () => void; children: ReactNode }) {
  const { colors, reducedMotion } = useTheme();
  const pending = mark === "pending";
  useSharedPulse(pending && !reducedMotion);
  const fill = selected ? colors.blueSoft : pending ? colors.blueSoft : mark === "fresh" ? colors.greenSoft : null;
  return (
    <View style={{ position: "relative" }}>
      {fill ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -4,
            bottom: -4,
            left: quiet ? -8 : -10,
            right: quiet ? -8 : -10,
            borderRadius: 10,
            backgroundColor: fill,
            opacity: pending && !reducedMotion ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) : 1,
          }}
        />
      ) : null}
      {children}
      {!quiet && mark ? (
        <Pressable accessibilityLiveRegion="polite" disabled={!onPress} onPress={onPress} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: spacing[2], alignSelf: "flex-start" }}>
          {pending ? null : <Sparkles size={13} color={colors.green} strokeWidth={2.2} />}
          <Copy size="caption" color={pending ? colors.blue : colors.green} style={{ fontWeight: "600" }}>
            {pending ? "Study Assist is working…" : "Ready. Tap to view"}
          </Copy>
        </Pressable>
      ) : null}
    </View>
  );
}

const SHORT: Record<AssistType, string> = { summarize: "Summarize", explain_simply: "Simplify", analogy: "Analogy", example: "Example" };

/** Floating actions while key points are selected. */
export function PickBar({ count, onAll, onNone, onCancel, onGenerate }: {
  count: number;
  onAll: () => void;
  onNone: () => void;
  onCancel: () => void;
  onGenerate: (type: AssistType) => void;
}) {
  const { colors } = useTheme();
  return (
    <FloatingCard>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
        <Copy size="bodySmall" style={{ flex: 1, fontWeight: "600" }}>
          {count === 0 ? "Select key points" : `${count} key point${count === 1 ? "" : "s"} selected`}
        </Copy>
        <Pressable accessibilityRole="button" onPress={count ? onNone : onAll} hitSlop={8} style={({ pressed }) => ({ paddingHorizontal: spacing[2], paddingVertical: 6, opacity: pressed ? 0.55 : 1 })}>
          <Copy size="caption" color={colors.accent} style={{ fontWeight: "600" }}>{count ? "Clear" : "Select all"}</Copy>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel selection" onPress={onCancel} hitSlop={8} style={({ pressed }) => ({ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.55 : 1 })}>
          <X size={15} color={colors.textSecondary} strokeWidth={2.2} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        {ASSIST_TYPES.map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`${ASSIST_LABELS[type]} each selected key point`}
            accessibilityState={{ disabled: count === 0 }}
            disabled={count === 0}
            onPress={() => onGenerate(type)}
            style={({ pressed }) => ({ flex: 1, minHeight: 40, borderRadius: radius.control, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent, opacity: count === 0 ? 0.4 : pressed ? 0.8 : 1 })}
          >
            <Copy size="caption" color={colors.onAccent} style={{ fontWeight: "600" }}>{SHORT[type]}</Copy>
          </Pressable>
        ))}
      </View>
    </FloatingCard>
  );
}

/** Appears when a Study Assist result lands while its sheet is closed. */
export function ReadyBanner({ event, onView, onDismiss }: { event: AssistReadyEvent; onView: () => void; onDismiss: () => void }) {
  const { colors } = useTheme();
  const passage = event.target.pointIndex !== undefined ? event.target.selection.block.keyPoints[event.target.pointIndex] : event.target.selection.block.title;
  return (
    <FloatingCard>
      <Pressable accessibilityRole="button" accessibilityLabel={event.ok ? `${ASSIST_RESULT_LABELS[event.type]} ready. View` : "Study Assist could not finish. View"} onPress={onView} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing[3], opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: event.ok ? colors.greenSoft : colors.orangeSoft }}>
          {event.ok ? <Sparkles size={17} color={colors.green} strokeWidth={2} /> : <AlertCircle size={17} color={colors.warning} strokeWidth={2} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Copy size="bodySmall" style={{ fontWeight: "600" }}>{event.ok ? `${ASSIST_RESULT_LABELS[event.type]} ready` : `${ASSIST_LABELS[event.type]} couldn’t finish`}</Copy>
          <Copy muted size="caption" numberOfLines={1}>{passage}</Copy>
        </View>
        <Copy size="bodySmall" color={colors.accent} style={{ fontWeight: "600" }}>View</Copy>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={10}>
          <X size={15} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
      </Pressable>
    </FloatingCard>
  );
}

function FloatingCard({ children }: { children: ReactNode }) {
  const { colors, mode, reducedMotion } = useTheme();
  const enter = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (!reducedMotion) Animated.spring(enter, { toValue: 1, damping: 18, stiffness: 220, mass: 0.8, useNativeDriver: true }).start();
  }, [enter, reducedMotion]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: spacing[4],
        right: spacing[4],
        bottom: spacing[4],
        gap: spacing[3],
        padding: spacing[4],
        borderRadius: radius.card,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.separator,
        shadowColor: "#000",
        shadowOpacity: mode === "dark" ? 0.5 : 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
