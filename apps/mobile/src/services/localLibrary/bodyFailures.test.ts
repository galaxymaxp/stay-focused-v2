import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalArtifactStore } from './artifactStore';
import { hydrateLibraryBodies, refreshArtifactDetail } from './librarySync';
import { draftDetail, openNodeSqlite, OWNER_A, OWNER_B } from './localLibrary.testSupport';
import { migrateLocalLibrary } from './schema';

afterEach(() => vi.restoreAllMocks());

describe('persisted body failure accounting', () => {
  it('survives a SQLite restart, isolates owners and admits a new source version', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sf-body-failures-'));
    const path = join(dir, 'library.db');
    let handle = openNodeSqlite(path);
    try {
      await migrateLocalLibrary(handle.db);
      let store = createLocalArtifactStore(handle.db);
      const detail = draftDetail();
      for (const owner of [OWNER_A, OWNER_B]) await store.upsertSummaries(owner, [detail.artifact]);
      await store.recordBodyFailure(OWNER_A, detail.artifact.id, detail.artifact.updatedAt, true, 0);
      handle.close();
      handle = openNodeSqlite(path);
      await migrateLocalLibrary(handle.db);
      store = createLocalArtifactStore(handle.db);
      expect(await store.offlineStats(OWNER_A)).toMatchObject({ total: 1, current: 0, failedPermanent: 1 });
      expect(await store.offlineStats(OWNER_B)).toMatchObject({ failedPermanent: 0 });
      expect(await store.idsNeedingBody(OWNER_A, 10)).toEqual([]);
      expect(await store.nextBodyRetryAt(OWNER_A)).toBeNull();
      expect(await store.idsNeedingBody(OWNER_B, 10)).toEqual([detail.artifact.id]);
      const newer = { ...detail.artifact, updatedAt: '2026-10-19T00:00:00.000Z' };
      await store.upsertSummaries(OWNER_A, [newer]);
      // An old in-flight failure must not poison the new version.
      await store.recordBodyFailure(OWNER_A, detail.artifact.id, detail.artifact.updatedAt, true, 0);
      expect(await store.idsNeedingBody(OWNER_A, 10)).toEqual([detail.artifact.id]);
      expect(await store.offlineStats(OWNER_A)).toMatchObject({ failedPermanent: 0 });
      expect(await store.bodyAttempt(OWNER_A, detail.artifact.id)).toEqual({ version: newer.updatedAt, attempts: 0 });
    } finally {
      handle.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('backs off transient failures exponentially without converting them to permanent failures', async () => {
    const handle = openNodeSqlite();
    try {
      await migrateLocalLibrary(handle.db);
      const store = createLocalArtifactStore(handle.db);
      const detail = draftDetail();
      await store.upsertSummaries(OWNER_A, [detail.artifact]);
      let now = 10_000;
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      const remote = { fetchPage: vi.fn(), fetchDetail: vi.fn().mockRejectedValue({ code: 'server_error' }) };
      expect(await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote })).toMatchObject({ stoppedBy: 'retry' });
      expect(await store.nextBodyRetryAt(OWNER_A)).toBe(12_000);
      await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote });
      expect(remote.fetchDetail).toHaveBeenCalledTimes(1);
      now = 12_000;
      await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote });
      expect(await store.nextBodyRetryAt(OWNER_A)).toBe(16_000);
      expect(await store.offlineStats(OWNER_A)).toMatchObject({ failedPermanent: 0 });
      now = 16_000;
      remote.fetchDetail.mockResolvedValue(detail);
      await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote });
      expect(await store.nextBodyRetryAt(OWNER_A)).toBeNull();
      expect(await store.bodyAttempt(OWNER_A, detail.artifact.id)).toMatchObject({ attempts: 0 });
      expect(await store.offlineStats(OWNER_A)).toMatchObject({ current: 1 });
    } finally { handle.close(); }
  });

  it('accounts permanent denials, preserves rows, and resets on a successful open or clear', async () => {
    const handle = openNodeSqlite();
    try {
      await migrateLocalLibrary(handle.db);
      const store = createLocalArtifactStore(handle.db);
      const detail = draftDetail();
      await store.upsertSummaries(OWNER_A, [detail.artifact]);
      const remote = { fetchPage: vi.fn(), fetchDetail: vi.fn().mockRejectedValue({ code: 'permission_denied' }) };
      await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote });
      await hydrateLibraryBodies({ store, ownerUserId: OWNER_A, remote });
      expect(remote.fetchDetail).toHaveBeenCalledTimes(1);
      expect(await store.offlineStats(OWNER_A)).toMatchObject({ total: 1, failedPermanent: 1 });
      remote.fetchDetail.mockResolvedValue(detail);
      await refreshArtifactDetail({ store, ownerUserId: OWNER_A, artifactId: detail.artifact.id, remote });
      expect(await store.offlineStats(OWNER_A)).toMatchObject({ current: 1, failedPermanent: 0 });
      await store.recordBodyFailure(OWNER_A, detail.artifact.id, detail.artifact.updatedAt, true, 0);
      await store.clearBodies(OWNER_A);
      expect(await store.idsNeedingBody(OWNER_A, 10)).toEqual([detail.artifact.id]);
      await store.purgeOwner(OWNER_A);
      expect(await store.offlineStats(OWNER_A)).toMatchObject({ total: 0, failedPermanent: 0 });
    } finally { handle.close(); }
  });
});
