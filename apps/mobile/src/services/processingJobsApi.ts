import type { ReviewerOutput } from "@stay-focused/engine";
import type {
  ProcessingJobListPage,
  ProcessingJobProvenance,
  ProcessingJobStatusView,
  ProcessingJobType,
} from "@stay-focused/shared";

import type {
  OcrImageUpload,
  OcrPdfUpload,
  OcrUploadPlatform,
  ValidatedOcrImageUpload,
  ValidatedOcrPdfUpload,
} from "./ocrApi";
import {
  createNativeOcrPdfUploadPart,
  createNativeOcrUploadPart,
  validateOcrImageUpload,
  validateOcrPdfUpload,
} from "./ocrApi";
import { API_BASE_URL_SETUP_HINT } from "./reviewerApi";

const JOBS_PATH = "/api/jobs";

// Upload is the only phase that must finish before the user may leave the app.
// Accepted work uses short, independent status/result request timeouts.
export const MOBILE_SOURCE_UPLOAD_TIMEOUT_MS = 60_000;
export const MOBILE_JOB_CREATION_TIMEOUT_MS = 20_000;
export const MOBILE_JOB_STATUS_TIMEOUT_MS = 10_000;
export const MOBILE_JOB_RESULT_TIMEOUT_MS = 15_000;
export const MOBILE_JOB_POLL_INTERVAL_MS = 3_000;

export interface ProcessingJobApiInput {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
}

export interface CreateExtractionJobInput extends ProcessingJobApiInput {
  readonly idempotencyKey: string;
  readonly source:
    | { readonly kind: "image"; readonly value: OcrImageUpload }
    | { readonly kind: "pdf"; readonly value: OcrPdfUpload };
  readonly platformOS?: OcrUploadPlatform;
}

export interface CreateReviewerJobInput extends ProcessingJobApiInput {
  readonly idempotencyKey: string;
  readonly sourceText: string;
  readonly sourceTitle?: string;
  readonly canvasPreviewSessionId?: string;
  readonly canvasCourseId?: string;
  readonly canvasItemIds?: readonly string[];
  readonly canvasResolutionFingerprint?: string;
  readonly sourceVersionId?: string;
  readonly language?: string;
  readonly outputMode?: string;
  readonly reuseMode?: "fresh" | "reuse_existing";
}

export interface ExtractionJobResult {
  readonly text: string;
  readonly pageCount: number;
  readonly processedPageCount: number;
  readonly extraction?: unknown;
  readonly normalization?: unknown;
  readonly sourceVersionId?: string;
  readonly extractionResultId?: string;
}

export interface ReviewerJobResult {
  readonly reviewer: ReviewerOutput;
  readonly sourceSnapshotId?: string;
  readonly sourceVersionId?: string;
  readonly sourceContentSha256?: string;
  readonly artifactVersionId?: string;
  readonly provenance?: ProcessingJobProvenance;
}

export type ProcessingJobApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ProcessingJobApiError };

export interface ProcessingJobApiError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly status?: number;
}

export async function createExtractionJob(
  input: CreateExtractionJobInput,
): Promise<ProcessingJobApiResult<ProcessingJobStatusView>> {
  const setup = validateApiInput(input);
  if (!setup.ok) return setup;

  const formData = new FormData();
  const validated = input.source.kind === "pdf"
    ? validateOcrPdfUpload(input.source.value)
    : validateOcrImageUpload(input.source.value);
  if (!validated.ok) {
    return failure(validated.error.code, validated.error.message, false, validated.error.status);
  }

  try {
    await appendSourceFile({
      fetchImpl: input.fetchImpl ?? fetch,
      formData,
      platformOS: input.platformOS ?? defaultPlatform(),
      sourceKind: input.source.kind,
      source: validated.value,
    });
  } catch {
    return failure("source_read_failed", "The selected source could not be read.", true);
  }
  formData.append("displayName", validated.value.fileName);
  formData.append("jobType", "document_extraction");

  return await requestJobStatusView({
    ...setup.data,
    body: formData,
    fetchImpl: input.fetchImpl,
    idempotencyKey: input.idempotencyKey,
    method: "POST",
    path: JOBS_PATH,
    timeoutMs: MOBILE_SOURCE_UPLOAD_TIMEOUT_MS,
    operation: "job creation",
  });
}

