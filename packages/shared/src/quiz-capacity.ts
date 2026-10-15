import type { QuizQuestionType } from './quiz';

/** The persisted Reviewer's topics and key points are the Quiz capacity source. */
export interface QuizCapacitySection {
  readonly title: string;
  readonly blocks: readonly {
    readonly title: string;
    readonly keyPoints: readonly string[];
    readonly explanation?: string;
    readonly evidence?: readonly { readonly text: string }[];
  }[];
}

export interface QuizCapacity {
  readonly topicCount: number;
  readonly keyPointCount: number;
  readonly duplicatesExcluded: number;
  readonly maximum: number;
  readonly matchingTermCount: number;
  readonly matchingMaximum: number;
}

const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = (text: string) => normalize(text).split(' ').filter(Boolean);

/** Matching-only requests use the validator's minimum block size. */
export const MATCHING_PAIRS_PER_ITEM = 3;

/**
 * Conservative term inventory from explicit labels and definition leads.
 * A title counts only when it also occurs in the body sent as a cited region.
 * Ordinary sentences are concepts for Mixed capacity, not extra Matching terms.
 */
export function quizMatchingTerms(sections: readonly QuizCapacitySection[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const section of sections) for (const block of section.blocks) {
    const texts = [block.explanation ?? '', ...block.keyPoints, ...(block.evidence ?? []).map(value => value.text)];
    const body = normalize(texts.join('\n'));
    const candidates = [section.title, block.title];
    for (const text of texts) for (const line of text.split(/\n|(?<=[.!?])\s+/)) {
      const lead = line.replace(/^\s*[-*]\s*/, '').match(/^(.{2,100}?)\s*(?::|\s+(?:is|are|means|refers to|consists of)\b)/i)?.[1];
      if (lead) candidates.push(lead);
    }
    for (const point of block.keyPoints) {
      if (words(point).length <= 5 && !/[.!?:]/.test(point) &&
        !/\b(?:is|are|has|have|can|should|must|uses?|provides?|protects?|allows?|helps?|ensures?)\b/i.test(point)) candidates.push(point);
    }
    for (const candidate of candidates) {
      const term = candidate.trim(), key = normalize(term);
      if (!meaningful(term, false) || term.length > 100 || words(term).length > 8 || !body.includes(key) || seen.has(key)) continue;
      seen.add(key); terms.push(term);
    }
  }
  return terms;
}

export function quizFormatMaximum(capacity: QuizCapacity, questionTypes?: readonly QuizQuestionType[]): number {
  return questionTypes?.length === 1 && questionTypes[0] === 'matching' ? capacity.matchingMaximum : capacity.maximum;
}

/** Ignore labels and fragments that cannot independently support a question. */
function meaningful(text: string, keyPoint: boolean): boolean {
  const tokens = words(text);
  if (!tokens.length) return false;
  if (!keyPoint) return tokens.join('').length >= 4 &&
    !/^(?:topic|section|chapter|part|unit|page|slide|lesson|overview|summary|introduction|key points|notes|definition|examples|advantages|disadvantages|fact|facts|conclusion|review|references|contents)(?: \d+)?$/.test(normalize(text));
  return tokens.length >= 3 && tokens.join('').length >= 12 ||
    tokens.length <= 2 && /[a-z][A-Z]|[A-Z]{2,}/.test(text) && tokens.join('').length >= 4;
}

/** Local, deterministic estimate: at most two distinct questions per concept. */
export function quizSourceCapacity(sections: readonly QuizCapacitySection[]): QuizCapacity {
  const seen = new Set<string>();
  let topicCount = 0, keyPointCount = 0, duplicatesExcluded = 0;
  const add = (text: string, keyPoint: boolean) => {
    if (!meaningful(text, keyPoint)) return;
    const key = normalize(text);
    if (seen.has(key)) { duplicatesExcluded++; return; }
    seen.add(key);
    if (keyPoint) keyPointCount++; else topicCount++;
  };
  for (const section of sections) {
    add(section.title, false);
    for (const block of section.blocks) {
      add(block.title, false);
      for (const point of block.keyPoints) add(point, true);
    }
  }
  const maximum = Math.min(100, 2 * (topicCount + keyPointCount));
  const matchingTermCount = quizMatchingTerms(sections).length;
  return { topicCount, keyPointCount, duplicatesExcluded, maximum, matchingTermCount,
    matchingMaximum: Math.min(maximum, Math.floor(matchingTermCount / MATCHING_PAIRS_PER_ITEM)) };
}

export function quizCountOptions(maximum: number): number[] {
  if (maximum < 5) return [];
  const standard = [10, 20, 30, 50, 100].filter(count => count <= maximum);
  return standard.includes(maximum) ? standard : [...standard, maximum].sort((a, b) => a - b);
}
