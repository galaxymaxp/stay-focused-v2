import { useIsFocused } from "@react-navigation/native";
import { useEffect, useId, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

import { motion, shouldAnimate, useTheme } from "../../design/theme";

const SIZE = 280;

/**
 * A lightweight native-driven study field. It intentionally avoids a faux-3D
 * blob: source fragments orbit, align, and resolve into a stable page mark.
 */
export function GenerationVisual({ running, completed }: { running: boolean; completed: boolean }) {
  const { active, colors, mode, reducedMotion } = useTheme();
  const focused = useIsFocused();
  const id = useId().replace(/:/g, "");
  const orbit = useRef(new Animated.Value(0)).current;
  const counterOrbit = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const resolve = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    if (!shouldAnimate(reducedMotion, active && running, focused)) {
      orbit.stopAnimation();
      counterOrbit.stopAnimation();
      breathe.stopAnimation();
      return;
    }
    const animation = Animated.parallel([
      Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 18000, easing: Easing.linear, isInteraction: false, useNativeDriver: true })),
      Animated.loop(Animated.timing(counterOrbit, { toValue: 1, duration: 26000, easing: Easing.linear, isInteraction: false, useNativeDriver: true })),
      Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), isInteraction: false, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.ease), isInteraction: false, useNativeDriver: true }),
      ])),
    ]);
    animation.start();
    return () => animation.stop();
  }, [active, breathe, counterOrbit, focused, orbit, reducedMotion, running]);

  useEffect(() => {
    resolve.stopAnimation();
    if (reducedMotion) {
      resolve.setValue(completed ? 1 : 0);
      return;
    }
    Animated.spring(resolve, { toValue: completed ? 1 : 0, ...motion.spring, useNativeDriver: true }).start();
  }, [completed, reducedMotion, resolve]);

  useEffect(() => () => {
    orbit.stopAnimation();
    counterOrbit.stopAnimation();
    breathe.stopAnimation();
    resolve.stopAnimation();
  }, [breathe, counterOrbit, orbit, resolve]);

  const primaryRotation = reducedMotion ? "18deg" : orbit.interpolate({ inputRange: [0, 1], outputRange: ["18deg", "378deg"] });
  const secondaryRotation = reducedMotion ? "-28deg" : counterOrbit.interpolate({ inputRange: [0, 1], outputRange: ["-28deg", "-388deg"] });
  const pulse = reducedMotion ? 1 : breathe.interpolate({ inputRange: [0, 1], outputRange: [0.975, 1.025] });
  const completionScale = reducedMotion ? 1 : resolve.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  return (
    <View accessibilityLabel={completed ? "Generation complete" : "Generation in progress"} accessibilityState={{ busy: running }} testID="generation-visual" style={styles.frame}>
      <View pointerEvents="none" style={styles.visual}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 280 280" style={styles.fill}>
          <Defs>
            <RadialGradient id={`${id}-halo`}>
              <Stop offset="0" stopColor={colors.accent} stopOpacity={mode === "dark" ? 0.2 : 0.13} />
              <Stop offset="0.55" stopColor={colors.violet} stopOpacity={0.08} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={140} cy={140} r={136} fill={`url(#${id}-halo)`} />
          <Circle cx={140} cy={140} r={91} fill="none" stroke={colors.separator} strokeWidth={1} strokeDasharray="2 8" />
        </Svg>

        <Animated.View style={[styles.fill, { transform: [{ rotate: primaryRotation }] }]}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 280 280">
            <Defs>
              <LinearGradient id={`${id}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0" stopColor={colors.warning} stopOpacity={0.12} />
                <Stop offset="0.48" stopColor={colors.accent} stopOpacity={0.95} />
                <Stop offset="1" stopColor={colors.blue} stopOpacity={0.16} />
              </LinearGradient>
            </Defs>
            <Ellipse cx={140} cy={140} rx={112} ry={55} rotation={-18} origin="140,140" fill="none" stroke={`url(#${id}-gold)`} strokeWidth={2} strokeDasharray="110 26 24 34" strokeLinecap="round" />
            <Circle cx={42} cy={160} r={4} fill={colors.accent} />
            <Circle cx={231} cy={105} r={2.5} fill={colors.blue} />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.fill, { transform: [{ rotate: secondaryRotation }] }]}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 280 280">
            <Ellipse cx={140} cy={140} rx={72} ry={112} rotation={25} origin="140,140" fill="none" stroke={colors.violet} strokeOpacity={0.55} strokeWidth={1.4} strokeDasharray="74 22 12 44" strokeLinecap="round" />
            <Circle cx={116} cy={32} r={3} fill={colors.violet} />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.core, { backgroundColor: mode === "dark" ? colors.surfaceElevated : "#FFFFFF", borderColor: colors.separator, transform: [{ scale: pulse }, { scale: completionScale }] }]}>
          <Svg width={112} height={112} viewBox="0 0 112 112">
            <Defs>
              <LinearGradient id={`${id}-page`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0" stopColor={colors.accent} />
                <Stop offset="1" stopColor={colors.violet} />
              </LinearGradient>
            </Defs>
            <Path d="M 28 31 C 39 28 49 31 56 38 C 63 31 73 28 84 31 L 84 80 C 73 77 63 80 56 87 C 49 80 39 77 28 80 Z" fill="none" stroke={`url(#${id}-page)`} strokeWidth={3} strokeLinejoin="round" />
            <Path d="M 56 38 L 56 87 M 36 44 C 42 43 47 45 51 48 M 36 55 C 42 54 47 56 51 59 M 76 44 C 70 43 65 45 61 48 M 76 55 C 70 54 65 56 61 59" fill="none" stroke={colors.textSecondary} strokeWidth={1.7} strokeLinecap="round" />
            {completed ? <Path d="M 42 68 L 51 76 L 70 58" fill="none" stroke={colors.success} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 300, alignItems: "center", justifyContent: "center" },
  visual: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  fill: { ...StyleSheet.absoluteFillObject },
  core: { width: 124, height: 124, borderRadius: 38, borderWidth: 1, alignItems: "center", justifyContent: "center", shadowColor: "#2A2118", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
});
