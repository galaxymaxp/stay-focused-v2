export const REVIEWER_WORDS_PER_MINUTE = 200;
export const REVIEWER_RECALL_SECONDS_PER_KEY_POINT = 15;
export const REVIEWER_ORIENTATION_MINUTES_PER_SECTION = 1;
export const REVIEWER_MINUTE_INCREMENT = 5;
export const REVIEWER_MINIMUM_MINUTES = 5;

export interface ReviewerEstimate {
  readonly minutes: number;
  readonly basis: { readonly words: number; readonly keyPoints: number; readonly sections: number };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function words(text: string): number {
  return text.trim().match(/\S+/gu)?.length ?? 0;
}

/** Estimate the saved reviewer body (wrapped or bare), excluding titles and metadata. */
export function estimateReviewerMinutes(payload: unknown): ReviewerEstimate | null {
  try {
    const root = record(payload);
    const reviewer = root && ('reviewer' in root ? record(root.reviewer) : root);
    if (!reviewer || !Array.isArray(reviewer.sections) || !reviewer.sections.length) return null;
    let wordCount = 0;
    let keyPoints = 0;
    for (const value of reviewer.sections) {
      const section = record(value);
      if (!section || !Array.isArray(section.items)) return null;
      for (const value of section.items) {
        const item = record(value);
        const core = item && record(item.sourceCore);
        if (!item || !core || typeof core.explanation !== 'string' || !Array.isArray(core.keyPoints)) return null;
        wordCount += words(core.explanation);
        for (const point of core.keyPoints) {
          if (typeof point !== 'string') return null;
          wordCount += words(point);
          if (point.trim()) keyPoints += 1;
        }
        // Evidence contains the persisted item text shown alongside explanation/recall prose.
        if (core.evidence !== undefined) {
          if (!Array.isArray(core.evidence)) return null;
          for (const value of core.evidence) {
            const evidence = record(value);
            if (!evidence || typeof evidence.text !== 'string') return null;
            wordCount += words(evidence.text);
          }
        }
        if (item.text !== undefined) {
          if (typeof item.text !== 'string') return null;
          wordCount += words(item.text);
        }
      }
    }
    if (wordCount === 0) return null;
    const sections = reviewer.sections.length;
    const rawMinutes = wordCount / REVIEWER_WORDS_PER_MINUTE
      + keyPoints * REVIEWER_RECALL_SECONDS_PER_KEY_POINT / 60
      + sections * REVIEWER_ORIENTATION_MINUTES_PER_SECTION;
    const minutes = Math.max(REVIEWER_MINIMUM_MINUTES,
      Math.ceil(rawMinutes / REVIEWER_MINUTE_INCREMENT) * REVIEWER_MINUTE_INCREMENT);
    return { minutes, basis: { words: wordCount, keyPoints, sections } };
  } catch {
    // Malformed unknown input must never prevent a Library read.
    return null;
  }
}
