import type {
  GenerationState,
  LibraryArtifactType,
} from "@stay-focused/shared";

import { sessionStore } from "../auth/sessionStore";
import {
  experienceRequest,
  newRequestKey,
  type ExperienceClient,
} from "./experienceApi";

export interface GenerationIntent {
  key: string;
  title: string;
  type: LibraryArtifactType;
  path: string;
  body: Record<string, unknown>;
  generationId?: string;
}
const inFlight = new Map<string, Promise<GenerationIntent>>();
const writes = new Map<string, Promise<unknown>>();
const storageKey = (owner: string) => `sf.generation.v1.${owner}`;
export async function readGenerationIntents(
  owner: string,
): Promise<GenerationIntent[]> {
  const raw = await sessionStore.getItem(storageKey(owner));
  if (!raw) return [];
  let entries: unknown;
  try {
    entries = JSON.parse(raw);
  } catch {
    // Accepted jobs remain authoritative and discoverable through the server
    // Queue. An unreadable local admission cache must not permanently block
    // the owner from creating new work; the next save replaces it atomically.
    return [];
  }
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (entry): entry is GenerationIntent =>
      typeof entry === "object" &&
      entry !== null &&
      typeof entry.key === "string" &&
      typeof entry.title === "string" &&
      ["reviewer", "quiz", "activity_output"].includes(entry.type) &&
      typeof entry.path === "string" &&
      entry.path.startsWith("/api/experience/") &&
      typeof entry.body === "object" &&
      entry.body !== null,
  );
}
async function save(owner: string, intent: GenerationIntent) {
  const operation = (writes.get(owner) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const items = await readGenerationIntents(owner);
      const next = items.filter((item) => item.key !== intent.key);
      // Never silently evict an unresolved submission.
      while (next.length >= 200) {
        const accepted = next.findIndex((item) => !!item.generationId);
        if (accepted < 0)
          throw new Error(
            "Reconnect your pending requests in Queue before starting another.",
          );
        next.splice(accepted, 1); // Accepted jobs remain discoverable through the server Queue.
      }
      await sessionStore.setItem(
        storageKey(owner),
        JSON.stringify([...next, intent]),
      );
    });
  writes.set(owner, operation);
  await operation;
}
/** Drops saved requests that were never accepted (Queue > Clear). */
export async function discardGenerationIntents(owner: string, keys: readonly string[]) {
  const drop = new Set(keys);
  const operation = (writes.get(owner) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const items = await readGenerationIntents(owner);
      await sessionStore.setItem(storageKey(owner), JSON.stringify(items.filter((item) => !drop.has(item.key) || !!item.generationId)));
    });
  writes.set(owner, operation);
  await operation;
}

export async function createGenerationIntent(
  owner: string,
  input: Omit<GenerationIntent, "key">,
) {
  const intent = { ...input, key: newRequestKey() };
  await save(owner, intent);
  return intent;
}
/** Submission is not tied to a screen's lifetime. HTTP 202 work runs on the server. */
export function acceptGeneration(
  owner: string,
  client: ExperienceClient,
  intent: GenerationIntent,
): Promise<GenerationIntent> {
  if (intent.generationId) return Promise.resolve(intent);
  const identity = `${owner}:${intent.key}`;
  const existing = inFlight.get(identity);
  if (existing) return existing;
  const promise = (async () => {
    const result = await experienceRequest<{
      id: string;
      state: GenerationState;
    }>(client, intent.path, {
      method: "POST",
      body: intent.body,
      key: intent.key,
    });
    if (typeof result.id !== "string")
      throw new Error(
        "Could not confirm this generation. Reconnect from Queue.",
      );
    const accepted = { ...intent, generationId: result.id };
    await save(owner, accepted);
    return accepted;
  })();
  inFlight.set(identity, promise);
  void promise.finally(() => inFlight.delete(identity)).catch(() => {});
  return promise;
}
