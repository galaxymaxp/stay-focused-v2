import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Path, Rect, G } from "react-native-svg";

import { Copy } from "./primitives";
import { motion, shouldAnimate, useTheme } from "./theme";
import { radius, spacing } from "./tokens";

export function ClearDay({
  title = "Your day is clear.",
  detail = "Make room for what matters.",
  action,
  compact = false,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const { colors, reducedMotion, active } = useTheme();
  const focused = useIsFocused();
  const glow = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    glow.setValue(0.55);
    if (!shouldAnimate(reducedMotion, active, focused)) return;
    glow.setValue(0.35);
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.7, duration: motion.ambient, easing: Easing.inOut(Easing.ease), isInteraction: false, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.35, duration: motion.ambient, easing: Easing.inOut(Easing.ease), isInteraction: false, useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); glow.stopAnimation(); };
  }, [active, focused, glow, reducedMotion]);
  const width = compact ? 96 : 132;
  return (
    <View accessibilityLiveRegion="polite" style={{ minHeight: compact ? 140 : 220, paddingVertical: spacing[4], paddingHorizontal: spacing[3], gap: spacing[1] + 2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.separator, borderRadius: radius.card }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height: width * 0.75, marginBottom: spacing[2] }}>
        <Svg width={width} height={width * 0.75} viewBox="0 0 160 120" accessible={false}>
          <Path d="M14 92h132" stroke={colors.separator} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Path d="M54 92a26 26 0 0 1 52 0" stroke={colors.textMuted} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Rect x={62} y={70} width={36} height={30} rx={6} fill={colors.surfacePrimary} stroke={colors.textMuted} strokeWidth={2} />
          <Path d="M71 85l6 6 12-12" stroke={colors.textPrimary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
          <Svg width={width} height={width * 0.75} viewBox="0 0 160 120" accessible={false}>
            <G stroke={colors.textMuted} strokeWidth={2.5} strokeLinecap="round" fill="none">
              <Path d="M80 52v-12" /><Path d="M57 61l-8-8" /><Path d="M103 61l8-8" /><Path d="M44 80H32" /><Path d="M116 80h12" />
            </G>
          </Svg>
        </Animated.View>
      </View>
      <Copy size="h3" style={{ textAlign: "center" }}>{title}</Copy>
      <Copy muted size="caption" style={{ textAlign: "center" }}>{detail}</Copy>
      {action}
    </View>
  );
}
