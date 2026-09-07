import {
  countWords,
  isInstructionalNoiseText,
} from "./review-content.js";
import { requiredEvidenceTargetIsRepresented } from "./required-evidence.js";
import type {
  NormalizedSource,
  PlannedSection,
  RequiredEvidenceTarget,
  SectionOutput,
} from "./types.js";

export type StudentVisibleUsefulnessDiagnostic =
  | "NON_EXPLANATORY_SECTION"
  | "INSTRUCTIONAL_NOISE"
  | "CODE_AS_EXPLANATION"
  | "FRAGMENTARY_EXPLANATION"
  | "SOURCE_DUMP"
  | "LOW_INFORMATION_SECTION";

export interface StudentVisibleUsefulnessIssue {
  readonly type: StudentVisibleUsefulnessDiagnostic;
  readonly plannedSectionId: string;
  readonly fieldPath: string;
  readonly message: string;
  readonly offendingText?: string;
}

const INFORMATION_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in",
  "is", "it", "of", "on", "or", "the", "this", "to", "was", "were", "with",
  "that", "which", "these", "those", "such", "simply", "basically", "essentially",
  "really", "truly", "very", "type", "types", "means", "called",
]);

export function diagnoseStudentVisibleUsefulness(args: {
  readonly section: PlannedSection;
  readonly source: NormalizedSource;
  readonly output: SectionOutput;
}): readonly StudentVisibleUsefulnessIssue[] {
  const issues: StudentVisibleUsefulnessIssue[] = [];
  const explanation = args.output.sourceCore.explanation.trim();
  const points = args.output.sourceCore.keyPoints.map((point) => point.trim()).filter(Boolean);
  const targets = args.section.requiredEvidence ?? [];

  if (!explanation) {
    issues.push(issue(
      "NON_EXPLANATORY_SECTION",
      args.section.id,
      "sourceCore.explanation",
      "Source-supported standalone section is missing its concise explanation.",
    ));
  }

  if (explanation && explanationAddsNoInformation(args.section.title, explanation)) {
    issues.push(issue(
      "NON_EXPLANATORY_SECTION",
      args.section.id,
      "sourceCore.explanation",
      "Explanation adds effectively no concept information beyond the section title.",
      explanation,
    ));
  }

  if (explanation && isInstructionalNoiseText(explanation, { explanationField: true })) {
    issues.push(issue(
      "INSTRUCTIONAL_NOISE",
      args.section.id,
      "sourceCore.explanation",
      "Explanation contains learner-directed activity or presentation instructions.",
      explanation,
    ));
  } else if (explanation && explanationIsCodeDominant(explanation)) {
    issues.push(issue(
      "CODE_AS_EXPLANATION",
      args.section.id,
      "sourceCore.explanation",
      "Typed code is evidence, but cannot substitute for explanatory prose.",
      explanation,
    ));
  } else if (explanation && explanationIsFragmentary(explanation)) {
    issues.push(issue(
      "FRAGMENTARY_EXPLANATION",
      args.section.id,
      "sourceCore.explanation",
      "Explanation is a phrase or presentation fragment rather than a complete concept statement.",
      explanation,
    ));
  } else if (explanation && proseIsOversized(explanation)) {
    issues.push(issue(
      "SOURCE_DUMP",
      args.section.id,
      "sourceCore.explanation",
      "Explanation is an oversized source passage rather than concise explanatory prose.",
      explanation,
    ));
  }
  if (!args.output.deterministicEvidence) points.forEach((point, index) => {
    if (isInstructionalNoiseText(point)) {
      issues.push(issue(
        "INSTRUCTIONAL_NOISE",
        args.section.id,
        `sourceCore.keyPoints[${index}]`,
        "Key point contains learner-directed activity or presentation instructions.",
        point,
      ));
    }
    if (pointIsSourceDump(point, targets)) {
      issues.push(issue(
        "SOURCE_DUMP",
        args.section.id,
        `sourceCore.keyPoints[${index}]`,
        "Key point is an oversized prose/source chunk rather than an atomic review fact.",
        point,
      ));
    }
  });

  if (!args.output.deterministicEvidence && keyPointSetIsSourceDump(points, targets, args.source, args.section)) {
    issues.push(issue(
      "SOURCE_DUMP",
      args.section.id,
      "sourceCore.keyPoints",
      "Key points reproduce a disproportionate amount of optional source material.",
    ));
  }

  if (hasLowInformationValue(args.section, explanation, [
    ...points, ...(args.output.sourceCore.evidence ?? []).map(block => block.text),
  ])) {
    issues.push(issue(
      "LOW_INFORMATION_SECTION",
      args.section.id,
      "sourceCore",
      "Section contains no meaningful source-supported concept information.",
    ));
  }

  return dedupeIssues(issues);
}

