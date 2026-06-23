import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@stay-focused/engine": path.resolve(
        __dirname,
        "../../packages/engine/src/index.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
    restoreMocks: true,
  },
});
