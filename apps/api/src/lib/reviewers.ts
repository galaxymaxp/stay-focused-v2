import type { ReviewerOutput, ReviewerSection, SectionOutput } from "@stay-focused/engine";
import type {
  Json,
  ReviewerInsert,
  ReviewerRow,
  SavedReviewerSourceMetadata,
  SavedReviewerSourceMode,
  SavedReviewerSummary,
} from "@stay-focused/db";

export const MAX_REVIEWER_TITLE_LENGTH = 120;

const REVIEWER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_MODES: readonly SavedReviewerSourceMode[] = [
  "paste",
  "gallery",
  "camera",
  "pdf",
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

  return {
    ok: true,
    value: {
      title: title.value,
      sourceMetadata: sourceMetadata.value,
      reviewerOutput: body.reviewerOutput,
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

export function createReviewerInsert(
  userId: string,
  value: ValidatedCreateReviewerRequest,
): ReviewerInsert {
  return {
    user_id: userId,
    title: value.title,
    source_metadata: sourceMetadataToJson(value.sourceMetadata),
    reviewer_output: value.reviewerOutput as unknown as Json,
    section_count: value.sectionCount,
  };
}

export function mapReviewerSummary(row: ReviewerRow): SavedReviewerSummary {
  return {
    id: row.id,
    title: row.title,
    sourceMetadata: coerceSourceMetadata(row.source_metadata),
    sectionCount: row.section_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReviewerDetail(
  row: ReviewerRow,
):
  | { readonly ok: true; readonly value: SavedReviewerSummary & { readonly reviewerOutput: ReviewerOutput } }
  | { readonly ok: false } {
  if (!isReviewerOutput(row.reviewer_output)) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      ...mapReviewerSummary(row),
      reviewerOutput: row.reviewer_output,
    },
  };
}

export function sourceMetadataToJson(
  metadata: SavedReviewerSourceMetadata,
): Json {
  return {
    sourceMode: metadata.sourceMode,
    sourceCharacterCount: metadata.sourceCharacterCount,
    ...(metadata.pdfPageCount !== undefined
      ? { pdfPageCount: metadata.pdfPageCount }
      : {}),
    ...(metadata.sourceLabel ? { sourceLabel: metadata.sourceLabel } : {}),
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
      pdfPageCount > 5)
  ) {
    return {
      ok: false,
      code: "invalid_source_metadata",
      message: "sourceMetadata.pdfPageCount must be between 1 and 5.",
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

function coerceSourceMetadata(value: Json): SavedReviewerSourceMetadata {
  const metadata = validateSourceMetadata(value);
  if (metadata.ok) {
    return metadata.value;
  }

  return {
    sourceMode: "paste",
    sourceCharacterCount: 0,
  };
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
    ("enrichment" in value)
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
