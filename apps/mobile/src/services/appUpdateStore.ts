import { compareInstalled, isLatestRelease, shouldCheck, type LatestRelease } from '@stay-focused/shared';

export interface AppUpdateState {
  lastCheckedAt: number | null;
  lastAttemptAt: number | null;
  dismissedVersionCode: number | null;
  latest: LatestRelease | null;
  online: boolean;
  confirmed: boolean;
  checking: boolean;
}
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
export const APP_UPDATE_KEY = 'sf.app-update.v1';

/** Device-wide public metadata; independent of auth and any student's Library. */
export function createAppUpdateStore(deps: {
  storage: Storage;
  online(): Promise<boolean>;
  load(): Promise<LatestRelease | null>;
  now?: () => number;
}) {
  let state: AppUpdateState = { lastCheckedAt: null, lastAttemptAt: null, dismissedVersionCode: null, latest: null, online: false, confirmed: false, checking: false };
  const listeners = new Set<() => void>();
  const now = deps.now ?? Date.now;
  const emit = (patch: Partial<AppUpdateState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  let writes = Promise.resolve();
  const persist = () => {
    const value = JSON.stringify({ lastCheckedAt: state.lastCheckedAt, lastAttemptAt: state.lastAttemptAt, dismissedVersionCode: state.dismissedVersionCode, latest: state.latest });
    writes = writes.then(() => deps.storage.setItem(APP_UPDATE_KEY, value)).catch(() => undefined);
    return writes;
  };
  let hydration: Promise<void> | null = null;
  const hydrate = () => hydration ??= (async () => {
    try {
      const raw = await deps.storage.getItem(APP_UPDATE_KEY);
      const value: unknown = raw ? JSON.parse(raw) : null;
      if (!value || typeof value !== 'object') return;
      const saved = value as Record<string, unknown>;
      const timestamp = (item: unknown) => typeof item === 'number' && Number.isFinite(item) && item >= 0 ? item : null;
      emit({ lastCheckedAt: timestamp(saved.lastCheckedAt), lastAttemptAt: timestamp(saved.lastAttemptAt),
        dismissedVersionCode: typeof saved.dismissedVersionCode === 'number' && Number.isSafeInteger(saved.dismissedVersionCode) && saved.dismissedVersionCode > 0 ? saved.dismissedVersionCode : null,
        latest: isLatestRelease(saved.latest) ? saved.latest : null });
    } catch { /* Corrupt/unavailable storage behaves like first launch. */ }
  })();
  let epoch = 0;
  let pending: Promise<'checked' | 'silent' | 'throttled'> | null = null;
  const suspend = () => { epoch++; emit({ online: false, confirmed: false }); };
  const check = (options: { manual?: boolean; offline?: boolean } = {}) => {
    if (options.offline) { suspend(); return Promise.resolve('silent' as const); }
    if (pending) return pending;
    const generation = epoch;
    pending = (async () => {
      await hydrate();
      if (epoch !== generation) return 'silent' as const;
      emit({ checking: true });
      try {
        if (!await deps.online()) { if (epoch === generation) suspend(); return 'silent' as const; }
        if (epoch !== generation) return 'silent' as const;
        emit({ online: true });
        if (!options.manual && !shouldCheck(state.lastAttemptAt, now())) return 'throttled' as const;
        emit({ lastAttemptAt: now() }); await persist();
        const latest = await deps.load();
        if (epoch !== generation) return 'silent' as const;
        emit({ latest, confirmed: latest !== null, lastCheckedAt: now() }); await persist();
        return 'checked' as const;
      } catch { if (epoch === generation) suspend(); return 'silent' as const; }
      finally { emit({ checking: false }); }
    })().finally(() => { pending = null; });
    return pending;
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate, check, suspend,
    async dismiss(versionCode: number) { await hydrate(); emit({ dismissedVersionCode: versionCode }); await persist(); },
    async refreshOnline() {
      const generation = epoch;
      try { if (!await deps.online() && epoch === generation) suspend(); } catch { if (epoch === generation) suspend(); }
    },
  };
}

export function appUpdatePresentation(state: AppUpdateState, installed: { versionCode: number; runtimeVersion: string | null }) {
  const status = state.latest ? compareInstalled({ installed, latest: state.latest }) : 'up-to-date';
  return {
    status,
    banner: state.online && status === 'update-available' && state.latest?.versionCode !== state.dismissedVersionCode,
    unsupported: state.online && state.confirmed && status === 'unsupported',
  };
}
