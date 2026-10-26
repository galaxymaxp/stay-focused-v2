import { expect, it, vi } from 'vitest';
import { planDeviceStore } from './planDeviceStore';
const values = vi.hoisted(() => new Map<string, string>());
vi.mock('../../auth/sessionStore', () => ({ sessionStore: { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); } } }));
it('uses mobile sessionStore with the same keys, last-used window and date isolation', async () => {
  await planDeviceStore.saveLastWindow({ start: 1200, end: 1320 });
  await planDeviceStore.saveOverrides('2026-10-27', { removed: ['task:one'], skipped: ['reviewer:two'] });
  await planDeviceStore.dismissWelcome();
  expect(values.get('sf.today.welcome-dismissed')).toBe('1');
  expect((await planDeviceStore.read('2026-10-28', 'owner'))).toMatchObject({ lastUsed: { start: 1200, end: 1320 }, overrides: { removed: ['task:one'], skipped: [] }, welcomeDismissed: true });
});
