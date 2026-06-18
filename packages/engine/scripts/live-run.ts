import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PipelineAssemblyError,
  type PipelineAssemblyErrorState,
  type SectionValidationFailure,
  runPipeline,
} from "../src/generate.js";
import { createOpenAIGenerationProvider } from "../src/providers/openai-provider.js";
import { extractGroundingSourceSectionText } from "../src/stage5a-grounding.js";
import {
  deriveLiveFixtureSourceId,
  type FixtureSource,
  type LoadedFixtureSource,
} from "./live-fixtures.js";
import type {
  CoverageReport,
  CoverageStatus,
  GroundingReport,
  LeakageReport,
  ReviewerOutput,
  SectionCoverageResult,
  SectionGroundingResult,
  SectionOutput,
  SourceNormalizationInput,
} from "../src/types.js";

const FIXTURE_SOURCES: readonly FixtureSource[] = [
  {
    title: "IT Security",
    fileName: "it-security.txt",
  },
  {
    title: "Digital Components",
    fileName: "digital-components.txt",
  },
  {
    title: "Arnis M1",
    fileName: "arnis-m1.txt",
  },
];

const FIXTURE_DIRECTORY = resolvePackagePath("scripts", "fixtures");
const PLACEHOLDER_PREFIX = "PLACEHOLDER:";

async function main(): Promise<void> {
  const fixtureSources = selectFixtureSources(process.argv.slice(2));
  const sources = await loadFixtureSources(fixtureSources);

  assertOpenAIAPIKeyPresent();

  const provider = createOpenAIGenerationProvider();
  let pipelineThrew = false;

  for (const source of sources) {
    printSourceHeader(source);
    const coverageLogCapture = captureCoverageLogs();

    try {
      const reviewer = await runPipeline({
        input: toPipelineInput(source),
        provider,
      });
      coverageLogCapture.flush();
      printReviewerSummary(reviewer);
    } catch (error) {
      coverageLogCapture.flush();
      pipelineThrew = true;
      printPipelineFailure(error);
    }
  }

  if (pipelineThrew) {
    process.exitCode = 1;
  }
}

async function loadFixtureSources(
  fixtureSources: readonly FixtureSource[],
): Promise<readonly LoadedFixtureSource[]> {
  const loadedSources: LoadedFixtureSource[] = [];

  for (const source of fixtureSources) {
    const text = await readFixtureText(source.fileName);
    loadedSources.push({
      ...source,
      id: deriveLiveFixtureSourceId(source.fileName),
      text,
    });
  }

  return loadedSources;
}

function selectFixtureSources(args: readonly string[]): readonly FixtureSource[] {
  if (args.length === 0) {
    return FIXTURE_SOURCES;
  }

  const requestedSelectors = new Set(args.map(normalizeFixtureSelector));
  const selectedSources = FIXTURE_SOURCES.filter((source) =>
    fixtureSelectors(source).some((selector) => requestedSelectors.has(selector)),
  );

  const knownSelectors = new Set(FIXTURE_SOURCES.flatMap(fixtureSelectors));
  const unknownArgs = args.filter(
    (arg) => !knownSelectors.has(normalizeFixtureSelector(arg)),
  );

  if (unknownArgs.length > 0) {
    throw new Error(
      `Unknown live fixture "${unknownArgs[0]}". Available fixtures: ${formatAvailableFixtures()}.`,
    );
  }

  return selectedSources;
}

function fixtureSelectors(source: FixtureSource): readonly string[] {
  return [
    source.title,
    source.fileName,
    source.fileName.replace(/\.[^.]+$/, ""),
    deriveLiveFixtureSourceId(source.fileName),
  ].map(normalizeFixtureSelector);
}

