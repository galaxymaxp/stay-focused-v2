import { normalizeCoverageTitleKey } from "./stage4-verify.js";
import { extractCleanSourceItems } from "./source-items.js";

export type RecoveryEvidenceKind =
  | "prose"
  | "phrase"
  | "mapping"
  | "sequence"
  | "noise";

export interface RecoveryEvidenceCandidate {
  readonly text: string;
  readonly kind: RecoveryEvidenceKind;
  readonly score: number;
  readonly wordCount: number;
  readonly repeated: boolean;
  readonly position: number;
}

export interface RecoveryEvidenceAnalysis {
  readonly candidates: readonly RecoveryEvidenceCandidate[];
  readonly mappings: readonly string[];
  readonly sequence: readonly string[];
}

const ARROW_ONLY_PATTERN = /^(?:[-=]+>|[\u2190-\u21ff\u27f0-\u27ff])$/u;
const INLINE_ARROW_PATTERN = /\s*(?:[-=]+>|[\u2190-\u21ff\u27f0-\u27ff])\s*/u;
const ISOLATED_NUMBER_PATTERN = /^(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?$/i;
const PRESENTATION_NOISE_PATTERN = /\b(?:footer|header|slide\s*\d*|page\s*\d*)\b/i;

export function analyzeRecoveryEvidence(args: {
  readonly sourceText: string;
  readonly sectionTitle: string;
  readonly documentText?: string;
}): RecoveryEvidenceAnalysis {
  const lines = args.sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const frequencies = lineFrequencies(
    (args.documentText ?? args.sourceText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  );
  const sequence = extractExplicitSequence(args.sourceText, args.sectionTitle);
  const items = extractCleanSourceItems({
    sourceSpanText: args.sourceText,
    sectionTitle: args.sectionTitle,
  }).map((item) => item.text.trim());
  const mappings = items.filter(isMappingRow);
  const sentenceCandidates = extractSentenceCandidates(
    args.sourceText,
    args.sectionTitle,
  );
  const paragraphCandidates = extractParagraphCandidates(args.sourceText);
  const lineGroupCandidates = extractLineGroupCandidates(
    lines,
    frequencies,
    args.sectionTitle,
  );
  const compactLabelKeys = findCompactLabelRunKeys(lines, args.sectionTitle);
  const values = unique([
    ...lineGroupCandidates,
    ...paragraphCandidates,
    ...sentenceCandidates,
    ...lines,
  ]);
  const candidates = values
    .map((text) => {
      const sourcePosition = Math.max(0, args.sourceText.lastIndexOf(text)) /
        Math.max(1, args.sourceText.length);
      return scoreCandidate({
      text,
      sectionTitle: args.sectionTitle,
      repeated: (frequencies.get(normalizeKey(text)) ?? 0) > 1,
      heading:
        normalizeKey(text) === normalizeKey(lines[0] ?? "") &&
        !/[.!?]$/.test(text) &&
        (sentenceCandidates.length > 0 || lines.slice(1).some((line) => /[.!?]$/.test(line))),
      orderBonus: sourcePosition * 25,
      position: sourcePosition,
      mapping: isMappingRow(text),
      sequence: sequence.length > 0 && sequence.every((item) =>
        normalizeKey(text).includes(normalizeKey(item)),
      ),
      compactLabel: compactLabelKeys.has(normalizeKey(text)),
      });
    })
    .sort((left, right) => right.score - left.score);

  return { candidates, mappings: unique(mappings), sequence };
}

export function selectRecoveryExplanation(
  analysis: RecoveryEvidenceAnalysis,
): string {
  const useful = [...analysis.candidates].filter(
    (candidate) =>
      (candidate.kind === "prose" || candidate.kind === "phrase") &&
      candidate.wordCount >= 3 &&
      candidate.score > 0,
  );
  const prose = useful.filter((candidate) => candidate.kind === "prose");
  if (prose.length > 0) {
    return prose.sort((left, right) => right.position - left.position)[0]?.text ?? "";
  }
  return useful.sort(
    (left, right) => right.score - left.score || right.position - left.position,
  )[0]?.text ?? "";
}

export function serializeRecoveryEvidence(args: {
  readonly sourceText: string;
  readonly sectionTitle: string;
}): readonly string[] {
  const analysis = analyzeRecoveryEvidence(args);
  return [
    ...(analysis.mappings.length > 0
      ? ["[mapping]", ...analysis.mappings.map((row) => row.replace(/\s*\|\s*/g, " => "))]
      : []),
    ...(analysis.sequence.length > 0
      ? ["[sequence]", analysis.sequence.join(" \u2192 ")]
      : []),
  ];
}

export function extractExplicitSequence(
  sourceText: string,
  sectionTitle: string,
): readonly string[] {
  const titleKey = normalizeCoverageTitleKey(sectionTitle);
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => normalizeCoverageTitleKey(line) !== titleKey);
  let best: string[] = [];
  let current: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const label = lines[index];
    const arrow = lines[index + 1];
    const nextLabel = lines[index + 2];
    if (label && arrow && nextLabel && isArrowOnly(arrow) && !isArrowOnly(label) && !isArrowOnly(nextLabel)) {
      if (current.length === 0 || normalizeKey(current.at(-1) ?? "") !== normalizeKey(label)) {
        current.push(label);
      }
      current.push(nextLabel);
      if (current.length > best.length) best = [...current];
      index += 1;
      continue;
    }
    if (current.length >= 2) current = [];
  }
  if (best.length >= 2) return unique(best);

  for (const line of lines) {
    if (!INLINE_ARROW_PATTERN.test(line)) continue;
    const parts = line.split(INLINE_ARROW_PATTERN).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return unique(parts);
  }
  return [];
}

