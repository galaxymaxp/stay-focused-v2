import { afterEach, expect, it, vi } from 'vitest';
import { planDeviceStore } from './plan-device-store';
import { writeFreeTime } from '../day-clock/free-time-store';
afterEach(() => vi.unstubAllGlobals());
it('uses the web preference adapter and writes last-used on each window save', async () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  writeFreeTime('2026-10-27', { start: 1200, end: 1320 });
  expect((await planDeviceStore.read('2026-10-28', 'owner')).lastUsed).toEqual({ start: 1200, end: 1320 });
  expect(values.has('sf.today.free-time.2026-10-28')).toBe(false);
  await planDeviceStore.saveOverrides('2026-10-27', { removed: ['task:one'], skipped: ['reviewer:two'] });
  expect((await planDeviceStore.read('2026-10-28', 'owner')).overrides).toEqual({ removed: ['task:one'], skipped: [] });
});