export async function createReviewerJob(
  input: CreateReviewerJobInput,
): Promise<ProcessingJobApiResult<ProcessingJobStatusView>> {
  const setup = validateApiInput(input);
  if (!setup.ok) return setup;
  const sourceText = input.sourceText.trim();
  if (!sourceText) return failure("missing_source_text", "Source text is required.", false);

  return await requestJobStatusView({
    ...setup.data,
    body: JSON.stringify({
      jobType: "reviewer_generation",
      sourceText,
      ...(input.sourceTitle?.trim() ? { sourceTitle: input.sourceTitle.trim() } : {}),
      ...(input.sourceVersionId ? { sourceVersionId: input.sourceVersionId } : {}),
      language: input.language ?? "auto",
      outputMode: input.outputMode ?? "standard",
      reuseMode: input.reuseMode ?? "fresh",
      ...(input.canvasPreviewSessionId
        ? {
            canvasPreviewSessionId: input.canvasPreviewSessionId,
            canvasCourseId: input.canvasCourseId,
            canvasItemIds: input.canvasItemIds,
            canvasResolutionFingerprint: input.canvasResolutionFingerprint,
          }
        : {}),
    }),
    contentType: "application/json",
    fetchImpl: input.fetchImpl,
    idempotencyKey: input.idempotencyKey,
    method: "POST",
    path: JOBS_PATH,
    timeoutMs: MOBILE_JOB_CREATION_TIMEOUT_MS,
    operation: "job creation",
  });
}

export async function getProcessingJobStatus(
  input: ProcessingJobApiInput & { readonly jobId: string },
): Promise<ProcessingJobApiResult<ProcessingJobStatusView>> {
  const setup = validateApiInput(input);
  if (!setup.ok) return setup;
  return await requestJobStatusView({
    ...setup.data,
    fetchImpl: input.fetchImpl,
    method: "GET",
    path: `${JOBS_PATH}/${encodeURIComponent(input.jobId)}`,
    timeoutMs: MOBILE_JOB_STATUS_TIMEOUT_MS,
    operation: "status check",
  });
}

export async function listActiveProcessingJobs(
  input: ProcessingJobApiInput,
): Promise<ProcessingJobApiResult<readonly ProcessingJobStatusView[]>> {
  const setup = validateApiInput(input);
  if (!setup.ok) return setup;
  return await requestJson({
    ...setup.data,
    fetchImpl: input.fetchImpl,
    method: "GET",
    path: JOBS_PATH,
    timeoutMs: MOBILE_JOB_STATUS_TIMEOUT_MS,
    operation: "active job check",
    parse: parseJobList,
  });
}

export async function listProcessingJobsPage(
  input: ProcessingJobApiInput & {
    readonly limit?: number;
    readonly cursor?: string;
  },
): Promise<ProcessingJobApiResult<ProcessingJobListPage>> {
  const setup = validateApiInput(input);
  if (!setup.ok) return setup;
  const parameters = new URLSearchParams({
    scope: "all",
    limit: String(Math.min(Math.max(input.limit ?? 20, 1), 50)),
  });
  if (input.cursor) parameters.set("cursor", input.cursor);
  return await requestJson({
    ...setup.data,
    fetchImpl: input.fetchImpl,
    method: "GET",
    path: `${JOBS_PATH}?${parameters.toString()}`,
    timeoutMs: MOBILE_JOB_STATUS_TIMEOUT_MS,
    operation: "processing history check",
    parse: parseJobPage,
  });
}

export async function cancelProcessingJob(
  input: ProcessingJobApiInput & { readonly jobId: string },
): Promise<ProcessingJobApiResult<ProcessingJobStatusView>> {
  const setup = validateApiInput(input);
  if (!setup.ok) return setup;
  return await requestJobStatusView({
    ...setup.data,
    fetchImpl: input.fetchImpl,
    method: "POST",
    path: `${JOBS_PATH}/${encodeURIComponent(input.jobId)}/cancel`,
    timeoutMs: MOBILE_JOB_STATUS_TIMEOUT_MS,
    operation: "cancellation",
  });
}

export async function retryProcessingJob(
  input: ProcessingJobApiInput & {
    readonly jobId: string;
    readonly idempotencyKey: string;
  },
): Promise<ProcessingJobApiResult<ProcessingJobStatusView>> {
  const setup = validateApiInput(input);
  if (!setup.ok) return setup;
  return await requestJobStatusView({
    ...setup.data,
    fetchImpl: input.fetchImpl,
    idempotencyKey: input.idempotencyKey,
    method: "POST",
    path: `${JOBS_PATH}/${encodeURIComponent(input.jobId)}/retry`,
    timeoutMs: MOBILE_JOB_CREATION_TIMEOUT_MS,
    operation: "retry creation",
  });
}

export async function getExtractionJobResult(
  input: ProcessingJobApiInput & { readonly jobId: string },
): Promise<ProcessingJobApiResult<ExtractionJobResult>> {
  return await getJobResult(input, "document_extraction", parseExtractionResult);
}

