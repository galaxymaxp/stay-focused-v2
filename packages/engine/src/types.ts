export type NormalizedSourceKind =
  | "document"
  | "presentation"
  | "webpage"
  | "plain-text"
  | "unknown";

export type SourceBlockKind =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "code"
  | "quote"
  | "unknown";

export type MetadataValue = string | number | boolean | null;

export interface NormalizedSourceMetadata {
  readonly sourceName?: string;
  readonly author?: string;
  readonly mimeType?: string;
  readonly pageCount?: number;
  readonly originalCreatedAt?: string;
  readonly originalUpdatedAt?: string;
  readonly attributes?: Readonly<Record<string, MetadataValue>>;
}

export interface NormalizedSourceBlock {
  readonly id: string;
  readonly kind: SourceBlockKind;
  readonly text: string;
  readonly order: number;
  readonly pageNumber?: number;
  readonly sectionHint?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

export interface NormalizedSource {
  readonly id: string;
  readonly title: string;
  readonly kind: NormalizedSourceKind;
  readonly language: string;
  readonly metadata: NormalizedSourceMetadata;
  readonly blocks: readonly NormalizedSourceBlock[];
  readonly createdAt: string;
}

export interface SourceNormalizationBlockInput {
  readonly id?: string;
  readonly kind?: SourceBlockKind;
  readonly text: string;
  readonly order?: number;
  readonly pageNumber?: number;
  readonly sectionHint?: string;
  readonly metadata?: unknown;
}

export interface SourceNormalizationInput {
  readonly id?: string;
  readonly title?: string;
  readonly kind?: NormalizedSourceKind;
  readonly language?: string;
  readonly text?: string;
  readonly blocks?: readonly SourceNormalizationBlockInput[];
  readonly metadata?: unknown;
  readonly createdAt?: string;
}

export type SectionContentTag =
  | "concept"
  | "process"
  | "example"
  | "claim"
  | "definition"
  | "mixed"
  | "unknown";

export interface SourceOutlineSection {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly tokenWeight: number;
  readonly sourceBlockIds: readonly string[];
  readonly blockIds: readonly string[];
  readonly roughStartBlockId: string;
  readonly roughEndBlockId: string;
  readonly tags: readonly SectionContentTag[];
  readonly confidence: number;
  readonly inferred?: boolean;
}

export type OutlineSection = SourceOutlineSection;

export interface SourceOutline {
  readonly id: string;
  readonly sourceId: string;
  readonly title: string;
  readonly sections: readonly SourceOutlineSection[];
}

export type SectionSchemaKind =
  | "concept-card"
  | "process-step"
  | "example-card"
  | "claim-card";

export interface PlannedSectionTarget {
  readonly objective: string;
  readonly itemCount: number;
  readonly focus: string;
  readonly requiredSourceBlockIds: readonly string[];
  readonly expectedTags: readonly SectionContentTag[];
  readonly coverageRules: readonly string[];
}

export interface PlannedSection {
  readonly id: string;
  readonly sourceSectionId: string;
  readonly title: string;
  readonly order: number;
  readonly schemaKind: SectionSchemaKind;
  readonly target: PlannedSectionTarget;
  readonly sourceBlockIds: readonly string[];
  readonly tokenWeight: number;
  readonly targetItemCount: number;
  readonly sourceStartOffset: number;
  readonly sourceEndOffset: number;
}

export interface GenerationPlan {
  readonly id: string;
  readonly sourceId: string;
  readonly outlineId: string;
  readonly title: string;
  readonly sections: readonly PlannedSection[];
  readonly metadata: GenerationPlanMetadata;
  readonly sourceOutline?: SourceOutline;
}

export interface GenerationPlanMetadata {
  readonly sectionCount: number;
  readonly sourceBlockCount: number;
}

interface BaseSectionOutput {
  readonly id: string;
  readonly plannedSectionId: string;
  readonly title: string;
  readonly sourceBlockIds: readonly string[];
  readonly sourceCore: SourceGroundedCore;
  readonly enrichment: EnrichmentLayer | null;
}

export interface SourceGroundedCore {
  readonly explanation: string;
  readonly keyPoints: readonly string[];
}

export interface EnrichmentLayer {
  readonly note: string;
  readonly points: readonly string[];
}

export interface ConceptCard extends BaseSectionOutput {
  readonly kind: "concept-card";
}

export interface ProcessStep extends BaseSectionOutput {
  readonly kind: "process-step";
}

export interface ExampleCard extends BaseSectionOutput {
  readonly kind: "example-card";
}

export interface ClaimCard extends BaseSectionOutput {
  readonly kind: "claim-card";
}

export type SectionOutput =
  | ConceptCard
  | ProcessStep
  | ExampleCard
  | ClaimCard;

export type CoverageStatus = "passed" | "weak" | "failed";
export type CoverageReportStatus = "passed" | "failed";
export type CoverageBasis = "source-outline";

export type CoverageIssueSeverity = "warning" | "error";
export type CoverageIssueType =
  | "missing-source-section"
  | "duplicate-section"
  | "unplanned-output"
  | "section-quality"
  | "empty-source";

export interface CoverageIssue {
  readonly type: CoverageIssueType;
  readonly severity: CoverageIssueSeverity;
  readonly message: string;
  readonly sourceSectionId?: string;
  readonly title?: string;
  readonly plannedSectionId?: string;
  readonly plannedSectionIds?: readonly string[];
}

export interface SectionCoverageResult {
  readonly plannedSectionId: string;
  readonly status: CoverageStatus;
  readonly score: number;
  readonly issues: readonly string[];
  readonly retryable: boolean;
}

export interface SourceSectionCoverage {
  readonly sourceSectionId: string;
  readonly title: string;
  readonly status: "covered" | "missing";
  readonly plannedSectionIds: readonly string[];
}

export interface CoverageReport {
  readonly id: string;
  readonly planId: string;
  readonly sourceId: string;
  readonly status: CoverageReportStatus;
  readonly score: number;
  readonly coverageScore: number;
  readonly coverageBasis: CoverageBasis;
  readonly sourceSectionsTotal: number;
  readonly sourceSectionsCovered: number;
  readonly sourceSections: readonly SourceSectionCoverage[];
  readonly issues: readonly CoverageIssue[];
  readonly sections: readonly SectionCoverageResult[];
}

export type GroundingReportStatus = "passed" | "failed";
export type ReviewerSectionQualityStatus =
  | "generated"
  | "repaired"
  | "extractive_fallback";
export type ReviewerQualityStatus =
  | "complete"
  | "complete_with_fallbacks"
  | "limited";
export type GroundingIssueType =
  | "grounding-fabrication"
  | "grounding-omission";

export interface GroundingIssue {
  readonly type: GroundingIssueType;
  readonly severity: "error";
  readonly message: string;
  readonly plannedSectionId: string;
  readonly sourceSectionId: string;
  readonly field?: StudentFacingSectionField;
  readonly fieldPath?: string;
  readonly offendingText?: readonly string[];
  readonly sourceItem?: string;
  readonly excerpt?: string;
}

export interface Phase1FabricationFailure {
  readonly claimText: string;
  readonly unsupportedTokens: readonly string[];
  readonly sourceSectionId: string;
  readonly fieldPath: string;
}

export interface SectionGroundingResult {
  readonly plannedSectionId: string;
  readonly sourceSectionId: string;
  readonly status: GroundingReportStatus;
  readonly score: number;
  readonly sourceItemCount: number;
  readonly representedSourceItemCount: number;
  readonly issues: readonly GroundingIssue[];
  readonly retryable: boolean;
}

export interface GroundingReport {
  readonly id: string;
  readonly planId: string;
  readonly sourceId: string;
  readonly status: GroundingReportStatus;
  readonly score: number;
  readonly threshold: number;
  readonly issues: readonly GroundingIssue[];
  readonly sections: readonly SectionGroundingResult[];
  readonly phase1FabricationFails: number;
  readonly phase1FabricationFailures: readonly Phase1FabricationFailure[];
}

export type StudentFacingSectionField =
  | "title"
  | "sourceCore.explanation"
  | "sourceCore.keyPoints"
  | "enrichment.note"
  | "enrichment.points";

export interface LeakageIssue {
  readonly type: "leakage";
  readonly severity: "error";
  readonly message: string;
  readonly plannedSectionId: string;
  readonly sourceSectionId: string;
  readonly field: StudentFacingSectionField;
  readonly fieldPath: string;
  readonly offendingTerm: string;
  readonly excerpt: string;
}

export interface SectionLeakageResult {
  readonly plannedSectionId: string;
  readonly sourceSectionId: string;
  readonly status: "passed" | "failed";
  readonly issues: readonly LeakageIssue[];
  readonly retryable: boolean;
}

export interface LeakageReport {
  readonly id: string;
  readonly planId: string;
  readonly sourceId: string;
  readonly status: "passed" | "failed";
  readonly issues: readonly LeakageIssue[];
  readonly sections: readonly SectionLeakageResult[];
}

export interface ReviewerSection {
  readonly id: string;
  readonly sourceSectionId: string;
  readonly plannedSectionId: string;
  readonly title: string;
  readonly order: number;
  readonly kind: SectionSchemaKind;
  readonly sourceBlockIds: readonly string[];
  readonly coverageStatus: CoverageStatus;
  readonly coverageScore: number;
  readonly groundingStatus: GroundingReportStatus;
  readonly groundingScore: number;
  readonly groundingIssues: readonly GroundingIssue[];
  readonly leakageStatus: "passed" | "failed";
  readonly leakageIssues: readonly LeakageIssue[];
  readonly qualityStatus: ReviewerSectionQualityStatus;
  readonly items: readonly SectionOutput[];
}

export interface ReviewerMetadata {
  readonly sourceId: string;
  readonly planId: string;
  readonly coverageReportId: string;
  readonly sourceTitle: string;
  readonly sourceKind: NormalizedSourceKind;
  readonly language: string;
  readonly sectionCount: number;
  readonly generatedSectionCount: number;
  readonly originalGeneratedSectionCount?: number;
  readonly repairedSectionCount?: number;
  readonly fallbackSectionCount?: number;
  readonly reviewerQualityStatus?: ReviewerQualityStatus;
  readonly fallbackPlanUsed?: boolean;
  readonly limitedSource?: boolean;
  readonly uncoveredSourceTopics?: readonly string[];
  readonly coverageStatus: CoverageStatus;
  readonly coverageScore: number;
  readonly coverage: CoverageReport;
  readonly groundingStatus: GroundingReportStatus;
  readonly groundingScore: number;
  readonly grounding: GroundingReport;
  readonly leakageStatus: "passed" | "failed";
  readonly leakage: LeakageReport;
}

export interface ReviewerOutput {
  readonly id: string;
  readonly title: string;
  readonly sections: readonly ReviewerSection[];
  readonly metadata: ReviewerMetadata;
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly retryWeakSections: boolean;
  readonly retryFailedSections: boolean;
}

export interface PipelineOptions {
  readonly model?: string;
  readonly temperature?: number;
  readonly retryPolicy?: RetryPolicy;
  readonly allowWeakSections?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
