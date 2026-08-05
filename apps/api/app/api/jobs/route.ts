import { OCR_PDF_MIME_TYPE } from "@stay-focused/ocr";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createCanvasServiceClient } from "@/lib/canvas-db";
import { validateCanvasReviewerGenerationGate } from "@/lib/canvas-reviewer-generation-gate";
import {
  createExtractionProcessingJob,
  createReviewerProcessingJob,
  ProcessingJobCreationError,
  validateIdempotencyKey,
} from "@/lib/processing-jobs/creation";
import {
  createProcessingJobServiceClient,
  listOwnedActiveProcessingJobs,
  listOwnedProcessingJobs,
  toProcessingJobStatusView,
} from "@/lib/processing-jobs/repository";
import {
  dispatchAcceptedProcessingJob,
  ProcessingWorkflowDispatchError,
} from "@/lib/processing-jobs/workflow-dispatch";
import { readUploadDisplayName } from "@/lib/processing-jobs/source-display-name";
import {
  validateImageOcrBytes,
  validatePdfOcrBytes,
} from "@/lib/ocr/extraction-service";
import {
  getConfiguredDurableDocumentMaxPdfPages,
  OCR_MAX_IMAGE_BYTES,
  OCR_MAX_PDF_BYTES,
} from "@/lib/ocr/upload-policy";
import {
  REVIEWER_GENERATE_MAX_JSON_BODY_BYTES,
  REVIEWER_GENERATE_MAX_SOURCE_TEXT_CHARS,
} from "@/lib/reviewer-generation-limits";
import {
  createOrReuseReviewerSourceSnapshot,
  validateCanvasPreviewSessionForGeneration,
} from "@/lib/reviewer-source-provenance";

export const runtime = "nodejs";
export const maxDuration = 45;

const SOURCE_FORM_FIELD = "source";
const SOURCE_DISPLAY_NAME_FORM_FIELD = "displayName";
const IDEMPOTENCY_HEADER = "idempotency-key";
const CORS_ALLOWED_METHODS = "GET, POST, OPTIONS";
const CORS_ALLOWED_HEADERS =
  "authorization, content-type, idempotency-key";
const CORS_MAX_AGE_SECONDS = "600";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await verifyBearerToken(request);
    if (!user) {
      return errorResponse(
        401,
        "unauthorized",
        "Sign in again to start processing.",
        false,
        request,
      );
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("multipart/form-data")) {
      return await createExtractionJob(request, user.id);
    }
    if (contentType.includes("application/json")) {
      return await createReviewerJob(request, user.id);
    }

    return errorResponse(
      415,
      "unsupported_media_type",
      "Use multipart/form-data for extraction or JSON for reviewer generation.",
      false,
      request,
    );
  } catch (error) {
    if (error instanceof ProcessingJobCreationError) {
      const status =
        error.code === "processing_job_idempotency_conflict" ? 409 :
          error.code === "invalid_idempotency_key" ? 400 :
            error.code.includes("_limit_reached") ||
              error.code === "processing_job_rate_limit_reached" ? 429 :
              error.code === "processing_source_version_not_found" ? 404 : 503;
      return errorResponse(
        status,
        error.code,
        error.safeMessage,
        error.retryable,
        request,
      );
    }
    if (error instanceof ProcessingWorkflowDispatchError) {
      return errorResponse(
        503,
        error.code,
        error.safeMessage,
        error.retryable,
        request,
      );
    }
    return errorResponse(
      500,
      "processing_job_creation_failed",
      "The job could not be accepted.",
      true,
      request,
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return errorResponse(
      401,
      "unauthorized",
      "Sign in again to retrieve processing jobs.",
      false,
      request,
    );
  }

  try {
    const url = new URL(request.url);
    if (url.searchParams.get("scope") === "all") {
      const limit = readListLimit(url.searchParams.get("limit"));
      const cursor = decodeJobCursor(url.searchParams.get("cursor"));
      if (cursor === false) {
        return errorResponse(
          400,
          "invalid_processing_job_cursor",
          "The processing history cursor is invalid.",
          false,
          request,
        );
      }
      const rows = await listOwnedProcessingJobs(
        createProcessingJobServiceClient(),
        user.id,
        {
          scope: "all",
          limit: limit + 1,
          ...(cursor ? { cursor } : {}),
        },
      );
      const page = rows.slice(0, limit);
      const last = page.at(-1);
      return jsonResponse(
        {
          ok: true,
          data: {
            jobs: page.map(toProcessingJobStatusView),
            nextCursor:
              rows.length > limit && last
                ? encodeJobCursor(last.created_at, last.id)
                : null,
          },
        },
        200,
        request,
      );
    }

    const jobs = await listOwnedActiveProcessingJobs(
      createProcessingJobServiceClient(),
      user.id,
    );
    return jsonResponse(
      {
        ok: true,
        data: jobs.map(toProcessingJobStatusView),
      },
      200,
      request,
    );
  } catch {
    return errorResponse(
      503,
      "processing_job_status_unavailable",
      "Processing status is temporarily unavailable.",
      true,
      request,
    );
  }
}

