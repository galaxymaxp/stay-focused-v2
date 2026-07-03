#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");

export const API_BASE_URL = "http://localhost:3000";
export const API_HEALTH_URL = `${API_BASE_URL}/api/health`;
export const EXPO_WEB_URL = "http://localhost:8081";
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

    context = await launchPersistentBrowser(options);
    const smokeResult = await runBrowserSmoke(context);

    printSuccess({
      apiOwnership,
      expoOwnership,
      ...smokeResult,
    });
  } catch (error) {
    const failure = toSmokeFailure(error, {
      apiOwnership,
      expoOwnership,
    });
    printFailure(failure);
    process.exitCode = failure.code === "AUTH_REQUIRED" ? 2 : 1;
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }

    await cleanupStartedServices(startedServices, options);
  }
}

async function ensureApiService() {
  const healthOk = await isHttpOk(API_HEALTH_URL);
  const portOpen = healthOk || (await isTcpPortOpen(API_PORT));
  const decision = decideServiceStartup({ healthOk, portOpen });

  if (decision === "reuse") {
    return { ownership: "reused", service: null };
  }

  if (decision === "incompatible") {
    throw new SmokeFailure(
      "api-startup",
      "API_PORT_IN_USE",
      `Port ${API_PORT} is occupied, but ${API_HEALTH_URL} is not healthy.`,
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
    healthCheck: () => isHttpOk(API_HEALTH_URL),
    service,
    step: "api-startup",
    timeoutCode: "API_HEALTH_TIMEOUT",
    timeoutMs: SERVICE_READY_TIMEOUT_MS,
    timeoutMessage: `Timed out waiting for ${API_HEALTH_URL}.`,
  });

  return { ownership: "started", service };
}

async function ensureExpoWebService() {
  const reachable = await isHttpReachable(EXPO_WEB_URL);
  const portOpen = reachable || (await isTcpPortOpen(EXPO_PORT));
  const decision = decideServiceStartup({
    healthOk: reachable,
    portOpen,
  });

  if (decision === "reuse") {
    return { ownership: "reused", service: null };
  }

  if (decision === "incompatible") {
    throw new SmokeFailure(
      "expo-startup",
      "EXPO_PORT_IN_USE",
      `Port ${EXPO_PORT} is occupied, but ${EXPO_WEB_URL} is not reachable as Expo Web.`,
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
    healthCheck: () => isHttpReachable(EXPO_WEB_URL),
    service,
    step: "expo-startup",
    timeoutCode: "EXPO_WEB_TIMEOUT",
    timeoutMs: SERVICE_READY_TIMEOUT_MS,
    timeoutMessage: `Timed out waiting for ${EXPO_WEB_URL}.`,
  });

  return { ownership: "started", service };
}

function startManagedService(name, npmArgs, envOverrides = {}) {
  const child = spawn(npmCommand(), npmArgs, {
    cwd: ROOT_DIR,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      ...envOverrides,
      FORCE_COLOR: "0",
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

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
        "SERVICE_EXITED",
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

  const credentials = readSmokeCredentials(process.env);
  const authSelection = selectAuthenticationMode({
    hasCredentials: Boolean(credentials),
    hasValidSession: false,
  });

  if (authSelection.status === "blocked") {
    throw new SmokeFailure(
      "authentication",
      "AUTH_REQUIRED",
      buildAuthRequiredMessage(),
    );
  }

  await signInWithCredentials(page, credentials);
  const signedInState = await waitForAuthState(page);
  if (signedInState !== "authenticated") {
    throw new SmokeFailure(
      "authentication",
      "AUTH_FAILED",
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
    "AUTH_STATE_TIMEOUT",
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
      "REVIEWER_HTTP_ERROR",
      `Reviewer POST returned HTTP ${status}.`,
      { status },
    );
  }

  await verifyNoForbiddenResultErrors(page);

  const bodyText = await page.locator("body").innerText();
  const { sectionCount, visibleKeyPointCount } =
    extractVisibleResultCounts(bodyText);

  if (sectionCount < 1) {
    throw new SmokeFailure(
      "result-validation",
      "NO_SECTIONS_VISIBLE",
      "Reviewer Ready rendered, but no visible section count was found.",
      { status },
    );
  }

  if (visibleKeyPointCount < 1) {
    throw new SmokeFailure(
      "result-validation",
      "NO_KEY_POINTS_VISIBLE",
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
    "REVIEWER_RESULT_TIMEOUT",
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

function readSmokeCredentials(env) {
  const email = env.SMOKE_TEST_EMAIL?.trim();
  const password = env.SMOKE_TEST_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

async function resetSessionDir() {
  const resolvedSessionDir = path.resolve(SESSION_DIR);
  const allowedPrefix = path.resolve(ROOT_DIR, ".local", "smoke");

  if (
    resolvedSessionDir !== path.join(allowedPrefix, "reviewer-web") ||
    !resolvedSessionDir.startsWith(`${allowedPrefix}${path.sep}`)
  ) {
    throw new SmokeFailure(
      "session-reset",
      "UNSAFE_SESSION_PATH",
      "Refusing to remove an unexpected smoke session path.",
    );
  }

  await fs.rm(resolvedSessionDir, { force: true, recursive: true });
}

async function cleanupStartedServices(startedServices, options) {
  for (const service of startedServices.reverse()) {
    if (
      shouldStopService({
        keepServices: options.keepServices,
        started: Boolean(service),
      })
    ) {
      await stopManagedService(service);
    }
  }
}

async function stopManagedService(service) {
  if (!service.child.pid || service.exit) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/pid", String(service.child.pid), "/T", "/F"],
        {
          stdio: "ignore",
        },
      );
      killer.once("exit", resolve);
      killer.once("error", resolve);
    });
    return;
  }

  try {
    process.kill(-service.child.pid, "SIGTERM");
  } catch {
    return;
  }

  await Promise.race([
    onceExit(service.child),
    delay(5_000).then(() => {
      try {
        process.kill(-service.child.pid, "SIGKILL");
      } catch {}
    }),
  ]);
}

function onceExit(child) {
  return new Promise((resolve) => {
    child.once("exit", resolve);
  });
}

async function isHttpOk(url) {
  const response = await fetchWithTimeout(url, 2_000);
  return Boolean(response?.ok);
}

async function isHttpReachable(url) {
  const response = await fetchWithTimeout(url, 2_000);
  return Boolean(response && response.status < 500);
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      cache: "no-store",
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

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function printSuccess(result) {
  console.log("PASS reviewer-web smoke");
  console.log(`API: reachable (${result.apiOwnership})`);
  console.log(`Expo Web: reachable (${result.expoOwnership})`);
  console.log(`Authentication: ${result.authenticationMode}`);
  console.log(
    `Reviewer response: rendered${
      result.reviewerStatus ? ` (HTTP ${result.reviewerStatus})` : ""
    }`,
  );
  console.log(`Sections: ${result.sectionCount}`);
  console.log(`Visible key points: ${result.visibleKeyPointCount}`);
}

function printFailure(failure) {
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
