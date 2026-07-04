import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SmokeFailure,
  appendLog,
  assertSafeApiDevOutputPath,
  assertSafeSessionPath,
  buildAuthRequiredMessage,
  buildServiceDiagnostics,
  classifyAuthenticationDiagnostics,
  createNpmInvocation,
  decideServiceStartup,
  extractVisibleResultCounts,
  getWindowsProcessTreeKillArgs,
  isCompatibleApiHealthPayload,
  isStayFocusedExpoPage,
  isTcpPortOpen,
  mergeSmokeCredentialSources,
  parseArgs,
  parseHeaderList,
  parseSmokeEnvFileContent,
  redactSensitive,
  readSmokeCredentialState,
  removeApiDevServerAppOutput,
  sanitizeDiagnostics,
  selectAuthenticationMode,
  shouldStopService,
  validateCorsPreflightResponse,
  validateReviewerInspection,
  waitForServiceReadiness,
  waitForTcpPortClosed,
} from "./reviewer-web-smoke.mjs";

test("parseArgs accepts documented flags", () => {
  assert.deepEqual(
    parseArgs(["--headed", "--keep-services", "--reset-session", "--session-only"]),
    {
      headed: true,
      help: false,
      keepServices: true,
      resetSession: true,
      sessionOnly: true,
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
      credentialState: { status: "READY" },
      hasValidSession: true,
    }),
    {
      mode: "persisted-session",
      status: "READY",
    },
  );
});

test("selectAuthenticationMode falls back to configured credentials", () => {
  assert.deepEqual(
    selectAuthenticationMode({
      credentialState: { status: "READY" },
      hasValidSession: false,
    }),
    {
      mode: "configured-credentials",
      status: "READY",
    },
  );
});

test("selectAuthenticationMode returns AUTH_REQUIRED without session or credentials", () => {
  assert.deepEqual(
    selectAuthenticationMode({
      credentialState: { status: "ABSENT" },
      hasValidSession: false,
    }),
    {
      code: "AUTH_REQUIRED",
      mode: "auth-required",
      status: "ABSENT",
    },
  );
});

test("readSmokeCredentialState detects READY credentials without exposing source values", () => {
  assert.deepEqual(
    readSmokeCredentialState(
      {
        SMOKE_TEST_EMAIL: " smoke@example.test ",
        SMOKE_TEST_PASSWORD: "secret",
      },
      { emailSource: "process-env", passwordSource: "process-env" },
    ),
    {
      credentials: {
        email: "smoke@example.test",
        password: "secret",
      },
      source: "process-env",
      sources: {
        emailSource: "process-env",
        passwordSource: "process-env",
      },
      status: "READY",
    },
  );
});

test("readSmokeCredentialState detects INCOMPLETE credentials", () => {
  assert.deepEqual(
    readSmokeCredentialState(
      { SMOKE_TEST_EMAIL: "smoke@example.test" },
      { emailSource: "process-env", passwordSource: "missing" },
    ),
    {
      code: "SMOKE_CREDENTIALS_INCOMPLETE",
      source: "process-env",
      sources: {
        emailSource: "process-env",
        passwordSource: "missing",
      },
      status: "INCOMPLETE",
    },
  );
  assert.equal(
    readSmokeCredentialState({ SMOKE_TEST_PASSWORD: "secret" }).status,
    "INCOMPLETE",
  );
});

test("readSmokeCredentialState reports ABSENT credentials", () => {
  assert.equal(readSmokeCredentialState({}).status, "ABSENT");
});

test("parseSmokeEnvFileContent reads only smoke credential variables", () => {
  assert.deepEqual(
    parseSmokeEnvFileContent(`
      # local smoke credentials
      SMOKE_TEST_EMAIL=local@example.test
      SMOKE_TEST_PASSWORD="local secret"
      OTHER_VALUE=ignored
    `),
    {
      SMOKE_TEST_EMAIL: "local@example.test",
      SMOKE_TEST_PASSWORD: "local secret",
    },
  );
});

