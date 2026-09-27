import type { ReviewerReaderModel } from './experience';

/** Separate from every canonical artifact and generation DTO. */
export const ASSIST_PROMPT_VERSION = 'study-assist-v1';
export const ASSIST_TYPES = ['summarize', 'explain_simply', 'analogy', 'example'] as const;
export type AssistType = typeof ASSIST_TYPES[number];
export const ASSIST_LABELS: Record<AssistType, string> = {
  summarize: 'Summarize', explain_simply: 'Explain simply', analogy: 'Analogy', example: 'Example',
};
export const ASSIST_RESULT_LABELS: Record<AssistType, string> = {
  summarize: 'AI summary', explain_simply: 'AI explanation', analogy: 'AI analogy', example: 'AI example',
};
export type AssistBlock = ReviewerReaderModel['sections'][number]['blocks'][number];
export interface AssistSelection {
  readonly reviewerId: string;
  readonly sectionId: string;
  readonly blockId: string;
  readonly contentHash: string;
  /** Exact context also guards cache reads against fingerprint collisions. Never sent by the client. */
  readonly canonicalContent: string;
  readonly block: AssistBlock;
}
export interface AssistRequest {
  readonly reviewerId: string;
  readonly sectionId: string;
  readonly blockId: string;
  readonly contentHash: string;
  readonly assistType: AssistType;
  readonly promptVersion: string;
}
export interface AssistResult extends AssistRequest {
  readonly text: string;
  readonly createdAt: string;
}
export function isAssistType(value: unknown): value is AssistType {
  return ASSIST_TYPES.some(type => type === value);
}
/** Non-cryptographic content fingerprint, never an authorization token. */
export function assistContentHash(text: string): string {
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ text.charCodeAt(i), 0x85ebca6b);
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`;
}
export function selectAssistBlock(reviewer: ReviewerReaderModel, sectionId: string, blockId: string): AssistSelection | null {
  const section = reviewer.sections.find(section => section.id === sectionId);
  const block = section?.blocks.find(block => block.id === blockId);
  if (!section || !block || (!block.explanation.trim() && !block.keyPoints.some(point => point.trim()))) return null;
  // Explicit projection: assistance or future unrelated DTO fields cannot enter this context.
  const canonicalContent = JSON.stringify({ title: reviewer.title, generatedAt: reviewer.generatedAt,
    source: reviewer.source, section: section.title, block: { title: block.title,
      explanation: block.explanation, keyPoints: block.keyPoints, evidence: block.evidence } });
  return { reviewerId: reviewer.id, sectionId, blockId, block, canonicalContent, contentHash: assistContentHash(canonicalContent) };
}
export function assistRequest(selection: AssistSelection, assistType: AssistType, promptVersion = ASSIST_PROMPT_VERSION): AssistRequest {
  return { reviewerId: selection.reviewerId, sectionId: selection.sectionId, blockId: selection.blockId,
    contentHash: selection.contentHash, assistType, promptVersion };
}
export function assistCacheKey(request: AssistRequest): string {
  return JSON.stringify([request.reviewerId, request.sectionId, request.blockId, request.assistType, request.contentHash, request.promptVersion]);
}
export function validAssistText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 2400 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value);
}
export function isAssistResult(value: unknown, request: AssistRequest): value is AssistResult {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return Object.entries(request).every(([key, expected]) => row[key] === expected)
    && validAssistText(row.text) && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt));
}
