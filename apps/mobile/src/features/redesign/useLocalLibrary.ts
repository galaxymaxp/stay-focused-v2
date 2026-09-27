import type {
  LibraryArtifactDetail,
  LibraryArtifactSummary,
  LibraryOverview,
} from "@stay-focused/shared";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth";
import { useTheme } from "../../design/theme";
import { libraryRemote, storeLocalArtifactDetail } from "../../services/localLibrary/deviceLibrary";
import { reconcileLibrary, refreshArtifactDetail } from "../../services/localLibrary/librarySync";
import { getLocalArtifactStore } from "../../services/localLibrary/localArtifactDatabase";
import { useExperienceClient } from "./useExperience";

interface LibraryState {
  readonly items: readonly LibraryArtifactSummary[];
  readonly categories: LibraryOverview["categories"] | null;
  /** True once the device copy has been read (or found unavailable). */
  readonly localReady: boolean;
  /** A cloud reconciliation is in flight. */
  readonly refreshing: boolean;
  readonly error: string | null;
  readonly supersededReviewerIds: readonly string[];
}
const initialLibrary: LibraryState = {
  items: [],
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
    void (async () => {
      const store = await getLocalArtifactStore();
      if (!live) return;
      if (!store) {
        setState((old) => ({ ...old, localReady: true, refreshing: true, error: null }));
        try {
          const page = await remote.fetchPage(0, 100);
          if (live) setState({ items: page.items, categories: page.categories, localReady: true, refreshing: false, error: null, supersededReviewerIds: page.supersededReviewerIds ?? [] });
        } catch (error) {
          if (live) setState((old) => ({ ...old, refreshing: false, error: message(error) }));
        }
        return;
      }
      const readLocal = async () => {
        const items = await store.listSummaries(ownerUserId);
        if (live) setState((old) => ({ ...old, items: items.filter(item => !old.supersededReviewerIds.includes(item.id)), localReady: true }));
      };
      await readLocal().catch(() => {
        if (live) setState((old) => ({ ...old, localReady: true }));
      });
      if (!live) return;
      setState((old) => ({ ...old, refreshing: true, error: null }));
      try {
        const result = await reconcileLibrary({
          store,
          ownerUserId,
          remote,
          onListReconciled: readLocal,
          isCancelled: () => !live,
        });
        if (live) setState((old) => ({ ...old, items: old.items.filter(item => !result.supersededReviewerIds.includes(item.id)), supersededReviewerIds: result.supersededReviewerIds, categories: result.categories ?? old.categories, refreshing: false }));
      } catch (error) {
        await readLocal().catch(() => undefined);
        if (live) setState((old) => ({ ...old, refreshing: false, error: message(error) }));
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [ownerUserId, client, focused, active, version]);

  return { ...state, refresh };
}

interface ArtifactState {
  readonly data: LibraryArtifactDetail | null;
  readonly loading: boolean;
  readonly error: string | null;
  /** The cloud could not be reached; the visible copy is from this device. */
  readonly deviceCopy: boolean;
}
const initialArtifact: ArtifactState = { data: null, loading: true, error: null, deviceCopy: false };

/**
 * Opens a saved artifact from the device first. When `refreshRemote` is set,
 * the cloud copy is fetched afterwards and stored; reading never waits on it.
 */
export function useLocalArtifact(artifactId: string | null, options: { refreshRemote?: boolean } = {}) {
  const refreshRemote = options.refreshRemote ?? true;
  const { session } = useAuth();
  const ownerUserId = session?.user.id ?? null;
  const client = useExperienceClient();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ArtifactState>(initialArtifact);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => setState({ ...initialArtifact, loading: !!artifactId }), [ownerUserId, artifactId]);
  useEffect(() => {
    if (!ownerUserId || !artifactId) return;
    let live = true;
    const controller = new AbortController();
    const remote = libraryRemote(client, controller.signal);
    void (async () => {
      const store = await getLocalArtifactStore();
      const local = store ? await store.readDetail(ownerUserId, artifactId).catch(() => null) : null;
      if (!live) return;
      if (local) setState({ data: local.detail, loading: false, error: null, deviceCopy: false });
      if (!refreshRemote) {
        if (!local) setState((old) => ({ ...old, loading: false }));
        return;
      }
      try {
        let detail: LibraryArtifactDetail;
        if (store) {
          const refreshed = await refreshArtifactDetail({ store, ownerUserId, remote, artifactId });
          // Display what the store kept, which never regresses to an older copy.
          detail = (await store.readDetail(ownerUserId, artifactId))?.detail ?? refreshed.detail;
        } else {
          detail = await remote.fetchDetail(artifactId);
        }
        if (live) setState({ data: detail, loading: false, error: null, deviceCopy: false });
      } catch (error) {
        if (!live) return;
        const gone = codeOf(error) === "not_found";
        setState((old) =>
          old.data && !gone
            ? { ...old, loading: false, deviceCopy: true }
            : { data: null, loading: false, error: message(error), deviceCopy: false },
        );
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [ownerUserId, artifactId, client, refreshRemote, version]);

  /** Records a server-confirmed change (for example a saved draft revision). */
  const storeConfirmed = useCallback(
    (detail: LibraryArtifactDetail) => {
      if (ownerUserId) void storeLocalArtifactDetail(ownerUserId, detail);
    },
    [ownerUserId],
  );
  return { ...state, refresh, storeConfirmed };
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
function codeOf(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? error.code : null;
}