export async function getReviewerJobResult(
  input: ProcessingJobApiInput & { readonly jobId: string },
): Promise<ProcessingJobApiResult<ReviewerJobResult>> {
  return await getJobResult(input, "reviewer_generation", parseReviewerResult);
}

export function createProcessingJobIdempotencyKey(
  jobType: ProcessingJobType,
): string {
  const random = Math.random().toString(36).slice(2, 14);
  return `${jobType}:${Date.now().toString(36)}:${random}`;
}

async function getJobResult<T>(
  input: ProcessingJobApiInput & { readonly jobId: string },
  expectedType: ProcessingJobType,
  parseResult: (value: unknown, envelope: Record<string, unknown>) => T | null,
): Promise<ProcessingJobApiResult<T>> {
  const setup = validateApiInput(input);
  if (!setup.ok) return setup;
  return await requestJson({
    ...setup.data,
    fetchImpl: input.fetchImpl,
    method: "GET",
    path: `${JOBS_PATH}/${encodeURIComponent(input.jobId)}/result`,
    timeoutMs: MOBILE_JOB_RESULT_TIMEOUT_MS,
    operation: "result retrieval",
    parse: (value) => {
      if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) return null;
      if (value.data.jobType !== expectedType) return null;
      return parseResult(value.data.result, value.data);
    },
  });
}

async function requestJobStatusView(
  input: RequestInput,
): Promise<ProcessingJobApiResult<ProcessingJobStatusView>> {
  return await requestJson({ ...input, parse: parseJobStatusResponse });
}

interface RequestInput {
  readonly baseUrl: string;
  readonly accessToken: string;
  readonly path: string;
  readonly method: "GET" | "POST";
  readonly body?: BodyInit;
  readonly contentType?: string;
  readonly idempotencyKey?: string;
  readonly timeoutMs: number;
  readonly operation: string;
  readonly fetchImpl?: typeof fetch;
}

async function requestJson<T>(
  input: RequestInput & { readonly parse: (value: unknown) => T | null },
): Promise<ProcessingJobApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await (input.fetchImpl ?? fetch)(`${input.baseUrl}${input.path}`, {
      method: input.method,
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        ...(input.contentType ? { "Content-Type": input.contentType } : {}),
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      ...(input.body !== undefined ? { body: input.body } : {}),
      signal: controller.signal,
    });
    const parsed = await readJson(response);
    if (!response.ok) return parseApiError(response.status, parsed);
    const data = input.parse(parsed);
    if (data === null) return failure("invalid_response", "The server returned an invalid response.", true, response.status);
    return { ok: true, data };
  } catch (error) {
    if (isAbortError(error)) {
      console.info("processing_job_api.request_timeout", { operation: input.operation });
      return failure(
        "request_timeout",
        `The ${input.operation} timed out. Accepted server work, if any, was not cancelled.`,
        true,
      );
    }
    console.warn("processing_job_api.network_unavailable", { operation: input.operation });
    return failure(
      "network_error",
      `The ${input.operation} could not reach the API. ${API_BASE_URL_SETUP_HINT}`,
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

function validateApiInput(
  input: ProcessingJobApiInput,
): ProcessingJobApiResult<{ readonly baseUrl: string; readonly accessToken: string }> {
  const baseUrl = input.apiBaseUrl.trim().replace(/\/+$/, "");
  if (!baseUrl) return failure("invalid_api_base_url", API_BASE_URL_SETUP_HINT, false);
  try {
    const url = new URL(baseUrl);
    if (!/^https?:$/.test(url.protocol) || url.search || url.hash) throw new Error();
  } catch {
    return failure("invalid_api_base_url", API_BASE_URL_SETUP_HINT, false);
  }
  const accessToken = input.accessToken.trim();
  if (!accessToken) return failure("missing_access_token", "Sign in again to continue.", false);
  return { ok: true, data: { baseUrl, accessToken } };
}

async function appendSourceFile({
  fetchImpl,
  formData,
  platformOS,
  source,
  sourceKind,
}: {
  readonly fetchImpl: typeof fetch;
  readonly formData: FormData;
  readonly platformOS: OcrUploadPlatform;
  readonly source: ValidatedOcrImageUpload | ValidatedOcrPdfUpload;
  readonly sourceKind: "image" | "pdf";
}): Promise<void> {
  if (platformOS === "web") {
    const blob = source.webFile ?? await fetchImpl(source.uri).then((response) => response.blob());
    if (!blob) throw new Error("Selected source did not provide file data.");
    formData.append("source", blob, source.fileName);
    return;
  }
  const part = sourceKind === "pdf"
    ? createNativeOcrPdfUploadPart(source as ValidatedOcrPdfUpload)
    : createNativeOcrUploadPart(source as ValidatedOcrImageUpload);
  formData.append("source", part as unknown as Blob);
}

function parseJobStatusResponse(value: unknown): ProcessingJobStatusView | null {
  return isRecord(value) && value.ok === true && isJobStatusView(value.data)
    ? value.data
    : null;
}

function parseJobList(value: unknown): readonly ProcessingJobStatusView[] | null {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.data)) return null;
  return value.data.every(isJobStatusView) ? value.data : null;
}

