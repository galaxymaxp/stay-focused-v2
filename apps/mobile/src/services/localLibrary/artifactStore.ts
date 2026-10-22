import { createImageManifestStore, initializeImageManifest, invalidateImages, type ImageManifestStore } from './imageManifestStore';
import { imagesReady, notifyOfflineImages, removeImageDirectory, withOfflineImageLock } from './imageManifest';
import type {
  LibraryArtifactDetail,
  LibraryArtifactSummary,
  LibraryArtifactType,
  QuizAttempt,
  QuizAnswerKey,
  QuizResult,
  ActivityDetail,
  ActivitySummary,
} from "@stay-focused/shared";

import type { LocalSqlDatabase, LocalSqlExecutor } from "./sqlDatabase";
import { createScreenSnapshotStore, type ScreenSnapshotStore } from "./screenSnapshots";
import { createAssistCache, type AssistCache } from "./assistCache";
import { createTopicCache, type TopicCache } from './topicCache';
import { keyMatchesQuiz, parseQuizAnswerKey } from "./quizAnswerKeys";
import { createPendingDraftStore, type PendingDraftStore } from './pendingDraftStore';

/** Version of the stored detail payload shape (the Library detail DTO). */
export const LOCAL_PAYLOAD_SCHEMA = 1;

export type LocalUpsertOutcome = "inserted" | "updated" | "unchanged" | "ignored_older";

export interface LocalArtifactDetail {
  readonly detail: LibraryArtifactDetail;
  /** True when the cloud summary is newer than the stored body. */
  readonly bodyBehindCloud: boolean;
}

/** A local attempt and provisional result pending server-authoritative replay. */
export interface LocalQuizPractice {
  readonly attempt: QuizAttempt | null;
  readonly result: QuizResult | null;
  readonly selected: readonly string[];
  readonly dirty: boolean;
}

export interface OfflineStats {
  readonly total: number;
  readonly current: number;
  readonly approximateBytes: number;
  readonly failedPermanent: number;
}
export type LocalLibrarySummary = LibraryArtifactSummary & { readonly offlineReady: boolean };

