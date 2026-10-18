import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle } from "react-native";

import { motion, useTheme } from "./theme";

export interface HeaderVisibilityState {
  visible: boolean;
  /** Lowest offset while visible, highest while hidden: accumulates slow drags. */
  anchorY: number;
}

interface HeaderScrollMetrics {
  y: number;
  headerHeight: number;
  contentHeight: number;
  viewportHeight: number;
  forceVisible?: boolean;
}

/** A direction reversal must travel more than 8pt; hiding also needs height + 24pt. */
export function nextHeaderVisibility(prev: HeaderVisibilityState, metrics: HeaderScrollMetrics): HeaderVisibilityState {
  const { y, headerHeight, contentHeight, viewportHeight, forceVisible } = metrics;
  if (![y, headerHeight, contentHeight, viewportHeight].every(Number.isFinite)) return prev;
  if (forceVisible || y <= 0 || contentHeight <= viewportHeight) return { visible: true, anchorY: Math.max(0, y) };
  if (viewportHeight <= 0 || headerHeight <= 0) return prev;
  const anchorY = prev.visible ? Math.min(prev.anchorY, y) : Math.max(prev.anchorY, y);
  if (prev.visible && y > headerHeight + 24 && y - anchorY > 8) return { visible: false, anchorY: y };
  if (!prev.visible && anchorY - y > 8) return { visible: true, anchorY: y };
  return { visible: prev.visible, anchorY };
}

export function useHideOnScroll({ enabled = true, forceVisible = false }: { enabled?: boolean; forceVisible?: boolean } = {}) {
  const { reducedMotion } = useTheme();
  const [visible, setVisible] = useState(true);
  const [height, setHeight] = useState<number | null>(null);
  const decision = useRef<HeaderVisibilityState>({ visible: true, anchorY: 0 });
  const metrics = useRef({ y: 0, headerHeight: 0, contentHeight: 0, viewportHeight: 0 });
  const progress = useRef(new Animated.Value(1)).current;
  const forced = !enabled || forceVisible;

  const reconcile = useCallback(() => {
    const next = nextHeaderVisibility(decision.current, { ...metrics.current, forceVisible: forced });
    if (decision.current.visible !== next.visible) setVisible(next.visible);
    decision.current = next;
  }, [forced]);

  useEffect(() => { reconcile(); }, [reconcile]);
  const shown = forced || visible;
  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion) progress.setValue(shown ? 1 : 0);
    else Animated.timing(progress, {
      toValue: shown ? 1 : 0,
      duration: motion.small,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false, // Height must participate in layout to remove the gap.
    }).start();
    return () => progress.stopAnimation();
  }, [progress, reducedMotion, shown]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (!Number.isFinite(measured) || measured < 0) return;
    metrics.current.headerHeight = measured;
    setHeight(current => current === measured ? current : measured);
    reconcile();
  }, [reconcile]);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    metrics.current = { ...metrics.current, y: contentOffset.y, contentHeight: contentSize.height, viewportHeight: layoutMeasurement.height };
    reconcile();
  }, [reconcile]);
  // A resize or refreshed short list can reveal the header without a scroll event.
  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    metrics.current.viewportHeight = event.nativeEvent.layout.height;
    reconcile();
  }, [reconcile]);
  const onContentSizeChange = useCallback((_width: number, contentHeight: number) => {
    metrics.current.contentHeight = contentHeight;
    reconcile();
  }, [reconcile]);

  return {
    onScroll, onLayout, onViewportLayout, onContentSizeChange, visible: shown,
    style: {
      overflow: "hidden" as const,
      height: height === null ? undefined : progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
      opacity: progress,
    },
    // Measure natural height independently of the clipped outer height, even hidden.
    contentStyle: height === null ? undefined : { position: "absolute", top: 0, left: 0, right: 0 } satisfies ViewStyle,
  };
}
