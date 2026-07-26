import type { Json, ProcessingJobDatabaseRow, SourceVersionRow } from "@stay-focused/db";
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
  createGenerationRequestFingerprint,
  createGenerationSettingsFingerprint,
  DOCUMENT_NORMALIZATION_VERSION,
  DOCUMENT_PARSER_POLICY_VERSION,
  OCR_POLICY_VERSION,
  REVIEWER_ENGINE_VERSION,
  REVIEWER_GENERATION_POLICY_VERSION,
  REVIEWER_PROVIDER_ID,
  REVIEWER_SCHEMA_VERSION,
  sha256Bytes,
  sha256Text,
  type GenerationReuseMode,
} from "./contracts";
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
  readonly stagedObjectPath?: string;
}

export interface ReviewerJobSourceInput {
  readonly sourceText: string;
  readonly sourceTitle?: string;
  readonly sourcePrivateMetadata?: Json;
  readonly sourceVersionId?: string;
  readonly language?: string;
  readonly outputMode?: string;
  readonly reuseMode?: GenerationReuseMode;
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
  const contentSha256 = sha256Bytes(source.bytes);
  const requestFingerprint = hashText(
    JSON.stringify({
      contentSha256,
      jobType: "document_extraction",
      mimeType: source.mimeType,
      normalizationVersion: DOCUMENT_NORMALIZATION_VERSION,
      ocrPolicyVersion: OCR_POLICY_VERSION,
      parserPolicyVersion: DOCUMENT_PARSER_POLICY_VERSION,
    }),
  );
  const existing = await findProcessingJobByIdempotencyKey(
    client,
    userId,
    idempotencyKey,
  );
  if (existing) {
    const verified = verifyExisting(
      existing,
      "document_extraction",
      requestFingerprint,
    );
    if (source.stagedObjectPath) {
      await removeOrQueueOrphanedStaging(
        client,
        userId,
        source.stagedObjectPath,
      );
    }
    return verified;
  }

  const extension = source.sourceKind === "pdf"
    ? "pdf"
    : source.mimeType === "image/png"
      ? "png"
      : "jpg";
  const objectPath = source.stagedObjectPath ?? createPrivateObjectPath({
    extension,
    contentSha256,
    userId,
  });

  const existingAsset = await findOwnedDocumentAssetByContent(
    client,
    userId,
    contentSha256,
    source.mimeType,
    source.bytes.byteLength,
  );
  let stagedNewObject = source.stagedObjectPath !== undefined;
  if (!existingAsset && !source.stagedObjectPath) {
    const upload = await client.storage
      .from(PROCESSING_JOB_SOURCE_BUCKET)
      .upload(objectPath, source.bytes, {
        cacheControl: "private, max-age=0",
        contentType: source.mimeType,
        upsert: false,
      });
    if (upload.error) {
      throw new ProcessingJobCreationError(
        "processing_job_source_staging_failed",
        "The source could not be staged securely.",
        true,
      );
    }
    stagedNewObject = true;
  }

  const sourceMetadata: ProcessingJobSourceMetadata = {
    displayName: sanitizeDisplayName(source.displayName),
    sourceKind: source.sourceKind,
    mimeType: source.mimeType,
    byteSize: source.bytes.byteLength,
    ...(source.pageCount !== undefined ? { pageCount: source.pageCount } : {}),
  };

  try {
    const job = await createProcessingJobRecord(client, {
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
      contract: {
        contentSha256,
        normalizationVersion: DOCUMENT_NORMALIZATION_VERSION,
        ocrPolicyVersion: OCR_POLICY_VERSION,
        parserPolicyVersion: DOCUMENT_PARSER_POLICY_VERSION,
      },
      expiresAt: new Date(Date.now() + EXTRACTION_JOB_DEADLINE_MS).toISOString(),
    });
    if (existingAsset && source.stagedObjectPath) {
      await removeOrQueueOrphanedStaging(client, userId, objectPath);
      stagedNewObject = false;
    }
    return job;
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
        if (stagedNewObject) {
          await removeOrQueueOrphanedStaging(client, userId, objectPath);
        }
        throw conflict;
      }
    }

    if (stagedNewObject) {
      await removeOrQueueOrphanedStaging(client, userId, objectPath);
    }
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
  const resolvedSource = source.sourceVersionId
    ? await resolveReviewerSource(client, userId, source)
    : {
        sourceText: source.sourceText,
        contentSha256: sha256Text(source.sourceText),
      };
  const language = normalizeGenerationSetting(source.language, "auto");
  const outputMode = normalizeGenerationSetting(source.outputMode, "standard");
  const reuseMode = source.reuseMode ?? "fresh";
  const settingsFingerprint = createGenerationSettingsFingerprint({
    artifactType: "reviewer",
    language,
    outputMode,
  });
  const requestFingerprint = createGenerationRequestFingerprint({
    sourceContentSha256: resolvedSource.contentSha256,
    ...(normalizedTitle ? { sourceTitle: normalizedTitle } : {}),
    settingsFingerprint,
    reuseMode,
  });
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
    characterCount: resolvedSource.sourceText.length,
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
      sourceText: resolvedSource.sourceText,
      sourceCharacterCount: resolvedSource.sourceText.length,
      sourceMetadata,
      sourcePrivateMetadata: {
        ...(isRecord(source.sourcePrivateMetadata)
          ? source.sourcePrivateMetadata
          : {}),
        ...(normalizedTitle ? { sourceTitle: normalizedTitle } : {}),
      },
      contract: {
        artifactType: "reviewer",
        contentSha256: resolvedSource.contentSha256,
        engineVersion: REVIEWER_ENGINE_VERSION,
        generationPolicyVersion: REVIEWER_GENERATION_POLICY_VERSION,
        language,
        normalizationVersion: DOCUMENT_NORMALIZATION_VERSION,
        outputMode,
        providerId: REVIEWER_PROVIDER_ID,
        reuseMode,
        schemaVersion: REVIEWER_SCHEMA_VERSION,
        settingsFingerprint,
        ...(resolvedSource.sourceVersionId
          ? { sourceVersionId: resolvedSource.sourceVersionId }
          : {}),
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
  contentSha256,
  userId,
}: {
  readonly extension: string;
  readonly contentSha256: string;
  readonly userId: string;
}): string {
  return `${userId}/documents/${contentSha256}.${extension}`;
}

