"use client";
import { orbIdleColor, orbPosterGradient } from '@stay-focused/shared';
import { useEffect, useRef } from 'react';
import type { OrbInteractionHandle } from './orbInteraction';

/** Failure still and its spill share one gradient; never schedules animation. */
export function OrbStill({ interaction, idle = true, className = 'knowledge-core-fallback' }: {
  interaction: OrbInteractionHandle;
  idle?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const mode = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const color = idle ? orbIdleColor(interaction.state.current, Date.now(), true) : undefined;
      if (ref.current) ref.current.style.background = orbPosterGradient(mode, color);
    };
    interaction.wake.current = sync; sync();
    const theme = new MutationObserver(sync);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { theme.disconnect(); if (interaction.wake.current === sync) interaction.wake.current = null; };
  }, [interaction, idle]);
  return <div ref={ref} className={`${className} orb-static-source`} />;
}
