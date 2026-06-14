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

export interface OutlineSection {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly blockIds: readonly string[];
  readonly roughStartBlockId: string;
  readonly roughEndBlockId: string;
  readonly tags: readonly SectionContentTag[];
  readonly confidence: number;
}

export interface SourceOutline {
  readonly sourceId: string;
  readonly sections: readonly OutlineSection[];
}

export type SectionSchemaKind =
  | "concept-card"
  | "process-step"
  | "example-card"
  | "claim-card";

export interface PlannedSectionTarget {
  readonly objective: string;
  readonly itemCount: number;
}

export interface PlannedSection {
  readonly id: string;
  readonly sourceSectionId: string;
  readonly title: string;
  readonly order: number;
  readonly schemaKind: SectionSchemaKind;
  readonly target: PlannedSectionTarget;
  readonly sourceBlockIds: readonly string[];
}

export interface GenerationPlan {
  readonly sourceId: string;
  readonly sections: readonly PlannedSection[];
}

interface BaseSectionOutput {
  readonly id: string;
  readonly plannedSectionId: string;
  readonly title: string;
  readonly sourceBlockIds: readonly string[];
}

export interface ConceptCard extends BaseSectionOutput {
  readonly kind: "concept-card";
  readonly concept: string;
  readonly explanation: string;
}

export interface ProcessStep extends BaseSectionOutput {
  readonly kind: "process-step";
  readonly stepNumber: number;
  readonly instruction: string;
  readonly explanation?: string;
}

export interface ExampleCard extends BaseSectionOutput {
  readonly kind: "example-card";
  readonly example: string;
  readonly explanation: string;
}

export interface ClaimCard extends BaseSectionOutput {
  readonly kind: "claim-card";
  readonly claim: string;
  readonly evidence: string;
  readonly qualification?: string;
}

export type SectionOutput =
  | ConceptCard
  | ProcessStep
  | ExampleCard
  | ClaimCard;

export type CoverageStatus = "passed" | "weak" | "failed";

export interface SectionCoverageResult {
  readonly plannedSectionId: string;
  readonly status: CoverageStatus;
  readonly score: number;
  readonly issues: readonly string[];
  readonly retryable: boolean;
}

export interface CoverageReport {
  readonly status: CoverageStatus;
  readonly score: number;
  readonly sections: readonly SectionCoverageResult[];
}

export interface ReviewerSection {
  readonly id: string;
  readonly sourceSectionId: string;
  readonly title: string;
  readonly order: number;
  readonly items: readonly SectionOutput[];
}

export interface ReviewerMetadata {
  readonly sourceId: string;
  readonly sourceKind: NormalizedSourceKind;
  readonly language: string;
  readonly generatedAt: string;
  readonly coverage: CoverageReport;
}

export interface ReviewerOutput {
  readonly id: string;
  readonly title: string;
  readonly sections: readonly ReviewerSection[];
  readonly metadata: ReviewerMetadata;
}

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly retryWeakSections?: boolean;
}

export interface PipelineOptions {
  readonly model: string;
  readonly temperature?: number;
  readonly retryPolicy: RetryPolicy;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
