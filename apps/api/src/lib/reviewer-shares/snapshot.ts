import { ASSIST_PROMPT_VERSION, isAssistResult, isAssistType, selectAssistBlock, validAssistPointIndex, type ReviewerReaderModel, type ReviewerShareSnapshot, type SharedQuiz, type SharedVisual } from '@stay-focused/shared';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';

function fail(): never { throw new ExperienceFailure(400, 'invalid_request'); }
function str(value: unknown, max = 100000): string {
  if (typeof value !== 'string' || value.length > max) fail();
  return value;
}
function list(value: unknown, max = 2000): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail();
  return value;
}
const strings = (value: unknown) => list(value).map(v => str(v));
function index(value: unknown, length: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value >= length) fail();
  return value;
}
function url(value: unknown, kind: 'image' | 'source' | 'license') {
  const raw = str(value, 3000);
  const parsed = new URL(raw);
  const allowed = kind === 'image' ? parsed.hostname === 'upload.wikimedia.org' : kind === 'source'
    ? parsed.hostname === 'commons.wikimedia.org' && parsed.pathname.startsWith('/wiki/File:')
    : ['creativecommons.org', 'commons.wikimedia.org'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !allowed) fail();
  return raw;
}
/** Reproject on public read too: an extra field in storage never becomes public. */
export function projectShareSnapshot(value: unknown): ReviewerShareSnapshot {
  const root = record(value);
  if (root.schemaVersion !== 1) fail();
  const sections = list(root.sections).map(value => {
    const s = record(value);
    return { title: str(s.title), citations: list(s.citations).map(value => {
      const label = str(value, 40); if (!/^From (page|slide) [1-9]\d{0,2}$/.test(label)) fail(); return label;
    }), blocks: list(s.blocks).map(value => {
      const b = record(value);
      const explanation = str(b.explanation), keyPoints = strings(b.keyPoints);
      return { title: str(b.title), explanation, keyPoints,
        emphasis: list(b.emphasis ?? []).map(value => {
          const m = record(value);
          if (m.target !== 'explanation' && m.target !== 'key_point') fail();
          if (m.style !== 'bold' && m.style !== 'underline' && m.style !== 'highlight') fail();
          const i = index(m.index, m.target === 'explanation' ? 1 : keyPoints.length), text = str(m.text);
          if (!(m.target === 'explanation' ? explanation : keyPoints[i]!).includes(text)) fail();
          return { target: m.target as 'explanation' | 'key_point', index: i, text, style: m.style as 'bold' | 'underline' | 'highlight' };
        }),
        evidence: list(b.evidence).map(value => {
          const e = record(value);
          if (!['code', 'formula', 'table', 'result', 'example', 'source'].includes(String(e.kind))) fail();
          return { kind: e.kind as ReviewerReaderModel['sections'][number]['blocks'][number]['evidence'][number]['kind'], text: str(e.text) };
        }) };
    }) };
  });
  const quizzes: SharedQuiz[] = list(root.quizzes, 100).map(value => {
    const q = record(value);
    const questions: SharedQuiz['questions'] = list(q.questions, 100).map(value => {
      const item = record(value);
      if (!['single_select', 'multi_select', 'true_false', 'identification', 'modified_true_false', 'matching'].includes(String(item.type))
        || !['easy', 'medium', 'hard'].includes(String(item.difficulty))) fail();
      return { id: str(item.id, 220), type: item.type as SharedQuiz['questions'][number]['type'], prompt: str(item.prompt),
        difficulty: item.difficulty as 'easy' | 'medium' | 'hard', selectionInstruction: str(item.selectionInstruction),
        options: list(item.options, 100).map(value => { const o = record(value); return { id: str(o.id, 220), text: str(o.text) }; }),
        ...(item.leftItem === undefined ? {} : { leftItem: str(item.leftItem) }),
        ...(item.matchingPairs === undefined ? {} : { matchingPairs: list(item.matchingPairs, 100).map(value => {
          const p = record(value); return { id: str(p.id, 220), leftItem: str(p.leftItem) };
        }) }) };
    });
    const keys = list(q.keys, 100).map(value => {
      const k = record(value);
      return { id: str(k.id, 220), correctOptionIds: strings(k.correctOptionIds), explanation: str(k.explanation),
        ...(k.acceptedAnswers === undefined ? {} : { acceptedAnswers: strings(k.acceptedAnswers) }) };
    });
    if (!questions.length || keys.length !== questions.length || new Set(questions.map(q => q.id)).size !== questions.length
      || questions.some(q => keys.filter(k => k.id === q.id && k.correctOptionIds.length).length !== 1)) fail();
    return { title: str(q.title), questions, keys };
  });
  const assists = list(root.assists, 2000).map(value => {
    const a = record(value), section = index(a.section, sections.length), block = index(a.block, sections[section]!.blocks.length);
    if (!isAssistType(a.type)) fail();
    return { section, block, type: a.type, text: str(a.text, 2400),
      ...(a.point === undefined ? {} : { point: index(a.point, sections[section]!.blocks[block]!.keyPoints.length) }) };
  });
  const visuals: SharedVisual[] = list(root.visuals).map(value => {
    const v = record(value);
    if (!['Public domain', 'CC0', 'CC BY', 'CC BY-SA'].includes(String(v.license))) fail();
    return { section: index(v.section, sections.length), image: url(v.image, 'image'), title: str(v.title, 500), credit: str(v.credit, 2000),
      license: str(v.license, 40), licenseUrl: url(v.licenseUrl, 'license'), sourceUrl: url(v.sourceUrl, 'source') };
  });
  return { schemaVersion: 1, title: str(root.title), sections, keyTerms: strings(root.keyTerms), quizzes, assists, visuals };
}

