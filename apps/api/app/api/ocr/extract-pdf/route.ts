import {
  OCR_PDF_MIME_TYPE,
  type OcrProvider,
} from "@stay-focused/ocr";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createServerOcrProvider } from "@/lib/ocr/create-server-ocr-provider";
import {
  extractWithOcrProvider,
  validatePdfOcrBytes,
  type OcrProviderFailure,
} from "@/lib/ocr/extraction-service";
import {
  OCR_MAX_PDF_BYTES,
  OCR_MAX_PDF_PAGES,
  OCR_PDF_FORM_FIELD,
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

interface UploadedPdfFile {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface ValidatedPdfUpload {
  readonly bytes: Uint8Array;
  readonly fileName?: string;
  readonly pageCount: number;
  readonly requestedPages: readonly number[];
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
      "PDF OCR extraction failed.",
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
      "PDF OCR extraction requires multipart/form-data.",
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
    kind: "pdf",
    mimeType: OCR_PDF_MIME_TYPE,
    bytes: upload.value.bytes,
    requestedPages: upload.value.requestedPages,
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
      "no_text_detected",
      "No readable text was detected in this PDF.",
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
        pageCount: upload.value.pageCount,
        processedPageCount: upload.value.requestedPages.length,
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
  | { readonly ok: true; readonly value: ValidatedPdfUpload }
  | {
      readonly ok: false;
      readonly status: 400 | 413 | 415 | 422;
      readonly code: OcrExtractErrorCode;
      readonly message: string;
    }
> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return invalidPdf("Request body must be valid multipart/form-data.");
  }

  const entries = formData.getAll(OCR_PDF_FORM_FIELD);
  if (entries.length === 0) {
    return invalidPdf(`A file field named "${OCR_PDF_FORM_FIELD}" is required.`);
  }
  if (entries.length !== 1) {
    return invalidPdf("Upload exactly one PDF file.");
  }

  const file = readUploadedFile(entries[0] ?? null);
  if (!file) {
    return invalidPdf(`A file field named "${OCR_PDF_FORM_FIELD}" is required.`);
  }

  const mimeType = file.type.trim().toLowerCase();
  if (mimeType !== OCR_PDF_MIME_TYPE) {
    return {
      ok: false,
      status: 415,
      code: "unsupported_file_type",
      message: "Choose a PDF file.",
    };
  }

  if (file.size === 0) {
    return emptyFile();
  }

  if (file.size > OCR_MAX_PDF_BYTES) {
    return fileTooLarge();
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) {
    return emptyFile();
  }

  if (bytes.byteLength > OCR_MAX_PDF_BYTES) {
    return fileTooLarge();
  }

  const validation = await validatePdfOcrBytes({
    bytes,
    ...(file.name.trim()
      ? { fileName: sanitizeDisplayFileName(file.name) }
      : {}),
    mimeType,
  });
  if (!validation.ok) {
    return pdfValidationError(validation.code);
  }

  return {
    ok: true,
    value: {
      bytes,
      ...(validation.input.fileName ? { fileName: validation.input.fileName } : {}),
      pageCount: validation.pageCount,
      requestedPages: validation.requestedPages,
    },
  };
}

function pdfValidationError(
  code:
    | "empty_file"
    | "file_too_large"
    | "invalid_pdf"
    | "pdf_encrypted"
    | "pdf_page_limit_exceeded"
    | "unsupported_file_type",
): {
  readonly ok: false;
  readonly status: 400 | 413 | 415 | 422;
  readonly code: OcrExtractErrorCode;
  readonly message: string;
} {
  switch (code) {
    case "empty_file":
      return emptyFile();
    case "file_too_large":
      return fileTooLarge();
    case "unsupported_file_type":
      return {
        ok: false,
        status: 415,
        code: "unsupported_file_type",
        message: "Choose a PDF file.",
      };
    case "pdf_encrypted":
      return {
        ok: false,
        status: 422,
        code: "pdf_encrypted",
        message: "Password-protected PDFs cannot be read.",
      };
    case "pdf_page_limit_exceeded":
      return {
        ok: false,
        status: 422,
        code: "pdf_page_limit_exceeded",
        message: `PDF OCR supports up to ${OCR_MAX_PDF_PAGES} pages per request.`,
      };
    case "invalid_pdf":
      return invalidPdf("The uploaded PDF could not be parsed.");
  }
}

function invalidPdf(message: string): {
  readonly ok: false;
  readonly status: 400;
  readonly code: "invalid_pdf";
  readonly message: string;
} {
  return {
    ok: false,
    status: 400,
    code: "invalid_pdf",
    message,
  };
}

function emptyFile(): {
  readonly ok: false;
  readonly status: 400;
  readonly code: "empty_file";
  readonly message: string;
} {
  return {
    ok: false,
    status: 400,
    code: "empty_file",
    message: "PDF file must not be empty.",
  };
}

function fileTooLarge(): {
  readonly ok: false;
  readonly status: 413;
  readonly code: "file_too_large";
  readonly message: string;
} {
  return {
    ok: false,
    status: 413,
    code: "file_too_large",
    message: `PDF file must be at most ${OCR_MAX_PDF_BYTES} bytes.`,
  };
}

function readUploadedFile(value: FormDataEntryValue | null): UploadedPdfFile | null {
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

function sanitizeDisplayFileName(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|\0]+/g, "-").slice(0, 180);
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
        code: "no_text_detected",
        message: "No readable text was detected in this PDF.",
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
      message: "PDF OCR extraction failed.",
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
