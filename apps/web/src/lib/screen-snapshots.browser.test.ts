import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type * as Snapshots from "./screen-snapshots";

declare global { interface Window { snapshotStore: typeof Snapshots } }
let browser: Browser, page: Page, server: Server;
const compile = (path: string) => ts.transpileModule(readFileSync(resolve(path), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
beforeAll(async () => {
  server = createServer((_request, response) => { response.writeHead(200, { "Content-Type": "text/html" }); response.end("<!doctype html><title>Local snapshot tests</title>"); });
  await new Promise<void>(yes => server.listen(0, "127.0.0.1", yes));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("local_test_server");
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto(`http://127.0.0.1:${address.port}`);
  const shared = compile("../../packages/shared/src/saved-snapshot.ts"), store = compile("src/lib/screen-snapshots.ts");
  await page.evaluate(({ shared, store }) => {
    const sharedExports: Record<string, unknown> = {};
    new Function("exports", shared)(sharedExports);
    const exports: Record<string, unknown> = {};
    new Function("require", "exports", store)(() => sharedExports, exports);
    window.snapshotStore = exports as typeof Snapshots;
  }, { shared, store });
});
afterAll(async () => { await browser?.close(); await new Promise<void>(yes => server ? server.close(() => yes()) : yes()); });
describe("real browser IndexedDB snapshots (local only)", () => {
  it("persists exact-owner data across database transactions", async () => {
    expect(await page.evaluate(async () => {
      const store = window.snapshotStore;
      await store.writeScreenSnapshot("a", "today", { items: ["Saved"] }, store.snapshotEpoch("a"));
      return (await store.readScreenSnapshot("a", "today"))?.data;
    })).toEqual({ items: ["Saved"] });
  });
  it("rejects another owner and schema/key mismatches", async () => {
    expect(await page.evaluate(async () => {
      const store = window.snapshotStore;
      const db = await new Promise<IDBDatabase>(yes => { const request = indexedDB.open("stay-focused-screen-snapshots", 1); request.onsuccess = () => yes(request.result); });
      await new Promise<void>(yes => {
        const tx = db.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").put({ ownerUserId: "a", key: "old", schemaVersion: 0, savedAt: new Date().toISOString(), data: ["old"] }, JSON.stringify(["a", "old"]));
        tx.objectStore("snapshots").put({ ownerUserId: "b", key: "wrong", schemaVersion: 1, savedAt: new Date().toISOString(), data: ["b"] }, JSON.stringify(["a", "wrong"]));
        tx.oncomplete = () => yes();
      });
      db.close();
      return [await store.readScreenSnapshot("b", "today"), await store.readScreenSnapshot("a", "old"), await store.readScreenSnapshot("a", "wrong")];
    })).toEqual([null, null, null]);
  });
  it("purges sign-out rows and fences old writes while retaining the second owner", async () => {
    expect(await page.evaluate(async () => {
      const store = window.snapshotStore, epoch = store.snapshotEpoch("a");
      await store.writeScreenSnapshot("b", "today", { items: [] }, store.snapshotEpoch("b"));
      await store.purgeScreenSnapshots("a");
      await store.writeScreenSnapshot("a", "late", ["late"], epoch);
      return [await store.readScreenSnapshot("a", "today"), await store.readScreenSnapshot("a", "late"), (await store.readScreenSnapshot("b", "today"))?.data];
    })).toEqual([null, null, { items: [] }]);
  });
  it("falls back silently when IndexedDB throws", async () => {
    const offline = await browser.newPage();
    await offline.goto(page.url());
    const shared = compile("../../packages/shared/src/saved-snapshot.ts"), store = compile("src/lib/screen-snapshots.ts");
    expect(await offline.evaluate(async ({ shared, store }) => {
      Object.defineProperty(window, "indexedDB", { get() { throw new Error("private mode"); } });
      const sharedExports: Record<string, unknown> = {}, exports: Record<string, unknown> = {};
      new Function("exports", shared)(sharedExports);
      new Function("require", "exports", store)(() => sharedExports, exports);
      const snapshots = exports as typeof Snapshots;
      await snapshots.writeScreenSnapshot("a", "k", [], 0);
      await snapshots.purgeScreenSnapshots("a");
      return await snapshots.readScreenSnapshot("a", "k");
    }, { shared, store })).toBeNull();
    await offline.close();
  });
});
