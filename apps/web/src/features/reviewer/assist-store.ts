"use client";
import {
  ASSIST_TYPES,
  assistCacheKey,
  assistContentHash,
  assistRequest,
  isAssistResult,
  type AssistResult,
  type AssistSelection,
  type AssistType,
} from "@stay-focused/shared";
import { useSyncExternalStore } from "react";
import type { Api } from "../../lib/api";

// Web port of apps/mobile/src/features/reviewer/assistStore.ts and
// services/studyAssist.ts. Requests outlive the panel that started them; the
// results are cached in this browser so a Reviewer reopens with them offline.

export interface AssistTarget {
  readonly selection: AssistSelection;
  /** A single key point; absent for the block's explanation. */
  readonly pointIndex?: number;
}
export interface AssistEntry {
  readonly status: "pending" | "ready" | "error";
  readonly text: string | null;
  readonly error: string | null;
  /** A ready result stays highlighted until the student opens it. */
  readonly seen: boolean;
}
export type AssistEntries = Readonly<Partial<Record<AssistType, AssistEntry>>>;
export type AssistMark = "pending" | "fresh" | null;
export interface AssistReadyEvent {
  readonly key: string;
  readonly target: AssistTarget;
  readonly type: AssistType;
  readonly ok: boolean;
}

export const assistTargetKey = (reviewerId: string, blockId: string, pointIndex?: number) =>
  `${reviewerId}|${blockId}|${pointIndex ?? "block"}`;
export const keyOf = (target: AssistTarget) =>
  assistTargetKey(target.selection.reviewerId, target.selection.blockId, target.pointIndex);
export function assistMark(entries: AssistEntries | undefined): AssistMark {
  if (!entries) return null;
  const values = ASSIST_TYPES.map((type) => entries[type]).filter((e): e is AssistEntry => !!e);
  if (values.some((e) => e.status === "pending")) return "pending";
  if (values.some((e) => e.status === "ready" && !e.seen)) return "fresh";
  return null;
}
export const hasAssistResult = (entries: AssistEntries | undefined) =>
  !!entries && ASSIST_TYPES.some((type) => entries[type]?.status === "ready");

/* ---- Browser cache: results keyed by request and the exact source text ---- */
const CACHE_LIMIT = 400;
type Cached = { text: string; createdAt: string; canonical: string };
const cacheKey = (owner: string) => `sf.study-assist.v1.${owner}`;
function readCache(owner: string): Record<string, Cached> {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(owner)) ?? "{}") as Record<string, Cached>;
  } catch {
    return {};
  }
}
function writeCache(owner: string, key: string, value: Cached) {
  const all = { ...readCache(owner), [key]: value };
  const keys = Object.keys(all);
  if (keys.length > CACHE_LIMIT)
    keys
      .sort((a, b) => Date.parse(all[a]!.createdAt) - Date.parse(all[b]!.createdAt))
      .slice(0, keys.length - CACHE_LIMIT)
      .forEach((k) => delete all[k]);
  try {
    localStorage.setItem(cacheKey(owner), JSON.stringify(all));
  } catch {
    /* Storage full or blocked: the result still shows this visit. */
  }
}
function peek(owner: string, target: AssistTarget, type: AssistType): string | null {
  const request = assistRequest(target.selection, type, undefined, target.pointIndex);
  const saved = readCache(owner)[assistCacheKey(request)];
  // The exact source text guards against fingerprint collisions.
  return saved && saved.canonical === assistContentHash(target.selection.canonicalContent)
    ? saved.text
    : null;
}

const MESSAGES: Record<string, string> = {
  sign_in_required: "Your session needs to be refreshed. Sign in again to use Study Assist.",
  not_found: "This part of the Reviewer is no longer available. Reopen the Reviewer and try again.",
  conflict: "This Reviewer changed. Reopen it and try again.",
  rate_limited: "You’re using Study Assist quickly. Wait a moment and try again.",
};

/* ---- Store ---- */
const EMPTY: AssistEntries = Object.freeze({});
let entries: Record<string, AssistEntries> = {};
let openKey: string | null = null;
const listeners = new Set<() => void>();
const readyListeners = new Set<(event: AssistReadyEvent) => void>();
const emit = () => listeners.forEach((l) => l());
function write(key: string, type: AssistType, entry: AssistEntry) {
  entries = { ...entries, [key]: { ...(entries[key] ?? EMPTY), [type]: entry } };
  emit();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const assistStore = {
  get: (key: string): AssistEntries => entries[key] ?? EMPTY,
  /** The panel that is showing a passage; its results count as seen. */
  setOpen(key: string | null) {
    openKey = key;
    if (key) assistStore.markSeen(key);
  },
  markSeen(key: string) {
    const current = entries[key];
    if (!current) return;
    let changed = false;
    const next: Partial<Record<AssistType, AssistEntry>> = { ...current };
    for (const type of ASSIST_TYPES) {
      const entry = current[type];
      if (entry && !entry.seen && entry.status !== "pending") {
        next[type] = { ...entry, seen: true };
        changed = true;
      }
    }
    if (!changed) return;
    entries = { ...entries, [key]: next };
    emit();
  },
  /** Restores results saved in this browser without a network call. */
  hydrate(owner: string, target: AssistTarget) {
    if (!owner) return;
    const key = keyOf(target);
    for (const type of ASSIST_TYPES) {
      if (entries[key]?.[type]) continue;
      const text = peek(owner, target, type);
      if (text) write(key, type, { status: "ready", text, error: null, seen: true });
    }
  },
  /** Starts a request unless one is running or already done; a failed one runs again. */
  run(owner: string, api: Api, target: AssistTarget, type: AssistType) {
    const key = keyOf(target);
    const existing = entries[key]?.[type];
    if (existing?.status === "pending" || existing?.status === "ready") return;
    write(key, type, { status: "pending", text: null, error: null, seen: true });
    const request = assistRequest(target.selection, type, undefined, target.pointIndex);
    void api<AssistResult>("/api/experience/study-assist", { method: "POST", body: request }).then(
      (value) => {
        if (!isAssistResult(value, request)) throw new Error("This explanation could not be read. Please try again.");
        writeCache(owner, assistCacheKey(request), {
          text: value.text,
          createdAt: value.createdAt,
          canonical: assistContentHash(target.selection.canonicalContent),
        });
        write(key, type, { status: "ready", text: value.text, error: null, seen: openKey === key });
        readyListeners.forEach((l) => l({ key, target, type, ok: true }));
      },
    ).catch((error: unknown) => {
      const code = (error as { code?: string } | null)?.code ?? "";
      const message =
        MESSAGES[code] ??
        (error instanceof Error && error.message.startsWith("This explanation")
          ? error.message
          : "This explanation could not be generated. Try again in a moment.");
      write(key, type, { status: "error", text: null, error: message, seen: openKey === key });
      readyListeners.forEach((l) => l({ key, target, type, ok: false }));
    });
  },
  onSettled(listener: (event: AssistReadyEvent) => void) {
    readyListeners.add(listener);
    return () => void readyListeners.delete(listener);
  },
};

export const useAssistEntries = (key: string): AssistEntries =>
  useSyncExternalStore(subscribe, () => assistStore.get(key), () => assistStore.get(key));
/** Every passage's mark, keyed like `assistTargetKey`. One subscription for the whole Reviewer. */
export const useAssistMarks = (): Readonly<Record<string, AssistEntries>> =>
  useSyncExternalStore(subscribe, () => entries, () => entries);
