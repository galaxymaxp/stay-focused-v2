import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { disableNotificationDevice } from "@/lib/notifications/repository";
import { createProcessingJobServiceClient } from "@/lib/processing-jobs/repository";

interface RouteContext {
  readonly params: Promise<{ readonly installationId: string }>;
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) return response(401, false, "unauthorized", "Sign in again.");
  const { installationId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(installationId)) {
    return response(404, false, "notification_device_not_found", "Device not found.");
  }
  try {
    const disabled = await disableNotificationDevice(
      createProcessingJobServiceClient(),
      { userId: user.id, installationId },
    );
    return disabled
      ? NextResponse.json({ ok: true, data: { enabled: false } }, { headers: corsHeaders() })
      : response(404, false, "notification_device_not_found", "Device not found.");
  } catch {
    return response(
      503,
      false,
      "notification_device_disable_failed",
      "Notifications could not be disabled.",
    );
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function response(status: number, ok: boolean, code: string, message: string): Response {
  return NextResponse.json(
    { ok, error: { code, message, retryable: status >= 500 } },
    { status, headers: corsHeaders() },
  );
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
