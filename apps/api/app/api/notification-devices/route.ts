import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import {
  NotificationRepositoryError,
  registerNotificationDevice,
} from "@/lib/notifications/repository";
import { createProcessingJobServiceClient } from "@/lib/processing-jobs/repository";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function PUT(request: Request): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) return failure(401, "unauthorized", "Sign in again.", false);
  try {
    const body = await request.json() as unknown;
    if (
      !isRecord(body) ||
      !isUuid(body.installationId) ||
      typeof body.expoPushToken !== "string" ||
      (body.platform !== "ios" && body.platform !== "android") ||
      typeof body.projectId !== "string" ||
      (body.permissionStatus !== "granted" &&
        body.permissionStatus !== "denied" &&
        body.permissionStatus !== "undetermined")
    ) {
      return failure(
        400,
        "invalid_notification_device",
        "Notification registration is invalid.",
        false,
      );
    }
    const device = await registerNotificationDevice(
      createProcessingJobServiceClient(),
      {
        userId: user.id,
        installationId: body.installationId,
        expoPushToken: body.expoPushToken,
        platform: body.platform,
        projectId: body.projectId,
        permissionStatus: body.permissionStatus,
      },
    );
    return NextResponse.json(
      {
        ok: true,
        data: {
          installationId: device.installation_id,
          enabled: device.enabled,
          permissionStatus: device.permission_status,
          lastRegisteredAt: device.last_registered_at,
        },
      },
      { status: 200, headers: corsHeaders() },
    );
  } catch (caught) {
    const code = caught instanceof NotificationRepositoryError
      ? caught.code
      : "notification_device_registration_failed";
    return failure(
      code === "invalid_expo_push_token" ? 400 : 503,
      code,
      code === "invalid_expo_push_token"
        ? "The device notification token is invalid."
        : "Notification registration is temporarily unavailable.",
      code !== "invalid_expo_push_token",
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
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "PUT, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
