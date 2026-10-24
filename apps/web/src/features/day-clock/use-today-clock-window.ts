"use client";
import { localDateKey, previousDateKey, todayClockPath, todayClockWindow, validFreeTime, type FreeTimeRange } from "@stay-focused/shared";
import { useEffect, useRef, useState } from "react";
import { readFreeTime, writeFreeTime } from "./free-time-store";

export function useTodayClockWindow() {
  const adjusting = useRef(false);
  const deferredRollover = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const calendarDate = localDateKey(now);
  // Snapshot bounds change on lifecycle reconciliation, never on a clock commit.
  const [readSaved, setReadSaved] = useState<{ date: string; previous: FreeTimeRange | null; current: FreeTimeRange | null } | null>(null);
  const [saved, setSaved] = useState<{ date: string; previous: FreeTimeRange | null; current: FreeTimeRange | null } | null>(null);
  useEffect(() => {
    const loaded = { date: calendarDate, previous: readFreeTime(previousDateKey(calendarDate)), current: readFreeTime(calendarDate) };
    setSaved(loaded); setReadSaved(loaded);
  }, [calendarDate]);
  const ready = saved?.date === calendarDate;
  const selection = todayClockWindow(now, ready ? readSaved?.previous ?? null : null, ready ? readSaved?.current ?? null : null);
  const liveSaved = useRef(saved);
  liveSaved.current = saved;

  useEffect(() => {
    const refresh = () => { if (!adjusting.current) { setReadSaved(liveSaved.current); setNow(new Date()); } };
    const rollover = () => { if (adjusting.current) { deferredRollover.current = true; return; } refresh(); };
    const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
    const end = selection.override.endsAt ? Date.parse(selection.override.endsAt) : Infinity;
    const timer = setTimeout(rollover, Math.max(1, Math.min(midnight.getTime(), end) - Date.now()));
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [now, selection.override.endsAt]);
  const save = (value: FreeTimeRange) => {
    if (!validFreeTime(value)) return;
    const date = selection.date;
    const old = liveSaved.current;
    if (!old) return;
    const next = { ...old, ...(date === old.date ? { current: value } : { previous: value }) };
    liveSaved.current = next;
    setSaved(next);
    writeFreeTime(date, value);
  };
  return { ...selection, window: ready && saved ? (selection.date === saved.date ? saved.current : saved.previous) : null,
    adjusting, setAdjusting: (active: boolean) => { adjusting.current = active; if (!active && deferredRollover.current) { deferredRollover.current = false; setReadSaved(liveSaved.current); setNow(new Date()); } },
    reconcile: () => { if (!adjusting.current) { setReadSaved(liveSaved.current); setNow(new Date()); } },
    ready, save, path: ready ? todayClockPath(selection.date, -now.getTimezoneOffset(), selection.override) : null };
}
