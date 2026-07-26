import { loadEnvConfig } from "@next/env";

import { createProcessingJobServiceClient } from "../src/lib/processing-jobs/repository";

loadEnvConfig(process.cwd());

const execute = process.argv.includes("--execute");
const EXECUTION_CONFIRMATION = "delete_due_processing_objects";
const MAX_STORAGE_OBJECTS_PER_RUN = 50;

async function main(): Promise<void> {
  if (
    execute &&
    process.env.PROCESSING_CLEANUP_CONFIRM !== EXECUTION_CONFIRMATION
  ) {
    throw new Error("processing_cleanup_confirmation_required");
  }

  const client = createProcessingJobServiceClient();
  const expiredUploadCount = await expireUploadIntents(client, execute);
  const { data: lifecycle, error: lifecycleError } = await client.rpc(
    "run_processing_lifecycle_cleanup",
    { p_dry_run: !execute },
  );
  if (lifecycleError) throw new Error("processing_lifecycle_cleanup_failed");

  const dueAt = new Date().toISOString();
  const { data: dueObjects, error: dueObjectsError } = await client
    .from("processing_cleanup_queue")
    .select(
      "id,storage_bucket,storage_object_path,reason,status,attempt_count,not_before",
    )
    .in("status", ["pending", "failed"])
    .lte("not_before", dueAt)
    .order("not_before", { ascending: true })
    .limit(MAX_STORAGE_OBJECTS_PER_RUN);
  if (dueObjectsError) throw new Error("processing_cleanup_queue_read_failed");

  if (!execute) {
    console.info("processing_cleanup.dry_run", {
      dueStorageObjectCount: dueObjects.length,
      expiredUploadIntentCount: expiredUploadCount,
      lifecycle,
    });
    return;
  }

  let completed = 0;
  let failed = 0;
  for (const object of dueObjects) {
    const nextAttemptCount = object.attempt_count + 1;
    const { data: claimed, error: claimError } = await client
      .from("processing_cleanup_queue")
      .update({
        attempt_count: nextAttemptCount,
        last_error_code: null,
        status: "running",
      })
      .eq("id", object.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) continue;

    if (object.reason === "orphaned_staging") {
      const { data: referenced, error: referenceError } = await client
        .from("document_assets")
        .select("id")
        .eq("storage_bucket", object.storage_bucket)
        .eq("storage_object_path", object.storage_object_path)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (referenceError) {
        await markStorageCleanupFailure(client, object.id, nextAttemptCount);
        failed += 1;
        continue;
      }
      if (referenced) {
        await client
          .from("processing_cleanup_queue")
          .update({
            completed_at: new Date().toISOString(),
            last_error_code: null,
            status: "completed",
          })
          .eq("id", object.id);
        completed += 1;
        continue;
      }
    }

    const { error: removeError } = await client.storage
      .from(object.storage_bucket)
      .remove([object.storage_object_path]);
    if (!removeError) {
      await client
        .from("processing_cleanup_queue")
        .update({
          completed_at: new Date().toISOString(),
          last_error_code: null,
          status: "completed",
        })
        .eq("id", object.id);
      completed += 1;
      continue;
    }

    await markStorageCleanupFailure(client, object.id, nextAttemptCount);
    failed += 1;
  }

  console.info("processing_cleanup.completed", {
    completedStorageObjectCount: completed,
    expiredUploadIntentCount: expiredUploadCount,
    failedStorageObjectCount: failed,
    lifecycle,
  });
}

async function expireUploadIntents(
  client: ReturnType<typeof createProcessingJobServiceClient>,
  execute: boolean,
): Promise<number> {
  const now = new Date().toISOString();
  const { data: expired, error } = await client
    .from("processing_upload_intents")
    .select("id,user_id,storage_bucket,storage_object_path")
    .eq("status", "pending")
    .lte("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(MAX_STORAGE_OBJECTS_PER_RUN);
  if (error) throw new Error("processing_upload_intent_cleanup_read_failed");
  if (!execute || expired.length === 0) return expired.length;

  for (const upload of expired) {
    const { data: marked, error: markError } = await client
      .from("processing_upload_intents")
      .update({ status: "expired", updated_at: now })
      .eq("id", upload.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (markError || !marked) continue;
    await client
      .from("processing_cleanup_queue")
      .upsert(
        {
          owner_user_id: upload.user_id,
          storage_bucket: upload.storage_bucket,
          storage_object_path: upload.storage_object_path,
          reason: "orphaned_staging",
          not_before: now,
          status: "pending",
        },
        {
          ignoreDuplicates: true,
          onConflict: "storage_bucket,storage_object_path,reason",
        },
      );
  }
  return expired.length;
}

async function markStorageCleanupFailure(
  client: ReturnType<typeof createProcessingJobServiceClient>,
  cleanupId: string,
  attemptCount: number,
): Promise<void> {
  const retryDelayMinutes = Math.min(
    24 * 60,
    5 * 2 ** Math.min(attemptCount - 1, 8),
  );
  await client
    .from("processing_cleanup_queue")
    .update({
      last_error_code: "storage_delete_failed",
      not_before: new Date(
        Date.now() + retryDelayMinutes * 60_000,
      ).toISOString(),
      status: "failed",
    })
    .eq("id", cleanupId);
}

void main().catch((error: unknown) => {
  console.error("processing_cleanup.fatal", {
    errorCode:
      error instanceof Error && /^[a-z0-9_]+$/.test(error.message)
        ? error.message
        : "processing_cleanup_fatal",
  });
  process.exitCode = 1;
});
