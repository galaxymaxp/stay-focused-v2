"use client";
import { beginOrbGesture, createOrbInteraction, endOrbGesture, moveOrbGesture, orbIdleColor, ORB_COLOR_KEY, ORB_HOLD_MS, parseOrbColor, projectTapToSphere, type OrbInteraction } from '@stay-focused/shared';
import { useEffect, useMemo, useRef, type MutableRefObject, type PointerEvent } from 'react';
import { readLocalPreference, writeLocalPreference } from '../../lib/local-preference';
export interface OrbInteractionHandle {
  readonly state: MutableRefObject<OrbInteraction>;
  readonly wake: MutableRefObject<(() => void) | null>;
}
export const readOrbColor = () => parseOrbColor(readLocalPreference(ORB_COLOR_KEY));
export const rememberOrbColor = (index: number) => writeLocalPreference(ORB_COLOR_KEY, String(parseOrbColor(String(index))));
const listeners = new Set<(index: number) => void>();
export function useOrbInteraction(supplied?: OrbInteractionHandle): OrbInteractionHandle {
  const state = useRef(createOrbInteraction());
  const wake = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (supplied) return;
    const apply = (index: number) => {
      if (state.current.colorIndex === index) return;
      state.current = { ...state.current, colorFrom: orbIdleColor(state.current, Date.now(), false), colorIndex: index, colorAt: Date.now() };
      wake.current?.();
    };
    apply(readOrbColor()); listeners.add(apply);
    const stored = (event: StorageEvent) => { if (event.key === ORB_COLOR_KEY) apply(parseOrbColor(event.newValue)); };
    window.addEventListener('storage', stored);
    return () => { listeners.delete(apply); window.removeEventListener('storage', stored); };
  }, [supplied]);
  const local = useMemo(() => ({ state, wake }), []);
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
      rememberOrbColor(index); listeners.forEach(listener => listener(index));
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