test("mergeSmokeCredentialSources gives process environment precedence", () => {
  const state = mergeSmokeCredentialSources({
    localEnv: {
      SMOKE_TEST_EMAIL: "local@example.test",
      SMOKE_TEST_PASSWORD: "local-secret",
    },
    processEnv: {
      SMOKE_TEST_EMAIL: "process@example.test",
      SMOKE_TEST_PASSWORD: "process-secret",
    },
  });

  assert.equal(state.status, "READY");
  assert.equal(state.source, "process-env");
  assert.equal(state.credentials.email, "process@example.test");
  assert.equal(state.credentials.password, "process-secret");
});

test("mergeSmokeCredentialSources falls back to .env.smoke.local", () => {
  const state = mergeSmokeCredentialSources({
    localEnv: {
      SMOKE_TEST_EMAIL: "local@example.test",
      SMOKE_TEST_PASSWORD: "local-secret",
    },
    processEnv: {},
  });

  assert.equal(state.status, "READY");
  assert.equal(state.source, ".env.smoke.local");
  assert.equal(state.credentials.email, "local@example.test");
});

test("mergeSmokeCredentialSources can combine process and local values without leaking them", () => {
  const state = mergeSmokeCredentialSources({
    localEnv: { SMOKE_TEST_PASSWORD: "local-secret" },
    processEnv: { SMOKE_TEST_EMAIL: "process@example.test" },
  });

  assert.equal(state.status, "READY");
  assert.equal(state.source, "mixed");
  assert.deepEqual(state.sources, {
    emailSource: "process-env",
    passwordSource: ".env.smoke.local",
  });
});

test("mergeSmokeCredentialSources ignores credentials in session-only mode", () => {
  assert.deepEqual(
    mergeSmokeCredentialSources({
      localEnv: {
        SMOKE_TEST_EMAIL: "local@example.test",
        SMOKE_TEST_PASSWORD: "local-secret",
      },
      processEnv: {
        SMOKE_TEST_EMAIL: "process@example.test",
        SMOKE_TEST_PASSWORD: "process-secret",
      },
      sessionOnly: true,
    }),
    {
      credentials: null,
      source: "ignored-session-only",
      status: "ABSENT",
    },
  );
});

test("credential values are not included in sanitized diagnostics", () => {
  const diagnostics = sanitizeDiagnostics(
    {
      email: "smoke@example.test",
      message:
        "SMOKE_TEST_EMAIL=smoke@example.test SMOKE_TEST_PASSWORD=secret Bearer abc.def",
      password: "secret",
    },
    ["smoke@example.test", "secret", "abc.def"],
  );

  const serialized = JSON.stringify(diagnostics);
  assert.doesNotMatch(serialized, /smoke@example\.test/);
  assert.doesNotMatch(serialized, /secret/);
  assert.doesNotMatch(serialized, /abc\.def/);
});

test("classifyAuthenticationDiagnostics reports missing form and fields", () => {
  assert.equal(
    classifyAuthenticationDiagnostics({
      selectors: {
        emailFound: false,
        formFound: false,
        passwordFound: false,
        submitFound: false,
      },
    }),
    "AUTH_FORM_NOT_FOUND",
  );
  assert.equal(
    classifyAuthenticationDiagnostics({
      selectors: {
        emailFound: false,
        formFound: true,
        passwordFound: true,
        submitFound: true,
      },
    }),
    "AUTH_EMAIL_INPUT_NOT_FOUND",
  );
  assert.equal(
    classifyAuthenticationDiagnostics({
      selectors: {
        emailFound: true,
        formFound: true,
        passwordFound: false,
        submitFound: true,
      },
    }),
    "AUTH_PASSWORD_INPUT_NOT_FOUND",
  );
  assert.equal(
    classifyAuthenticationDiagnostics({
      selectors: {
        emailFound: true,
        formFound: true,
        passwordFound: true,
        submitFound: false,
      },
    }),
    "AUTH_SUBMIT_NOT_FOUND",
  );
});

test("classifyAuthenticationDiagnostics reports disabled submit", () => {
  assert.equal(
    classifyAuthenticationDiagnostics({
      selectors: completeAuthSelectors(),
      submitEnabled: false,
    }),
    "AUTH_SUBMIT_DISABLED",
  );
});

test("classifyAuthenticationDiagnostics reports auth request not sent", () => {
  assert.equal(
    classifyAuthenticationDiagnostics({
      authRequest: { occurred: false },
      reviewerScreenAppeared: false,
      selectors: completeAuthSelectors(),
      submitClicked: true,
      submitEnabled: true,
    }),
    "AUTH_REQUEST_NOT_SENT",
  );
});

