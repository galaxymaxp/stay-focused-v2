#!/usr/bin/env node
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");

export const API_BASE_URL = "http://localhost:3000";
export const API_HEALTH_URL = `${API_BASE_URL}/api/health`;
export const EXPO_WEB_URL = "http://localhost:8081";
export const REVIEWER_GENERATE_URL = `${API_BASE_URL}/api/reviewer/generate`;
export const SESSION_DIR = path.join(
  ROOT_DIR,
  ".local",
  "smoke",
  "reviewer-web",
);
const USER_DATA_DIR = path.join(SESSION_DIR, "browser-profile");

export const SMOKE_SOURCE_TITLE = "Pretend OCR Sample - Study Habits";
export const SMOKE_SOURCE_TEXT = [
  "Pretend OCR Sample - Study Habits",
  "",
  "Mira writes one clear goal at the top of her notebook before each study block. The goal is small enough to finish, such as explaining one idea or solving three practice questions.",
  "",
  "She studies in short focused sessions. A timer helps her work for twenty minutes, then she takes a five minute break to stretch, drink water, and reset her attention.",
  "",
  "Before the timer starts, Mira removes distractions. She closes unused tabs, puts her phone across the room, and keeps only the notes and practice page she needs.",
  "",
  "After each session, she reviews her notes and marks the parts that still feel confusing. She rewrites one sentence in her own words so the idea is easier to remember.",
  "",
  "At the end, Mira checks understanding by answering a quick question without looking. If she cannot explain the answer, she adds that topic to the next study goal.",
].join("\n");

const API_PORT = 3000;
const EXPO_PORT = 8081;
const SERVICE_READY_TIMEOUT_MS = 90_000;
const PAGE_READY_TIMEOUT_MS = 60_000;
const REVIEWER_RESULT_TIMEOUT_MS = 180_000;
const EXPECTED_HEALTH_STATUS = "ok";
const EXPECTED_HEALTH_VERSION = "2.0.0";
const execFileAsync = promisify(execFile);

const AUTH_ERROR_TEXTS = [
  "Sign in to continue",
  "The email or password is incorrect.",
  "Confirm this email address before signing in.",
];

const REVIEWER_ERROR_STATES = [
  {
    code: "NETWORK_ERROR_VISIBLE",
    title: "Could not reach the API",
  },
  {
    code: "CONFIGURATION_ERROR_VISIBLE",
    title: "API address needs setup",
  },
  {
    code: "AUTHENTICATION_ERROR_VISIBLE",
    title: "Login session expired",
  },
  {
    code: "REVIEWER_VALIDATION_FAILED_VISIBLE",
    title: "Reviewer needs a clearer source",
  },
  {
    code: "SESSION_CHECK_FAILED_VISIBLE",
    title: "Session check failed",
  },
  {
    code: "REVIEWER_GENERATION_FAILED_VISIBLE",
    title: "Reviewer generation failed",
  },
];

const FORBIDDEN_RESULT_NEEDLES = [
  {
    code: "NETWORK_ERROR_VISIBLE",
    needle: "network_error",
  },
  {
    code: "CONFIGURATION_ERROR_VISIBLE",
    needle: "provider_configuration_error",
  },
  {
    code: "AUTHENTICATION_ERROR_VISIBLE",
    needle: "unauthorized",
  },
  {
    code: "REVIEWER_VALIDATION_FAILED_VISIBLE",
    needle: "reviewer_validation_failed",
  },
];

class SmokeFailure extends Error {
  constructor(step, code, message, details = {}) {
    super(message);
    this.name = "SmokeFailure";
    this.step = step;
    this.code = code;
    this.status = details.status;
    this.apiOwnership = details.apiOwnership;
    this.expoOwnership = details.expoOwnership;
    this.details = details;
    this.cause = details.cause;
  }
}

