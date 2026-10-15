import type { SavedSnapshot } from "@stay-focused/shared";
import { getLocalArtifactStore } from "./localLibrary/localArtifactDatabase";
import { purgeCourseScreenMemory } from "./courseScreenMemory";

const epochs = new Map<string, number>();
export const screenSnapshotEpoch = (owner: string) => epochs.get(owner) ?? 0;
export async function readScreenSnapshot<T>(owner: string, key: string): Promise<SavedSnapshot<T> | null> {
  try { return (await getLocalArtifactStore())?.readScreenSnapshot<T>(owner, key) ?? null; }
  catch { return null; }
}
export async function writeScreenSnapshot<T>(owner: string, key: string, data: T, epoch: number): Promise<void> {
  try {
    const store = await getLocalArtifactStore();
    if (screenSnapshotEpoch(owner) === epoch) await store?.saveScreenSnapshot(owner, key, data);
  } catch { /* A device-store failure never hides a successful response. */ }
}
export async function purgeScreenSnapshotsForOwner(owner: string): Promise<void> {
  epochs.set(owner, screenSnapshotEpoch(owner) + 1);
  purgeCourseScreenMemory(owner);
  await (await getLocalArtifactStore())?.purgeScreenSnapshots(owner);
}

/** Only summary/agenda DTOs; signed source URLs and private source bodies stay out. */
export function isScreenSnapshotPath(path: string): boolean {
  return /^\/api\/today(\?|$)/.test(path) || /^\/api\/experience\/(courses|activities|announcements|capabilities)(\/|\?|$)/.test(path);
}
