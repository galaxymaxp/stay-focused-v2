import { afterEach, describe, expect, it } from "vitest";
import { createLocalArtifactStore } from "./artifactStore";
import { openNodeSqlite } from "./localLibrary.testSupport";
import { migrateLocalLibrary } from "./schema";

const close: (() => void)[] = [];
afterEach(() => { close.splice(0).forEach(fn => fn()); });
async function setup() {
  const handle = openNodeSqlite(); close.push(handle.close);
  await migrateLocalLibrary(handle.db);
  return { ...handle, store: createLocalArtifactStore(handle.db) };
}
describe("device screen snapshots", () => {
  it("scopes response DTOs by owner and query, including successful empty responses", async () => {
    const { store } = await setup();
    await store.saveScreenSnapshot("a", "today:date:zone", { items: [] });
    expect((await store.readScreenSnapshot("a", "today:date:zone"))?.data).toEqual({ items: [] });
    expect(await store.readScreenSnapshot("b", "today:date:zone")).toBeNull();
    expect(await store.readScreenSnapshot("a", "today:other-date:zone")).toBeNull();
  });
  it("rejects corrupt, wrong-owner and old-schema envelopes", async () => {
    const { raw, store } = await setup();
    for (const data of ['broken', JSON.stringify({ ownerUserId: "b", key: "k", schemaVersion: 1, savedAt: new Date().toISOString(), data: [] }), JSON.stringify({ ownerUserId: "a", key: "k", schemaVersion: 0, savedAt: new Date().toISOString(), data: [] })]) {
      raw.prepare("INSERT OR REPLACE INTO screen_snapshots VALUES (?, ?, ?)").run("a", "k", data);
      expect(await store.readScreenSnapshot("a", "k")).toBeNull();
    }
  });
  it("purges only the signing-out owner through the existing Library purge", async () => {
    const { store } = await setup();
    await store.saveScreenSnapshot("a", "k", ["private a"]);
    await store.saveScreenSnapshot("b", "k", ["private b"]);
    await store.purgeOwner("a");
    expect(await store.readScreenSnapshot("a", "k")).toBeNull();
    expect((await store.readScreenSnapshot("b", "k"))?.data).toEqual(["private b"]);
  });
});
