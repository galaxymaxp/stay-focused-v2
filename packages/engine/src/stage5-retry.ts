import type { GenerationProvider } from "./provider";
import { validateLeakage } from "./leakage-guard.js";
import {
  collectSectionSourceBlocks,
  generateSections,
  generateSection,
  SectionProviderError,
  SectionValidationError,
} from "./stage3-generate.js";
import { normalizeCoverageTitleKey, verifyCoverage } from "./stage4-verify.js";
import {
  extractGroundingSourceSectionText,
  validateGrounding,
} from "./stage5a-grounding.js";
import { extractCleanSourceItems } from "./source-items.js";
import { extractProtectedSourceTokens } from "./source-token-fidelity.js";
import { serializeSemanticUnits } from "./semantic-structure.js";
import {
  analyzeRecoveryEvidence,
  selectRecoveryExplanation,
} from "./recovery-evidence.js";
import {
  findMissingRequiredEvidenceTargets,
  requiredEvidenceTargetIsRepresented,
  requiredEvidenceSourceIsAvailable,
} from "./required-evidence.js";
import {
  diagnoseStudentVisibleUsefulness,
  explanationHasUsefulForm,
  type StudentVisibleUsefulnessIssue,
} from "./reviewer-usefulness.js";
import { reviewerDispositionFor } from "./reviewer-section-support.js";
import { validateDeterministicSectionEvidence } from "./reviewer-evidence-assembly.js";
import {
  assembleDeterministicSectionEvidence,
  attachGeneratedExplanation,
} from "./reviewer-evidence-assembly.js";
import type {
  CoverageReport,
  CoverageStatus,
  GenerationPlan,
  GroundingReport,
  LeakageReport,
  NormalizedSource,
  PlannedSection,
  RetryPolicy,
  SectionCoverageResult,
  SectionGroundingResult,
  SectionLeakageResult,
  SectionOutput,
  ReviewerSectionQualityStatus,
  RequiredEvidenceTarget,
  SourceOutline,
} from "./types";

export interface RetryFailedSectionsArgs {
  readonly outputs: readonly SectionOutput[];
  readonly coverage: CoverageReport;
  readonly grounding?: GroundingReport;
  readonly leakage?: LeakageReport;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly provider: GenerationProvider;
  readonly retryPolicy?: RetryPolicy;
  readonly model?: string;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly skipProviderRetries?: boolean;
  readonly onValidationFailure?: (
    section: PlannedSection,
    error: SectionValidationError,
  ) => void;
  readonly onRetryAttempt?: (
    section: PlannedSection,
    attempt: number,
  ) => void;
  readonly onProviderFailure?: (section: PlannedSection, error: unknown) => void;
  readonly onSectionRecovered?: (
    section: PlannedSection,
    status: Exclude<ReviewerSectionQualityStatus, "generated">,
  ) => void;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 2,
  retryWeakSections: true,
  retryFailedSections: true,
};

