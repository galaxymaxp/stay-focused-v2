import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import {
  NotificationRepositoryError,
  queueTestNotification,
} from "@/lib/notifications/repository";
import { createProcessingJobServiceClient } from "@/lib/processing-jobs/repository";
import { validateIdempotencyKey } from "@/lib/processing-jobs/creation";

export async function POST(request: Request): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) return failure(401, "unauthorized", "Sign in again.", false);
  try {
    const body = await request.json() as unknown;
    if (!isRecord(body) || !isUuid(body.installationId)) {
      return failure(
        400,
        "invalid_notification_test",
        "A valid installation is required.",
        false,
      );
    }
    const idempotencyKey = validateIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const delivery = await queueTestNotification(
      createProcessingJobServiceClient(),
      {
        userId: user.id,
        installationId: body.installationId,
        idempotencyKey,
      },
    );
    return NextResponse.json(
      { ok: true, data: { deliveryId: delivery.id, status: delivery.status } },
      { status: 202, headers: corsHeaders() },
    );
  } catch (caught) {
    const code = caught instanceof NotificationRepositoryError
      ? caught.code
      : "notification_test_queue_failed";
    const status = code === "notification_device_not_found"
      ? 404
      : code === "notification_test_rate_limited" ? 429 : 503;
    return failure(
      status,
      code,
      status === 429
        ? "Wait a minute before sending another test notification."
        : status === 404
          ? "Enable notifications on this device first."
          : "The test notification could not be queued.",
      status >= 500,
    );
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function failure(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
): Response {
  return NextResponse.json(
    { ok: false, error: { code, message, retryable } },
    { status, headers: corsHeaders() },
  );
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
