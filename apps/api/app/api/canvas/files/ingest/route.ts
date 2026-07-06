import { ingestCanvasFiles } from "@/lib/canvas-file-ingestion";
import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST } from "@/lib/canvas-file-policy";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INGEST_BODY_BYTES = 4 * 1024;
const INGEST_REQUEST_FIELDS = new Set(["fileIds"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const ingestRequest = await readIngestRequest(request);
  if (!ingestRequest.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: ingestRequest.code,
          message: ingestRequest.message,
        },
      },
      ingestRequest.status,
      request,
    );
  }

  const result = await ingestCanvasFiles({
    client: auth.value.client,
    fileIds: ingestRequest.fileIds,
    userId: auth.value.user.id,
  });

  if (result.ok) {
    return jsonResponse(result.response, 200, request);
  }

  return jsonResponse(
    {
      ok: false,
      error: {
        code: result.code,
        message: result.message,
      },
    },
    result.status,
    request,
  );
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "POST, OPTIONS");
}

async function readIngestRequest(
  request: Request,
): Promise<
  | { readonly ok: true; readonly fileIds: readonly string[] }
  | {
      readonly ok: false;
      readonly status: 400 | 413;
      readonly code: "invalid_json" | "invalid_request" | "payload_too_large";
      readonly message: string;
    }
> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return invalidRequest("Request content type must be application/json.");
  }

  if (isOversizedContentLength(request.headers.get("content-length"))) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_INGEST_BODY_BYTES} bytes.`,
    };
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_INGEST_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_INGEST_BODY_BYTES} bytes.`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return {
      ok: false,
      status: 400,
      code: "invalid_json",
      message: "Request body must be valid JSON.",
    };
  }

  if (!isRecord(parsed)) {
    return invalidRequest("Request body must be a JSON object.");
  }
  if (!Object.keys(parsed).every((key) => INGEST_REQUEST_FIELDS.has(key))) {
    return invalidRequest("Request body contains unsupported fields.");
  }
  if (!Array.isArray(parsed.fileIds)) {
    return invalidRequest("fileIds must be an array.");
  }

  const fileIds = parsed.fileIds;
  if (
    fileIds.length === 0 ||
    fileIds.length > CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST
  ) {
    return {
      ok: false,
      status: fileIds.length === 0 ? 400 : 413,
      code: fileIds.length === 0 ? "invalid_request" : "payload_too_large",
      message: `Request must include 1 to ${CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST} Canvas file ids.`,
    };
  }

  const normalized = new Set<string>();
  for (const fileId of fileIds) {
    if (typeof fileId !== "string" || !UUID_PATTERN.test(fileId)) {
      return invalidRequest("fileIds must contain only Canvas file row ids.");
    }
    normalized.add(fileId.toLowerCase());
  }
  if (normalized.size !== fileIds.length) {
    return invalidRequest("fileIds must not contain duplicates.");
  }

  return { ok: true, fileIds: [...normalized] };
}

function invalidRequest(message: string): {
  readonly ok: false;
  readonly status: 400;
  readonly code: "invalid_request";
  readonly message: string;
} {
  return {
    ok: false,
    status: 400,
    code: "invalid_request",
    message,
  };
}

function isOversizedContentLength(contentLength: string | null): boolean {
  if (!contentLength) {
    return false;
  }
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_INGEST_BODY_BYTES;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  return contentType
    .split(";")[0]
    ?.trim()
    .toLowerCase() === "application/json";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