export function explanationHasUsefulForm(title: string, explanation: string): boolean {
  const text = explanation.trim();
  return text.length > 0 &&
    !explanationAddsNoInformation(title, text) &&
    !isInstructionalNoiseText(text, { explanationField: true }) &&
    !explanationIsCodeDominant(text) &&
    !explanationIsFragmentary(text) &&
    !proseIsOversized(text);
}

function explanationAddsNoInformation(title: string, explanation: string): boolean {
  const titleTerms = new Set(informationTerms(title));
  const explanationTerms = informationTerms(explanation);
  if (titleTerms.size === 0 || explanationTerms.length === 0) return false;
  const gained = new Set(explanationTerms.filter((term) => !titleTerms.has(term)));
  const titleOverlap = [...titleTerms].filter((term) => explanationTerms.includes(term)).length /
    titleTerms.size;
  return gained.size < 2 && titleOverlap >= 0.75;
}

function pointIsSourceDump(
  point: string,
  targets: readonly RequiredEvidenceTarget[],
): boolean {
  if (pointRepresentsTypedTarget(point, targets)) return false;
  const wordCount = countWords(point);
  const paragraphCount = point.split(/(?:\r?\n){2,}/u).filter(Boolean).length;
  const sentenceCount = point.split(/(?<=[.!?])\s+/u).filter(Boolean).length;
  return wordCount > 70 || paragraphCount >= 2 || (wordCount > 48 && sentenceCount >= 4);
}

function explanationIsCodeDominant(value: string): boolean {
  const text = value.trim();
  const startsAsCode = /^\s*(?:async\s+)?(?:def|class|function|import|from|const|let|var)\b/im.test(text);
  const hasCodeLayout = /\n\s{2,}\S/u.test(text) || /[{}();=]/u.test(text);
  if (startsAsCode && hasCodeLayout) return true;
  const assignmentCount = text.match(/\b[A-Za-z_]\w*\s*=(?!=)/gu)?.length ?? 0;
  const codeKeywordCount = text.match(/\b(?:def|else|for|if|print|range|return|while|yield)\b/giu)?.length ?? 0;
  if (assignmentCount >= 1 && codeKeywordCount >= 2) return true;
  const codeSignals = [
    /^\s*(?:async\s+)?(?:def|class|function|import|from|const|let|var)\b/im,
    /\b(?:yield|return)\b[^.!?]*(?:\n|;|\})/i,
    /(?:^|\n)\s{2,}\S/u,
    /(?:=>|:=|==|!=|\+\+|--|\{[^}]*\}|\[[^\]]*\]\s*=)/u,
    /\b\w+\s*\([^)]*\)\s*[:{]/u,
  ].filter((pattern) => pattern.test(text)).length;
  const proseSentences = text.split(/(?<=[.!?])\s+/u).filter((sentence) =>
    countWords(sentence) >= 5 && !/[{}[\];=]/u.test(sentence)
  ).length;
  return proseSentences === 0 && codeSignals >= 2;
}

function explanationIsFragmentary(value: string): boolean {
  const text = value.replace(/^\s*[-*+\u2022]\s*/u, "").trim();
  const words = text.match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu) ?? [];
  if (words.length < 2) return true;
  if (/^(?:shown|displayed|provided|listed)(?:\s+(?:here|above|below))?[.!?]?$/iu.test(text)) return true;
  if (words.length <= 5 && !text.includes(",") && /^(?:for\s+\p{L}+ing|to\s+\p{L}+)/iu.test(text)) {
    return true;
  }
  if (words.length <= 5 && !text.includes(",") && /^using\s+/iu.test(text)) {
    const remainder = words.slice(1).join(" ");
    const finitePredicate = /\b(?:is|are|was|were|has|have|does|can|may|must|will|should|\p{L}{4,}(?:ed|es))\b/iu.test(remainder);
    if (!finitePredicate) return true;
  }
  return false;
}

