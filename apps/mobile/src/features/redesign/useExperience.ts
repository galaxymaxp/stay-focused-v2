import { useIsFocused } from "@react-navigation/native";
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
) {
  const client = useExperienceClient();
  const pollCondition = useRef(pollWhile);
  pollCondition.current = pollWhile;
  const focused = useIsFocused();
  const { active } = useTheme();
  // A finished Canvas sync bumps this so every mounted screen reloads its data
  // in place, without clearing what is already shown.
  const { dataVersion } = useCanvasSync();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    /** Stable server code so screens can tell a sync state from an outage. */
    errorCode: string | null;
    loading: boolean;
  }>({ data: null, error: null, errorCode: null, loading: true });
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    setState({ data: null, error: null, errorCode: null, loading: !!path });
  }, [path, client]);
  useEffect(() => {
    if (!path || !focused || !active) return;
    let live = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const data = await experienceRequest<T>(client, path!, {
          signal: controller.signal,
        });
        if (live) setState({ data, error: null, errorCode: null, loading: false });
        if (pollCondition.current && !pollCondition.current(data)) return;
      } catch (error) {
        if (live)
          setState((old) => ({
            ...old,
            loading: false,
            error: error instanceof ApiConfigurationError
              ? `App configuration error\n${error.message}`
              : error instanceof Error ? error.message : "Please try again.",
            errorCode: error instanceof ApiConfigurationError
              ? error.code
              : error instanceof ExperienceApiError ? error.code : null,
          }));
        if (error instanceof ApiConfigurationError) return;
      }
      if (live && pollMs) timer = setTimeout(() => void load(), pollMs);
    }
    void load();
    return () => {
      live = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, path, focused, active, version, dataVersion, pollMs]);
  return { ...state, refresh };
}
