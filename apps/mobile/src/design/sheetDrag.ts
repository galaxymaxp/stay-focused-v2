import { useMemo, useRef } from "react";
import { Animated, PanResponder, type NativeScrollEvent, type NativeSyntheticEvent, type PanResponderGestureState } from "react-native";

import { motion } from "./theme";

/** A downward drag past this distance, or a flick, closes the sheet. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.9;
const CLAIM_DISTANCE = 6;

/**
 * Pull a sheet down to close it, like iOS. The panel claims only a clearly
 * downward drag, and only while its content is scrolled to the top, so taps,
 * horizontal controls and scrolling the content keep working. Dragging up
 * resists instead of lifting the panel off its edge.
 *
 * `drag` is added to the panel's own translateY. `onDismiss` receives how far
 * the finger carried the panel, so the exit continues from there.
 */
export function useSheetDrag(onDismiss: (from: number) => void) {
  const drag = useRef(new Animated.Value(0)).current;
  const current = useRef(0);
  const atTop = useRef(true);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const responder = useMemo(() => {
    const claims = (gesture: PanResponderGestureState) =>
      atTop.current && gesture.dy > CLAIM_DISTANCE && gesture.dy > Math.abs(gesture.dx) * 1.3;
    const settle = () => {
      current.current = 0;
      Animated.spring(drag, { toValue: 0, ...motion.sheet, useNativeDriver: true }).start();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => claims(gesture),
      onMoveShouldSetPanResponderCapture: (_event, gesture) => claims(gesture),
      onPanResponderGrant: () => drag.stopAnimation(),
      onPanResponderMove: (_event, gesture) => {
        const value = gesture.dy > 0 ? gesture.dy : gesture.dy * 0.12;
        current.current = value;
        drag.setValue(value);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || (gesture.vy > DISMISS_VELOCITY && gesture.dy > CLAIM_DISTANCE * 3)) {
          const from = current.current;
          current.current = 0;
          drag.setValue(0);
          dismissRef.current(from);
        } else settle();
      },
      onPanResponderTerminate: settle,
    });
  }, [drag]);

  return {
    drag,
    panHandlers: responder.panHandlers,
    /** Pass to the sheet's ScrollView so a drag inside content only closes it from the top. */
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      atTop.current = event.nativeEvent.contentOffset.y <= 0;
    },
  };
}
