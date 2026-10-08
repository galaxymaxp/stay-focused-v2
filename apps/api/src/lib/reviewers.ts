import type { ReviewerOutput, ReviewerSection, SectionOutput } from "@stay-focused/engine";
import type {
  GeneratedArtifactRow,
  GeneratedArtifactVersionRow,
  SavedReviewerDetail,
  SavedReviewerSourceMetadata,
  SavedReviewerSourceMode,
  SavedReviewerSourceProvenanceSummary,
  SavedReviewerSummary,
  SourceVersionRow,
} from "@stay-focused/db";

import { DURABLE_DOCUMENT_MAX_PDF_PAGES } from "./ocr/upload-policy";

export const MAX_REVIEWER_TITLE_LENGTH = 120;

const REVIEWER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_MODES: readonly SavedReviewerSourceMode[] = [
  "paste",
  "gallery",
  "camera",
  "pdf",
  "canvas",
];
const SOURCE_METADATA_KEYS = new Set([
  "sourceMode",
  "sourceCharacterCount",
  "pdfPageCount",
  "sourceLabel",
]);

export interface ValidatedCreateReviewerRequest {
  readonly title: string;
  readonly sourceMetadata: SavedReviewerSourceMetadata;
  readonly reviewerOutput: ReviewerOutput;
  readonly sourceSnapshotId?: string;
  readonly sectionCount: number;
}

export type RequestValidation<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly ok: false;
      readonly code:
        | "invalid_request"
        | "invalid_title"
        | "invalid_source_metadata"
        | "invalid_reviewer_output";
      readonly message: string;
    };

export function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token, extra] = authHeader.split(" ");
  if (
    scheme !== "Bearer" ||
    typeof token !== "string" ||
    token.trim().length === 0 ||
    extra !== undefined
  ) {
    return null;
  }

  return token.trim();
}

export function validateReviewerId(id: string): boolean {
  return REVIEWER_ID_PATTERN.test(id.trim());
}

export function validateCreateReviewerRequest(
  body: unknown,
): RequestValidation<ValidatedCreateReviewerRequest> {
  if (!isRecord(body)) {
    return invalidRequest("Request body must be a JSON object.");
  }

  if ("user_id" in body || "userId" in body) {
    return invalidRequest("Client-supplied user ownership is not allowed.");
  }

  const title = validateReviewerTitle(body.title);
  if (!title.ok) {
    return title;
  }

  const sourceMetadata = validateSourceMetadata(body.sourceMetadata);
  if (!sourceMetadata.ok) {
    return sourceMetadata;
  }

  if (!isReviewerOutput(body.reviewerOutput)) {
    return {
      ok: false,
      code: "invalid_reviewer_output",
      message: "reviewerOutput must be a valid reviewer object.",
    };
  }

  const sourceSnapshotId = validateOptionalSourceSnapshotId(
    body.sourceSnapshotId,
  );
  if (!sourceSnapshotId.ok) {
    return sourceSnapshotId;
  }

  return {
    ok: true,
    value: {
      title: title.value,
      sourceMetadata: sourceMetadata.value,
      reviewerOutput: body.reviewerOutput,
      ...(sourceSnapshotId.value ? { sourceSnapshotId: sourceSnapshotId.value } : {}),
      sectionCount: body.reviewerOutput.sections.length,
    },
  };
}

export function validateRenameReviewerRequest(
  body: unknown,
): RequestValidation<{ readonly title: string }> {
  if (!isRecord(body)) {
    return invalidRequest("Request body must be a JSON object.");
  }

  const forbiddenKeys = [
    "id",
    "user_id",
    "userId",
    "sourceMetadata",
    "source_metadata",
    "reviewerOutput",
    "reviewer_output",
    "sectionCount",
    "section_count",
  ];
  if (forbiddenKeys.some((key) => key in body)) {
    return invalidRequest("Only title can be updated in this phase.");
  }

  const title = validateReviewerTitle(body.title);
  if (!title.ok) {
    return title;
  }

  return { ok: true, value: { title: title.value } };
}

