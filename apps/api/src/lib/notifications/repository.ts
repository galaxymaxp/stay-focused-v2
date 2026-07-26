import type {
  ProcessingNotificationDeliveryRow,
  PushNotificationDeviceRow,
} from "@stay-focused/db";

import type { ProcessingJobServiceClient } from "@/lib/processing-jobs/repository";

export type NotificationKind =
  | "test"
  | "extraction_ready"
  | "reviewer_ready"
  | "processing_needs_attention";

export async function registerNotificationDevice(
  client: ProcessingJobServiceClient,
  input: {
    readonly userId: string;
    readonly installationId: string;
    readonly expoPushToken: string;
    readonly platform: "ios" | "android";
    readonly projectId: string;
    readonly permissionStatus: "granted" | "denied" | "undetermined";
  },
): Promise<PushNotificationDeviceRow> {
  if (!isExpoPushToken(input.expoPushToken)) {
    throw new NotificationRepositoryError("invalid_expo_push_token");
  }
  const now = new Date().toISOString();
  const { error: tokenDeleteError } = await client
    .from("push_notification_devices")
    .delete()
    .eq("expo_push_token", input.expoPushToken)
    .neq("user_id", input.userId);
  if (tokenDeleteError) {
    throw new NotificationRepositoryError("notification_device_transfer_failed");
  }
  const { data, error } = await client
    .from("push_notification_devices")
    .upsert(
      {
        user_id: input.userId,
        installation_id: input.installationId,
        expo_push_token: input.expoPushToken,
        platform: input.platform,
        project_id: input.projectId.slice(0, 100),
        permission_status: input.permissionStatus,
        enabled: input.permissionStatus === "granted",
        invalidated_at: null,
        last_registered_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,installation_id" },
    )
    .select("*")
    .single();
  if (error || !data) {
    throw new NotificationRepositoryError("notification_device_registration_failed");
  }
  return data;
}

export async function disableNotificationDevice(
  client: ProcessingJobServiceClient,
  input: { readonly userId: string; readonly installationId: string },
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("push_notification_devices")
    .update({ enabled: false, updated_at: now })
    .eq("user_id", input.userId)
    .eq("installation_id", input.installationId)
    .select("id");
  if (error) {
    throw new NotificationRepositoryError("notification_device_disable_failed");
  }
  return (data?.length ?? 0) > 0;
}

export async function queueTestNotification(
  client: ProcessingJobServiceClient,
  input: {
    readonly userId: string;
    readonly installationId: string;
    readonly idempotencyKey: string;
  },
): Promise<ProcessingNotificationDeliveryRow> {
  const { data: device, error: deviceError } = await client
    .from("push_notification_devices")
    .select("*")
    .eq("user_id", input.userId)
    .eq("installation_id", input.installationId)
    .eq("enabled", true)
    .maybeSingle();
  if (deviceError || !device) {
    throw new NotificationRepositoryError("notification_device_not_found");
  }
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await client
    .from("processing_notification_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("device_id", device.id)
    .eq("notification_kind", "test")
    .gte("created_at", oneMinuteAgo);
  if (countError) {
    throw new NotificationRepositoryError("notification_rate_limit_check_failed");
  }
  const deliveryKey = `test:${device.id}:${input.idempotencyKey}`;
  const { data: existing } = await client
    .from("processing_notification_deliveries")
    .select("*")
    .eq("delivery_key", deliveryKey)
    .maybeSingle();
  if (existing) return existing;
  if ((count ?? 0) >= 1) {
    throw new NotificationRepositoryError("notification_test_rate_limited");
  }
  const { data, error } = await client
    .from("processing_notification_deliveries")
    .insert({
      user_id: input.userId,
      device_id: device.id,
      delivery_key: deliveryKey,
      notification_kind: "test",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new NotificationRepositoryError("notification_test_queue_failed");
  }
  return data;
}

export async function materializeProcessingNotifications(
  client: ProcessingJobServiceClient,
  limit = 50,
): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
  const { data: events, error } = await client
    .from("processing_job_events")
    .select("*")
    .is("delivered_at", null)
    .eq("delivery_eligible", true)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new NotificationRepositoryError("notification_event_read_failed");
  let created = 0;
  for (const event of events ?? []) {
    const { data: job } = await client
      .from("processing_jobs")
      .select("job_type")
      .eq("id", event.job_id)
      .eq("user_id", event.user_id)
      .maybeSingle();
    const kind = event.event_type === "job_succeeded"
      ? job?.job_type === "reviewer_generation"
        ? "reviewer_ready"
        : "extraction_ready"
      : event.event_type === "job_failed"
        ? "processing_needs_attention"
        : null;
    if (!kind) {
      await client
        .from("processing_job_events")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", event.id);
      continue;
    }
    const { data: devices, error: devicesError } = await client
      .from("push_notification_devices")
      .select("*")
      .eq("user_id", event.user_id)
      .eq("enabled", true)
      .eq("permission_status", "granted");
    if (devicesError) {
      throw new NotificationRepositoryError("notification_device_read_failed");
    }
    if ((devices?.length ?? 0) === 0) {
      await client
        .from("processing_job_events")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", event.id);
      continue;
    }
    for (const device of devices ?? []) {
      const { data: inserted, error: insertError } = await client
        .from("processing_notification_deliveries")
        .upsert(
          {
            user_id: event.user_id,
            processing_event_id: event.id,
            device_id: device.id,
            delivery_key: `${event.delivery_key}:${device.id}`,
            notification_kind: kind,
          },
          {
            ignoreDuplicates: true,
            onConflict: "delivery_key",
          },
        )
        .select("id");
      if (insertError) {
        throw new NotificationRepositoryError("notification_materialization_failed");
      }
      created += inserted?.length ?? 0;
    }
  }
  return created;
}

export async function claimNotificationDeliveries(
  client: ProcessingJobServiceClient,
  workerId: string,
  limit: number,
): Promise<readonly ProcessingNotificationDeliveryRow[]> {
  const { data, error } = await client.rpc(
    "claim_processing_notification_deliveries",
    { p_worker_id: workerId, p_limit: limit, p_lease_seconds: 60 },
  );
  if (error) throw new NotificationRepositoryError("notification_claim_failed");
  return data ?? [];
}

export async function claimNotificationReceipts(
  client: ProcessingJobServiceClient,
  workerId: string,
  limit: number,
): Promise<readonly ProcessingNotificationDeliveryRow[]> {
  const { data, error } = await client.rpc(
    "claim_processing_notification_receipts",
    { p_worker_id: workerId, p_limit: limit, p_lease_seconds: 60 },
  );
  if (error) throw new NotificationRepositoryError("notification_receipt_claim_failed");
  return data ?? [];
}

export async function loadDeliveryTarget(
  client: ProcessingJobServiceClient,
  delivery: ProcessingNotificationDeliveryRow,
): Promise<{
  readonly token: string;
  readonly jobId?: string;
  readonly jobType?: "document_extraction" | "reviewer_generation";
}> {
  const { data: device, error } = await client
    .from("push_notification_devices")
    .select("expo_push_token")
    .eq("id", delivery.device_id)
    .eq("user_id", delivery.user_id)
    .eq("enabled", true)
    .maybeSingle();
  if (error || !device) {
    throw new NotificationRepositoryError("notification_device_not_found");
  }
  if (!delivery.processing_event_id) return { token: device.expo_push_token };
  const { data: event } = await client
    .from("processing_job_events")
    .select("job_id")
    .eq("id", delivery.processing_event_id)
    .maybeSingle();
  if (!event) return { token: device.expo_push_token };
  const { data: job } = await client
    .from("processing_jobs")
    .select("job_type")
    .eq("id", event.job_id)
    .maybeSingle();
  return {
    token: device.expo_push_token,
    jobId: event.job_id,
    ...(job ? { jobType: job.job_type } : {}),
  };
}

export async function updateNotificationDelivery(
  client: ProcessingJobServiceClient,
  input: {
    readonly delivery: ProcessingNotificationDeliveryRow;
    readonly workerId: string;
    readonly status: ProcessingNotificationDeliveryRow["status"];
    readonly ticketId?: string;
    readonly safeErrorCode?: string;
    readonly retryDelayMs?: number;
  },
): Promise<void> {
  const now = new Date();
  const retrying = input.status === "queued";
  const terminal = ["delivered", "failed", "invalid_device"].includes(input.status);
  const { error } = await client
    .from("processing_notification_deliveries")
    .update({
      status: input.status,
      expo_ticket_id: input.ticketId ?? input.delivery.expo_ticket_id,
      safe_error_code: input.safeErrorCode ?? null,
      next_attempt_at: retrying
        ? new Date(now.getTime() + (input.retryDelayMs ?? 30_000)).toISOString()
        : input.delivery.next_attempt_at,
      receipt_due_at: input.status === "ticketed"
        ? new Date(now.getTime() + 15 * 60_000).toISOString()
        : null,
      sent_at: input.status === "ticketed"
        ? input.delivery.sent_at ?? now.toISOString()
        : input.delivery.sent_at,
      delivered_at: input.status === "delivered" ? now.toISOString() : null,
      failed_at: terminal && input.status !== "delivered" ? now.toISOString() : null,
      lease_owner: null,
      lease_expires_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", input.delivery.id)
    .eq("lease_owner", input.workerId);
  if (error) throw new NotificationRepositoryError("notification_update_failed");
  if (input.status === "invalid_device") {
    await client
      .from("push_notification_devices")
      .update({
        enabled: false,
        invalidated_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", input.delivery.device_id)
      .eq("user_id", input.delivery.user_id);
  }
  if (terminal && input.delivery.processing_event_id) {
    await finalizeEventIfTerminal(client, input.delivery.processing_event_id);
  }
}

async function finalizeEventIfTerminal(
  client: ProcessingJobServiceClient,
  eventId: string,
): Promise<void> {
  const { count } = await client
    .from("processing_notification_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("processing_event_id", eventId)
    .in("status", ["queued", "sending", "ticketed"]);
  if ((count ?? 0) === 0) {
    await client
      .from("processing_job_events")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", eventId);
  }
}

function isExpoPushToken(value: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value);
}

export class NotificationRepositoryError extends Error {
  public constructor(public readonly code: string) {
    super(code);
    this.name = "NotificationRepositoryError";
  }
}
