import type { ProcessingUploadIntentRow } from "@stay-focused/db";
import { randomUUID } from "node:crypto";

import {
  OCR_MAX_IMAGE_BYTES,
  OCR_MAX_PDF_BYTES,
} from "@/lib/ocr/upload-policy";

import { PROCESSING_JOB_SOURCE_BUCKET } from "./constants";
import type { ProcessingJobServiceClient } from "./repository";

export const PROCESSING_UPLOAD_INTENT_TTL_MS = 60 * 60 * 1_000;
export const PROCESSING_TUS_CHUNK_BYTES = 6 * 1_024 * 1_024;

export type ProcessingUploadMimeType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg";

export async function createProcessingUploadIntent(
  client: ProcessingJobServiceClient,
  input: {
    readonly userId: string;
    readonly displayName: string;
    readonly mimeType: ProcessingUploadMimeType;
    readonly byteSize: number;
  },
): Promise<{
  readonly intent: ProcessingUploadIntentRow;
  readonly tusEndpoint: string;
}> {
  validateUploadMetadata(input);
  const sourceKind = input.mimeType === "application/pdf" ? "pdf" : "image";
  const extension = input.mimeType === "application/pdf"
    ? "pdf"
    : input.mimeType === "image/png" ? "png" : "jpg";
  const uploadId = randomUUID();
  const objectPath = `${input.userId}/uploads/${uploadId}.${extension}`;
  const expiresAt = new Date(
    Date.now() + PROCESSING_UPLOAD_INTENT_TTL_MS,
  ).toISOString();
  const displayName = sanitizeDisplayName(input.displayName);

  const { data: intent, error: insertError } = await client
    .from("processing_upload_intents")
    .insert({
      id: uploadId,
      user_id: input.userId,
      source_kind: sourceKind,
      display_name: displayName,
      mime_type: input.mimeType,
      expected_byte_size: input.byteSize,
      storage_bucket: PROCESSING_JOB_SOURCE_BUCKET,
      storage_object_path: objectPath,
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (insertError || !intent) {
    throw new ProcessingUploadIntentError(
      "upload_intent_persistence_failed",
      "The upload could not be prepared.",
      true,
    );
  }

  return {
    intent,
    tusEndpoint: createTusEndpoint(),
  };
}

export async function findOwnedProcessingUploadIntent(
  client: ProcessingJobServiceClient,
  userId: string,
  uploadId: string,
): Promise<ProcessingUploadIntentRow | null> {
  const { data, error } = await client
    .from("processing_upload_intents")
    .select("*")
    .eq("id", uploadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new ProcessingUploadIntentError(
      "upload_intent_read_failed",
      "The staged upload could not be checked.",
      true,
    );
  }
  return data;
}

export async function markProcessingUploadAccepted(
  client: ProcessingJobServiceClient,
  input: {
    readonly uploadId: string;
    readonly userId: string;
    readonly jobId: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client
    .from("processing_upload_intents")
    .update({
      status: "accepted",
      job_id: input.jobId,
      accepted_at: now,
      updated_at: now,
    })
    .eq("id", input.uploadId)
    .eq("user_id", input.userId)
    .eq("status", "pending");
  if (error) {
    throw new ProcessingUploadIntentError(
      "upload_intent_acceptance_failed",
      "The job was created but upload acceptance could not be recorded.",
      true,
    );
  }
}

function validateUploadMetadata(input: {
  readonly displayName: string;
  readonly mimeType: ProcessingUploadMimeType;
  readonly byteSize: number;
}): void {
  const maxBytes = input.mimeType === "application/pdf"
    ? OCR_MAX_PDF_BYTES
    : OCR_MAX_IMAGE_BYTES;
  if (!Number.isInteger(input.byteSize) || input.byteSize < 1) {
    throw new ProcessingUploadIntentError(
      "empty_file",
      "Choose a non-empty file.",
      false,
    );
  }
  if (input.byteSize > maxBytes) {
    throw new ProcessingUploadIntentError(
      "file_too_large",
      "The selected file is too large.",
      false,
    );
  }
}

function createTusEndpoint(): string {
  const value = process.env.SUPABASE_URL?.trim();
  if (!value) {
    throw new ProcessingUploadIntentError(
      "upload_service_unavailable",
      "The upload service is not configured.",
      true,
    );
  }
  const url = new URL(value);
  const projectRef = url.hostname.split(".")[0];
  if (!projectRef) {
    throw new ProcessingUploadIntentError(
      "upload_service_unavailable",
      "The upload service is not configured.",
      true,
    );
  }
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
}

function sanitizeDisplayName(value: string): string {
  return (
    value
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Source"
  ).slice(0, 180);
}

export class ProcessingUploadIntentError extends Error {
  public constructor(
    public readonly code: string,
    public readonly safeMessage: string,
    public readonly retryable: boolean,
  ) {
    super(code);
    this.name = "ProcessingUploadIntentError";
  }
}
