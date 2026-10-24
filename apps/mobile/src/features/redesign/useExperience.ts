import { mergeSavedData } from "@stay-focused/shared";
import { isScreenSnapshotPath, readScreenSnapshot, writeScreenSnapshot, screenSnapshotEpoch } from "../../services/screenSnapshots";
import { useIsFocused } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { ApiConfigurationError } from "../../config/apiBaseUrlResolution";
import { useTheme } from "../../design/theme";
import { ExperienceApiError, experienceRequest } from "../../services/experienceApi";
import { useCanvasSync } from "../sync/CanvasSyncProvider";

export function useExperienceClient() {
  const { session } = useAuth();
  return useMemo(
    () => ({
      baseUrl: getApiBaseUrl() ?? "",
      accessToken: session?.accessToken ?? "",
    }),
    [session?.accessToken],
  );
}
export function useExperience<T>(
  path: string | null,
  pollMs = 0,
  pollWhile?: (data: T) => boolean,
  offlineCache?: {
    read(ownerUserId: string, path: string): Promise<T | null>;
    write(ownerUserId: string, data: T): Promise<void>;
  },
  maxPolls = Number.POSITIVE_INFINITY,
  paused?: { readonly current: boolean },
) {
  const { session } = useAuth();
  const ownerUserId = session?.user.id ?? null;
  const client = useExperienceClient();
  const pollCondition = useRef(pollWhile);
  pollCondition.current = pollWhile;
  const offlineCacheRef = useRef(offlineCache);
  offlineCacheRef.current = offlineCache;
  const focused = useIsFocused();
  const { active } = useTheme();
  // A finished Canvas sync bumps this so every mounted screen reloads its data
  // in place, without clearing what is already shown.
  const { dataVersion } = useCanvasSync();
  const [version, setVersion] = useState(0);
  const identity = `${ownerUserId ?? ""}:${path ?? ""}`;
  const [state, setState] = useState<{
    identity: string;
    savedAt: string | null;
    refreshing: boolean;
    data: T | null;
    error: string | null;
    /** Stable server code so screens can tell a sync state from an outage. */
    errorCode: string | null;
    loading: boolean;
  }>({ identity, savedAt: null, refreshing: false, data: null, error: null, errorCode: null, loading: true });
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (!path || !ownerUserId || !focused || !active) return;
    const cacheKey = path;
    const epoch = screenSnapshotEpoch(ownerUserId);
    const cacheable = isScreenSnapshotPath(path);
    let live = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    async function load() {
      if (paused?.current) { if (live && pollMs) timer = setTimeout(() => void load(), pollMs); return; }
      polls += 1;
      if (live) setState(old => ({ ...(old.identity === identity ? old : { identity, data: null, savedAt: null, error: null, errorCode: null }), loading: !((old.identity === identity) && old.data !== null), refreshing: true, error: null, errorCode: null }));
      try {
        const data = await experienceRequest<T>(client, path!, {
          signal: controller.signal,
        });
        if (live) setState(old => ({ identity, data: mergeSavedData(old.identity === identity ? old.data : null, data), savedAt: new Date().toISOString(), refreshing: false, error: null, errorCode: null, loading: false }));
        if (live && cacheable) await writeScreenSnapshot(ownerUserId!, cacheKey, data, epoch);
        if (live && ownerUserId && offlineCacheRef.current) {
          try {
            await offlineCacheRef.current.write(ownerUserId, data);
          } catch {
            // Local caching must not turn a successful online read into an error.
          }
        }
        if (pollCondition.current && !pollCondition.current(data)) return;
      } catch (error) {
        if (live)
          setState((old) => ({
            ...old,
            loading: false,
            refreshing: false,
            error: error instanceof ApiConfigurationError
              ? `App configuration error\n${error.message}`
              : error instanceof Error ? error.message : "Please try again.",
            errorCode: error instanceof ApiConfigurationError
              ? error.code
              : error instanceof ExperienceApiError ? error.code : null,
          }));
        if (error instanceof ApiConfigurationError || (pollCondition.current && error instanceof ExperienceApiError && error.code === 'connection')) return;
      }
      if (live && pollMs && polls < maxPolls) timer = setTimeout(() => void load(), pollMs);
    }
    void (async () => {
      const snapshot = cacheable ? await readScreenSnapshot<T>(ownerUserId, cacheKey) : null;
      let fallback: T | null = null;
      if (!snapshot && offlineCacheRef.current) {
        try { fallback = await offlineCacheRef.current.read(ownerUserId, cacheKey); } catch { /* cache miss */ }
      }
      if (!live) return;
      if (snapshot || fallback !== null) setState(old => old.identity === identity && old.data !== null ? old : {
        identity, data: snapshot?.data ?? fallback, savedAt: snapshot?.savedAt ?? null,
        loading: false, refreshing: true, error: null, errorCode: null,
      });
      await load();
    })();
    return () => {
      live = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, ownerUserId, path, focused, active, version, dataVersion, pollMs, maxPolls, identity, paused]);
  return { ...(state.identity === identity ? state : { data: null, savedAt: null, refreshing: false, error: null, errorCode: null, loading: !!path }), refresh };
}