test("classifyAuthenticationDiagnostics reports rejected auth request", () => {
  assert.equal(
    classifyAuthenticationDiagnostics({
      authRequest: { occurred: true, status: 400 },
      reviewerScreenAppeared: false,
      selectors: completeAuthSelectors(),
      submitClicked: true,
      submitEnabled: true,
    }),
    "AUTH_REQUEST_REJECTED",
  );
  assert.equal(
    classifyAuthenticationDiagnostics({
      authRequest: { failureCategory: "net", occurred: true },
      reviewerScreenAppeared: false,
      selectors: completeAuthSelectors(),
      submitClicked: true,
      submitEnabled: true,
    }),
    "AUTH_REQUEST_REJECTED",
  );
});

test("classifyAuthenticationDiagnostics reports visible auth UI error", () => {
  assert.equal(
    classifyAuthenticationDiagnostics({
      authRequest: { occurred: true, status: 200 },
      reviewerScreenAppeared: false,
      selectors: completeAuthSelectors(),
      submitClicked: true,
      submitEnabled: true,
      visibleErrorText: "The email or password is incorrect.",
    }),
    "AUTH_UI_ERROR",
  );
});

test("classifyAuthenticationDiagnostics reports navigation timeout after submit", () => {
  assert.equal(
    classifyAuthenticationDiagnostics({
      authRequest: { occurred: true, status: 200 },
      reviewerScreenAppeared: false,
      selectors: completeAuthSelectors(),
      submitClicked: true,
      submitEnabled: true,
    }),
    "AUTH_NAVIGATION_TIMEOUT",
  );
});

