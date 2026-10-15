import { readSavedSnapshot, savedSnapshot, type SavedSnapshot } from "@stay-focused/shared";
import type { LocalSqlExecutor } from "./sqlDatabase";

export interface ScreenSnapshotStore {
  listScreenSnapshots<T>(ownerUserId: string, prefix: string): Promise<readonly SavedSnapshot<T>[]>;
  readScreenSnapshot<T>(ownerUserId: string, key: string): Promise<SavedSnapshot<T> | null>;
  saveScreenSnapshot<T>(ownerUserId: string, key: string, data: T): Promise<SavedSnapshot<T>>;
  purgeScreenSnapshots(ownerUserId: string): Promise<void>;
}

export function createScreenSnapshotStore(db: LocalSqlExecutor): ScreenSnapshotStore {
  return {
    async listScreenSnapshots<T>(ownerUserId: string, prefix: string) {
      if (!ownerUserId) return [];
      const rows = await db.getAllAsync<{ cache_key: string; snapshot_json: string }>(
        "SELECT cache_key, snapshot_json FROM screen_snapshots WHERE owner_user_id = ? AND substr(cache_key, 1, ?) = ?", [ownerUserId, prefix.length, prefix]);
      return rows.flatMap(row => {
        try { const snapshot = readSavedSnapshot<T>(JSON.parse(row.snapshot_json) as unknown, ownerUserId, row.cache_key); return snapshot ? [snapshot] : []; }
        catch { return []; }
      });
    },
    async readScreenSnapshot<T>(ownerUserId: string, key: string) {
      if (!ownerUserId) return null;
      const row = await db.getFirstAsync<{ snapshot_json: string }>(
        "SELECT snapshot_json FROM screen_snapshots WHERE owner_user_id = ? AND cache_key = ?", [ownerUserId, key]);
      try { return readSavedSnapshot<T>(row ? JSON.parse(row.snapshot_json) as unknown : null, ownerUserId, key); }
      catch { return null; }
    },
    async saveScreenSnapshot<T>(ownerUserId: string, key: string, data: T) {
      const snapshot = savedSnapshot(ownerUserId, key, data);
      await db.runAsync(`INSERT INTO screen_snapshots(owner_user_id, cache_key, snapshot_json)
        VALUES (?, ?, ?) ON CONFLICT(owner_user_id, cache_key) DO UPDATE SET snapshot_json=excluded.snapshot_json`,
      [ownerUserId, key, JSON.stringify(snapshot)]);
      return snapshot;
    },
    async purgeScreenSnapshots(ownerUserId) {
      if (ownerUserId) await db.runAsync("DELETE FROM screen_snapshots WHERE owner_user_id = ?", [ownerUserId]);
    },
  };
}
