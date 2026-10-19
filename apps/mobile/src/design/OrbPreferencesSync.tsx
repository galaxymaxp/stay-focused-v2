import { OrbPreferenceSync } from '@stay-focused/shared';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth';
import { sessionStore } from '../auth/sessionStore';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import { applySyncedOrbColor, subscribeOrbColorChoices } from '../features/generation-core/orbInteraction';
import { profilePreferencesRequest } from '../services/profilePreferencesApi';

const retiringWrites = new Map<string, Promise<void>>();
export function OrbPreferencesSync() {
  const { session, isSigningOut } = useAuth();
  const current = useRef(session);
  current.current = isSigningOut ? null : session;
  const controller = useRef<OrbPreferenceSync | null>(null);
  const owner = isSigningOut ? undefined : session?.user.id;
  useEffect(() => {
    if (!owner) return;
    const pendingKey = `sf.orb.pending.${owner}`;
    const sync = new OrbPreferenceSync({
      readPending: async () => { await retiringWrites.get(owner); return sessionStore.getItem(pendingKey); },
      writePending: async key => { if (key) await sessionStore.setItem(pendingKey, key); else await sessionStore.removeItem(pendingKey); },
      request: async orbColor => {
        const session = current.current;
        if (!session || session.user.id !== owner || session.offline) throw new Error('offline');
        return profilePreferencesRequest({ baseUrl: getApiBaseUrl() ?? '', accessToken: session.accessToken, orbColor });
      },
      apply: applySyncedOrbColor,
    });
    controller.current = sync;
    const unsubscribe = subscribeOrbColorChoices(key => sync.choose(key));
    void sync.refresh();
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void sync.refresh(); });
    // Existing repo reconnect fallback: retry while active, including a valid
    // but temporarily disconnected session. No new native dependency.
    const timer = setInterval(() => { if (AppState.currentState === 'active') void sync.refresh(); }, 15_000);
    return () => {
      controller.current = null; unsubscribe(); sync.dispose(); foreground.remove(); clearInterval(timer);
      const writes = sync.settled(); retiringWrites.set(owner, writes);
      void writes.then(() => { if (retiringWrites.get(owner) === writes) retiringWrites.delete(owner); });
    };
  }, [owner]);
  useEffect(() => { if (session && !session.offline) void controller.current?.refresh(); }, [session]);
  return null;
}
