import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  assertSafeSessionPath,
  buildAuthRequiredMessage,
  createNpmInvocation,
  decideServiceStartup,
  extractVisibleResultCounts,
  isCompatibleApiHealthPayload,
  isStayFocusedExpoPage,
  parseArgs,
  parseHeaderList,
  redactSensitive,
  readSmokeCredentialState,
  selectAuthenticationMode,
  shouldStopService,
  validateCorsPreflightResponse,
} from "./reviewer-web-smoke.mjs";

test("parseArgs accepts documented flags", () => {
  assert.deepEqual(
    parseArgs(["--headed", "--keep-services", "--reset-session"]),
    {
      headed: true,
      help: false,
      keepServices: true,
      resetSession: true,
    },
  );
});

test("parseArgs supports help without enabling other behavior", () => {
  assert.equal(parseArgs(["--help"]).help, true);
});

test("parseArgs rejects unknown flags", () => {
  assert.throws(() => parseArgs(["--verbose"]), {
    code: "INVALID_ARGUMENT",
  });
});

test("selectAuthenticationMode prefers a valid persisted session", () => {
  assert.deepEqual(
    selectAuthenticationMode({
      hasCredentials: true,
      hasValidSession: true,
    }),
    {
      mode: "persisted-session",
      status: "ready",
    },
  );
});

test("selectAuthenticationMode falls back to configured credentials", () => {
  assert.deepEqual(
    selectAuthenticationMode({
      hasCredentials: true,
      hasValidSession: false,
    }),
    {
      mode: "configured-credentials",
      status: "sign-in",
    },
  );
});

test("selectAuthenticationMode returns AUTH_REQUIRED without session or credentials", () => {
  assert.deepEqual(
    selectAuthenticationMode({
      hasCredentials: false,
      hasValidSession: false,
    }),
    {
      code: "AUTH_REQUIRED",
      mode: "auth-required",
      status: "blocked",
    },
  );
});

test("readSmokeCredentialState detects complete credentials without exposing values", () => {
  assert.deepEqual(
    readSmokeCredentialState({
      SMOKE_TEST_EMAIL: " smoke@example.test ",
      SMOKE_TEST_PASSWORD: "secret",
    }),
    {
      credentials: {
        email: "smoke@example.test",
        password: "secret",
      },
      status: "complete",
    },
  );
});

test("readSmokeCredentialState detects incomplete credentials", () => {
  assert.deepEqual(
    readSmokeCredentialState({ SMOKE_TEST_EMAIL: "smoke@example.test" }),
    {
      code: "SMOKE_CREDENTIALS_INCOMPLETE",
      status: "incomplete",
    },
  );
  assert.deepEqual(
    readSmokeCredentialState({ SMOKE_TEST_PASSWORD: "secret" }),
    {
      code: "SMOKE_CREDENTIALS_INCOMPLETE",
      status: "incomplete",
    },
  );
});

test("readSmokeCredentialState reports missing credentials", () => {
  assert.deepEqual(readSmokeCredentialState({}), { status: "missing" });
});

test("decideServiceStartup reuses, starts, or blocks incompatible ports", () => {
  assert.equal(
    decideServiceStartup({ healthOk: true, portOpen: true }),
    "reuse",
  );
  assert.equal(
    decideServiceStartup({ healthOk: false, portOpen: false }),
    "start",
  );
  assert.equal(
    decideServiceStartup({ healthOk: false, portOpen: true }),
    "incompatible",
  );
});

test("createNpmInvocation prefers npm_execpath without a shell", () => {
  assert.deepEqual(
    createNpmInvocation(["run", "web"], { npm_execpath: "npm-cli.js" }),
    {
      args: ["npm-cli.js", "run", "web"],
      command: process.execPath,
      shell: false,
    },
  );
});

test("shouldStopService only stops runner-owned services without keep-services", () => {
  assert.equal(
    shouldStopService({ keepServices: false, started: true }),
    true,
  );
  assert.equal(
    shouldStopService({ keepServices: true, started: true }),
    false,
  );
  assert.equal(
    shouldStopService({ keepServices: false, started: false }),
    false,
  );
});

test("assertSafeSessionPath allows only the dedicated smoke profile", () => {
  const root = process.cwd();
  assert.equal(
    assertSafeSessionPath(".local/smoke/reviewer-web", root),
    path.join(root, ".local", "smoke", "reviewer-web"),
  );
  assert.throws(() => assertSafeSessionPath(".local/smoke", root), {
    code: "UNSAFE_SESSION_PATH",
  });
  assert.throws(() => assertSafeSessionPath("apps/mobile", root), {
    code: "UNSAFE_SESSION_PATH",
  });
});

