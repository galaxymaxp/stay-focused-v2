import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

// The app must probe the same native module that the installed GLView loads.
// A stale probe silently selects the book fallback on GL-capable devices.
describe("GenerationCore native GL compatibility", () => {
  it("checks the module required by the installed expo-gl before loading the orb", () => {
    const require = createRequire(import.meta.url);
    const glRoot = dirname(require.resolve("expo-gl/package.json"));
    const glView = readFileSync(join(glRoot, "src/GLView.tsx"), "utf8");
    const nativeName = glView.match(/requireNativeModule\('([^']+)'\)/)?.[1];
    expect(nativeName).toBeTruthy();
    const core = readFileSync(new URL("./GenerationCore.tsx", import.meta.url), "utf8");
    expect(core).toContain(`requireOptionalNativeModule("${nativeName}")`);
    expect(core).toContain("if (!glAvailable) return null;");
  });
});