export async function retryFailedSections(
  args: RetryFailedSectionsArgs,
): Promise<readonly SectionOutput[]> {
  validateArgs(args);

  const { plan, source, outline, provider, coverage, grounding, leakage } = args;
  const retryPolicy = args.retryPolicy ?? defaultRetryPolicy;
  validateRetryPolicy(retryPolicy);
  validatePlanAndReports({ plan, source, outline, coverage, grounding, leakage });

  if (plan.sections.every((section) => section.requiredEvidence !== undefined)) {
    const priorBySectionId = new Map(
      args.outputs.map((output) => [output.plannedSectionId, output] as const),
    );
    const deterministicOutputs = plan.sections.flatMap((section) => {
      const existing = priorBySectionId.get(section.id);
      if (existing?.deterministicEvidence) return [existing];
      try {
        const base = assembleDeterministicSectionEvidence({
          section,
          sourceBlocks: source.blocks.filter((block) => section.sourceBlockIds.includes(block.id)),
        });
        return [existing?.sourceCore.explanation
          ? attachGeneratedExplanation(base, existing.sourceCore.explanation)
          : base];
      } catch {
        // Source-absent evidence remains an engine/planning failure and is not
        // handed to the provider for reconstruction.
        return existing ? [existing] : [];
      }
    });
    return retryDeterministicExplanations(
      { ...args, outputs: deterministicOutputs },
      retryPolicy,
    );
  }

  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  const currentOutputs = new Map<string, SectionOutput>();
  for (const output of args.outputs) {
    if (
      plannedSectionIds.has(output.plannedSectionId) &&
      !currentOutputs.has(output.plannedSectionId)
    ) {
      currentOutputs.set(output.plannedSectionId, output);
    }
  }

  const coverageBySectionId = new Map(
    coverage.sections.map((result) => [result.plannedSectionId, result] as const),
  );
  const groundingBySectionId = new Map(
    (grounding?.sections ?? []).map(
      (result) => [result.plannedSectionId, result] as const,
    ),
  );
  const leakageBySectionId = new Map(
    (leakage?.sections ?? []).map(
      (result) => [result.plannedSectionId, result] as const,
    ),
  );

  for (const section of plan.sections) {
    if (reviewerDispositionFor(section) !== "standalone") continue;
    if (!requiredEvidenceSourceIsAvailable({
      section,
      sourceBlocks: source.blocks.filter((block) => section.sourceBlockIds.includes(block.id)),
    })) {
      // Source-absent evidence is an engine/planning failure. Even the legacy
      // compatibility path must never ask a provider to synthesize it.
      continue;
    }
    let sectionCoverage = requireCoverageResult(section, coverageBySectionId);
    let sectionGrounding = groundingBySectionId.get(section.id);
    let sectionLeakage = leakageBySectionId.get(section.id);
    let sectionUsefulness = diagnoseUsefulness(
      section,
      source,
      currentOutputs.get(section.id),
    );
    if (
      !shouldRetry(
        sectionCoverage,
        sectionGrounding,
        sectionLeakage,
        sectionUsefulness,
        retryPolicy,
      )
    ) {
      continue;
    }

    for (let attempt = 1; attempt <= retryPolicy.maxRetries; attempt += 1) {
      args.onRetryAttempt?.(section, attempt);
      let generated: SectionOutput;
      const previousCandidate = currentOutputs.get(section.id);
      const missingRequiredEvidence = findMissingRequiredEvidenceTargets(
        section,
        previousCandidate,
      );
      const acceptedContent = collectAcceptedContent({
        output: previousCandidate,
        grounding: sectionGrounding,
        leakage: sectionLeakage,
        usefulness: sectionUsefulness,
      });
      try {
        generated = await generateSection({
          section,
          plan,
          source,
          provider,
          model: args.model,
          temperature: args.temperature,
          retryGuidance: buildRetryGuidance(
            section,
            source,
            sectionCoverage,
            sectionGrounding,
            sectionLeakage,
            sectionUsefulness,
          ),
          repairContext: {
            previousCandidate,
            missingRequiredEvidence,
            acceptedContent,
            usefulnessDiagnostics: sectionUsefulness.map(
              (issue) => `${issue.type} in ${issue.fieldPath}: ${issue.message}`,
            ),
          },
          legacyFullSectionGeneration: true,
          metadata: {
            ...args.metadata,
            retryAttempt: attempt,
          },
        });
      } catch (error) {
        if (error instanceof SectionValidationError) {
          args.onValidationFailure?.(section, error);
          continue;
        }
        if (error instanceof SectionProviderError) {
          args.onProviderFailure?.(section, error);
          continue;
        }
        throw error;
      }

      generated = section.requiredEvidence !== undefined && previousCandidate !== undefined &&
          (missingRequiredEvidence.length > 0 || sectionUsefulness.length > 0)
        ? mergeSectionRepair({
            previous: previousCandidate,
            generated,
            missingRequiredEvidence,
            usefulness: sectionUsefulness,
            acceptedContent,
          })
        : generated;
      currentOutputs.set(section.id, generated);
      const refreshed = refreshSectionReports({
        section,
        currentOutputs,
        plan,
        source,
        outline,
        groundingEnabled: grounding !== undefined,
        leakageEnabled: leakage !== undefined,
      });
      sectionCoverage = refreshed.coverage;
      sectionGrounding = refreshed.grounding;
      sectionLeakage = refreshed.leakage;
      sectionUsefulness = diagnoseUsefulness(section, source, generated);
      if (
        isSectionAccepted(
          sectionCoverage,
          sectionGrounding,
          sectionLeakage,
        ) && sectionUsefulness.length === 0
      ) {
        args.onSectionRecovered?.(section, "repaired");
        break;
      }
    }

    if (
      isSectionAccepted(sectionCoverage, sectionGrounding, sectionLeakage) &&
      sectionUsefulness.length === 0
    ) {
      continue;
    }

    const sourceOutlineSection = outline.sections.find(
      (candidate) => candidate.id === section.sourceSectionId,
    );
    const sourceTextOverride = sourceOutlineSection
      ? extractGroundingSourceSectionText(source, sourceOutlineSection)
      : undefined;
    if (!requiredEvidenceSourceIsAvailable({
      section,
      sourceBlocks: source.blocks.filter((block) => section.sourceBlockIds.includes(block.id)),
    })) {
      // A fallback must not turn a source-absent plan label into evidence.
      continue;
    }
    const fallbackOutput = createExtractiveSectionFallback({
      section,
      source,
      sourceTextOverride,
      otherSectionTitles: plan.sections.filter((candidate) => candidate.id !== section.id).map((candidate) => candidate.title),
    });
    if (!fallbackOutput) {
      currentOutputs.delete(section.id);
      continue;
    }

    currentOutputs.set(section.id, fallbackOutput);
    let fallbackReports = refreshSectionReports({
      section,
      currentOutputs,
      plan,
      source,
      outline,
      groundingEnabled: grounding !== undefined,
      leakageEnabled: leakage !== undefined,
    });
    let accepted = isSectionAccepted(
      fallbackReports.coverage,
      fallbackReports.grounding,
      fallbackReports.leakage,
    ) && isOutputUseful(section, source, fallbackOutput);
    if (!accepted) {
      const blockFallback = createExtractiveSectionFallback({
        section,
        source,
        sourceTextOverride,
        otherSectionTitles: plan.sections.filter((candidate) => candidate.id !== section.id).map((candidate) => candidate.title),
        mode: "blocks",
      });
      if (blockFallback) {
        currentOutputs.set(section.id, blockFallback);
        fallbackReports = refreshSectionReports({
          section,
          currentOutputs,
          plan,
          source,
          outline,
          groundingEnabled: grounding !== undefined,
          leakageEnabled: leakage !== undefined,
        });
        accepted = isSectionAccepted(
          fallbackReports.coverage,
          fallbackReports.grounding,
          fallbackReports.leakage,
        ) && isOutputUseful(section, source, blockFallback);
      }
    }
    if (!accepted) {
      const lineFallback = createExtractiveSectionFallback({
        section,
        source,
        sourceTextOverride,
        otherSectionTitles: plan.sections.filter((candidate) => candidate.id !== section.id).map((candidate) => candidate.title),
        mode: "lines",
      });
      if (lineFallback) {
        currentOutputs.set(section.id, lineFallback);
        fallbackReports = refreshSectionReports({
          section,
          currentOutputs,
          plan,
          source,
          outline,
          groundingEnabled: grounding !== undefined,
          leakageEnabled: leakage !== undefined,
        });
        accepted = isSectionAccepted(
          fallbackReports.coverage,
          fallbackReports.grounding,
          fallbackReports.leakage,
        ) && isOutputUseful(section, source, lineFallback);
      }
    }
    if (!accepted) {
      const spanFallback = createExtractiveSectionFallback({
        section,
        source,
        sourceTextOverride,
        otherSectionTitles: plan.sections.filter((candidate) => candidate.id !== section.id).map((candidate) => candidate.title),
        mode: "span",
      });
      if (spanFallback) {
        currentOutputs.set(section.id, spanFallback);
        fallbackReports = refreshSectionReports({
          section,
          currentOutputs,
          plan,
          source,
          outline,
          groundingEnabled: grounding !== undefined,
          leakageEnabled: leakage !== undefined,
        });
        accepted = isSectionAccepted(
          fallbackReports.coverage,
          fallbackReports.grounding,
          fallbackReports.leakage,
        ) && isOutputUseful(section, source, spanFallback);
      }
    }
    if (accepted) {
      args.onSectionRecovered?.(section, "extractive_fallback");
    }
  }

  return orderedOutputs(plan, currentOutputs);
}