function normalizeFixtureSelector(selector: string): string {
  return selector
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatAvailableFixtures(): string {
  return FIXTURE_SOURCES.map((source) =>
    source.fileName.replace(/\.[^.]+$/, ""),
  ).join(", ");
}

async function readFixtureText(fileName: string): Promise<string> {
  const fixturePath = join(FIXTURE_DIRECTORY, fileName);
  const text = (await readFile(fixturePath, "utf8")).trim();

  if (text.length === 0) {
    throw new Error(`Fixture ${fileName} is empty.`);
  }
  if (hasPlaceholderLine(text)) {
    throw new Error(
      `Fixture ${fileName} still contains a PLACEHOLDER line. Replace it with the real source before running live-run.`,
    );
  }

  return text;
}

function toPipelineInput(source: LoadedFixtureSource): SourceNormalizationInput {
  return {
    id: source.id,
    title: source.title,
    kind: "plain-text",
    language: "en",
    text: source.text,
    metadata: {
      sourceName: source.fileName,
    },
  };
}

function printSourceHeader(source: FixtureSource): void {
  console.log("");
  console.log(`=== ${source.title} (${source.fileName}) ===`);
}

function printReviewerSummary(reviewer: ReviewerOutput): void {
  const passedCoverageCount = countCoverageSections(reviewer, "passed");
  const failedSections = sectionsWithCoverageStatus(reviewer, "failed");

  console.log(`Planned sections: ${reviewer.metadata.sectionCount}`);
  console.log(`Sections passed coverage: ${passedCoverageCount}`);
  console.log(`Failed sections: ${formatCoverageSections(failedSections)}`);
  console.log(
    `Coverage summary: ${formatCoverageSummary(reviewer.metadata.coverage)}`,
  );
  console.log(
    `Grounding summary: ${formatGroundingSummary(reviewer.metadata.grounding)}`,
  );
  console.log(
    `Leakage summary: ${formatLeakageSummary(reviewer.metadata.leakage)}`,
  );
  printReviewerSectionOutcomes(reviewer);
  console.log("Section validation failures: []");
  console.log("Leakage rejections: none");
  console.log("Final assembled reviewer:");
  console.log(JSON.stringify(reviewer, null, 2));
}

function printPipelineFailure(error: unknown): void {
  const leakageRejections = detectLeakageRejections(error);

  if (error instanceof PipelineAssemblyError) {
    printPipelineAssemblyFailure(error, leakageRejections);
    return;
  }

  console.error(
    "Planned sections: unavailable because pipeline threw before final reviewer assembly.",
  );
  console.error(
    "Sections passed coverage: unavailable because pipeline threw before final reviewer assembly.",
  );
  console.error(
    "Failed sections: unavailable because pipeline threw before final reviewer assembly.",
  );
  console.error(`Pipeline error: ${errorMessage(error)}`);
  console.error(
    `Leakage rejections: ${formatTextList(leakageRejections)}`,
  );
  console.error("Final assembled reviewer: unavailable because pipeline threw.");
}

function printPipelineAssemblyFailure(
  error: PipelineAssemblyError,
  leakageRejections: readonly string[],
): void {
  const { state } = error;
  const passedCoverageCount = countCoverageReportSections(
    state.coverage,
    "passed",
  );
  const failedSections = state.coverage.sections.filter(
    (section) => section.status === "failed",
  );

  console.error(`Planned sections: ${state.plan.sections.length}`);
  console.error(`Sections passed coverage: ${passedCoverageCount}`);
  console.error(`Failed sections: ${formatCoverageSections(failedSections)}`);
  console.error(`Coverage summary: ${formatCoverageSummary(state.coverage)}`);
  console.error(`Grounding summary: ${formatGroundingSummary(state.grounding)}`);
  console.error(`Leakage summary: ${formatLeakageSummary(state.leakage)}`);
  printPipelineSectionOutcomes(state);
  console.error(
    `Section validation failures: ${JSON.stringify(state.sectionValidationFailures, null, 2)}`,
  );
  console.error(`Pipeline error: ${error.message}`);
  console.error(`Leakage rejections: ${formatTextList(leakageRejections)}`);
  printFailedGroundingDiagnostics(state);
  console.error("Final assembled reviewer: unavailable because pipeline threw.");
}

function printReviewerSectionOutcomes(reviewer: ReviewerOutput): void {
  console.log("Per-section pass/fail table:");
  for (const section of reviewer.sections) {
    console.log(
      formatSectionOutcomeRow({
        status: "PASS",
        title: section.title,
        sectionId: section.plannedSectionId,
        stage: "stage3",
        reason: "-",
        groundingScore: section.groundingScore,
        groundingStatus: section.groundingStatus,
      }),
    );
  }
}

function printPipelineSectionOutcomes(state: PipelineAssemblyErrorState): void {
  const outputsBySectionId = new Map(
    state.outputs.map((output) => [output.plannedSectionId, output] as const),
  );
  const groundingBySectionId = new Map(
    state.grounding.sections.map(
      (section) => [section.plannedSectionId, section] as const,
    ),
  );
  const failuresBySectionId = new Map(
    state.sectionValidationFailures.map(
      (failure) => [failure.sectionId, failure] as const,
    ),
  );

  console.error("Per-section pass/fail table:");
  for (const section of state.plan.sections) {
    const failure = failuresBySectionId.get(section.id);
    const grounding = groundingBySectionId.get(section.id);
    console.error(
      formatSectionOutcomeRow({
        status:
          failure === undefined && outputsBySectionId.has(section.id)
            ? "PASS"
            : "FAIL",
        title: section.title,
        sectionId: section.id,
        stage: failure?.stage ?? "stage3",
        reason: formatValidationFailureReason(failure),
        groundingScore: grounding?.score,
        groundingStatus: grounding?.status,
      }),
    );
  }
}

function formatSectionOutcomeRow(args: {
  readonly status: "PASS" | "FAIL";
  readonly title: string;
  readonly sectionId: string;
  readonly stage: string;
  readonly reason: string;
  readonly groundingScore: number | undefined;
  readonly groundingStatus: string | undefined;
}): string {
  return [
    args.status.padEnd(4),
    args.title,
    args.sectionId,
    `stage=${args.stage}`,
    `reason=${args.reason}`,
    `grounding=${args.groundingScore ?? "n/a"}(${args.groundingStatus ?? "n/a"})`,
  ].join(" | ");
}

function formatValidationFailureReason(
  failure: SectionValidationFailure | undefined,
): string {
  if (!failure) {
    return "-";
  }
  return `${failure.reason}: ${failure.issues.join("; ")}`;
}

function countCoverageSections(
  reviewer: ReviewerOutput,
  status: CoverageStatus,
): number {
  return sectionsWithCoverageStatus(reviewer, status).length;
}

function sectionsWithCoverageStatus(
  reviewer: ReviewerOutput,
  status: CoverageStatus,
): readonly SectionCoverageResult[] {
  return reviewer.metadata.coverage.sections.filter(
    (section) => section.status === status,
  );
}

function countCoverageReportSections(
  coverage: CoverageReport,
  status: CoverageStatus,
): number {
  return coverage.sections.filter((section) => section.status === status).length;
}

function formatCoverageSections(
  sections: readonly SectionCoverageResult[],
): string {
  if (sections.length === 0) {
    return "none";
  }

  return sections
    .map((section) => {
      const issues =
        section.issues.length > 0 ? ` (${section.issues.join("; ")})` : "";
      return `${section.plannedSectionId}${issues}`;
    })
    .join(", ");
}

function formatCoverageSummary(coverage: CoverageReport): string {
  const weakCount = countCoverageReportSections(coverage, "weak");
  const failedCount = countCoverageReportSections(coverage, "failed");
  return [
    `status=${coverage.status}`,
    `score=${coverage.score}`,
    `sourceSections=${coverage.sourceSectionsCovered}/${coverage.sourceSectionsTotal}`,
    `passedSections=${countCoverageReportSections(coverage, "passed")}`,
    `weakSections=${weakCount}`,
    `failedSections=${failedCount}`,
  ].join(" ");
}

function formatGroundingSummary(grounding: GroundingReport): string {
  const failedSections = grounding.sections.filter(
    (section) => section.status === "failed",
  ).length;
  return [
    `status=${grounding.status}`,
    `score=${grounding.score}`,
    `threshold=${grounding.threshold}`,
    `failedSections=${failedSections}`,
    `issues=${grounding.issues.length}`,
    `phase1FabricationFails=${grounding.phase1FabricationFails}`,
  ].join(" ");
}

function formatLeakageSummary(leakage: LeakageReport): string {
  const failedSections = leakage.sections.filter(
    (section) => section.status === "failed",
  ).length;
  return [
    `status=${leakage.status}`,
    `failedSections=${failedSections}`,
    `issues=${leakage.issues.length}`,
  ].join(" ");
}

function printFailedGroundingDiagnostics(
  state: PipelineAssemblyErrorState,
): void {
  const failedGroundingSections = state.grounding.sections.filter(
    (section) => section.status === "failed",
  );

  if (failedGroundingSections.length === 0) {
    return;
  }

  for (const groundingSection of failedGroundingSections) {
    const plannedSection = state.plan.sections.find(
      (section) => section.id === groundingSection.plannedSectionId,
    );
    const sourceSection = state.outline.sections.find(
      (section) => section.id === groundingSection.sourceSectionId,
    );
    const output = state.outputs.find(
      (candidate) =>
        candidate.plannedSectionId === groundingSection.plannedSectionId,
    );
    const sourceSpan =
      sourceSection === undefined
        ? ""
        : extractGroundingSourceSectionText(state.source, sourceSection);

    console.error(
      `Failed grounding section: ${plannedSection?.title ?? "unknown"} (${groundingSection.plannedSectionId})`,
    );
    console.error(`Source section id: ${groundingSection.sourceSectionId}`);
    console.error(`Grounding score: ${groundingSection.score}`);
    console.error(
      `Grounding issue details: ${formatGroundingIssues(groundingSection)}`,
    );
    console.error(`Generated sourceCore: ${formatSourceCore(output)}`);
    console.error(`Exact source span: ${JSON.stringify(sourceSpan)}`);
  }
}

function formatGroundingIssues(section: SectionGroundingResult): string {
  return section.issues.length === 0
    ? "none"
    : JSON.stringify(section.issues, null, 2);
}

function formatSourceCore(output: SectionOutput | undefined): string {
  if (!output) {
    return "unavailable";
  }

  return JSON.stringify(output.sourceCore, null, 2);
}

function detectLeakageRejections(error: unknown): readonly string[] {
  const message = errorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("leaked instruction wording") ||
    normalizedMessage.includes("instruction-leakage")
  ) {
    return [message];
  }

  return [];
}

