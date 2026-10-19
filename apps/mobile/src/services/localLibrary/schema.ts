import type { LocalSqlDatabase } from "./sqlDatabase";

/**
 * Forward-only local migrations, tracked with SQLite `PRAGMA user_version`.
 * Append a new entry to change the schema; never edit a shipped entry.
 *
 * The store is a device copy of cloud-authoritative artifacts, so a database
 * written by a newer app build (for example after an update rollback) is reset
 * and repopulated from the cloud rather than read with an unknown shape.
 */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE library_artifacts (
     owner_user_id TEXT NOT NULL,
     artifact_id TEXT NOT NULL,
     artifact_type TEXT NOT NULL CHECK (artifact_type IN ('reviewer', 'quiz', 'activity_output')),
     title TEXT NOT NULL,
     course_id TEXT,
     source_id TEXT,
     activity_id TEXT,
     cloud_created_at TEXT NOT NULL,
     cloud_updated_at TEXT NOT NULL,
     summary_json TEXT NOT NULL,
     payload_json TEXT,
     payload_schema INTEGER,
     payload_cloud_updated_at TEXT,
     local_updated_at TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, artifact_id)
   );
   CREATE INDEX library_artifacts_owner_recent
     ON library_artifacts (owner_user_id, cloud_updated_at DESC, artifact_id);
   CREATE TABLE library_artifact_aliases (
     owner_user_id TEXT NOT NULL,
     alias_id TEXT NOT NULL,
     artifact_id TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, alias_id)
   );`,
  `CREATE TABLE study_assists (
     owner_user_id TEXT NOT NULL,
     cache_key TEXT NOT NULL,
     reviewer_id TEXT NOT NULL,
     canonical_content TEXT NOT NULL,
     result_json TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, cache_key)
   );
   CREATE INDEX study_assists_reviewer ON study_assists(owner_user_id, reviewer_id);`,
  `CREATE TABLE activity_responses (
     owner_user_id TEXT NOT NULL,
     artifact_id TEXT NOT NULL,
     responses_json TEXT NOT NULL DEFAULT '{}',
     completed INTEGER NOT NULL DEFAULT 0,
     updated_at TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, artifact_id)
   );`,
  `CREATE TABLE quiz_practice (
     owner_user_id TEXT NOT NULL,
     quiz_id TEXT NOT NULL,
     snapshot_json TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, quiz_id)
   );`,
  `CREATE TABLE experience_activity_snapshots (
     owner_user_id TEXT NOT NULL,
     activity_id TEXT NOT NULL,
     summary_json TEXT NOT NULL,
     detail_json TEXT,
     updated_at TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, activity_id)
   );`,
  `CREATE TABLE quiz_answer_keys (
     owner_user_id TEXT NOT NULL,
     quiz_id TEXT NOT NULL,
     version_id TEXT NOT NULL,
     key_json TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, quiz_id)
   );`,
  `CREATE TABLE IF NOT EXISTS pending_draft_edits (
     owner_user_id TEXT NOT NULL,
     draft_id TEXT NOT NULL,
     client_edit_id TEXT NOT NULL,
     base_revision INTEGER NOT NULL CHECK (base_revision > 0),
     content_json TEXT NOT NULL,
     sent_content_json TEXT,
     state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','needs_attention')),
     updated_at TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, draft_id)
   );
   CREATE TABLE IF NOT EXISTS draft_sync_receipts (
     owner_user_id TEXT NOT NULL,
     draft_id TEXT NOT NULL,
     copy_id TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, draft_id)
   );`,
  `CREATE TABLE IF NOT EXISTS screen_snapshots (
     owner_user_id TEXT NOT NULL,
     cache_key TEXT NOT NULL,
     snapshot_json TEXT NOT NULL,
     PRIMARY KEY (owner_user_id, cache_key)
   );`,
  `CREATE TABLE IF NOT EXISTS offline_image_manifests (
     owner_user_id TEXT NOT NULL,
     artifact_id TEXT NOT NULL,
     version TEXT NOT NULL,
     generation TEXT NOT NULL,
     manifest_json TEXT NOT NULL,
     bytes INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (owner_user_id, artifact_id)
   );`,
  `ALTER TABLE library_artifacts ADD COLUMN body_failure_version TEXT;
   ALTER TABLE library_artifacts ADD COLUMN body_failure_permanent INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE library_artifacts ADD COLUMN body_failure_attempts INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE library_artifacts ADD COLUMN body_retry_at INTEGER NOT NULL DEFAULT 0;`,
];

export const LOCAL_LIBRARY_SCHEMA_VERSION = MIGRATIONS.length;
const LOCAL_TABLES = ["offline_image_manifests", "screen_snapshots", "pending_draft_edits", "draft_sync_receipts", "quiz_answer_keys", "experience_activity_snapshots", "quiz_practice", "activity_responses", "study_assists", "library_artifact_aliases", "library_artifacts"] as const;

export async function migrateLocalLibrary(db: LocalSqlDatabase): Promise<number> {
  let version = await userVersion(db);
  if (version > LOCAL_LIBRARY_SCHEMA_VERSION) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const table of LOCAL_TABLES) {
        await transaction.execAsync(`DROP TABLE IF EXISTS ${table};`);
      }
      await transaction.execAsync("PRAGMA user_version = 0;");
    });
    version = 0;
  }
  for (let index = version; index < MIGRATIONS.length; index += 1) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(MIGRATIONS[index]!);
      await transaction.execAsync(`PRAGMA user_version = ${index + 1};`);
    });
  }
  return userVersion(db);
}

async function userVersion(db: LocalSqlDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
    [],
  );
  return Number(row?.user_version ?? 0);
}
