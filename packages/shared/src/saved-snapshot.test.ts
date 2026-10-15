import { describe, expect, it } from "vitest";
import { mergeSavedData, readSavedSnapshot, savedSnapshot, snapshotUpdatedLabel } from "./saved-snapshot";

describe("saved snapshots", () => {
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
});
