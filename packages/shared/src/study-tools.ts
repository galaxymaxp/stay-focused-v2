import type { AssistBlock } from './study-assist';

/**
 * Smart Selection learning tools: one request contract for every action a
 * student can take on text selected inside a Reviewer block. Results are
 * supplementary and never change the canonical Reviewer.
 */
export const STUDY_TOOLS_PROMPT_VERSION = 'study-tools-v1';
/** Fixed order; the interface never reorders these. */
export const STUDY_ACTIONS = ['define', 'explain', 'example', 'test', 'ask'] as const;
export type StudyAction = typeof STUDY_ACTIONS[number];
export const STUDY_ACTION_LABELS: Record<StudyAction, string> = {
  define: 'Define', explain: 'Explain', example: 'Example', test: 'Test Me', ask: 'Ask',
};
export const STUDY_ACTION_TITLES: Record<StudyAction, string> = {
  define: 'Define', explain: 'Explain', example: 'Example', test: 'Test Me', ask: 'Ask about this',
};
export const STUDY_MODIFIERS = {
  define: ['plain_words', 'in_context', 'key_traits', 'compare'],
  explain: ['simpler', 'deeper', 'analogy', 'why_it_matters'],
  example: ['real_world', 'step_by_step', 'another', 'counterexample'],
  /** `check` grades an attempt; `choices` converts the current question to multiple choice. */
  test: ['check', 'another', 'harder', 'apply', 'explain_answer', 'choices'],
  ask: [],
} as const satisfies Record<StudyAction, readonly string[]>;
export type StudyModifier = typeof STUDY_MODIFIERS[StudyAction][number];
/** Refinements offered after a result, in display order. */
export const STUDY_REFINEMENTS = {
  define: STUDY_MODIFIERS.define,
  explain: STUDY_MODIFIERS.explain,
  example: STUDY_MODIFIERS.example,
  test: ['another', 'harder', 'apply', 'explain_answer'],
  ask: [],
} as const satisfies { [A in StudyAction]: readonly (typeof STUDY_MODIFIERS)[A][number][] };
export const STUDY_MODIFIER_LABELS: Record<StudyModifier, string> = {
  plain_words: 'Plain words', in_context: 'In context', key_traits: 'Key traits', compare: 'Compare',
  simpler: 'Simpler', deeper: 'Deeper', analogy: 'Analogy', why_it_matters: 'Why it matters',
  real_world: 'Real world', step_by_step: 'Step-by-step', another: 'Another', counterexample: 'Counterexample',
  check: 'Check Answer', harder: 'Harder', apply: 'Apply it', explain_answer: 'Explain answer', choices: 'Need choices?',
};
/** Static suggestions; never generated. */
export const STUDY_ASK_SUGGESTIONS = ['Why does this matter?', 'How does this work?', 'What could I confuse this with?'] as const;

export const STUDY_LIMITS = {
  /** Characters of selected text after whitespace normalization. */
  selection: 2000,
  question: 1200,
  answer: 1200,
  /** A previous result echoed back for Another/Harder/refinements. */
  previous: 2400,
  /** Follow-ups after the first Ask question. */
  followUps: 2,
  /** Request body ceiling, enforced before parsing. */
  bodyBytes: 48 * 1024,
} as const;

export type StudyGrounding = 'source' | 'mixed' | 'general';
export const STUDY_GROUNDING_LABELS: Record<StudyGrounding, string> = {
  source: 'From your material', mixed: 'Source + general knowledge', general: 'General knowledge',
};
export const STUDY_GROUNDING_DETAILS: Record<StudyGrounding, string> = {
  source: 'This answer uses only your Reviewer and the course material it came from.',
  mixed: 'The course material mentions this concept but does not explain it fully. Some additional explanation was generated using general knowledge.',
  general: 'Your course material does not cover this enough to answer, so this explanation was generated using general knowledge. Check it against your lessons.',
};
export const STUDY_NO_COMPARISON = 'No closely related comparison is available from this material.';
export const STUDY_INSUFFICIENT_TEST = 'There isn’t enough course material around this selection to create a reliable question.';
export const STUDY_SELECTION_TOO_LARGE = 'Select a smaller part of the Reviewer to study.';
export const STUDY_QUESTION_TOO_LONG = 'Your question is too long. Shorten it to focus on what you want explained.';
export const STUDY_OFFLINE = 'You’re offline. Reconnect to use this learning tool.';

