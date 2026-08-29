import type {
  ReviewerMetadata,
  ReviewerOutput,
  ReviewerSection,
} from "@stay-focused/engine";

import type { SavedReviewerSourceMode } from "../../services/reviewerLibraryApi";

/**
 * Student-facing presentation for the Reviewer Reader.
 *
 * The Reader is presentation-only. Nothing here rewrites, reorders, or
 * summarises generated reviewer content: section order, item order, and
 * key-point order are always the order the engine returned. The only content
 * the Reader withholds is an explanation that is an exact duplicate of text
 * already rendered next to it, which removes visible repetition without
 * removing information.
 *
 * Metadata is only surfaced when it genuinely exists. Grounding is reported in
 * student language derived from `groundingStatus`; the numeric grounding and
 * coverage scores are evaluation data and are deliberately not shown, because
 * `Grounding: 1.00` reads as a correctness guarantee the system does not make.
 * A reviewer whose payload carries no recognisable grounding status - a legacy
 * or partially stored saved reviewer - reports no status at all rather than a
 * manufactured one.
 */

export type ReviewerReaderSourceMode = SavedReviewerSourceMode;

/**
 * Optional surrounding context. Every field is supplied by the calling screen
 * from data it actually holds, so the Reader can stay identical for a freshly
 * generated reviewer and a saved reviewer reopened from Study Library.
 */
export interface ReviewerReaderContext {
  readonly courseName?: string | null;
  readonly sourceLabel?: string | null;
  readonly sourceMode?: ReviewerReaderSourceMode | null;
  readonly selectedBlockCount?: number | null;
}

export type ReviewerGroundingTone = "grounded" | "limited";

export interface ReviewerGroundingPresentation {
  readonly label: string;
  readonly detail: string;
  readonly tone: ReviewerGroundingTone;
}

export interface ReviewerReaderBlock {
  readonly id: string;
  /** Item heading, or null when it would only repeat the section heading. */
  readonly heading: string | null;
  readonly explanation: string | null;
  readonly keyPoints: readonly string[];
  /**
   * The `Key points` label only earns its place when there is prose beside the
   * list to tell it apart from. A section whose whole body is its key points
   * reads as a handout without being labelled.
   */
  readonly showKeyPointsLabel: boolean;
  /** Honest fallback copy when the item carried no readable study content. */
  readonly emptyMessage: string | null;
}

export interface ReviewerReaderSection {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly blocks: readonly ReviewerReaderBlock[];
  readonly notice: string | null;
  readonly emptyMessage: string | null;
}

const UNTITLED_REVIEWER = "Untitled reviewer";
const UNTITLED_SECTION = "Untitled section";
const EMPTY_SECTION_MESSAGE = "This section returned no study content.";
const EMPTY_BLOCK_MESSAGE = "No study content was returned here.";
const EMPTY_REVIEWER_MESSAGE =
  "This reviewer returned no sections, so there is nothing to study yet.";

const GROUNDING_STATUSES = ["passed", "failed"] as const;

export function readerReviewerTitle(reviewer: ReviewerOutput): string {
  return withFallback(reviewer.title, UNTITLED_REVIEWER);
}

export function readerEmptyMessage(): string {
  return EMPTY_REVIEWER_MESSAGE;
}

/**
 * One compact line identifying where the reviewer came from, e.g.
 * `IT Security - Module 1 slides - Canvas`. Parts that repeat one another or
 * that the caller does not have are dropped rather than padded out.
 */
