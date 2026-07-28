import path from "node:path";

import { workflow } from "@workflow/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: path.resolve(__dirname, "workflow-tests"),
  plugins: [
    workflow({
      cwd: path.resolve(__dirname, "workflow-tests"),
      rootDir: ".workflow-test-artifacts",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@stay-focused/canvas": path.resolve(
        __dirname,
        "../../packages/canvas/src/index.ts",
      ),
      "@stay-focused/db": path.resolve(
        __dirname,
        "../../packages/db/src/index.ts",
      ),
      "@stay-focused/engine": path.resolve(
        __dirname,
        "../../packages/engine/src/index.ts",
      ),
      "@stay-focused/ocr": path.resolve(
        __dirname,
        "../../packages/ocr/src/index.ts",
      ),
    },
  },
  test: {
    include: ["**/*.workflow.test.ts"],
    testTimeout: 60_000,
  },
});
