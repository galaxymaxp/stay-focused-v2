import { localMeasurements, mergeSavedData } from "@stay-focused/shared";
import { readScreenSnapshot, writeScreenSnapshot, screenSnapshotEpoch } from "../../services/screenSnapshots";
import type {
  LibraryArtifactDetail,
  LibraryArtifactSummary,
  LibraryOverview,
} from "@stay-focused/shared";
import { useIsFocused } from "expo-router/react-navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth";
import { ApiConfigurationError } from "../../config/apiBaseUrlResolution";
import { useTheme } from "../../design/theme";
import { libraryRemote, storeLocalArtifactDetail } from "../../services/localLibrary/deviceLibrary";
import type { OfflineStats } from "../../services/localLibrary/artifactStore";
import { runOfflineCatchUp, subscribeOfflineLibrary, offlineCatchUpRunning, offlineCatchUpError } from "../../services/localLibrary/offlineCatchUp";
import { refreshArtifactDetail } from "../../services/localLibrary/librarySync";
import { getLocalArtifactStore } from "../../services/localLibrary/localArtifactDatabase";
import { useExperienceClient } from "./useExperience";
import { syncPendingDraftEdits, subscribeDraftEdits } from '../../services/localLibrary/pendingDraftSync';

interface LibraryState {
  readonly owner: string | null;
  readonly savedAt: string | null;
  readonly items: readonly (LibraryArtifactSummary & { readonly offlineReady?: boolean })[];
  readonly offlineStats: OfflineStats | null;
  readonly errorCode: string | null;
  readonly categories: LibraryOverview["categories"] | null;
  /** True once the device copy has been read (or found unavailable). */
  readonly localReady: boolean;
  /** A cloud reconciliation is in flight. */
  readonly refreshing: boolean;
  readonly error: string | null;
  readonly supersededReviewerIds: readonly string[];
}
const initialLibrary: LibraryState = {
  owner: null,
  savedAt: null,
  items: [],
  offlineStats: null,
  errorCode: null,
  categories: null,
  localReady: false,
  refreshing: false,
  error: null,
  supersededReviewerIds: [],
};

/**
 * Local-first Library: render the device copy immediately, then reconcile with
 * the cloud in the background without blanking what is already visible.
 */
