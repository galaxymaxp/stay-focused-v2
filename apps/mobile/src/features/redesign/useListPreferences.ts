import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "../../auth";
import { sessionStore } from "../../auth/sessionStore";
import {
  EMPTY_LIST_PREFERENCES,
  parseListPreferences,
  setHidden,
  setPinned,
  setRead,
  type HideSurface,
  type ListPreferences,
  type PinKind,
} from "./listPreferences";

const storageKey = (owner: string) => `sf.list-preferences.v1.${owner}`;

/**
 * One in-memory copy per owner, shared by every mounted screen so a pin made
 * in Generate is already in place when Library renders. Writes are serialized
 * so two quick toggles can never save out of order.
 */
const cache = new Map<string, ListPreferences>();
const loading = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let writes: Promise<unknown> = Promise.resolve();

function emit() {
  for (const listener of listeners) listener();
}

function load(owner: string): Promise<void> {
  const pending = loading.get(owner);
  if (pending) return pending;
  const next = Promise.resolve(sessionStore.getItem(storageKey(owner)))
    .then((raw) => {
      if (!cache.has(owner)) cache.set(owner, parseListPreferences(raw));
    })
    .catch(() => {
      if (!cache.has(owner)) cache.set(owner, EMPTY_LIST_PREFERENCES);
    })
    .then(emit);
  loading.set(owner, next);
  return next;
}

function update(owner: string, change: (prefs: ListPreferences) => ListPreferences) {
  const next = change(cache.get(owner) ?? EMPTY_LIST_PREFERENCES);
  cache.set(owner, next);
  emit();
  const serialized = JSON.stringify(next);
  writes = writes
    .catch(() => undefined)
    .then(() => sessionStore.setItem(storageKey(owner), serialized))
    .catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useListPreferences() {
  const { session } = useAuth();
  const owner = session?.user.id ?? "";
  useEffect(() => {
    if (owner) void load(owner);
  }, [owner]);
  const prefs = useSyncExternalStore(
    subscribe,
    () => cache.get(owner) ?? EMPTY_LIST_PREFERENCES,
    () => EMPTY_LIST_PREFERENCES,
  );
  const pin = useCallback((kind: PinKind, id: string, pinned: boolean) => {
    if (owner) update(owner, (current) => setPinned(current, kind, id, pinned));
  }, [owner]);
  const hide = useCallback((surface: HideSurface, id: string, hidden: boolean) => {
    if (owner) update(owner, (current) => setHidden(current, surface, id, hidden));
  }, [owner]);
  const markRead = useCallback((id: string, read: boolean) => {
    if (owner) update(owner, (current) => setRead(current, id, read));
  }, [owner]);
  return useMemo(() => ({ prefs, pin, hide, markRead }), [prefs, pin, hide, markRead]);
}
