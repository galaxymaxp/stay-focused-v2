import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next preserves JSX for its compiler; Vitest needs executable JSX in Node.
  oxc: { jsx: { runtime: "automatic" } },
  // Browser fixtures run software WebGL and throttled CPU/network scenarios.
  // Match CI's serial worker limit so they do not compete for the same GPU/CPU.
  test: { environment: "node", include: ["src/**/*.test.ts"], restoreMocks: true, maxWorkers: 1 },
});