export function OPTIONS(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request.headers.get("origin")),
  });
}

async function createExtractionJob(
  request: Request,
  userId: string,
): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      400,
      "invalid_multipart_body",
      "The upload request is invalid.",
      false,
      request,
    );
  }

  const idempotencyKey = validateIdempotencyKey(
    request.headers.get(IDEMPOTENCY_HEADER) ??
      readOptionalString(formData.get("idempotencyKey")),
  );
  const file = readUploadedFile(formData.get(SOURCE_FORM_FIELD));
  if (!file) {
    return errorResponse(
      400,
      "source_file_missing",
      `A file field named "${SOURCE_FORM_FIELD}" is required.`,
      false,
      request,
    );
  }
  const displayName = readUploadDisplayName(
    formData.get(SOURCE_DISPLAY_NAME_FORM_FIELD),
    file.name || (file.type === OCR_PDF_MIME_TYPE ? "Document.pdf" : "Image"),
  );

  const mimeType = file.type.trim().toLowerCase();
  const maxBytes = mimeType === OCR_PDF_MIME_TYPE
    ? OCR_MAX_PDF_BYTES
    : OCR_MAX_IMAGE_BYTES;
  if (file.size <= 0) {
    return errorResponse(400, "empty_file", "Choose a non-empty file.", false, request);
  }
  if (file.size > maxBytes) {
    return errorResponse(413, "file_too_large", "The selected file is too large.", false, request);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (mimeType === OCR_PDF_MIME_TYPE) {
    const validation = await validatePdfOcrBytes({
      bytes,
      documentMaxPages: getConfiguredDurableDocumentMaxPdfPages(),
      fileName: displayName,
      mimeType,
    });
    if (!validation.ok) {
      return errorResponse(
        validation.code === "file_too_large" ? 413 : 422,
        validation.code,
        mapPdfValidationMessage(validation.code, validation.documentPageLimit),
        false,
        request,
      );
    }

    const job = await createExtractionProcessingJob({
      client: createProcessingJobServiceClient(),
      idempotencyKey,
      source: {
        bytes,
        displayName,
        mimeType: OCR_PDF_MIME_TYPE,
        sourceKind: "pdf",
        pageCount: validation.pageCount,
      },
      userId,
    });
    return acceptedResponse(
      await dispatchAcceptedProcessingJob(job),
      request,
    );
  }

  const imageValidation = validateImageOcrBytes({
    bytes,
    fileName: displayName,
    mimeType,
  });
  if (!imageValidation.ok) {
    return errorResponse(
      imageValidation.code === "image_too_large" ? 413 : 415,
      imageValidation.code,
      "Choose a supported PNG or JPEG image.",
      false,
      request,
    );
  }

  const job = await createExtractionProcessingJob({
    client: createProcessingJobServiceClient(),
    idempotencyKey,
    source: {
      bytes,
      displayName,
      mimeType: imageValidation.input.mimeType,
      sourceKind: "image",
      pageCount: 1,
    },
    userId,
  });
  return acceptedResponse(
    await dispatchAcceptedProcessingJob(job),
    request,
  );
}

