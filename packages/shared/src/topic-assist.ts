import { assistContentHash } from './study-assist';
import type { ReviewerReaderModel } from './experience';
import { STUDY_OFFLINE } from './study-tools';

export const TOPIC_PROMPT_VERSION = 'study-topic-v1';
export const TOPIC_ACTIONS = ['topic_simplify', 'topic_explain_simply', 'topic_expound'] as const;
export type TopicAction = typeof TOPIC_ACTIONS[number];
export type TopicLevel = 'original' | 'simplify' | 'explain_simply';
export const TOPIC_LEVELS = ['original', 'simplify', 'explain_simply'] as const;
export const TOPIC_LABELS: Record<TopicLevel, string> = { original: 'Original', simplify: 'Simplify', explain_simply: 'Explain simply' };
export const topicLevelAction = (level: TopicLevel): TopicAction | null => level === 'original' ? null : `topic_${level}`;
export interface TopicRequest { readonly reviewerId: string; readonly sectionId: string; readonly action: TopicAction }
export interface TopicSelection {
  readonly reviewerId: string; readonly sectionId: string; readonly canonicalContent: string; readonly contentHash: string;
}
export interface TopicResult extends TopicRequest {
  readonly contentHash: string; readonly promptVersion: typeof TOPIC_PROMPT_VERSION;
  readonly text: string; readonly grounding: 'source'; readonly createdAt: string;
}
export function selectTopic(reviewer: ReviewerReaderModel, sectionId: string): TopicSelection | null {
  const section = reviewer.sections.find(s => s.id === sectionId);
  if (!section || !section.blocks.length) return null;
  const canonicalContent = JSON.stringify({ title: section.title, blocks: section.blocks.map(b => ({
    title: b.title, explanation: b.explanation, keyPoints: b.keyPoints, evidence: b.evidence.map(e => ({ kind: e.kind, text: e.text })),
  })) });
  return { reviewerId: reviewer.id, sectionId, canonicalContent, contentHash: assistContentHash(canonicalContent) };
}
export const topicCacheKey = (selection: TopicSelection, action: TopicAction) =>
  JSON.stringify([selection.reviewerId, selection.sectionId, selection.contentHash, action, TOPIC_PROMPT_VERSION]);
export function isTopicResult(value: unknown, selection: TopicSelection, action: TopicAction): value is TopicResult {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.reviewerId === selection.reviewerId && row.sectionId === selection.sectionId && row.action === action
    && row.contentHash === selection.contentHash && row.promptVersion === TOPIC_PROMPT_VERSION && row.grounding === 'source'
    && typeof row.text === 'string' && row.text.trim().length > 0 && row.text.length <= 6000
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(row.text)
    && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt));
}
/** Shared client cache policy. Original has no network action; failures never poison retries. */
export function createTopicAssist<Client>(dependencies: {
  read: (owner: string, selection: TopicSelection, action: TopicAction) => Promise<unknown>;
  write: (owner: string, selection: TopicSelection, result: TopicResult) => Promise<void>;
  generate: (client: Client, request: TopicRequest) => Promise<unknown>;
}) {
  const pending = new Map<string, Promise<TopicResult>>();
  return {
    async peek(owner: string, selection: TopicSelection, action: TopicAction): Promise<TopicResult | null> {
      if (!owner) return null;
      try { const result = await dependencies.read(owner, selection, action); return isTopicResult(result, selection, action) ? result : null; }
      catch { return null; }
    },
    run(owner: string, client: Client, selection: TopicSelection, action: TopicAction, online: boolean): Promise<TopicResult> {
      const key = JSON.stringify([owner, topicCacheKey(selection, action), selection.canonicalContent]);
      const existing = pending.get(key);
      if (existing) return existing;
      const work = (async () => {
        if (!owner) throw new Error('Please sign in again.');
        const cached = await this.peek(owner, selection, action);
        if (cached) return cached;
        if (!online) throw new Error(STUDY_OFFLINE);
        const result = await dependencies.generate(client, { reviewerId: selection.reviewerId, sectionId: selection.sectionId, action });
        if (!isTopicResult(result, selection, action)) throw new Error('This topic changed or its explanation could not be read. Reopen the Reviewer and try again.');
        await dependencies.write(owner, selection, result);
        return result;
      })().finally(() => pending.delete(key));
      pending.set(key, work);
      return work;
    },
  };
}
