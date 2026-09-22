import type {
  GenerationView,
  LibraryArtifactDetail,
  LibraryOverview,
} from "@stay-focused/shared";

import { experienceRequest, type ExperienceClient } from "../experienceApi";
import type { LocalUpsertOutcome } from "./artifactStore";
import { getLocalArtifactStore } from "./localArtifactDatabase";
import { persistCompletedGeneration, type LibraryRemote } from "./librarySync";

export function libraryRemote(client: ExperienceClient, signal?: AbortSignal): LibraryRemote {
  return {
    fetchPage: (offset, limit) =>
      experienceRequest<LibraryOverview>(
        client,
        `/api/experience/library?limit=${limit}&offset=${offset}`,
        signal ? { signal } : {},
      ),
    fetchDetail: (artifactId) =>
      experienceRequest<LibraryArtifactDetail>(
        client,
        `/api/experience/library/${encodeURIComponent(artifactId)}`,
        signal ? { signal } : {},
      ),
  };
}

/** Completion write path: cloud-persisted generation → device copy. */
export async function storeCompletedGeneration(
  ownerUserId: string,
  client: ExperienceClient,
  generation: GenerationView,
): Promise<LocalUpsertOutcome | null> {
  const store = await getLocalArtifactStore();
  if (!store) return null;
  return persistCompletedGeneration({
    store,
    ownerUserId,
    remote: libraryRemote(client),
    generation,
  });
}

/** Mirrors a confirmed server-side delete. Never throws. */
export async function removeLocalArtifact(ownerUserId: string, artifactId: string): Promise<void> {
  try {
    await (await getLocalArtifactStore())?.removeArtifact(ownerUserId, artifactId);
  } catch {
    // The next open resolves the server's not_found and removes the copy.
  }
}

/** Stores a server-confirmed detail, such as a saved Activity draft revision. */
export async function storeLocalArtifactDetail(
  ownerUserId: string,
  detail: LibraryArtifactDetail,
): Promise<void> {
  try {
    await (await getLocalArtifactStore())?.upsertDetail(ownerUserId, detail.artifact.id, detail);
  } catch {
    // The next Library refresh reconciles this artifact from the cloud.
  }
}
