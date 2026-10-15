import { readSavedSnapshot, savedSnapshot, type SavedSnapshot } from "@stay-focused/shared";

const epochs = new Map<string, number>();
export const snapshotEpoch = (owner: string) => epochs.get(owner) ?? 0;
let opening: Promise<IDBDatabase | null> | null = null;
function database(): Promise<IDBDatabase | null> {
  opening ??= new Promise(resolve => {
    try {
      const request = indexedDB.open("stay-focused-screen-snapshots", 1);
      const timer = setTimeout(() => resolve(null), 1000);
      request.onupgradeneeded = () => { request.result.createObjectStore("snapshots"); };
      request.onsuccess = () => {
        clearTimeout(timer);
        request.result.onversionchange = () => { request.result.close(); opening = null; };
        resolve(request.result);
      };
      request.onerror = request.onblocked = () => { clearTimeout(timer); resolve(null); };
    } catch { resolve(null); }
  });
  return opening;
}
const storageKey = (owner: string, key: string) => JSON.stringify([owner, key]);

export async function readScreenSnapshot<T>(owner: string, key: string): Promise<SavedSnapshot<T> | null> {
  if (!owner) return null;
  try {
    const db = await database();
    if (!db) return null;
    return await new Promise(resolve => {
      const tx = db.transaction("snapshots", "readwrite"), store = tx.objectStore("snapshots");
      const request = store.get(storageKey(owner, key));
      let value: SavedSnapshot<T> | null = null;
      request.onsuccess = () => {
        value = readSavedSnapshot<T>(request.result as unknown, owner, key);
        if (!value && request.result !== undefined) store.delete(storageKey(owner, key));
      };
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function writeScreenSnapshot<T>(owner: string, key: string, data: T, epoch: number): Promise<void> {
  try {
    const db = await database();
    if (!db || !owner || snapshotEpoch(owner) !== epoch) return;
    await new Promise<void>(resolve => {
      const tx = db.transaction("snapshots", "readwrite");
      tx.objectStore("snapshots").put(savedSnapshot(owner, key, data), storageKey(owner, key));
      tx.oncomplete = tx.onabort = tx.onerror = () => resolve();
    });
  } catch { /* Storage may be disabled; keep the existing online behavior. */ }
}

export async function listScreenSnapshots<T>(owner: string, prefix: string): Promise<readonly SavedSnapshot<T>[]> {
  if (!owner) return [];
  try {
    const db = await database();
    if (!db) return [];
    return await new Promise(resolve => {
      const tx = db.transaction("snapshots", "readonly"), store = tx.objectStore("snapshots");
      const request = store.getAll(), keys = store.getAllKeys();
      let snapshots: SavedSnapshot<T>[] = [];
      tx.oncomplete = () => {
        snapshots = (request.result as unknown[]).flatMap((value, index) => {
          if (!value || typeof value !== "object" || !("key" in value) || typeof value.key !== "string" || !value.key.startsWith(prefix)) return [];
          const snapshot = readSavedSnapshot<T>(value, owner, value.key);
          return snapshot && keys.result[index] === storageKey(owner, snapshot.key) ? [snapshot] : [];
        });
        resolve(snapshots);
      };
      tx.onabort = tx.onerror = () => resolve([]);
    });
  } catch { return []; }
}

export async function removeScreenSnapshot(owner: string, key: string): Promise<void> {
  try {
    const db = await database();
    if (!db || !owner) return;
    await new Promise<void>(resolve => {
      const tx = db.transaction("snapshots", "readwrite");
      tx.objectStore("snapshots").delete(storageKey(owner, key));
      tx.oncomplete = tx.onabort = tx.onerror = () => resolve();
    });
  } catch { /* A denied exact item must disappear from the current view regardless. */ }
}

export async function purgeScreenSnapshots(owner: string): Promise<void> {
  epochs.set(owner, snapshotEpoch(owner) + 1);
  try {
    const db = await database();
    if (!db || !owner) return;
    await new Promise<void>(resolve => {
      const tx = db.transaction("snapshots", "readwrite"), store = tx.objectStore("snapshots");
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) return;
        // The serialized key is authoritative, including corrupt envelopes.
        if (typeof row.key === "string" && row.key.startsWith(`[${JSON.stringify(owner)},`)) row.delete();
        row.continue();
      };
      tx.oncomplete = tx.onabort = tx.onerror = () => resolve();
    });
  } catch { /* Sign-out remains available if IndexedDB is unavailable. */ }
}

export function isScreenSnapshotPath(path: string): boolean {
  return /^\/api\/canvas\/(connection|courses)(\?|$)/.test(path) || /^\/api\/today(\?|$)/.test(path) || /^\/api\/experience\/(courses|activities|library|announcements|capabilities)(\/|\?|$)/.test(path);
}
