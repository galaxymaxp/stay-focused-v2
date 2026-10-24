"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { mergeSavedData } from "@stay-focused/shared";
import { readScreenSnapshot, writeScreenSnapshot, removeScreenSnapshot, snapshotEpoch, isScreenSnapshotPath } from "./screen-snapshots";
import { useAuth } from "../components/providers";
import { ApiError, type RequestOptions } from "./api";

export type ResourcePublisher<T> = (data: T, combine?: (previous: T | null, next: T) => T) => void;

export function useResource<T>(
  path: string | null,
  poll = 0,
  envelope: RequestOptions["envelope"] = "data",
  holdReviewer = false,
  loader?: (signal: AbortSignal, publish: ResourcePublisher<T>) => Promise<T>,
  paused?: { readonly current: boolean },
) {
  const { api, session } = useAuth();
  const identity = `${session?.user.id ?? ""}:${path}:${envelope}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    identity: string;
    savedAt: string | null;
    refreshing: boolean;
    pending: T | null;
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ identity, savedAt: null, refreshing: false, pending: null, data: null, error: null, loading: true });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!path || !session?.user.id) return;
    const owner = session.user.id;
    const epoch = snapshotEpoch(owner);
    const cacheKey = `${envelope}:${path}`;
    const cacheable = isScreenSnapshotPath(path);
    let alive = true;
    let inFlight = false;
    const controller = new AbortController();
    const load = async () => {
      if (paused?.current || document.visibilityState === "hidden" || inFlight) return;
      inFlight = true;
      setState((old) => ({
        identity,
        data: old.identity === identity ? old.data : null,
        error: null,
        savedAt: old.identity === identity ? old.savedAt : null,
        pending: old.identity === identity ? old.pending : null,
        refreshing: true,
        loading: old.identity !== identity || old.data === null,
      }));
      try {
        const publish: ResourcePublisher<T> = (data, combine = mergeSavedData) => {
          if (!alive || controller.signal.aborted || snapshotEpoch(owner) !== epoch) return;
          // A partial walk is visible immediately but never replaces the saved
          // complete snapshot or marks refresh finished.
          setState(old => ({ ...old, identity, data: combine(old.identity === identity ? old.data : null, data),
            loading: false, refreshing: true, error: null }));
        };
        const data = loader ? await loader(controller.signal, publish) : await api<T>(path, {
          signal: controller.signal,
          envelope,
        });
        if (alive) setState(old => {
          const hold = holdReviewer && old.identity === identity && old.data && typeof old.data === "object" && "reviewer" in old.data && JSON.stringify(old.data) !== JSON.stringify(data);
          return { identity, data: hold ? old.data : mergeSavedData(old.identity === identity ? old.data : null, data),
            pending: hold ? data : null, savedAt: new Date().toISOString(), refreshing: false, error: null, loading: false };
        });
        if (alive && cacheable) await writeScreenSnapshot(owner, cacheKey, data, epoch);
      } catch (error) {
        const gone = error instanceof ApiError && error.code === "not_found";
        if (alive && gone && cacheable) await removeScreenSnapshot(owner, cacheKey);
        if (alive)
          setState(old => ({
            ...old,
            identity,
            data: !gone && old.identity === identity ? old.data : null,
            pending: gone ? null : old.pending,
            refreshing: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not load this page.",
            loading: false,
          }));
      } finally {
        inFlight = false;
      }
    };
    void (async () => {
      const snapshot = cacheable ? await readScreenSnapshot<T>(owner, cacheKey) : null;
      if (!alive) return;
      if (snapshot) setState(old => old.identity === identity && old.data !== null ? old : {
        identity, data: snapshot.data, savedAt: snapshot.savedAt, pending: null, refreshing: true, error: null, loading: false,
      });
      await load();
    })();
    const interval = poll ? setInterval(() => void load(), poll) : null;
    const focus = () => void load();
    window.addEventListener("focus", focus);
    window.addEventListener("online", focus);
    document.addEventListener("visibilitychange", focus);
    const taskStateChanged = () => {
      if (/^\/api\/(tasks|today|study-sessions|experience\/(activities|courses))/.test(path)) void load();
    };
    window.addEventListener("sf:task-state-changed", taskStateChanged);
    return () => {
      alive = false;
      controller.abort();
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", focus);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("sf:task-state-changed", taskStateChanged);
    };
  }, [api, session?.user.id, path, poll, envelope, revision, identity, holdReviewer, loader, paused]);
  return {
    ...(state.identity === identity
      ? state
      : { data: null, savedAt: null, pending: null, refreshing: false, error: null, loading: true }),
    updateAvailable: state.identity === identity && state.pending !== null,
    applyUpdate: () => setState(old => old.pending ? { ...old, data: old.pending, pending: null } : old),
    refresh,
  };
}
export function useAction() {
  const locked = useRef(false),
    mounted = useRef(true);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await action();
      window.dispatchEvent(new Event("sf:task-state-changed"));
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "This action could not be completed.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, message, setMessage, run };
}
