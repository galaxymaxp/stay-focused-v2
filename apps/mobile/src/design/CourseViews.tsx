import { ChevronRight } from "lucide-react-native";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, View } from "react-native";

import { courseAccent, type CourseIdentity } from "./courseIdentity";
import { Copy } from "./primitives";
import { motion, useTheme } from "./theme";
import { density, hitTarget, radius, spacing } from "./tokens";

function usePressScale() {
  const { reducedMotion } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const to = (value: number) => {
    if (reducedMotion) return;
    Animated.spring(scale, { toValue: value, ...motion.spring, useNativeDriver: true }).start();
  };
  return { scale, onPressIn: () => to(0.975), onPressOut: () => to(1) };
}

/** Small tinted monogram: identity without decoration competing with content. */
export function CourseMark({ identity, size = 40 }: { identity: CourseIdentity; size?: number }) {
  const { mode } = useTheme();
  const accent = courseAccent(identity, mode);
  const long = identity.monogram.length > 3;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: accent.soft, alignItems: "center", justifyContent: "center" }}
    >
      <Copy size="caption" color={accent.fg} style={{ fontWeight: "700", fontSize: long ? size * 0.24 : size * 0.3, lineHeight: size * 0.4, letterSpacing: 0.2 }}>
        {identity.monogram}
      </Copy>
    </View>
  );
}

/** A course in a list: title first, code and section quiet, context below. */
export function CourseCard({
  identity,
  onPress,
  accessibilityLabel,
  children,
  testID,
}: {
  identity: CourseIdentity;
  onPress: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  const press = usePressScale();
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? identity.title}
        testID={testID}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => ({
          minHeight: hitTarget.min + 20,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[3],
          paddingVertical: spacing[3],
          paddingLeft: spacing[3],
          paddingRight: spacing[2],
          borderRadius: radius.card,
          backgroundColor: pressed ? colors.surfaceSecondary : colors.surfacePrimary,
          borderWidth: 1,
          borderColor: colors.separator,
        })}
      >
        <CourseMark identity={identity} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Copy size="h3" style={{ fontSize: 16, lineHeight: 21 }}>{identity.title}</Copy>
          {identity.subtitle ? <Copy muted size="caption">{identity.subtitle}</Copy> : null}
          {children ? <View style={{ marginTop: 4 }}>{children}</View> : null}
        </View>
        <ChevronRight size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Compact tile for grids (Library). Every tile has the same size whatever the
 * title length, so rows stay aligned; text is clamped instead of growing it.
 */
export function CourseTile({
  identity,
  width,
  onPress,
  footnote,
  accessibilityLabel,
}: {
  identity: CourseIdentity;
  width: number;
  onPress: () => void;
  footnote?: string | null;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const press = usePressScale();
  const height = courseTileHeight(width);
  return (
    <Animated.View style={{ width, height, transform: [{ scale: press.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? identity.title}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => ({
          width,
          height,
          padding: density.cardPadding + 2,
          borderRadius: radius.card,
          backgroundColor: pressed ? colors.surfaceSecondary : colors.surfacePrimary,
          borderWidth: 1,
          borderColor: colors.separator,
          gap: spacing[2],
        })}
      >
        <CourseMark identity={identity} size={34} />
        <View style={{ flex: 1, minHeight: 0, gap: 2 }}>
          <Copy size="h3" numberOfLines={3} style={{ fontSize: 15, lineHeight: 20 }}>{identity.title}</Copy>
          {identity.subtitle ? <Copy muted size="caption" numberOfLines={1} style={{ fontSize: 11, lineHeight: 15 }}>{identity.subtitle}</Copy> : null}
        </View>
        {footnote ? <Copy size="caption" numberOfLines={1} color={colors.textSecondary} style={{ fontSize: 11, lineHeight: 15 }}>{footnote}</Copy> : null}
      </Pressable>
    </Animated.View>
  );
}

/** One height for every tile in a grid: square, but never too short for its content. */
export function courseTileHeight(width: number): number {
  return Math.max(Math.round(width), 176);
}