export interface LocalArtifactStore extends ImageManifestStore, AssistCache, TopicCache, PendingDraftStore, ScreenSnapshotStore {
  readQuizAnswerKey(ownerUserId: string, quizId: string, bodyUpdatedAt: string): Promise<QuizAnswerKey | null>;
  saveQuizAnswerKey(ownerUserId: string, key: QuizAnswerKey, bodyUpdatedAt: string): Promise<void>;
  offlineStats(ownerUserId: string): Promise<OfflineStats>;
  /** List and readiness derived from the same owner-bound summary scan. */
  readLibraryOverview(ownerUserId: string): Promise<{ items: LocalLibrarySummary[]; offlineStats: OfflineStats }>;
  /** Remove cloud copies only; keep summaries and unsynced student work. */
  clearBodies(ownerUserId: string): Promise<void>;
  readActivitySummaries(ownerUserId: string): Promise<ActivitySummary[] | null>;
  saveActivitySummaries(ownerUserId: string, summaries: readonly ActivitySummary[]): Promise<void>;
  readActivityDetail(ownerUserId: string, activityId: string): Promise<ActivityDetail | null>;
  saveActivityDetail(ownerUserId: string, detail: ActivityDetail): Promise<void>;
  readQuizPractice(ownerUserId: string, quizId: string): Promise<LocalQuizPractice | null>;
  saveQuizPractice(ownerUserId: string, quizId: string, practice: LocalQuizPractice): Promise<void>;
  readActivityResponse(ownerUserId: string, artifactId: string): Promise<{ responses: Record<string, string>; completed: boolean; updatedAt: string } | null>;
  saveActivityResponse(ownerUserId: string, artifactId: string, responses: Record<string, string>, completed: boolean): Promise<void>;
  listSummaries(ownerUserId: string): Promise<LocalLibrarySummary[]>;
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
  idsNeedingBody(ownerUserId: string, limit: number, includeQuizKeys?: boolean): Promise<string[]>;
  bodyAttempt(ownerUserId: string, artifactId: string): Promise<{ version: string; attempts: number } | null>;
  recordBodyFailure(ownerUserId: string, artifactId: string, version: string, permanent: boolean, retryAt: number): Promise<void>;
  clearBodyFailure(ownerUserId: string, artifactId: string): Promise<void>;
  nextBodyRetryAt(ownerUserId: string, includeQuizKeys?: boolean): Promise<number | null>;
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
const BODY_NEEDED_SQL = `(payload_json IS NULL OR payload_schema IS NOT ?
  OR payload_cloud_updated_at IS NULL OR payload_cloud_updated_at < cloud_updated_at
  OR (? = 1 AND artifact_type = 'quiz' AND NOT EXISTS (
    SELECT 1 FROM quiz_answer_keys k WHERE k.owner_user_id = library_artifacts.owner_user_id
      AND 'quiz:' || k.quiz_id = library_artifacts.artifact_id
      AND k.updated_at = library_artifacts.cloud_updated_at)))`;

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
    ...createImageManifestStore(db),
    ...createScreenSnapshotStore(db),
    ...createAssistCache(db),
    ...createTopicCache(db),
    ...createPendingDraftStore(db, now),
    async readQuizAnswerKey(ownerUserId, quizId, bodyUpdatedAt) {
      requireOwner(ownerUserId);
      const row = await db.getFirstAsync<{ key_json: string; version_id: string; updated_at: string }>(
        'SELECT key_json, version_id, updated_at FROM quiz_answer_keys WHERE owner_user_id = ? AND quiz_id = ?', [ownerUserId, quizId]);
      if (!row || row.updated_at !== bodyUpdatedAt) return null;
      const key = parseQuizAnswerKey(row.key_json, quizId);
      const artifact = await currentRow(db, ownerUserId, `quiz:${quizId}`);
      const detail = artifact?.payload_json ? parseDetail(artifact.payload_json) : null;
      return key?.versionId === row.version_id && artifact?.payload_cloud_updated_at === bodyUpdatedAt &&
        detail && 'quiz' in detail && keyMatchesQuiz(key, detail.quiz.questions) ? key : null;
    },
    async saveQuizAnswerKey(ownerUserId, key, bodyUpdatedAt) {
      requireOwner(ownerUserId);
      if (!parseQuizAnswerKey(JSON.stringify(key), key.quizId)) throw new Error('invalid_quiz_key');
      await db.withExclusiveTransactionAsync(async transaction => {
        const row = await currentRow(transaction, ownerUserId, `quiz:${key.quizId}`);
        // A delayed fetch cannot repopulate a removed copy or attach to another body revision.
        if (!row?.payload_json || row.payload_cloud_updated_at !== bodyUpdatedAt || row.cloud_updated_at !== bodyUpdatedAt) return;
        const detail = parseDetail(row.payload_json);
        if (!detail || !('quiz' in detail) || !keyMatchesQuiz(key, detail.quiz.questions)) throw new Error('quiz_key_mismatch');
        await transaction.runAsync(`INSERT INTO quiz_answer_keys(owner_user_id, quiz_id, version_id, key_json, updated_at)
          VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_user_id, quiz_id) DO UPDATE SET
          version_id = excluded.version_id, key_json = excluded.key_json, updated_at = excluded.updated_at`,
        [ownerUserId, key.quizId, key.versionId, JSON.stringify(key), bodyUpdatedAt]);
      });
    },
    async readActivitySummaries(ownerUserId) {
      requireOwner(ownerUserId);
      const rows = await db.getAllAsync<{ summary_json: string }>(
        `SELECT summary_json FROM experience_activity_snapshots
          WHERE owner_user_id = ? ORDER BY activity_id ASC`, [ownerUserId]);
      if (rows.length === 0) return null;
      const summaries: ActivitySummary[] = [];
      for (const row of rows) {
        const summary = parseActivitySummary(row.summary_json);
        if (!summary) return null;
        summaries.push(summary);
      }
      return summaries;
    },
    async saveActivitySummaries(ownerUserId, summaries) {
      requireOwner(ownerUserId);
      await db.withExclusiveTransactionAsync(async (transaction) => {
        for (const summary of summaries) {
          if (!parseActivitySummary(JSON.stringify(summary))) throw new Error("invalid_activity_summary");
          await transaction.runAsync(`INSERT INTO experience_activity_snapshots
            (owner_user_id, activity_id, summary_json, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(owner_user_id, activity_id) DO UPDATE SET
              summary_json = excluded.summary_json, updated_at = excluded.updated_at`,
          [ownerUserId, summary.id, JSON.stringify(summary), now()]);
        }
      });
    },
    async readActivityDetail(ownerUserId, activityId) {
      requireOwner(ownerUserId);
      const row = await db.getFirstAsync<{ detail_json: string | null }>(
        `SELECT detail_json FROM experience_activity_snapshots
          WHERE owner_user_id = ? AND activity_id = ?`, [ownerUserId, activityId]);
      return row?.detail_json ? parseActivityDetail(row.detail_json, activityId) : null;
    },
    async saveActivityDetail(ownerUserId, detail) {
      requireOwner(ownerUserId);
      if (!parseActivitySummary(JSON.stringify(detail)) || !Array.isArray(detail.attachments)) throw new Error("invalid_activity_detail");
      await db.runAsync(`INSERT INTO experience_activity_snapshots
        (owner_user_id, activity_id, summary_json, detail_json, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(owner_user_id, activity_id) DO UPDATE SET
          summary_json = excluded.summary_json, detail_json = excluded.detail_json, updated_at = excluded.updated_at`,
      [ownerUserId, detail.id, JSON.stringify(activitySummary(detail)), JSON.stringify(detail), now()]);
    },
    async readQuizPractice(ownerUserId, quizId) {
      requireOwner(ownerUserId);
      const row = await db.getFirstAsync<{ snapshot_json: string }>(
        'SELECT snapshot_json FROM quiz_practice WHERE owner_user_id = ? AND quiz_id = ?', [ownerUserId, quizId]);
      if (!row) return null;
      try {
        const parsed = JSON.parse(row.snapshot_json) as LocalQuizPractice;
        if (!parsed || typeof parsed !== 'object' || typeof parsed.dirty !== 'boolean' ||
          !Array.isArray(parsed.selected) || parsed.selected.some(value => typeof value !== 'string') ||
          (parsed.attempt !== null && (parsed.attempt?.quizId !== quizId || !Array.isArray(parsed.attempt?.answers))) ||
          (parsed.result !== null && parsed.result?.quizId !== quizId)) return null;
        return parsed;
      } catch { return null; }
    },
    async saveQuizPractice(ownerUserId, quizId, practice) {
      requireOwner(ownerUserId);
      if (practice.attempt && practice.attempt.quizId !== quizId) throw new Error('quiz_identity_mismatch');
      await db.runAsync(`INSERT INTO quiz_practice(owner_user_id, quiz_id, snapshot_json, updated_at)
        VALUES (?, ?, ?, ?) ON CONFLICT(owner_user_id, quiz_id) DO UPDATE SET
        snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at`,
      [ownerUserId, quizId, JSON.stringify(practice), now()]);
    },
    async listSummaries(ownerUserId) {
      requireOwner(ownerUserId);
      // Compute readiness without loading full bodies into the list.
      const rows = await db.getAllAsync<{ summary_json: string; offline_ready: number }>(
        `SELECT summary_json, CASE WHEN payload_json IS NOT NULL
          AND payload_schema = ${LOCAL_PAYLOAD_SCHEMA}
          AND payload_cloud_updated_at IS NOT NULL
          AND payload_cloud_updated_at >= cloud_updated_at THEN 1 ELSE 0 END AS offline_ready
          FROM library_artifacts
          WHERE owner_user_id = ?
          ORDER BY cloud_updated_at DESC, artifact_id ASC`,
        [ownerUserId],
      );
      const manifests = await db.getAllAsync<{artifact_id: string; version: string; manifest_json: string}>(
        'SELECT artifact_id, version, manifest_json FROM offline_image_manifests WHERE owner_user_id=?', [ownerUserId]);
      const imageReady = new Set(manifests.flatMap(row => {
        try { return imagesReady(JSON.parse(row.manifest_json) as import('./imageManifest').OfflineImageManifest) ? [row.artifact_id + ':' + row.version] : []; }
        catch { return []; }
      }));
      const responseRows = await db.getAllAsync<{ artifact_id: string; responses_json: string; completed: number }>(
        'SELECT artifact_id, responses_json, completed FROM activity_responses WHERE owner_user_id = ?', [ownerUserId]);
      const responses = new Map(responseRows.map(row => [row.artifact_id, row]));
      const quizRows = await db.getAllAsync<{ quiz_id: string; snapshot_json: string }>(
        'SELECT quiz_id, snapshot_json FROM quiz_practice WHERE owner_user_id = ?', [ownerUserId]);
      const practices = new Map(quizRows.flatMap(row => {
        try { return [[row.quiz_id, JSON.parse(row.snapshot_json) as LocalQuizPractice] as const]; } catch { return []; }
      }));
      const pendingDrafts = new Map((await db.getAllAsync<{ draft_id: string; content_json: string }>(
        'SELECT draft_id,content_json FROM pending_draft_edits WHERE owner_user_id=?', [ownerUserId]))
        .map(row => [row.draft_id, row.content_json]));
      return rows.flatMap((row) => {
        const parsed = parseSummary(row.summary_json);
        if (!parsed) return [];
        const summary: LocalLibrarySummary = { ...parsed, offlineReady: row.offline_ready === 1 && (parsed.type !== "reviewer" || imageReady.has(parsed.id + ":" + parsed.updatedAt)) };
        const pendingContent = pendingDrafts.get(summary.id.replace(/^activity:/, ''));
        if (pendingContent && summary.type === 'activity_output') {
          try { return [{ ...summary, title: (JSON.parse(pendingContent) as import('@stay-focused/shared').ActivityDraftContent).title, offlineReady: true }]; }
          catch { /* Keep the pending row even if its content needs recovery. */ }
        }
        if (summary.type === 'quiz' && summary.quiz) {
          const attempt = practices.get(summary.quiz.id)?.attempt;
          if (attempt?.status === 'in_progress') return [{ ...summary, quiz: { ...summary.quiz, activeAttempt: {
            id: attempt.id, currentQuestion: attempt.currentQuestion,
            answeredCount: attempt.answers.filter(answer => answer.finalizedAt).length,
            skippedCount: attempt.skippedQuestionIds.filter(id => !attempt.answers.some(answer => answer.questionId === id && answer.finalizedAt)).length,
            revealedCount: attempt.revealedQuestionIds.length } } }];
        }
        const response = responses.get(summary.id);
        if (!response || summary.type !== 'activity_output') return [summary];
        let count = 0;
        try { count = Object.values(JSON.parse(response.responses_json) as Record<string, unknown>).filter(value => typeof value === 'string' && !!value.trim()).length; } catch { /* Corrupt local work must not hide the artifact. */ }
        return [{ ...summary, activityStudyStatus: response.completed ? 'completed' : count ? 'in_progress' : 'not_started' }];
      });
    },
    async readActivityResponse(ownerUserId, artifactId) {
      requireOwner(ownerUserId);
      const row = await db.getFirstAsync<{ responses_json: string; completed: number; updated_at: string }>(
        'SELECT responses_json, completed, updated_at FROM activity_responses WHERE owner_user_id = ? AND artifact_id = ?', [ownerUserId, artifactId]);
      if (!row) return null;
      try {
        const parsed = JSON.parse(row.responses_json) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.values(parsed).some(value => typeof value !== 'string')) return null;
        return { responses: parsed as Record<string, string>, completed: row.completed === 1, updatedAt: row.updated_at };
      } catch { return null; }
    },
    async saveActivityResponse(ownerUserId, artifactId, responses, completed) {
      requireOwner(ownerUserId);
      await db.runAsync(`INSERT INTO activity_responses(owner_user_id, artifact_id, responses_json, completed, updated_at)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_user_id, artifact_id) DO UPDATE SET
        responses_json=excluded.responses_json, completed=excluded.completed, updated_at=excluded.updated_at`,
      [ownerUserId, artifactId, JSON.stringify(responses), completed ? 1 : 0, now()]);
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
      const pending = 'draft' in detail ? await db.getFirstAsync<{ content_json: string }>(
        'SELECT content_json FROM pending_draft_edits WHERE owner_user_id=? AND draft_id=?', [ownerUserId, detail.draft.id]) : null;
      const visible = pending && 'draft' in detail
        ? { ...detail, draft: { ...detail.draft, ...JSON.parse(pending.content_json) as import('@stay-focused/shared').ActivityDraftContent } } : detail;
      return {
        // The newest summary wins for list-level fields; the body is as stored.
        detail: { ...visible, artifact: { ...summary, ...('draft' in visible && pending ? { title: visible.draft.title } : {}) } },
        bodyBehindCloud: (row.payload_cloud_updated_at ?? "") < row.cloud_updated_at,
      };
    },

    async upsertSummaries(ownerUserId, summaries) {
      requireOwner(ownerUserId);
      const outcomes: LocalUpsertOutcome[] = [];
      await withOfflineImageLock(() => db.withExclusiveTransactionAsync(async (transaction) => {
        for (const summary of summaries) {
          if (!isCompletedSummary(summary)) continue;
          outcomes.push(await writeSummary(transaction, ownerUserId, summary, now()));
        }
      }));
      notifyOfflineImages(ownerUserId);
      return outcomes;
    },

    async upsertDetail(ownerUserId, requestedId, detail) {
      requireOwner(ownerUserId);
      if (!isCompletedSummary(detail.artifact) || !bodyMatchesType(detail)) {
        throw new Error("invalid_artifact_detail");
      }
      let outcome: LocalUpsertOutcome = "unchanged";
      await withOfflineImageLock(() => db.withExclusiveTransactionAsync(async (transaction) => {
        const canonical = detail.artifact.id;
        if (requestedId !== canonical) {
          await invalidateImages(transaction, ownerUserId, requestedId);
          await removeImageDirectory(ownerUserId, requestedId);
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
      }));
      notifyOfflineImages(ownerUserId);
      return outcome;
    },

    async bodyAttempt(ownerUserId, artifactId) {
      requireOwner(ownerUserId);
      const row = await db.getFirstAsync<{ cloud_updated_at: string; attempts: number }>(
        `SELECT cloud_updated_at, CASE WHEN body_failure_version = cloud_updated_at
          THEN body_failure_attempts ELSE 0 END AS attempts FROM library_artifacts
          WHERE owner_user_id=? AND artifact_id=?`, [ownerUserId, artifactId]);
      return row ? { version: row.cloud_updated_at, attempts: row.attempts } : null;
    },
    async recordBodyFailure(ownerUserId, artifactId, version, permanent, retryAt) {
      requireOwner(ownerUserId);
      await db.runAsync(`UPDATE library_artifacts SET
        body_failure_attempts = CASE WHEN body_failure_version = cloud_updated_at THEN body_failure_attempts + 1 ELSE 1 END,
        body_failure_version = cloud_updated_at, body_failure_permanent = ?, body_retry_at = ?
        WHERE owner_user_id=? AND artifact_id=? AND cloud_updated_at=?`,
      [permanent ? 1 : 0, retryAt, ownerUserId, artifactId, version]);
      notifyOfflineImages(ownerUserId);
    },
    async clearBodyFailure(ownerUserId, artifactId) {
      requireOwner(ownerUserId);
      await db.runAsync(`UPDATE library_artifacts SET body_failure_version=NULL,
        body_failure_permanent=0, body_failure_attempts=0, body_retry_at=0
        WHERE owner_user_id=? AND artifact_id=?`, [ownerUserId, artifactId]);
    },
    async nextBodyRetryAt(ownerUserId, includeQuizKeys = false) {
      requireOwner(ownerUserId);
      const row = await db.getFirstAsync<{ retry_at: number | null }>(
        `SELECT MIN(CASE WHEN body_failure_version = cloud_updated_at THEN body_retry_at ELSE 0 END) AS retry_at
          FROM library_artifacts WHERE owner_user_id=? AND ${BODY_NEEDED_SQL}
          AND (body_failure_version IS NOT cloud_updated_at OR body_failure_permanent = 0)`,
        [ownerUserId, LOCAL_PAYLOAD_SCHEMA, includeQuizKeys ? 1 : 0]);
      return row?.retry_at ?? null;
    },
    async idsNeedingBody(ownerUserId, limit, includeQuizKeys = false) {
      requireOwner(ownerUserId);
      const rows = await db.getAllAsync<{ artifact_id: string }>(
        `SELECT artifact_id FROM library_artifacts
          WHERE owner_user_id = ?
            AND ${BODY_NEEDED_SQL}
            AND (body_failure_version IS NOT cloud_updated_at
              OR (body_failure_permanent = 0 AND body_retry_at <= ?))
          ORDER BY cloud_updated_at DESC, artifact_id ASC
          LIMIT ?`,
        [ownerUserId, LOCAL_PAYLOAD_SCHEMA, includeQuizKeys ? 1 : 0, Date.now(), Math.max(0, Math.floor(limit))],
      );
      return rows.map((row) => row.artifact_id);
    },

    async removeArtifact(ownerUserId, artifactId) {
      requireOwner(ownerUserId);
      await withOfflineImageLock(() => db.withExclusiveTransactionAsync(async (transaction) => {
        const canonical = await resolveAlias(transaction, ownerUserId, artifactId);
        await invalidateImages(transaction, ownerUserId, canonical);
        await removeImageDirectory(ownerUserId, canonical);
        await transaction.runAsync('DELETE FROM pending_draft_edits WHERE owner_user_id=? AND draft_id IN (?,?)', [ownerUserId, artifactId.replace(/^activity:/, ''), canonical.replace(/^activity:/, '')]);
        await transaction.runAsync('DELETE FROM draft_sync_receipts WHERE owner_user_id=? AND draft_id IN (?,?)', [ownerUserId, artifactId.replace(/^activity:/, ''), canonical.replace(/^activity:/, '')]);
        await transaction.runAsync("DELETE FROM activity_responses WHERE owner_user_id = ? AND artifact_id IN (?, ?)", [ownerUserId, artifactId, canonical]);
        await transaction.runAsync("DELETE FROM quiz_practice WHERE owner_user_id = ? AND quiz_id IN (?, ?)", [ownerUserId, artifactId.replace(/^quiz:/, ''), canonical.replace(/^quiz:/, '')]);
        await transaction.runAsync("DELETE FROM quiz_answer_keys WHERE owner_user_id = ? AND quiz_id IN (?, ?)", [ownerUserId, artifactId.replace(/^quiz:/, ''), canonical.replace(/^quiz:/, '')]);
        await transaction.runAsync("DELETE FROM study_assists WHERE owner_user_id = ? AND reviewer_id IN (?, ?)", [ownerUserId, artifactId, canonical]);
        await transaction.runAsync(
          "DELETE FROM library_artifacts WHERE owner_user_id = ? AND artifact_id IN (?, ?)",
          [ownerUserId, artifactId, canonical],
        );
        await transaction.runAsync(
          "DELETE FROM library_artifact_aliases WHERE owner_user_id = ? AND (alias_id = ? OR artifact_id IN (?, ?))",
          [ownerUserId, artifactId, artifactId, canonical],
        );
      }));
      notifyOfflineImages(ownerUserId);
    },

    async offlineStats(ownerUserId) {
      requireOwner(ownerUserId);
      const summaries = await this.listSummaries(ownerUserId);
      return readOfflineStats(db, ownerUserId, summaries);
    },
    async readLibraryOverview(ownerUserId) {
      requireOwner(ownerUserId);
      const items = await this.listSummaries(ownerUserId);
      return { items, offlineStats: await readOfflineStats(db, ownerUserId, items) };
    },

    async clearBodies(ownerUserId) {
      requireOwner(ownerUserId);
      await withOfflineImageLock(() => db.withExclusiveTransactionAsync(async (transaction) => {
        await invalidateImages(transaction, ownerUserId);
        await removeImageDirectory(ownerUserId);
        await transaction.runAsync(`UPDATE library_artifacts SET body_failure_version=NULL,
          body_failure_permanent=0, body_failure_attempts=0, body_retry_at=0 WHERE owner_user_id=?`, [ownerUserId]);
        await transaction.runAsync(`UPDATE library_artifacts
          SET payload_json = NULL, payload_schema = NULL, payload_cloud_updated_at = NULL
          WHERE owner_user_id = ? AND NOT EXISTS (SELECT 1 FROM pending_draft_edits p
            WHERE p.owner_user_id=library_artifacts.owner_user_id AND 'activity:' || p.draft_id=library_artifacts.artifact_id)`, [ownerUserId]);
        await transaction.runAsync('DELETE FROM study_assists WHERE owner_user_id = ?', [ownerUserId]);
        await transaction.runAsync('DELETE FROM quiz_answer_keys WHERE owner_user_id = ?', [ownerUserId]);
      }));
      notifyOfflineImages(ownerUserId);
    },

    async purgeOwner(ownerUserId) {
      requireOwner(ownerUserId);
      await withOfflineImageLock(() => db.withExclusiveTransactionAsync(async (transaction) => {
        await invalidateImages(transaction, ownerUserId);
        await removeImageDirectory(ownerUserId);
        await transaction.runAsync('DELETE FROM screen_snapshots WHERE owner_user_id=?', [ownerUserId]);
        await transaction.runAsync('DELETE FROM pending_draft_edits WHERE owner_user_id=?', [ownerUserId]);
        await transaction.runAsync('DELETE FROM draft_sync_receipts WHERE owner_user_id=?', [ownerUserId]);
        await transaction.runAsync("DELETE FROM experience_activity_snapshots WHERE owner_user_id = ?", [ownerUserId]);
        await transaction.runAsync("DELETE FROM activity_responses WHERE owner_user_id = ?", [ownerUserId]);
        await transaction.runAsync("DELETE FROM quiz_practice WHERE owner_user_id = ?", [ownerUserId]);
        await transaction.runAsync("DELETE FROM quiz_answer_keys WHERE owner_user_id = ?", [ownerUserId]);
        await transaction.runAsync("DELETE FROM study_assists WHERE owner_user_id = ?", [ownerUserId]);
        await transaction.runAsync("DELETE FROM library_artifacts WHERE owner_user_id = ?", [ownerUserId]);
        await transaction.runAsync("DELETE FROM library_artifact_aliases WHERE owner_user_id = ?", [ownerUserId]);
      }));
      notifyOfflineImages(ownerUserId);
    },
  };
}

