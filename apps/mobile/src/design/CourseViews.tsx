import { ChevronRight, Pin } from "lucide-react-native";
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, View, type AccessibilityActionEvent, type AccessibilityActionInfo } from "react-native";

import { courseAccent, type CourseIdentity } from "./courseIdentity";
import { useCourseOptions } from "./CourseOptions";
import { haptic } from "./haptics";
import { Copy } from "./primitives";
import { NavigationFeedbackContext } from "./navigationFeedback";
import { motion, useTheme } from "./theme";
import { density, hitTarget, radius, spacing } from "./tokens";

function usePressScale() {
  const feedback = useContext(NavigationFeedbackContext);
  const { reducedMotion } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const to = (value: number) => {
    if (reducedMotion) return;
    Animated.spring(scale, { toValue: value, ...motion.spring, useNativeDriver: true }).start();
  };
  const { active = false, ...handlers } = feedback ?? { onPressIn: () => to(0.975), onPressOut: () => to(1) };
  return { scale, active, handlers };
}

/** Outside SwipeRow's clip. Four reserved points bound even unusually tall cards. */
export function CourseFeedback({ children, compact = false }: { children?: ReactNode; compact?: boolean }) {
  const { reducedMotion, colors } = useTheme();
  const [pressed, setPressed] = useState(false), [focused, setFocused] = useState(false), [hovered, setHovered] = useState(false);
  const [extent, setExtent] = useState(1);
  const active = pressed || focused || hovered;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    scale.stopAnimation();
    if (reducedMotion) scale.setValue(1);
    else Animated.spring(scale, { toValue: active ? Math.min(1.01, 1 + 6 / extent) : 1,
      ...motion.spring, overshootClamping: true, useNativeDriver: true }).start();
    return () => scale.stopAnimation();
  }, [active, extent, reducedMotion, scale]);
  return <View style={{ padding: compact ? 0 : 4 }}>
    <Animated.View onLayout={event => setExtent(Math.max(1, event.nativeEvent.layout.width, event.nativeEvent.layout.height))}
      style={{ borderRadius: radius.card, backgroundColor: active ? colors.surfaceSecondary : undefined,
        transform: [{ scale }] }}>
      <NavigationFeedbackContext.Provider value={{ active, onPressIn: () => setPressed(true), onPressOut: () => setPressed(false),
        onFocus: () => setFocused(true), onBlur: () => { setFocused(false); setPressed(false); setHovered(false); },
        onHoverIn: () => setHovered(true), onHoverOut: () => { setHovered(false); setPressed(false); } }}>
        {children}
      </NavigationFeedbackContext.Provider>
    </Animated.View>
  </View>;
}

/** Pin and Hide stay reachable to screen readers as named actions. */
interface ItemAccessibilityActions {
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

/** Native Pressability cancels tap after long press; also guard direct/accessibility dispatch. */
function useCoursePress(onPress: () => void, accessibility: ItemAccessibilityActions) {
  const options = useCourseOptions();
  const feedback = useContext(NavigationFeedbackContext);
  const press = usePressScale();
  const held = useRef(false);
  const open = () => {
    held.current = true;
    press.scale.stopAnimation();
    press.scale.setValue(1);
    feedback?.onBlur();
    options?.open();
  };
  return { press, props: {
    ref: options?.trigger,
    ...press.handlers,
    onPressIn: () => { held.current = false; press.handlers.onPressIn(); },
    onPress: options ? () => { if (!held.current) onPress(); } : onPress,
    ...(options ? { delayLongPress: 400, onLongPress: () => { haptic.tap(); open(); } } : {}),
    accessibilityActions: [ ...(accessibility.accessibilityActions ?? []), ...(options ? [{ name: "options", label: "Options" }] : []) ],
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      if (options && event.nativeEvent.actionName === "options") open();
      else accessibility.onAccessibilityAction?.(event);
    },
  } };
}

/** A quiet mark, not a badge: pinned items are also grouped first. */
function PinnedMark() {
  const { colors } = useTheme();
  return <Pin accessibilityElementsHidden importantForAccessibility="no" size={13} color={colors.textMuted} strokeWidth={1.8} style={{ transform: [{ rotate: "35deg" }] }} />;
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
  pinned = false,
  navigationFeedback = false,
  accessibilityActions,
  onAccessibilityAction,
}: {
  identity: CourseIdentity;
  onPress: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
  testID?: string;
  pinned?: boolean;
  navigationFeedback?: boolean;
} & ItemAccessibilityActions) {
  const { colors } = useTheme();
  const { press, props } = useCoursePress(onPress, { accessibilityActions, onAccessibilityAction });
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel ?? identity.title}${pinned ? ", pinned" : ""}`}
        testID={testID}
        {...props}
        style={({ pressed }) => ({
          minHeight: hitTarget.min + 20,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[3],
          paddingVertical: spacing[3],
          paddingLeft: spacing[3],
          paddingRight: spacing[2],
          borderRadius: radius.card,
          backgroundColor: pressed || press.active ? colors.surfaceSecondary : colors.surfacePrimary,
          borderWidth: 1,
          borderColor: press.active ? colors.accent : colors.separator,
        })}
      >
        <CourseMark identity={identity} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Copy size="h3" style={{ fontSize: 16, lineHeight: 21 }}>{identity.title}</Copy>
          {identity.subtitle ? <Copy muted size="caption">{identity.subtitle}</Copy> : null}
          {children ? <View style={{ marginTop: 4 }}>{children}</View> : null}
        </View>
        {pinned ? <PinnedMark /> : null}
        {navigationFeedback ? null : <ChevronRight size={16} color={colors.textMuted} />}
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
  pinned = false,
  accessibilityActions,
  onAccessibilityAction,
}: {
  identity: CourseIdentity;
  width: number;
  onPress: () => void;
  footnote?: string | null;
  accessibilityLabel?: string;
  pinned?: boolean;
} & ItemAccessibilityActions) {
  const { colors } = useTheme();
  const { press, props } = useCoursePress(onPress, { accessibilityActions, onAccessibilityAction });
  const height = courseTileHeight(width);
  return (
    <Animated.View style={{ width, height, transform: [{ scale: press.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel ?? identity.title}${pinned ? ", pinned" : ""}`}
        {...props}
        style={({ pressed }) => ({
          width,
          height,
          padding: density.cardPadding + 2,
          borderRadius: radius.card,
          backgroundColor: pressed || press.active ? colors.surfaceSecondary : colors.surfacePrimary,
          borderWidth: 1,
          borderColor: press.active ? colors.accent : colors.separator,
          gap: spacing[2],
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <CourseMark identity={identity} size={34} />
          {pinned ? <PinnedMark /> : null}
        </View>
        <View style={{ flex: 1, minHeight: 0, gap: 2 }}>
          <Copy size="h3" numberOfLines={3} style={{ fontSize: 15, lineHeight: 20 }}>{identity.title}</Copy>
          {identity.subtitle ? <Copy muted size="caption" numberOfLines={1} style={{ fontSize: 11, lineHeight: 15 }}>{identity.subtitle}</Copy> : null}
        </View>
        {footnote ? <Copy size="caption" numberOfLines={2} color={colors.textSecondary} style={{ fontSize: 11, lineHeight: 15 }}>{footnote}</Copy> : null}
      </Pressable>
    </Animated.View>
  );
}

/** One height for every tile in a grid: square, but never too short for its content. */
export function courseTileHeight(width: number): number {
  return Math.max(Math.round(width), 176);
}
