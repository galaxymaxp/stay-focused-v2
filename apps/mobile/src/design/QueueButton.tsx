import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { Layers } from "lucide-react-native";
import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { ActivityOrb } from "./ActivityOrb";
import { useAppActivity } from "./appActivity";
import { motion, shouldAnimate, useTheme } from "./theme";
import { density, hitTarget, radius } from "./tokens";

/**
 * The header Queue control. Idle, it is the familiar Queue icon; while Stay
 * Focused is syncing or generating, the icon dissolves into the mini activity
 * orb and dissolves back when everything finishes. Either way a tap opens
 * Queue: the orb is an indicator, not a new button.
 */
export const QueueButton = memo(function QueueButton() {
  const { colors, reducedMotion, active: appActive } = useTheme();
  const { active, generating, queued, syncing } = useAppActivity();
  const focused = useIsFocused();
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  // The orb is mounted only while shown or fading, so idle costs nothing.
  const [orbMounted, setOrbMounted] = useState(active);

  useEffect(() => {
    if (active) setOrbMounted(true);
    progress.stopAnimation();
    const settle = ({ finished }: { finished: boolean }) => {
      if (finished && !active) setOrbMounted(false);
    };
    if (reducedMotion) {
      progress.setValue(active ? 1 : 0);
      settle({ finished: true });
      return;
    }
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: motion.spatial,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(settle);
  }, [active, progress, reducedMotion]);

  const iconStyle = useRef({
    opacity: progress.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: "clamp" }),
    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }],
  }).current;
  const orbStyle = useRef({
    opacity: progress.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: "clamp" }),
    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
  }).current;

  const status = syncing && generating + queued === 0
    ? "Canvas syncing"
    : generating > 0
      ? `${generating} generating${queued ? `, ${queued} queued` : ""}`
      : queued > 0
        ? `${queued} queued`
        : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status ? `Open Queue, ${status}` : "Open Queue"}
      testID="queue-button"
      onPress={() => router.push("/generation-queue")}
      style={({ pressed }) => ({ minWidth: hitTarget.min, minHeight: hitTarget.min, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ width: density.utilitySize, height: density.utilitySize, borderRadius: radius.pill, backgroundColor: colors.surfacePrimary, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={iconStyle}>
          <Layers color={colors.textSecondary} size={density.utilityIcon} />
        </Animated.View>
        {orbMounted ? (
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }, orbStyle]}>
            <ActivityOrb size={18} running={active && shouldAnimate(reducedMotion, appActive, focused)} />
          </Animated.View>
        ) : null}
      </View>
    </Pressable>
  );
});