export function mapCanonicalReviewerSummary(
  artifact: GeneratedArtifactRow,
  version: GeneratedArtifactVersionRow,
  source: SourceVersionRow,
): SavedReviewerSummary {
  const payload = isRecord(version.payload) ? version.payload : {};
  const reviewer = isRecord(payload.reviewer) ? payload.reviewer : payload;
  return {
    id: artifact.id,
    title: artifact.safe_title,
    sourceMetadata: canonicalSourceMetadata(source),
    sectionCount: Array.isArray(reviewer.sections) ? reviewer.sections.length : 0,
    createdAt: artifact.created_at,
    updatedAt: artifact.updated_at,
  };
}

export function mapCanonicalReviewerDetail(
  artifact: GeneratedArtifactRow,
  version: GeneratedArtifactVersionRow,
  source: SourceVersionRow,
  sourceProvenance?: SavedReviewerSourceProvenanceSummary | null,
): { readonly ok: true; readonly value: SavedReviewerDetail<ReviewerOutput> } | { readonly ok: false } {
  const payload = isRecord(version.payload) ? version.payload : {};
  const reviewer = isRecord(payload.reviewer) ? payload.reviewer : payload;
  if (!isReviewerOutput(reviewer)) return { ok: false };
  return {
    ok: true,
    value: {
      ...mapCanonicalReviewerSummary(artifact, version, source),
      reviewerOutput: reviewer,
      ...(sourceProvenance ? { sourceProvenance } : {}),
    },
  };
}

export function canonicalReviewerSnapshotId(source: SourceVersionRow): string | null {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  return typeof metadata.reviewerSourceSnapshotId === "string"
    ? metadata.reviewerSourceSnapshotId
    : null;
}

function canonicalSourceMetadata(source: SourceVersionRow): SavedReviewerSourceMetadata {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  const snapshotId = canonicalReviewerSnapshotId(source);
  const sourceLabel = typeof metadata.sourceTitle === "string"
    ? metadata.sourceTitle.trim()
    : typeof metadata.sourceLabel === "string"
      ? metadata.sourceLabel.trim()
      : "";
  return {
    sourceMode: snapshotId ? "canvas" : "paste",
    sourceCharacterCount: source.character_count,
    ...(sourceLabel ? { sourceLabel: sourceLabel.slice(0, MAX_REVIEWER_TITLE_LENGTH) } : {}),
  };
}

function validateReviewerTitle(
  value: unknown,
): RequestValidation<string> {
  if (typeof value !== "string") {
    return {
      ok: false,
      code: "invalid_title",
      message: "title is required and must be a string.",
    };
  }

  const title = value.trim();
  if (title.length === 0) {
    return {
      ok: false,
      code: "invalid_title",
      message: "title must not be blank.",
    };
  }

  if (title.length > MAX_REVIEWER_TITLE_LENGTH) {
    return {
      ok: false,
      code: "invalid_title",
      message: `title must be at most ${MAX_REVIEWER_TITLE_LENGTH} characters.`,
    };
  }

  return { ok: true, value: title };
}

function validateSourceMetadata(
  value: unknown,
): RequestValidation<SavedReviewerSourceMetadata> {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: "invalid_source_metadata",
      message: "sourceMetadata must be a JSON object.",
    };
  }

  const unsupportedKey = Object.keys(value).find(
    (key) => !SOURCE_METADATA_KEYS.has(key),
  );
  if (unsupportedKey) {
    return {
      ok: false,
      code: "invalid_source_metadata",
      message: `sourceMetadata contains unsupported key "${unsupportedKey}".`,
    };
  }

  const sourceMode = value.sourceMode;
  if (!isSourceMode(sourceMode)) {
    return {
      ok: false,
      code: "invalid_source_metadata",
      message: "sourceMetadata.sourceMode is required.",
    };
  }

  const sourceCharacterCount = value.sourceCharacterCount;
  if (
    typeof sourceCharacterCount !== "number" ||
    !Number.isInteger(sourceCharacterCount) ||
    sourceCharacterCount < 0 ||
    sourceCharacterCount > 100_000
  ) {
    return {
      ok: false,
      code: "invalid_source_metadata",
      message: "sourceMetadata.sourceCharacterCount must be a safe count.",
    };
  }

  const pdfPageCount = value.pdfPageCount;
  if (
    pdfPageCount !== undefined &&
    (typeof pdfPageCount !== "number" ||
      !Number.isInteger(pdfPageCount) ||
      pdfPageCount < 1 ||
      pdfPageCount > DURABLE_DOCUMENT_MAX_PDF_PAGES)
  ) {
    return {
      ok: false,
      code: "invalid_source_metadata",
      message: `sourceMetadata.pdfPageCount must be between 1 and ${DURABLE_DOCUMENT_MAX_PDF_PAGES}.`,
    };
  }

  const sourceLabel = value.sourceLabel;
  if (
    sourceLabel !== undefined &&
    (typeof sourceLabel !== "string" ||
      sourceLabel.trim().length === 0 ||
      sourceLabel.trim().length > MAX_REVIEWER_TITLE_LENGTH)
  ) {
    return {
      ok: false,
      code: "invalid_source_metadata",
      message: "sourceMetadata.sourceLabel must be a short safe label.",
    };
  }

  if (sourceMode !== "pdf" && pdfPageCount !== undefined) {
    return {
      ok: false,
      code: "invalid_source_metadata",
      message: "pdfPageCount is only allowed for PDF sources.",
    };
  }

  return {
    ok: true,
    value: {
      sourceMode,
      sourceCharacterCount,
      ...(pdfPageCount !== undefined ? { pdfPageCount } : {}),
      ...(typeof sourceLabel === "string"
        ? { sourceLabel: sourceLabel.trim() }
        : {}),
    },
  };
}

