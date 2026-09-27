import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  PanResponder,
  Pressable,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { haptic } from "./haptics";
import { Copy } from "./primitives";
import { motion, useTheme } from "./theme";
import { radius } from "./tokens";

/**
 * One gesture language across the app (Today, Announcements, Generate, Library):
 *
 * - Swipe right reveals `leading` actions on the left edge: Pin, a positive
 *   shortcut.
 * - Swipe left reveals `trailing` actions on the right edge: Hide / dismiss.
 * - With `fullSwipe`, dragging most of the way across runs the first action
 *   on that side directly, like Mail.
 *
 * A tap still opens the item. The gesture is claimed only for a clearly
 * horizontal drag, so vertical scrolling is untouched. Everything moves on the
 * native driver; the JS thread only follows the finger.
 */
export interface SwipeAction {
  readonly key: string;
  readonly label: string;
  readonly icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  readonly tone: "accent" | "neutral" | "warning" | "danger";
  readonly onPress: () => void;
  /** The item leaves the list (Hide): it slides out before the action runs. */
  readonly exits?: boolean;
}

const ACTION_WIDTH = 74;
const CLAIM_DISTANCE = 10;
const OPEN_FRACTION = 0.42;
const FLICK_VELOCITY = 0.45;

/** Only one row is open at a time, like a native list. */
let closeOpenRow: (() => void) | null = null;

/** Screen readers reach the same actions without a gesture. */
export function swipeAccessibility(actions: readonly SwipeAction[]) {
  return {
    accessibilityActions: actions.map((action) => ({ name: action.key, label: action.label })),
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      actions.find((action) => action.key === event.nativeEvent.actionName)?.onPress();
    },
  };
}

