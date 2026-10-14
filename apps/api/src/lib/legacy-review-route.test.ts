import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("legacy /api/review route retirement", () => {
  it("keeps the legacy route module absent", () => {
    const routePath = resolve(__dirname, "../../app/api/review/route.ts");

    expect(existsSync(routePath)).toBe(false);
  });
});
