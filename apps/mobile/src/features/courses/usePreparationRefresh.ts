import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useRef } from 'react';
import { useTheme } from '../../design/theme';

export const PREPARATION_REFRESH_MS = 10_000;
export const PREPARATION_REFRESH_LIMIT = 18;

/** One serial, bounded poll per focused screen. Refresh never admits work. */
export function usePreparationRefresh(key: string, preparing: boolean, refresh: (signal: AbortSignal) => Promise<boolean>) {
  const focused = useIsFocused();
  const { active } = useTheme();
  const callback = useRef(refresh);
  callback.current = refresh;
  const remaining = useRef(PREPARATION_REFRESH_LIMIT);
  useEffect(() => { remaining.current = PREPARATION_REFRESH_LIMIT; }, [key, focused, active]);
  useEffect(() => {
    if (!focused || !active || !preparing) return;
    let live = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (!live || remaining.current <= 0) return;
      remaining.current -= 1;
      try {
        const pending = await callback.current(controller.signal);
        if (live && pending && remaining.current > 0) timer = setTimeout(() => void poll(), PREPARATION_REFRESH_MS);
      } catch { /* Refresh again on focus or the student's next refresh. */ }
    };
    timer = setTimeout(() => void poll(), PREPARATION_REFRESH_MS);
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, [key, focused, active, preparing]);
}
