/**
 * Pin and Hide are personal browsing preferences kept on this device. They
 * never change Canvas, sync state, or saved study work.
 *
 * - A pinned course is pinned everywhere it appears (Generate and Library).
 * - Hiding is per surface: hiding a course in Generate leaves its saved work
 *   in Library, and hidden items stay one tap away ("Show hidden").
 * - Today hides are scoped to one day (see `todayHideKey`), so a dismissed
 *   item only leaves that day's plan; Canvas and task data are untouched.
 */
export type HideSurface = "generate" | "library" | "libraryItems" | "today" | "announcements" | "queue";
export type PinKind = "course" | "artifact" | "today" | "announcement";

/** A Today dismissal lasts for the day it was made on. */
export function todayHideKey(date: string, itemId: string) {
  return `${date}|${itemId}`;
}

export interface ListPreferences {
  readonly pinned: Readonly<Record<PinKind, readonly string[]>>;
  readonly hidden: Readonly<Record<HideSurface, readonly string[]>>;
  /** Announcements the student has read on this device. */
  readonly read: { readonly announcements: readonly string[] };
}

export const EMPTY_LIST_PREFERENCES: ListPreferences = {
  pinned: { course: [], artifact: [], today: [], announcement: [] },
  hidden: { generate: [], library: [], libraryItems: [], today: [], announcements: [], queue: [] },
  read: { announcements: [] },
};

const MAX_ENTRIES = 300;

function toggled(list: readonly string[], id: string, on: boolean): readonly string[] {
  const without = list.filter((item) => item !== id);
  // Newest first, so a fresh pin surfaces at the top of the pinned group.
  return on ? [id, ...without].slice(0, MAX_ENTRIES) : without;
}

export function setPinned(prefs: ListPreferences, kind: PinKind, id: string, pinned: boolean): ListPreferences {
  return { ...prefs, pinned: { ...prefs.pinned, [kind]: toggled(prefs.pinned[kind], id, pinned) } };
}

export function setRead(prefs: ListPreferences, id: string, read: boolean): ListPreferences {
  return { ...prefs, read: { announcements: toggled(prefs.read.announcements, id, read) } };
}

export function setHidden(prefs: ListPreferences, surface: HideSurface, id: string, hidden: boolean): ListPreferences {
  return { ...prefs, hidden: { ...prefs.hidden, [surface]: toggled(prefs.hidden[surface], id, hidden) } };
}

export interface ArrangedList<T> {
  /** Pinned, newest pin first. */
  readonly pinned: readonly T[];
  /** Everything else, in the caller's order. */
  readonly rest: readonly T[];
  readonly hidden: readonly T[];
}

/** Hidden wins over pinned: a hidden item is out of the way until shown again. */
export function arrangeList<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  pinnedIds: readonly string[],
  hiddenIds: readonly string[],
): ArrangedList<T> {
  const hidden = new Set(hiddenIds);
  const pinOrder = new Map(pinnedIds.map((id, index) => [id, index]));
  const visible = items.filter((item) => !hidden.has(keyOf(item)));
  return {
    pinned: visible
      .filter((item) => pinOrder.has(keyOf(item)))
      .sort((a, b) => pinOrder.get(keyOf(a))! - pinOrder.get(keyOf(b))!),
    rest: visible.filter((item) => !pinOrder.has(keyOf(item))),
    hidden: items.filter((item) => hidden.has(keyOf(item))),
  };
}

export function parseListPreferences(raw: string | null): ListPreferences {
  if (!raw) return EMPTY_LIST_PREFERENCES;
  try {
    const value = JSON.parse(raw) as { pinned?: Record<string, unknown>; hidden?: Record<string, unknown> };
    const ids = (list: unknown) =>
      Array.isArray(list) ? list.filter((id): id is string => typeof id === "string").slice(0, MAX_ENTRIES) : [];
    return {
      pinned: { course: ids(value.pinned?.course), artifact: ids(value.pinned?.artifact), today: ids(value.pinned?.today), announcement: ids(value.pinned?.announcement) },
      hidden: {
        generate: ids(value.hidden?.generate),
        library: ids(value.hidden?.library),
        libraryItems: ids(value.hidden?.libraryItems),
        today: ids(value.hidden?.today),
        announcements: ids(value.hidden?.announcements),
        queue: ids(value.hidden?.queue),
      },
      read: { announcements: ids((value as { read?: Record<string, unknown> }).read?.announcements) },
    };
  } catch {
    return EMPTY_LIST_PREFERENCES;
  }
}
