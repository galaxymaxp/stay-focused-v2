"use client";
import { PlanModeSync, type PlannerPreferences } from '@stay-focused/shared';
import { isPlanMode } from '@stay-focused/shared/task-planning';
import { useEffect, useRef } from 'react';
import { readLocalPreference, writeLocalPreference } from '../lib/local-preference';
import { planModeStore } from '../lib/plan-mode';
import { useAuth } from './providers';

// Mirrors OrbPreferencesSync: the choice shows at once, saves 600ms after the
// last change and keeps a durable per-owner pending value while offline.
const retiringWrites = new Map<string, Promise<void>>();
export function PlanModePreferencesSync() {
  const { session, api } = useAuth();
  const current = useRef({ session, api });
  current.current = { session, api };
  const owner = session?.user.id;
  useEffect(() => {
    planModeStore.reset();
    if (!owner) return;
    const cacheKey = `sf.plan-mode.${owner}`, pendingKey = `sf.plan-mode.pending.${owner}`;
    const cached = readLocalPreference(cacheKey);
    if (isPlanMode(cached)) planModeStore.apply(cached);
    const sync = new PlanModeSync({
      readPending: async () => { await retiringWrites.get(owner); return readLocalPreference(pendingKey); },
      writePending: async mode => writeLocalPreference(pendingKey, mode ?? ''),
      request: planMode => {
        if (current.current.session?.user.id !== owner) return Promise.reject(new Error('signed_out'));
        return current.current.api<PlannerPreferences>('/api/profile/planner-preferences', planMode ? { method: 'PATCH', body: { planMode } } : undefined);
      },
      apply: mode => { writeLocalPreference(cacheKey, mode); planModeStore.apply(mode); },
    });
    const unsubscribe = planModeStore.onChoice(mode => { writeLocalPreference(cacheKey, mode); sync.choose(mode); });
    const refresh = () => { void sync.refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', visible);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15_000);
    return () => {
      unsubscribe(); sync.dispose(); clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', visible);
      const writes = sync.settled(); retiringWrites.set(owner, writes);
      void writes.then(() => { if (retiringWrites.get(owner) === writes) retiringWrites.delete(owner); });
    };
  }, [owner]);
  return null;
}