test("classifyAuthenticationDiagnostics reports reviewer screen not found before submit", () => {
  assert.equal(
    classifyAuthenticationDiagnostics({
      authRequest: { occurred: false },
      reviewerScreenAppeared: false,
      selectors: completeAuthSelectors(),
      submitClicked: false,
      submitEnabled: true,
    }),
    "AUTH_REVIEWER_SCREEN_NOT_FOUND",
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

test("getWindowsProcessTreeKillArgs targets one owned process tree", () => {
  assert.deepEqual(getWindowsProcessTreeKillArgs(1234), [
    "/pid",
    "1234",
    "/T",
    "/F",
  ]);
});

test("waitForServiceReadiness reports API exit before binding with safe diagnostics", async () => {
  const service = fakeService({
    exit: { code: 1, signal: null },
    stderr: appendLog("", "SMOKE_TEST_PASSWORD=secret\nfatal startup error"),
  });

  await assert.rejects(
    () =>
      waitForServiceReadiness({
        exitCode: "API_PROCESS_EXITED",
        healthCheck: async () => false,
        pollIntervalMs: 1,
        service,
        startCode: "API_START_FAILED",
        step: "api-startup",
        timeoutCode: "API_HEALTH_TIMEOUT",
        timeoutMs: 50,
        timeoutMessage: "timeout",
      }),
    (error) => {
      assert.equal(error instanceof SmokeFailure, true);
      assert.equal(error.code, "API_PROCESS_EXITED");
      assert.equal(error.apiOwnership, "started-then-exited");
      assert.equal(error.details.serviceDiagnostics.state, "started-then-exited");
      assert.equal(error.details.serviceDiagnostics.exitCode, 1);
      assert.equal(error.details.serviceDiagnostics.portEverBound, false);
      assert.match(error.details.serviceDiagnostics.stderr, /fatal startup error/);
      assert.doesNotMatch(
        JSON.stringify(error.details.serviceDiagnostics),
        /secret/,
      );
      return true;
    },
  );
});

test("waitForServiceReadiness reports API exit after binding before health", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const service = fakeService({
    exit: { code: 1, signal: null },
    port,
    stderr: "closed after listen",
  });

  try {
    await assert.rejects(
      () =>
        waitForServiceReadiness({
          exitCode: "API_PROCESS_EXITED",
          healthCheck: async () => false,
          pollIntervalMs: 1,
          service,
          startCode: "API_START_FAILED",
          step: "api-startup",
          timeoutCode: "API_HEALTH_TIMEOUT",
          timeoutMs: 50,
          timeoutMessage: "timeout",
        }),
      (error) => {
        assert.equal(error instanceof SmokeFailure, true);
        assert.equal(error.code, "API_PROCESS_EXITED");
        assert.equal(error.details.serviceDiagnostics.portEverBound, true);
        assert.equal(error.details.serviceDiagnostics.healthAttempted, false);
        return true;
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("buildServiceDiagnostics summarizes safe stdout and stderr tails", () => {
  const diagnostics = buildServiceDiagnostics(
    fakeService({
      exit: { code: 1, signal: null },
      healthAttempted: true,
      portEverBound: true,
      state: "started-then-exited",
      stderr: appendLog("", "Bearer token-value\nline 2\nline 3"),
      stdout: Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join(
        "\n",
      ),
    }),
  );

  assert.equal(diagnostics.state, "started-then-exited");
  assert.equal(diagnostics.healthAttempted, true);
  assert.equal(diagnostics.portEverBound, true);
  assert.match(diagnostics.stderr, /Bearer \[REDACTED\]/);
  assert.doesNotMatch(JSON.stringify(diagnostics), /token-value/);
  assert.match(diagnostics.stdout, /line 20/);
  assert.doesNotMatch(diagnostics.stdout, /line 1\n/);
});

test("waitForTcpPortClosed observes release after a server closes", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  assert.equal(await isTcpPortOpen(port), true);
  assert.equal(await waitForTcpPortClosed(port, 100), false);

  await new Promise((resolve) => server.close(resolve));
  assert.equal(await waitForTcpPortClosed(port, 2_000), true);
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

test("assertSafeApiDevOutputPath allows only generated API server output", () => {
  const root = process.cwd();
  assert.equal(
    assertSafeApiDevOutputPath("apps/api/.next/server", root),
    path.join(root, "apps", "api", ".next", "server"),
  );
  assert.throws(() => assertSafeApiDevOutputPath("apps/api/.next", root), {
    code: "UNSAFE_API_DEV_OUTPUT_PATH",
  });
  assert.throws(() => assertSafeApiDevOutputPath("apps/api/src", root), {
    code: "UNSAFE_API_DEV_OUTPUT_PATH",
  });
});

test("removeApiDevServerAppOutput removes only the generated server output directory", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "reviewer-web-smoke-"),
  );
  const target = path.join(root, "apps", "api", ".next", "server");
  const sibling = path.join(root, "apps", "api", ".next", "cache");

  try {
    await fs.mkdir(path.join(target, "app"), { recursive: true });
    await fs.mkdir(sibling, { recursive: true });
    await fs.writeFile(path.join(target, "app", "route.js"), "generated", "utf8");
    await fs.writeFile(path.join(target, "edge-runtime-webpack.js"), "generated", "utf8");
    await fs.writeFile(path.join(sibling, "keep.txt"), "cache", "utf8");

    const result = await removeApiDevServerAppOutput({ rootDir: root });

    assert.equal(result.removed, true);
    assert.equal(await exists(target), false);
    assert.equal(await exists(path.join(sibling, "keep.txt")), true);
  } finally {
    await fs.rm(root, { force: true, recursive: true });
  }
});

test("redactSensitive removes auth material from diagnostics", () => {
  const sensitiveValue = "redactable-value";
  const redacted = redactSensitive(
    `Authorization: Bearer ${sensitiveValue} access_token="${sensitiveValue}" refresh_token=${sensitiveValue} cookie=${sensitiveValue} SMOKE_TEST_EMAIL=${sensitiveValue} SMOKE_TEST_PASSWORD=${sensitiveValue} password:"${sensitiveValue}"`,
    [sensitiveValue],
  );

  assert.match(redacted, /Authorization: \[REDACTED\]/);
  assert.match(redacted, /access_token="\[REDACTED\]"/);
  assert.match(redacted, /refresh_token=\[REDACTED\]/);
  assert.match(redacted, /cookie=\[REDACTED\]/);
  assert.match(redacted, /SMOKE_TEST_EMAIL=\[REDACTED\]/);
  assert.match(redacted, /SMOKE_TEST_PASSWORD=\[REDACTED\]/);
  assert.match(redacted, /password:"\[REDACTED\]"/);
  assert.doesNotMatch(redacted, new RegExp(sensitiveValue));
});

test("redactSensitive does not redact ordinary session wording", () => {
  assert.equal(
    redactSensitive("No valid persisted smoke browser session was found."),
    "No valid persisted smoke browser session was found.",
  );
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

test("buildAuthRequiredMessage has a session-only variant", () => {
  const message = buildAuthRequiredMessage({ sessionOnly: true });

  assert.match(message, /--session-only/);
  assert.doesNotMatch(message, /SMOKE_TEST_PASSWORD/);
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

test("validateReviewerInspection accepts complete rendered reviewer metadata", () => {
  assert.deepEqual(
    validateReviewerInspection({
      cleanOutputText: "Clean output\nPassed",
      coverageText: "Coverage\nPassed",
      explanationTexts: ["A useful explanation."],
      readyVisible: true,
      reviewerPostStatus: 200,
      sectionCount: 1,
      sourceFaithfulText: "Source-faithful\nPassed",
      titleText: "Pretend OCR Sample - Study Habits",
      visibleErrorText: "",
      visibleKeyPointCount: 7,
    }),
    {
      cleanOutputPassed: true,
      coveragePassed: true,
      explanationNonempty: true,
      sectionCount: 1,
      sourceFaithfulPassed: true,
      visibleKeyPointCount: 7,
    },
  );
});

test("validateReviewerInspection rejects missing ready marker", () => {
  assertReviewerInspectionFails(
    {
      readyVisible: false,
    },
    "REVIEWER_PREVIEW_NOT_RENDERED",
  );
});

test("validateReviewerInspection rejects wrong title", () => {
  assertReviewerInspectionFails(
    {
      titleText: "Different title",
    },
    "REVIEWER_PREVIEW_NOT_RENDERED",
  );
});

test("validateReviewerInspection rejects failed validation status", () => {
  assertReviewerInspectionFails(
    {
      sourceFaithfulText: "Source-faithful\nFailed",
    },
    "REVIEWER_PREVIEW_NOT_RENDERED",
  );
});

test("validateReviewerInspection rejects missing sections and key points", () => {
  assertReviewerInspectionFails(
    {
      sectionCount: 0,
    },
    "REVIEWER_PREVIEW_NOT_RENDERED",
  );
  assertReviewerInspectionFails(
    {
      visibleKeyPointCount: 0,
    },
    "REVIEWER_PREVIEW_NOT_RENDERED",
  );
});

test("validateReviewerInspection rejects empty explanations and visible errors", () => {
  assertReviewerInspectionFails(
    {
      explanationTexts: [""],
    },
    "REVIEWER_PREVIEW_NOT_RENDERED",
  );
  assertReviewerInspectionFails(
    {
      visibleErrorText: "Reviewer generation failed",
    },
    "REVIEWER_PREVIEW_NOT_RENDERED",
  );
});

function completeAuthSelectors() {
  return {
    emailFound: true,
    formFound: true,
    passwordFound: true,
    submitFound: true,
  };
}

function baseReviewerInspection(overrides = {}) {
  return {
    cleanOutputText: "Clean output\nPassed",
    coverageText: "Coverage\nPassed",
    explanationTexts: ["A useful explanation."],
    readyVisible: true,
    reviewerPostStatus: 200,
    sectionCount: 1,
    sourceFaithfulText: "Source-faithful\nPassed",
    titleText: "Pretend OCR Sample - Study Habits",
    visibleErrorText: "",
    visibleKeyPointCount: 1,
    ...overrides,
  };
}

function assertReviewerInspectionFails(overrides, code) {
  assert.throws(
    () => validateReviewerInspection(baseReviewerInspection(overrides)),
    (error) => error instanceof SmokeFailure && error.code === code,
  );
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function fakeService(overrides = {}) {
  return {
    args: ["run", "dev", "--workspace", "apps/api"],
    child: { pid: 1234 },
    command: "npm",
    cwd: process.cwd(),
    exit: null,
    healthAttempted: false,
    logPath: path.join(process.cwd(), ".local", "smoke", "api.log"),
    name: "API",
    port: 0,
    portEverBound: false,
    shell: false,
    startError: null,
    startedAt: Date.now() - 25,
    state: "spawned",
    stderr: "",
    stdout: "",
    ...overrides,
  };
}