async function retryDeterministicExplanations(
  args: RetryFailedSectionsArgs,
  retryPolicy: RetryPolicy,
): Promise<readonly SectionOutput[]> {
  const currentOutputs = new Map(
    args.outputs.map((output) => [output.plannedSectionId, output] as const),
  );

  const maxExplanationRetries = args.skipProviderRetries
    ? 0
    : retryPolicy.maxRetries;
  for (let attempt = 1; attempt <= maxExplanationRetries; attempt += 1) {
    const reports = refreshAllReports(args, currentOutputs);
    const candidates = args.plan.sections.filter((section) => {
      if (reviewerDispositionFor(section) !== "standalone") return false;
      const output = currentOutputs.get(section.id);
      if (!output?.deterministicEvidence) return false;
      if (!validateDeterministicSectionEvidence(section, output).valid) {
        // Missing or changed deterministic evidence is an engine/ownership
        // failure. A provider must never reconstruct it.
        return false;
      }
      const grounding = reports.grounding?.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      const leakage = reports.leakage?.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      const usefulness = diagnoseUsefulness(section, args.source, output);
      const explanationGroundingFailure = grounding?.issues.some((issue) =>
        issue.fieldPath === "sourceCore.explanation",
      ) ?? false;
      const explanationLeakageFailure = leakage?.issues.some((issue) =>
        issue.fieldPath === "sourceCore.explanation",
      ) ?? false;
      return !output.sourceCore.explanation.trim() || explanationGroundingFailure ||
        explanationLeakageFailure || usefulness.length > 0;
    });
    if (candidates.length === 0) break;

    candidates.forEach((section) => args.onRetryAttempt?.(section, attempt));
    const generated = await generateSections({
      sections: candidates,
      plan: args.plan,
      source: args.source,
      provider: args.provider,
      model: args.model,
      temperature: args.temperature,
      metadata: { ...args.metadata, retryAttempt: attempt },
    });
    for (const failure of generated.validationFailures) {
      const section = candidates.find((candidate) => candidate.id === failure.sectionId);
      if (section) args.onValidationFailure?.(section, failure);
    }
    for (const providerError of generated.providerErrors) {
      for (const sectionId of generated.failedSectionIds) {
        const section = candidates.find((candidate) => candidate.id === sectionId);
        if (section) args.onProviderFailure?.(section, providerError);
      }
    }
    for (const output of generated.outputs) {
      if (generated.failedSectionIds.includes(output.plannedSectionId)) continue;
      currentOutputs.set(output.plannedSectionId, output);
    }

    const refreshed = refreshAllReports(args, currentOutputs);
    for (const section of candidates) {
      const output = currentOutputs.get(section.id);
      const sectionCoverage = refreshed.coverage.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      const sectionGrounding = refreshed.grounding?.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      const sectionLeakage = refreshed.leakage?.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      if (
        output && isSectionAccepted(sectionCoverage, sectionGrounding, sectionLeakage) &&
        diagnoseUsefulness(section, args.source, output).length === 0
      ) {
        args.onSectionRecovered?.(section, "repaired");
      }
    }
  }

  const finalReports = refreshAllReports(args, currentOutputs);
  for (const section of args.plan.sections) {
    if (reviewerDispositionFor(section) !== "standalone") continue;
    const output = currentOutputs.get(section.id);
    if (!output?.deterministicEvidence) continue;
    const coverage = finalReports.coverage.sections.find(
      (candidate) => candidate.plannedSectionId === section.id,
    );
    if (!validateDeterministicSectionEvidence(section, output).valid) continue;
    const grounding = finalReports.grounding?.sections.find(
      (candidate) => candidate.plannedSectionId === section.id,
    );
    const leakage = finalReports.leakage?.sections.find(
      (candidate) => candidate.plannedSectionId === section.id,
    );
    const accepted = isSectionAccepted(coverage, grounding, leakage) &&
      diagnoseUsefulness(section, args.source, output).length === 0;
    if (accepted) continue;
    const explanation = extractiveExplanationFor(section, args.source);
    if (!explanation) continue;
    currentOutputs.set(section.id, {
      ...output,
      sourceCore: { explanation, keyPoints: [...output.sourceCore.keyPoints] },
    } as SectionOutput);
    args.onSectionRecovered?.(section, "extractive_fallback");
  }

  return orderedOutputs(args.plan, currentOutputs);
}

