import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import { useTheme } from "../../design/theme";
import { experienceRequest } from "../../services/experienceApi";

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
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ data: null, error: null, loading: true });
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    setState({ data: null, error: null, loading: !!path });
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
        if (live) setState({ data, error: null, loading: false });
        if (pollCondition.current && !pollCondition.current(data)) return;
      } catch (error) {
        if (live)
          setState((old) => ({
            ...old,
            loading: false,
            error: error instanceof Error ? error.message : "Please try again.",
          }));
      }
      if (live && pollMs) timer = setTimeout(() => void load(), pollMs);
    }
    void load();
    return () => {
      live = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, path, focused, active, version, pollMs]);
  return { ...state, refresh };
}
