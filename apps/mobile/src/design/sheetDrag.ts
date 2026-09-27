import { useMemo, useRef } from "react";
import { Animated, type GestureResponderEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { motion } from "./theme";

/** A drag past this distance, or a flick, closes the sheet. */
const DISMISS_DISTANCE = 110;
/** Points per millisecond. */
const DISMISS_VELOCITY = 0.9;
const CLAIM_DISTANCE = 6;

export interface SheetDragOptions {
  /** When true at the start of an upward swipe, swiping up also closes the sheet (content that cannot scroll). */
  readonly upwardCloses?: () => boolean;
}

/**
 * Swipe a sheet away. A clearly downward drag closes it while its content is scrolled
 * to the top; when `upwardCloses` allows, a clearly upward swipe closes it too.
 * Taps, horizontal controls and scrolling the content keep working.
 *
 * Raw touch events are used instead of a PanResponder: inside an Android Modal the
 * responder system never offered move events to the panel, so drags could not close it.
 *
 * `drag` is added to the panel's own translateY. `onDismiss` receives how far the
 * finger carried the panel, so the exit continues from there.
 */
export function useSheetDrag(onDismiss: (from: number) => void, options: SheetDragOptions = {}) {
  const drag = useRef(new Animated.Value(0)).current;
  const current = useRef(0);
  const atTop = useRef(true);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const touchHandlers = useMemo(() => {
    let start: { x: number; y: number } | null = null;
    let direction: "down" | "up" | null = null;
    let last = { y: 0, t: 0 }, velocity = 0;
    const reset = () => { start = null; direction = null; velocity = 0; };
    const settle = () => {
      current.current = 0;
      Animated.spring(drag, { toValue: 0, ...motion.sheet, useNativeDriver: true }).start();
    };
    return {
      onTouchStart: (event: GestureResponderEvent) => {
        if (event.nativeEvent.touches.length > 1) { reset(); return; }
        start = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        last = { y: event.nativeEvent.pageY, t: event.nativeEvent.timestamp };
        direction = null; velocity = 0;
      },
      onTouchMove: (event: GestureResponderEvent) => {
        if (!start) return;
        const { pageX, pageY, timestamp } = event.nativeEvent;
        const dx = pageX - start.x, dy = pageY - start.y;
        if (!direction) {
          if (Math.abs(dy) <= CLAIM_DISTANCE || Math.abs(dy) <= Math.abs(dx) * 1.3) return;
          if (dy > 0 && atTop.current) direction = "down";
          else if (dy < 0 && optionsRef.current.upwardCloses?.()) direction = "up";
          else { reset(); return; }
          drag.stopAnimation();
        }
        if (timestamp > last.t) velocity = (pageY - last.y) / (timestamp - last.t);
        last = { y: pageY, t: timestamp };
        // An upward swipe lifts the panel a little so it follows the finger without leaving its edge.
        const value = direction === "down" ? Math.max(0, dy) : Math.min(0, dy) * 0.35;
        current.current = value;
        drag.setValue(value);
      },
      onTouchEnd: (event: GestureResponderEvent) => {
        if (!start || !direction) { reset(); return; }
        const dy = event.nativeEvent.pageY - start.y;
        const closes = direction === "down"
          ? dy > DISMISS_DISTANCE || (velocity > DISMISS_VELOCITY && dy > CLAIM_DISTANCE * 3)
          : -dy > DISMISS_DISTANCE || (velocity < -DISMISS_VELOCITY && -dy > CLAIM_DISTANCE * 3);
        reset();
        if (closes) {
          const from = current.current;
          current.current = 0;
          drag.setValue(0);
          dismissRef.current(from);
        } else settle();
      },
      onTouchCancel: () => { if (direction) settle(); reset(); },
    };
  }, [drag]);

  return {
    drag,
    touchHandlers,
    /** Pass to the sheet's ScrollView so a drag inside content only closes it from the top. */
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      atTop.current = event.nativeEvent.contentOffset.y <= 0;
    },
  };
}
