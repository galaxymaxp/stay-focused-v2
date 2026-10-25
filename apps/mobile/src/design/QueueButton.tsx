import { useIsFocused } from "expo-router/react-navigation";
import { useQueueItems } from "../features/queue/useQueueItems";
import { memo, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { QueueOrb } from '../features/queue/QueueOrb';
import { useOrbInteraction } from '../features/generation-core/orbInteraction';
import { useAppActivity } from "./appActivity";
import { haptic } from "./haptics";
import { motion, shouldAnimate, useTheme } from "./theme";
import { hitTarget } from "./tokens";

const ORB_SIZE = 26;

/**
 * The header Queue control uses a cached still of the Today glass body.
 * While Stay Focused is generating or syncing, the orb turns
 * slowly, and a count on its left shows how much work is in
 * the queue. Either way a tap opens Queue.
 */
export const QueueButton = memo(function QueueButton() {
  const { colors, mode, reducedMotion, active: appActive } = useTheme();
  const interaction = useOrbInteraction();
  const { active, generating, queued, syncing } = useAppActivity();
  const focused = useIsFocused();
  const queue = useQueueItems();
  const anchor = useRef<View>(null);
  const { width } = useWindowDimensions();
  const count = generating;
  const working = useRef(new Animated.Value(active ? 1 : 0)).current;
  const turn = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(count > 0 ? 1 : 0)).current;

  useEffect(() => {
    const to = active ? 1 : 0;
    if (reducedMotion || !appActive || !focused) { working.stopAnimation(); working.setValue(to); }
    else
      Animated.timing(working, {
        toValue: to,
        duration: motion.spatial,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    return () => working.stopAnimation();
  }, [active, appActive, focused, reducedMotion, working]);

  useEffect(() => {
    const to = count > 0 ? 1 : 0;
    if (reducedMotion || !appActive || !focused) { badge.stopAnimation(); badge.setValue(to); }
    else
      Animated.spring(badge, {
        toValue: to,
        ...motion.spring,
        useNativeDriver: true,
      }).start();
    return () => badge.stopAnimation();
  }, [appActive, badge, count, focused, reducedMotion]);

  const spinning = active && shouldAnimate(reducedMotion, appActive, focused);
  useEffect(() => {
    if (!spinning) {
      turn.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        isInteraction: false,
        useNativeDriver: true,
      }),
    );
    turn.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [spinning, turn]);

  const status =
    syncing && count === 0
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
        anchor.current?.measureInWindow((x, y, w, h) =>
          queue.show({ top: y + h, right: Math.max(16, width - x - w) }),
        );
        if (!anchor.current) queue.show();
      }}
      style={({ pressed }) => ({
        minHeight: hitTarget.min,
        minWidth: hitTarget.min,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        opacity: pressed ? 0.6 : 1,
      })}
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
            transform: [
              {
                scale: badge.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          }}
        >
          <Text
            style={{
              color: colors.onAccent,
              fontSize: 12,
              lineHeight: 15,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
            }}
          >
            {count}
          </Text>
        </Animated.View>
      ) : null}
      {queue.unseenError ? (
        <View
          testID="queue-error-dot"
          accessibilityLabel="Queue has a new failure"
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.warning,
          }}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          width: ORB_SIZE,
          height: ORB_SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <QueueOrb size={ORB_SIZE} mode={mode} interaction={interaction} live={appActive && focused} reducedMotion={reducedMotion} />
        </Animated.View>
      </View>
    </Pressable>
  );
});
