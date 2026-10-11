// Minutes from local midnight, shared by Today's clock and Schedule's planner.
export interface FreeTime {
  readonly start: number;
  readonly end: number;
}
const key = (date: string) => `sf.today.free-time.${date}`;

function valid(value: Partial<FreeTime> | null): value is FreeTime {
  return !!value && typeof value.start === "number" && typeof value.end === "number" &&
    Number.isInteger(value.start) && Number.isInteger(value.end) &&
    value.start >= 0 && value.end <= 1440 && value.end > value.start;
}

export function readFreeTime(date: string): FreeTime | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key(date)) ?? "null") as Partial<FreeTime> | null;
    return valid(saved) ? { start: saved.start, end: saved.end } : null;
  } catch {
    return null;
  }
}

export function writeFreeTime(date: string, value: FreeTime): void {
  if (!valid(value)) return;
  try {
    localStorage.setItem(key(date), JSON.stringify(value));
  } catch {
    /* Keep the chosen window for this visit if storage is blocked. */
  }
}

export const toTimeInput = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function fromTimeInput(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [hours, minutes] = value.split(":").map(Number);
  return hours! * 60 + minutes!;
}