export function parseArgs(argv) {
  const options = {
    headed: false,
    help: false,
    keepServices: false,
    resetSession: false,
  };

  for (const arg of argv) {
    switch (arg) {
      case "--headed":
        options.headed = true;
        break;
      case "--help":
        options.help = true;
        break;
      case "--keep-services":
        options.keepServices = true;
        break;
      case "--reset-session":
        options.resetSession = true;
        break;
      default: {
        const error = new Error(`Unknown option: ${arg}`);
        error.code = "INVALID_ARGUMENT";
        throw error;
      }
    }
  }

  return options;
}

export function decideServiceStartup({ healthOk, portOpen }) {
  if (healthOk) {
    return "reuse";
  }

  if (portOpen) {
    return "incompatible";
  }

  return "start";
}

export function isCompatibleApiHealthPayload(payload) {
  return (
    isRecord(payload) &&
    payload.status === EXPECTED_HEALTH_STATUS &&
    payload.version === EXPECTED_HEALTH_VERSION
  );
}

export function isStayFocusedExpoPage(content) {
  return /<title>\s*Stay Focused V2\s*<\/title>/i.test(content);
}

export function shouldStopService({ started, keepServices }) {
  return Boolean(started && !keepServices);
}

export function selectAuthenticationMode({ hasValidSession, hasCredentials }) {
  if (hasValidSession) {
    return {
      mode: "persisted-session",
      status: "ready",
    };
  }

  if (hasCredentials) {
    return {
      mode: "configured-credentials",
      status: "sign-in",
    };
  }

  return {
    code: "AUTH_REQUIRED",
    mode: "auth-required",
    status: "blocked",
  };
}

export function readSmokeCredentialState(env) {
  const email = env.SMOKE_TEST_EMAIL?.trim();
  const password = env.SMOKE_TEST_PASSWORD;
  const hasEmail = Boolean(email);
  const hasPassword = Boolean(password);

  if (hasEmail && hasPassword) {
    return {
      credentials: { email, password },
      status: "complete",
    };
  }

  if (hasEmail || hasPassword) {
    return {
      code: "SMOKE_CREDENTIALS_INCOMPLETE",
      status: "incomplete",
    };
  }

  return { status: "missing" };
}

