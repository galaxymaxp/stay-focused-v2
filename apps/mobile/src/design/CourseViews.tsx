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
  const { colors, mode } = useTheme();
  const press = usePressScale();
  const accent = courseAccent(identity, mode);
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
          overflow: "hidden",
        })}
      >
        <View style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: 2, backgroundColor: accent.fg, opacity: 0.85 }} />
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

/** Compact, roughly square tile for grids (Library). */
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
  return (
    <Animated.View style={{ width, transform: [{ scale: press.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? identity.title}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => ({
          width,
          minHeight: Math.max(width * 0.92, 132),
          padding: density.cardPadding + 2,
          borderRadius: radius.card,
          backgroundColor: pressed ? colors.surfaceSecondary : colors.surfacePrimary,
          borderWidth: 1,
          borderColor: colors.separator,
          justifyContent: "space-between",
          gap: spacing[3],
        })}
      >
        <CourseMark identity={identity} size={36} />
        <View style={{ gap: 3 }}>
          <Copy size="h3" style={{ fontSize: 15, lineHeight: 20 }}>{identity.title}</Copy>
          {identity.code ? <Copy muted size="caption" style={{ fontSize: 11, lineHeight: 14 }}>{identity.code}</Copy> : null}
          {identity.section ? <Copy muted size="caption" style={{ fontSize: 11, lineHeight: 14 }}>{identity.section}</Copy> : null}
          {footnote ? <Copy size="caption" color={colors.textSecondary} style={{ fontSize: 11, lineHeight: 15, marginTop: 4 }}>{footnote}</Copy> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