async function readOfflineStats(db: LocalSqlExecutor, ownerUserId: string, summaries: readonly LocalLibrarySummary[]): Promise<OfflineStats> {
  const row = await db.getFirstAsync<{ total: number; approximate_bytes: number }>(
    `SELECT COUNT(*) AS total,
      COALESCE(SUM(LENGTH(CAST(payload_json AS BLOB))), 0)
        + COALESCE((SELECT SUM(LENGTH(CAST(result_json AS BLOB))) FROM study_assists
          WHERE owner_user_id = ?), 0) AS approximate_bytes
      FROM library_artifacts WHERE owner_user_id = ?`, [ownerUserId, ownerUserId]);
  const images = await db.getFirstAsync<{ bytes: number }>('SELECT COALESCE(SUM(bytes), 0) AS bytes FROM offline_image_manifests WHERE owner_user_id=?', [ownerUserId]);
  const failures = await db.getAllAsync<{ artifact_id: string }>(
    `SELECT artifact_id FROM library_artifacts WHERE owner_user_id=?
      AND body_failure_version=cloud_updated_at AND body_failure_permanent=1`, [ownerUserId]);
  const failedIds = new Set(failures.map(item => item.artifact_id));
  return { total: row?.total ?? 0, current: summaries.filter(item => item.offlineReady).length,
    failedPermanent: summaries.filter(item => !item.offlineReady && failedIds.has(item.id)).length,
    approximateBytes: (row?.approximate_bytes ?? 0) + (images?.bytes ?? 0) };
}