function sanitizeDisplayName(value: string): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || "Source").slice(0, 180);
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
  if (error instanceof ProcessingJobRepositoryError) {
    const limit = readLimitError(error.code);
    if (limit) return limit;
    if (error.code === "processing_source_version_not_found") {
      return new ProcessingJobCreationError(
        error.code,
        "The selected source version is unavailable.",
        false,
      );
    }
  }
  return new ProcessingJobCreationError(
    "processing_job_persistence_failed",
    "The job could not be accepted durably.",
    true,
  );
}

async function resolveReviewerSource(
  client: ProcessingJobServiceClient,
  userId: string,
  source: ReviewerJobSourceInput,
): Promise<{
  readonly sourceText: string;
  readonly contentSha256: string;
  readonly sourceVersionId?: string;
}> {
  if (!source.sourceVersionId) {
    return {
      sourceText: source.sourceText,
      contentSha256: sha256Text(source.sourceText),
    };
  }

  const { data, error } = await client
    .from("source_versions")
    .select("*")
    .eq("id", source.sourceVersionId)
    .eq("user_id", userId)
    .maybeSingle();
  const version = data as SourceVersionRow | null;
  if (error || !version) {
    throw new ProcessingJobCreationError(
      "processing_source_version_not_found",
      "The selected source version is unavailable.",
      false,
    );
  }
  return {
    sourceText: version.source_text,
    contentSha256: version.content_sha256,
    sourceVersionId: version.id,
  };
}

function normalizeGenerationSetting(value: string | undefined, fallback: string): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (normalized || fallback).slice(0, 80);
}

function readLimitError(code: string): ProcessingJobCreationError | null {
  const messages: Readonly<Record<string, string>> = {
    processing_job_active_limit_reached:
      "Finish or cancel an active job before starting another.",
    processing_job_rate_limit_reached:
      "Too many processing requests were started recently. Try again later.",
    processing_job_extraction_queue_limit_reached:
      "The extraction queue is full for this account.",
    processing_job_generation_queue_limit_reached:
      "The generation queue is full for this account.",
    processing_job_daily_extraction_limit_reached:
      "The daily extraction limit has been reached.",
    processing_job_daily_ocr_page_limit_reached:
      "The daily document page limit has been reached.",
    processing_job_daily_generation_limit_reached:
      "The daily generation limit has been reached.",
  };
  const message = messages[code];
  return message
    ? new ProcessingJobCreationError(code, message, false)
    : null;
}

async function removeOrQueueOrphanedStaging(
  client: ProcessingJobServiceClient,
  ownerUserId: string,
  objectPath: string,
): Promise<void> {
  const removal = await client.storage
    .from(PROCESSING_JOB_SOURCE_BUCKET)
    .remove([objectPath]);
  if (!removal.error) return;

  await client
    .from("processing_cleanup_queue")
    .upsert(
      {
        owner_user_id: ownerUserId,
        storage_bucket: PROCESSING_JOB_SOURCE_BUCKET,
        storage_object_path: objectPath,
        reason: "orphaned_staging",
        not_before: new Date().toISOString(),
        status: "pending",
      },
      {
        ignoreDuplicates: true,
        onConflict: "storage_bucket,storage_object_path,reason",
      },
    );
}

async function findOwnedDocumentAssetByContent(
  client: ProcessingJobServiceClient,
  userId: string,
  contentSha256: string,
  mimeType: string,
  byteSize: number,
): Promise<boolean> {
  const { data, error } = await client
    .from("document_assets")
    .select("id")
    .eq("user_id", userId)
    .eq("content_sha256", contentSha256)
    .eq("mime_type", mimeType)
    .eq("byte_size", byteSize)
    .eq("upload_status", "available")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new ProcessingJobCreationError(
      "processing_job_source_lookup_failed",
      "The source could not be checked for safe reuse.",
      true,
    );
  }
  return data !== null;
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
