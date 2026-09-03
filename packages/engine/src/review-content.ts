import type { NormalizedSourceBlock } from "./types.js";

const INSTRUCTIONAL_HEADING_PATTERN =
  /^(?:(?:class|group|individual|student|practical)\s+)?(?:activit(?:y|ies)|assignment|exercise|lab(?:oratory)?|practice|prompt|question(?:s)?|task|workshop)(?:\s*[:#-]\s*.*|\s+\d+)?$/i;
const LEARNER_REFERENCE_PATTERN =
  /\b(?:you|your|student(?:s)?|learner(?:s)?|class|group|partner)\b/i;
const DIRECTIVE_FRAME_PATTERN =
  /\b(?:following|below|above|answer|response|submission|worksheet)\b/i;
const LEARNER_TASK_OBJECT_PATTERN =
  /^(?:answer|complete|create|observe|run|submit|try|write)\b.*\b(?:answer|code|essay|output|program|project|response|submission|worksheet)\b/i;
const IMPERATIVE_START_PATTERN =
  /^(?:add|answer|apply|calculate|choose|classify|compare|complete|compose|create|describe|determine|discuss|draw|enter|examine|explain|find|identify|implement|list|observe|open|perform|practice|prepare|read|record|review|run|select|show|solve|state|submit|summarize|test|trace|try|use|verify|watch|write)\b/i;
const PRESENTATION_NAVIGATION_PATTERN =
  /\b(?:previous|next)\s+(?:page|slide)\b|\bshown\s+(?:above|below|here)\b/i;

export function reviewableSourceBlocks(
  blocks: readonly NormalizedSourceBlock[],
): readonly NormalizedSourceBlock[] {
  let inInstructionalRegion = false;
  const reviewable: NormalizedSourceBlock[] = [];

  for (const block of blocks) {
    const heading = block.kind === "heading";
    const furniture = block.structuredBlock?.role === "furniture";
    if (heading) {
      inInstructionalRegion = furniture || isInstructionalHeadingText(block.text);
      if (inInstructionalRegion) continue;
    }

    const containsInstructionalHeading = block.text
      .split(/\r?\n/)
      .some(isInstructionalHeadingText);
    const text = !inInstructionalRegion && !furniture && !containsInstructionalHeading
      ? block.text
      : filterReviewableText(block.text, {
          block,
          instructionalRegion: inInstructionalRegion,
        });
    if (!text) continue;
    reviewable.push(text === block.text ? block : { ...block, text });
  }

  return reviewable;
}

export function filterReviewableText(
  value: string,
  context: {
    readonly block?: NormalizedSourceBlock;
    readonly instructionalRegion?: boolean;
  } = {},
): string {
  if (context.block?.structuredBlock?.role === "furniture") return "";
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const retained: string[] = [];
  let localInstructionalRegion = context.instructionalRegion ?? false;

  for (const line of lines) {
    if (isInstructionalHeadingText(line)) {
      localInstructionalRegion = true;
      continue;
    }
    if (isInstructionalNoiseText(line, { instructionalRegion: localInstructionalRegion })) {
      continue;
    }
    retained.push(line);
  }

  return retained.join("\n").trim();
}

export function isInstructionalHeadingText(value: string): boolean {
  const compact = value
    .replace(/^\s*(?:[-*+\u2022]|\d{1,3}[.)])\s*/u, "")
    .replace(/[:;.!?]+$/u, "")
    .trim();
  const wordCount = countWords(compact);
  return wordCount > 0 && wordCount <= 6 && INSTRUCTIONAL_HEADING_PATTERN.test(compact);
}

export function isInstructionalNoiseText(
  value: string,
  context: { readonly instructionalRegion?: boolean } = {},
): boolean {
  const text = value
    .replace(/^\s*(?:[-*+\u2022]|\d{1,3}[.)])\s*/u, "")
    .trim();
  if (!text) return true;
  if (isInstructionalHeadingText(text)) return true;

  const firstSentence = text.split(/(?<=[.!?])\s+/u)[0] ?? text;
  const imperative = IMPERATIVE_START_PATTERN.test(firstSentence);
  const learnerDirected = LEARNER_REFERENCE_PATTERN.test(text);
  const directiveFraming = DIRECTIVE_FRAME_PATTERN.test(text);
  const learnerTaskObject = LEARNER_TASK_OBJECT_PATTERN.test(text);
  const questionPrompt = /\?\s*$/u.test(text) && countWords(text) >= 4;
  const navigation = PRESENTATION_NAVIGATION_PATTERN.test(text);

  if (context.instructionalRegion && (imperative || learnerDirected || questionPrompt)) {
    return true;
  }
  return (
    (imperative && (learnerDirected || directiveFraming || learnerTaskObject || questionPrompt)) ||
    questionPrompt ||
    navigation
  );
}

export function isPresentationExampleOrOutput(value: string): boolean {
  return (
    /^(?:example|sample|solution|output|answer)(?:\s+\d+)?\b/i.test(value.trim()) ||
    /\b(?:previous|next)\s+slide\b/i.test(value) ||
    /^#?\s*(?:prints?|output)\s*:/i.test(value.trim())
  );
}

export function countWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}