function extractiveExplanationFor(
  section: PlannedSection,
  source: NormalizedSource,
): string | undefined {
  const candidates = collectSectionSourceBlocks(section, source)
    .filter((block) =>
      block.kind !== "heading" && block.kind !== "code" &&
      block.kind !== "formula" && block.kind !== "table" && block.kind !== "image",
    )
    .flatMap((block) => block.text.split(/(?<=[.!?])\s+|\r?\n/u))
    .map((value) => value.trim())
    .filter((value) => countWords(value) <= 55)
    .find((value) => explanationHasUsefulForm(section.title, value));
  return candidates;
}

function refreshAllReports(
  args: RetryFailedSectionsArgs,
  currentOutputs: ReadonlyMap<string, SectionOutput>,
): {
  readonly coverage: CoverageReport;
  readonly grounding: GroundingReport | undefined;
  readonly leakage: LeakageReport | undefined;
} {
  const outputs = orderedOutputs(args.plan, currentOutputs);
  return {
    coverage: verifyCoverage({
      outputs,
      plan: args.plan,
      source: args.source,
      outline: args.outline,
    }),
    grounding: args.grounding === undefined ? undefined : validateGrounding({
      outputs,
      plan: args.plan,
      source: args.source,
      outline: args.outline,
    }),
    leakage: args.leakage === undefined ? undefined : validateLeakage({
      outputs,
      plan: args.plan,
      source: args.source,
    }),
  };
}

function refreshSectionReports(args: {
  readonly section: PlannedSection;
  readonly currentOutputs: ReadonlyMap<string, SectionOutput>;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly groundingEnabled: boolean;
  readonly leakageEnabled: boolean;
}): {
  readonly coverage: SectionCoverageResult;
  readonly grounding: SectionGroundingResult | undefined;
  readonly leakage: SectionLeakageResult | undefined;
} {
  const outputs = orderedOutputs(args.plan, args.currentOutputs);
  const refreshedCoverage = verifyCoverage({
    outputs,
    plan: args.plan,
    source: args.source,
    outline: args.outline,
  });
  const refreshedGrounding = args.groundingEnabled
    ? validateGrounding({
        outputs,
        plan: args.plan,
        source: args.source,
        outline: args.outline,
      })
    : undefined;
  const refreshedLeakage = args.leakageEnabled
    ? validateLeakage({
        outputs,
        plan: args.plan,
        source: args.source,
      })
    : undefined;
  const coverage = refreshedCoverage.sections.find(
    (candidate) => candidate.plannedSectionId === args.section.id,
  );
  if (!coverage) {
    throw new Error(
      `Stage 5 coverage is missing planned section "${args.section.id}".`,
    );
  }

  return {
    coverage,
    grounding: refreshedGrounding?.sections.find(
      (candidate) => candidate.plannedSectionId === args.section.id,
    ),
    leakage: refreshedLeakage?.sections.find(
      (candidate) => candidate.plannedSectionId === args.section.id,
    ),
  };
}