export function redactSensitive(value) {
  return String(value)
    .replace(
      /(Authorization\s*:\s*Bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /(access_token|refresh_token|id_token|cookie)(["'\s:=]+)([^"'\s,}]+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(
      /(SMOKE_TEST_PASSWORD\s*=\s*)([^\s]+)/gi,
      "$1[REDACTED]",
    )
    .replace(/(password["']?\s*[:=]\s*["']?)([^"',}\s]+)/gi, "$1[REDACTED]");
}

export function parseHeaderList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getHeaderValue(headers, name) {
  if (typeof headers?.get === "function") {
    return headers.get(name);
  }

  const requestedName = name.toLowerCase();
  const match = Object.entries(headers ?? {}).find(
    ([headerName]) => headerName.toLowerCase() === requestedName,
  );

  return match ? String(match[1]) : null;
}

export function validateCorsPreflightResponse({
  expectedOrigin,
  headers,
  status,
}) {
  const missingHeaders = [];
  const invalidHeaders = [];

  if (status !== 204) {
    invalidHeaders.push("status");
  }

  const allowOrigin = getHeaderValue(headers, "access-control-allow-origin");
  const allowMethods = getHeaderValue(headers, "access-control-allow-methods");
  const allowHeaders = getHeaderValue(headers, "access-control-allow-headers");

  if (!allowOrigin) {
    missingHeaders.push("access-control-allow-origin");
  } else if (allowOrigin !== expectedOrigin || allowOrigin === "*") {
    invalidHeaders.push("access-control-allow-origin");
  }

  const methods = parseHeaderList(allowMethods);
  if (!allowMethods) {
    missingHeaders.push("access-control-allow-methods");
  } else {
    if (!methods.includes("post")) {
      invalidHeaders.push("access-control-allow-methods:post");
    }
    if (!methods.includes("options")) {
      invalidHeaders.push("access-control-allow-methods:options");
    }
  }

  const requestHeaders = parseHeaderList(allowHeaders);
  if (!allowHeaders) {
    missingHeaders.push("access-control-allow-headers");
  } else {
    if (!requestHeaders.includes("authorization")) {
      invalidHeaders.push("access-control-allow-headers:authorization");
    }
    if (!requestHeaders.includes("content-type")) {
      invalidHeaders.push("access-control-allow-headers:content-type");
    }
  }

  return {
    invalidHeaders,
    missingHeaders,
    ok: missingHeaders.length === 0 && invalidHeaders.length === 0,
    status,
  };
}

export function assertSafeSessionPath(sessionDir, rootDir = ROOT_DIR) {
  const resolvedSessionDir = path.resolve(sessionDir);
  const expectedSessionDir = path.resolve(
    rootDir,
    ".local",
    "smoke",
    "reviewer-web",
  );

  if (resolvedSessionDir !== expectedSessionDir) {
    const error = new Error("Refusing to remove an unexpected smoke session path.");
    error.code = "UNSAFE_SESSION_PATH";
    throw error;
  }

  return resolvedSessionDir;
}

export function extractVisibleResultCounts(text) {
  const sectionMatches = [...text.matchAll(/\b(\d+)\s+sections?\b/gi)];
  const keyPointMatches = [...text.matchAll(/\b(\d+)\s+key points?\b/gi)];

  const sectionCount =
    sectionMatches.length > 0
      ? Math.max(...sectionMatches.map((match) => Number(match[1])))
      : 0;
  const visibleKeyPointCount = keyPointMatches.reduce(
    (total, match) => total + Number(match[1]),
    0,
  );

  return {
    sectionCount,
    visibleKeyPointCount,
  };
}

export function buildAuthRequiredMessage() {
  return [
    "No valid persisted smoke browser session was found.",
    "Sign in once with npm run smoke:reviewer:web -- --headed, or set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD for credential mode.",
  ].join(" ");
}

function printUsage() {
  console.log(`Usage: npm run smoke:reviewer:web -- [options]

Runs the local Expo Web reviewer smoke against ${EXPO_WEB_URL} and ${API_HEALTH_URL}.

Options:
  --headed          Open the Playwright browser visibly.
  --keep-services   Leave services started by this runner running.
  --reset-session   Remove only the ignored local smoke browser state before running.
  --help            Print this help without starting services or reading credentials.

Authentication order:
  1. Reuse the persisted browser session at .local/smoke/reviewer-web/.
  2. Sign in with SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD if both are set.
  3. Stop with AUTH_REQUIRED and print setup instructions.`);
}

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error("FAIL reviewer-web smoke");
    console.error("Failed step: cli");
    console.error(`Code: ${error.code ?? "INVALID_ARGUMENT"}`);
    console.error(redactSensitive(error.message));
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    printUsage();
    return;
  }

  const startedServices = [];
  let apiOwnership = "unknown";
  let expoOwnership = "unknown";
  let context = null;
  let cleanupResult = { kept: 0, stopped: 0, succeeded: true };
  let pendingFailure = null;
  const removeSignalHandlers = installTerminationHandlers(startedServices, () =>
    options,
  );

  try {
    if (options.resetSession) {
      await resetSessionDir();
      console.log("Smoke browser session reset: .local/smoke/reviewer-web/");
    }

    const api = await ensureApiService();
    apiOwnership = api.ownership;
    if (api.service) {
      startedServices.push(api.service);
    }

    const expo = await ensureExpoWebService();
    expoOwnership = expo.ownership;
    if (expo.service) {
      startedServices.push(expo.service);
    }

    await ensureReviewerCorsPreflight({
      apiOwnership,
      expoOrigin: EXPO_WEB_URL,
      expoOwnership,
    });

    context = await launchPersistentBrowser(options);
    const smokeResult = await runBrowserSmoke(context);

    await printSuccess({
      apiOwnership,
      expoOwnership,
      ...smokeResult,
    });
  } catch (error) {
    pendingFailure = toSmokeFailure(error, {
      apiOwnership,
      expoOwnership,
    });
    process.exitCode = pendingFailure.code === "AUTH_REQUIRED" ? 2 : 1;
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }

    cleanupResult = await cleanupStartedServices(startedServices, options);
    removeSignalHandlers();
    if (pendingFailure) {
      printFailure(pendingFailure, cleanupResult);
    }
  }
}

