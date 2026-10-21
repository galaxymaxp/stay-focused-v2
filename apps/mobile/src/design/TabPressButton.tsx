import type { BottomTabBarButtonProps } from "expo-router/js-tabs";
import { useCallback, useEffect, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, type View } from "react-native";

import { motion, useTheme } from "./theme";
import { hitTarget } from "./tokens";

/** Keep the navigator's target still; only its icon and label grow together. */
export function TabPressButton({ children, style, ref, onPress, onPressIn, onPressOut, onTouchCancel, onBlur, disabled, ...props }: BottomTabBarButtonProps) {
  const { reducedMotion, active } = useTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const layout = StyleSheet.flatten(style);
  // Expo's AnimatedPressable ref type also permits legacy refs. Forward the
  // actual native View without widening Pressable's stricter ref type.
  const forwardRef = useCallback((node: View | null) => {
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  // These belong to PlatformPressable. In particular, never forward the
  // navigator's default borderless android_ripple to the plain Pressable.
  const buttonProps = { ...props };
  delete buttonProps.android_ripple;
  delete buttonProps.pressColor;
  delete buttonProps.pressOpacity;
  delete buttonProps.hoverEffect;

  useEffect(() => {
    scale.stopAnimation();
    scale.setValue(1);
    return () => scale.stopAnimation();
  }, [scale, reducedMotion, active, disabled]);

  function animate(pressed: boolean) {
    scale.stopAnimation();
    if (reducedMotion || !active || disabled) {
      scale.setValue(1);
      return;
    }
    Animated.timing(scale, {
      toValue: pressed ? 1.08 : 1,
      duration: pressed ? motion.press : motion.small,
      // A bounded ease gives a smooth 180ms return with zero overshoot.
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      {...buttonProps}
      ref={forwardRef}
      accessible
      disabled={disabled}
      style={[style, { minHeight: hitTarget.min, minWidth: hitTarget.min }]}
      onPress={disabled ? undefined : event => {
        // Preserve Expo Web's link behavior as well as native tabPress events.
        if (Platform.OS === "web" && props.href != null) {
          const modified = ("metaKey" in event && event.metaKey) || ("altKey" in event && event.altKey)
            || ("ctrlKey" in event && event.ctrlKey) || ("shiftKey" in event && event.shiftKey);
          const leftClick = !("button" in event) || event.button == null || event.button === 0;
          const target = event.currentTarget;
          const selfTarget = !target || typeof target !== "object" || !("target" in target)
            || [undefined, null, "", "self"].includes(target.target as string | null | undefined);
          if (modified || !leftClick || !selfTarget) return;
          event.preventDefault();
        }
        onPress?.(event);
      }}
      onPressIn={event => { animate(true); onPressIn?.(event); }}
      onPressOut={event => { animate(false); onPressOut?.(event); }}
      onTouchCancel={event => { animate(false); onTouchCancel?.(event); }}
      onBlur={event => { animate(false); onBlur?.(event); }}
    >
      <Animated.View
        style={{
          flex: 1,
          alignSelf: "stretch",
          flexDirection: layout?.flexDirection,
          alignItems: layout?.alignItems,
          justifyContent: layout?.justifyContent,
          transform: [{ scale }],
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
