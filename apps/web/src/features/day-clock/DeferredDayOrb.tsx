"use client";
import { useEffect, useState } from 'react';
import { DAY_ORB_FILL } from './orb-footprint';

import type { ClockGlassReadout, OrbVariant } from '@stay-focused/shared';
import type { CoreState } from '../knowledge-core/coreModel';
import { useOrbInteraction, type OrbInteractionHandle } from '../knowledge-core/orbInteraction';
import { OrbLoadPoster, usePosterInteraction } from './OrbLoadPoster';
import { preloadDayOrb } from './preloadDayOrb';
import { useOrbLoad } from './useOrbLoad';

type Props = { minutes: number; size?: number; ready: boolean; interaction?: OrbInteractionHandle;
  variant?: OrbVariant; state?: CoreState; clock?: ClockGlassReadout; onGlassReady?: (ready: boolean) => void };

/** The poster commits first; chunk and atlas start together before data readiness. */
export function DeferredDayOrb({ minutes, size, ready, variant = 'clock', state, clock, onGlassReady, interaction: suppliedInteraction }: Props) {
  const interaction = useOrbInteraction(suppliedInteraction);
  const { poster, scene } = usePosterInteraction(interaction);
  const [Orb, setOrb] = useState<typeof import('./DayOrb').DayOrb | null>(null);
  const [interactiveStill, setInteractiveStill] = useState(false);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const hasClock = Boolean(clock);
  const needsPose = hasClock || variant === 'standalone';
  const shouldLoad = reduced !== null && (!reduced || interactiveStill || needsPose);
  const { status: loadStatus, ready: chunkReady, fail: chunkFailed } = useOrbLoad(shouldLoad);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!shouldLoad) return;
    let live = true;
    void preloadDayOrb(hasClock).then(module => {
      if (live) { setOrb(() => module.DayOrb); chunkReady(); }
    }).catch(() => { if (live) chunkFailed(); });
    return () => { live = false; };
  }, [shouldLoad, hasClock, chunkReady, chunkFailed]);
  useEffect(() => {
    if (Orb && ready && loadStatus !== 'failed') return;
    const wake = () => {
      if (interaction.state.current.gesture?.rotating || interaction.ringDragging?.current) setInteractiveStill(true);
    };
    scene.wake.current = wake;
    return () => { if (scene.wake.current === wake) scene.wake.current = null; };
  }, [scene, interaction, Orb, ready, loadStatus]);
  if (Orb && ready && loadStatus !== 'failed' && (!reduced || interactiveStill || needsPose)) {
    return <Orb variant={variant} state={state} minutes={minutes} size={size} interaction={scene} clock={clock} onGlassReady={onGlassReady} />;
  }
  return <div className="day-orb" data-orb-variant={variant} data-orb-load={loadStatus === 'failed' ? 'failed' : 'loading'} aria-hidden="true" style={{ width: size ?? '100%', height: size ?? '100%' }}>
    <OrbLoadPoster poster={poster} interaction={interaction} variant={variant} diameter={size ? size * DAY_ORB_FILL : `${DAY_ORB_FILL * 100}%`} />
  </div>;
}
