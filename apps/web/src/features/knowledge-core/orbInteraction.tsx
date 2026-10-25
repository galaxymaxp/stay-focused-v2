"use client";
import { beginOrbGesture, createOrbInteraction, endOrbGesture, moveOrbGesture, orbIdleColor, ORB_COLOR_KEY, ORB_HOLD_MS, parseOrbColorKey, legacyOrbIndexToKey, orbColorIndex, ORB_LEGACY_COLOR_KEY, ORB_IDLE_PALETTE, projectTapToSphere, type OrbColorKey, type OrbInteraction } from '@stay-focused/shared';
import { useEffect, useMemo, useRef, type MutableRefObject, type PointerEvent } from 'react';
import { readLocalPreference, writeLocalPreference } from '../../lib/local-preference';
export interface OrbInteractionHandle {
  readonly state: MutableRefObject<OrbInteraction>;
  readonly ringDragging?: MutableRefObject<boolean>;
  readonly wake: MutableRefObject<(() => void) | null>;
}
export function readOrbColor(): number {
  const saved = readLocalPreference(ORB_COLOR_KEY);
  const key = saved === null ? legacyOrbIndexToKey(readLocalPreference(ORB_LEGACY_COLOR_KEY)) : parseOrbColorKey(saved);
  if (saved === null) writeLocalPreference(ORB_COLOR_KEY, key);
  return orbColorIndex(key);
}
const choices = new Set<(key: OrbColorKey) => void>();
export function subscribeOrbColorChoices(listener: (key: OrbColorKey) => void) {
  choices.add(listener); return () => { choices.delete(listener); };
}
export function applySyncedOrbColor(key: OrbColorKey, source?: ColorTransition) {
  writeLocalPreference(ORB_COLOR_KEY, key);
  publishColor(orbColorIndex(key), source);
}
export function rememberOrbColor(index: number, source?: ColorTransition) {
  const key = ORB_IDLE_PALETTE[index]?.key ?? 'pearl';
  applySyncedOrbColor(key, source);
  choices.forEach(listener => listener(key));
}
type ColorTransition = Pick<OrbInteraction, 'colorIndex' | 'colorFrom' | 'colorAt'>;
let palette = createOrbInteraction();
const listeners = new Set<(transition: ColorTransition) => void>();
function publishColor(index: number, source?: ColorTransition) {
  const now = Date.now();
  if (palette.colorIndex === index && !source) return;
  const transition: ColorTransition = source
    ? { colorIndex: source.colorIndex, colorFrom: source.colorFrom, colorAt: source.colorAt }
    : { colorIndex: index, colorFrom: orbIdleColor(palette, now, false), colorAt: now };
  palette = { ...palette, ...transition };
  listeners.forEach(listener => listener(transition));
}
export function useOrbInteraction(supplied?: OrbInteractionHandle): OrbInteractionHandle {
  const initialIndex = readOrbColor();
  if (listeners.size === 0) palette = createOrbInteraction(initialIndex);
  const state = useRef({ ...createOrbInteraction(initialIndex), colorIndex: palette.colorIndex, colorFrom: palette.colorFrom, colorAt: palette.colorAt });
  const wake = useRef<(() => void) | null>(null);
  const ringDragging = useRef(false);
  useEffect(() => {
    if (supplied) return;
    const apply = (transition: ColorTransition) => {
      state.current = { ...state.current, ...transition };
      wake.current?.();
    };
    apply(palette); listeners.add(apply);
    const stored = (event: StorageEvent) => { if (event.key === ORB_COLOR_KEY) applySyncedOrbColor(parseOrbColorKey(event.newValue)); };
    window.addEventListener('storage', stored);
    return () => { listeners.delete(apply); window.removeEventListener('storage', stored); };
  }, [supplied]);
  const local = useMemo(() => ({ state, wake, ringDragging }), []);
  return supplied ?? local;
}
export function OrbPointerLayer({ interaction, fill, reducedMotion }: { interaction: OrbInteractionHandle; fill: number; reducedMotion?: boolean }) {
  const pointer = useRef<number | null>(null);
  const element = useRef<HTMLDivElement>(null);
  const reduced = () => reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top, size: box.width };
  };
  const release = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (pointer.current !== event.pointerId) return;
    const p = point(event), previous = interaction.state.current.colorIndex;
    interaction.state.current = endOrbGesture(interaction.state.current, p.x, p.y, p.size, Date.now(), reduced(), cancelled);
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (previous !== interaction.state.current.colorIndex) {
      const index = interaction.state.current.colorIndex;
      rememberOrbColor(index, interaction.state.current);
    }
    interaction.wake.current?.();
  };
  useEffect(() => () => {
    const state = interaction.state.current;
    interaction.state.current = { ...state, gesture: null, spin: { ...state.spin, velocityX: 0, velocityY: 0 } };
  }, [interaction]);
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    const holdMove = (event: TouchEvent) => {
      const g = interaction.state.current.gesture;
      if (g && !g.scroll && Date.now() - g.started >= ORB_HOLD_MS && event.cancelable) event.preventDefault();
    };
    target.addEventListener('touchmove', holdMove, { passive: false });
    return () => target.removeEventListener('touchmove', holdMove);
  }, [interaction]);
  const inset = (1 - fill) * 50 + '%';
  return <div ref={element} data-testid="orb-touch" aria-hidden="true" style={{ position: 'absolute', inset, borderRadius: '50%', clipPath: 'circle(50%)', touchAction: 'pan-y', pointerEvents: 'auto' }}
    onPointerDown={event => {
      if (pointer.current !== null || !event.isPrimary || event.button !== 0) return;
      const p = point(event);
      if (!projectTapToSphere(p.x, p.y, p.size)) return;
      pointer.current = event.pointerId;
      interaction.state.current = beginOrbGesture(interaction.state.current, p.x, p.y, Date.now());
    }}
    onPointerMove={event => {
      if (pointer.current !== event.pointerId) return;
      const p = point(event);
      interaction.state.current = moveOrbGesture(interaction.state.current, p.x, p.y, p.size, Date.now(), reduced());
      if (interaction.state.current.gesture?.rotating) {
        event.currentTarget.setPointerCapture(event.pointerId);
        interaction.wake.current?.();
      }
    }}
    onPointerUp={event => release(event, false)} onPointerCancel={event => release(event, true)}
    onLostPointerCapture={event => release(event, true)}
    onPointerLeave={event => { if (!interaction.state.current.gesture?.rotating) release(event, true); }} />;
}
