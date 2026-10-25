"use client";
import { orbStillPaletteColor, type OrbStillRequest } from '@stay-focused/shared/orb-still';
import { useEffect, useRef } from 'react';
import type { OrbInteractionHandle } from '../features/knowledge-core/orbInteraction';

/** Queue-only cached body. No spill, clock, autonomous loop or visible GL view. */
export function QueueOrb({ interaction, size = 26, live = true }: {
  interaction: OrbInteractionHandle; size?: number; live?: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    let disposed = false, revision = 0, focused = document.hasFocus();
    const sync = () => {
      const ticket = ++revision;
      if (disposed || !live || !focused || document.visibilityState === 'hidden') return;
      const request: OrbStillRequest = {
        color: orbStillPaletteColor(interaction.state.current.colorIndex),
        mode: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
        pixels: Math.max(8, Math.min(512, Math.round(size * Math.min(window.devicePixelRatio || 1, 3)))),
      };
      const fallback = `/queue/stills/ql1-v1-${request.color.slice(1).toLowerCase()}-${request.mode}.png`;
      if (node.dataset.mode !== request.mode) node.classList.remove('queue-orb-fade');
      if (node.dataset.mode === request.mode && node.dataset.color && node.dataset.color !== request.color) {
        node.style.setProperty('--queue-orb-previous', node.style.backgroundImage);
        node.classList.remove('queue-orb-fade');
        // Restart a finite compositor fade only on a palette change, never on a
        // render/cache completion. The base is the new color; the old fades away.
        void node.offsetWidth;
        node.classList.add('queue-orb-fade');
      }
      node.style.backgroundImage = `url("${fallback}")`;
      node.dataset.color = request.color; node.dataset.mode = request.mode;
      void import('../features/queue-orb-still').then(({ queueOrbStills }) => {
        if (disposed || revision !== ticket) return undefined;
        return queueOrbStills.get(request);
      }).then(image => {
        if (image && !disposed && revision === ticket) node.style.backgroundImage = `url("${image}")`;
      }).catch(() => { /* Same-scene bundled still is already visible. */ });
    };
    const focus = () => { focused = true; sync(); };
    const blur = () => { focused = false; revision++; };
    interaction.wake.current = sync; sync();
    const theme = new MutationObserver(sync);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('focus', focus); window.addEventListener('blur', blur);
    window.addEventListener('resize', sync); document.addEventListener('visibilitychange', sync);
    return () => {
      disposed = true; revision++; theme.disconnect();
      if (interaction.wake.current === sync) interaction.wake.current = null;
      window.removeEventListener('focus', focus); window.removeEventListener('blur', blur);
      window.removeEventListener('resize', sync); document.removeEventListener('visibilitychange', sync);
    };
  }, [interaction, live, size]);
  return <div ref={element} className="queue-orb-frame queue-orb-still" data-testid="queue-orb-still"
    style={{ width: size, height: size }} aria-hidden="true" />;
}
