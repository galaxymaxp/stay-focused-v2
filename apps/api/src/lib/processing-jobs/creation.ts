import type { Json, ProcessingJobDatabaseRow } from "@stay-focused/db";
import type {
  ProcessingJobSourceMetadata,
  ProcessingJobType,
} from "@stay-focused/shared";
import { createHash } from "node:crypto";

import {
  EXTRACTION_JOB_DEADLINE_MS,
  PROCESSING_JOB_SOURCE_BUCKET,
  REVIEWER_JOB_DEADLINE_MS,
} from "./constants";
import {
  createProcessingJobRecord,
  findProcessingJobByIdempotencyKey,
  ProcessingJobRepositoryError,
  type ProcessingJobServiceClient,
} from "./repository";

export interface ExtractionJobSourceInput {
  readonly bytes: Uint8Array;
  readonly displayName: string;
  readonly mimeType: "application/pdf" | "image/png" | "image/jpeg";
  readonly sourceKind: "pdf" | "image";
  readonly pageCount?: number;
}

export interface ReviewerJobSourceInput {
  readonly sourceText: string;
  readonly sourceTitle?: string;
  readonly sourcePrivateMetadata?: Json;
}

export async function createExtractionProcessingJob({
  client,
  idempotencyKey,
  source,
  userId,
}: {
  readonly client: ProcessingJobServiceClient;
  readonly idempotencyKey: string;
  readonly source: ExtractionJobSourceInput;
  readonly userId: string;
}): Promise<ProcessingJobDatabaseRow> {
  const requestFingerprint = hashBytes(
    source.bytes,
    `document_extraction:${source.mimeType}:`,
  );
  const existing = await findProcessingJobByIdempotencyKey(
    client,
    userId,
    idempotencyKey,
  );
  if (existing) {
    return verifyExisting(existing, "document_extraction", requestFingerprint);
  }

  const extension = source.sourceKind === "pdf"
    ? "pdf"
    : source.mimeType === "image/png"
      ? "png"
      : "jpg";
  const objectPath = createPrivateObjectPath({
    extension,
    idempotencyKey,
    requestFingerprint,
    userId,
  });

  const upload = await client.storage
    .from(PROCESSING_JOB_SOURCE_BUCKET)
    .upload(objectPath, source.bytes, {
      cacheControl: "private, max-age=0",
      contentType: source.mimeType,
      upsert: true,
    });
  if (upload.error) {
    throw new ProcessingJobCreationError(
      "processing_job_source_staging_failed",
      "The source could not be staged securely.",
      true,
    );
  }

  const sourceMetadata: ProcessingJobSourceMetadata = {
    displayName: sanitizeDisplayName(source.displayName),
    sourceKind: source.sourceKind,
    mimeType: source.mimeType,
    byteSize: source.bytes.byteLength,
    ...(source.pageCount !== undefined ? { pageCount: source.pageCount } : {}),
  };

  try {
    return await createProcessingJobRecord(client, {
      userId,
      jobType: "document_extraction",
      idempotencyKey,
      requestFingerprint,
      sourceKind: source.sourceKind,
      displayName: sourceMetadata.displayName,
      mimeType: source.mimeType,
      storageBucket: PROCESSING_JOB_SOURCE_BUCKET,
      storageObjectPath: objectPath,
      byteSize: source.bytes.byteLength,
      ...(source.pageCount !== undefined ? { pageCount: source.pageCount } : {}),
      sourceMetadata,
      sourcePrivateMetadata: {
        stagedObjectVersion: "processing-job-source-v1",
      },
      expiresAt: new Date(Date.now() + EXTRACTION_JOB_DEADLINE_MS).toISOString(),
    });
  } catch (error) {
    const raced = await findProcessingJobByIdempotencyKey(
      client,
      userId,
      idempotencyKey,
    );
    if (raced) {
      try {
        return verifyExisting(raced, "document_extraction", requestFingerprint);
      } catch (conflict) {
        // A different-payload race stages a different fingerprinted object.
        // Remove only this request's unreferenced object before returning 409.
        await client.storage
          .from(PROCESSING_JOB_SOURCE_BUCKET)
          .remove([objectPath]);
        throw conflict;
      }
    }

    await client.storage
      .from(PROCESSING_JOB_SOURCE_BUCKET)
      .remove([objectPath]);
    throw mapRepositoryCreationError(error);
  }
}

