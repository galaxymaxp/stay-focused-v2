import type {
  GenerationView,
  LibraryArtifactDetail,
  LibraryOverview,
} from "@stay-focused/shared";

import type { LocalArtifactStore, LocalUpsertOutcome } from "./artifactStore";

export interface LibraryRemote {
  fetchPage(offset: number, limit: number): Promise<LibraryOverview>;
  fetchDetail(artifactId: string): Promise<LibraryArtifactDetail>;
}

export interface ReconcileResult {
  readonly categories: LibraryOverview["categories"] | null;
  /** False when the page walk stopped early; nothing is deleted either way. */
  readonly listComplete: boolean;
  readonly hydrated: number;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const BODY_HYDRATION_LIMIT = 20;

/**
 * Cloud → device reconciliation for one owner.
 *
 * Remote summaries are upserted idempotently. An artifact missing from the
 * remote list is retained: list absence is not a deletion signal. Only an
 * owner-authenticated `not_found` for that exact artifact removes it locally.
 * A failed request leaves every local row intact.
 */
export async function reconcileLibrary(input: {
  readonly store: LocalArtifactStore;
  readonly ownerUserId: string;
  readonly remote: LibraryRemote;
  readonly onListReconciled?: () => void | Promise<void>;
  readonly isCancelled?: () => boolean;
}): Promise<ReconcileResult> {
  const { store, ownerUserId, remote } = input;
  const cancelled = input.isCancelled ?? (() => false);
  let categories: LibraryOverview["categories"] | null = null;
  let offset = 0;
  let listComplete = false;
  for (let page = 0; page < MAX_PAGES && !cancelled(); page += 1) {
    const overview = await remote.fetchPage(offset, PAGE_SIZE);
    categories ??= overview.categories;
    await store.upsertSummaries(ownerUserId, overview.items);
    if (overview.nextOffset === null || overview.nextOffset <= offset) {
      listComplete = true;
      break;
    }
    offset = overview.nextOffset;
  }
  if (cancelled()) return { categories, listComplete, hydrated: 0 };
  await input.onListReconciled?.();

  // Fetch missing or outdated bodies so saved work opens without a network.
  let hydrated = 0;
  for (const artifactId of await store.idsNeedingBody(ownerUserId, BODY_HYDRATION_LIMIT)) {
    if (cancelled()) break;
    try {
      await refreshArtifactDetail({ store, ownerUserId, remote, artifactId });
      hydrated += 1;
    } catch (error) {
      const code = errorCode(error);
      // Offline or signed out: stop quietly and keep local copies. Any other
      // failure is specific to that artifact, so continue with the rest.
      if (code === "connection" || code === "sign_in_required") break;
    }
  }
  return { categories, listComplete, hydrated };
}

/** Fetches one artifact and stores it; removes it only on an explicit not_found. */
export async function refreshArtifactDetail(input: {
  readonly store: LocalArtifactStore;
  readonly ownerUserId: string;
  readonly remote: Pick<LibraryRemote, "fetchDetail">;
  readonly artifactId: string;
}): Promise<{ detail: LibraryArtifactDetail; outcome: LocalUpsertOutcome }> {
  const { store, ownerUserId, remote, artifactId } = input;
  let detail: LibraryArtifactDetail;
  try {
    detail = await remote.fetchDetail(artifactId);
  } catch (error) {
    if (errorCode(error) === "not_found") {
      await store.removeArtifact(ownerUserId, artifactId);
    }
    throw error;
  }
  const outcome = await store.upsertDetail(ownerUserId, artifactId, detail);
  return { detail, outcome };
}

/**
 * The server sets `artifactId` only after it has located the persisted
 * artifact. Queued, running, failed, and cancelled generations yield null.
 */
export function persistedArtifactId(view: GenerationView | null | undefined): string | null {
  return view?.state === "completed" && view.artifactId ? view.artifactId : null;
}

/** Stores the authoritative cloud copy of a just-completed generation. */
export async function persistCompletedGeneration(input: {
  readonly store: LocalArtifactStore;
  readonly ownerUserId: string;
  readonly remote: Pick<LibraryRemote, "fetchDetail">;
  readonly generation: GenerationView;
}): Promise<LocalUpsertOutcome | null> {
  const artifactId = persistedArtifactId(input.generation);
  if (!artifactId) return null;
  const { outcome } = await refreshArtifactDetail({ ...input, artifactId });
  return outcome;
}

function errorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
}
