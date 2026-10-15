import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next preserves JSX for its compiler; Vitest needs executable JSX in Node.
  oxc: { jsx: { runtime: "automatic" } },
  test: { environment: "node", include: ["src/**/*.test.ts"], restoreMocks: true },
});
