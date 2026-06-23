import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline } from "../src/stage1-outline.js";
import { buildGenerationPlan } from "../src/stage2-plan.js";
import {
  deriveLiveFixtureSourceId,
  type FixtureSource,
} from "./live-fixtures.js";
import type {
  GenerationPlan,
  NormalizedSource,
  NormalizedSourceBlock,
  OutlineSection,
  PlannedSection,
  SourceNormalizationInput,
  SourceOutline,
} from "../src/types.js";

interface TextMarker {
  readonly text: string;
  readonly reason: string;
  readonly lineNumber?: number;
  readonly blockId?: string;
  readonly order?: number;
  readonly offset?: number;
  readonly count?: number;
  readonly preview?: string;
}

interface BlockReport {
  readonly id: string;
  readonly order: number;
  readonly kind: string;
  readonly preview: string;
  readonly headingLevel?: number;
  readonly headingSignals: readonly string[];
}

interface OutlineSectionReport {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly sourceBlockIds: readonly string[];
  readonly blockCount: number;
  readonly firstTextPreview: string;
  readonly lastTextPreview: string;
}

interface PlannedSectionReport {
  readonly id: string;
  readonly sourceSectionId: string;
  readonly title: string;
  readonly selectedCardKind: string;
  readonly targetItemCount: number;
  readonly sourceBlockIds: readonly string[];
}

type FaultLayer = "Stage 0" | "Stage 1" | "Stage 2" | "inconclusive";

interface DiagnosisSummary {
  readonly headingsSurvivedStage0: boolean;
  readonly stage0HeadingLikeBlockCount: number;
  readonly rawHeadingCandidateCount: number;
  readonly stage1ReceivedMultipleHeadingLikeBlocks: boolean;
  readonly stage1EmittedOneSectionDespiteMultipleRawHeadingCandidates: boolean;
  readonly stage1EmittedOneSectionDespiteMultipleHeadingLikeBlocks: boolean;
  readonly stage2MerelyPreservedOutlineSectionCount: boolean;
  readonly stage2HasExactSourceBlockIdsForStage3Echo: boolean;
  readonly likelyFaultLayer: FaultLayer;
}

interface DiagnosticReport {
  readonly fixture: {
    readonly sourceFileName: string;
    readonly sourceFilePath: string;
    readonly configuredSourceId: string;
    readonly derivedSourceId: string;
    readonly staleSdlcIdsDetected: boolean;
    readonly staleSdlcIds: readonly string[];
  };
  readonly stage0: {
    readonly sourceId: string;
    readonly title: string;
    readonly detectedTitleCandidate?: string;
    readonly totalBlockCount: number;
    readonly blocks: readonly BlockReport[];
    readonly headingCandidates: readonly TextMarker[];
    readonly tableOfContentsLikeLines: readonly TextMarker[];
    readonly sectionMarkers: readonly TextMarker[];
  };
  readonly stage1: {
    readonly outlineId: string;
    readonly outlineSectionCount: number;
    readonly sections: readonly OutlineSectionReport[];
  };
  readonly stage2: {
    readonly planId: string;
    readonly plannedSectionCount: number;
    readonly sections: readonly PlannedSectionReport[];
  };
  readonly diagnosisSummary: DiagnosisSummary;
}

const DIGITAL_COMPONENTS_SOURCE: FixtureSource = {
  title: "Digital Components",
  fileName: "digital-components.txt",
};

const FIXTURE_DIRECTORY_CANDIDATES = [
  join(process.cwd(), "scripts", "fixtures"),
  join(process.cwd(), "packages", "engine", "scripts", "fixtures"),
];
const PLACEHOLDER_PREFIX = "PLACEHOLDER:";
const PREVIEW_LENGTH = 140;
const STALE_ID_FRAGMENT = "live-sdlc-7-phases";

async function main(): Promise<void> {
  const fixturePath = await resolveFixturePath(DIGITAL_COMPONENTS_SOURCE.fileName);
  const text = await readFixtureText(fixturePath);
  const source = await normalizeSource(toNormalizationInput(text));
  const outline = await detectOutline(source);
  const plan = buildGenerationPlan(outline, source);
  const report = buildReport({
    fixturePath,
    text,
    source,
    outline,
    plan,
  });

  console.log(JSON.stringify(report, null, 2));
  console.log("");
  console.log(
    `Conclusion: likely fault layer = ${report.diagnosisSummary.likelyFaultLayer}`,
  );
}

