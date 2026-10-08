// Mirrors apps/mobile/src/features/reviewer/reviewerNavigation.ts so web and app present data identically.
import type { ReviewerReaderModel } from "@stay-focused/shared";

/**
 * Local navigation over an already-persisted Reviewer. Search and the section
 * scrubber read exactly the text the reader renders; nothing is sent to a
 * server and nothing is derived beyond the Reviewer's own sections and blocks.
 */
export type ReviewerSegmentKind = "section_title" | "block_title" | "explanation" | "key_point" | "evidence";

export interface ReviewerSegment {
  /** Stable within one Reviewer: used as the render key and the jump target. */
  readonly id: string;
  readonly kind: ReviewerSegmentKind;
  readonly sectionIndex: number;
  readonly text: string;
}

export interface ReviewerAnchor {
  readonly id: string;
  readonly title: string;
  readonly sectionIndex: number;
}

export interface ReviewerMatch {
  readonly segmentId: string;
  readonly sectionIndex: number;
  readonly start: number;
  readonly end: number;
}

export function normalizedHeading(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function isDuplicateBlockTitle(sectionTitle: string, blockTitle: string): boolean {
  return normalizedHeading(sectionTitle) === normalizedHeading(blockTitle);
}

export const segmentIds = {
  sectionTitle: (sectionId: string) => `${sectionId}:title`,
  blockTitle: (blockId: string) => `${blockId}:title`,
  explanation: (blockId: string) => `${blockId}:explanation`,
  keyPoint: (blockId: string, index: number) => `${blockId}:point:${index}`,
  evidence: (blockId: string, index: number) => `${blockId}:evidence:${index}`,
};

/** Every piece of text the reader shows, in reading order. */
export function reviewerSegments(reviewer: Pick<ReviewerReaderModel, "sections">): ReviewerSegment[] {
  const segments: ReviewerSegment[] = [];
  reviewer.sections.forEach((section, sectionIndex) => {
    segments.push({ id: segmentIds.sectionTitle(section.id), kind: "section_title", sectionIndex, text: section.title });
    for (const block of section.blocks) {
      if (!isDuplicateBlockTitle(section.title, block.title)) {
        segments.push({ id: segmentIds.blockTitle(block.id), kind: "block_title", sectionIndex, text: block.title });
      }
      segments.push({ id: segmentIds.explanation(block.id), kind: "explanation", sectionIndex, text: block.explanation });
      block.keyPoints.forEach((point, index) =>
        segments.push({ id: segmentIds.keyPoint(block.id, index), kind: "key_point", sectionIndex, text: point }),
      );
      block.evidence.forEach((evidence, index) =>
        segments.push({ id: segmentIds.evidence(block.id, index), kind: "evidence", sectionIndex, text: evidence.text }),
      );
    }
  });
  return segments;
}

/**
 * Case- and accent-insensitive folding that remembers, for every folded code
 * unit, which original index produced it, so highlights land on the exact
 * characters the student sees.
 */
function fold(value: string): { text: string; origin: number[] } {
  let text = "";
  const origin: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const folded = value[index]!.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (let unit = 0; unit < folded.length; unit += 1) {
      text += folded[unit];
      origin.push(index);
    }
  }
  return { text, origin };
}

export const MIN_QUERY_LENGTH = 2;

export function findReviewerMatches(segments: readonly ReviewerSegment[], rawQuery: string): ReviewerMatch[] {
  const query = fold(rawQuery.replace(/\s+/g, " ").trim()).text;
  if (query.length < MIN_QUERY_LENGTH) return [];
  const matches: ReviewerMatch[] = [];
  for (const segment of segments) {
    const folded = fold(segment.text);
    let from = 0;
    for (;;) {
      const at = folded.text.indexOf(query, from);
      if (at < 0) break;
      const start = folded.origin[at]!;
      const end = folded.origin[at + query.length - 1]! + 1;
      matches.push({ segmentId: segment.id, sectionIndex: segment.sectionIndex, start, end });
      from = at + query.length;
    }
  }
  return matches;
}

export type HighlightRun = { readonly text: string; readonly kind: "plain" | "match" | "active" };

/**
 * Splits one segment's text into plain and highlighted runs. `activeIndex` is
 * the position, within this segment's matches, of the currently selected match.
 */
export function highlightRuns(
  text: string,
  matches: readonly Pick<ReviewerMatch, "start" | "end">[],
  activeIndex: number | null,
): HighlightRun[] {
  if (matches.length === 0) return [{ text, kind: "plain" }];
  const runs: HighlightRun[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    if (match.start > cursor) runs.push({ text: text.slice(cursor, match.start), kind: "plain" });
    runs.push({ text: text.slice(match.start, match.end), kind: index === activeIndex ? "active" : "match" });
    cursor = match.end;
  });
  if (cursor < text.length) runs.push({ text: text.slice(cursor), kind: "plain" });
  return runs;
}

/**
 * Scrubber anchors are the Reviewer's own topics. A Reviewer with a single
 * topic falls back to its block headings; with fewer than two anchors the
 * scrubber uses proportional document position instead.
 */
export function reviewerAnchors(reviewer: Pick<ReviewerReaderModel, "sections">): ReviewerAnchor[] {
  if (reviewer.sections.length >= 2) {
    return reviewer.sections.map((section, sectionIndex) => ({ id: section.id, title: section.title, sectionIndex }));
  }
  const section = reviewer.sections[0];
  if (!section) return [];
  const blocks = section.blocks
    .filter((block) => !isDuplicateBlockTitle(section.title, block.title))
    .map((block) => ({ id: block.id, title: block.title, sectionIndex: 0 }));
  return blocks.length >= 2 ? blocks : [];
}

/** Maps a finger position along the scrubber track to an anchor index. */
export function anchorIndexForFraction(fraction: number, count: number): number {
  if (count <= 0) return -1;
  const clamped = Math.min(Math.max(fraction, 0), 0.999999);
  return Math.floor(clamped * count);
}

/** The anchor whose top has been reached at this scroll position. */
export function currentAnchorIndex(anchorOffsets: readonly number[], scrollY: number, lead = 96): number {
  let current = -1;
  for (let index = 0; index < anchorOffsets.length; index += 1) {
    if (anchorOffsets[index]! <= scrollY + lead) current = index;
    else break;
  }
  return current;
}

/** Proportional fallback: finger fraction → content offset. */
export function proportionalOffset(fraction: number, contentHeight: number, viewportHeight: number): number {
  const scrollable = Math.max(0, contentHeight - viewportHeight);
  return Math.round(Math.min(Math.max(fraction, 0), 1) * scrollable);
}
