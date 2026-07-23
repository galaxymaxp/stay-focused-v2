import type {
  SourceVersionRevisionResult,
  SourceVersionSummary,
} from "@stay-focused/shared";

import type {
  ProcessingJobApiError,
  ProcessingJobApiResult,
} from "./processingJobsApi";

export interface SourceVersionDetail extends SourceVersionSummary {
  readonly sourceText: string;
}

export async function getSourceVersion(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly sourceVersionId: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<ProcessingJobApiResult<SourceVersionDetail>> {
  return request(input, "GET", undefined, isSourceVersionDetail);
}

export async function createSourceVersionRevision(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly sourceVersionId: string;
  readonly sourceText: string;
  readonly expectedParentSha256: string;
  readonly selectAsActive?: boolean;
  readonly fetchImpl?: typeof fetch;
}): Promise<ProcessingJobApiResult<SourceVersionRevisionResult>> {
  return request(
    input,
    "POST",
    {
      sourceText: input.sourceText,
      expectedParentSha256: input.expectedParentSha256,
      selectAsActive: input.selectAsActive ?? true,
    },
    isSourceVersionRevisionResult,
  );
}

async function request<T>(
  input: {
    readonly apiBaseUrl: string;
    readonly accessToken: string;
    readonly sourceVersionId: string;
    readonly fetchImpl?: typeof fetch;
  },
  method: "GET" | "POST",
  body: unknown,
  parse: (value: unknown) => value is T,
): Promise<ProcessingJobApiResult<T>> {
  const baseUrl = input.apiBaseUrl.trim().replace(/\/+$/, "");
  if (!baseUrl || !input.accessToken.trim()) {
    return failure("invalid_source_request", "Sign in again to view this source.", false);
  }
  const suffix = method === "POST" ? "/revisions" : "";
  try {
    const response = await (input.fetchImpl ?? fetch)(
      `${baseUrl}/api/sources/${encodeURIComponent(input.sourceVersionId)}${suffix}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
    );
    const parsed = await readJson(response);
    if (!response.ok) {
      return parseError(response.status, parsed);
    }
    if (!isRecord(parsed) || parsed.ok !== true || !parse(parsed.data)) {
      return failure("invalid_response", "The server returned an invalid source.", true);
    }
    return { ok: true, data: parsed.data };
  } catch {
    return failure("network_error", "The source is unavailable while offline.", true);
  }
}

function isSourceVersionDetail(value: unknown): value is SourceVersionDetail {
  return (
    isRecord(value) &&
    isSourceVersionSummary(value) &&
    typeof value.sourceText === "string"
  );
}

function isSourceVersionRevisionResult(
  value: unknown,
): value is SourceVersionRevisionResult {
  return (
    isRecord(value) &&
    isSourceVersionSummary(value) &&
    typeof value.conflictDetected === "boolean" &&
    typeof value.selectedAsActive === "boolean"
  );
}

function isSourceVersionSummary(value: unknown): value is SourceVersionSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (typeof value.documentAssetId === "string" || value.documentAssetId === null) &&
    (typeof value.parentSourceVersionId === "string" ||
      value.parentSourceVersionId === null) &&
    typeof value.revisionKind === "string" &&
    typeof value.contentSha256 === "string" &&
    typeof value.characterCount === "number" &&
    typeof value.createdAt === "string"
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function parseError(
  status: number,
  value: unknown,
): ProcessingJobApiResult<never> {
  if (isRecord(value) && value.ok === false && isRecord(value.error)) {
    return failure(
      typeof value.error.code === "string" ? value.error.code : "source_request_failed",
      typeof value.error.message === "string"
        ? value.error.message
        : "Source request failed.",
      value.error.retryable === true,
      status,
    );
  }
  return failure("source_request_failed", "Source request failed.", status >= 500, status);
}

function failure(
  code: string,
  message: string,
  retryable: boolean,
  status?: number,
): { readonly ok: false; readonly error: ProcessingJobApiError } {
  return {
    ok: false,
    error: { code, message, retryable, ...(status !== undefined ? { status } : {}) },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
