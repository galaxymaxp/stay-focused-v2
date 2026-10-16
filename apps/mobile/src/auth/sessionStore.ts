import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { SupportedStorage } from "@supabase/supabase-js";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: "stay-focused-v2.auth",
};

const CHUNK_PREFIX = "chunked-v1:";
const ATOMIC_CHUNK_PREFIX = "chunked-v2:";
const CHUNK_SIZE = 1_800;
const MAX_CHUNKS = 64;
const WEB_STORAGE_TEST_KEY = "stay-focused-v2.storage-test";

export const sessionStore: SupportedStorage = {
  getItem: key => serialized(key, () => getItem(key)),
  setItem: (key, value) => serialized(key, () => setItem(key, value)),
  removeItem: key => serialized(key, () => removeItem(key)),
};

const pending = new Map<string, Promise<unknown>>();
function serialized<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const next = (pending.get(key) ?? Promise.resolve()).catch(() => undefined).then(operation);
  pending.set(key, next);
  void next.finally(() => { if (pending.get(key) === next) pending.delete(key); }).catch(() => undefined);
  return next;
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return getWebStorage()?.getItem(key) ?? null;
  }

  const stored = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  if (!stored) {
    return null;
  }

  const chunkCount = decodeChunkCount(stored);
  const atomic = decodeAtomicChunks(stored);
  if (atomic) {
    const chunks: string[] = [];
    for (let index = 0; index < atomic.count; index++) {
      const chunk = await SecureStore.getItemAsync(atomicChunkKey(key, atomic.bank, index), SECURE_STORE_OPTIONS);
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join("");
  }
  if (chunkCount === null) {
    return stored;
  }

  const chunks: string[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = await SecureStore.getItemAsync(
      chunkKey(key, index),
      SECURE_STORE_OPTIONS,
    );

    if (chunk === null) {
      return null;
    }

    chunks.push(chunk);
  }

  return chunks.join("");
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    const storage = getWebStorage();
    if (!storage) {
      return;
    }

    storage.setItem(key, value);
    return;
  }

  const previous = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
    await removePreviousChunks(key, previous);
    return;
  }

  const chunks = splitIntoChunks(value);
  if (chunks.length > MAX_CHUNKS) {
    throw new Error("Session is too large to store securely.");
  }

  // Write into the other bank, then publish its manifest in one secure write.
  // Killing the app mid-refresh leaves the previous complete session readable.
  const bank = decodeAtomicChunks(previous ?? "")?.bank === 0 ? 1 : 0;
  for (let index = 0; index < chunks.length; index += 1) {
    await SecureStore.setItemAsync(
      atomicChunkKey(key, bank, index),
      chunks[index],
      SECURE_STORE_OPTIONS,
    );
  }

  await SecureStore.setItemAsync(
    key,
    `${ATOMIC_CHUNK_PREFIX}${bank}:${chunks.length}`,
    SECURE_STORE_OPTIONS,
  );
  await removePreviousChunks(key, previous);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(key);
    return;
  }

  const stored = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
  await removePreviousChunks(key, stored);
}

async function removePreviousChunks(key: string, stored: string | null): Promise<void> {
  const atomic = decodeAtomicChunks(stored ?? "");
  const count = atomic?.count ?? decodeChunkCount(stored ?? "") ?? 0;
  for (let index = 0; index < count; index++) {
    await SecureStore.deleteItemAsync(atomic ? atomicChunkKey(key, atomic.bank, index) : chunkKey(key, index), SECURE_STORE_OPTIONS);
  }
}

function decodeAtomicChunks(value: string): { bank: number; count: number } | null {
  if (!value.startsWith(ATOMIC_CHUNK_PREFIX)) return null;
  const match = /^chunked-v2:([01]):(\d+)$/.exec(value);
  const count = Number(match?.[2]);
  return match && count >= 1 && count <= MAX_CHUNKS ? { bank: Number(match[1]), count } : null;
}

function atomicChunkKey(key: string, bank: number, index: number): string {
  return `${key}.v2.${bank}.${index}`;
}

function splitIntoChunks(value: string): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += CHUNK_SIZE) {
    chunks.push(value.slice(index, index + CHUNK_SIZE));
  }
  return chunks;
}

function decodeChunkCount(value: string): number | null {
  if (!value.startsWith(CHUNK_PREFIX)) {
    return null;
  }

  const chunkCount = Number(value.slice(CHUNK_PREFIX.length));
  if (!Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > MAX_CHUNKS) {
    return null;
  }

  return chunkCount;
}

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`;
}

function getWebStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === "undefined") {
      return null;
    }

    globalThis.localStorage.setItem(WEB_STORAGE_TEST_KEY, "1");
    globalThis.localStorage.removeItem(WEB_STORAGE_TEST_KEY);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
