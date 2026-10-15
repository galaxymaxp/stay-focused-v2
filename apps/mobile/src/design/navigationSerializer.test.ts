import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInThisContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Serializer = (state: unknown, options: unknown) => string;

// Load the actual CommonJS serializer and its installed dependencies. Only bypass
// the native barrel (which initializes React Native under Node), using its real
// standalone validator instead. Mocking expo-router hid the APK startup failure.
function loadSerializer(): Serializer {
  const require = createRequire(import.meta.url);
  const routerRoot = path.dirname(require.resolve("expo-router/package.json"));
  const load = (filename: string): Record<string, unknown> => {
    const localRequire = createRequire(filename);
    const module = { exports: {} as Record<string, unknown> };
    const resolve = (id: string): unknown => {
      if (id === "../react-navigation/native") {
        return localRequire(path.join(routerRoot, "build/react-navigation/core/validatePathConfig.js"));
      }
      if (id === "./getPathFromState-forks") return load(localRequire.resolve(id));
      return localRequire(id);
    };
    const evaluate = runInThisContext(
      `(function(require, module, exports) { ${readFileSync(filename, "utf8")}\n})`,
      { filename },
    ) as (require: typeof resolve, loadedModule: { exports: Record<string, unknown> }, exports: Record<string, unknown>) => void;
    evaluate(resolve, module, module.exports);
    return module.exports;
  };
  return load(path.join(routerRoot, "build/fork/getPathFromState.js")).getPathFromState as Serializer;
}

describe("installed Expo Router navigation serializer", () => {
  it("builds a tab link with query parameters without a native startup exception", () => {
    const serialize = loadSerializer();
    expect(serialize(
      { routes: [{ name: "today", params: { filter: "in progress" } }] },
      { screens: { today: "today" } },
    )).toBe("/today?filter=in%20progress");
  });

  it("preserves nested reviewer links and encoded source identifiers", () => {
    const serialize = loadSerializer();
    expect(serialize(
      { routes: [{ name: "app", state: { routes: [{ name: "reviewer", params: { id: "source/one", page: 2 } }] } }] },
      { screens: { app: { path: "", screens: { reviewer: "reviewer/:id" } } } },
    )).toBe("/reviewer/source%2Fone?page=2");
  });
});
