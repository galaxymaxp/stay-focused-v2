"use client";
import { orbIdleColor, ORB_THEME_TONES, ORB_GLASS_MATERIAL } from '@stay-focused/shared';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { OrbInteractionHandle } from '../knowledge-core/orbInteraction';

/** Forward event wakes to both poster and scene; neither steals the other's wake ref. */
export function usePosterInteraction(interaction: OrbInteractionHandle) {
  const poster = useRef<HTMLDivElement>(null);
  const wake = useRef<(() => void) | null>(null);
  const scene = useMemo(() => ({ ...interaction, wake }), [interaction]);
  useEffect(() => {
    const sync = () => {
      poster.current?.style.setProperty('--orb-poster-color', orbIdleColor(interaction.state.current, Date.now(), true));
      wake.current?.();
    };
    interaction.wake.current = sync; sync();
    return () => { if (interaction.wake.current === sync) interaction.wake.current = null; };
  }, [interaction]);
  return { poster, scene };
}

export function OrbLoadPoster({ poster, interaction, variant, diameter }: {
  poster: React.RefObject<HTMLDivElement | null>;
  interaction: OrbInteractionHandle;
  variant: 'clock' | 'standalone';
  diameter: number | string;
}) {
  return <div className="orb-poster-layer" data-testid="day-orb-still" aria-hidden="true">
    <div ref={poster} className="orb-static-source day-orb-fallback" data-orb-variant={variant} style={{
      width: diameter, height: diameter, margin: 0,
      '--orb-poster-color': orbIdleColor(interaction.state.current, Date.now(), true),
      '--orb-poster-light': ORB_THEME_TONES.light.deep,
      '--orb-poster-dark': ORB_THEME_TONES.dark.deep,
      '--orb-poster-start': ORB_GLASS_MATERIAL.light.posterOpacity[0] * 100 + '%',
      '--orb-poster-mid': ORB_GLASS_MATERIAL.light.posterOpacity[1] * 100 + '%',
      '--orb-poster-edge': ORB_GLASS_MATERIAL.light.posterOpacity[2] * 100 + '%',
    } as CSSProperties} />
  </div>;
}
