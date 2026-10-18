import { describe, expect, it } from "vitest";
import { mergeSavedData, readSavedSnapshot, savedSnapshot, snapshotStatusLabel, snapshotUpdatedLabel, stableSavedList } from "./saved-snapshot";

describe("saved snapshots", () => {
  it("keeps derived course groups in place when refreshed dates would sort them differently", () => {
    expect(stableSavedList([{ key: "a", count: 1 }, { key: "b", count: 1 }],
      [{ key: "b", count: 9 }, { key: "a", count: 2 }, { key: "new", count: 1 }], item => item.key))
      .toEqual([{ key: "a", count: 2 }, { key: "b", count: 9 }, { key: "new", count: 1 }]);
  });
  it("accepts the exact owner/query and preserves successful empty responses", () => {
    const value = savedSnapshot("a", "today:date:zone", { items: [] });
    expect(readSavedSnapshot(value, "a", value.key)).toEqual(value);
    expect(readSavedSnapshot(value, "b", value.key)).toBeNull();
    expect(readSavedSnapshot(value, "a", "other-date")).toBeNull();
    expect(readSavedSnapshot(value, "", value.key)).toBeNull();
  });
  it("rejects old schemas and corrupt envelopes", () => {
    const value = savedSnapshot("a", "tasks", []);
    expect(readSavedSnapshot({ ...value, schemaVersion: 0 }, "a", "tasks")).toBeNull();
    expect(readSavedSnapshot({ ...value, savedAt: "bad" }, "a", "tasks")).toBeNull();
    expect(readSavedSnapshot(null, "a", "tasks")).toBeNull();
  });
  it("updates surviving ids in place, appends new ids and removes confirmed absent ids", () => {
    expect(mergeSavedData({ items: [{ id: "a", title: "old" }, { id: "b", title: "b" }] },
      { items: [{ id: "b", title: "new b" }, { id: "a", title: "new a" }, { id: "c", title: "c" }] }).items)
      .toEqual([{ id: "a", title: "new a" }, { id: "b", title: "new b" }, { id: "c", title: "c" }]);
    expect(mergeSavedData([{ id: "a" }], [])).toEqual([]);
  });
  it("labels successful refresh time without animation", () => {
    expect(snapshotUpdatedLabel("2026-10-15T00:00:00Z", Date.parse("2026-10-15T00:00:01Z"))).toBe("Updated just now");
    expect(snapshotUpdatedLabel("2026-10-15T00:00:00Z", Date.parse("2026-10-15T00:02:00Z"))).toBe("Updated 2m ago");
  });
  it.each([false, true])('preserves actionable status precedence with hideFreshLabel=%s', hideFreshLabel => {
    const now = Date.parse('2026-10-15T00:02:00Z');
    const props = { savedAt: '2026-10-15T00:00:00Z', error: null, hideFreshLabel };
    expect(snapshotStatusLabel(props, now)).toBe(hideFreshLabel ? '' : 'Updated 2m ago');
    expect(snapshotStatusLabel({ ...props, refreshing: true }, now)).toBe('Syncing…');
    expect(snapshotStatusLabel({ ...props, error: 'offline', refreshing: true }, now)).toBe("Couldn't refresh · Retry · Updated 2m ago");
    expect(snapshotStatusLabel({ ...props, error: 'offline', refreshing: true, updateAvailable: true }, now)).toBe('Updated — tap to refresh');
    expect(snapshotStatusLabel({ ...props, savedAt: null }, now)).toBe('');
    expect(snapshotStatusLabel({ ...props, savedAt: null, error: 'offline' }, now)).toBe("Couldn't refresh · Retry");
  });
  it('keeps the default idle label without opting in', () => {
    expect(snapshotStatusLabel({ savedAt: '2026-10-15T00:00:00Z', error: null }, Date.parse('2026-10-15T00:02:00Z'))).toBe('Updated 2m ago');
  });
});
