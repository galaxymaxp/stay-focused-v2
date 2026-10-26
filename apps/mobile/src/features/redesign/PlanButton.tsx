import { createOrbLoadGate, type OrbLoadStatus } from '@stay-focused/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { useTheme } from '../../design/theme';
import { useOrbInteraction } from '../generation-core/orbInteraction';
import { PLAN_PILL_RADIUS } from './planPill';
import { PlanButtonFallback } from './PlanButtonFallback';
import { PlanGlassView, type PlanGlassHandle } from './PlanGlassView';

/** Accessible action owns the press; every visible live pixel comes from GL. */
export function PlanButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const interaction = useOrbInteraction();
  const { mode, active, reducedMotion } = useTheme();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState<OrbLoadStatus>('loading');
  const gate = useRef<ReturnType<typeof createOrbLoadGate> | null>(null);
  const handle = useRef<PlanGlassHandle | null>(null);
  const opacity = useRef(new Animated.Value(1)).current;
  const pressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const live = active && focused && foreground;
  const running = useRef(live); running.current = live;
  const startGate = useCallback(() => {
    gate.current?.dispose();
    gate.current = createOrbLoadGate(setStatus, () => console.warn('Plan glass unavailable; keeping static fallback.'));
    gate.current.setActive(running.current); setStatus('loading');
  }, []);
  useEffect(() => { startGate(); return () => { gate.current?.dispose(); gate.current = null; }; }, [startGate]);
  useEffect(() => { gate.current?.setActive(live); }, [live]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', value => setForeground(value === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!live) { pressAnimation.current?.stop(); opacity.setValue(1); }
    return () => pressAnimation.current?.stop();
  }, [live, opacity]);
  const ready = useCallback(() => gate.current?.ready(), []);
  const fail = useCallback(() => gate.current?.fail(), []);
  if (status === 'failed') return <PlanButtonFallback onPress={onPress} disabled={disabled} interaction={interaction} />;
  return <Animated.View style={{ opacity }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Plan your free time" accessibilityHint="Opens planning options"
      accessibilityState={{ disabled }} disabled={disabled}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onPress={event => {
        if (reducedMotion) {
          pressAnimation.current?.stop(); opacity.setValue(1);
          pressAnimation.current = Animated.sequence([
            Animated.timing(opacity, { toValue: 0.85, duration: 70, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: true }),
          ]);
          pressAnimation.current.start();
        }
        handle.current?.press(width && Number.isFinite(event.nativeEvent.locationX) ? event.nativeEvent.locationX / width * 2 - 1 : 0, Number.isFinite(event.nativeEvent.locationY) ? 1 - event.nativeEvent.locationY / 52 * 2 : 0);
        onPress();
      }} style={{ height: 52, width: '100%', borderRadius: PLAN_PILL_RADIUS, overflow: 'hidden' }}>
      {width > 0 && <Animated.View pointerEvents="none" style={{ position: 'absolute', inset: 0, opacity: status === 'ready' ? 1 : 0 }}>
        <PlanGlassView width={width} mode={mode} reducedMotion={reducedMotion} live={live} interaction={interaction}
          handle={handle} onReady={ready} onFailure={fail} onLoading={startGate} />
      </Animated.View>}
    </Pressable>
  </Animated.View>;
}
