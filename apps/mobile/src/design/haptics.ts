import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

/**
 * One haptic vocabulary for the app, modelled on iOS:
 *
 * - `tap`: a light tick when a button is pressed.
 * - `select`: a selection changed (segments, chips, tabs, a swipe crossing its threshold).
 * - `press`: something heavier was grabbed (long press, a full swipe, a sheet let go).
 * - `success` / `warning` / `error`: an outcome the student should notice.
 *
 * Android uses the system's own haptic constants (they follow the device's
 * touch-feedback setting and need no permission). Builds without the native
 * module fall back to a short vibration, so nothing throws.
 */
type Kind = "tap" | "select" | "press" | "success" | "warning" | "error";

const ANDROID: Record<Kind, Haptics.AndroidHaptics> = {
  tap: Haptics.AndroidHaptics.Virtual_Key,
  select: Haptics.AndroidHaptics.Segment_Tick,
  press: Haptics.AndroidHaptics.Long_Press,
  success: Haptics.AndroidHaptics.Confirm,
  warning: Haptics.AndroidHaptics.Reject,
  error: Haptics.AndroidHaptics.Reject,
};
const FALLBACK: Record<Kind, number | number[]> = {
  tap: 6,
  select: 5,
  press: 14,
  success: [0, 10, 70, 16],
  warning: [0, 18, 80, 18],
  error: [0, 22, 60, 22, 60, 22],
};

let enabled = true;
/** Settings can turn every haptic off. */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function fallback(kind: Kind) {
  try {
    Vibration.vibrate(FALLBACK[kind]);
  } catch {
    // Vibration is an enhancement.
  }
}

function play(kind: Kind) {
  if (!enabled) return;
  let pending: Promise<void>;
  try {
    if (Platform.OS === "web") return;
    if (Platform.OS === "android") pending = Haptics.performAndroidHapticsAsync(ANDROID[kind]);
    else if (kind === "tap") pending = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === "select") pending = Haptics.selectionAsync();
    else if (kind === "press") pending = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else pending = Haptics.notificationAsync(
      kind === "success" ? Haptics.NotificationFeedbackType.Success : kind === "warning" ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error,
    );
  } catch {
    fallback(kind);
    return;
  }
  void Promise.resolve(pending).catch(() => fallback(kind));
}

export const haptic = {
  tap: () => play("tap"),
  select: () => play("select"),
  press: () => play("press"),
  success: () => play("success"),
  warning: () => play("warning"),
  error: () => play("error"),
};
