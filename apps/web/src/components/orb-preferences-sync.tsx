"use client";
import { OrbPreferenceSync, type ProfilePreferences } from '@stay-focused/shared';
import { useEffect, useRef } from 'react';
import { applySyncedOrbColor, subscribeOrbColorChoices } from '../features/knowledge-core/orbInteraction';
import { readLocalPreference, writeLocalPreference } from '../lib/local-preference';
import { useAuth } from './providers';

const retiringWrites = new Map<string, Promise<void>>();
export function OrbPreferencesSync() {
  const { session, api } = useAuth();
  const current = useRef({ session, api });
  current.current = { session, api };
  const owner = session?.user.id;
  useEffect(() => {
    if (!owner) return;
    const pendingKey = `sf.orb.pending.${owner}`;
    const sync = new OrbPreferenceSync({
      readPending: async () => { await retiringWrites.get(owner); return readLocalPreference(pendingKey); },
      writePending: async key => writeLocalPreference(pendingKey, key ?? ''),
      request: orbColor => {
        if (current.current.session?.user.id !== owner) return Promise.reject(new Error('signed_out'));
        return current.current.api<ProfilePreferences>('/api/profile/preferences', orbColor ? { method: 'PATCH', body: { orbColor } } : undefined);
      },
      apply: applySyncedOrbColor,
    });
    const unsubscribe = subscribeOrbColorChoices(key => sync.choose(key));
    const refresh = () => { void sync.refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', visible);
    // A transient server error can recover without another browser online event.
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15_000);
    return () => {
      unsubscribe(); sync.dispose(); clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', visible);
      const writes = sync.settled(); retiringWrites.set(owner, writes);
      void writes.then(() => { if (retiringWrites.get(owner) === writes) retiringWrites.delete(owner); });
    };
  }, [owner]);
  return null;
}
