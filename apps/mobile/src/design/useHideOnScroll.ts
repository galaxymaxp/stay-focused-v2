import { useCallback, useEffect, useState } from "react";
import type { LayoutChangeEvent, NativeScrollEvent } from "react-native";
import { cancelAnimation, runOnJS, useAnimatedProps, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { motion, useTheme } from "./theme";

/** Clamp elastic offsets before taking deltas, so bounce cannot reverse direction. */
export function boundedScroll(y: number, content: number, viewport: number) {
  "worklet";
  if (![y, content, viewport].every(Number.isFinite) || content < 0 || viewport <= 0) return NaN;
  return Math.max(0, Math.min(y, Math.max(0, content - viewport)));
}

export function clampHeader(offset: number, delta: number, height: number) {
  "worklet";
  return Math.max(0, Math.min(height, offset + delta));
}

export function snapHeader(offset: number, height: number, y: number, forced = false) {
  "worklet";
  return forced || y <= 0 || offset < height / 2 ? 0 : height;
}

export function useHideOnScroll({ enabled = true, forceVisible = false, onScroll }: {
  enabled?: boolean;
  forceVisible?: boolean;
  /** Existing reader/scrubber observer; header motion never waits for JS. */
  onScroll?: (event: NativeScrollEvent) => void;
} = {}) {
  const { reducedMotion } = useTheme();
  const [height, setHeight] = useState(0);
  const measuredHeight = useSharedValue(0);
  const offset = useSharedValue(0);
  const previousY = useSharedValue(0);
  const viewport = useSharedValue(0);
  const content = useSharedValue(0);
  const forced = !enabled || forceVisible;

  useEffect(() => {
    cancelAnimation(offset);
    // A focus/query or preference change must expose the search immediately.
    offset.value = 0;
    return () => cancelAnimation(offset);
  }, [forced, reducedMotion, offset]);

  const settle = () => {
    "worklet";
    const target = snapHeader(offset.value, measuredHeight.value, previousY.value, forced || content.value <= viewport.value);
    offset.value = reducedMotion ? target : withTiming(target, { duration: motion.small });
  };
  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => { cancelAnimation(offset); },
    onScroll: event => {
      const y = boundedScroll(event.contentOffset.y, event.contentSize.height, event.layoutMeasurement.height);
      if (!Number.isFinite(y)) return;
      viewport.value = event.layoutMeasurement.height;
      content.value = event.contentSize.height;
      const previous = boundedScroll(previousY.value, event.contentSize.height, event.layoutMeasurement.height);
      const next = clampHeader(offset.value, y - previous, measuredHeight.value);
      cancelAnimation(offset);
      // Reduced motion still accumulates travel, but renders endpoints only.
      offset.value = forced || y === 0 || content.value <= viewport.value ? 0 : next;
      previousY.value = y;
      if (onScroll) runOnJS(onScroll)(event);
    },
    onEndDrag: settle,
    onMomentumBegin: () => { cancelAnimation(offset); },
    onMomentumEnd: settle,
  });

  const style = useAnimatedStyle(() => {
    const hidden = forced ? 0 : reducedMotion
      ? snapHeader(offset.value, measuredHeight.value, previousY.value)
      : offset.value;
    return { transform: [{ translateY: -hidden }] };
  });
  const animatedProps = useAnimatedProps(() => {
    const hidden = !forced && measuredHeight.value > 0 && (reducedMotion
      ? snapHeader(offset.value, measuredHeight.value, previousY.value) === measuredHeight.value
      : offset.value >= measuredHeight.value);
    return {
      pointerEvents: hidden ? "none" as const : "auto" as const,
      accessibilityElementsHidden: hidden,
      importantForAccessibility: hidden ? "no-hide-descendants" as const : "auto" as const,
    };
  });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    if (!Number.isFinite(next) || next < 0) return;
    cancelAnimation(offset);
    const wasHidden = measuredHeight.value > 0 && offset.value >= measuredHeight.value;
    measuredHeight.value = next;
    offset.value = wasHidden ? next : Math.min(offset.value, next);
    setHeight(current => current === next ? current : next);
  }, [measuredHeight, offset]);
  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    if (!Number.isFinite(next) || next <= 0) return;
    viewport.value = next;
    if (content.value <= viewport.value) offset.value = 0;
  }, [content, offset, viewport]);
  const onContentSizeChange = useCallback((_width: number, next: number) => {
    if (!Number.isFinite(next) || next < 0) return;
    content.value = next;
    if (next <= viewport.value) { offset.value = 0; previousY.value = 0; }
  }, [content, offset, previousY, viewport]);

  return { height, style, animatedProps, onLayout, onScroll: scrollHandler, onViewportLayout, onContentSizeChange };
}
