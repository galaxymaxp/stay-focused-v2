import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createProcessingJobServiceClient } from "@/lib/processing-jobs/repository";
import {
  createProcessingUploadIntent,
  ProcessingUploadIntentError,
  PROCESSING_TUS_CHUNK_BYTES,
  type ProcessingUploadMimeType,
} from "@/lib/processing-jobs/upload-intents";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return error(401, "unauthorized", "Sign in again to upload a source.", false);
  }

  try {
    const body = await request.json() as unknown;
    if (!isRecord(body)) {
      return error(400, "invalid_json", "Upload metadata is required.", false);
    }
    const mimeType = readMimeType(body.mimeType);
    if (!mimeType) {
      return error(
        415,
        "unsupported_media_type",
        "Choose a supported PDF, PNG, or JPEG file.",
        false,
      );
    }
    const prepared = await createProcessingUploadIntent(
      createProcessingJobServiceClient(),
      {
        userId: user.id,
        displayName: typeof body.displayName === "string" ? body.displayName : "",
        mimeType,
        byteSize: typeof body.byteSize === "number" ? body.byteSize : Number.NaN,
      },
    );
    return NextResponse.json(
      {
        ok: true,
        data: {
          uploadId: prepared.intent.id,
          bucket: prepared.intent.storage_bucket,
          objectPath: prepared.intent.storage_object_path,
          tusEndpoint: prepared.tusEndpoint,
          chunkSize: PROCESSING_TUS_CHUNK_BYTES,
          expiresAt: prepared.intent.expires_at,
        },
      },
      { status: 201, headers: corsHeaders() },
    );
  } catch (caught) {
    if (caught instanceof ProcessingUploadIntentError) {
      return error(
        caught.code === "file_too_large" ? 413 : caught.retryable ? 503 : 400,
        caught.code,
        caught.safeMessage,
        caught.retryable,
      );
    }
    return error(
      503,
      "upload_intent_creation_failed",
      "The upload could not be prepared.",
      true,
    );
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function readMimeType(value: unknown): ProcessingUploadMimeType | null {
  return value === "application/pdf" ||
      value === "image/png" ||
      value === "image/jpeg"
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
