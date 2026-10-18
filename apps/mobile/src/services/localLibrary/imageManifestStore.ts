import type { LocalSqlDatabase, LocalSqlExecutor } from './sqlDatabase';
import { newImageManifest, notifyOfflineImages, type OfflineImageManifest } from './imageManifest';

export interface ImageManifestStore {
  readImageManifest(owner: string, artifact: string): Promise<OfflineImageManifest | null>;
  saveImageManifest(owner: string, artifact: string, manifest: OfflineImageManifest): Promise<boolean>;
  imageCacheBytes(): Promise<number>;
}
export async function initializeImageManifest(db: LocalSqlExecutor, owner: string, artifact: string, version: string): Promise<void> {
  const manifest = newImageManifest(version);
  await db.runAsync(`INSERT INTO offline_image_manifests(owner_user_id, artifact_id, version, generation, manifest_json, bytes)
    VALUES (?, ?, ?, ?, ?, 0) ON CONFLICT(owner_user_id, artifact_id) DO NOTHING`,
  [owner, artifact, version, manifest.generation, JSON.stringify(manifest)]);
}
export function createImageManifestStore(db: LocalSqlDatabase): ImageManifestStore {
  return {
    async readImageManifest(owner, artifact) {
      if (!owner) throw new Error('owner_required');
      const row = await db.getFirstAsync<{ manifest_json: string }>(
        `SELECT m.manifest_json FROM offline_image_manifests m JOIN library_artifacts a
         ON a.owner_user_id=m.owner_user_id AND a.artifact_id=m.artifact_id
         WHERE m.owner_user_id=? AND m.artifact_id=? AND a.payload_json IS NOT NULL
         AND a.payload_cloud_updated_at=m.version AND a.cloud_updated_at=m.version`, [owner, artifact]);
      if (!row) return null;
      try { return JSON.parse(row.manifest_json) as OfflineImageManifest; } catch { return null; }
    },
    async saveImageManifest(owner, artifact, manifest) {
      if (!owner) throw new Error('owner_required');
      let saved = false;
      await db.withExclusiveTransactionAsync(async tx => {
        const row = await tx.getFirstAsync<{ generation: string }>(
          `SELECT m.generation FROM offline_image_manifests m JOIN library_artifacts a
           ON a.owner_user_id=m.owner_user_id AND a.artifact_id=m.artifact_id
           WHERE m.owner_user_id=? AND m.artifact_id=? AND m.version=? AND m.generation=?
           AND a.payload_json IS NOT NULL AND a.payload_cloud_updated_at=m.version AND a.cloud_updated_at=m.version`,
        [owner, artifact, manifest.version, manifest.generation]);
        if (!row) return;
        await tx.runAsync(`UPDATE offline_image_manifests SET manifest_json=?, bytes=? WHERE owner_user_id=? AND artifact_id=?`,
          [JSON.stringify(manifest), manifest.images.reduce((sum, image) => sum + (image.status === 'stored' ? image.bytes : 0), 0), owner, artifact]);
        saved = true;
      });
      if (saved) notifyOfflineImages(owner);
      return saved;
    },
    async imageCacheBytes() {
      const row = await db.getFirstAsync<{ bytes: number }>('SELECT COALESCE(SUM(bytes), 0) AS bytes FROM offline_image_manifests', []);
      return row?.bytes ?? 0;
    },
  };
}

export async function invalidateImages(db: LocalSqlExecutor, owner: string, artifact?: string): Promise<void> {
  await db.runAsync(`DELETE FROM offline_image_manifests WHERE owner_user_id=?${artifact ? ' AND artifact_id=?' : ''}`, artifact ? [owner, artifact] : [owner]);
}
