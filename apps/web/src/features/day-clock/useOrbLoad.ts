"use client";
import { createOrbLoadGate, type OrbLoadStatus } from '@stay-focused/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useOrbLoad(enabled = true) {
  const [status, setStatus] = useState<OrbLoadStatus>('loading');
  const gate = useRef<ReturnType<typeof createOrbLoadGate> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const current = createOrbLoadGate(setStatus, () => console.warn('Orb unavailable; keeping static poster.'));
    gate.current = current;
    const active = () => current.setActive(document.visibilityState !== 'hidden');
    active(); document.addEventListener?.('visibilitychange', active);
    return () => { document.removeEventListener?.('visibilitychange', active); current.dispose(); gate.current = null; };
  }, [enabled]);
  const ready = useCallback(() => gate.current?.ready(), []);
  const fail = useCallback(() => gate.current?.fail(), []);
  return { status, ready, fail };
}
