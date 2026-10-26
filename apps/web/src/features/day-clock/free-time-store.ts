import { readLocalPreference, writeLocalPreference } from '../../lib/local-preference';
import { validFreeTime as valid } from "@stay-focused/shared";
import { planDeviceStore } from '../today/plan-device-store';
// Minutes from local midnight, shared by Today's clock and Schedule's planner.
export interface FreeTime {
  readonly start: number;
  readonly end: number;
}
const key = (date: string) => `sf.today.free-time.${date}`;


export function readFreeTime(date: string): FreeTime | null {
  try {
    const saved = JSON.parse(readLocalPreference(key(date)) ?? "null") as Partial<FreeTime> | null;
    return valid(saved) ? { start: saved.start, end: saved.end } : null;
  } catch {
    return null;
  }
}

export function writeFreeTime(date: string, value: FreeTime): void {
  if (!valid(value)) return;
  void planDeviceStore.saveLastWindow(value);
  try {
    writeLocalPreference(key(date), JSON.stringify(value));
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
