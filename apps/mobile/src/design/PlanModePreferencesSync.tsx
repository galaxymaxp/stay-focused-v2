import { PlanModeSync } from '@stay-focused/shared';
import { isPlanMode } from '@stay-focused/shared/task-planning';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth';
import { sessionStore } from '../auth/sessionStore';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import { planModeStore } from '../features/redesign/planMode';
import { plannerPreferencesRequest } from '../services/plannerPreferencesApi';

const retiringWrites = new Map<string, Promise<void>>();
/** Per-owner cached choice and durable pending writes, matching orb sync. */
export function PlanModePreferencesSync() {
  const { session, isSigningOut } = useAuth();
  const current = useRef(session);
  current.current = isSigningOut ? null : session;
  const controller = useRef<PlanModeSync | null>(null);
  const owner = isSigningOut ? undefined : session?.user.id;
  useEffect(() => {
    planModeStore.reset();
    if (!owner) return;
    const cacheKey = `sf.plan-mode.${owner}`, pendingKey = `sf.plan-mode.pending.${owner}`;
    let live = true, chosen = false;
    const sync = new PlanModeSync({
      readPending: async () => {
        await retiringWrites.get(owner);
        const cached = await sessionStore.getItem(cacheKey);
        if (live && !chosen && isPlanMode(cached)) planModeStore.apply(cached);
        return sessionStore.getItem(pendingKey);
      },
      writePending: async mode => {
        if (mode) await sessionStore.setItem(pendingKey, mode);
        else await sessionStore.removeItem(pendingKey);
      },
      request: async planMode => {
        const session = current.current;
        if (!session || session.user.id !== owner || session.offline) throw new Error('offline');
        return plannerPreferencesRequest({ baseUrl: getApiBaseUrl() ?? '', accessToken: session.accessToken, planMode });
      },
      apply: mode => {
        void Promise.resolve(sessionStore.setItem(cacheKey, mode)).catch(() => {});
        planModeStore.apply(mode);
      },
    });
    controller.current = sync;
    const unsubscribe = planModeStore.onChoice(mode => {
      chosen = true;
      void Promise.resolve(sessionStore.setItem(cacheKey, mode)).catch(() => {});
      sync.choose(mode);
    });
    void sync.refresh();
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void sync.refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void sync.refresh(); }, 15_000);
    return () => {
      live = false; controller.current = null; unsubscribe(); sync.dispose(); foreground.remove(); clearInterval(timer);
      const writes = sync.settled(); retiringWrites.set(owner, writes);
      void writes.then(() => { if (retiringWrites.get(owner) === writes) retiringWrites.delete(owner); });
    };
  }, [owner]);
  useEffect(() => { if (session && !session.offline) void controller.current?.refresh(); }, [session]);
  return null;
}
