"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "../components/providers";
import {
  EMPTY_LIST_PREFERENCES,
  parseListPreferences,
  setHidden,
  setPinned,
  setRead,
  type HideSurface,
  type ListPreferences,
  type PinKind,
} from "../app-model/listPreferences";

// Web counterpart of apps/mobile/src/features/redesign/useListPreferences.ts.
// Pins and hides are personal browsing preferences kept in this browser; they
// never change Canvas, sync state or saved study work.

const storageKey = (owner: string) => `sf.list-preferences.v1.${owner}`;
const cache = new Map<string, ListPreferences>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function load(owner: string) {
  if (cache.has(owner)) return;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(owner));
  } catch {
    /* Storage unavailable: preferences last for this visit only. */
  }
  cache.set(owner, parseListPreferences(raw));
}
function update(owner: string, change: (prefs: ListPreferences) => ListPreferences) {
  const next = change(cache.get(owner) ?? EMPTY_LIST_PREFERENCES);
  cache.set(owner, next);
  emit();
  try {
    localStorage.setItem(storageKey(owner), JSON.stringify(next));
  } catch {
    /* Not remembered this time. */
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed them.
  const onStorage = (event: StorageEvent) => {
    if (!event.key?.startsWith("sf.list-preferences.v1.")) return;
    const owner = event.key.slice("sf.list-preferences.v1.".length);
    cache.set(owner, parseListPreferences(event.newValue));
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useListPreferences() {
  const { session } = useAuth();
  const owner = session?.user.id ?? "";
  useEffect(() => {
    if (owner) {
      load(owner);
      emit();
    }
  }, [owner]);
  const prefs = useSyncExternalStore(
    subscribe,
    () => (owner ? (cache.get(owner) ?? EMPTY_LIST_PREFERENCES) : EMPTY_LIST_PREFERENCES),
    () => EMPTY_LIST_PREFERENCES,
  );
  const pin = useCallback(
    (kind: PinKind, id: string, pinned: boolean) =>
      owner && update(owner, (p) => setPinned(p, kind, id, pinned)),
    [owner],
  );
  const hide = useCallback(
    (surface: HideSurface, id: string, hidden: boolean) =>
      owner && update(owner, (p) => setHidden(p, surface, id, hidden)),
    [owner],
  );
  const read = useCallback(
    (id: string, isRead: boolean) => owner && update(owner, (p) => setRead(p, id, isRead)),
    [owner],
  );
  return { prefs, pin, hide, read };
}