export function useLocalLibrary() {
  const { session } = useAuth();
  const ownerUserId = session?.user.id ?? null;
  const client = useExperienceClient();
  const focused = useIsFocused();
  const { active } = useTheme();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<LibraryState>(initialLibrary);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => setState(initialLibrary), [ownerUserId]);
  useEffect(() => {
    if (!ownerUserId || !focused || !active) return;
    let live = true;
    const controller = new AbortController();
    const remote = libraryRemote(client, controller.signal);
    const epoch = screenSnapshotEpoch(ownerUserId);
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      const snapshot = await readScreenSnapshot<LibraryOverview>(ownerUserId, "library");
      if (live && snapshot) setState(old => ({ ...old, owner: ownerUserId, items: snapshot.data.items, categories: snapshot.data.categories, savedAt: snapshot.savedAt, localReady: true }));
      const store = await getLocalArtifactStore();
      if (!live) return;
      if (!store) {
        setState((old) => ({ ...old, owner: ownerUserId, localReady: true, refreshing: true, error: null, errorCode: null }));
        try {
          const page = await remote.fetchPage(0, 100);
          if (live) await writeScreenSnapshot(ownerUserId, "library", page, epoch);
          if (live) setState({ owner: ownerUserId, savedAt: new Date().toISOString(), items: page.items, categories: page.categories, localReady: true, refreshing: false, error: null, offlineStats: null, errorCode: null, supersededReviewerIds: page.supersededReviewerIds ?? [] });
        } catch (error) {
          if (live) setState((old) => ({ ...old, refreshing: false, error: message(error), errorCode: codeOf(error) }));
        }
        return;
      }
      let localRead: Promise<void> | null = null;
      let localDirty = false;
      const readLocal = (): Promise<void> => {
        if (!live) return Promise.resolve();
        localDirty = true;
        if (!localRead) localRead = Promise.resolve().then(async () => {
          // Keep the first saved result immediate. Events received during it
          // require a fresh follow-up, but never parallel owner-wide scans.
          try {
            while (live && localDirty) {
              localDirty = false;
              const finish = localMeasurements.start('library.overview_read');
              try {
                const { items, offlineStats } = await store.readLibraryOverview(ownerUserId);
                finish(live ? 'success' : 'cancelled', live ? items.length : undefined);
                if (live) setState((old) => ({ ...old, owner: ownerUserId, items: mergeSavedData(old.items, items.filter(item => !old.supersededReviewerIds.includes(item.id))), localReady: true, offlineStats, refreshing: offlineCatchUpRunning(ownerUserId) && offlineCatchUpError(ownerUserId) !== 'connection', errorCode: offlineCatchUpError(ownerUserId) }));
              } catch (error) {
                finish(live ? 'error' : 'cancelled');
                if (!localDirty) throw error;
              }
            }
          } finally { localRead = null; }
        });
        return localRead;
      };
      unsubscribe = subscribeOfflineLibrary(ownerUserId, () => { void readLocal().catch(() => undefined); });
      await readLocal().catch(() => {
        if (live) setState((old) => ({ ...old, localReady: true }));
      });
      if (!live) return;
      setState((old) => ({ ...old, refreshing: true, error: null }));
      try {
        await syncPendingDraftEdits(ownerUserId, client);
        const outcome = await runOfflineCatchUp(ownerUserId, client, { force: true });
        await readLocal();
        const result = outcome.result;
        if (live && !outcome.errorCode && result) {
          const items = await store.listSummaries(ownerUserId);
          await writeScreenSnapshot(ownerUserId, "library", { items, categories: result.categories, nextOffset: null, supersededReviewerIds: result.supersededReviewerIds }, epoch);
        }
        if (live) setState((old) => ({ ...old,
          items: result ? old.items.filter(item => !result.supersededReviewerIds.includes(item.id)) : old.items,
          supersededReviewerIds: result?.supersededReviewerIds ?? old.supersededReviewerIds,
          owner: ownerUserId,
          savedAt: !outcome.errorCode ? new Date().toISOString() : old.savedAt,
          categories: result?.categories ?? old.categories, refreshing: offlineCatchUpRunning(ownerUserId) && outcome.errorCode !== 'connection',
          error: outcome.errorCode === "connection" ? "connection" : outcome.errorCode ? "Could not refresh your Library. Try again." : null,
          errorCode: outcome.errorCode,
        }));
      } catch (error) {
        await readLocal().catch(() => undefined);
        if (live) setState((old) => ({ ...old, refreshing: false, error: message(error) }));
      }
    })();
    return () => {
      live = false;
      controller.abort();
      unsubscribe?.();
    };
  }, [ownerUserId, client, focused, active, version]);

  return { ...(state.owner === ownerUserId ? state : initialLibrary), refresh };
}

interface ArtifactState {
  readonly identity: string;
  readonly savedAt: string | null;
  readonly refreshing: boolean;
  readonly refreshError: string | null;
  readonly pending: LibraryArtifactDetail | null;
  readonly data: LibraryArtifactDetail | null;
  readonly loading: boolean;
  readonly error: string | null;
  /** The cloud could not be reached; the visible copy is from this device. */
  readonly deviceCopy: boolean;
  readonly offlineMissing: boolean;
}
const initialArtifact: ArtifactState = { identity: "", savedAt: null, refreshing: false, refreshError: null, pending: null, data: null, loading: true, error: null, deviceCopy: false, offlineMissing: false };

/**
 * Opens a saved artifact from the device first. When `refreshRemote` is set,
 * the cloud copy is fetched afterwards and stored; reading never waits on it.
 */