async function ensureApiService() {
  const health = await checkApiHealth();
  const portOpen = health.reachable || (await isTcpPortOpen(API_PORT));
  const decision = decideServiceStartup({ healthOk: health.ok, portOpen });

  if (decision === "reuse") {
    return { ownership: "reused", service: null };
  }

  if (decision === "incompatible") {
    throw new SmokeFailure(
      "api-startup",
      "API_PORT_IN_USE",
      `Port ${API_PORT} is occupied, but ${API_HEALTH_URL} did not return the expected Stay Focused V2 health payload.`,
      {
        healthMatched: health.matched,
        healthReachable: health.reachable,
        status: health.status,
      },
    );
  }

  const service = startManagedService("API", [
    "run",
    "dev",
    "--workspace",
    "apps/api",
    "--",
    "--port",
    String(API_PORT),
  ]);

  await waitForServiceReadiness({
    healthCheck: async () => (await checkApiHealth()).ok,
    exitCode: "API_START_FAILED",
    service,
    step: "api-startup",
    timeoutCode: "API_START_FAILED",
    timeoutMs: SERVICE_READY_TIMEOUT_MS,
    timeoutMessage: `Timed out waiting for ${API_HEALTH_URL}.`,
  });

  return { ownership: "started", service };
}

async function ensureExpoWebService() {
  const expo = await checkExpoWebCompatibility(EXPO_WEB_URL);
  const portOpen = expo.reachable || (await isTcpPortOpen(EXPO_PORT));
  const decision = decideServiceStartup({
    healthOk: expo.ok,
    portOpen,
  });

  if (decision === "reuse") {
    return { ownership: "reused", service: null };
  }

  if (decision === "incompatible") {
    throw new SmokeFailure(
      "expo-startup",
      "EXPO_PORT_IN_USE",
      `Port ${EXPO_PORT} is occupied, but ${EXPO_WEB_URL} did not look like the Stay Focused Expo Web app.`,
      {
        expoMatched: expo.matched,
        status: expo.status,
      },
    );
  }

  const service = startManagedService(
    "Expo Web",
    [
      "run",
      "web",
      "--workspace",
      "apps/mobile",
      "--",
      "--port",
      String(EXPO_PORT),
      "--clear",
    ],
    {
      BROWSER: "none",
      EXPO_NO_TELEMETRY: "1",
      EXPO_PUBLIC_API_BASE_URL: API_BASE_URL,
    },
  );

  await waitForServiceReadiness({
    healthCheck: async () => (await checkExpoWebCompatibility(EXPO_WEB_URL)).ok,
    exitCode: "EXPO_START_FAILED",
    service,
    step: "expo-startup",
    timeoutCode: "EXPO_NOT_READY",
    timeoutMs: SERVICE_READY_TIMEOUT_MS,
    timeoutMessage: `Timed out waiting for ${EXPO_WEB_URL}.`,
  });

  return { ownership: "started", service };
}

