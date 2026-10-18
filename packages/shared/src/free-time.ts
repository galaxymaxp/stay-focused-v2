/** A local clock window belongs to the calendar date on which it starts. */
export interface FreeTimeRange { readonly start: number; readonly end: number }
export interface TodayWindowOverride { readonly startsAt?: string; readonly endsAt?: string }
export const FREE_TIME_ERROR = "Choose different start and end times.";
export const wrapMinute = (value: number) => ((value % 1440) + 1440) % 1440;
export function validFreeTime(value: unknown): value is FreeTimeRange {
  if (!value || typeof value !== "object") return false;
  const { start, end } = value as Partial<FreeTimeRange>;
  return typeof start === "number" && typeof end === "number" && Number.isInteger(start) && Number.isInteger(end) &&
    start >= 0 && start < 1440 && end >= 0 && end <= 1440 && start !== end && !(start === 0 && end === 1440);
}
export function freeTimeEnd(start: number, end: number) { return end < start ? end + 1440 : end; }
export function freeTimeDuration(start: number, end: number) { return freeTimeEnd(start, end) - start; }
export function containsMinute(start: number, end: number, minute: number) {
  const relative = wrapMinute(minute - start);
  return relative < freeTimeDuration(start, end);
}
export function clockTimeLabel(minutes: number, locale?: string) {
  const date = new Date(2000, 0, 1);
  date.setMinutes(Math.round(minutes));
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}
export function freeTimeLabel(start: number, end: number, locale?: string) {
  return `${clockTimeLabel(start, locale)} – ${clockTimeLabel(end, locale)}`;
}
export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function previousDateKey(date: string) {
  const previous = new Date(`${date}T00:00:00`);
  previous.setDate(previous.getDate() - 1);
  return localDateKey(previous);
}
/** Calendar arithmetic preserves local clock times through an offset change. */
export function localMinuteIso(date: string, minutes: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setMinutes(minutes);
  return value.toISOString();
}
export function freeTimePlanningRange(date: string, start: number, end: number) {
  if (!validFreeTime({ start, end })) throw new Error(FREE_TIME_ERROR);
  const until = freeTimeEnd(start, end);
  return {
    planningRange: { startsAt: localMinuteIso(date, 0), endsAt: localMinuteIso(date, Math.max(1440, until)) },
    availability: [{ startsAt: localMinuteIso(date, start), endsAt: localMinuteIso(date, until) }],
  };
}
/** The previous window owns its morning tail; the new snapshot excludes it. */
export function todayClockWindow(now: Date, previous: FreeTimeRange | null, current: FreeTimeRange | null) {
  const calendarDate = localDateKey(now);
  const previousDate = previousDateKey(calendarDate);
  const minute = now.getHours() * 60 + now.getMinutes();
  if (previous && previous.end < previous.start && minute < previous.end) {
    return { date: previousDate, window: previous, override: { endsAt: localMinuteIso(previousDate, previous.end + 1440) } satisfies TodayWindowOverride };
  }
  const override: TodayWindowOverride = {
    ...(previous && previous.end < previous.start ? { startsAt: localMinuteIso(calendarDate, previous.end) } : {}),
    ...(current && current.end < current.start ? { endsAt: localMinuteIso(calendarDate, current.end + 1440) } : {}),
  };
  return { date: calendarDate, window: current, override };
}
export function todayClockPath(date: string, offset: number, override: TodayWindowOverride) {
  const fields = [`date=${date}`, `utcOffsetMinutes=${offset}`];
  if (override.startsAt) fields.push(`startsAt=${encodeURIComponent(override.startsAt)}`);
  if (override.endsAt) fields.push(`endsAt=${encodeURIComponent(override.endsAt)}`);
  return `/api/today?${fields.join("&")}`;
}
/** Lift a minute-of-day into the window's start-date coordinates. */
export function minuteInWindow(minute: number, start: number) { return minute < start ? minute + 1440 : minute; }
