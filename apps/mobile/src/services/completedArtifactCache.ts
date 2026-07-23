import type { GeneratedArtifactType } from "@stay-focused/shared";

import { sessionStore } from "../auth/sessionStore";

const ARTIFACT_CACHE_KEY = "stay-focused-v2.completed-artifacts.v1";
const MAX_CACHE_CHARACTERS = 90_000;
const MAX_CACHE_METADATA_ENTRIES = 50;

export interface CachedArtifactMetadata {
  readonly artifactVersionId: string;
  readonly processingJobId: string | null;
  readonly ownerUserId: string;
  readonly artifactType: GeneratedArtifactType;
  readonly sourceVersionId: string;
  readonly sourceContentSha256: string;
  readonly title: string;
  readonly createdAt: string;
  readonly cachedAt: string;
  readonly lastOpenedAt: string;
  readonly latestServerVersionId: string | null;
  readonly isStale: boolean;
  readonly payloadAvailable: boolean;
  readonly unsyncedSourceEdit: boolean;
}

export interface CachedArtifactEntry extends CachedArtifactMetadata {
  readonly payload: unknown;
}

interface ArtifactCacheState {
  readonly metadata: readonly CachedArtifactMetadata[];
  readonly payloads: Readonly<Record<string, unknown>>;
}

export async function cacheCompletedArtifact(input: {
  readonly artifactVersionId: string;
  readonly processingJobId?: string;
  readonly ownerUserId: string;
  readonly artifactType: GeneratedArtifactType;
  readonly sourceVersionId: string;
  readonly sourceContentSha256: string;
  readonly title: string;
  readonly createdAt: string;
  readonly payload: unknown;
  readonly unsyncedSourceEdit?: boolean;
}): Promise<CachedArtifactMetadata> {
  const state = await readState();
  const existing = state.metadata.find(
    (item) => item.artifactVersionId === input.artifactVersionId,
  );
  if (existing?.unsyncedSourceEdit) {
    return existing;
  }
  const now = new Date().toISOString();
  const metadata: CachedArtifactMetadata = {
    artifactVersionId: input.artifactVersionId,
    processingJobId: input.processingJobId ?? null,
    ownerUserId: input.ownerUserId,
    artifactType: input.artifactType,
    sourceVersionId: input.sourceVersionId,
    sourceContentSha256: input.sourceContentSha256,
    title: input.title.slice(0, 180),
    createdAt: input.createdAt,
    cachedAt: now,
    lastOpenedAt: now,
    latestServerVersionId: input.artifactVersionId,
    isStale: false,
    payloadAvailable: true,
    unsyncedSourceEdit: input.unsyncedSourceEdit ?? false,
  };
  const nextMetadata = [
    metadata,
    ...state.metadata.filter(
      (item) => item.artifactVersionId !== input.artifactVersionId,
    ),
  ].slice(0, MAX_CACHE_METADATA_ENTRIES);
  const nextPayloads = {
    ...state.payloads,
    [input.artifactVersionId]: input.payload,
  };
  const bounded = boundState({
    metadata: nextMetadata,
    payloads: nextPayloads,
  });
  await writeState(bounded);
  return (
    bounded.metadata.find(
      (item) => item.artifactVersionId === input.artifactVersionId,
    ) ?? metadata
  );
}

export async function readCachedArtifact(
  ownerUserId: string,
  artifactVersionId: string,
): Promise<CachedArtifactEntry | null> {
  const state = await readState();
  const metadata = state.metadata.find(
    (item) =>
      item.ownerUserId === ownerUserId &&
      item.artifactVersionId === artifactVersionId,
  );
  const payload = state.payloads[artifactVersionId];
  if (!metadata || payload === undefined) return null;
  const opened: CachedArtifactMetadata = {
    ...metadata,
    lastOpenedAt: new Date().toISOString(),
  };
  await writeState({
    metadata: state.metadata.map((item) =>
      item.artifactVersionId === artifactVersionId ? opened : item,
    ),
    payloads: state.payloads,
  });
  return { ...opened, payload };
}

export async function listCachedArtifactMetadata(
  ownerUserId: string,
): Promise<readonly CachedArtifactMetadata[]> {
  const state = await readState();
  return state.metadata.filter((item) => item.ownerUserId === ownerUserId);
}

export async function markCachedArtifactServerState(input: {
  readonly ownerUserId: string;
  readonly artifactVersionId: string;
  readonly latestServerVersionId: string | null;
}): Promise<void> {
  const state = await readState();
  await writeState({
    metadata: state.metadata.map((item) =>
      item.ownerUserId === input.ownerUserId &&
      item.artifactVersionId === input.artifactVersionId
        ? {
            ...item,
            latestServerVersionId: input.latestServerVersionId,
            isStale:
              input.latestServerVersionId !== null &&
              input.latestServerVersionId !== item.artifactVersionId,
          }
        : item,
    ),
    payloads: state.payloads,
  });
}

export async function removeCachedArtifact(
  ownerUserId: string,
  artifactVersionId: string,
): Promise<void> {
  const state = await readState();
  const payloads = { ...state.payloads };
  delete payloads[artifactVersionId];
  await writeState({
    metadata: state.metadata.filter(
      (item) =>
        !(
          item.ownerUserId === ownerUserId &&
          item.artifactVersionId === artifactVersionId
        ),
    ),
    payloads,
  });
}

function boundState(state: ArtifactCacheState): ArtifactCacheState {
  const payloads = { ...state.payloads };
  const metadata = [...state.metadata];
  const lru = [...metadata].sort((left, right) =>
    left.lastOpenedAt.localeCompare(right.lastOpenedAt),
  );

  while (
    JSON.stringify({ metadata, payloads }).length > MAX_CACHE_CHARACTERS &&
    lru.length > 0
  ) {
    const evicted = lru.shift();
    if (!evicted) break;
    delete payloads[evicted.artifactVersionId];
    const index = metadata.findIndex(
      (item) => item.artifactVersionId === evicted.artifactVersionId,
    );
    if (index >= 0) {
      metadata[index] = { ...metadata[index], payloadAvailable: false };
    }
  }

  return { metadata, payloads };
}

async function readState(): Promise<ArtifactCacheState> {
  const raw = await sessionStore.getItem(ARTIFACT_CACHE_KEY);
  if (!raw) return { metadata: [], payloads: {} };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      !isRecord(parsed) ||
      !Array.isArray(parsed.metadata) ||
      !isRecord(parsed.payloads)
    ) {
      return { metadata: [], payloads: {} };
    }
    return {
      metadata: parsed.metadata.filter(isMetadata),
      payloads: parsed.payloads,
    };
  } catch {
    return { metadata: [], payloads: {} };
  }
}

async function writeState(state: ArtifactCacheState): Promise<void> {
  await sessionStore.setItem(ARTIFACT_CACHE_KEY, JSON.stringify(state));
}

function isMetadata(value: unknown): value is CachedArtifactMetadata {
  return (
    isRecord(value) &&
    typeof value.artifactVersionId === "string" &&
    (typeof value.processingJobId === "string" || value.processingJobId === null) &&
    typeof value.ownerUserId === "string" &&
    typeof value.artifactType === "string" &&
    typeof value.sourceVersionId === "string" &&
    typeof value.sourceContentSha256 === "string" &&
    typeof value.title === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.cachedAt === "string" &&
    typeof value.lastOpenedAt === "string" &&
    typeof value.isStale === "boolean" &&
    typeof value.payloadAvailable === "boolean" &&
    typeof value.unsyncedSourceEdit === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
