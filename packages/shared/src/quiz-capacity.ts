/** The persisted Reviewer's topics and key points are the Quiz capacity source. */
export interface QuizCapacitySection {
  readonly title: string;
  readonly blocks: readonly {
    readonly title: string;
    readonly keyPoints: readonly string[];
  }[];
}

export interface QuizCapacity {
  readonly topicCount: number;
  readonly keyPointCount: number;
  readonly duplicatesExcluded: number;
  readonly maximum: number;
}

const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = (text: string) => normalize(text).split(' ').filter(Boolean);

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
  return { topicCount, keyPointCount, duplicatesExcluded, maximum: Math.min(100, 2 * (topicCount + keyPointCount)) };
}

export function quizCountOptions(maximum: number): number[] {
  if (maximum < 5) return [];
  const standard = [10, 20, 30, 50, 100].filter(count => count <= maximum);
  return standard.includes(maximum) ? standard : [...standard, maximum].sort((a, b) => a - b);
}
