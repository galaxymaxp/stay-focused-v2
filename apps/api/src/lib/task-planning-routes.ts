import type { Database } from "@stay-focused/db";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createCanvasServiceClient } from "@/lib/canvas-db";

const MAX_JSON_BODY_BYTES = 64 * 1024;
const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "600",
  "Cache-Control": "no-store",
} as const;

export interface TaskPlanningAuthContext {
  readonly user: User;
  readonly client: SupabaseClient<Database>;
}

export async function requireTaskPlanningAuth(
  request: Request,
): Promise<
  | { readonly ok: true; readonly value: TaskPlanningAuthContext }
  | { readonly ok: false; readonly response: Response }
> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return {
      ok: false,
      response: taskPlanningError(
        request,
        401,
        "unauthorized",
        "Authorization header must be a valid Bearer token.",
      ),
    };
  }
  try {
    return {
      ok: true,
      value: { user, client: createCanvasServiceClient() },
    };
  } catch {
    return {
      ok: false,
      response: taskPlanningError(
        request,
        500,
        "task_storage_not_configured",
        "Task storage is not configured.",
      ),
    };
  }
}

export async function readTaskPlanningJson(
  request: Request,
): Promise<
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly response: Response }
> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    return {
      ok: false,
      response: taskPlanningError(
        request,
        413,
        "payload_too_large",
        `Request body must be at most ${MAX_JSON_BODY_BYTES} bytes.`,
      ),
    };
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BODY_BYTES) {
    return {
      ok: false,
      response: taskPlanningError(
        request,
        413,
        "payload_too_large",
        `Request body must be at most ${MAX_JSON_BODY_BYTES} bytes.`,
      ),
    };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return {
      ok: false,
      response: taskPlanningError(
        request,
        400,
        "invalid_json",
        "Request body must be valid JSON.",
      ),
    };
  }
}

export function taskPlanningResponse(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  return NextResponse.json(body, {
    status,
    headers: createTaskPlanningCorsHeaders(request),
  });
}

export function taskPlanningError(
  request: Request,
  status: number,
  code: string,
  message: string,
): Response {
  return taskPlanningResponse(
    request,
    { ok: false, error: { code, message, retryable: status >= 500 } },
    status,
  );
}

export function taskPlanningOptions(request: Request, methods: string): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...createTaskPlanningCorsHeaders(request),
      "Access-Control-Allow-Methods": methods,
      Allow: methods,
    },
  });
}

function createTaskPlanningCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    ...CORS_HEADERS,
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  };
}