test("redactSensitive removes auth material from diagnostics", () => {
  const sensitiveValue = "redactable-value";
  const redacted = redactSensitive(
    `Authorization: Bearer ${sensitiveValue} access_token="${sensitiveValue}" refresh_token=${sensitiveValue} SMOKE_TEST_PASSWORD=${sensitiveValue} password:"${sensitiveValue}"`,
  );

  assert.match(redacted, /Authorization: Bearer \[REDACTED\]/);
  assert.match(redacted, /access_token="\[REDACTED\]"/);
  assert.match(redacted, /refresh_token=\[REDACTED\]/);
  assert.match(redacted, /SMOKE_TEST_PASSWORD=\[REDACTED\]/);
  assert.match(redacted, /password:"\[REDACTED\]"/);
  assert.doesNotMatch(redacted, new RegExp(sensitiveValue));
});

test("extractVisibleResultCounts reads section and key-point summaries", () => {
  assert.deepEqual(
    extractVisibleResultCounts(
      "Reviewer Ready\n1 section\n3 cards - 9 key points\nKey points",
    ),
    {
      sectionCount: 1,
      visibleKeyPointCount: 9,
    },
  );
});

test("buildAuthRequiredMessage names variables without values", () => {
  const message = buildAuthRequiredMessage();

  assert.match(message, /SMOKE_TEST_EMAIL/);
  assert.match(message, /SMOKE_TEST_PASSWORD/);
  assert.doesNotMatch(message, /=/);
});

test("isCompatibleApiHealthPayload requires the Stay Focused V2 payload", () => {
  assert.equal(
    isCompatibleApiHealthPayload({ status: "ok", version: "2.0.0" }),
    true,
  );
  assert.equal(
    isCompatibleApiHealthPayload({ status: "ok", version: "1.0.0" }),
    false,
  );
  assert.equal(isCompatibleApiHealthPayload({ status: "ok" }), false);
  assert.equal(isCompatibleApiHealthPayload("ok"), false);
});

test("isStayFocusedExpoPage recognizes the app title", () => {
  assert.equal(
    isStayFocusedExpoPage("<html><title>Stay Focused V2</title></html>"),
    true,
  );
  assert.equal(isStayFocusedExpoPage("<html><title>Other</title></html>"), false);
});

test("parseHeaderList parses comma-separated header values case-insensitively", () => {
  assert.deepEqual(parseHeaderList(" POST, OPTIONS "), ["post", "options"]);
  assert.deepEqual(parseHeaderList("authorization, Content-Type"), [
    "authorization",
    "content-type",
  ]);
});

test("validateCorsPreflightResponse accepts the browser-shaped local preflight", () => {
  assert.deepEqual(
    validateCorsPreflightResponse({
      expectedOrigin: "http://localhost:8081",
      headers: {
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "OPTIONS, POST",
        "Access-Control-Allow-Origin": "http://localhost:8081",
      },
      status: 204,
    }),
    {
      invalidHeaders: [],
      missingHeaders: [],
      ok: true,
      status: 204,
    },
  );
});

test("validateCorsPreflightResponse reports missing CORS headers", () => {
  const result = validateCorsPreflightResponse({
    expectedOrigin: "http://localhost:8081",
    headers: {},
    status: 204,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingHeaders, [
    "access-control-allow-origin",
    "access-control-allow-methods",
    "access-control-allow-headers",
  ]);
});

test("validateCorsPreflightResponse rejects incorrect and wildcard origins", () => {
  const incorrect = validateCorsPreflightResponse({
    expectedOrigin: "http://localhost:8081",
    headers: {
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-origin": "http://127.0.0.1:8081",
    },
    status: 204,
  });
  const wildcard = validateCorsPreflightResponse({
    expectedOrigin: "http://localhost:8081",
    headers: {
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-origin": "*",
    },
    status: 204,
  });

  assert.equal(incorrect.ok, false);
  assert.match(
    incorrect.invalidHeaders.join(","),
    /access-control-allow-origin/,
  );
  assert.equal(wildcard.ok, false);
  assert.match(wildcard.invalidHeaders.join(","), /access-control-allow-origin/);
});

test("validateCorsPreflightResponse rejects missing requested method and headers", () => {
  const result = validateCorsPreflightResponse({
    expectedOrigin: "http://localhost:8081",
    headers: {
      "access-control-allow-headers": "x-test",
      "access-control-allow-methods": "GET",
      "access-control-allow-origin": "http://localhost:8081",
    },
    status: 200,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidHeaders, [
    "status",
    "access-control-allow-methods:post",
    "access-control-allow-methods:options",
    "access-control-allow-headers:authorization",
    "access-control-allow-headers:content-type",
  ]);
});
