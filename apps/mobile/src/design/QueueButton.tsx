import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { memo, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import orbDark from "../../assets/queue/orb-dark.png";
import orbLight from "../../assets/queue/orb-light.png";
import { useAppActivity } from "./appActivity";
import { haptic } from "./haptics";
import { motion, shouldAnimate, useTheme } from "./theme";
import { hitTarget } from "./tokens";

/** Still frames of the Knowledge Core, captured from the device render. */
const ORB = { dark: orbDark, light: orbLight } as const;
const ORB_SIZE = 26;

/**
 * The header Queue control is the Knowledge Core in miniature. Idle, it is a
 * still glass orb. While Stay Focused is generating or syncing, the orb turns
 * slowly inside a soft glow, and a count on its left shows how much work is in
 * the queue. Either way a tap opens Queue.
 */
export const QueueButton = memo(function QueueButton() {
  const { colors, mode, reducedMotion, active: appActive } = useTheme();
  const { active, generating, queued, syncing } = useAppActivity();
  const focused = useIsFocused();
  const count = generating + queued;
  const working = useRef(new Animated.Value(active ? 1 : 0)).current;
  const turn = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(count > 0 ? 1 : 0)).current;

  useEffect(() => {
    const to = active ? 1 : 0;
    if (reducedMotion) working.setValue(to);
    else Animated.timing(working, { toValue: to, duration: motion.spatial, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [active, reducedMotion, working]);

  useEffect(() => {
    const to = count > 0 ? 1 : 0;
    if (reducedMotion) badge.setValue(to);
    else Animated.spring(badge, { toValue: to, ...motion.spring, useNativeDriver: true }).start();
  }, [badge, count, reducedMotion]);

  const spinning = active && shouldAnimate(reducedMotion, appActive, focused);
  useEffect(() => {
    if (!spinning) {
      turn.stopAnimation();
      return;
    }
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 9000, easing: Easing.linear, isInteraction: false, useNativeDriver: true }));
    turn.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [spinning, turn]);

  const status = syncing && count === 0
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
      onPress={() => {
        haptic.tap();
        router.push("/generation-queue");
      }}
      style={({ pressed }) => ({ minHeight: hitTarget.min, minWidth: hitTarget.min, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, opacity: pressed ? 0.6 : 1 })}
    >
      {count > 0 ? (
        <Animated.View
          testID="queue-count"
          style={{
            minWidth: 20,
            height: 20,
            paddingHorizontal: 6,
            borderRadius: 10,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: badge,
            transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          <Text style={{ color: colors.onAccent, fontSize: 12, lineHeight: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{count}</Text>
        </Animated.View>
      ) : null}
      <View style={{ width: ORB_SIZE, height: ORB_SIZE, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: ORB_SIZE + 14,
            height: ORB_SIZE + 14,
            borderRadius: (ORB_SIZE + 14) / 2,
            backgroundColor: colors.accent,
            opacity: working.interpolate({ inputRange: [0, 1], outputRange: [0, mode === "dark" ? 0.22 : 0.16] }),
            transform: [{ scale: working.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        />
        <Animated.Image
          source={ORB[mode]}
          accessibilityIgnoresInvertColors
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
          }}
        />
      </View>
    </Pressable>
  );
});
