import type { CanvasFile } from "@stay-focused/canvas";
import { CanvasClientError } from "@stay-focused/canvas";
import type {
  CanvasFileRow,
  CanvasFileUpdate,
  Database,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import {
  CANVAS_FILE_DOWNLOAD_TIMEOUT_MS,
  CANVAS_FILE_INGESTION_CONCURRENCY,
  CANVAS_FILE_MAX_AGGREGATE_BYTES,
  CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST,
  CANVAS_FILE_MAX_REDIRECTS,
  CANVAS_FILE_MAX_SINGLE_BYTES,
  CANVAS_SOURCE_FILE_BUCKET,
  isEligibleForBinaryIngestion,
  normalizeMimeType,
  safeObjectKeyForCanvasFile,
  validateDownloadedCanvasFileContent,
  type CanvasFileIngestionEligibility,
} from "@/lib/canvas-file-policy";
import { mapCanvasFile } from "@/lib/canvas-file-normalize";
import {
  CONNECTION_SECRET_COLUMNS,
  createCanvasClient,
  decryptConnectionToken,
  readConnection,
} from "@/lib/canvas-routes";
import type {
  CanvasApiErrorCode,
  CanvasFileIngestionItemResult,
  CanvasFileIngestionResponse,
  CanvasFileIngestionResultStatus,
} from "@/types/canvas";

type CanvasFileIngestionHttpStatus = 400 | 404 | 413 | 500;

export interface IngestCanvasFilesInput {
  readonly client: SupabaseClient<Database>;
  readonly fileIds: readonly string[];
  readonly userId: string;
}

export type IngestCanvasFilesResult =
  | { readonly ok: true; readonly response: CanvasFileIngestionResponse }
  | {
      readonly ok: false;
      readonly status: CanvasFileIngestionHttpStatus;
      readonly code: CanvasApiErrorCode;
      readonly message: string;
    };

type ReserveBytes = (byteLength: number) => boolean;

export async function ingestCanvasFiles({
  client,
  fileIds,
  userId,
}: IngestCanvasFilesInput): Promise<IngestCanvasFilesResult> {
  if (fileIds.length > CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `At most ${CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST} Canvas files can be ingested at once.`,
    };
  }

  const connection = await readConnection(
    client,
    userId,
    CONNECTION_SECRET_COLUMNS,
  );
  if (!connection.ok) {
    return storageFailure();
  }
  if (!connection.row) {
    return {
      ok: false,
      status: 404,
      code: "canvas_connection_missing",
      message: "Canvas is not connected.",
    };
  }
  const connectionRow = connection.row;

  let token: string;
  try {
    token = decryptConnectionToken(connectionRow);
  } catch {
    return {
      ok: false,
      status: 500,
      code: "canvas_connection_corrupt",
      message: "Canvas connection credentials could not be read.",
    };
  }

  const files = await readRequestedFiles({
    client,
    connectionId: connectionRow.id,
    fileIds,
    userId,
  });
  if (!files.ok) {
    return storageFailure();
  }
  if (files.rows.length !== fileIds.length) {
    return {
      ok: false,
      status: 404,
      code: "canvas_file_not_found",
      message: "One or more Canvas files were not found.",
    };
  }

  const declaredAggregateBytes = files.rows.reduce((sum, file) => {
    if (!isEligibleForBinaryIngestion(eligibilityForRow(file))) {
      return sum;
    }
    return sum + (file.size_bytes ?? 0);
  }, 0);
  if (declaredAggregateBytes > CANVAS_FILE_MAX_AGGREGATE_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Canvas file ingestion is limited to ${CANVAS_FILE_MAX_AGGREGATE_BYTES} bytes per request.`,
    };
  }

  const canvas = createCanvasClient(connectionRow.base_url, token);
  let reservedBytes = 0;
  const reserveBytes: ReserveBytes = (byteLength) => {
    if (reservedBytes + byteLength > CANVAS_FILE_MAX_AGGREGATE_BYTES) {
      return false;
    }
    reservedBytes += byteLength;
    return true;
  };

  const results = await mapWithConcurrency(
    files.rows,
    CANVAS_FILE_INGESTION_CONCURRENCY,
    (file) =>
      ingestOneCanvasFile({
        canvas,
        client,
        connectionId: connectionRow.id,
        file,
        reserveBytes,
        userId,
      }),
  );

  return {
    ok: true,
    response: summarizeIngestionResults(results),
  };
}

async function readRequestedFiles({
  client,
  connectionId,
  fileIds,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly fileIds: readonly string[];
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly rows: readonly CanvasFileRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_files")
    .select("*")
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .in("id", [...fileIds]);

  if (error) {
    return { ok: false };
  }

  const rowsById = new Map((data ?? []).map((row) => [row.id, row]));
  const rows = fileIds
    .map((fileId) => rowsById.get(fileId))
    .filter((row): row is CanvasFileRow => row !== undefined);
  return { ok: true, rows };
}

async function ingestOneCanvasFile({
  canvas,
  client,
  connectionId,
  file,
  reserveBytes,
  userId,
}: {
  readonly canvas: ReturnType<typeof createCanvasClient>;
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly file: CanvasFileRow;
  readonly reserveBytes: ReserveBytes;
  readonly userId: string;
}): Promise<CanvasFileIngestionItemResult> {
  let freshFile: CanvasFile;
  try {
    freshFile = await canvas.getCourseFile(file.canvas_course_id, file.canvas_file_id);
  } catch (error) {
    const result = canvasFetchFailureResult(file.id, error);
    if (result.status === "unavailable") {
      await updateFileRow(client, file, {
        availability_status: "unavailable",
        ingestion_status: "unavailable",
      });
    }
    return recordTerminalResult({
      client,
      connectionId,
      result,
      userId,
    });
  }

  const freshPayload = mapCanvasFile(freshFile);
  const isEligible = isEligibleForBinaryIngestion(
    freshPayload.ingestion_eligibility,
  );
  if (!isEligible) {
    const status = resultStatusForEligibility(
      freshPayload.ingestion_eligibility,
    );
    const updateOk = await updateFileRow(client, file, {
      ...metadataUpdateForPayload(freshPayload),
      ...clearedStorageFields(),
      availability_status: availabilityStatusForResult(status),
      ingestion_status: status === "unavailable" ? "unavailable" : status,
    });
    if (!updateOk) {
      return recordTerminalResult({
        client,
        connectionId,
        result: terminalResult(file.id, "failed", "canvas_storage_failed", true),
        userId,
      });
    }
    await cleanupOldObjectIfUnreferenced(client, file);
    return recordTerminalResult({
      client,
      connectionId,
      result: terminalResult(file.id, status, freshPayload.ingestion_eligibility, false),
      userId,
    });
  }

  if (
    file.current_sha256 &&
    file.storage_bucket === CANVAS_SOURCE_FILE_BUCKET &&
    file.storage_object_key &&
    file.content_version_fingerprint === freshPayload.content_version_fingerprint
  ) {
    const updateOk = await updateFileRow(client, file, {
      ...metadataUpdateForPayload(freshPayload),
      availability_status: "available",
      ingestion_status: "unchanged",
      last_successful_ingestion_at: new Date().toISOString(),
    });
    if (!updateOk) {
      return recordTerminalResult({
        client,
        connectionId,
        result: terminalResult(file.id, "failed", "canvas_storage_failed", true),
        userId,
      });
    }
    return recordTerminalResult({
      client,
      connectionId,
      result: terminalResult(file.id, "unchanged", "unchanged", false),
      userId,
    });
  }

  let downloaded: {
    readonly bytes: Uint8Array;
    readonly byteLength: number;
    readonly contentType: string | null;
  };
  try {
    downloaded = await canvas.downloadFile(freshFile, {
      maxBytes: CANVAS_FILE_MAX_SINGLE_BYTES,
      maxRedirects: CANVAS_FILE_MAX_REDIRECTS,
      timeoutMs: CANVAS_FILE_DOWNLOAD_TIMEOUT_MS,
    });
  } catch (error) {
    return recordTerminalResult({
      client,
      connectionId,
      result: canvasDownloadFailureResult(file.id, error),
      userId,
    });
  }

  const validation = validateDownloadedCanvasFileContent({
    bytes: downloaded.bytes,
    contentType: freshPayload.content_type,
    displayName: freshPayload.display_name,
    filename: freshPayload.filename,
    hidden: freshPayload.hidden,
    hiddenForUser: freshPayload.hidden_for_user,
    lockAt: freshPayload.lock_at,
    locked: freshPayload.locked,
    mediaClass: freshPayload.media_class,
    mediaEntryId: freshPayload.media_entry_id,
    responseContentType: downloaded.contentType,
    size: freshPayload.size_bytes,
    unlockAt: freshPayload.unlock_at,
  });
  if (!validation.ok) {
    await updateFileRow(client, file, {
      ...metadataUpdateForPayload(freshPayload),
      ...clearedStorageFields(),
      availability_status: "available",
      ingestion_status: "failed",
    });
    await cleanupOldObjectIfUnreferenced(client, file);
    return recordTerminalResult({
      client,
      connectionId,
      result: terminalResult(file.id, "failed", validation.code, false),
      userId,
    });
  }

  if (!reserveBytes(downloaded.byteLength)) {
    return recordTerminalResult({
      client,
      connectionId,
      result: terminalResult(
        file.id,
        "blocked",
        "canvas_file_aggregate_too_large",
        false,
      ),
      userId,
    });
  }

  const contentHash = createHash("sha256").update(downloaded.bytes).digest("hex");
  const objectKey = safeObjectKeyForCanvasFile({
    contentHash,
    fileId: file.id,
    userId,
  });
  const storedContentType =
    normalizeMimeType(downloaded.contentType) ??
    freshPayload.content_type ??
    "application/octet-stream";

  const upload = await client.storage
    .from(CANVAS_SOURCE_FILE_BUCKET)
    .upload(objectKey, downloaded.bytes, {
      contentType: storedContentType,
      upsert: true,
    });
  if (upload.error) {
    return recordTerminalResult({
      client,
      connectionId,
      result: terminalResult(file.id, "failed", "canvas_storage_failed", true),
      userId,
    });
  }

  const updateOk = await updateFileRow(client, file, {
    ...metadataUpdateForPayload(freshPayload),
    availability_status: "available",
    current_sha256: contentHash,
    ingestion_status: "stored",
    last_successful_ingestion_at: new Date().toISOString(),
    storage_bucket: CANVAS_SOURCE_FILE_BUCKET,
    storage_object_key: objectKey,
    stored_byte_count: downloaded.byteLength,
    stored_content_type: storedContentType,
  });
  if (!updateOk) {
    await removeObjectBestEffort(client, objectKey);
    return recordTerminalResult({
      client,
      connectionId,
      result: terminalResult(file.id, "failed", "canvas_storage_failed", true),
      userId,
    });
  }

  await cleanupOldObjectIfUnreferenced(client, file);
  return recordTerminalResult({
    client,
    connectionId,
    result: terminalResult(file.id, "stored", "stored", false, downloaded.byteLength),
    userId,
  });
}

function metadataUpdateForPayload(
  payload: ReturnType<typeof mapCanvasFile>,
): CanvasFileUpdate {
  return {
    canvas_created_at: payload.canvas_created_at,
    canvas_modified_at: payload.canvas_modified_at,
    canvas_updated_at: payload.canvas_updated_at,
    content_type: payload.content_type,
    content_version_fingerprint: payload.content_version_fingerprint,
    display_name: payload.display_name,
    filename: payload.filename,
    folder_id: payload.folder_id,
    hidden: payload.hidden,
    hidden_for_user: payload.hidden_for_user,
    ingestion_eligibility: payload.ingestion_eligibility,
    lock_at: payload.lock_at,
    locked: payload.locked,
    media_class: payload.media_class,
    media_entry_id: payload.media_entry_id,
    metadata_fingerprint: payload.metadata_fingerprint,
    size_bytes: payload.size_bytes,
    unlock_at: payload.unlock_at,
    visibility_level: payload.visibility_level,
  };
}

function clearedStorageFields(): CanvasFileUpdate {
  return {
    current_sha256: null,
    storage_bucket: null,
    storage_object_key: null,
    stored_byte_count: null,
    stored_content_type: null,
  };
}

async function updateFileRow(
  client: SupabaseClient<Database>,
  file: CanvasFileRow,
  update: CanvasFileUpdate,
): Promise<boolean> {
  const { data, error } = await client
    .from("canvas_files")
    .update(update)
    .eq("id", file.id)
    .eq("user_id", file.user_id)
    .eq("canvas_connection_id", file.canvas_connection_id)
    .select("id")
    .maybeSingle();

  return !error && data !== null;
}

async function recordTerminalResult({
  client,
  connectionId,
  result,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly result: CanvasFileIngestionItemResult;
  readonly userId: string;
}): Promise<CanvasFileIngestionItemResult> {
  await client
    .rpc("record_canvas_file_ingestion_result", {
      p_bytes_stored: result.bytesStored,
      p_canvas_connection_id: connectionId,
      p_file_id: result.fileId,
      p_result_code: result.code,
      p_retryable: result.retryable,
      p_status: result.status,
      p_user_id: userId,
    })
    .then(() => undefined, () => undefined);
  return result;
}

function terminalResult(
  fileId: string,
  status: CanvasFileIngestionResultStatus,
  code: string,
  retryable: boolean,
  bytesStored: number | null = null,
): CanvasFileIngestionItemResult {
  return {
    bytesStored,
    code,
    fileId,
    retryable,
    status,
  };
}

function canvasFetchFailureResult(
  fileId: string,
  error: unknown,
): CanvasFileIngestionItemResult {
  if (error instanceof CanvasClientError) {
    if (error.code === "canvas_not_found" || error.code === "canvas_forbidden") {
      return terminalResult(fileId, "unavailable", "canvas_file_unavailable", false);
    }
    return terminalResult(
      fileId,
      "failed",
      safeCanvasFailureCode(error),
      isRetryableCanvasError(error),
    );
  }
  return terminalResult(fileId, "failed", "canvas_file_metadata_failed", true);
}

function canvasDownloadFailureResult(
  fileId: string,
  error: unknown,
): CanvasFileIngestionItemResult {
  if (error instanceof CanvasClientError) {
    const status =
      error.code === "canvas_file_too_large" ? "blocked" : "failed";
    return terminalResult(
      fileId,
      status,
      safeCanvasFailureCode(error),
      isRetryableCanvasError(error),
    );
  }
  return terminalResult(fileId, "failed", "canvas_file_download_failed", true);
}

function safeCanvasFailureCode(error: CanvasClientError): string {
  if (error.code === "canvas_file_download_timeout") {
    return "canvas_timeout";
  }
  if (error.code === "canvas_file_redirect_rejected") {
    return "canvas_file_download_rejected";
  }
  return error.code;
}

function isRetryableCanvasError(error: CanvasClientError): boolean {
  return (
    error.code === "canvas_rate_limited" ||
    error.code === "canvas_unavailable" ||
    error.code === "canvas_timeout" ||
    error.code === "canvas_network_error" ||
    error.code === "canvas_file_download_failed" ||
    error.code === "canvas_file_download_timeout"
  );
}

function resultStatusForEligibility(
  eligibility: CanvasFileIngestionEligibility,
): CanvasFileIngestionResultStatus {
  if (
    eligibility === "metadata_only_media" ||
    eligibility === "metadata_only_unsupported"
  ) {
    return "metadata_only";
  }
  if (eligibility === "blocked_unavailable") {
    return "unavailable";
  }
  return "blocked";
}

function availabilityStatusForResult(
  status: CanvasFileIngestionResultStatus,
): string {
  return status === "unavailable" ? "unavailable" : "available";
}

function eligibilityForRow(file: CanvasFileRow): CanvasFileIngestionEligibility {
  const eligibility = file.ingestion_eligibility;
  if (isCanvasFileIngestionEligibility(eligibility)) {
    return eligibility;
  }
  return "metadata_only_unsupported";
}

function isCanvasFileIngestionEligibility(
  value: string,
): value is CanvasFileIngestionEligibility {
  return (
    value === "eligible_document" ||
    value === "eligible_image" ||
    value === "metadata_only_media" ||
    value === "metadata_only_unsupported" ||
    value === "blocked_security" ||
    value === "blocked_size" ||
    value === "blocked_locked" ||
    value === "blocked_unavailable"
  );
}

async function cleanupOldObjectIfUnreferenced(
  client: SupabaseClient<Database>,
  file: CanvasFileRow,
): Promise<void> {
  if (
    file.storage_bucket !== CANVAS_SOURCE_FILE_BUCKET ||
    !file.storage_object_key
  ) {
    return;
  }

  const { count, error } = await client
    .from("canvas_files")
    .select("id", { count: "exact", head: true })
    .eq("storage_bucket", file.storage_bucket)
    .eq("storage_object_key", file.storage_object_key);

  if (!error && count === 0) {
    await removeObjectBestEffort(client, file.storage_object_key);
  }
}

async function removeObjectBestEffort(
  client: SupabaseClient<Database>,
  objectKey: string,
): Promise<void> {
  await client.storage
    .from(CANVAS_SOURCE_FILE_BUCKET)
    .remove([objectKey])
    .then(() => undefined, () => undefined);
}

function summarizeIngestionResults(
  results: readonly CanvasFileIngestionItemResult[],
): CanvasFileIngestionResponse {
  return {
    ok: true,
    blocked: results.filter((result) => result.status === "blocked").length,
    failed: results.filter((result) => result.status === "failed").length,
    metadataOnly: results.filter((result) => result.status === "metadata_only").length,
    requested: results.length,
    results,
    succeeded: results.filter((result) => result.status === "stored").length,
    totalBytesStored: results.reduce(
      (sum, result) => sum + (result.bytesStored ?? 0),
      0,
    ),
    unchanged: results.filter((result) => result.status === "unchanged").length,
    unavailable: results.filter((result) => result.status === "unavailable").length,
  };
}

async function mapWithConcurrency<TInput, TOutput>(
  inputs: readonly TInput[],
  concurrency: number,
  worker: (input: TInput) => Promise<TOutput>,
): Promise<readonly TOutput[]> {
  const results: TOutput[] = new Array<TOutput>(inputs.length);
  let nextIndex = 0;
  const safeConcurrency = Math.max(1, Math.min(concurrency, inputs.length));

  await Promise.all(
    Array.from({ length: safeConcurrency }, async () => {
      while (nextIndex < inputs.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await worker(inputs[currentIndex] as TInput);
      }
    }),
  );

  return results;
}

function storageFailure(): IngestCanvasFilesResult {
  return {
    ok: false,
    status: 500,
    code: "canvas_storage_failed",
    message: "Canvas file ingestion could not be saved.",
  };
}
