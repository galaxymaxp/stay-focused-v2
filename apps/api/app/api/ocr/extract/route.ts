import {
  OCR_SUPPORTED_IMAGE_MIME_TYPES,
  type OcrImageMimeType,
  type OcrProvider,
} from "@stay-focused/ocr";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createServerOcrProvider } from "@/lib/ocr/create-server-ocr-provider";
import {
  extractWithOcrProvider,
  validateImageOcrBytes,
  type OcrProviderFailure,
} from "@/lib/ocr/extraction-service";
import {
  OCR_IMAGE_FORM_FIELD,
  OCR_MAX_IMAGE_BYTES,
} from "@/lib/ocr/upload-policy";
import type {
  OcrExtractErrorCode,
  OcrExtractResponse,
} from "@/types/ocr";

export const runtime = "nodejs";
export const maxDuration = 60;

const CORS_ALLOWED_METHODS = "POST, OPTIONS";
const CORS_ALLOWED_HEADERS = "authorization, content-type";
const CORS_MAX_AGE_SECONDS = "600";

interface UploadedImageFile {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface ValidatedUpload {
  readonly mimeType: OcrImageMimeType;
  readonly fileName?: string;
  readonly bytes: Uint8Array;
}

interface MappedOcrError {
  readonly status: 422 | 500 | 502;
  readonly code: OcrExtractErrorCode;
  readonly message: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handlePost(request);
  } catch {
    return errorResponse(
      500,
      "internal_error",
      "OCR extraction failed.",
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

async function handlePost(request: Request): Promise<Response> {
  if (!hasBearerToken(request.headers.get("authorization"))) {
    return errorResponse(
      401,
      "unauthorized",
      "Authorization header must be Bearer token.",
      request,
    );
  }

  const user = await verifyBearerToken(request);
  if (!user) {
    return errorResponse(
      401,
      "unauthorized",
      "Bearer token is invalid or expired.",
      request,
    );
  }

  if (!isMultipartFormData(request.headers.get("content-type"))) {
    return errorResponse(
      415,
      "unsupported_media_type",
      "OCR extraction requires multipart/form-data.",
      request,
    );
  }

  const upload = await readAndValidateUpload(request);
  if (!upload.ok) {
    return errorResponse(upload.status, upload.code, upload.message, request);
  }

  const provider = createProvider();
  if (!provider.ok) {
    return errorResponse(
      500,
      "ocr_not_configured",
      "OCR provider is not configured.",
      request,
    );
  }

  const extraction = await extractWithOcrProvider(provider.value, {
    kind: "image",
    mimeType: upload.value.mimeType,
    bytes: upload.value.bytes,
    ...(upload.value.fileName ? { fileName: upload.value.fileName } : {}),
  });
  if (!extraction.ok) {
    const mapped = mapOcrError(extraction.failure);
    return errorResponse(mapped.status, mapped.code, mapped.message, request);
  }
  const result = extraction.result;

  if (result.text.trim().length === 0) {
    return errorResponse(
      422,
      "ocr_empty_result",
      "OCR provider returned no extracted text.",
      request,
    );
  }

  return jsonResponse(
    {
      ok: true,
      data: {
        text: result.text,
        pages: result.pages,
        mimeType: result.mimeType,
        provider: result.provider,
        warnings: result.warnings,
      },
    },
    200,
    request,
  );
}

async function readAndValidateUpload(
  request: Request,
): Promise<
  | { readonly ok: true; readonly value: ValidatedUpload }
  | {
      readonly ok: false;
      readonly status: 400 | 413 | 415;
      readonly code: OcrExtractErrorCode;
      readonly message: string;
    }
> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return invalidImage("Request body must be valid multipart/form-data.");
  }

  const file = readUploadedFile(formData.get(OCR_IMAGE_FORM_FIELD));
  if (!file) {
    return invalidImage(`A file field named "${OCR_IMAGE_FORM_FIELD}" is required.`);
  }

  const mimeType = file.type.trim().toLowerCase();
  if (!isSupportedImageMimeType(mimeType)) {
    return {
      ok: false,
      status: 415,
      code: "unsupported_media_type",
      message: `Supported image types are ${OCR_SUPPORTED_IMAGE_MIME_TYPES.join(", ")}.`,
    };
  }

  if (file.size === 0) {
    return {
      ok: false,
      status: 400,
      code: "empty_image",
      message: "Image file must not be empty.",
    };
  }

  if (file.size > OCR_MAX_IMAGE_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "image_too_large",
      message: `Image file must be at most ${OCR_MAX_IMAGE_BYTES} bytes.`,
    };
  }