function scoreCandidate(args: {
  readonly text: string;
  readonly sectionTitle: string;
  readonly repeated: boolean;
  readonly heading: boolean;
  readonly orderBonus: number;
  readonly position: number;
  readonly mapping: boolean;
  readonly sequence: boolean;
  readonly compactLabel: boolean;
}): RecoveryEvidenceCandidate {
  const text = args.text.replace(/\s+/g, " ").trim();
  const words = text.match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu) ?? [];
  const alphaNumericCount = text.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  const alphaNumericRatio = alphaNumericCount / Math.max(1, text.length);
  const titleOnly = normalizeCoverageTitleKey(text) === normalizeCoverageTitleKey(args.sectionTitle);
  const titleTerms = new Set(
    normalizeKey(args.sectionTitle).split(" ").filter((term) => term.length > 2),
  );
  const targetOverlap = [...new Set(words.map((word) => normalizeKey(word)))]
    .filter((word) => titleTerms.has(word)).length;
  const isolatedNumber = ISOLATED_NUMBER_PATTERN.test(text);
  const punctuationOnly = alphaNumericCount === 0;
  const identifierCount = words.filter((word) => /^[A-F0-9]{4,}$/i.test(word)).length;
  const mostlyIdentifiers = words.length >= 2 && identifierCount / words.length >= 0.6;
  const danglingWord = words.length <= 1;
  const compactLabel =
    words.length <= 3 &&
    /^\p{Lu}/u.test(text) &&
    !/[.!?]$/.test(text) &&
    (args.compactLabel || targetOverlap > 0);
  const presentationNoise = PRESENTATION_NOISE_PATTERN.test(text);
  const stopwordFragment = /^(?:of|the|of\s+the)$/i.test(text);
  const allCapsFragment =
    words.length <= 6 &&
    /\p{L}/u.test(text) &&
    text === text.toLocaleUpperCase() &&
    !/[.!?]$/.test(text);
  const lowercaseFragment =
    words.length <= 4 &&
    /^[\p{Ll}]/u.test(text) &&
    !/[.!?]$/.test(text);
  const noise = titleOnly || isolatedNumber || punctuationOnly || presentationNoise || mostlyIdentifiers || stopwordFragment || args.heading;
  const kind: RecoveryEvidenceKind = noise
    ? "noise"
    : args.mapping
      ? "mapping"
      : args.sequence
        ? "sequence"
        : /[.!?]$/.test(text)
          ? "prose"
          : "phrase";
  let score = words.length * 2 + alphaNumericRatio * 10;
  if (kind === "prose" && words.length >= 5) score += 45;
  if (kind === "phrase" && words.length >= 5) score += 15;
  if (kind === "mapping" || kind === "sequence") score += 35;
  score += targetOverlap * 12;
  score += args.orderBonus;
  if (danglingWord) score -= 35;
  if (compactLabel) score += 30;
  if (danglingWord && args.position > 0.8) score -= 20;
  if (allCapsFragment) score -= 45;
  if (lowercaseFragment) score -= 40;
  if (args.repeated && words.length <= 10) score -= 80;
  if (noise) score -= 100;
  return {
    text,
    kind,
    score,
    wordCount: words.length,
    repeated: args.repeated,
    position: args.position,
  };
}