async function ensureReviewerCorsPreflight({
  apiOwnership,
  expoOrigin,
  expoOwnership,
}) {
  const result = await checkReviewerCorsPreflight({
    apiBaseUrl: API_BASE_URL,
    expoOrigin,
  });

  if (!result.ok) {
    throw new SmokeFailure(
      "cors-preflight",
      "CORS_PREFLIGHT_FAILED",
      [
        `Reviewer preflight failed for ${REVIEWER_GENERATE_URL}.`,
        `Missing: ${result.missingHeaders.join(", ") || "none"}.`,
        `Invalid: ${result.invalidHeaders.join(", ") || "none"}.`,
      ].join(" "),
      {
        apiOwnership,
        expoOrigin,
        expoOwnership,
        missingHeaders: result.missingHeaders,
        invalidHeaders: result.invalidHeaders,
        status: result.status,
      },
    );
  }

  return result;
}

async function checkReviewerCorsPreflight({ apiBaseUrl, expoOrigin }) {
  const response = await fetchWithTimeout(
    `${apiBaseUrl}/api/reviewer/generate`,
    5_000,
    {
      headers: {
        "Access-Control-Request-Headers": "authorization, content-type",
        "Access-Control-Request-Method": "POST",
        Origin: expoOrigin,
      },
      method: "OPTIONS",
    },
  );

  if (!response) {
    return {
      invalidHeaders: ["request"],
      missingHeaders: [],
      ok: false,
      status: undefined,
    };
  }

  return validateCorsPreflightResponse({
    expectedOrigin: expoOrigin,
    headers: response.headers,
    status: response.status,
  });
}

function startManagedService(name, npmArgs, envOverrides = {}) {
  const npm = createNpmInvocation(npmArgs);
  let child;

  try {
    child = spawn(npm.command, npm.args, {
      cwd: ROOT_DIR,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        ...envOverrides,
        FORCE_COLOR: "0",
      },
      shell: npm.shell,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    throw new SmokeFailure(
      name === "API" ? "api-startup" : "expo-startup",
      name === "API" ? "API_START_FAILED" : "EXPO_START_FAILED",
      `${name} could not be started by the smoke runner.`,
      { cause: error },
    );
  }

  const service = {
    child,
    exit: null,
    name,
    stderr: "",
    stdout: "",
  };

  child.stdout?.on("data", (chunk) => {
    service.stdout = appendLog(service.stdout, chunk);
  });
  child.stderr?.on("data", (chunk) => {
    service.stderr = appendLog(service.stderr, chunk);
  });
  child.once("exit", (code, signal) => {
    service.exit = { code, signal };
  });

  return service;
}

function appendLog(current, chunk) {
  const next = current + redactSensitive(chunk.toString("utf8"));
  return next.length > 8_000 ? next.slice(-8_000) : next;
}

async function waitForServiceReadiness({
  exitCode,
  healthCheck,
  service,
  step,
  timeoutCode,
  timeoutMs,
  timeoutMessage,
}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (service.exit) {
      throw new SmokeFailure(
        step,
        exitCode,
        `${service.name} exited before it became ready.`,
      );
    }

    if (await healthCheck()) {
      return;
    }

    await delay(1_000);
  }

  throw new SmokeFailure(step, timeoutCode, timeoutMessage);
}

async function launchPersistentBrowser(options) {
  await fs.mkdir(SESSION_DIR, { recursive: true });

  try {
    return await chromium.launchPersistentContext(USER_DATA_DIR, {
      colorScheme: "light",
      headless: !options.headed,
      viewport: { height: 900, width: 1280 },
    });
  } catch (error) {
    throw new SmokeFailure(
      "browser-launch",
      "BROWSER_UNAVAILABLE",
      "Playwright Chromium could not be launched. Run npm install, then npx playwright install chromium if the browser binary is missing.",
      { cause: error },
    );
  }
}

