import type {
  LibraryArtifactDetail,
  LibraryArtifactSummary,
  LibraryArtifactType,
} from "@stay-focused/shared";

import type { LocalSqlDatabase, LocalSqlExecutor } from "./sqlDatabase";

/** Version of the stored detail payload shape (the Library detail DTO). */
export const LOCAL_PAYLOAD_SCHEMA = 1;

export type LocalUpsertOutcome = "inserted" | "updated" | "unchanged" | "ignored_older";

export interface LocalArtifactDetail {
  readonly detail: LibraryArtifactDetail;
  /** True when the cloud summary is newer than the stored body. */
  readonly bodyBehindCloud: boolean;
}

export interface LocalArtifactStore {
  listSummaries(ownerUserId: string): Promise<LibraryArtifactSummary[]>;
  readDetail(ownerUserId: string, artifactId: string): Promise<LocalArtifactDetail | null>;
  upsertSummaries(
    ownerUserId: string,
    summaries: readonly LibraryArtifactSummary[],
  ): Promise<LocalUpsertOutcome[]>;
  upsertDetail(
    ownerUserId: string,
    requestedId: string,
    detail: LibraryArtifactDetail,
  ): Promise<LocalUpsertOutcome>;
  idsNeedingBody(ownerUserId: string, limit: number): Promise<string[]>;
  removeArtifact(ownerUserId: string, artifactId: string): Promise<void>;
  purgeOwner(ownerUserId: string): Promise<void>;
}

interface ArtifactRow {
  readonly artifact_id: string;
  readonly cloud_updated_at: string;
  readonly summary_json: string;
  readonly payload_json: string | null;
  readonly payload_schema: number | null;
  readonly payload_cloud_updated_at: string | null;
}

const ARTIFACT_TYPES: readonly LibraryArtifactType[] = ["reviewer", "quiz", "activity_output"];

/**
 * Device copy of completed, cloud-persisted Library artifacts.
 *
 * Identity is the server's canonical Library id (`reviewer:…`, `quiz:…`, …),
 * never the title. Every statement is scoped by the authenticated owner id.
 * Writes are idempotent: an older cloud copy never replaces a newer local one,
 * and an identical copy is a no-op.
 */
