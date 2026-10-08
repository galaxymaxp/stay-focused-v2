import { ASSIST_TYPES, type AssistSelection, type AssistType } from "@stay-focused/shared";
import { useSyncExternalStore } from "react";

import { haptic } from "../../design/haptics";
import type { ExperienceClient } from "../../services/experienceApi";
import { studyAssist, StudyAssistError } from "../../services/studyAssist";

/**
 * Study Assist requests outlive the sheet that started them. This store keeps
 * each request's state per passage (a block's explanation or one key point),
 * so the Reviewer can show it working, turn the passage green when a result
 * arrives unseen, and tell the student even after the sheet was closed.
 * It lives for the app session; the results themselves are cached on device.
 */
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
/** What the passage shows in the Reviewer. */
export type AssistMark = "pending" | "fresh" | null;
export interface AssistReadyEvent {
  readonly key: string;
  readonly target: AssistTarget;
  readonly type: AssistType;
  readonly ok: boolean;
}

export function assistTargetKey(reviewerId: string, blockId: string, pointIndex?: number) {
  return `${reviewerId}|${blockId}|${pointIndex ?? "block"}`;
}
export function keyOf(target: AssistTarget) {
  return assistTargetKey(target.selection.reviewerId, target.selection.blockId, target.pointIndex);
}
export function assistMark(entries: AssistEntries | undefined): AssistMark {
  if (!entries) return null;
  const values = ASSIST_TYPES.map((type) => entries[type]).filter((entry): entry is AssistEntry => !!entry);
  if (values.some((entry) => entry.status === "pending")) return "pending";
  if (values.some((entry) => entry.status === "ready" && !entry.seen)) return "fresh";
  return null;
}

/** Any saved explanation for the passage, seen or not. */
export function hasAssistResult(entries: AssistEntries | undefined): boolean {
  return !!entries && ASSIST_TYPES.some((type) => entries[type]?.status === "ready");
}

const EMPTY: AssistEntries = Object.freeze({});
let entries: Record<string, AssistEntries> = {};
let openKey: string | null = null;
const listeners = new Set<() => void>();
const readyListeners = new Set<(event: AssistReadyEvent) => void>();

function emit() {
  for (const listener of listeners) listener();
}
function write(key: string, type: AssistType, entry: AssistEntry) {
  entries = { ...entries, [key]: { ...(entries[key] ?? EMPTY), [type]: entry } };
  emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const assistStore = {
  get(key: string): AssistEntries {
    return entries[key] ?? EMPTY;
  },
  /** The sheet that is showing a passage; its results count as seen. */
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
  /** Restores results saved on the device without a network call. */
  async hydrate(owner: string, target: AssistTarget) {
    const key = keyOf(target);
    await Promise.all(ASSIST_TYPES.map(async (type) => {
      if (entries[key]?.[type]) return;
      const saved = await studyAssist.peek(owner, target.selection, type, target.pointIndex);
      if (saved && !entries[key]?.[type]) write(key, type, { status: "ready", text: saved.text, error: null, seen: true });
    }));
  },
  /** Starts a request unless one is running or already done; a failed one runs again. */
  run(owner: string, client: ExperienceClient, target: AssistTarget, type: AssistType) {
    const key = keyOf(target);
    const existing = entries[key]?.[type];
    if (existing?.status === "pending" || existing?.status === "ready") return;
    write(key, type, { status: "pending", text: null, error: null, seen: true });
    void studyAssist
      .request(owner, client, target.selection, type, undefined, target.pointIndex)
      .then(
        (result) => {
          const seen = openKey === key;
          write(key, type, { status: "ready", text: result.text, error: null, seen });
          haptic.success();
          for (const listener of readyListeners) listener({ key, target, type, ok: true });
        },
        (error: unknown) => {
          const message = error instanceof StudyAssistError ? error.message : "This explanation is unavailable. Please try again.";
          write(key, type, { status: "error", text: null, error: message, seen: openKey === key });
          haptic.warning();
          for (const listener of readyListeners) listener({ key, target, type, ok: false });
        },
      );
  },
  onSettled(listener: (event: AssistReadyEvent) => void) {
    readyListeners.add(listener);
    return () => {
      readyListeners.delete(listener);
    };
  },
  /** Test seam. */
  reset() {
    entries = {};
    openKey = null;
    emit();
  },
};

export function useAssistEntries(key: string): AssistEntries {
  return useSyncExternalStore(subscribe, () => assistStore.get(key), () => assistStore.get(key));
}
/** Every passage's mark, keyed like `assistTargetKey`. One subscription for the whole Reviewer. */
export function useAssistMarks(): Readonly<Record<string, AssistEntries>> {
  return useSyncExternalStore(subscribe, () => entries, () => entries);
}
