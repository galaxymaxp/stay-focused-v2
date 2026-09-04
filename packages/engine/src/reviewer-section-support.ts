import { reviewableSourceBlocks } from "./review-content.js";
import type {
  NormalizedSourceBlock,
  PlannedSection,
  ReviewerSectionDisposition,
} from "./types.js";

const TYPED_EVIDENCE_KINDS = new Set(["code", "formula", "table"]);
const EXPLANATORY_PREDICATE =
  /\b(?:allow(?:s|ed)?|are|become(?:s)?|called|can|connect(?:s|ed)?|contain(?:s|ed)?|define(?:s|d)?|divide(?:s|d)?|has|have|identif(?:y|ies|ied)|is|mark(?:s|ed)?|may|mean(?:s)?|occup(?:y|ies)|preserve(?:s|d)?|produce(?:s|d)?|refer(?:s|red)?|report(?:s|ed)?|represent(?:s|ed)?|result(?:s|ed)?|return(?:s|ed)?|store(?:s|d)?|use(?:s|d)?|yield(?:s|ed)?)\b/i;
const STRUCTURAL_OR_METADATA_LINE =
  /^(?:prepared\s+by|objectives?|contents?|outline|unit\s+\d+)\b/i;

export interface ReviewerSectionSupport {
  readonly disposition: ReviewerSectionDisposition;
  readonly reason: string;
  readonly hasLocalExplanatoryEvidence: boolean;
  readonly localSemanticTextCount: number;
  readonly localTypedEvidenceCount: number;
}

export function classifyReviewerSectionSupport(args: {
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
  readonly childSectionCount: number;
}): ReviewerSectionSupport {
  const localBlocks = reviewableSourceBlocks(args.sourceBlocks).filter(
    (block) => block.kind !== "heading" && block.structuredBlock?.role !== "furniture",
  );
  const typedBlocks = localBlocks.filter((block) =>
    TYPED_EVIDENCE_KINDS.has(block.kind) && block.text.trim().length > 0,
  );
  const semanticTextBlocks = localBlocks.filter((block) =>
    !TYPED_EVIDENCE_KINDS.has(block.kind) && block.kind !== "image" && block.text.trim().length > 0,
  );
  const explanatory = semanticTextBlocks.some((block) =>
    block.text.split(/\r?\n/u).some(isLocallyExplanatoryText),
  );

  if (explanatory) {
    return support("standalone", "local-explanatory-evidence", true, semanticTextBlocks.length, typedBlocks.length);
  }
  if (typedBlocks.length > 0) {
    return support("typed-evidence", "local-typed-evidence-without-explanatory-prose", false, semanticTextBlocks.length, typedBlocks.length);
  }
  if (args.childSectionCount > 0) {
    return support("structural", "source-container-with-supported-children", false, semanticTextBlocks.length, 0);
  }
  if (semanticTextBlocks.length > 0) {
    return support("structural", "source-structure-without-explanatory-prose", false, semanticTextBlocks.length, 0);
  }
  return support("unsupported", "heading-only-unsupported-leaf", false, 0, 0);
}

export function reviewerDispositionFor(section: PlannedSection): ReviewerSectionDisposition {
  return section.reviewerDisposition ?? "standalone";
}

export function requiresProviderGeneration(section: PlannedSection): boolean {
  return reviewerDispositionFor(section) === "standalone";
}

export function isLocallyExplanatoryText(value: string): boolean {
  const text = value
    .replace(/^\s*(?:[-*+\u2022]|\d{1,3}[.)])\s*/u, "")
    .trim();
  const wordCount = text.match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  if (wordCount < 4 || STRUCTURAL_OR_METADATA_LINE.test(text)) return false;
  return EXPLANATORY_PREDICATE.test(text) || (wordCount >= 7 && /[.!?]\s*$/u.test(text));
}

function support(
  disposition: ReviewerSectionDisposition,
  reason: string,
  hasLocalExplanatoryEvidence: boolean,
  localSemanticTextCount: number,
  localTypedEvidenceCount: number,
): ReviewerSectionSupport {
  return {
    disposition,
    reason,
    hasLocalExplanatoryEvidence,
    localSemanticTextCount,
    localTypedEvidenceCount,
  };
}
