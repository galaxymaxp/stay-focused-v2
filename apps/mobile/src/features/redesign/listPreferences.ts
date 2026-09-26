/**
 * Pin and Hide are personal browsing preferences kept on this device. They
 * never change Canvas, sync state, or saved study work.
 *
 * - A pinned course is pinned everywhere it appears (Generate and Library).
 * - Hiding is per surface: hiding a course in Generate leaves its saved work
 *   in Library, and hidden items stay one tap away ("Show hidden").
 */
export type HideSurface = "generate" | "library" | "libraryItems";
export type PinKind = "course" | "artifact";

export interface ListPreferences {
  readonly pinned: Readonly<Record<PinKind, readonly string[]>>;
  readonly hidden: Readonly<Record<HideSurface, readonly string[]>>;
}

export const EMPTY_LIST_PREFERENCES: ListPreferences = {
  pinned: { course: [], artifact: [] },
  hidden: { generate: [], library: [], libraryItems: [] },
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
      pinned: { course: ids(value.pinned?.course), artifact: ids(value.pinned?.artifact) },
      hidden: { generate: ids(value.hidden?.generate), library: ids(value.hidden?.library), libraryItems: ids(value.hidden?.libraryItems) },
    };
  } catch {
    return EMPTY_LIST_PREFERENCES;
  }
}
