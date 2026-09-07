import { filterReviewableText, isInstructionalNoiseText, reviewableSourceBlocks } from './review-content.js';
import { isLocallyExplanatoryText } from './reviewer-section-support.js';
import type { NormalizedSourceBlock, PlannedSection } from './types.js';

/** Explanations receive local prose units, never the deterministically retained payload. */
export function explanationEvidenceFor(section: PlannedSection, blocks: readonly NormalizedSourceBlock[]): readonly {blockId: string; text: string}[] {
  const seen = new Set<string>();
  return reviewableSourceBlocks(blocks).flatMap(block => {
    if (!section.sourceBlockIds.includes(block.id) || ['heading','image','code','table','formula'].includes(block.kind)) return [];
    return filterReviewableText(block.text, {block}).split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/u).flatMap(line => {
      const text = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/u, '').trim();
      if (!isLocallyExplanatoryText(text) || text.includes('|') ||
          /^(?:remember\b|take note\b|keep in mind\b|now let us\b|before discussing\b|look for\b|based on\b.*\bwrite\b)/i.test(text) ||
          isInstructionalNoiseText(text, {explanationField: true}) ||
          /^(?:example|sample|steps?|syntax)\s*:/i.test(text)) return [];
      const key = text.replace(/\s+/gu, ' ');
      if (seen.has(key)) return [];
      seen.add(key);
      return [{blockId: block.id, text}];
    });
  });
}