export function createLocalArtifactStore(
  db: LocalSqlDatabase,
  now: () => string = () => new Date().toISOString(),
): LocalArtifactStore {
  return {
    async listSummaries(ownerUserId) {
      requireOwner(ownerUserId);
      // The list reads summaries only; bodies stay on disk until an artifact opens.
      const rows = await db.getAllAsync<{ summary_json: string }>(
        `SELECT summary_json FROM library_artifacts
          WHERE owner_user_id = ?
          ORDER BY cloud_updated_at DESC, artifact_id ASC`,
        [ownerUserId],
      );
      return rows.flatMap((row) => {
        const summary = parseSummary(row.summary_json);
        return summary ? [summary] : [];
      });
    },

    async readDetail(ownerUserId, artifactId) {
      requireOwner(ownerUserId);
      const canonical = await resolveAlias(db, ownerUserId, artifactId);
      const row = await db.getFirstAsync<ArtifactRow>(
        `SELECT artifact_id, cloud_updated_at, summary_json, payload_json,
                payload_schema, payload_cloud_updated_at
           FROM library_artifacts
          WHERE owner_user_id = ? AND artifact_id = ?`,
        [ownerUserId, canonical],
      );
      if (!row?.payload_json || row.payload_schema !== LOCAL_PAYLOAD_SCHEMA) return null;
      const summary = parseSummary(row.summary_json);
      const detail = parseDetail(row.payload_json);
      if (!summary || !detail || detail.artifact.id !== row.artifact_id) return null;
      return {
        // The newest summary wins for list-level fields; the body is as stored.
        detail: { ...detail, artifact: summary },
        bodyBehindCloud: (row.payload_cloud_updated_at ?? "") < row.cloud_updated_at,
      };
    },

    async upsertSummaries(ownerUserId, summaries) {
      requireOwner(ownerUserId);
      const outcomes: LocalUpsertOutcome[] = [];
      await db.withExclusiveTransactionAsync(async (transaction) => {
        for (const summary of summaries) {
          if (!isCompletedSummary(summary)) continue;
          outcomes.push(await writeSummary(transaction, ownerUserId, summary, now()));
        }
      });
      return outcomes;
    },

    async upsertDetail(ownerUserId, requestedId, detail) {
      requireOwner(ownerUserId);
      if (!isCompletedSummary(detail.artifact) || !bodyMatchesType(detail)) {
        throw new Error("invalid_artifact_detail");
      }
      let outcome: LocalUpsertOutcome = "unchanged";
      await db.withExclusiveTransactionAsync(async (transaction) => {
        const canonical = detail.artifact.id;
        if (requestedId !== canonical) {
          // The server resolved this id to a different canonical artifact
          // (for example a finished generation that became a saved Reviewer).
          // That is an explicit identity mapping, not an absence-based delete.
          await transaction.runAsync(
            `INSERT INTO library_artifact_aliases (owner_user_id, alias_id, artifact_id)
             VALUES (?, ?, ?)
             ON CONFLICT (owner_user_id, alias_id) DO UPDATE SET artifact_id = excluded.artifact_id`,
            [ownerUserId, requestedId, canonical],
          );
          await transaction.runAsync(
            "DELETE FROM library_artifacts WHERE owner_user_id = ? AND artifact_id = ?",
            [ownerUserId, requestedId],
          );
        }
        outcome = await writeDetail(transaction, ownerUserId, detail, now());
      });
      return outcome;
    },

    async idsNeedingBody(ownerUserId, limit) {
      requireOwner(ownerUserId);
      const rows = await db.getAllAsync<{ artifact_id: string }>(
        `SELECT artifact_id FROM library_artifacts
          WHERE owner_user_id = ?
            AND (payload_json IS NULL
                 OR payload_schema IS NOT ?
                 OR payload_cloud_updated_at IS NULL
                 OR payload_cloud_updated_at < cloud_updated_at)
          ORDER BY cloud_updated_at DESC, artifact_id ASC
          LIMIT ?`,
        [ownerUserId, LOCAL_PAYLOAD_SCHEMA, Math.max(0, Math.floor(limit))],
      );
      return rows.map((row) => row.artifact_id);
    },

    async removeArtifact(ownerUserId, artifactId) {
      requireOwner(ownerUserId);
      await db.withExclusiveTransactionAsync(async (transaction) => {
        const canonical = await resolveAlias(transaction, ownerUserId, artifactId);
        await transaction.runAsync(
          "DELETE FROM library_artifacts WHERE owner_user_id = ? AND artifact_id IN (?, ?)",
          [ownerUserId, artifactId, canonical],
        );
        await transaction.runAsync(
          "DELETE FROM library_artifact_aliases WHERE owner_user_id = ? AND (alias_id = ? OR artifact_id IN (?, ?))",
          [ownerUserId, artifactId, artifactId, canonical],
        );
      });
    },

    async purgeOwner(ownerUserId) {
      requireOwner(ownerUserId);
      await db.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync("DELETE FROM library_artifacts WHERE owner_user_id = ?", [ownerUserId]);
        await transaction.runAsync("DELETE FROM library_artifact_aliases WHERE owner_user_id = ?", [ownerUserId]);
      });
    },
  };
}

async function writeSummary(
  db: LocalSqlExecutor,
  ownerUserId: string,
  summary: LibraryArtifactSummary,
  localNow: string,
): Promise<LocalUpsertOutcome> {
  const existing = await currentRow(db, ownerUserId, summary.id);
  const summaryJson = JSON.stringify(summary);
  if (existing) {
    const order = compareInstants(summary.updatedAt, existing.cloud_updated_at);
    if (order < 0) return "ignored_older";
    if (order === 0 && existing.summary_json === summaryJson) return "unchanged";
  }
  await db.runAsync(
    `INSERT INTO library_artifacts (
       owner_user_id, artifact_id, artifact_type, title, course_id, source_id, activity_id,
       cloud_created_at, cloud_updated_at, summary_json, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (owner_user_id, artifact_id) DO UPDATE SET
       artifact_type = excluded.artifact_type,
       title = excluded.title,
       course_id = excluded.course_id,
       source_id = excluded.source_id,
       activity_id = excluded.activity_id,
       cloud_created_at = excluded.cloud_created_at,
       cloud_updated_at = excluded.cloud_updated_at,
       summary_json = excluded.summary_json,
       local_updated_at = excluded.local_updated_at`,
    [...summaryColumns(ownerUserId, summary), summaryJson, localNow],
  );
  return existing ? "updated" : "inserted";
}

