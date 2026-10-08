import { localDate } from "./presentation";

/** Canvas starts the week on Sunday; the calendar follows it. */
export const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
export function startOfWeek(date: Date) {
  return addDays(startOfDay(date), -date.getDay());
}
export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}
/** Whole weeks covering the anchor's month, Sunday first (4 to 6 rows). */
export function monthWeeks(anchor: Date): Date[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const weeks: Date[][] = [];
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) weeks.push(weekDays(start));
  return weeks;
}
export function shiftMonth(anchor: Date, months: number) {
  return new Date(anchor.getFullYear(), anchor.getMonth() + months, 1);
}
export function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Work with a due date, grouped by local day and ordered by time. */
export function groupByDueDay<T extends { readonly dueAt: string | null }>(items: readonly T[]): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const item of items) {
    if (!item.dueAt) continue;
    const due = new Date(item.dueAt);
    if (Number.isNaN(due.getTime())) continue;
    const key = localDate(due);
    const list = days.get(key) ?? [];
    list.push(item);
    days.set(key, list);
  }
  for (const list of days.values()) list.sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!));
  return days;
}

/** "This week", "Next week" or a date range, for the strip's header. */
export function weekLabel(anchor: Date, today = new Date()) {
  const start = startOfWeek(anchor);
  const weeks = Math.round((start.getTime() - startOfWeek(today).getTime()) / (7 * 86_400_000));
  if (weeks === 0) return "This week";
  if (weeks === 1) return "Next week";
  if (weeks === -1) return "Last week";
  const end = addDays(start, 6);
  const format = (date: Date) => date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${format(start)} – ${format(end)}`;
}