function parseActivitySummary(json: string): ActivitySummary | null {
  try {
    const value = JSON.parse(json) as Partial<ActivitySummary> | null;
    if (!value || typeof value !== "object" || typeof value.id !== "string" || !value.id ||
      typeof value.title !== "string" || typeof value.status !== "string" ||
      !Array.isArray(value.submissionTypes) || typeof value.hasGeneratedDraft !== "boolean") return null;
    if (value.course !== null && (!value.course || typeof value.course !== "object" ||
      typeof value.course.id !== "string" || typeof value.course.name !== "string")) return null;
    return { ...value, estimateSource: value.estimateSource ?? null } as ActivitySummary;
  } catch {
    return null;
  }
}

function parseActivityDetail(json: string, activityId: string): ActivityDetail | null {
  try {
    const value = JSON.parse(json) as Partial<ActivityDetail> | null;
    if (!value || value.id !== activityId || !parseActivitySummary(json) ||
      typeof value.instructions !== "string" && value.instructions !== null ||
      !Array.isArray(value.attachments) || value.attachments.some(attachment =>
        !attachment || typeof attachment.key !== "string" || typeof attachment.filename !== "string")) return null;
    return { ...value, estimateSource: value.estimateSource ?? null } as ActivityDetail;
  } catch {
    return null;
  }
}

function activitySummary(detail: ActivityDetail): ActivitySummary {
  const {
    id, taskId, course, title, dueAt, status, priority, estimatedMinutes, estimateSource,
    submissionTypes, source, isOverdue, urgency, hasGeneratedDraft,
  } = detail;
  return {
    id, taskId, course, title, dueAt, status, priority, estimatedMinutes, estimateSource,
    submissionTypes, source, isOverdue, urgency, hasGeneratedDraft,
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
  if (existing && compareInstants(summary.updatedAt, existing.cloud_updated_at) > 0) {
    await invalidateImages(db, ownerUserId, summary.id);
    await removeImageDirectory(ownerUserId, summary.id);
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
      if ('reviewer' in detail) await initializeImageManifest(db, ownerUserId, summary.id, summary.updatedAt);
      return "unchanged";
    }
  }
  if (existing && existing.payload_cloud_updated_at !== summary.updatedAt) {
    await invalidateImages(db, ownerUserId, summary.id);
    await removeImageDirectory(ownerUserId, summary.id);
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
  if ('reviewer' in detail) await initializeImageManifest(db, ownerUserId, summary.id, summary.updatedAt);
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
