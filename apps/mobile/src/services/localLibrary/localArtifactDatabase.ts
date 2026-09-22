import { createLocalArtifactStore, type LocalArtifactStore } from "./artifactStore";
import { migrateLocalLibrary } from "./schema";

const DATABASE_NAME = "stay-focused-library.db";

let opening: Promise<LocalArtifactStore | null> | null = null;

/**
 * Opens the on-device Library database once per process. Resolves null when
 * local storage cannot be opened, so the Library falls back to cloud reads.
 */
export function getLocalArtifactStore(): Promise<LocalArtifactStore | null> {
  opening ??= (async () => {
    try {
      // Loaded lazily: an older binary without the native module (for example
      // one reached by an over-the-air update) falls back to cloud reads
      // instead of failing when the Library module loads.
      const { openDatabaseAsync } = await import("expo-sqlite");
      const db = await openDatabaseAsync(DATABASE_NAME);
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await migrateLocalLibrary(db);
      return createLocalArtifactStore(db);
    } catch {
      opening = null;
      return null;
    }
  })();
  return opening;
}

/** Explicit sign-out removes that account's device copies. Never throws. */
export async function purgeLocalLibraryForOwner(ownerUserId: string): Promise<void> {
  try {
    await (await getLocalArtifactStore())?.purgeOwner(ownerUserId);
  } catch {
    // Rows stay owner-scoped even if the purge fails; sign-out must not block.
  }
}
