import { validFreeTime, type FreeTimeRange } from './free-time';
import { restoreSelectionFromSnapshot, type PlanOverrides, type PlanSnapshot } from './planning-sheet';
import { validatePlanSelection } from './task-planning';

export interface PlanDeviceState {
  readonly lastUsed: FreeTimeRange | null;
  readonly overrides: PlanOverrides;
  readonly previous: PlanSnapshot | null;
  readonly welcomeDismissed: boolean;
}
export interface PlanPreferenceStorage {
  getItem(key: string): string | null | PromiseLike<string | null>;
  setItem(key: string, value: string): unknown;
}
const keys = { last: 'sf.today.free-time.last', removed: 'sf.today.plan-removed',
  skipped: (date: string) => `sf.today.plan-skipped.${date}`, previous: 'sf.today.last-plan', welcome: 'sf.today.welcome-dismissed' };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function itemKeys(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && /^(task|reviewer):[a-zA-Z0-9-]+$/u.test(item)))].slice(0, 10000) : [];
}
function snapshot(value: unknown, ownerId: string): PlanSnapshot | null {
  if (!ownerId || !record(value) || value.ownerId !== ownerId || !validFreeTime(value) ||
    typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value.date) || !Array.isArray(value.sessions) || value.sessions.length > 1000) return null;
  const sessions: PlanSnapshot['sessions'][number][] = [];
  for (const entry of value.sessions) {
    if (!record(entry) || (entry.kind !== 'task' && entry.kind !== 'reviewer') || typeof entry.id !== 'string' ||
      typeof entry.title !== 'string' || entry.title.length > 1000 || (entry.courseId !== null && typeof entry.courseId !== 'string') ||
      typeof entry.startMinute !== 'number' || !Number.isInteger(entry.startMinute) || entry.startMinute < 0 || entry.startMinute >= 2880 ||
      typeof entry.minutes !== 'number' || !Number.isInteger(entry.minutes) || entry.minutes < 1 || entry.minutes > 1440) return null;
    sessions.push({ kind: entry.kind, id: entry.id, title: entry.title, courseId: entry.courseId, startMinute: entry.startMinute, minutes: entry.minutes });
  }
  const parsed: PlanSnapshot = { date: value.date, start: value.start, end: value.end, sessions };
  return validatePlanSelection(restoreSelectionFromSnapshot(parsed)).ok ? parsed : null;
}
/** Same keys on both platforms; storage failures leave the current visit usable. */
export function createPlanDeviceStore(storage: PlanPreferenceStorage) {
  const read = async (key: string): Promise<unknown> => {
    try { return JSON.parse(await storage.getItem(key) ?? 'null') as unknown; } catch { return null; }
  };
  const write = async (key: string, value: unknown) => {
    try { await storage.setItem(key, JSON.stringify(value)); } catch { /* Best-effort device preference. */ }
  };
  return {
    async read(date: string, ownerId: string): Promise<PlanDeviceState> {
      const [last, removed, skipped, previous, welcome] = await Promise.all([read(keys.last), read(keys.removed), read(keys.skipped(date)), read(keys.previous), read(keys.welcome)]);
      return { lastUsed: validFreeTime(last) ? last : null, overrides: { removed: itemKeys(removed), skipped: itemKeys(skipped) }, previous: snapshot(previous, ownerId), welcomeDismissed: welcome === 1 };
    },
    async saveLastWindow(window: FreeTimeRange) { if (validFreeTime(window)) await write(keys.last, window); },
    async saveOverrides(date: string, overrides: PlanOverrides) {
      await Promise.all([write(keys.removed, itemKeys(overrides.removed)), write(keys.skipped(date), itemKeys(overrides.skipped))]);
    },
    async saveSnapshot(value: PlanSnapshot, ownerId: string) {
      // An additive owner tag prevents displaying private titles after account changes.
      if (snapshot({ ...value, ownerId }, ownerId)) await write(keys.previous, { ...value, ownerId });
    },
    async dismissWelcome() {
      try { await storage.setItem(keys.welcome, '1'); } catch { /* Device storage unavailable. */ }
    },
  };
}