export function describeReviewerSource(
  reviewer: ReviewerOutput,
  context?: ReviewerReaderContext,
): string | null {
  const course = trim(context?.courseName);
  const sourceName =
    trim(context?.sourceLabel) || trim(reviewer.metadata.sourceTitle);
  const kind =
    describeReviewerSourceMode(context?.sourceMode) ??
    describeSourceKind(reviewer.metadata.sourceKind);

  const parts: string[] = [];
  for (const part of [course, sourceName, kind]) {
    if (!part) continue;
    if (parts.some((existing) => sameText(existing, part))) continue;
    parts.push(part);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * How much material this reviewer covers. The selected-block count appears only
 * when the calling screen actually knows it.
 */
export function describeReviewerScale(
  reviewer: ReviewerOutput,
  context?: ReviewerReaderContext,
): string {
  const parts = [countLabel(reviewer.sections.length, "section", "sections")];
  const blockCount = context?.selectedBlockCount;

  if (typeof blockCount === "number" && Number.isFinite(blockCount) && blockCount > 0) {
    parts.push(
      `from ${countLabel(Math.floor(blockCount), "selected block", "selected blocks")}`,
    );
  }

  return parts.join(" · ");
}

export function describeGroundingStatus(
  metadata: ReviewerMetadata,
): ReviewerGroundingPresentation | null {
  const status = metadata.groundingStatus as unknown;

  if (!isGroundingStatus(status)) {
    return null;
  }

  if (status === "passed") {
    return {
      label: "Grounded",
      detail: "Every section was checked against your source material.",
      tone: "grounded",
    };
  }

  return {
    label: "Limited grounding",
    detail: "Some sections could not be matched back to your source material.",
    tone: "limited",
  };
}

/**
 * The existing fallback disclosure, kept as a sentence rather than a status
 * chip because it explains how sections were produced, not how reliable the
 * reviewer is.
 */
export function describeReviewerQualityNotice(
  metadata: ReviewerMetadata,
): string | null {
  if (
    metadata.reviewerQualityStatus === "complete_with_fallbacks" ||
    metadata.reviewerQualityStatus === "limited"
  ) {
    return "Some sections use source-only fallback because generation could not be safely verified.";
  }

  return null;
}

export function presentReviewerSections(
  reviewer: ReviewerOutput,
): readonly ReviewerReaderSection[] {
  return reviewer.sections.map((section, index) =>
    presentReviewerSection(section, index + 1),
  );
}

export function presentReviewerSection(
  section: ReviewerSection,
  sectionNumber: number,
): ReviewerReaderSection {
  const title = withFallback(section.title, UNTITLED_SECTION);
  const singleItem = section.items.length === 1;

  const blocks = section.items.map((item, index): ReviewerReaderBlock => {
    const itemTitle = trim(item.title);
    const keyPoints = item.sourceCore.keyPoints
      .map((point) => trim(point))
      .filter((point) => point.length > 0);
    const explanation = readableExplanation(
      trim(item.sourceCore.explanation),
      itemTitle || title,
      keyPoints,
    );
    const heading =
      singleItem && (itemTitle.length === 0 || sameText(itemTitle, title))
        ? null
        : itemTitle || `Part ${index + 1}`;
    const hasContent = explanation !== null || keyPoints.length > 0;

    return {
      id: item.id,
      heading,
      explanation,
      keyPoints,
      showKeyPointsLabel:
        keyPoints.length > 0 && (explanation !== null || heading !== null),
      emptyMessage: hasContent ? null : EMPTY_BLOCK_MESSAGE,
    };
  });

  return {
    id: section.id,
    number: sectionNumber,
    title,
    blocks,
    notice: describeSectionNotice(section),
    emptyMessage: blocks.length === 0 ? EMPTY_SECTION_MESSAGE : null,
  };
}

/**
 * A short, honest note about how a single section turned out. Sections that
 * generated and grounded normally say nothing at all, so notices stay rare
 * enough to mean something.
 */
export function describeSectionNotice(section: ReviewerSection): string | null {
  if (section.groundingStatus === "failed") {
    return "Parts of this section could not be matched back to your source.";
  }

  if (section.qualityStatus === "extractive_fallback") {
    return "Taken directly from your source material.";
  }

  return null;
}

/**
 * Hide an explanation only when it is an exact restatement of text already on
 * screen beside it - the item heading, or the single key point below it. The
 * text itself is never edited.
 */
function readableExplanation(
  explanation: string,
  title: string,
  keyPoints: readonly string[],
): string | null {
  if (explanation.length === 0) {
    return null;
  }

  if (sameText(explanation, title)) {
    return null;
  }

  if (keyPoints.length === 1 && sameText(explanation, keyPoints[0] ?? "")) {
    return null;
  }

  return explanation;
}

/**
 * The student-facing word for a source mode, e.g. `Canvas`, `PDF`, `Photo`.
 * Exported so Study Library entries name a source exactly as the Reader does
 * once the same reviewer is open.
 */
export function describeReviewerSourceMode(
  mode: ReviewerReaderSourceMode | null | undefined,
): string | null {
  switch (mode) {
    case "canvas":
      return "Canvas";
    case "pdf":
      return "PDF";
    case "gallery":
    case "camera":
      return "Photo";
    case "paste":
      return "Pasted text";
    default:
      return null;
  }
}

function describeSourceKind(kind: ReviewerMetadata["sourceKind"]): string | null {
  switch (kind) {
    case "document":
      return "Document";
    case "presentation":
      return "Presentation";
    case "webpage":
      return "Web page";
    case "plain-text":
      return "Text";
    default:
      return null;
  }
}

function isGroundingStatus(
  value: unknown,
): value is (typeof GROUNDING_STATUSES)[number] {
  return (
    typeof value === "string" &&
    (GROUNDING_STATUSES as readonly string[]).includes(value)
  );
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function trim(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function withFallback(value: string, fallback: string): string {
  const trimmed = trim(value);
  return trimmed.length > 0 ? trimmed : fallback;
}

function sameText(left: string, right: string): boolean {
  return normalize(left) === normalize(right);
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
