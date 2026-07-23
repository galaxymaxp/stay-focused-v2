import type { GeneratedArtifactType } from "@stay-focused/shared";

import { sessionStore } from "../auth/sessionStore";

const OUTBOX_STORAGE_KEY = "stay-focused-v2.processing-outbox.v1";
const MAX_OUTBOX_ENTRIES = 20;

export type OfflineProcessingOperation =
  | "document_extraction"
  | "artifact_generation";

export type OfflineProcessingIntentStatus =
  | "waiting_for_connection"
  | "submitting"
  | "paused"
  | "blocked";

export interface OfflineProcessingIntent {
  readonly localRequestId: string;
  readonly ownerUserId: string;
  readonly operation: OfflineProcessingOperation;
  readonly sourceLocalReference: string;
  readonly sourceVersionId?: string;
  readonly artifactType?: GeneratedArtifactType;
  readonly settings: Readonly<Record<string, string | number | boolean>>;
  readonly idempotencyKey: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: OfflineProcessingIntentStatus;
  readonly attemptCount: number;
  readonly lastErrorCode: string | null;
}

export interface EnqueueOfflineProcessingIntentInput {
  readonly ownerUserId: string;
  readonly operation: OfflineProcessingOperation;
  readonly sourceLocalReference: string;
  readonly sourceVersionId?: string;
  readonly artifactType?: GeneratedArtifactType;
  readonly settings?: Readonly<Record<string, string | number | boolean>>;
  readonly idempotencyKey: string;
  readonly localRequestId?: string;
  readonly createdAt?: string;
}

export type OfflineIntentSubmissionResult =
  | { readonly status: "accepted"; readonly serverJobId: string }
  | { readonly status: "retryable"; readonly errorCode: string }
  | { readonly status: "blocked"; readonly errorCode: string };

export async function enqueueOfflineProcessingIntent(
  input: EnqueueOfflineProcessingIntentInput,
): Promise<OfflineProcessingIntent> {
  const ownerUserId = requireValue(input.ownerUserId, "ownerUserId");
  const sourceLocalReference = requireValue(
    input.sourceLocalReference,
    "sourceLocalReference",
  );
  const idempotencyKey = requireValue(input.idempotencyKey, "idempotencyKey");
  const createdAt = input.createdAt ?? new Date().toISOString();
  const entry: OfflineProcessingIntent = {
    localRequestId:
      input.localRequestId ?? `local-${Date.now().toString(36)}-${randomPart()}`,
    ownerUserId,
    operation: input.operation,
    sourceLocalReference,
    ...(input.sourceVersionId ? { sourceVersionId: input.sourceVersionId } : {}),
    ...(input.artifactType ? { artifactType: input.artifactType } : {}),
    settings: input.settings ?? {},
    idempotencyKey,
    createdAt,
    updatedAt: createdAt,
    status: "waiting_for_connection",
    attemptCount: 0,
    lastErrorCode: null,
  };

  const all = await readAll();
  const existing = all.find(
    (item) =>
      item.ownerUserId === ownerUserId &&
      item.idempotencyKey === idempotencyKey,
  );
  if (existing) return existing;
  const next = [entry, ...all].slice(0, MAX_OUTBOX_ENTRIES);
  await writeAll(next);
  return entry;
}

export async function readOfflineProcessingIntents(
  ownerUserId: string,
): Promise<readonly OfflineProcessingIntent[]> {
  const all = await readAll();
  return all.filter((item) => item.ownerUserId === ownerUserId);
}

export async function cancelOfflineProcessingIntent(
  ownerUserId: string,
  localRequestId: string,
): Promise<void> {
  const all = await readAll();
  await writeAll(
    all.filter(
      (item) =>
        !(
          item.ownerUserId === ownerUserId &&
          item.localRequestId === localRequestId
        ),
    ),
  );
}

export async function updateOfflineProcessingIntentSettings(
  ownerUserId: string,
  localRequestId: string,
  settings: Readonly<Record<string, string | number | boolean>>,
): Promise<OfflineProcessingIntent | null> {
  const all = await readAll();
  const current = all.find(
    (item) =>
      item.ownerUserId === ownerUserId &&
      item.localRequestId === localRequestId,
  );
  if (!current) return null;
  const updated: OfflineProcessingIntent = {
    ...current,
    settings,
    updatedAt: new Date().toISOString(),
    status:
      current.status === "blocked" ? "waiting_for_connection" : current.status,
    lastErrorCode: null,
  };
  await writeAll(
    all.map((item) =>
      item.localRequestId === current.localRequestId ? updated : item,
    ),
  );
  return updated;
}

