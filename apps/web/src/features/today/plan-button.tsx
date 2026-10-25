"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

import { orbIdleColor } from '@stay-focused/shared';
import { useOrbInteraction } from '../knowledge-core/orbInteraction';
import { preloadDayOrb } from '../day-clock/preloadDayOrb';
import { useOrbLoad } from '../day-clock/useOrbLoad';
import type { PlanGlassHandle } from '../day-clock/PlanGlassCanvas';

/** Navigation action: fixed glass shell; only the liquid layer moves. */
export function PlanButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const interaction = useOrbInteraction();
  const [Canvas, setCanvas] = useState<typeof import('../day-clock/PlanGlassCanvas').PlanGlassCanvas | null>(null);
  const { status, ready, fail } = useOrbLoad();
  const handle = useRef<PlanGlassHandle | null>(null);
  const readyFrame = useCallback(() => ready(), [ready]);
  useEffect(() => {
    let mounted = true;
    void preloadDayOrb(false).then(module => { if (mounted) setCanvas(() => module.PlanGlassCanvas); }).catch(() => { if (mounted) fail(); });
    return () => { mounted = false; };
  }, [fail]);
  const [live, setLive] = useState(true);
  const liquid = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const animation = useRef<Animation | null>(null);
  useEffect(() => {
    const visibility = () => {
      setLive(document.visibilityState === 'visible' && (document.hasFocus?.() ?? true));
      if (document.visibilityState !== 'visible' || !(document.hasFocus?.() ?? true)) animation.current?.cancel();
    };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('focus', visibility); window.addEventListener('blur', visibility);
    visibility();
    return () => { animation.current?.cancel(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('focus', visibility); window.removeEventListener('blur', visibility); };
  }, []);
  useEffect(() => {
    let pending: number | null = null;
    const draw = () => {
      pending = null;
      const now = Date.now(), reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      button.current?.style.setProperty('--orb-liquid-color', orbIdleColor(interaction.state.current, now, reduced));
      if (live && !reduced && now - interaction.state.current.colorAt < 600) pending = requestAnimationFrame(draw);
    };
    const wake = () => { if (pending === null) pending = requestAnimationFrame(draw); };
    interaction.wake.current = wake; draw();
    return () => { interaction.wake.current = null; if (pending !== null) cancelAnimationFrame(pending); };
  }, [interaction, live]);
  return <button ref={button} type="button" className="plan-action" data-live={live} data-plan-gl={status} disabled={disabled} aria-label="Plan your free time"
    aria-haspopup="dialog" onClick={event => {
      animation.current?.cancel();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animation.current = button.current?.animate([{ opacity: 1 }, { opacity: 0.85 }, { opacity: 1 }], { duration: 180 }) ?? null;
      }
      if (status !== 'failed') {
        const rect = event.currentTarget.getBoundingClientRect();
        handle.current?.press(event.detail ? (event.clientX - rect.left) / rect.width * 2 - 1: 0, event.detail ? 1 - (event.clientY - rect.top) / rect.height * 2 : 0);
      }
      onPress();
    }}>
    {status !== 'failed' && Canvas && <Canvas handle={handle} onReady={readyFrame} onFailure={fail} />}
    <div className="plan-action-fallback" aria-hidden="true"><div ref={liquid} className="plan-action-liquid" aria-hidden="true"><svg viewBox="0 0 400 52" preserveAspectRatio="none" width="100%" height="100%">
      <g className="plan-liquid-flow"><path d="M-400 -20 H800 V90 H-400Z" fill="currentColor" opacity="0.32" />
        <path d="M-400 -10 Q-200 65 0 5 T400 5 T800 5 V90 H-400Z" fill="currentColor" opacity="0.38" /></g>
    </svg></div>
    <span className="plan-glass-label">Plan</span></div>
  </button>;
}