async function runBrowserSmoke(context) {
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(15_000);

  await page.goto(EXPO_WEB_URL, {
    timeout: PAGE_READY_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  const auth = await ensureAuthenticated(page);
  const reviewer = await generateReviewerThroughUi(page);

  return {
    authenticationMode: auth.mode,
    reviewerStatus: reviewer.status,
    sectionCount: reviewer.sectionCount,
    visibleKeyPointCount: reviewer.visibleKeyPointCount,
  };
}

async function ensureAuthenticated(page) {
  const state = await waitForAuthState(page);

  if (state === "authenticated") {
    return selectAuthenticationMode({
      hasCredentials: false,
      hasValidSession: true,
    });
  }

  const credentialState = readSmokeCredentialState(process.env);
  if (credentialState.status === "incomplete") {
    throw new SmokeFailure(
      "authentication",
      "SMOKE_CREDENTIALS_INCOMPLETE",
      "Set both SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD, or unset both to use persisted-session detection.",
    );
  }

  const authSelection = selectAuthenticationMode({
    hasCredentials: credentialState.status === "complete",
    hasValidSession: false,
  });

  if (authSelection.status === "blocked") {
    throw new SmokeFailure(
      "authentication",
      "AUTH_REQUIRED",
      buildAuthRequiredMessage(),
    );
  }

  await signInWithCredentials(page, credentialState.credentials);
  const signedInState = await waitForAuthState(page);
  if (signedInState !== "authenticated") {
    throw new SmokeFailure(
      "authentication",
      "AUTHENTICATION_FAILED",
      "Configured smoke credentials did not reach the reviewer screen.",
    );
  }

  return authSelection;
}

async function waitForAuthState(page) {
  const deadline = Date.now() + PAGE_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isVisibleText(page, "Reviewer generator")) {
      return "authenticated";
    }

    for (const text of AUTH_ERROR_TEXTS) {
      if (await isVisibleText(page, text)) {
        return "login";
      }
    }

    await delay(500);
  }

  throw new SmokeFailure(
    "authentication",
    "SMOKE_TIMEOUT",
    "Timed out waiting for either the reviewer screen or the sign-in screen.",
  );
}

async function signInWithCredentials(page, credentials) {
  if (!credentials) {
    throw new SmokeFailure(
      "authentication",
      "AUTH_REQUIRED",
      buildAuthRequiredMessage(),
    );
  }

  await fillByPlaceholder(page, "you@example.com", credentials.email);
  await fillByPlaceholder(page, "Password", credentials.password);
  await clickButton(page, "Sign in");
}

async function generateReviewerThroughUi(page) {
  await fillByPlaceholder(page, "Optional title", SMOKE_SOURCE_TITLE);
  await fillByPlaceholder(
    page,
    "Paste notes, readings, or lecture text here.",
    SMOKE_SOURCE_TEXT,
  );

  const reviewerResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes("/api/reviewer/generate") &&
        response.request().method() === "POST",
      { timeout: REVIEWER_RESULT_TIMEOUT_MS },
    )
    .catch(() => null);

  await clickButton(page, "Generate reviewer");
  await waitForReviewerResult(page);

  const reviewerResponse = await Promise.race([
    reviewerResponsePromise,
    delay(1_000).then(() => null),
  ]);
  const status = reviewerResponse?.status();
  if (status !== undefined && status >= 400) {
    throw new SmokeFailure(
      "reviewer-post",
      "REVIEWER_POST_FAILED",
      `Reviewer POST returned HTTP ${status}.`,
      { status },
    );
  }

  if (!reviewerResponse) {
    throw new SmokeFailure(
      "reviewer-post",
      "REVIEWER_POST_FAILED",
      "Reviewer result rendered, but the reviewer POST response was not observed.",
    );
  }

  await verifyNoForbiddenResultErrors(page);

  const bodyText = await page.locator("body").innerText();
  const { sectionCount, visibleKeyPointCount } =
    extractVisibleResultCounts(bodyText);

  if (sectionCount < 1) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered, but no visible section count was found.",
      { status },
    );
  }

  if (visibleKeyPointCount < 1) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered, but no visible key-point count was found.",
      { status },
    );
  }

  return {
    sectionCount,
    status,
    visibleKeyPointCount,
  };
}

