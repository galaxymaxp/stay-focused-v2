/** Increment when persisted response shapes change incompatibly. */
export const SAVED_SNAPSHOT_SCHEMA = 1;

export interface SavedSnapshot<T> {
  readonly ownerUserId: string;
  readonly key: string;
  readonly savedAt: string;
  readonly schemaVersion: number;
  readonly data: T;
}

export function savedSnapshot<T>(ownerUserId: string, key: string, data: T, savedAt = new Date().toISOString()): SavedSnapshot<T> {
  if (!ownerUserId || !key) throw new Error("snapshot_identity_required");
  return { ownerUserId, key, savedAt, schemaVersion: SAVED_SNAPSHOT_SCHEMA, data };
}

/** Storage is untrusted; a different owner, key or schema is always a miss. */
export function readSavedSnapshot<T>(value: unknown, ownerUserId: string, key: string): SavedSnapshot<T> | null {
  if (!ownerUserId || !key || typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.ownerUserId !== ownerUserId || record.key !== key || record.schemaVersion !== SAVED_SNAPSHOT_SCHEMA ||
    typeof record.savedAt !== "string" || !Number.isFinite(Date.parse(record.savedAt)) || record.data == null) return null;
  // The versioned envelope binds the stored DTO to the caller's response type.
  return record as unknown as SavedSnapshot<T>;
}

/** Retain the positions of surviving stable ids; append new ids, remove absent ids.
 * Only call with a complete successful response for this exact query/page. */
export function mergeSavedData<T>(previous: T | null, next: T): T {
  return merge(previous, next) as T;
}

/** Preserve derived group positions even when a refreshed count/date changes its sort. */
export function stableSavedList<T>(previous: readonly T[], next: readonly T[], identify: (item: T) => string): T[] {
  const remaining = new Map(next.map(item => [identify(item), item]));
  const result: T[] = [];
  for (const item of previous) {
    const key = identify(item);
    if (remaining.has(key)) { result.push(remaining.get(key)!); remaining.delete(key); }
  }
  return [...result, ...remaining.values()];
}
function merge(previous: unknown, next: unknown): unknown {
  if (Array.isArray(previous) && Array.isArray(next)) {
    const identified = (value: unknown): value is { id: string } =>
      typeof value === "object" && value !== null && "id" in value && typeof value.id === "string";
    if (!previous.every(identified) || !next.every(identified)) return next;
    const remaining = new Map(next.map(value => [value.id, value]));
    const result: unknown[] = [];
    for (const value of previous) {
      if (remaining.has(value.id)) {
        result.push(merge(value, remaining.get(value.id)));
        remaining.delete(value.id);
      }
    }
    return [...result, ...remaining.values()];
  }
  if (previous && next && typeof previous === "object" && typeof next === "object" && !Array.isArray(previous) && !Array.isArray(next)) {
    const old = previous as Record<string, unknown>;
    return Object.fromEntries(Object.entries(next).map(([key, value]) => [key, merge(old[key], value)]));
  }
  return next;
}

export function snapshotUpdatedLabel(savedAt: string | null, now = Date.now()): string {
  if (!savedAt) return "";
  const minutes = Math.max(0, Math.floor((now - Date.parse(savedAt)) / 60_000));
  return minutes < 1 ? "Updated just now" : minutes < 60 ? `Updated ${minutes}m ago` :
    minutes < 1440 ? `Updated ${Math.floor(minutes / 60)}h ago` : `Updated ${Math.floor(minutes / 1440)}d ago`;
}