function extractParagraphCandidates(sourceText: string): readonly string[] {
  const paragraphs = sourceText
    .split(/(?:\r?\n){2,}/)
    .filter((paragraph) => (paragraph.match(/\r?\n/g)?.length ?? 0) <= 2)
    .map((paragraph) => paragraph.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(" "))
    .filter(Boolean);
  const joined: string[] = [];
  for (const paragraph of paragraphs) {
    const previous = joined.at(-1);
    if (previous && /^[\p{Ll}]/u.test(paragraph) && !/[.!?]$/.test(previous)) {
      joined[joined.length - 1] = `${previous} ${paragraph}`;
    } else {
      joined.push(paragraph);
    }
  }
  return joined.filter((paragraph) => countWords(paragraph) <= 40);
}

function extractLineGroupCandidates(
  lines: readonly string[],
  frequencies: ReadonlyMap<string, number>,
  sectionTitle: string,
): readonly string[] {
  const grouped: string[] = [];
  for (const line of lines) {
    const words = line.match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu) ?? [];
    const identifiers = words.filter((word) => /^[A-F0-9]{4,}$/i.test(word));
    const usable = normalizeKey(line) !== normalizeKey(sectionTitle) &&
      (frequencies.get(normalizeKey(line)) ?? 0) <= 1 &&
      !ISOLATED_NUMBER_PATTERN.test(line) &&
      !PRESENTATION_NOISE_PATTERN.test(line) &&
      !/^(?:of|the|of\s+the)$/i.test(line) &&
      !(words.length >= 2 && identifiers.length / words.length >= 0.6);
    if (!usable) {
      grouped.push("");
      continue;
    }
    const previous = grouped.at(-1);
    if (
      previous &&
      /^[\p{Ll}]/u.test(line) &&
      !/[.!?]$/.test(previous) &&
      countWords(`${previous} ${line}`) <= 40
    ) {
      grouped[grouped.length - 1] = `${previous} ${line}`;
    } else {
      grouped.push(line);
    }
  }
  return grouped.filter(Boolean);
}

function findCompactLabelRunKeys(
  lines: readonly string[],
  sectionTitle: string,
): ReadonlySet<string> {
  const keys = new Set<string>();
  let run: string[] = [];
  const flush = (): void => {
    if (run.length >= 2) run.forEach((line) => keys.add(normalizeKey(line)));
    run = [];
  };
  for (const line of lines) {
    if (normalizeKey(line) === normalizeKey(sectionTitle)) {
      flush();
      continue;
    }
    if (/^(?:of|the|of\s+the)$/i.test(line)) continue;
    const words = line.match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu) ?? [];
    const compact =
      words.length >= 1 &&
      words.length <= 3 &&
      /^\p{Lu}/u.test(line) &&
      !/[.!?]$/.test(line);
    if (compact) run.push(line);
    else flush();
  }
  flush();
  return keys;
}

function extractSentenceCandidates(sourceText: string, sectionTitle: string): readonly string[] {
  const titlePattern = new RegExp(`^${escapeRegExp(sectionTitle.trim())}\\s*`, "iu");
  return sourceText
    .split(/(?:\r?\n){2,}/)
    .filter((paragraph) => (paragraph.match(/\r?\n/g)?.length ?? 0) <= 2)
    .flatMap((paragraph) => paragraph.replace(/\r?\n/g, " ").split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}])/u))
    .filter((sentence) => /[.!?]$/.test(sentence.trim()))
    .map((sentence) => sentence.replace(titlePattern, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function lineFrequencies(lines: readonly string[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = normalizeKey(line);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function isMappingRow(value: string): boolean {
  const cells = value.split("|").map((cell) => cell.trim()).filter(Boolean);
  return cells.length >= 2 && cells.every((cell) => /[\p{L}\p{N}]/u.test(cell));
}

function isArrowOnly(value: string): boolean {
  return ARROW_ONLY_PATTERN.test(value.replace(/\s+/g, ""));
}

function unique(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}