export async function createReviewerProcessingJob({
  client,
  idempotencyKey,
  source,
  userId,
}: {
  readonly client: ProcessingJobServiceClient;
  readonly idempotencyKey: string;
  readonly source: ReviewerJobSourceInput;
  readonly userId: string;
}): Promise<ProcessingJobDatabaseRow> {
  const normalizedTitle = source.sourceTitle?.trim();
  const requestFingerprint = hashText(
    `reviewer_generation\0${normalizedTitle ?? ""}\0${source.sourceText}`,
  );
  const existing = await findProcessingJobByIdempotencyKey(
    client,
    userId,
    idempotencyKey,
  );
  if (existing) {
    return verifyExisting(existing, "reviewer_generation", requestFingerprint);
  }

  const sourceMetadata: ProcessingJobSourceMetadata = {
    displayName: sanitizeDisplayName(normalizedTitle || "Reviewer source"),
    sourceKind: "text",
    mimeType: "text/plain",
    characterCount: source.sourceText.length,
  };

  try {
    return await createProcessingJobRecord(client, {
      userId,
      jobType: "reviewer_generation",
      idempotencyKey,
      requestFingerprint,
      sourceKind: "text",
      displayName: sourceMetadata.displayName,
      mimeType: "text/plain",
      sourceText: source.sourceText,
      sourceCharacterCount: source.sourceText.length,
      sourceMetadata,
      sourcePrivateMetadata: {
        ...(isRecord(source.sourcePrivateMetadata)
          ? source.sourcePrivateMetadata
          : {}),
        ...(normalizedTitle ? { sourceTitle: normalizedTitle } : {}),
      },
      expiresAt: new Date(Date.now() + REVIEWER_JOB_DEADLINE_MS).toISOString(),
    });
  } catch (error) {
    const raced = await findProcessingJobByIdempotencyKey(
      client,
      userId,
      idempotencyKey,
    );
    if (raced) {
      return verifyExisting(raced, "reviewer_generation", requestFingerprint);
    }
    throw mapRepositoryCreationError(error);
  }
}

export function validateIdempotencyKey(
  value: string | null | undefined,
): string {
  const normalized = value?.trim() ?? "";
  if (
    normalized.length < 8 ||
    normalized.length > 200 ||
    !/^[A-Za-z0-9._:-]+$/.test(normalized)
  ) {
    throw new ProcessingJobCreationError(
      "invalid_idempotency_key",
      "Provide an idempotency key between 8 and 200 safe characters.",
      false,
    );
  }
  return normalized;
}

function verifyExisting(
  job: ProcessingJobDatabaseRow,
  jobType: ProcessingJobType,
  requestFingerprint: string,
): ProcessingJobDatabaseRow {
  if (
    job.job_type !== jobType ||
    job.request_fingerprint !== requestFingerprint
  ) {
    throw new ProcessingJobCreationError(
      "processing_job_idempotency_conflict",
      "This idempotency key was already used for different work.",
      false,
    );
  }
  return job;
}

function createPrivateObjectPath({
  extension,
  idempotencyKey,
  requestFingerprint,
  userId,
}: {
  readonly extension: string;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly userId: string;
}): string {
  const idempotencyHash = hashText(idempotencyKey).slice(0, 32);
  return `${userId}/${idempotencyHash}/${requestFingerprint}.${extension}`;
}

function sanitizeDisplayName(value: string): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || "Source").slice(0, 180);
}

function hashBytes(bytes: Uint8Array, prefix: string): string {
  return createHash("sha256").update(prefix, "utf8").update(bytes).digest("hex");
}

function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function mapRepositoryCreationError(error: unknown): ProcessingJobCreationError {
  if (
    error instanceof ProcessingJobRepositoryError &&
    error.code === "processing_job_idempotency_conflict"
  ) {
    return new ProcessingJobCreationError(
      error.code,
      "This idempotency key was already used for different work.",
      false,
    );
  }
  return new ProcessingJobCreationError(
    "processing_job_persistence_failed",
    "The job could not be accepted durably.",
    true,
  );
}

function isRecord(value: unknown): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class ProcessingJobCreationError extends Error {
  public readonly code: string;
  public readonly safeMessage: string;
  public readonly retryable: boolean;

  public constructor(code: string, safeMessage: string, retryable: boolean) {
    super(code);
    this.name = "ProcessingJobCreationError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.retryable = retryable;
  }
}
