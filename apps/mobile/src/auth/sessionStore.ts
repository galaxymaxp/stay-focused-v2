import * as SecureStore from "expo-secure-store";

import type { SupportedStorage } from "@supabase/supabase-js";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: "stay-focused-v2.auth",
};

const CHUNK_PREFIX = "chunked-v1:";
const CHUNK_SIZE = 1_800;
const MAX_CHUNKS = 64;

export const sessionStore: SupportedStorage = {
  getItem,
  setItem,
  removeItem,
};

async function getItem(key: string): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  if (!stored) {
    return null;
  }

  const chunkCount = decodeChunkCount(stored);
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
  await removeItem(key);

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
    return;
  }

  const chunks = splitIntoChunks(value);
  if (chunks.length > MAX_CHUNKS) {
    throw new Error("Session is too large to store securely.");
  }

  for (let index = 0; index < chunks.length; index += 1) {
    await SecureStore.setItemAsync(
      chunkKey(key, index),
      chunks[index],
      SECURE_STORE_OPTIONS,
    );
  }

  await SecureStore.setItemAsync(
    key,
    `${CHUNK_PREFIX}${chunks.length}`,
    SECURE_STORE_OPTIONS,
  );
}

async function removeItem(key: string): Promise<void> {
  const stored = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  const chunkCount = stored ? decodeChunkCount(stored) : null;

  await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);

  for (let index = 0; index < (chunkCount ?? 0); index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index), SECURE_STORE_OPTIONS);
  }
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
