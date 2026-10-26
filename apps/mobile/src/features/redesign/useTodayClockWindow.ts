import { localDateKey, previousDateKey, todayClockPath, todayClockWindow, validFreeTime, type FreeTimeRange } from "@stay-focused/shared";
import { useEffect, useRef, useState } from "react";
import { useIsFocused } from "expo-router/react-navigation";
import { sessionStore } from "../../auth/sessionStore";
import { useTheme } from "../../design/theme";
import { planDeviceStore } from './planDeviceStore';

const key = (date: string) => `sf.today.free-time.${date}`;
function parse(raw: string | null): FreeTimeRange | null {
  try { const value: unknown = JSON.parse(raw ?? "null"); return validFreeTime(value) ? value : null; } catch { return null; }
}
export function useTodayClockWindow() {
  const adjusting = useRef(false);
  const deferredRollover = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const focused = useIsFocused();
  const { active } = useTheme();
  const calendarDate = localDateKey(now);
  // Snapshot bounds change on lifecycle reconciliation, never on a clock commit.
  const [readSaved, setReadSaved] = useState<{ date: string; previous: FreeTimeRange | null; current: FreeTimeRange | null } | null>(null);
  const [saved, setSaved] = useState<{ date: string; previous: FreeTimeRange | null; current: FreeTimeRange | null } | null>(null);
  useEffect(() => {
    if (active && focused && !adjusting.current) { setReadSaved(liveSaved.current); setNow(new Date()); }
  }, [active, focused]);
  useEffect(() => {
    let live = true;
    void Promise.all([sessionStore.getItem(key(previousDateKey(calendarDate))), sessionStore.getItem(key(calendarDate))])
      .then(([previous, current]) => { if (live) { const loaded = { date: calendarDate, previous: parse(previous), current: parse(current) }; setSaved(loaded); setReadSaved(loaded); } })
      .catch(() => { if (live) { const loaded = { date: calendarDate, previous: null, current: null }; setSaved(loaded); setReadSaved(loaded); } });
    return () => { live = false; };
  }, [calendarDate]);
  const ready = saved?.date === calendarDate;
  const selection = todayClockWindow(now, ready ? readSaved?.previous ?? null : null, ready ? readSaved?.current ?? null : null);
  const liveSaved = useRef(saved);
  liveSaved.current = saved;

  useEffect(() => {
    if (!active || !focused) return;
    const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
    const end = selection.override.endsAt ? Date.parse(selection.override.endsAt) : Infinity;
    const timer = setTimeout(() => { if (adjusting.current) { deferredRollover.current = true; return; } setReadSaved(liveSaved.current); setNow(new Date()); }, Math.max(1, Math.min(midnight.getTime(), end) - Date.now()));
    return () => clearTimeout(timer);
  }, [active, focused, now, selection.override.endsAt]);
  const save = (value: FreeTimeRange) => {
    if (!validFreeTime(value)) return;
    const date = selection.date;
    const old = liveSaved.current;
    if (!old) return;
    const next = { ...old, ...(date === old.date ? { current: value } : { previous: value }) };
    liveSaved.current = next;
    setSaved(next);
    void planDeviceStore.saveLastWindow(value);
    void Promise.resolve(sessionStore.setItem(key(date), JSON.stringify(value))).catch(() => {});
  };
  return { ...selection, window: ready && saved ? (selection.date === saved.date ? saved.current : saved.previous) : null,
    adjusting, setAdjusting: (active: boolean) => { adjusting.current = active; if (!active && deferredRollover.current) { deferredRollover.current = false; setReadSaved(liveSaved.current); setNow(new Date()); } },
    reconcile: () => { if (!adjusting.current) { setReadSaved(liveSaved.current); setNow(new Date()); } },
    ready, save, path: ready ? todayClockPath(selection.date, -now.getTimezoneOffset(), selection.override) : null };
}
