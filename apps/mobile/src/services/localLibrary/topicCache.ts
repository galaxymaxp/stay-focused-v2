import { isTopicResult, topicCacheKey, type TopicAction, type TopicResult, type TopicSelection } from '@stay-focused/shared';
import type { LocalSqlDatabase } from './sqlDatabase';

export interface TopicCache {
  readTopic(owner: string, selection: TopicSelection, action: TopicAction): Promise<TopicResult | null>;
  writeTopic(owner: string, selection: TopicSelection, result: TopicResult): Promise<void>;
}
/** Same owner/reviewer lifecycle as block assists; disjoint versioned keys, no schema change. */
export function createTopicCache(db: LocalSqlDatabase): TopicCache {
  return {
    async readTopic(owner, selection, action) {
      if (!owner) return null;
      const row = await db.getFirstAsync<{ canonical_content: string; result_json: string }>(
        'SELECT canonical_content, result_json FROM study_assists WHERE owner_user_id = ? AND cache_key = ?', [owner, topicCacheKey(selection, action)]);
      if (!row || row.canonical_content !== selection.canonicalContent) return null;
      try { const value: unknown = JSON.parse(row.result_json); return isTopicResult(value, selection, action) ? value : null; }
      catch { return null; }
    },
    async writeTopic(owner, selection, result) {
      if (!owner || !isTopicResult(result, selection, result.action)) throw new Error('invalid_topic');
      await db.runAsync(`INSERT OR REPLACE INTO study_assists
        (owner_user_id, cache_key, reviewer_id, canonical_content, result_json)
        SELECT ?, ?, ?, ?, ? WHERE EXISTS
          (SELECT 1 FROM library_artifacts WHERE owner_user_id = ? AND artifact_id = ?)`,
      [owner, topicCacheKey(selection, result.action), selection.reviewerId, selection.canonicalContent, JSON.stringify(result), owner, selection.reviewerId]);
      if (!await this.readTopic(owner, selection, result.action)) throw new Error('This explanation could not be saved. Save the Reviewer on this device and try again.');
    },
  };
}