/** Lets siblings glide into place when an item is hidden, pinned or revealed. */
export function animateNextLayout(reducedMotion: boolean) {
  if (reducedMotion) return;
  try {
    LayoutAnimation.configureNext(LayoutAnimation.create(motion.normal, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
  } catch {
    // Layout animation is an enhancement; the list still updates without it.
  }
}

export function SwipeRow({
  children,
  leading = [],
  trailing = [],
  style,
  compact = false,
  fullSwipe = false,
  background,
}: {
  children: ReactNode;
  leading?: readonly SwipeAction[];
  trailing?: readonly SwipeAction[];
  style?: StyleProp<ViewStyle>;
  /** Narrow grid tiles: actions share the tile instead of a fixed width. */
  compact?: boolean;
  /** A long drag runs the first action on that side without a second tap. */
  fullSwipe?: boolean;
  /** Opaque fill for rows that have no card of their own, so actions never show through. */
  background?: string;
}) {
  const { colors, reducedMotion } = useTheme();
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<"leading" | "trailing" | null>(null);
  const translate = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const offset = useRef(0);
  const actionWidth = compact && width > 0 ? Math.min(ACTION_WIDTH, Math.floor(width / 2.2)) : ACTION_WIDTH;
  const leadingWidth = leading.length * actionWidth;
  const leadingRef = useRef(leading);
  leadingRef.current = leading;
  const trailingRef = useRef(trailing);
  trailingRef.current = trailing;
  const trailingWidth = trailing.length * actionWidth;
  const limits = useRef({ leadingWidth, trailingWidth, width, fullSwipe });
  limits.current = { leadingWidth, trailingWidth, width, fullSwipe };
  const runRef = useRef<(action: SwipeAction, direction: 1 | -1) => void>(() => {});

  const settle = (to: number, done?: () => void) => {
    offset.current = to;
    setOpen(to > 0 ? "leading" : to < 0 ? "trailing" : null);
    translate.stopAnimation();
    const animation = reducedMotion
      ? Animated.timing(translate, { toValue: to, duration: motion.press, easing: Easing.out(Easing.quad), useNativeDriver: true })
      : Animated.spring(translate, { toValue: to, ...motion.spring, useNativeDriver: true });
    animation.start(({ finished }) => {
      if (finished) done?.();
    });
  };
  const close = () => settle(0);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => () => {
    if (closeOpenRow === closeRef.current) closeOpenRow = null;
    translate.stopAnimation();
    exit.stopAnimation();
  }, [exit, translate]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => {
          const horizontal = Math.abs(gesture.dx) > CLAIM_DISTANCE && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6;
          if (!horizontal) return false;
          const { leadingWidth: left, trailingWidth: right } = limits.current;
          return offset.current !== 0 || (gesture.dx > 0 ? left > 0 : right > 0);
        },
        onPanResponderGrant: () => {
          if (closeOpenRow && closeOpenRow !== closeRef.current) closeOpenRow();
          closeOpenRow = closeRef.current;
          translate.stopAnimation();
        },
        onPanResponderMove: (_event, gesture) => {
          const { leadingWidth: left, trailingWidth: right, fullSwipe: full } = limits.current;
          const raw = offset.current + gesture.dx;
          // Past the actions the row resists instead of sliding freely, unless
          // a full swipe can carry it across.
          const give = full ? 0.75 : 0.2;
          const value = raw > left ? left + (raw - left) * give : raw < -right ? -right + (raw + right) * give : raw;
          translate.setValue(value);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_event, gesture) => {
          const { leadingWidth: left, trailingWidth: right, width: rowWidth, fullSwipe: full } = limits.current;
          const value = offset.current + gesture.dx;
          const across = full && rowWidth > 0 ? rowWidth * 0.55 : Infinity;
          const wasOpen = offset.current !== 0;
          if (left > 0 && value > Math.max(across, left + 40)) {
            haptic.press();
            runRef.current(leadingRef.current[0]!, 1);
          } else if (right > 0 && -value > Math.max(across, right + 40)) {
            haptic.press();
            runRef.current(trailingRef.current[0]!, -1);
          } else if (left > 0 && (value > left * OPEN_FRACTION || (gesture.vx > FLICK_VELOCITY && value > CLAIM_DISTANCE))) {
            if (!wasOpen) haptic.select();
            settle(left);
          } else if (right > 0 && (value < -right * OPEN_FRACTION || (gesture.vx < -FLICK_VELOCITY && value < -CLAIM_DISTANCE))) {
            if (!wasOpen) haptic.select();
            settle(-right);
          } else settle(0);
        },
        onPanResponderTerminate: () => settle(0),
      }),
    // `settle` only reads refs and stable animated values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reducedMotion],
  );

  const run = (action: SwipeAction, swiped?: 1 | -1) => {
    if (closeOpenRow === closeRef.current) closeOpenRow = null;
    if (!action.exits || reducedMotion) {
      settle(0);
      action.onPress();
      return;
    }
    // Slide the item away in the direction it was swiped, then let the list
    // close the gap. The row resets in case the item stays (e.g. offline).
    const direction = swiped ?? (offset.current >= 0 ? 1 : -1);
    Animated.parallel([
      Animated.timing(translate, { toValue: direction * Math.max(width, 320), duration: motion.normal, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(exit, { toValue: 0, duration: motion.normal, useNativeDriver: true }),
    ]).start(() => {
      action.onPress();
      offset.current = 0;
      setOpen(null);
      translate.setValue(0);
      exit.setValue(1);
    });
  };

  runRef.current = run;

  const tone = (value: SwipeAction["tone"]) =>
    value === "accent" ? colors.accent : value === "warning" ? colors.warning : value === "danger" ? colors.danger : colors.textSecondary;

  const renderActions = (actions: readonly SwipeAction[], side: "leading" | "trailing") => (
    <Animated.View
      pointerEvents={open === side ? "auto" : "none"}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side === "leading" ? "left" : "right"]: 0,
        flexDirection: "row",
        gap: 0,
        opacity: translate.interpolate(
          side === "leading"
            ? { inputRange: [0, 12], outputRange: [0, 1], extrapolate: "clamp" }
            : { inputRange: [-12, 0], outputRange: [1, 0], extrapolate: "clamp" },
        ),
      }}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            testID={`swipe-action-${action.key}`}
            onPress={() => {
              haptic.tap();
              run(action);
            }}
            style={({ pressed }) => ({
              width: actionWidth,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: tone(action.tone), alignItems: "center", justifyContent: "center" }}>
              <Icon color={colors.backgroundPrimary} size={17} strokeWidth={2} />
            </View>
            <Copy size="caption" color={tone(action.tone)} style={{ fontSize: 11, lineHeight: 14, fontWeight: "600" }}>{action.label}</Copy>
          </Pressable>
        );
      })}
    </Animated.View>
  );

  return (
    // Clipped to the card's own corners, so a grid tile never slides over its neighbour.
    <View style={[{ overflow: "hidden", borderRadius: radius.card }, style]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {leading.length > 0 ? renderActions(leading, "leading") : null}
      {trailing.length > 0 ? renderActions(trailing, "trailing") : null}
      <Animated.View {...responder.panHandlers} style={{ opacity: exit, backgroundColor: background, transform: [{ translateX: translate }] }}>
        {children}
        {open ? (
          // While actions show, a tap on the item closes them instead of opening it.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close actions"
            onPress={close}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
