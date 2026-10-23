import { beforeEach, expect, it, vi } from 'vitest';
import { openNodeSqlite, OWNER_A, OWNER_B } from './localLibrary.testSupport';
import type { LocalMeasurement } from '@stay-focused/shared';

const fake = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: fake.open }));
vi.mock('expo-file-system/legacy', () => ({ documentDirectory: null }));
beforeEach(() => { vi.resetModules(); fake.open.mockReset(); });

it('times only cold setup, reuses the same warm promise, and isolates snapshot hits/misses', async () => {
  const handle = openNodeSqlite(); fake.open.mockResolvedValue(handle.db);
  const { localMeasurements } = await import('@stay-focused/shared');
  const { getLocalArtifactStore } = await import('./localArtifactDatabase');
  const events: LocalMeasurement[] = []; let tick = 0;
  const remove = localMeasurements.observe({ now: () => tick += 2, sink: event => { events.push(event); } });
  try {
    const first = getLocalArtifactStore(), second = getLocalArtifactStore();
    expect(second).toBe(first); const store = await first;
    expect(events).toEqual([{ name: 'library.setup', outcome: 'success', durationMs: 2 }]);
    expect(fake.open).toHaveBeenCalledTimes(1);
    await store!.saveScreenSnapshot(OWNER_A, 'library', { items: ['public synthetic'] });
    const saved = await store!.readScreenSnapshot(OWNER_A, 'library');
    expect(saved!.data).toEqual({ items: ['public synthetic'] });
    expect(await store!.readScreenSnapshot(OWNER_B, 'library')).toBeNull();
    expect(events.slice(1)).toEqual([
      { name: 'library.snapshot_read', outcome: 'success', durationMs: 2 },
      { name: 'library.snapshot_read', outcome: 'empty', durationMs: 2 },
    ]);
    remove();
    expect(await store!.readScreenSnapshot(OWNER_A, 'library')).toEqual(saved);
    expect(events).toHaveLength(3);
    expect(JSON.stringify(events)).not.toMatch(/11111111|public synthetic|22222222/);
  } finally { remove(); handle.close(); }
});

it('preserves setup fallback/retry and snapshot rejection even when the observer fails', async () => {
  const handle = openNodeSqlite(); const failure = new Error('private database path');
  fake.open.mockRejectedValueOnce(failure).mockResolvedValue(handle.db);
  const { localMeasurements } = await import('@stay-focused/shared');
  const { getLocalArtifactStore } = await import('./localArtifactDatabase');
  const events: LocalMeasurement[] = [];
  const remove = localMeasurements.observe({ now: () => 1, sink: event => { events.push(event); throw new Error('private sink'); } });
  try {
    expect(await getLocalArtifactStore()).toBeNull();
    const store = await getLocalArtifactStore(); expect(store).not.toBeNull();
    expect(fake.open).toHaveBeenCalledTimes(2);
    vi.spyOn(handle.db, 'getFirstAsync').mockRejectedValueOnce(failure);
    await expect(store!.readScreenSnapshot(OWNER_A, 'private-key')).rejects.toBe(failure);
    expect(events.map(event => event.outcome)).toEqual(['error', 'success', 'error']);
    expect(JSON.stringify(events)).not.toMatch(/private|11111111/);
  } finally { remove(); handle.close(); }
});
