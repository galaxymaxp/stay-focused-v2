"use client";
import { useEffect, useState } from 'react';
import { dayOrbTones } from './dayClock';
import { DAY_ORB_FILL } from './orb-footprint';

type Props = { minutes: number; size: number; ready: boolean };

/** Useful content and its still commit before even requesting the WebGL chunk. */
export function DeferredDayOrb({ minutes, size, ready }: Props) {
  const [Orb, setOrb] = useState<typeof import('./DayOrb').DayOrb | null>(null);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!ready || reduced || Orb) return;
    let live = true, second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        void import('./DayOrb').then(module => { if (live) setOrb(() => module.DayOrb); }).catch(() => { /* Keep the still if WebGL cannot load. */ });
      });
    });
    return () => { live = false; cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [ready, reduced, Orb]);
  if (Orb && !reduced) return <Orb minutes={minutes} size={size} />;
  const tones = dayOrbTones(minutes);
  const diameter = size * DAY_ORB_FILL;
  return <div className="day-orb" data-testid="day-orb-still" aria-hidden="true" style={{ width: size, height: size, display: 'grid', placeItems: 'center' }}>
    <div style={{ width: diameter, height: diameter, borderRadius: '50%',
      background: `radial-gradient(circle at 40% 32%, ${tones.light} 0%, ${tones.base} 45%, ${tones.deep} 100%)` }} />
  </div>;
}