async function waitForReviewerResult(page) {
  const deadline = Date.now() + REVIEWER_RESULT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isVisibleText(page, "Reviewer Ready")) {
      return;
    }

    for (const state of REVIEWER_ERROR_STATES) {
      if (await isVisibleText(page, state.title)) {
        throw new SmokeFailure(
          "reviewer-ui",
          state.code,
          `The UI showed "${state.title}".`,
        );
      }
    }

    await delay(500);
  }

  throw new SmokeFailure(
    "reviewer-ui",
    "SMOKE_TIMEOUT",
    "Timed out waiting for Reviewer Ready.",
  );
}

async function verifyNoForbiddenResultErrors(page) {
  for (const state of REVIEWER_ERROR_STATES) {
    if (await isVisibleText(page, state.title)) {
      throw new SmokeFailure(
        "result-validation",
        state.code,
        `The UI showed "${state.title}" after generation.`,
      );
    }
  }

  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const { code, needle } of FORBIDDEN_RESULT_NEEDLES) {
    if (bodyText.includes(needle)) {
      throw new SmokeFailure(
        "result-validation",
        code,
        `The UI included forbidden diagnostic text: ${needle}.`,
      );
    }
  }
}

async function fillByPlaceholder(page, placeholder, value) {
  const field = page.getByPlaceholder(placeholder);
  await field.waitFor({ state: "visible" });
  await field.fill(value);
}

async function clickButton(page, name) {
  const byRole = page.getByRole("button", { name });

  try {
    await byRole.click({ timeout: 5_000 });
    return;
  } catch {
    await page.getByText(name, { exact: true }).click();
  }
}