export async function pauseOfflineProcessingIntents(
  ownerUserId: string,
): Promise<void> {
  const all = await readAll();
  const updatedAt = new Date().toISOString();
  await writeAll(
    all.map((item) =>
      item.ownerUserId === ownerUserId
        ? { ...item, status: "paused" as const, updatedAt }
        : item,
    ),
  );
}

export async function resumeOfflineProcessingIntents(
  ownerUserId: string,
): Promise<void> {
  const all = await readAll();
  const updatedAt = new Date().toISOString();
  await writeAll(
    all.map((item) =>
      item.ownerUserId === ownerUserId && item.status === "paused"
        ? { ...item, status: "waiting_for_connection" as const, updatedAt }
        : item,
    ),
  );
}

export async function flushOfflineProcessingIntents(input: {
  readonly ownerUserId: string;
  readonly sourceExists: (
    intent: OfflineProcessingIntent,
  ) => Promise<boolean>;
  readonly submit: (
    intent: OfflineProcessingIntent,
  ) => Promise<OfflineIntentSubmissionResult>;
}): Promise<{
  readonly acceptedServerJobIds: readonly string[];
  readonly remaining: readonly OfflineProcessingIntent[];
}> {
  let all = [...await readAll()];
  const acceptedServerJobIds: string[] = [];
  const owned = all.filter(
    (item) =>
      item.ownerUserId === input.ownerUserId &&
      item.status !== "paused" &&
      item.status !== "blocked",
  );

  for (const intent of owned) {
    if (!(await input.sourceExists(intent))) {
      all = replaceIntent(all, {
        ...intent,
        status: "blocked",
        lastErrorCode: "local_source_missing",
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    const submitting: OfflineProcessingIntent = {
      ...intent,
      status: "submitting",
      attemptCount: intent.attemptCount + 1,
      updatedAt: new Date().toISOString(),
    };
    all = replaceIntent(all, submitting);
    await writeAll(all);

    const result = await input.submit(submitting);
    if (result.status === "accepted") {
      acceptedServerJobIds.push(result.serverJobId);
      all = all.filter(
        (item) => item.localRequestId !== submitting.localRequestId,
      );
    } else {
      all = replaceIntent(all, {
        ...submitting,
        status:
          result.status === "blocked" ? "blocked" : "waiting_for_connection",
        lastErrorCode: result.errorCode,
        updatedAt: new Date().toISOString(),
      });
    }
    await writeAll(all);
  }

  return {
    acceptedServerJobIds,
    remaining: all.filter((item) => item.ownerUserId === input.ownerUserId),
  };
}

async function readAll(): Promise<readonly OfflineProcessingIntent[]> {
  const raw = await sessionStore.getItem(OUTBOX_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isOfflineIntent) : [];
  } catch {
    return [];
  }
}

async function writeAll(
  entries: readonly OfflineProcessingIntent[],
): Promise<void> {
  await sessionStore.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(entries));
}

function replaceIntent(
  entries: readonly OfflineProcessingIntent[],
  replacement: OfflineProcessingIntent,
): OfflineProcessingIntent[] {
  return entries.map((item) =>
    item.localRequestId === replacement.localRequestId ? replacement : item,
  );
}

function isOfflineIntent(value: unknown): value is OfflineProcessingIntent {
  return (
    isRecord(value) &&
    typeof value.localRequestId === "string" &&
    typeof value.ownerUserId === "string" &&
    (value.operation === "document_extraction" ||
      value.operation === "artifact_generation") &&
    typeof value.sourceLocalReference === "string" &&
    typeof value.idempotencyKey === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.status === "waiting_for_connection" ||
      value.status === "submitting" ||
      value.status === "paused" ||
      value.status === "blocked") &&
    typeof value.attemptCount === "number" &&
    (typeof value.lastErrorCode === "string" || value.lastErrorCode === null) &&
    isRecord(value.settings)
  );
}

function requireValue(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
}

function randomPart(): string {
  return Math.random().toString(36).slice(2, 12);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
