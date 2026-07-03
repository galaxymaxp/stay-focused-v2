import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthRequiredMessage,
  decideServiceStartup,
  extractVisibleResultCounts,
  parseArgs,
  redactSensitive,
  selectAuthenticationMode,
  shouldStopService,
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