export function useLocalArtifact(artifactId: string | null, options: { refreshRemote?: boolean } = {}) {
  const refreshRemote = options.refreshRemote ?? true;
  const { session } = useAuth();
  const ownerUserId = session?.user.id ?? null;
  const client = useExperienceClient();
  const identity = `${ownerUserId ?? ""}:${artifactId ?? ""}`;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ArtifactState>(initialArtifact);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => setState({ ...initialArtifact, identity, loading: !!artifactId }), [ownerUserId, artifactId, identity]);
  useEffect(() => {
    if (!ownerUserId || !artifactId) return;
    let live = true;
    const unsubscribe = subscribeDraftEdits(ownerUserId, () => {
      void getLocalArtifactStore().then(async store => {
        const local = await store?.readDetail(ownerUserId, artifactId);
        if (live && local) setState(old => ({ ...old, data: local.detail, loading: false }));
      }).catch(() => undefined);
    });
    return () => { live = false; unsubscribe(); };
  }, [ownerUserId, artifactId]);
  useEffect(() => {
    if (!ownerUserId || !artifactId) return;
    let live = true;
    const controller = new AbortController();
    const remote = libraryRemote(client, controller.signal);
    void (async () => {
      const store = await getLocalArtifactStore();
      const local = store ? await store.readDetail(ownerUserId, artifactId).catch(() => null) : null;
      if (!live) return;
      if (local) setState(old => ({ ...old, identity, data: old.data ?? local.detail, savedAt: old.savedAt ?? local.detail.artifact.updatedAt, loading: false, refreshing: refreshRemote, error: null, refreshError: null, deviceCopy: false, offlineMissing: false }));
      else setState(old => ({ ...old, identity, refreshing: refreshRemote }));
      if (!refreshRemote) {
        if (!local) setState((old) => ({ ...old, loading: false }));
        return;
      }
      try {
        let detail: LibraryArtifactDetail;
        if (store) {
          const refreshed = await refreshArtifactDetail({ store, ownerUserId, remote, artifactId, isCancelled: () => !live });
          // Display what the store kept, which never regresses to an older copy.
          detail = (await store.readDetail(ownerUserId, artifactId))?.detail ?? refreshed.detail;
        } else {
          detail = await remote.fetchDetail(artifactId);
        }
        if (live) setState(old => {
          const changedReader = old.data && "reviewer" in old.data && "reviewer" in detail && JSON.stringify(old.data) !== JSON.stringify(detail);
          return { identity, data: changedReader ? old.data : detail, pending: changedReader ? detail : null,
            savedAt: new Date().toISOString(), refreshing: false, refreshError: null,
            loading: false, error: null, deviceCopy: false, offlineMissing: false };
        });
      } catch (error) {
        if (!live) return;
        const gone = codeOf(error) === "not_found";
        setState((old) =>
          old.data && !gone
            ? { ...old, loading: false, refreshing: false, refreshError: message(error), deviceCopy: true }
            : { ...initialArtifact, identity, data: null, loading: false, error: message(error), deviceCopy: false, offlineMissing: !!store && codeOf(error) === "connection" },
        );
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [ownerUserId, artifactId, client, refreshRemote, version, identity]);

  /** Records a server-confirmed change (for example a saved draft revision). */
  const storeConfirmed = useCallback(
    (detail: LibraryArtifactDetail) => {
      if (ownerUserId) {
        if ("draft" in detail) setState((old) => old.data?.artifact.id === detail.artifact.id
          ? { ...old, data: detail, deviceCopy: false }
          : old);
        void storeLocalArtifactDetail(ownerUserId, detail);
      }
    },
    [ownerUserId],
  );
  const applyUpdate = useCallback(() => setState(old => old.pending ? { ...old, data: old.pending, pending: null } : old), []);
  return { ...(state.identity === identity ? state : initialArtifact), refresh, storeConfirmed, updateAvailable: state.identity === identity && state.pending !== null, applyUpdate };
}

function message(error: unknown) {
  if (error instanceof ApiConfigurationError) return `App configuration error\n${error.message}`;
  return error instanceof Error ? error.message : "Please try again.";
}
function codeOf(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null;
}
