import { OCR_PDF_MIME_TYPE } from "@stay-focused/ocr";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import {
  validateImageOcrBytes,
  validatePdfOcrBytes,
} from "@/lib/ocr/extraction-service";
import { getConfiguredDurableDocumentMaxPdfPages } from "@/lib/ocr/upload-policy";
import {
  createExtractionProcessingJob,
  ProcessingJobCreationError,
  validateIdempotencyKey,
} from "@/lib/processing-jobs/creation";
import {
  createProcessingJobServiceClient,
  findOwnedProcessingJob,
  toProcessingJobStatusView,
} from "@/lib/processing-jobs/repository";
import {
  dispatchAcceptedProcessingJob,
  ProcessingWorkflowDispatchError,
} from "@/lib/processing-jobs/workflow-dispatch";
import {
  findOwnedProcessingUploadIntent,
  markProcessingUploadAccepted,
  ProcessingUploadIntentError,
} from "@/lib/processing-jobs/upload-intents";

export const runtime = "nodejs";
export const maxDuration = 45;

interface RouteContext {
  readonly params: Promise<{ readonly uploadId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return error(401, "unauthorized", "Sign in again to accept this upload.", false);
  }
  const { uploadId } = await context.params;
  if (!isUuid(uploadId)) return notFound();

  const client = createProcessingJobServiceClient();
  try {
    const idempotencyKey = validateIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const intent = await findOwnedProcessingUploadIntent(client, user.id, uploadId);
    if (!intent) return notFound();
    if (intent.status === "accepted" && intent.job_id) {
      const existing = await findOwnedProcessingJob(client, user.id, intent.job_id);
      return existing
        ? accepted(existing)
        : error(409, "accepted_job_unavailable", "The accepted job is unavailable.", true);
    }
    if (intent.status !== "pending" || Date.parse(intent.expires_at) <= Date.now()) {
      return error(
        410,
        "upload_intent_expired",
        "This upload expired. Select the source again.",
        false,
      );
    }

    const downloaded = await client.storage
      .from(intent.storage_bucket)
      .download(intent.storage_object_path);
    if (downloaded.error || !downloaded.data) {
      return error(
        409,
        "upload_incomplete",
        "The upload has not finished. Keep Stay Focused open and try again.",
        true,
      );
    }
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    if (bytes.byteLength !== intent.expected_byte_size) {
      return error(
        422,
        "upload_size_mismatch",
        "The uploaded file is incomplete. Select it again.",
        false,
      );
    }

    let pageCount = 1;
    if (intent.mime_type === OCR_PDF_MIME_TYPE) {
      const validation = await validatePdfOcrBytes({
        bytes,
        documentMaxPages: getConfiguredDurableDocumentMaxPdfPages(),
        fileName: intent.display_name,
        mimeType: intent.mime_type,
      });
      if (!validation.ok) {
        return error(
          validation.code === "file_too_large" ? 413 : 422,
          validation.code,
          validation.code === "pdf_encrypted"
            ? "Choose a PDF that does not require a password."
            : validation.code === "pdf_page_limit_exceeded"
              ? `Choose a PDF with ${validation.documentPageLimit ?? 100} pages or fewer.`
              : "Choose a valid PDF within the configured page limit.",
          false,
        );
      }
      pageCount = validation.pageCount;
    } else {
      const validation = validateImageOcrBytes({
        bytes,
        fileName: intent.display_name,
        mimeType: intent.mime_type,
      });
      if (!validation.ok) {
        return error(
          validation.code === "image_too_large" ? 413 : 422,
          validation.code,
          "Choose a supported PNG or JPEG image.",
          false,
        );
      }
    }

    const job = await createExtractionProcessingJob({
      client,
      idempotencyKey,
      source: {
        bytes,
        displayName: intent.display_name,
        mimeType: intent.mime_type,
        sourceKind: intent.source_kind,
        pageCount,
        stagedObjectPath: intent.storage_object_path,
      },
      userId: user.id,
    });
    const dispatchedJob = await dispatchAcceptedProcessingJob(job, { client });
    await markProcessingUploadAccepted(client, {
      uploadId,
      userId: user.id,
      jobId: dispatchedJob.id,
    });
    return accepted(dispatchedJob);
  } catch (caught) {
    if (caught instanceof ProcessingJobCreationError) {
      return error(
        caught.code === "processing_job_idempotency_conflict" ? 409 : caught.retryable ? 503 : 400,
        caught.code,
        caught.safeMessage,
        caught.retryable,
      );
    }
    if (caught instanceof ProcessingUploadIntentError) {
      return error(503, caught.code, caught.safeMessage, caught.retryable);
    }
    if (caught instanceof ProcessingWorkflowDispatchError) {
      return error(503, caught.code, caught.safeMessage, caught.retryable);
    }
    return error(
      503,
      "upload_acceptance_failed",
      "The upload could not be accepted durably.",
      true,
    );
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function accepted(job: Parameters<typeof toProcessingJobStatusView>[0]): Response {
  return NextResponse.json(
    { ok: true, data: toProcessingJobStatusView(job) },
    { status: 202, headers: corsHeaders() },
  );
}

function notFound(): Response {
  return error(404, "upload_intent_not_found", "The upload was not found.", false);
}

function error(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
): Response {
  return NextResponse.json(
    { ok: false, error: { code, message, retryable } },
    { status, headers: corsHeaders() },
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