function validateOptionalSourceSnapshotId(
  value: unknown,
): RequestValidation<string | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string" || !validateReviewerId(value)) {
    return invalidRequest("sourceSnapshotId must be a valid UUID when provided.");
  }
  return { ok: true, value: value.trim() };
}

function isSourceMode(value: unknown): value is SavedReviewerSourceMode {
  return SOURCE_MODES.some((mode) => mode === value);
}

function invalidRequest(message: string): RequestValidation<never> {
  return {
    ok: false,
    code: "invalid_request",
    message,
  };
}

function isReviewerOutput(value: unknown): value is ReviewerOutput {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.sections) &&
    value.sections.every(isReviewerSection) &&
    isReviewerMetadata(value.metadata)
  );
}

function isReviewerMetadata(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.sourceId === "string" &&
    typeof value.planId === "string" &&
    typeof value.coverageReportId === "string" &&
    typeof value.sourceTitle === "string" &&
    typeof value.sourceKind === "string" &&
    typeof value.language === "string" &&
    typeof value.sectionCount === "number" &&
    typeof value.generatedSectionCount === "number" &&
    typeof value.coverageStatus === "string" &&
    typeof value.coverageScore === "number" &&
    isRecord(value.coverage) &&
    typeof value.groundingStatus === "string" &&
    typeof value.groundingScore === "number" &&
    isRecord(value.grounding) &&
    typeof value.leakageStatus === "string" &&
    isRecord(value.leakage)
  );
}

function isReviewerSection(value: unknown): value is ReviewerSection {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.sourceSectionId === "string" &&
    typeof value.plannedSectionId === "string" &&
    typeof value.title === "string" &&
    typeof value.order === "number" &&
    typeof value.kind === "string" &&
    Array.isArray(value.sourceBlockIds) &&
    value.sourceBlockIds.every(isString) &&
    typeof value.coverageStatus === "string" &&
    typeof value.coverageScore === "number" &&
    typeof value.groundingStatus === "string" &&
    typeof value.groundingScore === "number" &&
    Array.isArray(value.groundingIssues) &&
    typeof value.leakageStatus === "string" &&
    Array.isArray(value.leakageIssues) &&
    Array.isArray(value.items) &&
    value.items.every(isSectionOutput)
  );
}

function isSectionOutput(value: unknown): value is SectionOutput {
  if (!isRecord(value) || !isRecord(value.sourceCore)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.plannedSectionId === "string" &&
    typeof value.title === "string" &&
    typeof value.kind === "string" &&
    Array.isArray(value.sourceBlockIds) &&
    value.sourceBlockIds.every(isString) &&
    typeof value.sourceCore.explanation === "string" &&
    Array.isArray(value.sourceCore.keyPoints) &&
    value.sourceCore.keyPoints.every(isString) &&
    (value.sourceCore.evidence === undefined ||
      (Array.isArray(value.sourceCore.evidence) && value.sourceCore.evidence.every(block =>
        isRecord(block) && typeof block.text === "string" &&
        ["code", "formula", "table", "result", "example", "source"].includes(String(block.kind))))) &&
    ("enrichment" in value)
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