/** Input assistance is owner-local cached content; match its exact current block. */
export function buildShareSnapshot(input: {
  reviewer: ReviewerReaderModel; citations: readonly (readonly string[])[]; quizzes: readonly SharedQuiz[];
  assists: unknown; visuals: readonly SharedVisual[];
}): ReviewerShareSnapshot {
  const { reviewer } = input;
  const assists = list(input.assists ?? [], 2000).map(value => {
    const a = record(value);
    const si = reviewer.sections.findIndex(s => s.id === a.sectionId), section = reviewer.sections[si];
    const bi = section?.blocks.findIndex(b => b.id === a.blockId) ?? -1;
    const selection = si >= 0 && bi >= 0 ? selectAssistBlock(reviewer, section!.id, section!.blocks[bi]!.id) : null;
    if (!selection || !isAssistType(a.assistType) || (a.pointIndex !== undefined && !validAssistPointIndex(a.pointIndex, selection.block))) fail();
    // Retained plain-text assistance and current formatted assistance share the
    // same exact-content validation. Never accept arbitrary future versions.
    if (a.promptVersion !== ASSIST_PROMPT_VERSION && a.promptVersion !== 'study-assist-v1') fail();
    const request = { reviewerId: selection.reviewerId, sectionId: selection.sectionId, blockId: selection.blockId,
      contentHash: selection.contentHash, assistType: a.assistType, promptVersion: a.promptVersion,
      ...(a.pointIndex === undefined ? {} : { pointIndex: a.pointIndex as number }) };
    if (!isAssistResult(a, request)) fail();
    return { section: si, block: bi, type: a.assistType, text: a.text,
      ...(a.pointIndex === undefined ? {} : { point: a.pointIndex }) };
  });
  // No spread of owner/source DTOs. Even IDs are omitted from the reader body.
  return projectShareSnapshot({ schemaVersion: 1, title: reviewer.title,
    sections: reviewer.sections.map((s, i) => ({ title: s.title, citations: input.citations[i] ?? [],
      blocks: s.blocks.map(b => ({ title: b.title, explanation: b.explanation, keyPoints: b.keyPoints, emphasis: b.emphasis ?? [], evidence: b.evidence })) })),
    keyTerms: [...new Set(reviewer.sections.flatMap(s => s.blocks.map(b => b.title)).filter(Boolean))],
    quizzes: input.quizzes, assists, visuals: input.visuals });
}
