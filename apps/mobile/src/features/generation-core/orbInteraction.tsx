import { beginOrbGesture, createOrbInteraction, endOrbGesture, moveOrbGesture, orbIdleColor, ORB_COLOR_KEY, parseOrbColorKey, legacyOrbIndexToKey, orbColorIndex, ORB_LEGACY_COLOR_KEY, ORB_IDLE_PALETTE, projectTapToSphere, type OrbInteraction } from '@stay-focused/shared';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { View, type GestureResponderEvent, type PanResponderInstance } from 'react-native';
import { sessionStore } from '../../auth/sessionStore';

export interface OrbInteractionHandle {
  readonly state: MutableRefObject<OrbInteraction>;
  readonly ringDragging?: MutableRefObject<boolean>;
  readonly wake: MutableRefObject<(() => void) | null>;
}
let colorIndex = 0, revision = 0;
const listeners = new Set<(index: number) => void>();
let writes: Promise<void> = Promise.resolve();
function writeColor(index: number) {
  const key = ORB_IDLE_PALETTE[index]?.key ?? 'pearl';
  writes = writes.catch(() => {}).then(() => sessionStore.setItem(ORB_COLOR_KEY, key)).catch(() => {});
}
export async function readOrbColor(): Promise<number> {
  const before = revision;
  try {
    // A newly mounted surface must not read ahead of a queued color choice.
    await writes;
    const saved = await sessionStore.getItem(ORB_COLOR_KEY);
    const key = saved === null ? legacyOrbIndexToKey(await sessionStore.getItem(ORB_LEGACY_COLOR_KEY)) : parseOrbColorKey(saved);
    if (before === revision) {
      colorIndex = orbColorIndex(key);
      if (saved === null) writeColor(colorIndex);
    }
  } catch { /* Keep this visit's color if storage is unavailable. */ }
  return colorIndex;
}
export function rememberOrbColor(index: number) {
  colorIndex = orbColorIndex(parseOrbColorKey(ORB_IDLE_PALETTE[index]?.key ?? null)); revision++;
  listeners.forEach(listener => listener(colorIndex));
  writeColor(colorIndex);
}
export function useOrbInteraction(): OrbInteractionHandle {
  const state = useRef(createOrbInteraction(colorIndex));
  const wake = useRef<(() => void) | null>(null);
  const ringDragging = useRef(false);
  useEffect(() => {
    let live = true;
    const apply = (index: number) => {
      if (!live || state.current.colorIndex === index) return;
      state.current = { ...state.current, colorIndex: index, colorFrom: orbIdleColor(state.current, Date.now(), false), colorAt: Date.now() };
      wake.current?.();
    };
    listeners.add(apply);
    void readOrbColor().then(apply);
    return () => { live = false; listeners.delete(apply); };
  }, []);
  return useMemo(() => ({ state, wake, ringDragging }), []);
}

/** Transparent ball-only target. Ring responder delegation wins in overlapping bands. */
export function OrbTouchLayer({ interaction, size, left = 0, top = 0, reducedMotion, delegate }:
  { interaction: OrbInteractionHandle; size: number; left?: number; top?: number; reducedMotion: boolean; delegate?: Partial<PanResponderInstance['panHandlers']> }) {
  const delegated = useRef(false);
  const shifted = (event: GestureResponderEvent): GestureResponderEvent => ({ ...event, nativeEvent: { ...event.nativeEvent,
    locationX: event.nativeEvent.locationX + left, locationY: event.nativeEvent.locationY + top } });
  const point = (event: GestureResponderEvent) => [event.nativeEvent.locationX, event.nativeEvent.locationY] as const;
  const finish = (event: GestureResponderEvent, cancelled: boolean) => {
    if (delegated.current) {
      if (cancelled) delegate?.onResponderTerminate?.(shifted(event));
      else delegate?.onResponderRelease?.(shifted(event));
      delegated.current = false; return;
    }
    const [x, y] = point(event), previous = interaction.state.current.colorIndex;
    interaction.state.current = endOrbGesture(interaction.state.current, x, y, size, Date.now(), reducedMotion, cancelled);
    if (previous !== interaction.state.current.colorIndex) rememberOrbColor(interaction.state.current.colorIndex);
    interaction.wake.current?.();
  };
  useEffect(() => () => {
    // No result or momentum from a gesture interrupted by navigation/unmount.
    const state = interaction.state.current;
    interaction.state.current = { ...state, gesture: null, spin: { ...state.spin, velocityX: 0, velocityY: 0 } };
  }, [interaction]);
  return <View testID="orb-touch" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: size / 2 }}
    onStartShouldSetResponderCapture={event => {
      delegate?.onStartShouldSetResponderCapture?.(shifted(event));
      return false;
    }}
    onStartShouldSetResponder={event => {
      delegated.current = delegate?.onStartShouldSetResponder?.(shifted(event)) ?? false;
      const [x, y] = point(event);
      return delegated.current || projectTapToSphere(x, y, size) !== null;
    }}
    onResponderGrant={event => {
      if (delegated.current) return delegate?.onResponderGrant?.(shifted(event));
      const [x, y] = point(event);
      interaction.state.current = beginOrbGesture(interaction.state.current, x, y, Date.now());
    }}
    onResponderStart={event => { if (delegated.current) delegate?.onResponderStart?.(shifted(event)); }}
    onResponderEnd={event => { if (delegated.current) delegate?.onResponderEnd?.(shifted(event)); }}
    onMoveShouldSetResponderCapture={event => delegated.current ? delegate?.onMoveShouldSetResponderCapture?.(shifted(event)) ?? false : false}
    onResponderMove={event => {
      if (delegated.current) { delegate?.onResponderMove?.(shifted(event)); return; }
      const [x, y] = point(event);
      interaction.state.current = moveOrbGesture(interaction.state.current, x, y, size, Date.now(), reducedMotion);
      if (interaction.state.current.gesture?.rotating) interaction.wake.current?.();
    }}
    onResponderTerminationRequest={event => delegated.current
      ? delegate?.onResponderTerminationRequest?.(shifted(event)) ?? true
      : !interaction.state.current.gesture?.rotating}
    onResponderRelease={event => finish(event, false)} onResponderTerminate={event => finish(event, true)} />;
}
