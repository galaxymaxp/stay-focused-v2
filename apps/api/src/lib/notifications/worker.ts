import {
  Expo,
  type ExpoPushErrorReceipt,
  type ExpoPushMessage,
  type ExpoPushSuccessTicket,
} from "expo-server-sdk";

import type { ProcessingJobServiceClient } from "@/lib/processing-jobs/repository";

import {
  claimNotificationDeliveries,
  claimNotificationReceipts,
  loadDeliveryTarget,
  materializeProcessingNotifications,
  updateNotificationDelivery,
  type NotificationKind,
} from "./repository";

const NOTIFICATION_SEND_BATCH_SIZE = 2;
const NOTIFICATION_RECEIPT_BATCH_SIZE = 100;

export async function processNotificationWork(
  client: ProcessingJobServiceClient,
  workerId: string,
  expo = createExpoClient(),
): Promise<void> {
  await materializeProcessingNotifications(client);
  const deliveries = await claimNotificationDeliveries(
    client,
    workerId,
    NOTIFICATION_SEND_BATCH_SIZE,
  );
  await Promise.all(deliveries.map(async (delivery) => {
    try {
      const target = await loadDeliveryTarget(client, delivery);
      if (!Expo.isExpoPushToken(target.token)) {
        await updateNotificationDelivery(client, {
          delivery,
          workerId,
          status: "invalid_device",
          safeErrorCode: "invalid_expo_push_token",
        });
        return;
      }
      const tickets = await expo.sendPushNotificationsAsync([
        createNotificationMessage(delivery.notification_kind, target),
      ]);
      const ticket = tickets[0];
      if (!ticket) throw new Error("empty_push_ticket");
      if (ticket.status === "ok") {
        await updateNotificationDelivery(client, {
          delivery,
          workerId,
          status: "ticketed",
          ticketId: (ticket as ExpoPushSuccessTicket).id,
        });
        return;
      }
      const code = ticket.details?.error ?? "push_rejected";
      await updateNotificationDelivery(client, {
        delivery,
        workerId,
        status: code === "DeviceNotRegistered" ? "invalid_device" : "failed",
        safeErrorCode: normalizeErrorCode(code),
      });
    } catch {
      await updateNotificationDelivery(client, {
        delivery,
        workerId,
        status: delivery.attempt_count < 5 ? "queued" : "failed",
        safeErrorCode: "push_transport_failed",
        retryDelayMs: Math.min(300_000, 5_000 * 2 ** delivery.attempt_count),
      });
    }
  }));

  const receipts = await claimNotificationReceipts(
    client,
    workerId,
    NOTIFICATION_RECEIPT_BATCH_SIZE,
  );
  const receiptIds = receipts
    .map((delivery) => delivery.expo_ticket_id)
    .filter((value): value is string => Boolean(value));
  if (receiptIds.length === 0) return;
  try {
    const results = await expo.getPushNotificationReceiptsAsync(receiptIds);
    await Promise.all(receipts.map(async (delivery) => {
      if (!delivery.expo_ticket_id) return;
      const receipt = results[delivery.expo_ticket_id];
      if (!receipt) {
        const receiptExpired = delivery.sent_at !== null &&
          Date.parse(delivery.sent_at) < Date.now() - 23 * 60 * 60_000;
        await updateNotificationDelivery(client, {
          delivery,
          workerId,
          status: receiptExpired ? "failed" : "ticketed",
          safeErrorCode: "push_receipt_missing",
        });
        return;
      }
      if (receipt.status === "ok") {
        await updateNotificationDelivery(client, {
          delivery,
          workerId,
          status: "delivered",
        });
        return;
      }
      const code = (receipt as ExpoPushErrorReceipt).details?.error ??
        "push_receipt_failed";
      await updateNotificationDelivery(client, {
        delivery,
        workerId,
        status: code === "DeviceNotRegistered" ? "invalid_device" : "failed",
        safeErrorCode: normalizeErrorCode(code),
      });
    }));
  } catch {
    await Promise.all(receipts.map((delivery) =>
      updateNotificationDelivery(client, {
        delivery,
        workerId,
        status: "ticketed",
        safeErrorCode: "push_receipt_transport_failed",
      })
    ));
  }
}

function createExpoClient(): Expo {
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  return new Expo(accessToken ? { accessToken } : undefined);
}

export function createNotificationMessage(
  kind: NotificationKind,
  target: {
    readonly token: string;
    readonly jobId?: string;
    readonly jobType?: "document_extraction" | "reviewer_generation";
  },
): ExpoPushMessage {
  const content = notificationContent(kind);
  return {
    to: target.token,
    sound: "default",
    title: "Stay Focused",
    body: content,
    data: {
      screen: "processing",
      ...(target.jobId ? { jobId: target.jobId } : {}),
      ...(target.jobType ? { jobType: target.jobType } : {}),
    },
    ...(target.jobId ? { collapseId: target.jobId } : {}),
  };
}

export function notificationContent(kind: NotificationKind): string {
  switch (kind) {
    case "test":
      return "Stay Focused notifications are working.";
    case "extraction_ready":
      return "Your text extraction is ready.";
    case "reviewer_ready":
      return "Your reviewer is ready.";
    default:
      return "Processing needs attention.";
  }
}

function normalizeErrorCode(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .toLowerCase()
    .slice(0, 100);
}
