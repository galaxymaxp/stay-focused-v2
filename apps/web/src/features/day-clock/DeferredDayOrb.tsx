"use client";
import { useEffect, useRef, useState } from 'react';
import { DAY_ORB_FILL } from './orb-footprint';

import { orbIdleColor, orbPosterGradient } from '@stay-focused/shared';
import type { ClockGlassReadout } from '@stay-focused/shared';
import { useOrbInteraction, type OrbInteractionHandle } from '../knowledge-core/orbInteraction';

type Props = { minutes: number; size: number; ready: boolean; interaction?: OrbInteractionHandle;
  clock?: ClockGlassReadout; onGlassReady?: (ready: boolean) => void };

/** Useful content and its still commit before even requesting the WebGL chunk. */
export function DeferredDayOrb({ minutes, size, ready, clock, onGlassReady, interaction: suppliedInteraction }: Props) {
  const interaction = useOrbInteraction(suppliedInteraction);
  const still = useRef<HTMLDivElement>(null);
  const [Orb, setOrb] = useState<typeof import('./DayOrb').DayOrb | null>(null);
  const [interactiveStill, setInteractiveStill] = useState(false);
  const [reduced, setReduced] = useState(true);
  const hasClock = Boolean(clock);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!ready || (reduced && !interactiveStill && !hasClock) || Orb) return;
    let live = true, second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        void import('./DayOrb').then(module => { if (live) setOrb(() => module.DayOrb); }).catch(() => { /* Keep the still if WebGL cannot load. */ });
      });
    });
    return () => { live = false; cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [ready, reduced, interactiveStill, Orb, hasClock]);
  useEffect(() => {
    if (Orb && (!reduced || interactiveStill || hasClock)) return;
    const update = () => {
      if (interaction.state.current.gesture?.rotating || interaction.ringDragging?.current) setInteractiveStill(true);
      const color = orbIdleColor(interaction.state.current, Date.now(), true);
      if (still.current) still.current.style.background = orbPosterGradient(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', color);
    };
    interaction.wake.current = update; update();
    const theme = new MutationObserver(update);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { theme.disconnect(); if (interaction.wake.current === update) interaction.wake.current = null; };
  }, [Orb, reduced, interactiveStill, interaction, minutes, hasClock]);
  if (Orb && (!reduced || interactiveStill || hasClock)) return <Orb variant="clock" minutes={minutes} size={size} interaction={interaction} clock={clock} onGlassReady={onGlassReady} />;
  const diameter = size * DAY_ORB_FILL;
  return <div className="day-orb" data-testid="day-orb-still" aria-hidden="true" style={{ width: size, height: size, display: 'grid', placeItems: 'center' }}>
    <div ref={still} className="orb-static-source" data-orb-variant="clock" style={{ width: diameter, height: diameter, borderRadius: '50%',
      background: orbPosterGradient('light', orbIdleColor(interaction.state.current, Date.now(), true)) }} />
  </div>;
}