async function resolveFixturePath(fileName: string): Promise<string> {
  for (const directory of FIXTURE_DIRECTORY_CANDIDATES) {
    const candidate = join(directory, fileName);
    try {
      const stats = await stat(candidate);
      if (stats.isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    `Unable to find ${fileName} in: ${FIXTURE_DIRECTORY_CANDIDATES.join(", ")}`,
  );
}

async function readFixtureText(fixturePath: string): Promise<string> {
  const text = (await readFile(fixturePath, "utf8")).trim();

  if (text.length === 0) {
    throw new Error(`Fixture ${fixturePath} is empty.`);
  }
  if (hasPlaceholderLine(text)) {
    throw new Error(
      `Fixture ${fixturePath} still contains a PLACEHOLDER line.`,
    );
  }

  return text;
}

function toNormalizationInput(text: string): SourceNormalizationInput {
  return {
    id: deriveLiveFixtureSourceId(DIGITAL_COMPONENTS_SOURCE.fileName),
    title: DIGITAL_COMPONENTS_SOURCE.title,
    kind: "plain-text",
    language: "en",
    text,
    metadata: {
      sourceName: DIGITAL_COMPONENTS_SOURCE.fileName,
    },
  };
}

function buildReport(args: {
  readonly fixturePath: string;
  readonly text: string;
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly plan: GenerationPlan;
}): DiagnosticReport {
  const sourceBlockById = new Map(
    args.source.blocks.map((block) => [block.id, block] as const),
  );
  const stage0Blocks = args.source.blocks.map(toBlockReport);
  const headingCandidates = collectHeadingCandidates(args.text, args.source);
  const sectionMarkers = collectSectionMarkers(args.text);
  const tableOfContentsLikeLines = collectTableOfContentsLikeLines(args.text);
  const stage1Sections = args.outline.sections.map((section) =>
    toOutlineSectionReport(section, sourceBlockById),
  );
  const stage2Sections = args.plan.sections.map(toPlannedSectionReport);
  const diagnosisSummary = summarizeDiagnosis({
    source: args.source,
    outline: args.outline,
    plan: args.plan,
    headingCandidates,
    sectionMarkers,
  });
  const ids = collectIds(args.source, args.outline, args.plan);
  const staleSdlcIds = ids.filter((id) => id.includes(STALE_ID_FRAGMENT));

  return {
    fixture: {
      sourceFileName: DIGITAL_COMPONENTS_SOURCE.fileName,
      sourceFilePath: args.fixturePath,
      configuredSourceId: deriveLiveFixtureSourceId(
        DIGITAL_COMPONENTS_SOURCE.fileName,
      ),
      derivedSourceId: args.source.id,
      staleSdlcIdsDetected: staleSdlcIds.length > 0,
      staleSdlcIds,
    },
    stage0: {
      sourceId: args.source.id,
      title: args.source.title,
      ...(detectedTitleCandidate(args.source.blocks)
        ? { detectedTitleCandidate: detectedTitleCandidate(args.source.blocks) }
        : {}),
      totalBlockCount: args.source.blocks.length,
      blocks: stage0Blocks,
      headingCandidates,
      tableOfContentsLikeLines,
      sectionMarkers,
    },
    stage1: {
      outlineId: args.outline.id,
      outlineSectionCount: args.outline.sections.length,
      sections: stage1Sections,
    },
    stage2: {
      planId: args.plan.id,
      plannedSectionCount: args.plan.sections.length,
      sections: stage2Sections,
    },
    diagnosisSummary,
  };
}

function toBlockReport(block: NormalizedSourceBlock): BlockReport {
  const headingLevel = markdownHeadingLevel(block.text);
  const headingSignals = headingSignalsForBlock(block);

  return {
    id: block.id,
    order: block.order,
    kind: block.kind,
    preview: preview(block.text),
    ...(headingLevel !== undefined ? { headingLevel } : {}),
    headingSignals,
  };
}

function toOutlineSectionReport(
  section: OutlineSection,
  sourceBlockById: ReadonlyMap<string, NormalizedSourceBlock>,
): OutlineSectionReport {
  const blocks = section.blockIds
    .map((blockId) => sourceBlockById.get(blockId))
    .filter(isDefined);
  const firstBlock = blocks[0];
  const lastBlock = blocks.at(-1);

  return {
    id: section.id,
    title: section.title,
    order: section.order,
    sourceBlockIds: section.blockIds,
    blockCount: section.blockIds.length,
    firstTextPreview: firstBlock ? preview(firstBlock.text) : "<missing>",
    lastTextPreview: lastBlock ? preview(lastBlock.text) : "<missing>",
  };
}

function toPlannedSectionReport(
  section: PlannedSection,
): PlannedSectionReport {
  return {
    id: section.id,
    sourceSectionId: section.sourceSectionId,
    title: section.title,
    selectedCardKind: section.schemaKind,
    targetItemCount: section.target.itemCount,
    sourceBlockIds: section.sourceBlockIds,
  };
}

function summarizeDiagnosis(args: {
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly plan: GenerationPlan;
  readonly headingCandidates: readonly TextMarker[];
  readonly sectionMarkers: readonly TextMarker[];
}): DiagnosisSummary {
  const headingLikeBlockCount = args.source.blocks.filter((block) =>
    isHeadingLikeBlock(block),
  ).length;
  const rawHeadingCandidateCount =
    args.headingCandidates.length + args.sectionMarkers.length;
  const headingsSurvivedStage0 = args.source.blocks.some(
    (block) => block.kind === "heading",
  );
  const stage1ReceivedMultipleHeadingLikeBlocks = headingLikeBlockCount > 1;
  const stage1EmittedOneSectionDespiteMultipleRawHeadingCandidates =
    args.outline.sections.length === 1 && rawHeadingCandidateCount > 1;
  const stage1EmittedOneSectionDespiteMultipleHeadingLikeBlocks =
    args.outline.sections.length === 1 && headingLikeBlockCount > 1;
  const stage2MerelyPreservedOutlineSectionCount =
    args.plan.sections.length === args.outline.sections.length;
  const stage2HasExactSourceBlockIdsForStage3Echo =
    plannedSectionsKeepExactSourceBlockIds(args.plan);
  const likelyFaultLayer = inferFaultLayer({
    headingLikeBlockCount,
    rawHeadingCandidateCount,
    outlineSectionCount: args.outline.sections.length,
    plannedSectionCount: args.plan.sections.length,
  });

  return {
    headingsSurvivedStage0,
    stage0HeadingLikeBlockCount: headingLikeBlockCount,
    rawHeadingCandidateCount,
    stage1ReceivedMultipleHeadingLikeBlocks,
    stage1EmittedOneSectionDespiteMultipleRawHeadingCandidates,
    stage1EmittedOneSectionDespiteMultipleHeadingLikeBlocks,
    stage2MerelyPreservedOutlineSectionCount,
    stage2HasExactSourceBlockIdsForStage3Echo,
    likelyFaultLayer,
  };
}

function inferFaultLayer(args: {
  readonly headingLikeBlockCount: number;
  readonly rawHeadingCandidateCount: number;
  readonly outlineSectionCount: number;
  readonly plannedSectionCount: number;
}): FaultLayer {
  if (args.rawHeadingCandidateCount > 1 && args.headingLikeBlockCount <= 1) {
    return "Stage 0";
  }
  if (args.headingLikeBlockCount > 1 && args.outlineSectionCount === 1) {
    return "Stage 1";
  }
  if (args.outlineSectionCount > 1 && args.plannedSectionCount === 1) {
    return "Stage 2";
  }
  return "inconclusive";
}

function plannedSectionsKeepExactSourceBlockIds(plan: GenerationPlan): boolean {
  return plan.sections.every((section) =>
    sameStringList(section.sourceBlockIds, section.target.requiredSourceBlockIds),
  );
}

function collectHeadingCandidates(
  text: string,
  source: NormalizedSource,
): readonly TextMarker[] {
  const blockCandidates = source.blocks
    .filter((block) => isHeadingLikeBlock(block))
    .map((block) => ({
      text: block.text,
      reason: "stage0-heading-like-block",
      blockId: block.id,
      order: block.order,
      preview: preview(block.text),
    }));
  const lineCandidates = linesWithNumbers(text)
    .filter((line) => isHeadingLikeText(line.text))
    .map((line) => ({
      text: line.text,
      reason: "raw-heading-like-line",
      lineNumber: line.lineNumber,
      preview: preview(line.text),
    }));

  return dedupeMarkers([...blockCandidates, ...lineCandidates]);
}

function collectTableOfContentsLikeLines(text: string): readonly TextMarker[] {
  return linesWithNumbers(text)
    .filter(
      (line) =>
        /table\s+of\s+contents/i.test(line.text) || hasBulletSeparator(line.text),
    )
    .map((line) => ({
      text: line.text,
      reason: /table\s+of\s+contents/i.test(line.text)
        ? "contains-table-of-contents"
        : "contains-bullet-separators",
      lineNumber: line.lineNumber,
      preview: preview(line.text),
    }));
}

function collectSectionMarkers(text: string): readonly TextMarker[] {
  const tocMarkers = collectTocMarkers(text);
  const repeatedMarkers = collectRepeatedKnownMarkers(text, tocMarkers);
  const codeMarkers = collectCodeReferenceMarkers(text);
  const referenceMarkers = collectReferenceMarkers(text);

  return dedupeMarkers([
    ...tocMarkers,
    ...repeatedMarkers,
    ...codeMarkers,
    ...referenceMarkers,
  ]);
}

function collectTocMarkers(text: string): readonly TextMarker[] {
  const tocIndex = text.search(/table\s+of\s+contents/i);

  if (tocIndex < 0) {
    return [];
  }

  const afterToc = text.slice(tocIndex).replace(/^table\s+of\s+contents/i, "");
  const markers: TextMarker[] = [];

  for (const rawItem of splitOnBullets(afterToc)) {
    const normalizedRawItem = normalizeWhitespace(rawItem);
    const item = normalizeWhitespace(trimLikelyTocItem(rawItem));

    if (item.length === 0) {
      continue;
    }

    markers.push({
      text: item,
      reason: "table-of-contents-bullet",
      offset: text.indexOf(item),
      count: countOccurrences(text, item),
      preview: preview(item),
    });

    if (item !== normalizedRawItem) {
      break;
    }
  }

  return markers;
}

function collectRepeatedKnownMarkers(
  text: string,
  tocMarkers: readonly TextMarker[],
): readonly TextMarker[] {
  return tocMarkers
    .map((marker) => marker.text)
    .filter((marker) => marker.length >= 4)
    .map((marker) => ({
      text: marker,
      reason: "toc-marker-repeated-in-source",
      offset: text.indexOf(marker),
      count: countOccurrences(text, marker),
      preview: preview(marker),
    }))
    .filter((marker) => (marker.count ?? 0) > 1);
}

function collectCodeReferenceMarkers(text: string): readonly TextMarker[] {
  const markers: TextMarker[] = [];
  const pattern = /\b(?:pinMode|digitalWrite|digitalRead)\s*\(\s*\)/g;
  const matches = text.matchAll(pattern);

  for (const match of matches) {
    const marker = match[0];
    markers.push({
      text: marker,
      reason: "code-reference-marker",
      ...(match.index !== undefined ? { offset: match.index } : {}),
      count: countOccurrences(text, marker),
      preview: marker,
    });
  }

  return markers;
}

function collectReferenceMarkers(text: string): readonly TextMarker[] {
  const matches = text.matchAll(/\bReferences\b/g);
  const markers: TextMarker[] = [];

  for (const match of matches) {
    markers.push({
      text: match[0],
      reason: "reference-section-marker",
      ...(match.index !== undefined ? { offset: match.index } : {}),
      count: countOccurrences(text, match[0]),
      preview: match[0],
    });
  }

  return markers;
}

function headingSignalsForBlock(
  block: NormalizedSourceBlock,
): readonly string[] {
  const signals: string[] = [];
  const headingLevel = markdownHeadingLevel(block.text);

  if (block.kind === "heading") {
    signals.push("kind=heading");
  }
  if (headingLevel !== undefined) {
    signals.push(`markdown-h${headingLevel}`);
  }
  if (isReasonableAllCapsHeading(block.text)) {
    signals.push("all-caps-heading-like");
  }
  if (isShortTitleLike(block.text)) {
    signals.push("short-title-like");
  }
  if (/table\s+of\s+contents/i.test(block.text)) {
    signals.push("contains-table-of-contents");
  }

  return signals;
}

function detectedTitleCandidate(
  blocks: readonly NormalizedSourceBlock[],
): string | undefined {
  return blocks.find((block) => block.kind === "heading")?.text;
}

function isHeadingLikeBlock(block: NormalizedSourceBlock): boolean {
  return headingSignalsForBlock(block).some(
    (signal) => signal !== "contains-table-of-contents",
  );
}

function isHeadingLikeText(text: string): boolean {
  return (
    markdownHeadingLevel(text) !== undefined ||
    isReasonableAllCapsHeading(text) ||
    isShortTitleLike(text)
  );
}

function markdownHeadingLevel(text: string): number | undefined {
  const match = /^(#{1,6})\s+\S/.exec(text.trim());
  return match ? match[1].length : undefined;
}

function isReasonableAllCapsHeading(text: string): boolean {
  const trimmed = text.trim();
  const letters = trimmed.match(/[A-Za-z]/g) ?? [];

  return (
    trimmed.length >= 3 &&
    trimmed.length <= 80 &&
    trimmed.split(/\s+/).length <= 10 &&
    letters.length >= 2 &&
    trimmed === trimmed.toUpperCase() &&
    !/[.!?]$/.test(trimmed)
  );
}

function isShortTitleLike(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);

  if (trimmed.length < 3 || trimmed.length > 80 || words.length > 10) {
    return false;
  }
  if (/[.!?]$/.test(trimmed)) {
    return false;
  }

  const wordLikeCount = words.filter((word) => /[A-Za-z]/.test(word)).length;
  const capitalizedCount = words.filter((word) =>
    /^(?:[A-Z][A-Za-z0-9()'.-]*|[A-Za-z][A-Za-z0-9]*\s*\(\s*\))$/.test(word),
  ).length;

  return wordLikeCount >= 1 && capitalizedCount / words.length >= 0.6;
}

function hasBulletSeparator(text: string): boolean {
  return /(?:\u2022|â€¢)/.test(text);
}

function splitOnBullets(text: string): readonly string[] {
  return text.split(/(?:\u2022|â€¢)/).map((item) => item.trim());
}

function trimLikelyTocItem(text: string): string {
  const withoutTrailingBody = text.split(/\s+(?=Digital\s+vs\.)/)[0] ?? text;
  const words = withoutTrailingBody.split(/\s+/).filter((word) => word.length > 0);

  return words.slice(0, 8).join(" ");
}

function collectIds(
  source: NormalizedSource,
  outline: SourceOutline,
  plan: GenerationPlan,
): readonly string[] {
  return [
    source.id,
    ...source.blocks.map((block) => block.id),
    outline.id,
    ...outline.sections.map((section) => section.id),
    plan.id,
    ...plan.sections.flatMap((section) => [
      section.id,
      section.sourceSectionId,
      ...section.sourceBlockIds,
    ]),
  ];
}

function linesWithNumbers(
  text: string,
): readonly { readonly lineNumber: number; readonly text: string }[] {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({
      lineNumber: index + 1,
      text: line.trim(),
    }))
    .filter((line) => line.text.length > 0);
}

function preview(text: string): string {
  const normalized = normalizeWhitespace(text);
  return normalized.length <= PREVIEW_LENGTH
    ? normalized
    : `${normalized.slice(0, PREVIEW_LENGTH - 3)}...`;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function dedupeMarkers(markers: readonly TextMarker[]): readonly TextMarker[] {
  const seen = new Set<string>();
  const deduped: TextMarker[] = [];

  for (const marker of markers) {
    const key = `${marker.reason}\u001f${marker.text}\u001f${marker.blockId ?? ""}\u001f${marker.lineNumber ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(marker);
    }
  }

  return deduped;
}

function countOccurrences(text: string, needle: string): number {
  if (needle.length === 0) {
    return 0;
  }

  let count = 0;
  let offset = text.indexOf(needle);

  while (offset >= 0) {
    count += 1;
    offset = text.indexOf(needle, offset + needle.length);
  }

  return count;
}

function sameStringList(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function hasPlaceholderLine(text: string): boolean {
  return text
    .split(/\r?\n/)
    .some((line) => line.trim().startsWith(PLACEHOLDER_PREFIX));
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined;
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
