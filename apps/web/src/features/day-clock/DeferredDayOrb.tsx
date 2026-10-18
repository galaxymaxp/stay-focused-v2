"use client";
import { useEffect, useRef, useState } from 'react';
import { dayOrbTones } from './dayClock';
import { DAY_ORB_FILL } from './orb-footprint';

import { orbIdleColor } from '@stay-focused/shared';
import { useOrbInteraction, type OrbInteractionHandle } from '../knowledge-core/orbInteraction';

type Props = { minutes: number; size: number; ready: boolean; interaction?: OrbInteractionHandle };

/** Useful content and its still commit before even requesting the WebGL chunk. */
export function DeferredDayOrb({ minutes, size, ready, interaction: suppliedInteraction }: Props) {
  const interaction = useOrbInteraction(suppliedInteraction);
  const still = useRef<HTMLDivElement>(null);
  const [Orb, setOrb] = useState<typeof import('./DayOrb').DayOrb | null>(null);
  const [interactiveStill, setInteractiveStill] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!ready || (reduced && !interactiveStill) || Orb) return;
    let live = true, second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        void import('./DayOrb').then(module => { if (live) setOrb(() => module.DayOrb); }).catch(() => { /* Keep the still if WebGL cannot load. */ });
      });
    });
    return () => { live = false; cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [ready, reduced, interactiveStill, Orb]);
  useEffect(() => {
    if (Orb && (!reduced || interactiveStill)) return;
    const update = () => {
      if (interaction.state.current.gesture?.rotating) setInteractiveStill(true);
      const color = orbIdleColor(interaction.state.current, Date.now(), true);
      if (still.current) still.current.style.background = `radial-gradient(circle at 40% 32%, ${dayOrbTones(minutes).light} 0%, ${color} 45%, ${dayOrbTones(minutes).deep} 100%)`;
    };
    interaction.wake.current = update; update();
    return () => { if (interaction.wake.current === update) interaction.wake.current = null; };
  }, [Orb, reduced, interactiveStill, interaction, minutes]);
  if (Orb && (!reduced || interactiveStill)) return <Orb minutes={minutes} size={size} interaction={interaction} />;
  const tones = dayOrbTones(minutes);
  const diameter = size * DAY_ORB_FILL;
  return <div className="day-orb" data-testid="day-orb-still" aria-hidden="true" style={{ width: size, height: size, display: 'grid', placeItems: 'center' }}>
    <div ref={still} style={{ width: diameter, height: diameter, borderRadius: '50%',
      background: `radial-gradient(circle at 40% 32%, ${tones.light} 0%, ${tones.base} 45%, ${tones.deep} 100%)` }} />
  </div>;
}
