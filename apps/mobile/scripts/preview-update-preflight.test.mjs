import assert from "node:assert/strict";
import { test } from "node:test";

import { preflightPreviewUpdate, validPreviewApiBaseUrl } from "./preview-update-preflight.mjs";

test("preview preflight rejects missing and malformed API configuration without printing it", () => {
  for (const value of [undefined, "", "  ", "auto", "https://", "http://api.example.test", "https://user:pass@api.example.test", "https://api.example.test/path"]) {
    assert.equal(validPreviewApiBaseUrl(value), false);
    assert.throws(() => preflightPreviewUpdate(() => value, "https://api.example.test"), (error) => {
      assert.match(error.message, /EXPO_PUBLIC_API_BASE_URL/);
      assert.doesNotMatch(error.message, /user:pass/);
      return true;
    });
  }
});

test("preview preflight accepts a plain HTTPS base URL", () => {
  assert.equal(validPreviewApiBaseUrl("https://api.example.test"), true);
  assert.doesNotThrow(() => preflightPreviewUpdate(() => "https://api.example.test", "https://api.example.test"));
  assert.throws(() => preflightPreviewUpdate(() => "https://wrong.example.test", "https://api.example.test"));
});
