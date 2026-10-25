"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

import { preloadDayOrb } from '../day-clock/preloadDayOrb';
import { useOrbLoad } from '../day-clock/useOrbLoad';
import type { PlanGlassHandle } from '../day-clock/PlanGlassCanvas';

/** Navigation action: fixed glass shell; only the liquid layer moves. */
export function PlanButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
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
  return <button ref={button} type="button" className="plan-action" data-live={live} data-plan-gl={status} disabled={disabled} aria-label="Plan your free time"
    aria-haspopup="dialog" onClick={event => {
      animation.current?.cancel();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animation.current = button.current?.animate([{ opacity: 1 }, { opacity: 0.85 }, { opacity: 1 }], { duration: 180 }) ?? null;
      } else {
        animation.current = liquid.current?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-5deg)', offset: 0.25 },
          { transform: 'rotate(3deg)', offset: 0.55 }, { transform: 'rotate(-1deg)', offset: 0.8 }, { transform: 'rotate(0deg)' }], { duration: 600, easing: 'ease-out' }) ?? null;
      }
      if (status !== 'failed') {
        const rect = event.currentTarget.getBoundingClientRect();
        handle.current?.press(event.detail ? (event.clientX - rect.left) / rect.width * 2 - 1 : 0.5);
      }
      onPress();
    }}>
    {status !== 'failed' && Canvas && <Canvas handle={handle} onReady={readyFrame} onFailure={fail} />}
    <div className="plan-action-fallback" aria-hidden="true"><div ref={liquid} className="plan-action-liquid" aria-hidden="true"><svg viewBox="0 0 400 52" preserveAspectRatio="none" width="100%" height="100%">
      <g className="plan-liquid-flow"><path d="M-400 32 Q-350 14 -300 30 T-200 30 T-100 30 T0 30 T100 30 T200 30 T300 30 T400 30 T500 30 T600 30 T700 30 T800 30 V90 H-400Z" fill="currentColor" opacity="0.32" />
        <path d="M-400 38 Q-350 23 -300 38 T-200 38 T-100 38 T0 38 T100 38 T200 38 T300 38 T400 38 T500 38 T600 38 T700 38 T800 38 V90 H-400Z" fill="currentColor" opacity="0.38" /></g>
    </svg></div>
    <span className="plan-glass-label">Plan</span></div>
  </button>;
}
