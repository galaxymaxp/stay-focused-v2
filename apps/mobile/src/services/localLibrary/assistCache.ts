import { assistCacheKey, isAssistResult, type AssistRequest, type AssistResult } from '@stay-focused/shared';
import type { LocalSqlDatabase } from './sqlDatabase';

export interface AssistCache {
  readAssist(owner: string, request: AssistRequest, canonicalContent: string): Promise<AssistResult | null>;
  writeAssist(owner: string, result: AssistResult, canonicalContent: string): Promise<void>;
}
export function createAssistCache(db: LocalSqlDatabase): AssistCache {
  return {
    async readAssist(owner, request, canonicalContent) {
      if (!owner) throw new Error('owner_required');
      const key = assistCacheKey(request);
      const row = await db.getFirstAsync<{ canonical_content: string; result_json: string }>(
        'SELECT canonical_content, result_json FROM study_assists WHERE owner_user_id = ? AND cache_key = ?', [owner, key]);
      if (!row) return null;
      try {
        const value: unknown = JSON.parse(row.result_json);
        if (row.canonical_content === canonicalContent && isAssistResult(value, request)) return value;
      } catch { /* A corrupt entry is a cache miss; canonical rows are untouched. */ }
      await db.runAsync('DELETE FROM study_assists WHERE owner_user_id = ? AND cache_key = ?', [owner, key]);
      return null;
    },
    async writeAssist(owner, result, canonicalContent) {
      if (!owner || !isAssistResult(result, result)) throw new Error('invalid_assist');
      // Owner/reviewer existence prevents a pending request repopulating a deleted or signed-out Library.
      await db.runAsync(`INSERT OR REPLACE INTO study_assists
        (owner_user_id, cache_key, reviewer_id, canonical_content, result_json)
        SELECT ?, ?, ?, ?, ? WHERE EXISTS
          (SELECT 1 FROM library_artifacts WHERE owner_user_id = ? AND artifact_id = ?)`,
      [owner, assistCacheKey(result), result.reviewerId, canonicalContent, JSON.stringify(result), owner, result.reviewerId]);
      const saved = await this.readAssist(owner, result, canonicalContent);
      if (!saved) throw new Error('assist_not_saved');
    },
  };
}