async function createReviewerJob(
  request: Request,
  userId: string,
): Promise<Response> {
  if (isOversizedContentLength(request.headers.get("content-length"))) {
    return errorResponse(
      413,
      "payload_too_large",
      "The reviewer source is too large.",
      false,
      request,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.", false, request);
  }
  if (!isRecord(body) || body.jobType !== "reviewer_generation") {
    return errorResponse(
      400,
      "invalid_job_type",
      "jobType must be reviewer_generation.",
      false,
      request,
    );
  }

  const sourceVersionId = readOptionalString(body.sourceVersionId);
  if (sourceVersionId && !isUuid(sourceVersionId)) {
    return errorResponse(
      400,
      "invalid_source_version_id",
      "sourceVersionId must be a UUID.",
      false,
      request,
    );
  }
  const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim() : "";
  if (!sourceText && !sourceVersionId) {
    return errorResponse(400, "missing_source_text", "Source text is required.", false, request);
  }
  if (sourceText.length > REVIEWER_GENERATE_MAX_SOURCE_TEXT_CHARS) {
    return errorResponse(
      413,
      "source_text_too_large",
      `Source text must be at most ${REVIEWER_GENERATE_MAX_SOURCE_TEXT_CHARS} characters.`,
      false,
      request,
    );
  }
  const reuseMode = body.reuseMode ?? "fresh";
  if (reuseMode !== "fresh" && reuseMode !== "reuse_existing") {
    return errorResponse(
      400,
      "invalid_reuse_mode",
      "reuseMode must be fresh or reuse_existing.",
      false,
      request,
    );
  }

  const idempotencyKey = validateIdempotencyKey(
    request.headers.get(IDEMPOTENCY_HEADER) ?? readOptionalString(body.idempotencyKey),
  );
  const sourceTitle = readOptionalString(body.sourceTitle)?.slice(0, 180);
  const canvasContext = await validateAndSnapshotCanvasContext({
    body,
    sourceText,
    sourceTitle,
    userId,
  });
  if (!canvasContext.ok) {
    return errorResponse(
      canvasContext.status,
      canvasContext.code,
      canvasContext.message,
      false,
      request,
    );
  }

  const job = await createReviewerProcessingJob({
    client: createProcessingJobServiceClient(),
    idempotencyKey,
    source: {
      sourceText,
      ...(sourceTitle ? { sourceTitle } : {}),
      ...(sourceVersionId ? { sourceVersionId } : {}),
      language: readOptionalString(body.language) ?? "auto",
      outputMode: readOptionalString(body.outputMode) ?? "standard",
      reuseMode,
      ...(canvasContext.metadata
        ? { sourcePrivateMetadata: canvasContext.metadata }
        : {}),
    },
    userId,
  });
  return acceptedResponse(
    await dispatchAcceptedProcessingJob(job),
    request,
  );
}

async function validateAndSnapshotCanvasContext({
  body,
  sourceText,
  sourceTitle,
  userId,
}: {
  readonly body: Record<string, unknown>;
  readonly sourceText: string;
  readonly sourceTitle?: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly metadata?: Record<string, string | string[]> }
  | {
      readonly ok: false;
      readonly status: 400 | 404 | 409 | 422 | 500;
      readonly code: string;
      readonly message: string;
    }
> {
  const previewSessionId = readOptionalString(body.canvasPreviewSessionId);
  if (!previewSessionId) {
    return { ok: true };
  }

  const courseId = readOptionalString(body.canvasCourseId);
  const resolutionFingerprint = readOptionalString(body.canvasResolutionFingerprint);
  const itemIds = Array.isArray(body.canvasItemIds) &&
      body.canvasItemIds.every((item) => typeof item === "string")
    ? body.canvasItemIds.map((item) => item.trim())
    : [];
  if (!courseId || !resolutionFingerprint || itemIds.length === 0) {
    return {
      ok: false,
      status: 400,
      code: "invalid_canvas_resolution",
      message: "Canvas preview identity is incomplete.",
    };
  }

  const client = createCanvasServiceClient();
  const preview = await validateCanvasPreviewSessionForGeneration({
    client,
    previewSessionId,
    userId,
  });
  if (!preview.ok) {
    return preview;
  }
  if (!preview.value) {
    return {
      ok: false,
      status: 409,
      code: "canvas_resolution_stale",
      message: "Canvas source resolution changed. Preview the sources again.",
    };
  }

  const gate = await validateCanvasReviewerGenerationGate({
    client,
    courseId,
    itemIds,
    previewSession: preview.value,
    resolutionFingerprint,
    userId,
  });
  if (!gate.ok) {
    return gate;
  }

  const snapshot = await createOrReuseReviewerSourceSnapshot({
    client,
    previewSession: preview.value,
    sourceText,
    sourceTitle,
    userId,
  });
  if (!snapshot.ok) {
    return snapshot;
  }

  return {
    ok: true,
    metadata: {
      canvasPreviewSessionId: previewSessionId,
      canvasCourseId: courseId,
      canvasItemIds: itemIds,
      canvasResolutionFingerprint: resolutionFingerprint,
      reviewerSourceSnapshotId: snapshot.value.sourceSnapshotId,
    },
  };
}

function acceptedResponse(
  job: Parameters<typeof toProcessingJobStatusView>[0],
  request: Request,
): Response {
  return jsonResponse(
    { ok: true, data: toProcessingJobStatusView(job) },
    202,
    request,
  );
}

function readUploadedFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File ? value : null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function readListLimit(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 50) : 20;
}

function encodeJobCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString(
    "base64url",
  );
}

function decodeJobCursor(
  value: string | null,
): { readonly createdAt: string; readonly id: string } | null | false {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as unknown;
    if (
      !isRecord(parsed) ||
      typeof parsed.createdAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.createdAt)) ||
      typeof parsed.id !== "string" ||
      !isUuid(parsed.id)
    ) {
      return false;
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return false;
  }
}

function isOversizedContentLength(value: string | null): boolean {
  if (!value) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > REVIEWER_GENERATE_MAX_JSON_BODY_BYTES;
}

function mapPdfValidationMessage(code: string, pageLimit?: number): string {
  switch (code) {
    case "pdf_encrypted":
      return "Choose a PDF that does not require a password.";
    case "pdf_page_limit_exceeded":
      return pageLimit
        ? `Choose a PDF with ${pageLimit} pages or fewer.`
        : "The PDF exceeds the configured page limit.";
    case "file_too_large":
      return "The PDF is too large.";
    case "empty_file":
      return "Choose a non-empty PDF.";
    default:
      return "Choose a valid PDF file.";
  }
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
  request: Request,
): Response {
  return jsonResponse(
    { ok: false, error: { code, message, retryable } },
    status,
    request,
  );
}

function jsonResponse(
  body: unknown,
  status: number,
  request: Request,
): Response {
  return NextResponse.json(body, {
    status,
    headers: createCorsHeaders(request.headers.get("origin")),
  });
}

function createCorsHeaders(origin: string | null): HeadersInit {
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
    "Access-Control-Max-Age": CORS_MAX_AGE_SECONDS,
  };
}
