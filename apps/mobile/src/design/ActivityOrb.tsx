import { useEffect, useId, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useTheme } from "./theme";

/**
 * The header's "Stay Focused is working" mark: a small 2D echo of the
 * generation core, liquid light turning slowly inside a clear bead with a soft
 * glow that wavers irregularly. It is deliberately not a spinner and never
 * runs the full generation animation.
 *
 * Cost: every loop runs on the native driver, the gradients are drawn once,
 * and interpolations are created once, so nothing is computed or allocated in
 * JS per frame. `running` false (reduced motion, background, unfocused screen)
 * stops every loop and holds a still, readable frame.
 */
export function ActivityOrb({ size = 20, running }: { size?: number; running: boolean }) {
  const { colors, mode } = useTheme();
  const id = useId().replace(/:/g, "");
  // Incommensurate periods: the motion never settles into a visible rhythm.
  const swirl = useRef(new Animated.Value(0)).current;
  const counter = useRef(new Animated.Value(0)).current;
  const waverA = useRef(new Animated.Value(0)).current;
  const waverB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!running) {
      for (const value of [swirl, counter, waverA, waverB]) value.stopAnimation();
      return;
    }
    const sway = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), isInteraction: false, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: duration * 1.27, easing: Easing.inOut(Easing.sin), isInteraction: false, useNativeDriver: true }),
        ]),
      );
    const animation = Animated.parallel([
      Animated.loop(Animated.timing(swirl, { toValue: 1, duration: 6800, easing: Easing.linear, isInteraction: false, useNativeDriver: true })),
      Animated.loop(Animated.timing(counter, { toValue: 1, duration: 10300, easing: Easing.linear, isInteraction: false, useNativeDriver: true })),
      sway(waverA, 1900),
      sway(waverB, 3100),
    ]);
    animation.start();
    return () => animation.stop();
  }, [counter, running, swirl, waverA, waverB]);

  const style = useMemo(() => {
    const waver = Animated.add(waverA, waverB);
    return {
      glow: {
        opacity: waver.interpolate({ inputRange: [0, 2], outputRange: [0.16, 0.42] }),
        transform: [{ scale: waver.interpolate({ inputRange: [0, 1, 2], outputRange: [0.92, 1.06, 1.14] }) }],
      },
      // A liquid body is never perfectly round: two axes breathe out of step.
      body: {
        transform: [
          { scaleX: waverA.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1.035] }) },
          { scaleY: waverB.interpolate({ inputRange: [0, 1], outputRange: [1.03, 0.97] }) },
        ],
      },
      swirl: { transform: [{ rotate: swirl.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] },
      counter: { transform: [{ rotate: counter.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] }) }] },
    };
  }, [counter, swirl, waverA, waverB]);

  const glowSize = size * 1.5;
  const liquid = size * 1.3;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: glowSize, height: glowSize, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: glowSize / 2 }, style.glow]}>
        <Svg width={glowSize} height={glowSize}>
          <Defs>
            <RadialGradient id={`${id}-glow`}>
              <Stop offset="0.35" stopColor={colors.accent} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.violet} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill={`url(#${id}-glow)`} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: "hidden",
            backgroundColor: colors.violet,
            alignItems: "center",
            justifyContent: "center",
          },
          style.body,
        ]}
      >
        {/* Liquid light, offset from centre so its turning reads as flow. */}
        <Animated.View style={[{ position: "absolute", width: liquid, height: liquid, left: -size * 0.2, top: -size * 0.28 }, style.swirl]}>
          <Svg width={liquid} height={liquid}>
            <Defs>
              <RadialGradient id={`${id}-liquid`} cx="30%" cy="30%" r="70%">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={1} />
                <Stop offset="0.7" stopColor={colors.blue} stopOpacity={0.55} />
                <Stop offset="1" stopColor={colors.violet} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={liquid / 2} cy={liquid / 2} r={liquid / 2} fill={`url(#${id}-liquid)`} />
          </Svg>
        </Animated.View>
        <Animated.View style={[{ position: "absolute", width: size, height: size }, style.counter]}>
          <Svg width={size} height={size}>
            <Circle cx={size * 0.68} cy={size * 0.7} r={size * 0.2} fill={mode === "dark" ? "#FFFFFF" : colors.blueSoft} fillOpacity={0.55} />
          </Svg>
        </Animated.View>
        {/* The clear glass rim, so it reads as a bead rather than a flat dot. */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: "rgba(255,255,255,0.45)" }]} />
      </Animated.View>
    </View>
  );
}