function captureCoverageLogs(): { readonly flush: () => void } {
  const originalConsoleInfo = console.info;
  let latestCoverageLog: Readonly<Record<string, unknown>> | undefined;
  let coverageLogCount = 0;
  let flushed = false;

  console.info = (...values: readonly unknown[]) => {
    const coverageLog = parseCoverageLog(values);
    if (!coverageLog) {
      originalConsoleInfo(...values);
      return;
    }

    latestCoverageLog = coverageLog;
    coverageLogCount += 1;
  };

  return {
    flush: () => {
      if (flushed) {
        return;
      }
      flushed = true;
      console.info = originalConsoleInfo;

      if (latestCoverageLog) {
        originalConsoleInfo(
          JSON.stringify({
            ...latestCoverageLog,
            validationRuns: coverageLogCount,
          }),
        );
      }
    },
  };
}

function parseCoverageLog(
  values: readonly unknown[],
): Readonly<Record<string, unknown>> | undefined {
  if (values.length !== 1 || typeof values[0] !== "string") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(values[0]) as unknown;
    return isRecord(parsed) &&
      parsed["event"] === "reviewer.coverage.completed"
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function formatTextList(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join("; ");
}

function hasPlaceholderLine(text: string): boolean {
  return text
    .split(/\r?\n/)
    .some((line) => line.trim().startsWith(PLACEHOLDER_PREFIX));
}

function assertOpenAIAPIKeyPresent(): void {
  const apiKey = process.env.OPENAI_API_KEY;

  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("OPENAI_API_KEY must be set in the environment.");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolvePackagePath(...pathSegments: readonly string[]): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const parentDirectory = dirname(moduleDirectory);
  const packageDirectory =
    basename(parentDirectory) === "dist-live"
      ? dirname(parentDirectory)
      : parentDirectory;

  return join(packageDirectory, ...pathSegments);
}

try {
  await main();
} catch (error) {
  console.error(errorMessage(error));
  process.exitCode = 1;
}
