import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { useAuth } from "../auth";
import { getApiBaseUrl } from "../config/apiBaseUrl";
import { AppActivityContext, countActiveJobs } from "../design/appActivity";
import { experienceRequest } from "../services/experienceApi";
import { useCanvasSync } from "../features/sync/CanvasSyncProvider";

/** Poll quickly only while something is running; otherwise check rarely. */
const ACTIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 30_000;

/**
 * Supplies the app-wide activity signal. It reads the server's active-job list
 * (queued, running, stopping only) and the Canvas sync phase. The context value
 * changes only when the counts change, so the header never re-renders on a
 * poll that found nothing new.
 */
export function AppActivityProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { snapshot } = useCanvasSync();
  const syncing = snapshot.phase === "syncing";
  const [counts, setCounts] = useState({ generating: 0, queued: 0 });
  const [kick, setKick] = useState(0);
  const credentials = useRef({ accessToken: "" });
  credentials.current = { accessToken: session?.accessToken ?? "" };
  const refresh = useCallback(() => setKick((value) => value + 1), []);

  useEffect(() => {
    if (!session?.user.id) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let busy = false;
    const check = async () => {
      clearTimeout(timer);
      const baseUrl = getApiBaseUrl();
      let next = IDLE_POLL_MS;
      if (baseUrl && credentials.current.accessToken && AppState.currentState === "active" && !busy) {
        busy = true;
        controller = new AbortController();
        try {
          const jobs = await experienceRequest<ProcessingJobStatusView[]>(
            { baseUrl, accessToken: credentials.current.accessToken },
            "/api/jobs",
            { signal: controller.signal },
          );
          const found = countActiveJobs(Array.isArray(jobs) ? jobs : []);
          if (live) {
            setCounts((current) =>
              current.generating === found.generating && current.queued === found.queued ? current : found,
            );
          }
          if (found.generating + found.queued > 0) next = ACTIVE_POLL_MS;
        } catch {
          // Offline or unavailable: keep the last known state and try later.
        } finally {
          busy = false;
        }
      }
      if (live) timer = setTimeout(() => void check(), next);
    };
    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      live = false;
      clearTimeout(timer);
      controller?.abort();
      subscription.remove();
    };
  }, [session?.user.id, kick]);

  const active = syncing || counts.generating + counts.queued > 0;
  const value = useMemo(
    () => ({ active, syncing, generating: counts.generating, queued: counts.queued, refresh }),
    [active, syncing, counts, refresh],
  );
  return <AppActivityContext.Provider value={value}>{children}</AppActivityContext.Provider>;
}
