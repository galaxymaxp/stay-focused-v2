import type { LocalArtifactStore } from "./artifactStore";

/**
 * The web build is a development preview, not a student target. It does not
 * persist artifacts locally, so the Library reads from the cloud there.
 */
export function getLocalArtifactStore(): Promise<LocalArtifactStore | null> {
  return Promise.resolve(null);
}

export async function purgeLocalLibraryForOwner(_ownerUserId: string): Promise<void> {}