function parseJobPage(value: unknown): ProcessingJobListPage | null {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRecord(value.data) ||
    !Array.isArray(value.data.jobs) ||
    !value.data.jobs.every(isJobStatusView) ||
    !(typeof value.data.nextCursor === "string" || value.data.nextCursor === null)
  ) {
    return null;
  }
  return {
    jobs: value.data.jobs,
    nextCursor: value.data.nextCursor,
  };
}

function isJobStatusView(value: unknown): value is ProcessingJobStatusView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.jobType === "document_extraction" || value.jobType === "reviewer_generation") &&
    typeof value.status === "string" &&
    typeof value.stage === "string" &&
    isRecord(value.progress) &&
    isRecord(value.source) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.resultAvailable === "boolean"
  );
}

function parseExtractionResult(
  value: unknown,
  envelope: Record<string, unknown>,
): ExtractionJobResult | null {
  if (!isRecord(value) || typeof value.text !== "string") return null;
  return {
    text: value.text,
    pageCount: typeof value.pageCount === "number" ? value.pageCount : 1,
    processedPageCount:
      typeof value.processedPageCount === "number" ? value.processedPageCount : 1,
    ...(value.extraction !== undefined ? { extraction: value.extraction } : {}),
    ...(value.normalization !== undefined ? { normalization: value.normalization } : {}),
    ...(typeof envelope.sourceVersionId === "string"
      ? { sourceVersionId: envelope.sourceVersionId }
      : {}),
    ...(typeof envelope.sourceContentSha256 === "string"
      ? { sourceContentSha256: envelope.sourceContentSha256 }
      : {}),
    ...(typeof envelope.extractionResultId === "string"
      ? { extractionResultId: envelope.extractionResultId }
      : {}),
  };
}

function parseReviewerResult(
  value: unknown,
  envelope: Record<string, unknown>,
): ReviewerJobResult | null {
  if (!isRecord(value) || !isReviewerOutput(value.reviewer)) return null;
  return {
    reviewer: value.reviewer,
    ...(typeof value.sourceSnapshotId === "string"
      ? { sourceSnapshotId: value.sourceSnapshotId }
      : {}),
    ...(typeof envelope.sourceVersionId === "string"
      ? { sourceVersionId: envelope.sourceVersionId }
      : {}),
    ...(typeof envelope.artifactVersionId === "string"
      ? { artifactVersionId: envelope.artifactVersionId }
      : {}),
    ...(isProcessingJobProvenance(envelope.provenance)
      ? { provenance: envelope.provenance }
      : {}),
  };
}

function isProcessingJobProvenance(
  value: unknown,
): value is ProcessingJobProvenance {
  return (
    isRecord(value) &&
    typeof value.generationPolicyVersion === "string" &&
    typeof value.engineVersion === "string" &&
    typeof value.schemaVersion === "string" &&
    typeof value.providerId === "string" &&
    typeof value.settingsFingerprint === "string" &&
    typeof value.language === "string" &&
    typeof value.outputMode === "string"
  );
}

function isReviewerOutput(value: unknown): value is ReviewerOutput {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.sections) &&
    isRecord(value.metadata)
  );
}

function parseApiError(status: number, value: unknown): ProcessingJobApiResult<never> {
  if (isRecord(value) && value.ok === false && isRecord(value.error)) {
    return failure(
      typeof value.error.code === "string" ? value.error.code : "unknown_api_error",
      typeof value.error.message === "string" ? value.error.message : "Processing request failed.",
      value.error.retryable === true,
      status,
    );
  }
  return failure("unknown_api_error", "Processing request failed.", status >= 500, status);
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

function failure(
  code: string,
  message: string,
  retryable: boolean,
  status?: number,
): ProcessingJobApiResult<never> {
  return { ok: false, error: { code, message, retryable, ...(status !== undefined ? { status } : {}) } };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error ? error.name === "AbortError" : false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultPlatform(): OcrUploadPlatform {
  return typeof document === "undefined" ? "native" : "web";
}