  const validation = validateImageOcrBytes({
    bytes: new Uint8Array(await file.arrayBuffer()),
    ...(file.name.trim() ? { fileName: file.name.trim() } : {}),
    mimeType,
  });
  if (!validation.ok) {
    return imageValidationError(validation.code);
  }

  return {
    ok: true,
    value: {
      bytes: validation.input.bytes,
      ...(validation.input.fileName ? { fileName: validation.input.fileName } : {}),
      mimeType,
    },
  };
}

function imageValidationError(
  code: "empty_image" | "image_too_large" | "unsupported_media_type",
): {
  readonly ok: false;
  readonly status: 400 | 413 | 415;
  readonly code: OcrExtractErrorCode;
  readonly message: string;
} {
  switch (code) {
    case "empty_image":
      return {
        ok: false,
        status: 400,
        code: "empty_image",
        message: "Image file must not be empty.",
      };
    case "image_too_large":
      return {
        ok: false,
        status: 413,
        code: "image_too_large",
        message: `Image file must be at most ${OCR_MAX_IMAGE_BYTES} bytes.`,
      };
    case "unsupported_media_type":
      return {
        ok: false,
        status: 415,
        code: "unsupported_media_type",
        message: `Supported image types are ${OCR_SUPPORTED_IMAGE_MIME_TYPES.join(", ")}.`,
      };
  }
}

function invalidImage(message: string): {
  readonly ok: false;
  readonly status: 400;
  readonly code: "invalid_image";
  readonly message: string;
} {
  return {
    ok: false,
    status: 400,
    code: "invalid_image",
    message,
  };
}

function readUploadedFile(value: FormDataEntryValue | null): UploadedImageFile | null {
  if (!isRecord(value)) {
    return null;
  }

  const arrayBuffer = value["arrayBuffer"];
  const size = value["size"];
  const type = value["type"];
  const name = value["name"];

  if (
    typeof arrayBuffer !== "function" ||
    typeof size !== "number" ||
    typeof type !== "string"
  ) {
    return null;
  }

  return {
    name: typeof name === "string" ? name : "",
    type,
    size,
    arrayBuffer: () => arrayBuffer.call(value) as Promise<ArrayBuffer>,
  };
}

function hasBearerToken(authHeader: string | null): boolean {
  if (!authHeader) {
    return false;
  }

  const [scheme, token, extra] = authHeader.split(" ");
  return (
    scheme === "Bearer" &&
    typeof token === "string" &&
    token.trim().length > 0 &&
    extra === undefined
  );
}

function isMultipartFormData(contentType: string | null): boolean {
  return contentType?.toLowerCase().startsWith("multipart/form-data") ?? false;
}

function isSupportedImageMimeType(value: string): value is OcrImageMimeType {
  return OCR_SUPPORTED_IMAGE_MIME_TYPES.some((mimeType) => mimeType === value);
}

function createProvider():
  | { readonly ok: true; readonly value: OcrProvider }
  | { readonly ok: false } {
  try {
    return { ok: true, value: createServerOcrProvider() };
  } catch {
    return { ok: false };
  }
}

function mapOcrError(error: OcrProviderFailure): MappedOcrError {
  switch (error.code) {
    case "ocr_not_configured":
      return {
        status: 500,
        code: "ocr_not_configured",
        message: "OCR provider is not configured.",
      };
    case "ocr_empty_result":
      return {
        status: 422,
        code: "ocr_empty_result",
        message: "OCR provider returned no extracted text.",
      };
    case "ocr_provider_failed":
      return {
        status: 502,
        code: "ocr_provider_failed",
        message: "OCR provider failed.",
      };
    case "internal_error":
    return {
      status: 500,
      code: "internal_error",
      message: "OCR extraction failed.",
    };
  }
}

function errorResponse(
  status: 400 | 401 | 413 | 415 | 422 | 500 | 502,
  code: OcrExtractErrorCode,
  message: string,
  request?: Request,
): Response {
  return jsonResponse(
    {
      ok: false,
      error: { code, message },
    },
    status,
    request,
  );
}

function jsonResponse(
  body: OcrExtractResponse,
  status: 200 | 400 | 401 | 413 | 415 | 422 | 500 | 502,
  request?: Request,
): Response {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...createCorsHeaders(request?.headers.get("origin") ?? null),
    },
  });
}

function createCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = getAllowedCorsOrigin(origin);
  if (!allowedOrigin) {
    return { Vary: "Origin" };
  }

  return {
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Max-Age": CORS_MAX_AGE_SECONDS,
    Vary: "Origin",
  };
}

function getAllowedCorsOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]";

    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      isLocalhost
    ) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