async function isVisibleText(page, text) {
  return page
    .getByText(text, { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
}

async function resetSessionDir() {
  const resolvedSessionDir = assertSafeSessionPath(SESSION_DIR);
  await fs.rm(resolvedSessionDir, { force: true, recursive: true });
}

async function cleanupStartedServices(startedServices, options) {
  const result = { kept: 0, stopped: 0, succeeded: true };

  for (const service of startedServices.reverse()) {
    if (
      shouldStopService({
        keepServices: options.keepServices,
        started: Boolean(service),
      })
    ) {
      const stopped = await stopManagedService(service);
      result.stopped += stopped ? 1 : 0;
      result.succeeded = result.succeeded && stopped;
    } else {
      result.kept += 1;
    }
  }

  return result;
}

async function stopManagedService(service) {
  if (!service.child.pid || service.exit) {
    return true;
  }

  if (process.platform === "win32") {
    return await new Promise((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/pid", String(service.child.pid), "/T", "/F"],
        {
          stdio: "ignore",
        },
      );
      killer.once("exit", (code) => resolve(code === 0));
      killer.once("error", () => resolve(false));
    });
  }

  try {
    process.kill(-service.child.pid, "SIGTERM");
  } catch {
    return false;
  }

  await Promise.race([
    onceExit(service.child),
    delay(5_000).then(() => {
      try {
        process.kill(-service.child.pid, "SIGKILL");
      } catch {}
    }),
  ]);
  return true;
}

function onceExit(child) {
  return new Promise((resolve) => {
    child.once("exit", resolve);
  });
}

async function checkApiHealth() {
  const response = await fetchWithTimeout(API_HEALTH_URL, 2_000);

  if (!response) {
    return { matched: false, ok: false, reachable: false };
  }

  let payload = null;
  try {
    payload = JSON.parse(await response.text());
  } catch {}

  const matched = response.ok && isCompatibleApiHealthPayload(payload);
  return {
    matched,
    ok: matched,
    reachable: true,
    status: response.status,
  };
}

async function checkExpoWebCompatibility(url) {
  const response = await fetchWithTimeout(url, 2_000);

  if (!response) {
    return { matched: false, ok: false, reachable: false };
  }

  const text = await response.text().catch(() => "");
  const matched = response.status < 500 && isStayFocusedExpoPage(text);

  return {
    matched,
    ok: matched,
    reachable: true,
    status: response.status,
  };
}

async function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      cache: "no-store",
      ...options,
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isTcpPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(1_000);
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

export function createNpmInvocation(npmArgs, env = process.env) {
  if (env.npm_execpath) {
    return {
      args: [env.npm_execpath, ...npmArgs],
      command: process.execPath,
      shell: false,
    };
  }

  return {
    args: npmArgs,
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    shell: process.platform === "win32",
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function installTerminationHandlers(startedServices, getOptions) {
  const handler = async () => {
    await cleanupStartedServices(startedServices, getOptions() ?? {});
    process.exit(130);
  };

  process.once("SIGINT", handler);
  process.once("SIGTERM", handler);

  return () => {
    process.removeListener("SIGINT", handler);
    process.removeListener("SIGTERM", handler);
  };
}

function toSmokeFailure(error, ownership) {
  if (error instanceof SmokeFailure) {
    error.apiOwnership ??= ownership.apiOwnership;
    error.expoOwnership ??= ownership.expoOwnership;
    return error;
  }

  return new SmokeFailure(
    "unknown",
    "UNEXPECTED_ERROR",
    redactSensitive(error?.message ?? String(error)),
    ownership,
  );
}

async function getLocalHeadShort() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: ROOT_DIR,
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

async function printSuccess(result) {
  console.log("PASS reviewer-web smoke");
  console.log(`Local HEAD: ${await getLocalHeadShort()}`);
  console.log(`API: ${result.apiOwnership}`);
  console.log("API health: passed");
  console.log("CORS preflight: passed");
  console.log(`Expo Web: ${result.expoOwnership}`);
  console.log(`Expo URL: ${EXPO_WEB_URL}`);
  console.log(`Authentication: ${result.authenticationMode}`);
  console.log(`Reviewer POST: ${result.reviewerStatus}`);
  console.log("Reviewer response: rendered");
  console.log(`Sections: ${result.sectionCount}`);
  console.log(`Visible key points: ${result.visibleKeyPointCount}`);
}

function printFailure(failure, cleanupResult) {
  console.error(
    failure.code === "AUTH_REQUIRED"
      ? "AUTH_REQUIRED reviewer-web smoke"
      : "FAIL reviewer-web smoke",
  );
  console.error(`Failed step: ${failure.step}`);
  console.error(`Code: ${failure.code}`);

  if (failure.status !== undefined) {
    console.error(`HTTP status: ${failure.status}`);
  }

  console.error(`API: ${API_BASE_URL} (${failure.apiOwnership ?? "unknown"})`);
  console.error(
    `Expo Web: ${EXPO_WEB_URL} (${failure.expoOwnership ?? "unknown"})`,
  );
  if (failure.details?.expoOrigin) {
    console.error(`Expo origin: ${failure.details.expoOrigin}`);
  }
  if (failure.details?.missingHeaders) {
    console.error(
      `Missing headers: ${failure.details.missingHeaders.join(", ") || "none"}`,
    );
  }
  if (failure.details?.invalidHeaders) {
    console.error(
      `Invalid headers: ${failure.details.invalidHeaders.join(", ") || "none"}`,
    );
  }
  if (failure.details?.healthMatched !== undefined) {
    console.error(`Health matched expected app: ${failure.details.healthMatched}`);
  }
  if (failure.details?.expoMatched !== undefined) {
    console.error(`Expo matched expected app: ${failure.details.expoMatched}`);
  }
  console.error(
    `Cleanup: ${cleanupResult.succeeded ? "succeeded" : "failed"} (${cleanupResult.stopped} stopped, ${cleanupResult.kept} kept)`,
  );
  console.error(redactSensitive(failure.message));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("FAIL reviewer-web smoke");
    console.error("Failed step: fatal");
    console.error("Code: UNEXPECTED_ERROR");
    console.error(redactSensitive(error?.message ?? String(error)));
    process.exitCode = 1;
  });
}
