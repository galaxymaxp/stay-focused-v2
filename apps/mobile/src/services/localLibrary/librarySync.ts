import type {
  GenerationView,
  LibraryArtifactDetail,
  LibraryOverview,
  QuizAnswerKey,
} from "@stay-focused/shared";

import type { LocalArtifactStore, LocalUpsertOutcome } from "./artifactStore";

export interface LibraryRemote {
  onDetailStored?(owner: string, detail: LibraryArtifactDetail): void;
  fetchPage(offset: number, limit: number): Promise<LibraryOverview>;
  fetchDetail(artifactId: string): Promise<LibraryArtifactDetail>;
  fetchQuizAnswerKey?(quizId: string): Promise<QuizAnswerKey>;
}

export interface ReconcileResult {
  readonly categories: LibraryOverview["categories"] | null;
  /** False when the page walk stopped early; nothing is deleted either way. */
  readonly listComplete: boolean;
  readonly hydrated: number;
  readonly supersededReviewerIds: readonly string[];
  readonly bodyStoppedBy: BodyStop;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const BODY_BATCH = 20;
const BODY_SESSION_LIMIT = 300;
const BODY_TIME_BUDGET_MS = 60_000;
export type BodyStop = 'done' | 'offline' | 'limit' | 'cancelled';

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
  readonly onProgress?: () => void | Promise<void>;
  readonly isCancelled?: () => boolean;
}): Promise<ReconcileResult> {
  const { store, ownerUserId, remote } = input;
  const cancelled = input.isCancelled ?? (() => false);
  let categories: LibraryOverview["categories"] | null = null;
  let offset = 0;
  let listComplete = false;
  let supersededReviewerIds: readonly string[] = [];
  for (let page = 0; page < MAX_PAGES && !cancelled(); page += 1) {
    const overview = await remote.fetchPage(offset, PAGE_SIZE);
    categories ??= overview.categories;
    supersededReviewerIds = overview.supersededReviewerIds ?? supersededReviewerIds;
    if (!cancelled()) for (const id of supersededReviewerIds) await store.removeArtifact(ownerUserId, id);
    if (cancelled()) break;
    await store.upsertSummaries(ownerUserId, overview.items);
    if (overview.nextOffset === null || overview.nextOffset <= offset) {
      listComplete = true;
      break;
    }
    offset = overview.nextOffset;
  }
  if (cancelled()) return { categories, listComplete, hydrated: 0, supersededReviewerIds, bodyStoppedBy: "cancelled" };
  await input.onListReconciled?.();

  const bodies = await hydrateLibraryBodies(input);
  return { categories, listComplete, hydrated: bodies.hydrated, supersededReviewerIds, bodyStoppedBy: bodies.stoppedBy };
}

/** Body-only catch-up, bounded by requests and elapsed time; never starts jobs. */
export async function hydrateLibraryBodies(input: {
  readonly store: LocalArtifactStore;
  readonly ownerUserId: string;
  readonly remote: LibraryRemote;
  readonly isCancelled?: () => boolean;
  readonly now?: () => number;
  readonly onProgress?: () => void | Promise<void>;
}): Promise<{ readonly hydrated: number; readonly stoppedBy: BodyStop }> {
  const cancelled = input.isCancelled ?? (() => false);
  const now = input.now ?? Date.now;
  const started = now();
  const attempted = new Set<string>();
  let hydrated = 0;
  while (attempted.size < BODY_SESSION_LIMIT) {
    if (cancelled()) return { hydrated, stoppedBy: 'cancelled' };
    if (now() - started > BODY_TIME_BUDGET_MS) return { hydrated, stoppedBy: 'limit' };
    const batch = (await input.store.idsNeedingBody(input.ownerUserId, BODY_BATCH + attempted.size, !!input.remote.fetchQuizAnswerKey))
      .filter(id => !attempted.has(id)).slice(0, Math.min(BODY_BATCH, BODY_SESSION_LIMIT - attempted.size));
    if (!batch.length) return { hydrated, stoppedBy: 'done' };
    for (const artifactId of batch) {
      if (cancelled()) return { hydrated, stoppedBy: 'cancelled' };
      if (now() - started > BODY_TIME_BUDGET_MS) return { hydrated, stoppedBy: 'limit' };
      attempted.add(artifactId);
      try {
        await refreshArtifactDetail({ ...input, artifactId });
        hydrated += 1;
      } catch (error) {
        const code = errorCode(error);
        if (code === 'connection' || code === 'sign_in_required') return { hydrated, stoppedBy: 'offline' };
        // Do not retry failed or non-advancing cloud copies in this run.
      }
    }
    await input.onProgress?.();
  }
  return { hydrated, stoppedBy: 'limit' };
}

/** Fetches one artifact and stores it; removes it only on an explicit not_found. */
export async function refreshArtifactDetail(input: {
  readonly store: LocalArtifactStore;
  readonly ownerUserId: string;
  readonly remote: Pick<LibraryRemote, "fetchDetail" | "fetchQuizAnswerKey" | "onDetailStored">;
  readonly artifactId: string;
  readonly isCancelled?: () => boolean;
}): Promise<{ detail: LibraryArtifactDetail; outcome: LocalUpsertOutcome }> {
  const { store, ownerUserId, remote, artifactId } = input;
  let detail: LibraryArtifactDetail;
  try {
    detail = await remote.fetchDetail(artifactId);
  } catch (error) {
    if (!input.isCancelled?.() && errorCode(error) === "not_found") {
      await store.removeArtifact(ownerUserId, artifactId);
    }
    throw error;
  }
  if (input.isCancelled?.()) return { detail, outcome: "unchanged" };
  const outcome = await store.upsertDetail(ownerUserId, artifactId, detail);
  if (outcome !== 'ignored_older') remote.onDetailStored?.(ownerUserId, detail);
  if ('quiz' in detail && remote.fetchQuizAnswerKey && outcome !== 'ignored_older') {
    try {
      const key = await remote.fetchQuizAnswerKey(detail.quiz.id);
      if (!input.isCancelled?.() && key.quizId === detail.quiz.id) {
        await store.saveQuizAnswerKey(ownerUserId, key, detail.artifact.updatedAt);
      }
    } catch { /* Key failure never blocks saving the learner body; retry next catch-up. */ }
  }
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
  readonly remote: Pick<LibraryRemote, "fetchDetail" | "fetchQuizAnswerKey">;
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