async function writeDetail(
  db: LocalSqlExecutor,
  ownerUserId: string,
  detail: LibraryArtifactDetail,
  localNow: string,
): Promise<LocalUpsertOutcome> {
  const summary = detail.artifact;
  const existing = await currentRow(db, ownerUserId, summary.id);
  const summaryJson = JSON.stringify(summary);
  const payloadJson = JSON.stringify(detail);
  if (existing) {
    const order = compareInstants(summary.updatedAt, existing.cloud_updated_at);
    if (order < 0) return "ignored_older";
    if (
      order === 0 &&
      existing.summary_json === summaryJson &&
      existing.payload_json === payloadJson &&
      existing.payload_schema === LOCAL_PAYLOAD_SCHEMA
    ) {
      return "unchanged";
    }
  }
  await db.runAsync(
    `INSERT INTO library_artifacts (
       owner_user_id, artifact_id, artifact_type, title, course_id, source_id, activity_id,
       cloud_created_at, cloud_updated_at, summary_json, payload_json, payload_schema,
       payload_cloud_updated_at, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (owner_user_id, artifact_id) DO UPDATE SET
       artifact_type = excluded.artifact_type,
       title = excluded.title,
       course_id = excluded.course_id,
       source_id = excluded.source_id,
       activity_id = excluded.activity_id,
       cloud_created_at = excluded.cloud_created_at,
       cloud_updated_at = excluded.cloud_updated_at,
       summary_json = excluded.summary_json,
       payload_json = excluded.payload_json,
       payload_schema = excluded.payload_schema,
       payload_cloud_updated_at = excluded.payload_cloud_updated_at,
       local_updated_at = excluded.local_updated_at`,
    [
      ...summaryColumns(ownerUserId, summary),
      summaryJson,
      payloadJson,
      LOCAL_PAYLOAD_SCHEMA,
      summary.updatedAt,
      localNow,
    ],
  );
  return existing ? "updated" : "inserted";
}

function summaryColumns(ownerUserId: string, summary: LibraryArtifactSummary) {
  return [
    ownerUserId,
    summary.id,
    summary.type,
    summary.title,
    summary.course?.id ?? null,
    summary.sourceId,
    summary.activityId,
    summary.createdAt,
    summary.updatedAt,
  ];
}

function currentRow(db: LocalSqlExecutor, ownerUserId: string, artifactId: string) {
  return db.getFirstAsync<ArtifactRow>(
    `SELECT artifact_id, cloud_updated_at, summary_json, payload_json,
            payload_schema, payload_cloud_updated_at
       FROM library_artifacts
      WHERE owner_user_id = ? AND artifact_id = ?`,
    [ownerUserId, artifactId],
  );
}

async function resolveAlias(
  db: LocalSqlExecutor,
  ownerUserId: string,
  artifactId: string,
): Promise<string> {
  const alias = await db.getFirstAsync<{ artifact_id: string }>(
    "SELECT artifact_id FROM library_artifact_aliases WHERE owner_user_id = ? AND alias_id = ?",
    [ownerUserId, artifactId],
  );
  return alias?.artifact_id ?? artifactId;
}

/** Orders ISO instants; unparseable values fall back to string order. */
function compareInstants(left: string, right: string): number {
  const a = Date.parse(left);
  const b = Date.parse(right);
  if (Number.isFinite(a) && Number.isFinite(b)) return Math.sign(a - b);
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireOwner(ownerUserId: string) {
  if (!ownerUserId) throw new Error("owner_required");
}

function isCompletedSummary(value: unknown): value is LibraryArtifactSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    ARTIFACT_TYPES.includes(value.type as LibraryArtifactType) &&
    // Only finished artifacts belong in the Library store; queue state does not.
    value.status === "completed"
  );
}

function bodyMatchesType(detail: LibraryArtifactDetail): boolean {
  const type = detail.artifact.type;
  if ("reviewer" in detail) return type === "reviewer" && Array.isArray(detail.reviewer?.sections);
  if ("quiz" in detail) return type === "quiz" && Array.isArray(detail.quiz?.questions);
  if ("draft" in detail) return type === "activity_output" && Array.isArray(detail.draft?.sections);
  return false;
}

function parseSummary(json: string): LibraryArtifactSummary | null {
  try {
    const value: unknown = JSON.parse(json);
    return isCompletedSummary(value) ? value : null;
  } catch {
    return null;
  }
}

function parseDetail(json: string): LibraryArtifactDetail | null {
  try {
    const value: unknown = JSON.parse(json);
    if (!isRecord(value) || !isCompletedSummary(value.artifact)) return null;
    const detail = value as unknown as LibraryArtifactDetail;
    return bodyMatchesType(detail) ? detail : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
