import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The native module cannot load under Node; tests get an inert stand-in.
    alias: { "expo-haptics": path.resolve(__dirname, "src/testSupport/expoHapticsStub.ts") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
