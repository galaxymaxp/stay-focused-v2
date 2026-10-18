import { localDateKey, previousDateKey, todayClockPath, todayClockWindow, validFreeTime, type FreeTimeRange } from "@stay-focused/shared";
import { useEffect, useState } from "react";
import { useIsFocused } from "expo-router/react-navigation";
import { sessionStore } from "../../auth/sessionStore";
import { useTheme } from "../../design/theme";

const key = (date: string) => `sf.today.free-time.${date}`;
function parse(raw: string | null): FreeTimeRange | null {
  try { const value: unknown = JSON.parse(raw ?? "null"); return validFreeTime(value) ? value : null; } catch { return null; }
}
export function useTodayClockWindow() {
  const [now, setNow] = useState(() => new Date());
  const focused = useIsFocused();
  const { active } = useTheme();
  const calendarDate = localDateKey(now);
  const [saved, setSaved] = useState<{ date: string; previous: FreeTimeRange | null; current: FreeTimeRange | null } | null>(null);
  useEffect(() => {
    if (active && focused) setNow(new Date());
  }, [active, focused]);
  useEffect(() => {
    let live = true;
    void Promise.all([sessionStore.getItem(key(previousDateKey(calendarDate))), sessionStore.getItem(key(calendarDate))])
      .then(([previous, current]) => { if (live) setSaved({ date: calendarDate, previous: parse(previous), current: parse(current) }); })
      .catch(() => { if (live) setSaved({ date: calendarDate, previous: null, current: null }); });
    return () => { live = false; };
  }, [calendarDate]);
  const ready = saved?.date === calendarDate;
  const selection = todayClockWindow(now, ready ? saved.previous : null, ready ? saved.current : null);
  useEffect(() => {
    if (!active || !focused) return;
    const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
    const end = selection.override.endsAt ? Date.parse(selection.override.endsAt) : Infinity;
    const timer = setTimeout(() => setNow(new Date()), Math.max(1, Math.min(midnight.getTime(), end) - Date.now()));
    return () => clearTimeout(timer);
  }, [active, focused, now, selection.override.endsAt]);
  const save = (value: FreeTimeRange) => {
    if (!validFreeTime(value)) return;
    const date = selection.date;
    setSaved(old => old && ({ ...old, ...(date === old.date ? { current: value } : { previous: value }) }));
    void Promise.resolve(sessionStore.setItem(key(date), JSON.stringify(value))).catch(() => {});
  };
  return { ...selection, ready, save, path: ready ? todayClockPath(selection.date, -now.getTimezoneOffset(), selection.override) : null };
}
