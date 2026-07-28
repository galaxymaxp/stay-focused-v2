import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env.smoke.local", override: false });
loadEnv({ path: "apps/api/.env.local", override: false });

const apiBaseUrl = (
  process.env.CANVAS_SYNC_VALIDATION_API_BASE_URL ??
  "http://127.0.0.1:3000"
).replace(/\/+$/, "");
const terminal = new Set([
  "succeeded",
  "failed",
  "cancelled",
  "expired",
]);

async function main(): Promise<void> {
  const accessToken = await signIn();
  if (process.env.CANVAS_SYNC_VALIDATION_RECONNECT === "1") {
    await refreshCanvasConnection(accessToken);
  }
  const inventory = await request("/api/canvas/courses", accessToken);
  const selectedCourseIds = readStrings(inventory.selectedCourseIds);
  if (selectedCourseIds.length === 0) {
    throw new Error("No selected Canvas course is available for validation.");
  }
  const courseId = selectedCourseIds[0]!;

  const contentKey = `validation:canvas-content:${randomUUID()}`;
  const contentStartedAt = Date.now();
  const content = await createJob(
    accessToken,
    courseId,
    "sync",
    contentKey,
  );
  const replay = await createJob(
    accessToken,
    courseId,
    "sync",
    contentKey,
  );
  assert(content.id === replay.id, "content idempotent replay");

  // Simulate a destroyed client runtime: retain only the durable ID and do not
  // poll until a later reconciliation.
  await delay(3_000);
  const contentFinal = await waitForTerminal(accessToken, content.id);
  assert(contentFinal.status === "succeeded", "content job success");

  const gradeStartedAt = Date.now();
  const grade = await createJob(
    accessToken,
    courseId,
    "grades/sync",
    `validation:canvas-grades:${randomUUID()}`,
  );
  await delay(3_000);
  const gradeFinal = await waitForTerminal(accessToken, grade.id);
  assert(gradeFinal.status === "succeeded", "grade job success");

  const cancellation = await createJob(
    accessToken,
    courseId,
    "sync",
    `validation:canvas-cancel:${randomUUID()}`,
  );
  const cancellationResponse = await request(
    `/api/canvas/sync-jobs/${encodeURIComponent(cancellation.id)}/cancel`,
    accessToken,
    { method: "POST" },
  );
  const cancelledFinal = terminal.has(String(cancellationResponse.status))
    ? cancellationResponse
    : await waitForTerminal(accessToken, cancellation.id);
  assert(cancelledFinal.status === "cancelled", "explicit cancellation");
  assert(cancelledFinal.resultAvailable === false, "cancelled result hidden");

  console.info(JSON.stringify({
    cancellation: {
      jobId: cancellation.id,
      resultAvailable: cancelledFinal.resultAvailable,
      status: cancelledFinal.status,
    },
    content: {
      attemptCount: contentFinal.attemptCount,
      durationMs: Date.now() - contentStartedAt,
      jobId: content.id,
      replayedSameJob: content.id === replay.id,
      status: contentFinal.status,
    },
    grade: {
      attemptCount: gradeFinal.attemptCount,
      durationMs: Date.now() - gradeStartedAt,
      jobId: grade.id,
      status: gradeFinal.status,
    },
  }));
}

async function refreshCanvasConnection(accessToken: string): Promise<void> {
  await request("/api/canvas/connection", accessToken, {
    body: JSON.stringify({
      baseUrl: required("CANVAS_BASE_URL"),
      personalAccessToken: required("CANVAS_PERSONAL_ACCESS_TOKEN"),
    }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
}

async function signIn(): Promise<string> {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase client configuration is missing.");
  }
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: required("SMOKE_TEST_EMAIL"),
    password: required("SMOKE_TEST_PASSWORD"),
  });
  if (error || !data.session?.access_token) {
    throw new Error("Canvas sync validation sign-in failed.");
  }
  return data.session.access_token;
}

async function createJob(
  accessToken: string,
  courseId: string,
  suffix: "sync" | "grades/sync",
  idempotencyKey: string,
): Promise<Record<string, unknown>> {
  const envelope = await request(
    `/api/canvas/courses/${encodeURIComponent(courseId)}/${suffix}`,
    accessToken,
    {
      headers: { "Idempotency-Key": idempotencyKey },
      method: "POST",
    },
    202,
  );
  return record(envelope.data);
}

async function waitForTerminal(
  accessToken: string,
  jobId: unknown,
): Promise<Record<string, unknown>> {
  if (typeof jobId !== "string") throw new Error("Job ID is missing.");
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    const envelope = await request(
      `/api/canvas/sync-jobs/${encodeURIComponent(jobId)}`,
      accessToken,
    );
    const job = record(envelope.data);
    if (terminal.has(String(job.status))) return job;
    await delay(2_000);
  }
  throw new Error("Canvas synchronization did not finish before the deadline.");
}

async function request(
  path: string,
  accessToken: string,
  init: RequestInit = {},
  expectedStatus = 200,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  const body = record(await response.json());
  if (response.status !== expectedStatus || body.ok !== true) {
    const error = record(body.error);
    throw new Error(
      `Hosted Canvas validation failed (${response.status}, ${String(
        error.code ?? "unknown",
      )}).`,
    );
  }
  return body;
}

function readStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Hosted Canvas validation returned an invalid response.");
  }
  return value as Record<string, unknown>;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assert(value: boolean, label: string): void {
  if (!value) throw new Error(`Validation failed: ${label}.`);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

void main().catch((error: unknown) => {
  console.warn("canvas_sync_validation_failed", {
    message: error instanceof Error ? error.message : "Unknown failure.",
  });
  process.exitCode = 1;
});
