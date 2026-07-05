import assert from "node:assert/strict";
import test from "node:test";

import {
  parseEnvContent,
  resolveCanvasLiveCredentials,
  summarizeEnvironment,
} from "./phase5a-live-canvas-validation.mjs";

test("parseEnvContent handles simple quoted values without printing them", () => {
  assert.deepEqual(
    parseEnvContent(`
      CANVAS_BASE_URL="https://canvas.test"
      CANVAS_ACCESS_TOKEN='token-a'
      # ignored comment
    `),
    {
      CANVAS_BASE_URL: "https://canvas.test",
      CANVAS_ACCESS_TOKEN: "token-a",
    },
  );
});

test("resolveCanvasLiveCredentials prefers live aliases over legacy names", () => {
  const resolved = resolveCanvasLiveCredentials({
    CANVAS_LIVE_BASE_URL: "https://live.canvas.test",
    CANVAS_BASE_URL: "https://legacy.canvas.test",
    CANVAS_LIVE_PERSONAL_ACCESS_TOKEN: "live-token",
    CANVAS_ACCESS_TOKEN: "legacy-token",
    CANVAS_PERSONAL_ACCESS_TOKEN: "local-token",
  });

  assert.equal(resolved.baseUrl, "https://live.canvas.test");
  assert.equal(resolved.baseUrlSource, "CANVAS_LIVE_BASE_URL");
  assert.equal(resolved.personalAccessToken, "live-token");
  assert.equal(
    resolved.personalAccessTokenSource,
    "CANVAS_LIVE_PERSONAL_ACCESS_TOKEN",
  );
});

test("resolveCanvasLiveCredentials accepts requested older aliases", () => {
  const resolved = resolveCanvasLiveCredentials({
    CANVAS_BASE_URL: "https://legacy.canvas.test",
    CANVAS_ACCESS_TOKEN: "legacy-token",
  });

  assert.equal(resolved.baseUrl, "https://legacy.canvas.test");
  assert.equal(resolved.baseUrlSource, "CANVAS_BASE_URL");
  assert.equal(resolved.personalAccessToken, "legacy-token");
  assert.equal(resolved.personalAccessTokenSource, "CANVAS_ACCESS_TOKEN");
});

test("resolveCanvasLiveCredentials accepts existing local token alias for validation only", () => {
  const resolved = resolveCanvasLiveCredentials({
    CANVAS_BASE_URL: "https://legacy.canvas.test",
    CANVAS_PERSONAL_ACCESS_TOKEN: "local-token",
  });

  assert.equal(resolved.personalAccessToken, "local-token");
  assert.equal(
    resolved.personalAccessTokenSource,
    "CANVAS_PERSONAL_ACCESS_TOKEN",
  );
});

test("summarizeEnvironment reports presence only", () => {
  const summary = summarizeEnvironment({
    CANVAS_BASE_URL: "https://canvas.test",
    SUPABASE_PROJECT_REF: "project-ref",
    SUPABASE_ACCESS_TOKEN: "token",
    SUPABASE_DB_PASSWORD: "password",
    DIRECT_URL: "postgres://example",
  });

  assert.equal(summary.CANVAS_BASE_URL, "present");
  assert.equal(summary.CANVAS_ACCESS_TOKEN, "missing");
  assert.equal(summary.SUPABASE_PROJECT_REF, "present");
  assert.equal(summary["DATABASE_URL or equivalent"], "present");
});