export interface StudyFollowUp { readonly question: string; readonly answer: string }
export interface StudyToolRequest {
  readonly reviewerId: string;
  readonly sectionId: string;
  readonly blockId: string;
  readonly contentHash: string;
  readonly promptVersion: string;
  readonly selection: string;
  readonly action: StudyAction;
  readonly modifier?: StudyModifier;
  /** Ask: the student's question. Test: the question being checked, explained or converted. */
  readonly question?: string;
  /** Test `check`: the student's attempt. */
  readonly answer?: string;
  /** The result being refined, so a variant is genuinely different. */
  readonly previous?: string;
  /** Ask only: earlier turns of this bounded mini-thread. */
  readonly followUps?: readonly StudyFollowUp[];
}
export type StudyOutcome = 'answer' | 'not_applicable' | 'question' | 'insufficient' | 'checked';
export type StudyVerdict = 'correct' | 'partial' | 'incorrect';
export interface StudyToolResult {
  readonly action: StudyAction;
  readonly modifier?: StudyModifier;
  readonly outcome: StudyOutcome;
  readonly grounding: StudyGrounding;
  /** Explanation, answer, feedback or truthful unavailable copy. Empty for a bare question. */
  readonly text: string;
  readonly question?: string;
  readonly choices?: readonly string[];
  readonly verdict?: StudyVerdict;
  readonly createdAt: string;
}

export function isStudyAction(value: unknown): value is StudyAction {
  return STUDY_ACTIONS.some(action => action === value);
}
export function isStudyModifier(action: StudyAction, value: unknown): value is StudyModifier {
  return (STUDY_MODIFIERS[action] as readonly string[]).some(modifier => modifier === value);
}

/**
 * The text a student selects from: one Reviewer block, laid out as it reads.
 * Client and server build it identically so a selection can be verified.
 */
export function studySurface(block: AssistBlock): string {
  const parts = [block.title.trim(), block.explanation.trim(),
    block.keyPoints.filter(point => point.trim()).map(point => `• ${point.trim()}`).join('\n'),
    ...block.evidence.map(evidence => evidence.text.trim())];
  return parts.filter(Boolean).join('\n\n');
}
/** Whitespace and bullet markers do not change what was selected. */
export function normalizeStudyText(text: string): string {
  return text.replace(/(^|\s)•(?=\s)/gu, ' ').replace(/\s+/gu, ' ').trim();
}
export type StudySelectionCheck = { ok: true; text: string } | { ok: false; reason: 'empty' | 'too_large' | 'outside' };
/** Bounds a selection and proves it came from this block's text. */
export function checkStudySelection(block: AssistBlock, selection: string): StudySelectionCheck {
  const text = normalizeStudyText(selection);
  if (!/[\p{L}\p{N}]/u.test(text)) return { ok: false, reason: 'empty' };
  if (text.length > STUDY_LIMITS.selection) return { ok: false, reason: 'too_large' };
  return normalizeStudyText(studySurface(block)).includes(text) ? { ok: true, text } : { ok: false, reason: 'outside' };
}
/** A bounded concept/key-point subject for Ask; the server already supplies block context. */
export function studyAskSubject(block: AssistBlock, pointIndex?: number): string {
  const candidates = [pointIndex === undefined ? block.explanation : block.keyPoints[pointIndex], block.title];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const check = checkStudySelection(block, candidate);
    if (check.ok) return check.text;
  }
  return '';
}
/** Same-session reuse key. Inputs that change the answer are part of it. */
export function studyCacheKey(request: StudyToolRequest): string {
  return JSON.stringify([request.reviewerId, request.blockId, request.contentHash, normalizeStudyText(request.selection), request.action,
    request.modifier ?? '', request.question ?? '', request.answer ?? '', request.followUps ?? []]);
}
/** Variants whose purpose is novelty are never reused. */
export function studyReusable(request: StudyToolRequest): boolean {
  return request.modifier !== 'another' && request.modifier !== 'harder' && request.modifier !== 'apply' && !(request.action === 'test' && !request.modifier);
}
export function validStudyText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value);
}
const outcomes: readonly StudyOutcome[] = ['answer', 'not_applicable', 'question', 'insufficient', 'checked'];
const groundings: readonly StudyGrounding[] = ['source', 'mixed', 'general'];
export function isStudyToolResult(value: unknown, request: StudyToolRequest): value is StudyToolResult {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.action === request.action && row.modifier === request.modifier
    && outcomes.includes(row.outcome as StudyOutcome) && groundings.includes(row.grounding as StudyGrounding)
    && typeof row.text === 'string' && row.text.length <= 4000
    && (row.question === undefined || validStudyText(row.question, 800))
    && (row.choices === undefined || (Array.isArray(row.choices) && row.choices.every(choice => validStudyText(choice, 300))))
    && (row.verdict === undefined || ['correct', 'partial', 'incorrect'].includes(row.verdict as string))
    && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt));
}
