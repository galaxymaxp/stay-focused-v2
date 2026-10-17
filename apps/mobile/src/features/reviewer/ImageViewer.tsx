import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { motion, useTheme } from '../../design/theme';
import { hitTarget, spacing } from '../../design/tokens';
import { shouldDismissImage } from './imageViewerGesture';

const stopReaderTouch = (event: GestureResponderEvent) => event.stopPropagation();

/** A separate native Modal isolates image gestures from the reader's edge scrubber. */
export function ImageViewer({ visible, title, closeLabel = 'Close image', onClose, children }: {
  visible: boolean; title: string; closeLabel?: string; onClose: () => void;
  children: (onZoomChange: (scale: number) => void) => ReactNode;
}) {
  const { colors, reducedMotion } = useTheme();
  const [zoom, setZoom] = useState(1);
  const scrollTop = useRef(0), zoomRef = useRef(1);
  const drag = useRef(new Animated.Value(0)).current;
  const latest = useRef({ onClose, reducedMotion }); latest.current = { onClose, reducedMotion };
  const touch = useMemo(() => {
    let start: { x: number; y: number } | null = null;
    let lastY = 0, lastTime = 0, velocity = 0;
    const reset = () => {
      start = null; velocity = 0;
      if (latest.current.reducedMotion) drag.setValue(0);
      else Animated.spring(drag, { toValue: 0, ...motion.sheet, useNativeDriver: true }).start();
    };
    // Like sheetDrag, observe raw touches: Android Modal scroll content may never
    // offer move events to a parent PanResponder. Native upward scrolling stays native.
    return {
      onTouchStart: (event: GestureResponderEvent) => {
        drag.stopAnimation(); drag.setValue(0);
        const { touches, pageX, pageY, timestamp } = event.nativeEvent;
        start = touches.length === 1 && zoomRef.current === 1 && scrollTop.current <= 0 ? { x: pageX, y: pageY } : null;
        lastY = pageY; lastTime = timestamp; velocity = 0;
      },
      onTouchMove: (event: GestureResponderEvent) => {
        if (!start) return;
        const { touches, pageX, pageY, timestamp } = event.nativeEvent;
        if (touches.length !== 1 || zoomRef.current !== 1 || scrollTop.current > 0) { reset(); return; }
        const dx = pageX - start.x, dy = pageY - start.y;
        // Once a gesture becomes scrolling or horizontal interaction it cannot dismiss.
        if (dy < -8 || (Math.abs(dx) > 8 && Math.abs(dx) >= Math.abs(dy))) { reset(); return; }
        if (timestamp > lastTime) velocity = (pageY - lastY) / (timestamp - lastTime);
        lastY = pageY; lastTime = timestamp;
        if (!latest.current.reducedMotion && dy > 8 && dy > Math.abs(dx) * 1.3) drag.setValue(dy);
      },
      onTouchEnd: (event: GestureResponderEvent) => {
        if (!start) return;
        const { pageX, pageY, timestamp, touches } = event.nativeEvent;
        const dy = pageY - start.y, dx = pageX - start.x;
        const dismiss = touches.length === 0 && dy > Math.abs(dx) * 1.3 &&
          shouldDismissImage(dy, timestamp - lastTime <= 100 ? velocity : 0, zoomRef.current, scrollTop.current);
        reset();
        if (dismiss) latest.current.onClose();
      },
      onTouchCancel: reset,
    };
  }, [drag]);
  const onZoomChange = (scale: number) => { zoomRef.current = scale; setZoom(scale); };
  return <Modal visible={visible} animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    {visible ? <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
      onTouchStart={stopReaderTouch} onTouchMove={stopReaderTouch} onTouchEnd={stopReaderTouch} onTouchCancel={stopReaderTouch}>
      <Animated.View {...touch} accessibilityViewIsModal style={{ flex: 1, transform: [{ translateY: reducedMotion ? 0 : drag }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], gap: spacing[2] }}>
          <Text style={{ flex: 1, color: colors.textPrimary }}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}
            style={{ minHeight: hitTarget.min, minWidth: hitTarget.min, justifyContent: 'center' }}>
            <Text style={{ color: colors.accent }}>Close</Text>
          </Pressable>
        </View>
        <ScrollView scrollEnabled={zoom === 1} bounces={false} overScrollMode="never" scrollEventThrottle={16}
          onScroll={event => { scrollTop.current = event.nativeEvent.contentOffset.y; }}
          contentContainerStyle={{ gap: spacing[3], padding: spacing[4] }}>
          {children(onZoomChange)}
        </ScrollView>
      </Animated.View>
    </SafeAreaView> : null}
  </Modal>;
}