export function createExtractiveSectionFallback(args: {
  readonly section: PlannedSection;
  readonly source: NormalizedSource;
  readonly sourceTextOverride?: string;
  readonly otherSectionTitles?: readonly string[];
  readonly mode?: "items" | "blocks" | "lines" | "span";
}): SectionOutput | undefined {
  const sourceBlocks = collectSectionSourceBlocks(args.section, args.source);
  const sourceText =
    args.sourceTextOverride?.trim() ||
    sourceBlocks.map((block) => block.text).join("\n").trim();
  if (sourceText.length === 0) {
    return undefined;
  }
  if (isCrossSectionNavigation(args.section, sourceText, args.otherSectionTitles ?? [])) {
    return undefined;
  }

  const detectedItems = extractCleanSourceItems({
    sourceSpanText: sourceText,
    sectionTitle: args.section.title,
  }).map((item) => normalizeBlockText(item.text));
  const sourceLines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extractiveItems = detectedItems.map(
    (item) => {
      const restoredItem = restoreProtectedSourceTokens(item, sourceText);
      return (
      findRawItemText(restoredItem, sourceText) ??
      sourceLines.find(
        (line) =>
          normalizeCoverageTitleKey(line) === normalizeCoverageTitleKey(restoredItem),
      ) ?? restoredItem
      );
    },
  );
  const usableExtractiveItems = extractiveItems.filter(
    (item) => countWords(item) <= 40,
  );
  const semanticItems = args.section.semanticPlan?.units.length
    ? serializeSemanticUnits(args.section.semanticPlan.units)
    : [];
  const hasStructuredEvidence = evidenceHasStructuredSemanticUnits(args.section);
  const evidence = analyzeRecoveryEvidence({
    sourceText,
    sectionTitle: args.section.title,
    documentText: args.source.blocks.map((block) => block.text).join("\n"),
  });
  const explanation = hasStructuredEvidence || evidence.mappings.length > 0 || evidence.sequence.length > 0
    ? ""
    : selectRecoveryExplanation(evidence);
  const usefulCandidates = evidence.candidates
    .filter(
      (candidate) =>
        candidate.score > 0 &&
        candidate.kind !== "noise" &&
        candidate.wordCount <= 40,
    )
    .sort((left, right) => left.position - right.position)
    .filter((candidate, index, candidates) =>
      !candidates.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.text.length > candidate.text.length &&
          normalizeCoverageTitleKey(other.text).includes(
            normalizeCoverageTitleKey(candidate.text),
          ),
      ),
    )
    .map((candidate) => candidate.text);
  const usefulSourceLines = sourceLines.filter((line) =>
    evidence.candidates.some(
      (candidate) =>
        candidate.score > 0 &&
        candidate.kind !== "noise" &&
        normalizeCoverageTitleKey(candidate.text) === normalizeCoverageTitleKey(line),
    ),
  );
  const sourceParagraphs = sourceText
    .split(/(?:\r?\n){2,}/)
    .map((paragraph) => normalizeBlockText(paragraph))
    .filter((paragraph) => paragraph.length > 0 && countWords(paragraph) <= 40);
  const usefulParagraphs = sourceParagraphs.filter((paragraph) =>
    evidence.candidates.some(
      (candidate) =>
        candidate.score > 0 &&
        candidate.kind !== "noise" &&
        normalizeCoverageTitleKey(candidate.text) === normalizeCoverageTitleKey(paragraph),
    ),
  );
  const preferRankedEvidence = sourceBlocks.some(
    (block) => block.metadata?.layoutStatus === "ocr_supplemented",
  );

  const keyPoints = uniqueExtracts(
    semanticItems.length > 0
      ? semanticItems
      : args.mode === "span"
      ? [
          sourceText,
          ...extractiveItems.filter(
            (item) =>
              !normalizeCoverageTitleKey(sourceText).includes(
                normalizeCoverageTitleKey(item),
              ),
          ),
        ]
      : args.mode === "lines"
      ? preferRankedEvidence && usefulCandidates.length > 0
        ? usefulCandidates.slice(0, 8)
        : usefulSourceLines
      : preferRankedEvidence && usefulCandidates.length > 0
      ? usefulCandidates.slice(0, 8)
      : args.mode !== "blocks" && usableExtractiveItems.length > 0
      ? usableExtractiveItems
      : usefulParagraphs.length > 0
        ? usefulParagraphs.slice(0, 8)
        : usefulCandidates.length > 0
          ? usefulCandidates.slice(0, 8)
          : usefulSourceLines.slice(0, 8),
  );
  const visibleKeyPoints = keyPoints.filter(
    (point) => normalizeCoverageTitleKey(point) !== normalizeCoverageTitleKey(explanation),
  );
  if (!explanation && visibleKeyPoints.length === 0) return undefined;
  return {
    id: stableId("extractive", `${args.source.id}\u001f${args.section.id}`),
    kind: args.section.schemaKind,
    plannedSectionId: args.section.id,
    title: args.section.title,
    sourceBlockIds: [...args.section.sourceBlockIds],
    sourceCore: {
      explanation,
      keyPoints: visibleKeyPoints.length > 0 ? visibleKeyPoints : [explanation],
    },
    enrichment: null,
  } as SectionOutput;
}

function normalizeBlockText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function evidenceHasStructuredSemanticUnits(section: PlannedSection): boolean {
  return section.semanticPlan?.units.some(
    (unit) => unit.kind === "mapping" || unit.kind === "sequence",
  ) ?? false;
}

function countWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function uniqueExtracts(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findRawItemText(item: string, sourceText: string): string | undefined {
  const components = item.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (components.length === 0) return undefined;
  const match = new RegExp(
    components.map(escapeRegExp).join("[^\\p{L}\\p{N}]+"),
    "iu",
  ).exec(sourceText);
  return match?.[0].trim();
}

function restoreProtectedSourceTokens(item: string, sourceText: string): string {
  return extractProtectedSourceTokens(sourceText).reduce((restored, token) => {
    if (restored.includes(token.text)) return restored;
    const components = token.text.match(/[\p{L}\p{N}]+/gu) ?? [];
    if (components.length === 0) return restored;
    const pattern = new RegExp(
      components.map(escapeRegExp).join("[^\\p{L}\\p{N}]*"),
      "iu",
    );
    if (!pattern.test(restored)) return restored;
    const candidate = restored.replace(pattern, token.text);
    return alphaNumericKey(candidate) === alphaNumericKey(restored)
      ? candidate
      : restored;
  }, item);
}

function alphaNumericKey(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function validateArgs(args: RetryFailedSectionsArgs): void {
  if (!args || !Array.isArray(args.outputs)) {
    throw new Error("Stage 5 retry requires generated outputs.");
  }
  if (!isRecord(args.coverage)) {
    throw new Error("Stage 5 retry requires a coverage report.");
  }
  if (!isRecord(args.plan)) {
    throw new Error("Stage 5 retry requires a generation plan.");
  }
  if (!isRecord(args.source)) {
    throw new Error("Stage 5 retry requires a normalized source.");
  }
  if (!isRecord(args.outline)) {
    throw new Error("Stage 5 retry requires a source outline.");
  }
  if (!args.provider || typeof args.provider.generate !== "function") {
    throw new Error("Stage 5 retry requires a generation provider.");
  }
}

function validateRetryPolicy(policy: RetryPolicy): void {
  if (
    !Number.isInteger(policy.maxRetries) ||
    policy.maxRetries < 0 ||
    policy.maxRetries > 5
  ) {
    throw new Error(
      "Stage 5 retry policy maxRetries must be an integer between 0 and 5.",
    );
  }
}

function validatePlanAndReports(args: {
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly coverage: CoverageReport;
  readonly grounding?: GroundingReport;
  readonly leakage?: LeakageReport;
}): void {
  const { plan, source, outline, coverage, grounding, leakage } = args;
  if (!Array.isArray(plan.sections) || plan.sections.length === 0) {
    throw new Error("Stage 5 retry requires at least one planned section.");
  }
  if (coverage.planId !== plan.id) {
    throw new Error(
      `Stage 5 coverage mismatch: coverage plan ID "${coverage.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (plan.sourceId !== source.id) {
    throw new Error(
      `Stage 5 source mismatch: plan source ID "${plan.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (coverage.sourceId !== source.id) {
    throw new Error(
      `Stage 5 coverage source mismatch: coverage source ID "${coverage.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (outline.sourceId !== source.id) {
    throw new Error(
      `Stage 5 outline source mismatch: outline source ID "${outline.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (coverage.coverageBasis !== "source-outline") {
    throw new Error("Stage 5 coverage must use source-outline coverage basis.");
  }

  const sourceBlockIds = new Set(source.blocks.map((block) => block.id));
  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  for (const section of plan.sections) {
    const referencedBlockIds = new Set([
      ...section.sourceBlockIds,
      ...section.target.requiredSourceBlockIds,
    ]);
    for (const blockId of referencedBlockIds) {
      if (!sourceBlockIds.has(blockId)) {
        throw new Error(
          `Stage 5 planned section "${section.id}" references missing source block ID "${blockId}".`,
        );
      }
    }
  }

  const seenCoverageIds = new Set<string>();
  for (const result of coverage.sections) {
    if (!plannedSectionIds.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 5 coverage references unknown planned section "${result.plannedSectionId}".`,
      );
    }
    if (seenCoverageIds.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 5 coverage contains duplicate result for planned section "${result.plannedSectionId}".`,
      );
    }
    seenCoverageIds.add(result.plannedSectionId);
  }

  for (const section of plan.sections) {
    if (!seenCoverageIds.has(section.id)) {
      throw new Error(
        `Stage 5 coverage is missing planned section "${section.id}".`,
      );
    }
  }

  if (grounding !== undefined) {
    validateGroundingReport(plan, source, grounding);
  }
  if (leakage !== undefined) {
    validateLeakageReport(plan, source, leakage);
  }
}

function requireCoverageResult(
  section: PlannedSection,
  coverageBySectionId: ReadonlyMap<string, SectionCoverageResult>,
): SectionCoverageResult {
  const result = coverageBySectionId.get(section.id);
  if (!result) {
    throw new Error(`Stage 5 coverage is missing planned section "${section.id}".`);
  }
  return result;
}

function shouldRetry(
  result: SectionCoverageResult,
  groundingResult: SectionGroundingResult | undefined,
  leakageResult: SectionLeakageResult | undefined,
  usefulnessIssues: readonly StudentVisibleUsefulnessIssue[],
  policy: RetryPolicy,
): boolean {
  const shouldRetryCoverage =
    result.retryable &&
    result.status !== "passed" &&
    isEnabledStatus(result.status, policy);
  const shouldRetryGrounding =
    groundingResult?.retryable === true && groundingResult.status === "failed";
  const shouldRetryLeakage =
    leakageResult?.retryable === true && leakageResult.status === "failed";

  if (shouldRetryCoverage) {
    return true;
  }
  return shouldRetryGrounding || shouldRetryLeakage || usefulnessIssues.length > 0;
}

function buildRetryGuidance(
  section: PlannedSection,
  source: NormalizedSource,
  coverageResult: SectionCoverageResult,
  groundingResult: SectionGroundingResult | undefined,
  leakageResult: SectionLeakageResult | undefined,
  usefulnessIssues: readonly StudentVisibleUsefulnessIssue[],
): readonly string[] {
  const guidance: string[] = [];
  const failedFields = new Set<string>();
  for (const issue of groundingResult?.issues ?? []) {
    if (issue.fieldPath) failedFields.add(issue.fieldPath);
  }
  for (const issue of leakageResult?.issues ?? []) {
    failedFields.add(issue.fieldPath);
  }
  for (const issue of usefulnessIssues) {
    failedFields.add(issue.fieldPath);
  }
  if (coverageResult.status !== "passed") {
    failedFields.add("sourceCore");
  }
  if (failedFields.size > 0) {
    guidance.push(
      `Repair only the failed field scope when practical: ${[...failedFields].join(", ")}. Preserve already grounded fields, shorten uncertain wording, and regenerate the entire section only if the listed fields cannot be repaired independently.`,
    );
  }
  const exactTerms = collectAllowedSourceTerms(section, source);
  if (exactTerms.length > 0) {
    guidance.push(
      `Allowed source terminology that should be preserved exactly when used: ${exactTerms.join(", ")}.`,
    );
  }
  guidance.push(
    "Do not add examples, synonyms, explanations, recommendations, or consequences absent from the passage.",
  );

  if (coverageResult.status !== "passed" && coverageResult.issues.length > 0) {
    guidance.push(
      `Previous coverage status was ${coverageResult.status}. Fix these coverage issues: ${coverageResult.issues.join("; ")}`,
    );
  }

  const missingTargetIds = coverageResult.missingRequiredEvidenceTargetIds ?? [];
  if (missingTargetIds.length > 0) {
    guidance.push(
      `Repair the exact missing required evidence target IDs: ${missingTargetIds.join(", ")}. The repair task includes their source evidence and provenance.`,
    );
  }

  if (groundingResult?.status === "failed") {
    guidance.push(
      "Previous default student-visible content failed grounding. Use the exact topic heading as title, rewrite sourceCore using only facts and terms present in the section passage, and set enrichment to null. If the passage is only a heading or very short phrase, use a minimal restatement of that exact text.",
    );
    guidance.push(
      ...groundingResult.issues.slice(0, 5).map(formatGroundingIssueGuidance),
    );
  }

  if (leakageResult?.status === "failed") {
    guidance.push(
      "Previous output contained internal or forbidden wording. Remove every leaked term from title, sourceCore, and enrichment.",
    );
    guidance.push(
      ...leakageResult.issues.slice(0, 5).map(formatLeakageIssueGuidance),
    );
  }

  if (usefulnessIssues.length > 0) {
    guidance.push(
      ...usefulnessIssues.map(
        (issue) =>
          `Usefulness issue (${issue.type}) in ${issue.fieldPath}: ${issue.message}`,
      ),
    );
  }

  return guidance;
}

function collectAllowedSourceTerms(
  section: PlannedSection,
  source: NormalizedSource,
): readonly string[] {
  const text = collectSectionSourceBlocks(section, source)
    .map((block) => block.text)
    .join(" ");
  const candidates = text.match(/\b(?:[A-Z]{2,}(?:-[A-Z0-9]+)*|[A-Z][A-Za-z0-9]+(?:-[A-Za-z0-9]+)+|\d+(?:\.\d+)*%?)\b/g) ?? [];
  return uniqueExtracts(candidates).slice(0, 24);
}

function formatGroundingIssueGuidance(
  issue: SectionGroundingResult["issues"][number],
): string {
  const details = [
    issue.message,
    issue.fieldPath ? `field=${issue.fieldPath}` : "",
    issue.offendingText
      ? `unsupported=${issue.offendingText.join(", ")}`
      : "",
    issue.sourceItem ? `missingSourceItem=${issue.sourceItem}` : "",
  ].filter((value) => value.length > 0);

  const relationshipIssue =
    issue.type !== "grounding-fabrication" &&
    issue.type !== "grounding-omission";
  return relationshipIssue
    ? `Semantic relationship issue (${issue.type}): ${details.join(" | ")}`
    : `Grounding issue: ${details.join(" | ")}`;
}

function isCrossSectionNavigation(
  section: PlannedSection,
  sourceText: string,
  otherSectionTitles: readonly string[],
): boolean {
  if ((section.semanticPlan?.units.length ?? 0) > 0) return false;
  const pipeRows = sourceText.split(/\r?\n/).filter(
    (line) => (line.match(/\|/g)?.length ?? 0) >= 1,
  );
  if (pipeRows.length < 2) return false;
  const sourceKey = normalizeCoverageTitleKey(pipeRows.join(" "));
  return otherSectionTitles.some((title) => {
    const titleKey = normalizeCoverageTitleKey(title);
    return titleKey.length >= 4 && sourceKey.includes(titleKey);
  });
}

function formatLeakageIssueGuidance(
  issue: SectionLeakageResult["issues"][number],
): string {
  return `Leakage issue in ${issue.fieldPath}: rewrite it as plain student-facing prose without label-and-colon formatting or internal wording.`;
}

function isEnabledStatus(status: CoverageStatus, policy: RetryPolicy): boolean {
  if (status === "weak") {
    return policy.retryWeakSections;
  }
  if (status === "failed") {
    return policy.retryFailedSections;
  }
  return false;
}

function orderedOutputs(
  plan: GenerationPlan,
  outputsBySectionId: ReadonlyMap<string, SectionOutput>,
): readonly SectionOutput[] {
  return plan.sections.flatMap((section) => {
    const output = outputsBySectionId.get(section.id);
    return output ? [output] : [];
  });
}

function diagnoseUsefulness(
  section: PlannedSection,
  source: NormalizedSource,
  output: SectionOutput | undefined,
): readonly StudentVisibleUsefulnessIssue[] {
  return reviewerDispositionFor(section) === "standalone" && output && section.requiredEvidence !== undefined
    ? diagnoseStudentVisibleUsefulness({ section, source, output })
    : [];
}

function isOutputUseful(
  section: PlannedSection,
  source: NormalizedSource,
  output: SectionOutput,
): boolean {
  return reviewerDispositionFor(section) !== "standalone" || section.requiredEvidence === undefined ||
    diagnoseStudentVisibleUsefulness({ section, source, output }).length === 0;
}

function collectAcceptedContent(args: {
  readonly output: SectionOutput | undefined;
  readonly grounding: SectionGroundingResult | undefined;
  readonly leakage: SectionLeakageResult | undefined;
  readonly usefulness: readonly StudentVisibleUsefulnessIssue[];
}): readonly string[] {
  if (!args.output) return [];
  const failedPaths = new Set([
    ...(args.grounding?.issues.flatMap((issue) => issue.fieldPath ? [issue.fieldPath] : []) ?? []),
    ...(args.leakage?.issues.map((issue) => issue.fieldPath) ?? []),
    ...args.usefulness.map((issue) => issue.fieldPath),
  ]);
  const accepted: string[] = [];
  if (
    args.output.sourceCore.explanation.trim() &&
    !failedPaths.has("sourceCore") &&
    !failedPaths.has("sourceCore.explanation")
  ) {
    accepted.push(args.output.sourceCore.explanation.trim());
  }
  args.output.sourceCore.keyPoints.forEach((point, index) => {
    if (
      !failedPaths.has("sourceCore") &&
      !failedPaths.has("sourceCore.keyPoints") &&
      !failedPaths.has(`sourceCore.keyPoints[${index}]`)
    ) {
      accepted.push(point.trim());
    }
  });
  return accepted.filter(Boolean);
}

function mergeSectionRepair(args: {
  readonly previous: SectionOutput | undefined;
  readonly generated: SectionOutput;
  readonly missingRequiredEvidence: readonly RequiredEvidenceTarget[];
  readonly usefulness: readonly StudentVisibleUsefulnessIssue[];
  readonly acceptedContent: readonly string[];
}): SectionOutput {
  if (!args.previous) return args.generated;
  const explanationInvalid = !args.acceptedContent.includes(args.previous.sourceCore.explanation.trim()) || args.usefulness.some(
    (issue) => issue.fieldPath === "sourceCore" || issue.fieldPath === "sourceCore.explanation",
  );
  const explanation = explanationInvalid || !args.previous.sourceCore.explanation.trim()
    ? args.generated.sourceCore.explanation
    : args.previous.sourceCore.explanation;
  const priorPoints = args.previous.sourceCore.keyPoints.filter((point, index) =>
    args.acceptedContent.includes(point.trim()) &&
    !args.usefulness.some((issue) =>
      issue.fieldPath === "sourceCore" ||
      issue.fieldPath === "sourceCore.keyPoints" ||
      issue.fieldPath === `sourceCore.keyPoints[${index}]`
    )
  );
  const generatedRows = [
    args.generated.sourceCore.explanation,
    ...args.generated.sourceCore.keyPoints,
  ].filter(Boolean);
  const repairPoints = args.missingRequiredEvidence.length > 0
    ? generatedRows.filter((row) =>
        args.missingRequiredEvidence.some((target) =>
          requiredEvidenceTargetIsRepresented(target, [row])
        )
      )
    : args.generated.sourceCore.keyPoints;
  const keyPoints = uniqueExtracts([
    ...priorPoints,
    ...repairPoints,
    ...(repairPoints.length === 0 ? args.generated.sourceCore.keyPoints : []),
  ]).filter((point) => point.trim() && point.trim() !== explanation.trim());

  return {
    ...args.generated,
    sourceCore: {
      explanation,
      keyPoints,
    },
    enrichment: null,
  } as SectionOutput;
}

function validateGroundingReport(
  plan: GenerationPlan,
  source: NormalizedSource,
  grounding: GroundingReport,
): void {
  if (grounding.planId !== plan.id) {
    throw new Error(
      `Stage 5 grounding mismatch: grounding plan ID "${grounding.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (grounding.sourceId !== source.id) {
    throw new Error(
      `Stage 5 grounding source mismatch: grounding source ID "${grounding.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  validateReportSections(
    plan,
    grounding.sections.map((section) => section.plannedSectionId),
    "grounding",
  );
}

function validateLeakageReport(
  plan: GenerationPlan,
  source: NormalizedSource,
  leakage: LeakageReport,
): void {
  if (leakage.planId !== plan.id) {
    throw new Error(
      `Stage 5 leakage mismatch: leakage plan ID "${leakage.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (leakage.sourceId !== source.id) {
    throw new Error(
      `Stage 5 leakage source mismatch: leakage source ID "${leakage.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  validateReportSections(
    plan,
    leakage.sections.map((section) => section.plannedSectionId),
    "leakage",
  );
}

function validateReportSections(
  plan: GenerationPlan,
  sectionIds: readonly string[],
  reportName: string,
): void {
  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  const seenSectionIds = new Set<string>();
  for (const sectionId of sectionIds) {
    if (!plannedSectionIds.has(sectionId)) {
      throw new Error(
        `Stage 5 ${reportName} references unknown planned section "${sectionId}".`,
      );
    }
    if (seenSectionIds.has(sectionId)) {
      throw new Error(
        `Stage 5 ${reportName} contains duplicate result for planned section "${sectionId}".`,
      );
    }
    seenSectionIds.add(sectionId);
  }

  for (const section of plan.sections) {
    if (!seenSectionIds.has(section.id)) {
      throw new Error(
        `Stage 5 ${reportName} is missing planned section "${section.id}".`,
      );
    }
  }
}

function isSectionAccepted(
  coverage: SectionCoverageResult | undefined,
  grounding: SectionGroundingResult | undefined,
  leakage: SectionLeakageResult | undefined,
): boolean {
  return (
    coverage?.status === "passed" &&
    (grounding === undefined || grounding.status === "passed") &&
    (leakage === undefined || leakage.status === "passed")
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
