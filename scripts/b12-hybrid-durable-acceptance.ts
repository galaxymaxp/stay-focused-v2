import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import type { Database } from "../packages/db/src/types";

loadEnv({ path: ".env.local" });

const apiBaseUrl = (process.env.B12_API_BASE_URL ?? "http://127.0.0.1:3000")
  .replace(/\/+$/, "");
const sourceRoot = resolve(requiredArgument("--source-root"));
const outputPath = resolve(requiredArgument("--output"));
const terminalStatuses = new Set(["succeeded", "failed", "cancelled", "expired"]);

const sources = [
  {
    key: "python-generators-hybrid",
    title: "Generators in Python",
    path: join(sourceRoot, "Files", "5.0 - Generators in Python.pdf"),
  },
  {
    key: "central-tendency-hybrid",
    title: "Measures of Central Tendency",
    path: join(
      sourceRoot,
      "Modules",
      "6. Descriptive Statistics",
      "Measures of Central Tendency2-1-1-1-1.pdf",
    ),
  },
  {
    key: "accounting-ledgering-hybrid",
    title: "Recording Methods and Ledgering",
    path: join(sourceRoot, "Files", "3-Recording Methods and Ledgering.pdf"),
  },
] as const;

async function main(): Promise<void> {
  await waitForApi();
  const supabaseUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const service = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `b12-${randomUUID()}@example.invalid`;
  const password = `B12-${randomUUID()}-aA1!`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw new Error("b12_user_creation_failed");
  const userId = created.data.user.id;
  const client = createClient<Database>(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session?.access_token) {
    await service.auth.admin.deleteUser(userId);
    throw new Error("b12_user_sign_in_failed");
  }
  const token = signedIn.data.session.access_token;
  const results: Record<string, unknown>[] = [];
  try {
    for (const source of sources) {
      console.info(`b12.durable.start ${source.key}`);
      results.push(await runCase(token, source));
      console.info(`b12.durable.done ${source.key}`);
    }
    await writeJson(outputPath, {
      generatedAt: new Date().toISOString(),
      apiBaseUrl,
      parserMode: "hybrid",
      cases: results,
      disposableUserDeleted: false,
    });
  } finally {
    await cleanup(service, userId);
    await writeJson(outputPath, {
      generatedAt: new Date().toISOString(),
      apiBaseUrl,
      parserMode: "hybrid",
      cases: results,
      disposableUserDeleted: true,
    });
  }
}

async function runCase(
  token: string,
  source: { readonly key: string; readonly title: string; readonly path: string },
): Promise<Record<string, unknown>> {
  const bytes = new Uint8Array(await readFile(source.path));
  const extraction = await createExtraction(token, bytes, basename(source.path), source.key);
  const extractionTerminal = await waitForTerminal(token, readString(extraction.id), 35 * 60_000);
  const extractionResult = extractionTerminal.status === "succeeded"
    ? await getResult(token, readString(extraction.id))
    : null;
  const sourceVersionId = readOptionalString(extractionResult?.sourceVersionId);
  let reviewer: Record<string, unknown> | null = null;
  let reviewerTerminal: Record<string, unknown> | null = null;
  let reviewerResult: Record<string, unknown> | null = null;
  if (sourceVersionId) {
    const extractedPayload = requireRecord(extractionResult?.result, "extraction payload");
    reviewer = await createReviewer(
      token,
      sourceVersionId,
      source.title,
      source.key,
      readString(extractedPayload.text),
      requireArray(extractedPayload.sourceBlocks, "extraction source blocks"),
    );
    reviewerTerminal = await waitForTerminal(token, readString(reviewer.id), 25 * 60_000);
    reviewerResult = reviewerTerminal.status === "succeeded"
      ? await getResult(token, readString(reviewer.id))
      : null;
  }
  return {
    key: source.key,
    source: source.path,
    byteSize: bytes.byteLength,
    extraction: {
      accepted: extraction,
      terminal: extractionTerminal,
      result: extractionResult,
    },
    reviewer: reviewer
      ? { accepted: reviewer, terminal: reviewerTerminal, result: reviewerResult }
      : null,
  };
}

async function createExtraction(
  token: string,
  bytes: Uint8Array,
  displayName: string,
  key: string,
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append(
    "source",
    new Blob([toArrayBuffer(bytes)], { type: "application/pdf" }),
    "b12-source.pdf",
  );
  form.append("displayName", displayName);
  form.append("jobType", "document_extraction");
  return await requestJson("/api/jobs", token, {
    body: form,
    headers: { "Idempotency-Key": `b12:extract:${key}:${randomUUID()}` },
    method: "POST",
    expectedStatus: 202,
  });
}

async function createReviewer(
  token: string,
  sourceVersionId: string,
  title: string,
  key: string,
  sourceText: string,
  sourceBlocks: readonly unknown[],
): Promise<Record<string, unknown>> {
  return await requestJson("/api/jobs", token, {
    body: JSON.stringify({
      jobType: "reviewer_generation",
      outputMode: "standard",
      reuseMode: "fresh",
      sourceBlocks,
      sourceKind: "presentation",
      sourceText,
      sourceTitle: title,
      sourceVersionId,
    }),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `b12:reviewer:${key}:${randomUUID()}`,
    },
    method: "POST",
    expectedStatus: 202,
  });
}

async function waitForTerminal(
  token: string,
  jobId: string,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await requestJson(`/api/jobs/${jobId}`, token, {
      method: "GET",
      expectedStatus: 200,
    });
    const status = readOptionalString(job.status);
    if (status && terminalStatuses.has(status)) return job;
    await delay(2_000);
  }
  throw new Error("b12_job_timeout");
}

async function getResult(token: string, jobId: string): Promise<Record<string, unknown>> {
  return await requestJson(`/api/jobs/${jobId}/result`, token, {
    method: "GET",
    expectedStatus: 200,
  });
}

async function requestJson(
  path: string,
  token: string,
  input: {
    readonly method: "GET" | "POST";
    readonly expectedStatus: number;
    readonly body?: BodyInit;
    readonly headers?: Readonly<Record<string, string>>;
  },
): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: input.method,
    headers: { Authorization: `Bearer ${token}`, ...input.headers },
    ...(input.body ? { body: input.body } : {}),
  });
  const body = requireRecord(await response.json(), "API response");
  if (response.status !== input.expectedStatus || body.ok !== true) {
    const error = typeof body.error === "object" && body.error !== null
      ? body.error as Record<string, unknown>
      : {};
    const code = readOptionalString(error.code);
    throw new Error(`b12_api_${response.status}${code ? `_${code}` : ""}`);
  }
  return requireRecord(body.data, "API data");
}

async function waitForApi(): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Keep polling until the bounded readiness deadline.
    }
    await delay(1_000);
  }
  throw new Error("b12_api_unavailable");
}

async function cleanup(
  service: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const sourceRows = await service
    .from("processing_job_sources")
    .select("storage_bucket,storage_object_path")
    .eq("user_id", userId);
  const byBucket = new Map<string, string[]>();
  for (const row of sourceRows.data ?? []) {
    const bucket = readOptionalString(row.storage_bucket);
    const path = readOptionalString(row.storage_object_path);
    if (!bucket || !path) continue;
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path]);
  }
  for (const [bucket, paths] of byBucket) {
    await service.storage.from(bucket).remove(paths);
  }
  await service.auth.admin.deleteUser(userId);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function requiredArgument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing required argument ${name}.`);
  return value;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment ${name}.`);
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function readString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Expected string.");
  return value;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "B12 durable acceptance failed.");
  process.exitCode = 1;
});
