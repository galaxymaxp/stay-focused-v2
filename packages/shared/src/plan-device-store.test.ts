import { expect, it } from 'vitest';
import { createPlanDeviceStore } from './plan-device-store';
const date = '2026-10-27', key = 'task:00000000-0000-4000-8000-000000000001';
const plan = { date, start: 1200, end: 1320, sessions: [{ kind: 'task' as const, id: key.slice(5), title: 'Synthetic task', courseId: null, startMinute: 1200, minutes: 30 }] };
it('persists removed across reload/date; skipped belongs only to its date; put back clears both', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const store = createPlanDeviceStore(storage);
  await store.saveOverrides(date, { removed: [key], skipped: ['reviewer:other'] });
  const reloaded = createPlanDeviceStore(storage);
  expect((await reloaded.read(date, 'owner')).overrides).toEqual({ removed: [key], skipped: ['reviewer:other'] });
  expect((await reloaded.read('2026-10-28', 'owner')).overrides).toEqual({ removed: [key], skipped: [] });
  await reloaded.saveOverrides(date, { removed: [], skipped: [] });
  expect((await store.read(date, 'owner')).overrides).toEqual({ removed: [], skipped: [] });
});
it('round-trips snapshot, last window and welcome and denies snapshot titles to other owners', async () => {
  const values = new Map<string, string>();
  const store = createPlanDeviceStore({ getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } });
  await store.saveLastWindow({ start: 1320, end: 120 }); await store.saveSnapshot(plan, 'owner'); await store.dismissWelcome();
  expect(await store.read(date, 'owner')).toMatchObject({ lastUsed: { start: 1320, end: 120 }, previous: plan, welcomeDismissed: true });
  expect(values.get('sf.today.welcome-dismissed')).toBe('1');
  expect((await store.read(date, 'other')).previous).toBeNull();
  expect((await store.read(date, '')).previous).toBeNull();
  values.set('sf.today.last-plan', JSON.stringify({ ...plan, ownerId: 'owner', sessions: [{ ...plan.sessions[0], id: 'invalid' }] }));
  expect((await store.read(date, 'owner')).previous).toBeNull();
});
it('fails safely for corrupt and blocked storage without throwing on writes', async () => {
  for (const storage of [{ getItem: () => '{', setItem: () => { throw Error('blocked'); } }, { getItem: () => { throw Error('blocked'); }, setItem: async () => { throw Error('blocked'); } }]) {
    const store = createPlanDeviceStore(storage);
    expect(await store.read(date, 'owner')).toEqual({ lastUsed: null, overrides: { removed: [], skipped: [] }, previous: null, welcomeDismissed: false });
    await store.saveLastWindow({ start: 1200, end: 1320 }); await store.saveOverrides(date, { removed: [key], skipped: [] }); await store.saveSnapshot(plan, 'owner'); await store.dismissWelcome();
  }
});
