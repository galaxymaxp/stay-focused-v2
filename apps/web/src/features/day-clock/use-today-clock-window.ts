"use client";
import { localDateKey, previousDateKey, todayClockPath, todayClockWindow, validFreeTime, type FreeTimeRange } from "@stay-focused/shared";
import { useEffect, useState } from "react";
import { readFreeTime, writeFreeTime } from "./free-time-store";

export function useTodayClockWindow() {
  const [now, setNow] = useState(() => new Date());
  const calendarDate = localDateKey(now);
  const [saved, setSaved] = useState<{ date: string; previous: FreeTimeRange | null; current: FreeTimeRange | null } | null>(null);
  useEffect(() => {
    setSaved({ date: calendarDate, previous: readFreeTime(previousDateKey(calendarDate)), current: readFreeTime(calendarDate) });
  }, [calendarDate]);
  const ready = saved?.date === calendarDate;
  const selection = todayClockWindow(now, ready ? saved.previous : null, ready ? saved.current : null);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
    const end = selection.override.endsAt ? Date.parse(selection.override.endsAt) : Infinity;
    const timer = setTimeout(refresh, Math.max(1, Math.min(midnight.getTime(), end) - Date.now()));
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [now, selection.override.endsAt]);
  const save = (value: FreeTimeRange) => {
    if (!validFreeTime(value)) return;
    const date = selection.date;
    setSaved(old => old && ({ ...old, ...(date === old.date ? { current: value } : { previous: value }) }));
    writeFreeTime(date, value);
  };
  return { ...selection, ready, save, path: ready ? todayClockPath(selection.date, -now.getTimezoneOffset(), selection.override) : null };
}