function proseIsOversized(value: string): boolean {
  const wordCount = countWords(value);
  const paragraphCount = value.split(/(?:\r?\n){2,}/u).filter(Boolean).length;
  const sentenceCount = value.split(/(?<=[.!?])\s+/u).filter(Boolean).length;
  return wordCount > 55 || paragraphCount >= 2 || (wordCount > 42 && sentenceCount >= 4);
}

function keyPointSetIsSourceDump(
  points: readonly string[],
  targets: readonly RequiredEvidenceTarget[],
  source: NormalizedSource,
  section: PlannedSection,
): boolean {
  const nonTyped = points.filter((point) => !pointRepresentsTypedTarget(point, targets));
  const totalWords = nonTyped.reduce((total, point) => total + countWords(point), 0);
  const requiredWords = Math.max(
    1,
    targets
      .filter((target) => !isTypedTarget(target))
      .reduce((total, target) => total + countWords(target.label), 0),
  );
  const requiredRepresentations = new Set(
    targets.flatMap((target) =>
      points.flatMap((point, index) =>
        requiredEvidenceTargetIsRepresented(target, [point]) ? [index] : [],
      ),
    ),
  );
  const optionalPointCount = points.length - requiredRepresentations.size;
  const sectionSource = new Set(section.sourceBlockIds);
  const verbatimLikeCount = nonTyped.filter((point) => {
    const normalizedPoint = normalize(point);
    return normalizedPoint.length >= 40 && source.blocks.some((block) =>
      sectionSource.has(block.id) && normalize(block.text).includes(normalizedPoint)
    );
  }).length;
  return (
    (optionalPointCount >= 6 && totalWords > Math.max(140, requiredWords * 2 + 60)) ||
    (verbatimLikeCount >= 8 && totalWords > 160)
  );
}

function hasLowInformationValue(
  section: PlannedSection,
  explanation: string,
  points: readonly string[],
): boolean {
  const visibleTerms = new Set(informationTerms([
    section.title,
    explanation,
    ...points,
  ].join(" ")));
  if (visibleTerms.size < 2) return true;
  if ((section.requiredEvidence?.length ?? 0) === 0) {
    const titleTerms = new Set(informationTerms(section.title));
    return !informationTerms([explanation, ...points].join(" "))
      .some((term) => !titleTerms.has(term));
  }
  return !section.requiredEvidence?.some((target) =>
    requiredEvidenceTargetIsRepresented(target, [explanation, ...points])
  );
}

function pointRepresentsTypedTarget(
  point: string,
  targets: readonly RequiredEvidenceTarget[],
): boolean {
  return targets.some((target) =>
    isTypedTarget(target) && requiredEvidenceTargetIsRepresented(target, [point]) &&
    countWords(point) <= target.evidenceTexts.reduce((total, text) => total + countWords(text), 0) +
      countWords(target.relationshipLabel ?? "") + 24
  );
}

function isTypedTarget(target: RequiredEvidenceTarget): boolean {
  return target.kind === "formula" || target.kind === "code" ||
    target.kind === "table-row" || target.kind === "table-cell";
}

function informationTerms(value: string): readonly string[] {
  return (value.toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu) ?? [])
    .filter((term) => !INFORMATION_STOPWORDS.has(term));
}

function issue(
  type: StudentVisibleUsefulnessDiagnostic,
  plannedSectionId: string,
  fieldPath: string,
  message: string,
  offendingText?: string,
): StudentVisibleUsefulnessIssue {
  return { type, plannedSectionId, fieldPath, message, ...(offendingText ? { offendingText } : {}) };
}

function dedupeIssues(
  issues: readonly StudentVisibleUsefulnessIssue[],
): readonly StudentVisibleUsefulnessIssue[] {
  const seen = new Set<string>();
  return issues.filter((entry) => {
    const key = `${entry.type}\u001f${entry.fieldPath}\u001f${entry.offendingText ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, " ").trim();
}
