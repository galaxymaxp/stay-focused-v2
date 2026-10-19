"use client";
import { orbIdleColor } from '@stay-focused/shared';
import { useEffect, useRef } from 'react';
import type { OrbInteractionHandle } from './orbInteraction';

/** Failure still and its spill share one gradient; never schedules animation. */
export function OrbStill({ interaction, tones, idle = true, className = 'knowledge-core-fallback' }: {
  interaction: OrbInteractionHandle;
  tones?: { light: string; deep: string };
  idle?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      const color = idle ? orbIdleColor(interaction.state.current, Date.now(), true) : dark ? '#DDE3EE' : '#E6EAF1';
      if (ref.current) ref.current.style.background = `radial-gradient(circle at 40% 32%, ${tones?.light ?? (dark ? '#CFDDFF' : '#9FB8F0')} 0%, ${color} 45%, ${tones?.deep ?? (dark ? '#161B26' : '#4F5868')} 100%)`;
    };
    interaction.wake.current = sync; sync();
    const theme = new MutationObserver(sync);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { theme.disconnect(); if (interaction.wake.current === sync) interaction.wake.current = null; };
  }, [interaction, tones?.light, tones?.deep, idle]);
  return <div ref={ref} className={`${className} orb-static-source`} />;
}
