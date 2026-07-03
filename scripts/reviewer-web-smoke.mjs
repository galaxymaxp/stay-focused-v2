#!/usr/bin/env node
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import { chromium } from "playwright";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const API_WORKSPACE_DIR = path.join(ROOT_DIR, "apps", "api");
const API_DEV_SERVER_APP_DIR = path.join(
  API_WORKSPACE_DIR,
  ".next",
  "server",
  "app",
);

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
export const SMOKE_ENV_FILE = path.join(ROOT_DIR, ".env.smoke.local");

const USER_DATA_DIR = path.join(SESSION_DIR, "browser-profile");
const DIAGNOSTICS_DIR = path.join(SESSION_DIR, "diagnostics");

export const SMOKE_SOURCE_TITLE = "Pretend OCR Sample - Study Habits";
export const SMOKE_SOURCE_TEXT = [
  "Pretend OCR Sample - Study Habits",
  "",
  "Mira improves recall by choosing one small goal before each study block. The goal narrows her attention because she knows exactly what she is trying to explain, solve, or remember before the timer starts.",
  "",
  "During a twenty minute session, she keeps only the notebook page, practice questions, and notes that support that goal. Closing extra tabs and placing her phone across the room reduces distractions, so her working memory can stay with the material instead of switching tasks.",
  "",
  "After the timer, Mira rewrites one confusing idea in her own words and answers a quick question without looking. This self-check shows whether she understands the topic well enough to explain it later, and any weak answer becomes the goal for the next session.",
].join("\n");

export const TEST_IDS = Object.freeze({
  authEmailInput: "auth-email-input",
  authErrorMessage: "auth-error-message",
  authPasswordInput: "auth-password-input",
  authRestoringState: "auth-restoring-state",
  authSubmitButton: "auth-submit-button",
  reviewerCleanOutputStatus: "reviewer-clean-output-status",
  reviewerCoverageStatus: "reviewer-coverage-status",
  reviewerExplanation: "reviewer-explanation",
  reviewerGenerateButton: "reviewer-generate-button",
  reviewerGenerateScreen: "reviewer-generate-screen",
  reviewerGenerationError: "reviewer-generation-error",
  reviewerKeyPoint: "reviewer-key-point",
  reviewerReady: "reviewer-ready",
  reviewerSection: "reviewer-section",
  reviewerSourceFaithfulStatus: "reviewer-source-faithful-status",
  reviewerSourceInput: "reviewer-source-input",
  reviewerTitle: "reviewer-title",
  reviewerTitleInput: "reviewer-title-input",
});

const API_PORT = 3000;
const EXPO_PORT = 8081;
const SERVICE_READY_TIMEOUT_MS = 90_000;
const PAGE_READY_TIMEOUT_MS = 60_000;
const AUTH_NAVIGATION_TIMEOUT_MS = 45_000;
const REVIEWER_RESULT_TIMEOUT_MS = 180_000;
const CLEANUP_PORT_RELEASE_TIMEOUT_MS = 15_000;
const SERVICE_LOG_MEMORY_LIMIT = 8_000;
const SERVICE_LOG_TAIL_LINES = 12;
const EXPECTED_HEALTH_STATUS = "ok";
const EXPECTED_HEALTH_VERSION = "2.0.0";
const execFileAsync = promisify(execFile);

const AUTH_ERROR_TEXTS = [
  "The email or password is incorrect.",
  "Confirm this email address before signing in.",
  "Sign in failed before Supabase returned a response.",
  "Sign in succeeded, but no session was returned.",
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
    code: "CONFIGURATION_ERROR_VISIBLE",
    title: "API base URL missing",
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
  {
    code: "REVIEWER_GENERATION_TIMEOUT_VISIBLE",
    title: "Reviewer took too long",
  },
];

const FORBIDDEN_RESULT_NEEDLES = [
  {
    code: "NETWORK_ERROR_VISIBLE",
    needle: "network_error",
  },
  {
    code: "NETWORK_ERROR_VISIBLE",
    needle: "Could not reach the API",
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
  {
    code: "REVIEWER_GENERATION_FAILED_VISIBLE",
    needle: "Reviewer generation failed",
  },
  {
    code: "REVIEWER_POST_FAILED",
    needle: "REVIEWER_POST_FAILED",
  },
  {
    code: "REVIEWER_PREVIEW_NOT_RENDERED",
    needle: "REVIEWER_PREVIEW_NOT_RENDERED",
  },
];

export class SmokeFailure extends Error {
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
    sessionOnly: false,
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
      case "--session-only":
        options.sessionOnly = true;
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

export function selectAuthenticationMode({ hasValidSession, credentialState }) {
  if (hasValidSession) {
    return {
      mode: "persisted-session",
      status: "READY",
    };
  }

  if (credentialState?.status === "READY") {
    return {
      mode: "configured-credentials",
      status: "READY",
    };
  }

  if (credentialState?.status === "INCOMPLETE") {
    return {
      code: "SMOKE_CREDENTIALS_INCOMPLETE",
      mode: "credentials-incomplete",
      status: "INCOMPLETE",
    };
  }

  return {
    code: "AUTH_REQUIRED",
    mode: "auth-required",
    status: "ABSENT",
  };
}

export function parseSmokeEnvFileContent(content) {
  return pickSmokeCredentialVars(dotenv.parse(content));
}

export function mergeSmokeCredentialSources({
  localEnv = {},
  processEnv = {},
  sessionOnly = false,
} = {}) {
  if (sessionOnly) {
    return {
      credentials: null,
      source: "ignored-session-only",
      status: "ABSENT",
    };
  }

  const emailFromProcess = normalizeEmail(processEnv.SMOKE_TEST_EMAIL);
  const passwordFromProcess = normalizePassword(processEnv.SMOKE_TEST_PASSWORD);
  const emailFromLocal = normalizeEmail(localEnv.SMOKE_TEST_EMAIL);
  const passwordFromLocal = normalizePassword(localEnv.SMOKE_TEST_PASSWORD);

  const email =
    emailFromProcess.value !== undefined
      ? emailFromProcess.value
      : emailFromLocal.value;
  const password =
    passwordFromProcess.value !== undefined
      ? passwordFromProcess.value
      : passwordFromLocal.value;

  const emailSource =
    emailFromProcess.value !== undefined
      ? "process-env"
      : emailFromLocal.value !== undefined
        ? ".env.smoke.local"
        : "missing";
  const passwordSource =
    passwordFromProcess.value !== undefined
      ? "process-env"
      : passwordFromLocal.value !== undefined
        ? ".env.smoke.local"
        : "missing";

  return readSmokeCredentialState(
    {
      SMOKE_TEST_EMAIL: email,
      SMOKE_TEST_PASSWORD: password,
    },
    { emailSource, passwordSource },
  );
}

export function readSmokeCredentialState(env, sources = {}) {
  const email = normalizeEmail(env.SMOKE_TEST_EMAIL).value;
  const password = normalizePassword(env.SMOKE_TEST_PASSWORD).value;
  const hasEmail = email !== undefined;
  const hasPassword = password !== undefined;

  if (hasEmail && hasPassword) {
    return {
      credentials: { email, password },
      source:
        sources.emailSource === sources.passwordSource
          ? sources.emailSource
          : "mixed",
      sources,
      status: "READY",
    };
  }

  if (hasEmail || hasPassword) {
    return {
      code: "SMOKE_CREDENTIALS_INCOMPLETE",
      source: hasEmail ? sources.emailSource : sources.passwordSource,
      sources,
      status: "INCOMPLETE",
    };
  }

  return {
    source: "none",
    sources,
    status: "ABSENT",
  };
}

export function redactSensitive(value, secrets = []) {
  let redacted = String(value)
    .replace(
      /(Authorization\s*:\s*)(?:Bearer\s+)?[^\s,}]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /\b(cookie|set-cookie)(\s*[:=]\s*)([^\s"'\r\n,;}]+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(
      /(access_token|refresh_token|id_token|supabaseKey)(["'\s:=]+)([^"'\s,}]+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(
      /(SMOKE_TEST_EMAIL|SMOKE_TEST_PASSWORD)(\s*=\s*)([^\s]+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(/(email["']?\s*[:=]\s*["']?)([^"',}\s]+)/gi, "$1[REDACTED]")
    .replace(/(password["']?\s*[:=]\s*["']?)([^"',}\s]+)/gi, "$1[REDACTED]");

  for (const secret of secrets.filter((entry) => String(entry ?? "").length > 0)) {
    redacted = redacted.replaceAll(String(secret), "[REDACTED]");
  }

  return redacted;
}

export function sanitizeDiagnostics(value, secrets = []) {
  const sensitiveKeys = new Set([
    "authorization",
    "cookie",
    "cookies",
    "email",
    "password",
    "requestBody",
    "responseBody",
    "session",
    "storageState",
    "token",
  ]);

  return JSON.parse(
    JSON.stringify(value, (key, entry) => {
      if (sensitiveKeys.has(key.toLowerCase())) {
        return "[REDACTED]";
      }

      if (typeof entry === "string") {
        return redactSensitive(entry, secrets);
      }

      return entry;
    }),
  );
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

export function assertSafeApiDevOutputPath(
  targetDir,
  rootDir = ROOT_DIR,
) {
  const resolvedTargetDir = path.resolve(targetDir);
  const expectedTargetDir = path.resolve(
    rootDir,
    "apps",
    "api",
    ".next",
    "server",
    "app",
  );

  if (resolvedTargetDir !== expectedTargetDir) {
    const error = new Error(
      "Refusing to remove an unexpected API dev output path.",
    );
    error.code = "UNSAFE_API_DEV_OUTPUT_PATH";
    throw error;
  }

  return resolvedTargetDir;
}

export async function removeApiDevServerAppOutput({
  rootDir = ROOT_DIR,
} = {}) {
  const targetDir = assertSafeApiDevOutputPath(
    path.join(rootDir, "apps", "api", ".next", "server", "app"),
    rootDir,
  );
  const existed = await pathExists(targetDir);

  if (existed) {
    await fs.rm(targetDir, { force: true, recursive: true });
  }

  return {
    path: targetDir,
    removed: existed,
  };
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

export function classifyAuthenticationDiagnostics(diagnostics) {
  const selectors = diagnostics.selectors ?? {};
  const authRequest = diagnostics.authRequest ?? {};

  if (selectors.formFound === false) {
    return "AUTH_FORM_NOT_FOUND";
  }

  if (selectors.emailFound === false) {
    return "AUTH_EMAIL_INPUT_NOT_FOUND";
  }

  if (selectors.passwordFound === false) {
    return "AUTH_PASSWORD_INPUT_NOT_FOUND";
  }

  if (selectors.submitFound === false) {
    return "AUTH_SUBMIT_NOT_FOUND";
  }

  if (diagnostics.submitEnabled === false) {
    return "AUTH_SUBMIT_DISABLED";
  }

  if (authRequest.failureCategory || Number(authRequest.status) >= 400) {
    return "AUTH_REQUEST_REJECTED";
  }

  if (diagnostics.visibleErrorText) {
    return "AUTH_UI_ERROR";
  }

  if (diagnostics.submitClicked && authRequest.occurred === false) {
    return "AUTH_REQUEST_NOT_SENT";
  }

  if (diagnostics.submitClicked && diagnostics.reviewerScreenAppeared === false) {
    return "AUTH_NAVIGATION_TIMEOUT";
  }

  if (diagnostics.reviewerScreenAppeared === false) {
    return "AUTH_REVIEWER_SCREEN_NOT_FOUND";
  }

  return "AUTHENTICATION_FAILED";
}

export function validateReviewerInspection(inspection) {
  const normalizedTitle = String(inspection.titleText ?? "").toLowerCase();
  const sourceFaithfulPassed = statusTextPassed(inspection.sourceFaithfulText);
  const coveragePassed = statusTextPassed(inspection.coverageText);
  const cleanOutputPassed = statusTextPassed(inspection.cleanOutputText);
  const explanationNonempty = inspection.explanationTexts.some(
    (text) => text.trim().length > 0,
  );

  if (!inspection.readyVisible) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready was not visible.",
      { status: inspection.reviewerPostStatus },
    );
  }

  if (!normalizedTitle.includes(SMOKE_SOURCE_TITLE.toLowerCase())) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered, but the generated title did not contain the smoke title.",
      { status: inspection.reviewerPostStatus },
    );
  }

  if (inspection.sectionCount < 1) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered, but no visible reviewer section was found.",
      { status: inspection.reviewerPostStatus },
    );
  }

  if (inspection.visibleKeyPointCount < 1) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered, but no visible key point was found.",
      { status: inspection.reviewerPostStatus },
    );
  }

  if (!sourceFaithfulPassed || !coveragePassed || !cleanOutputPassed) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered, but one or more validation statuses did not pass.",
      {
        cleanOutputPassed,
        coveragePassed,
        sourceFaithfulPassed,
        status: inspection.reviewerPostStatus,
      },
    );
  }

  if (!explanationNonempty) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered, but no nonempty explanation was found.",
      { status: inspection.reviewerPostStatus },
    );
  }

  if (inspection.visibleErrorText) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered with a known visible error.",
      {
        status: inspection.reviewerPostStatus,
        visibleErrorText: inspection.visibleErrorText,
      },
    );
  }

  return {
    cleanOutputPassed,
    coveragePassed,
    explanationNonempty,
    sectionCount: inspection.sectionCount,
    sourceFaithfulPassed,
    visibleKeyPointCount: inspection.visibleKeyPointCount,
  };
}

export function buildAuthRequiredMessage({ sessionOnly = false } = {}) {
  if (sessionOnly) {
    return [
      "No valid persisted smoke browser session was found.",
      "Run npm run smoke:reviewer:web once with configured credentials before retrying --session-only.",
    ].join(" ");
  }

  return [
    "No valid persisted smoke browser session was found.",
    "Copy .env.smoke.example to .env.smoke.local and set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD, or export both variables for this process.",
  ].join(" ");
}

export function getWindowsProcessTreeKillArgs(pid) {
  return ["/pid", String(pid), "/T", "/F"];
}

function printUsage() {
  console.log(`Usage: npm run smoke:reviewer:web -- [options]

Runs the local Expo Web reviewer smoke against ${EXPO_WEB_URL} and ${API_HEALTH_URL}.

Options:
  --headed          Open the Playwright browser visibly.
  --keep-services   Leave services started by this runner running.
  --reset-session   Remove only the ignored local smoke browser state before running.
  --session-only    Ignore configured credentials and require the persisted browser session.
  --help            Print this help without starting services or reading credentials.

Authentication order:
  1. Reuse the persisted browser session at .local/smoke/reviewer-web/.
  2. Sign in with SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD from process env.
  3. Sign in with SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD from .env.smoke.local.
  4. Stop with AUTH_REQUIRED and print setup instructions.`);
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
  let apiOwnership = "not-started";
  let expoOwnership = "not-started";
  let context = null;
  let cleanupResult = { errors: [], kept: 0, stopped: 0, succeeded: true };
  let credentialState = { source: "not-loaded", status: "ABSENT" };
  let pendingFailure = null;
  let smokeResult = null;
  const removeSignalHandlers = installTerminationHandlers(startedServices, () =>
    options,
  );

  try {
    if (options.resetSession) {
      await resetSessionDir();
      console.log("Smoke browser session reset: .local/smoke/reviewer-web/");
    }

    credentialState = await loadSmokeCredentialState({
      env: process.env,
      envFilePath: SMOKE_ENV_FILE,
      sessionOnly: options.sessionOnly,
    });

    const hasSessionCandidate = await hasPersistedSessionCandidate();
    assertCanAttemptAuthentication({
      credentialState,
      hasSessionCandidate,
      sessionOnly: options.sessionOnly,
    });

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
    smokeResult = await runBrowserSmoke(context, {
      credentialState,
      sessionOnly: options.sessionOnly,
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

    if (!pendingFailure && !cleanupResult.succeeded) {
      pendingFailure = new SmokeFailure(
        "cleanup",
        "CLEANUP_PORT_STILL_BOUND",
        cleanupResult.errors.join(" "),
        { apiOwnership, expoOwnership },
      );
      process.exitCode = 1;
    }

    if (pendingFailure) {
      printFailure(pendingFailure, cleanupResult);
    } else if (smokeResult) {
      await printSuccess({
        apiOwnership,
        cleanupResult,
        expoOwnership,
        ...smokeResult,
      });
    }
  }
}

async function loadSmokeCredentialState({
  env,
  envFilePath,
  sessionOnly = false,
}) {
  if (sessionOnly) {
    return mergeSmokeCredentialSources({ sessionOnly: true });
  }

  const localEnv = await readLocalSmokeEnv(envFilePath);
  return mergeSmokeCredentialSources({
    localEnv,
    processEnv: env,
    sessionOnly,
  });
}

async function readLocalSmokeEnv(envFilePath) {
  try {
    return parseSmokeEnvFileContent(await fs.readFile(envFilePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }

    throw new SmokeFailure(
      "credential-loading",
      "SMOKE_ENV_READ_FAILED",
      ".env.smoke.local could not be read.",
      { cause: error },
    );
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function assertCanAttemptAuthentication({
  credentialState,
  hasSessionCandidate,
  sessionOnly,
}) {
  if (sessionOnly && !hasSessionCandidate) {
    throw new SmokeFailure(
      "authentication",
      "AUTH_REQUIRED",
      buildAuthRequiredMessage({ sessionOnly: true }),
    );
  }

  if (credentialState.status === "INCOMPLETE" && !hasSessionCandidate) {
    throw new SmokeFailure(
      "authentication",
      "SMOKE_CREDENTIALS_INCOMPLETE",
      "Set both SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD, or remove the incomplete credential source before relying on persisted-session mode.",
    );
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
    const code = health.reachable ? "API_HEALTH_MISMATCH" : "API_PORT_IN_USE";
    throw new SmokeFailure(
      "api-startup",
      code,
      `Port ${API_PORT} is occupied, but ${API_HEALTH_URL} did not return the expected Stay Focused V2 health payload.`,
      {
        healthMatched: health.matched,
        healthReachable: health.reachable,
        status: health.status,
      },
    );
  }

  await removeApiDevServerAppOutput();

  const service = startManagedService("API", API_PORT, [
    "run",
    "dev",
    "--workspace",
    "apps/api",
    "--",
    "--port",
    String(API_PORT),
  ]);

  await waitForServiceReadiness({
    exitCode: "API_PROCESS_EXITED",
    healthCheck: async () => (await checkApiHealth()).ok,
    service,
    startCode: "API_START_FAILED",
    step: "api-startup",
    timeoutCode: "API_HEALTH_TIMEOUT",
    timeoutMs: SERVICE_READY_TIMEOUT_MS,
    timeoutMessage: `Timed out waiting for ${API_HEALTH_URL}.`,
  });

  return { ownership: "started-by-runner", service };
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
    EXPO_PORT,
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
    exitCode: "EXPO_PROCESS_EXITED",
    healthCheck: async () => (await checkExpoWebCompatibility(EXPO_WEB_URL)).ok,
    service,
    startCode: "EXPO_START_FAILED",
    step: "expo-startup",
    timeoutCode: "EXPO_READY_TIMEOUT",
    timeoutMs: SERVICE_READY_TIMEOUT_MS,
    timeoutMessage: `Timed out waiting for ${EXPO_WEB_URL}.`,
  });

  return { ownership: "started-by-runner", service };
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

function startManagedService(name, port, npmArgs, envOverrides = {}) {
  const npm = createNpmInvocation(npmArgs);
  const logPath = path.join(DIAGNOSTICS_DIR, serviceLogFileName(name));
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
    const diagnostics = buildStartFailureDiagnostics({
      args: npm.args,
      command: npm.command,
      cause: error,
      logPath,
      name,
      port,
      shell: npm.shell,
    });
    throw new SmokeFailure(
      name === "API" ? "api-startup" : "expo-startup",
      name === "API" ? "API_START_FAILED" : "EXPO_START_FAILED",
      `${name} could not be started by the smoke runner.`,
      {
        ...(name === "API"
          ? { apiOwnership: "not-started" }
          : { expoOwnership: "not-started" }),
        cause: error,
        serviceDiagnostics: diagnostics,
      },
    );
  }

  const service = {
    args: npm.args,
    child,
    command: npm.command,
    cwd: ROOT_DIR,
    exit: null,
    healthAttempted: false,
    logPath,
    logWrite: Promise.resolve(),
    name,
    port,
    portEverBound: false,
    shell: npm.shell,
    startError: null,
    startedAt: Date.now(),
    state: "spawned",
    stderr: "",
    stdout: "",
  };

  queueServiceLog(
    service,
    [
      `${new Date(service.startedAt).toISOString()} ${name} startup`,
      `Working directory: ${ROOT_DIR}`,
      `Spawned executable: ${npm.command}`,
      `Spawned arguments: ${JSON.stringify(npm.args)}`,
      `Shell: ${String(npm.shell)}`,
      `Child PID: ${child.pid ?? "unknown"}`,
      "",
    ].join("\n"),
    { truncate: true },
  );

  child.stdout?.on("data", (chunk) => {
    const safeChunk = redactSensitive(chunk.toString("utf8"));
    service.stdout = appendLog(service.stdout, safeChunk);
    queueServiceLog(service, prefixLogLines("stdout", safeChunk));
  });
  child.stderr?.on("data", (chunk) => {
    const safeChunk = redactSensitive(chunk.toString("utf8"));
    service.stderr = appendLog(service.stderr, safeChunk);
    queueServiceLog(service, prefixLogLines("stderr", safeChunk));
  });
  child.once("error", (error) => {
    service.startError = error;
    service.state = "start-failed";
    queueServiceLog(
      service,
      prefixLogLines(
        "error",
        redactSensitive(error?.message ?? String(error)),
      ),
    );
  });
  child.once("exit", (code, signal) => {
    service.exit = { code, signal };
    if (service.state !== "ready") {
      service.state = "started-then-exited";
    }
    queueServiceLog(
      service,
      [
        "",
        `${new Date().toISOString()} ${name} exit`,
        `Exit code: ${code ?? "null"}`,
        `Signal: ${signal ?? "null"}`,
        "",
      ].join("\n"),
    );
  });

  return service;
}

export function appendLog(current, chunk) {
  const next = current + redactSensitive(String(chunk));
  return next.length > SERVICE_LOG_MEMORY_LIMIT
    ? next.slice(-SERVICE_LOG_MEMORY_LIMIT)
    : next;
}

function serviceLogFileName(name) {
  return name === "API" ? "api.log" : `${slugifyServiceName(name)}.log`;
}

function slugifyServiceName(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function prefixLogLines(stream, text) {
  return String(text)
    .split(/(\r?\n)/)
    .map((part) => (part === "\n" || part === "\r\n" || part.length === 0 ? part : `[${stream}] ${part}`))
    .join("");
}

function queueServiceLog(service, text, { truncate = false } = {}) {
  const safeText = redactSensitive(text);
  service.logWrite = service.logWrite
    .then(async () => {
      await fs.mkdir(DIAGNOSTICS_DIR, { recursive: true });
      if (truncate) {
        await fs.writeFile(service.logPath, safeText, "utf8");
      } else {
        await fs.appendFile(service.logPath, safeText, "utf8");
      }
    })
    .catch(() => {});
}

export async function waitForServiceReadiness({
  exitCode,
  healthCheck,
  pollIntervalMs = 1_000,
  service,
  startCode,
  step,
  timeoutCode,
  timeoutMs,
  timeoutMessage,
}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isTcpPortOpen(service.port)) {
      service.portEverBound = true;
    }

    if (service.startError) {
      throw new SmokeFailure(
        step,
        startCode,
        `${service.name} could not be started by the smoke runner.`,
        buildServiceFailureDetails(service, "not-started"),
      );
    }

    if (service.exit) {
      service.state = "started-then-exited";
      throw new SmokeFailure(
        step,
        exitCode,
        `${service.name} exited before it became ready.`,
        buildServiceFailureDetails(service, "started-then-exited"),
      );
    }

    service.healthAttempted = true;
    if (await healthCheck()) {
      service.state = "ready";
      service.portEverBound = true;
      return;
    }

    await delay(pollIntervalMs);
  }

  service.state = "health-timeout";
  throw new SmokeFailure(step, timeoutCode, timeoutMessage, {
    ...buildServiceFailureDetails(service, "started-by-runner"),
  });
}

function buildServiceFailureDetails(service, ownership) {
  return {
    ...(service.name === "API"
      ? { apiOwnership: ownership }
      : { expoOwnership: ownership }),
    serviceDiagnostics: buildServiceDiagnostics(service),
    stderr: tailSafeLog(service.stderr),
    stdout: tailSafeLog(service.stdout),
  };
}

export function buildServiceDiagnostics(service) {
  return sanitizeDiagnostics({
    args: service.args ?? [],
    childPid: service.child?.pid ?? null,
    command: service.command ?? "",
    cwd: service.cwd ?? ROOT_DIR,
    elapsedMs: Math.max(0, Date.now() - (service.startedAt ?? Date.now())),
    exitCode: service.exit?.code ?? null,
    healthAttempted: Boolean(service.healthAttempted),
    logPath: service.logPath ?? null,
    name: service.name,
    port: service.port,
    portEverBound: Boolean(service.portEverBound),
    shell: Boolean(service.shell),
    signal: service.exit?.signal ?? null,
    state: service.state ?? "unknown",
    stderr: tailSafeLog(service.stderr ?? ""),
    stdout: tailSafeLog(service.stdout ?? ""),
  });
}

function buildStartFailureDiagnostics({
  args,
  command,
  cause,
  logPath,
  name,
  port,
  shell,
}) {
  return buildServiceDiagnostics({
    args,
    child: null,
    command,
    cwd: ROOT_DIR,
    exit: null,
    healthAttempted: false,
    logPath,
    name,
    port,
    portEverBound: false,
    shell,
    startedAt: Date.now(),
    state: "start-failed",
    stderr: cause?.message ?? String(cause),
    stdout: "",
  });
}

export function tailSafeLog(value, maxLines = SERVICE_LOG_TAIL_LINES) {
  const redacted = redactSensitive(value ?? "");
  const lines = String(redacted).split(/\r?\n/);
  return lines.slice(-maxLines).join("\n").trim();
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

async function runBrowserSmoke(context, { credentialState, sessionOnly }) {
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(15_000);

  await page.goto(EXPO_WEB_URL, {
    timeout: PAGE_READY_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  const auth = await ensureAuthenticated(page, {
    credentialState,
    sessionOnly,
  });
  const reviewer = await generateReviewerThroughUi(page, {
    secrets: credentialSecrets(credentialState),
  });

  return {
    authenticationMode: auth.mode,
    cleanOutputPassed: reviewer.cleanOutputPassed,
    coveragePassed: reviewer.coveragePassed,
    explanationNonempty: reviewer.explanationNonempty,
    reviewerStatus: reviewer.status,
    sectionCount: reviewer.sectionCount,
    sessionPersisted: await hasPersistedSessionCandidate(),
    sourceFaithfulPassed: reviewer.sourceFaithfulPassed,
    visibleKeyPointCount: reviewer.visibleKeyPointCount,
  };
}

async function ensureAuthenticated(page, { credentialState, sessionOnly }) {
  const state = await waitForAuthState(page, PAGE_READY_TIMEOUT_MS);

  if (state === "authenticated") {
    return selectAuthenticationMode({
      credentialState,
      hasValidSession: true,
    });
  }

  if (state !== "login") {
    const diagnostics = await buildAuthDiagnostics(page, {
      elapsedMs: PAGE_READY_TIMEOUT_MS,
      reviewerScreenAppeared: false,
    });
    await saveFailureArtifacts({
      diagnostics,
      kind: "auth",
      page,
      secrets: credentialSecrets(credentialState),
    });
    throw new SmokeFailure(
      "authentication",
      "AUTH_REVIEWER_SCREEN_NOT_FOUND",
      "Timed out waiting for either the reviewer screen or the sign-in form.",
      { diagnostics },
    );
  }

  const authSelection = selectAuthenticationMode({
    credentialState,
    hasValidSession: false,
  });

  if (sessionOnly || authSelection.status === "ABSENT") {
    throw new SmokeFailure(
      "authentication",
      "AUTH_REQUIRED",
      buildAuthRequiredMessage({ sessionOnly }),
    );
  }

  if (authSelection.status === "INCOMPLETE") {
    throw new SmokeFailure(
      "authentication",
      "SMOKE_CREDENTIALS_INCOMPLETE",
      "Set both SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD, or unset both to use a valid persisted session.",
    );
  }

  await signInWithCredentials(page, credentialState);
  await verifyCredentialSessionRestores(page, credentialState);
  return authSelection;
}

async function waitForAuthState(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isVisibleTestId(page, TEST_IDS.reviewerGenerateScreen)) {
      return "authenticated";
    }

    if (await isVisibleTestId(page, TEST_IDS.authEmailInput)) {
      return "login";
    }

    await delay(500);
  }

  return "timeout";
}

async function signInWithCredentials(page, credentialState) {
  const credentials = credentialState.credentials;
  const secrets = credentialSecrets(credentialState);
  const startedAt = Date.now();
  let diagnostics = await buildAuthDiagnostics(page, {
    elapsedMs: 0,
    reviewerScreenAppeared: false,
  });

  const initialCode = classifyAuthenticationDiagnostics(diagnostics);
  if (
    [
      "AUTH_FORM_NOT_FOUND",
      "AUTH_EMAIL_INPUT_NOT_FOUND",
      "AUTH_PASSWORD_INPUT_NOT_FOUND",
      "AUTH_SUBMIT_NOT_FOUND",
    ].includes(initialCode)
  ) {
    await failAuthentication(page, initialCode, diagnostics, secrets);
  }

  const emailInput = page.getByTestId(TEST_IDS.authEmailInput);
  const passwordInput = page.getByTestId(TEST_IDS.authPasswordInput);
  const submitButton = page.getByTestId(TEST_IDS.authSubmitButton);

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);

  diagnostics = await buildAuthDiagnostics(page, {
    elapsedMs: Date.now() - startedAt,
    reviewerScreenAppeared: false,
  });

  if (!diagnostics.submitEnabled) {
    await failAuthentication(
      page,
      "AUTH_SUBMIT_DISABLED",
      diagnostics,
      secrets,
    );
  }

  const authRequest = createAuthRequestObserver(page);
  await submitButton.click();
  diagnostics.submitClicked = true;

  const deadline = Date.now() + AUTH_NAVIGATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const requestState = authRequest.getState();

    if (await isVisibleTestId(page, TEST_IDS.reviewerGenerateScreen)) {
      authRequest.dispose();
      return;
    }

    const visibleErrorText = await getVisibleAuthErrorText(page);
    if (visibleErrorText) {
      diagnostics = await buildAuthDiagnostics(page, {
        authRequest: requestState,
        elapsedMs: Date.now() - startedAt,
        reviewerScreenAppeared: false,
        submitClicked: true,
        visibleErrorText,
      });
      authRequest.dispose();
      await failAuthentication(page, "AUTH_UI_ERROR", diagnostics, secrets);
    }

    if (requestState.failureCategory || Number(requestState.status) >= 400) {
      diagnostics = await buildAuthDiagnostics(page, {
        authRequest: requestState,
        elapsedMs: Date.now() - startedAt,
        reviewerScreenAppeared: false,
        submitClicked: true,
      });
      authRequest.dispose();
      await failAuthentication(
        page,
        "AUTH_REQUEST_REJECTED",
        diagnostics,
        secrets,
      );
    }

    await delay(250);
  }

  const requestState = authRequest.getState();
  authRequest.dispose();
  diagnostics = await buildAuthDiagnostics(page, {
    authRequest: requestState,
    elapsedMs: Date.now() - startedAt,
    reviewerScreenAppeared: await isVisibleTestId(
      page,
      TEST_IDS.reviewerGenerateScreen,
    ),
    submitClicked: true,
    visibleErrorText: await getVisibleAuthErrorText(page),
  });

  await failAuthentication(
    page,
    classifyAuthenticationDiagnostics(diagnostics),
    diagnostics,
    secrets,
  );
}

async function failAuthentication(page, code, diagnostics, secrets) {
  await saveFailureArtifacts({
    diagnostics,
    kind: "auth",
    page,
    secrets,
  });

  throw new SmokeFailure(
    "authentication",
    code,
    authenticationFailureMessage(code),
    { diagnostics },
  );
}

async function verifyCredentialSessionRestores(page, credentialState) {
  await page.reload({
    timeout: PAGE_READY_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });

  const state = await waitForAuthState(page, PAGE_READY_TIMEOUT_MS);
  if (state === "authenticated") {
    return;
  }

  const diagnostics = await buildAuthDiagnostics(page, {
    elapsedMs: PAGE_READY_TIMEOUT_MS,
    reviewerScreenAppeared: false,
  });
  await saveFailureArtifacts({
    diagnostics,
    kind: "auth",
    page,
    secrets: credentialSecrets(credentialState),
  });

  throw new SmokeFailure(
    "authentication",
    "AUTH_REVIEWER_SCREEN_NOT_FOUND",
    "Credential sign-in completed, but the persisted session did not restore before reviewer generation.",
    { diagnostics },
  );
}

function authenticationFailureMessage(code) {
  switch (code) {
    case "AUTH_FORM_NOT_FOUND":
      return "The sign-in form was not found.";
    case "AUTH_EMAIL_INPUT_NOT_FOUND":
      return "The sign-in email input was not found.";
    case "AUTH_PASSWORD_INPUT_NOT_FOUND":
      return "The sign-in password input was not found.";
    case "AUTH_SUBMIT_NOT_FOUND":
      return "The sign-in submit button was not found.";
    case "AUTH_SUBMIT_DISABLED":
      return "The sign-in submit button stayed disabled.";
    case "AUTH_REQUEST_NOT_SENT":
      return "The Supabase password sign-in request was not observed.";
    case "AUTH_REQUEST_REJECTED":
      return "The Supabase password sign-in request was rejected.";
    case "AUTH_UI_ERROR":
      return "The sign-in form showed an authentication error.";
    case "AUTH_NAVIGATION_TIMEOUT":
      return "Sign-in completed far enough to submit, but the reviewer screen did not appear before the timeout.";
    case "AUTH_REVIEWER_SCREEN_NOT_FOUND":
      return "The authenticated reviewer screen marker was not found.";
    default:
      return "Authentication failed.";
  }
}

async function buildAuthDiagnostics(page, overrides = {}) {
  const selectors = await inspectAuthSelectors(page);
  return {
    authRequest: {
      occurred: false,
      ...overrides.authRequest,
    },
    currentUrl: page.url(),
    elapsedMs: overrides.elapsedMs ?? 0,
    reviewerScreenAppeared:
      overrides.reviewerScreenAppeared ??
      (await isVisibleTestId(page, TEST_IDS.reviewerGenerateScreen)),
    selectors,
    submitClicked: Boolean(overrides.submitClicked),
    submitEnabled:
      overrides.submitEnabled ??
      (selectors.submitFound
        ? await page
            .getByTestId(TEST_IDS.authSubmitButton)
            .isEnabled()
            .catch(() => false)
        : null),
    visibleErrorText:
      overrides.visibleErrorText ?? (await getVisibleAuthErrorText(page)),
  };
}

async function inspectAuthSelectors(page) {
  const emailFound = await locatorExists(page.getByTestId(TEST_IDS.authEmailInput));
  const passwordFound = await locatorExists(
    page.getByTestId(TEST_IDS.authPasswordInput),
  );
  const submitFound = await locatorExists(
    page.getByTestId(TEST_IDS.authSubmitButton),
  );
  const errorFound = await locatorExists(
    page.getByTestId(TEST_IDS.authErrorMessage),
  );

  return {
    emailFound,
    errorFound,
    formFound: emailFound || passwordFound || submitFound,
    passwordFound,
    restoringVisible: await isVisibleTestId(page, TEST_IDS.authRestoringState),
    submitFound,
  };
}

async function getVisibleAuthErrorText(page) {
  const error = page.getByTestId(TEST_IDS.authErrorMessage);
  if (await error.isVisible().catch(() => false)) {
    return (await error.innerText()).trim();
  }

  for (const text of AUTH_ERROR_TEXTS) {
    const locator = page.getByText(text, { exact: false }).first();
    if (await locator.isVisible().catch(() => false)) {
      return (await locator.innerText()).trim();
    }
  }

  return "";
}

function createAuthRequestObserver(page) {
  const state = {
    failureCategory: undefined,
    hostname: undefined,
    method: undefined,
    occurred: false,
    pathname: undefined,
    status: undefined,
  };

  const onRequest = (request) => {
    if (!isSupabasePasswordSignInRequest(request)) {
      return;
    }

    const url = new URL(request.url());
    state.hostname = url.hostname;
    state.method = request.method();
    state.occurred = true;
    state.pathname = url.pathname;
  };

  const onResponse = (response) => {
    const request = response.request();
    if (!isSupabasePasswordSignInRequest(request)) {
      return;
    }

    const url = new URL(request.url());
    state.hostname = url.hostname;
    state.method = request.method();
    state.occurred = true;
    state.pathname = url.pathname;
    state.status = response.status();
  };

  const onRequestFailed = (request) => {
    if (!isSupabasePasswordSignInRequest(request)) {
      return;
    }

    const url = new URL(request.url());
    state.failureCategory =
      request.failure()?.errorText?.split(":")[0] ?? "requestfailed";
    state.hostname = url.hostname;
    state.method = request.method();
    state.occurred = true;
    state.pathname = url.pathname;
  };

  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);

  return {
    dispose() {
      page.off("request", onRequest);
      page.off("response", onResponse);
      page.off("requestfailed", onRequestFailed);
    },
    getState() {
      return { ...state };
    },
  };
}

function isSupabasePasswordSignInRequest(request) {
  try {
    const url = new URL(request.url());
    return (
      request.method() === "POST" &&
      url.pathname.includes("/auth/v1/token") &&
      url.searchParams.get("grant_type") === "password"
    );
  } catch {
    return false;
  }
}

async function generateReviewerThroughUi(page, { secrets = [] } = {}) {
  await page
    .getByTestId(TEST_IDS.reviewerGenerateScreen)
    .waitFor({ state: "visible", timeout: PAGE_READY_TIMEOUT_MS });

  await page.getByTestId(TEST_IDS.reviewerTitleInput).fill("");
  await page.getByTestId(TEST_IDS.reviewerTitleInput).fill(SMOKE_SOURCE_TITLE);
  await page.getByTestId(TEST_IDS.reviewerSourceInput).fill("");
  await page.getByTestId(TEST_IDS.reviewerSourceInput).fill(SMOKE_SOURCE_TEXT);

  const reviewerRequest = createReviewerPostObserver(page);
  await triggerReviewerGeneration(page, reviewerRequest);

  try {
    await waitForReviewerResult(page, reviewerRequest);

    const requestState = reviewerRequest.getState();
    const status = requestState.status;
    if (status === undefined || status >= 400 || requestState.failureCategory) {
      throw new SmokeFailure(
        "reviewer-post",
        "REVIEWER_POST_FAILED",
        status === undefined
          ? "Reviewer Ready rendered, but the reviewer POST response was not observed."
          : `Reviewer POST returned HTTP ${status}.`,
        {
          failureCategory: requestState.failureCategory,
          status,
        },
      );
    }

    await verifyNoForbiddenResultErrors(page);
    const inspection = await inspectReviewerOutput(page, status);
    return {
      status,
      ...validateReviewerInspection(inspection),
    };
  } catch (error) {
    await saveFailureArtifacts({
      diagnostics: {
        currentUrl: page.url(),
        reviewerRequest: reviewerRequest.getState(),
        visibleErrorText: await getVisibleReviewerErrorText(page),
      },
      kind: "reviewer",
      page,
      secrets,
    });
    throw error;
  } finally {
    reviewerRequest.dispose();
  }
}

async function triggerReviewerGeneration(page, reviewerRequest) {
  const button = page.getByTestId(TEST_IDS.reviewerGenerateButton).first();
  await button.scrollIntoViewIfNeeded().catch(() => {});
  await button.click({ force: true });

  if (await reviewerGenerationStarted(page, reviewerRequest, 2_000)) {
    return;
  }

  await button.dispatchEvent("click").catch(() => {});
  if (await reviewerGenerationStarted(page, reviewerRequest, 2_000)) {
    return;
  }

  await button
    .evaluate((element) => {
      if (element instanceof HTMLElement) {
        element.click();
      }
    })
    .catch(() => {});
}

async function reviewerGenerationStarted(page, reviewerRequest, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (reviewerRequest.getState().occurred) {
      return true;
    }

    if (await isVisibleTestId(page, TEST_IDS.reviewerReady)) {
      return true;
    }

    const visibleError = await getVisibleReviewerError(page);
    if (visibleError) {
      return true;
    }

    if (
      await page
        .getByText("Generating reviewer...", { exact: false })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }

    await delay(100);
  }

  return false;
}

function createReviewerPostObserver(page) {
  const state = {
    failureCategory: undefined,
    hostname: undefined,
    method: undefined,
    occurred: false,
    pathname: undefined,
    status: undefined,
  };

  const isReviewerRequest = (request) =>
    request.method() === "POST" &&
    request.url().includes("/api/reviewer/generate");

  const onRequest = (request) => {
    if (!isReviewerRequest(request)) {
      return;
    }
    const url = new URL(request.url());
    state.hostname = url.hostname;
    state.method = request.method();
    state.occurred = true;
    state.pathname = url.pathname;
  };

  const onResponse = (response) => {
    const request = response.request();
    if (!isReviewerRequest(request)) {
      return;
    }
    const url = new URL(request.url());
    state.hostname = url.hostname;
    state.method = request.method();
    state.occurred = true;
    state.pathname = url.pathname;
    state.status = response.status();
  };

  const onRequestFailed = (request) => {
    if (!isReviewerRequest(request)) {
      return;
    }
    const url = new URL(request.url());
    state.failureCategory =
      request.failure()?.errorText?.split(":")[0] ?? "requestfailed";
    state.hostname = url.hostname;
    state.method = request.method();
    state.occurred = true;
    state.pathname = url.pathname;
  };

  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);

  return {
    dispose() {
      page.off("request", onRequest);
      page.off("response", onResponse);
      page.off("requestfailed", onRequestFailed);
    },
    getState() {
      return { ...state };
    },
  };
}

async function waitForReviewerResult(page, reviewerRequest) {
  const deadline = Date.now() + REVIEWER_RESULT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isVisibleTestId(page, TEST_IDS.reviewerReady)) {
      return;
    }

    const visibleError = await getVisibleReviewerError(page);
    if (visibleError) {
      throw new SmokeFailure(
        "reviewer-ui",
        visibleError.code,
        `The UI showed "${visibleError.text}".`,
        { status: reviewerRequest.getState().status },
      );
    }

    const requestState = reviewerRequest.getState();
    if (requestState.failureCategory || Number(requestState.status) >= 400) {
      throw new SmokeFailure(
        "reviewer-post",
        "REVIEWER_POST_FAILED",
        requestState.status === undefined
          ? "Reviewer POST failed before a response was received."
          : `Reviewer POST returned HTTP ${requestState.status}.`,
        {
          failureCategory: requestState.failureCategory,
          status: requestState.status,
        },
      );
    }

    await delay(500);
  }

  throw new SmokeFailure(
    "reviewer-ui",
    "REVIEWER_PREVIEW_NOT_RENDERED",
    "Timed out waiting for Reviewer Ready.",
    { status: reviewerRequest.getState().status },
  );
}

async function inspectReviewerOutput(page, reviewerPostStatus) {
  await page
    .getByTestId(TEST_IDS.reviewerReady)
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await page
    .getByTestId(TEST_IDS.reviewerSection)
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await page
    .getByTestId(TEST_IDS.reviewerExplanation)
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});

  return {
    cleanOutputText: await safeInnerText(
      page.getByTestId(TEST_IDS.reviewerCleanOutputStatus),
    ),
    coverageText: await safeInnerText(
      page.getByTestId(TEST_IDS.reviewerCoverageStatus),
    ),
    explanationTexts: await visibleInnerTexts(
      page.getByTestId(TEST_IDS.reviewerExplanation),
    ),
    readyVisible: await isVisibleTestId(page, TEST_IDS.reviewerReady),
    reviewerPostStatus,
    sectionCount: await visibleLocatorCount(
      page.getByTestId(TEST_IDS.reviewerSection),
    ),
    sourceFaithfulText: await safeInnerText(
      page.getByTestId(TEST_IDS.reviewerSourceFaithfulStatus),
    ),
    titleText: await safeInnerText(page.getByTestId(TEST_IDS.reviewerTitle)),
    visibleErrorText: await getVisibleReviewerErrorText(page),
    visibleKeyPointCount: await visibleLocatorCount(
      page.getByTestId(TEST_IDS.reviewerKeyPoint),
    ),
  };
}

async function getVisibleReviewerError(page) {
  const errorBox = page.getByTestId(TEST_IDS.reviewerGenerationError);
  if (await errorBox.isVisible().catch(() => false)) {
    const text = (await errorBox.innerText()).trim();
    const matched = REVIEWER_ERROR_STATES.find((state) =>
      text.includes(state.title),
    );
    return {
      code: matched?.code ?? "REVIEWER_GENERATION_FAILED_VISIBLE",
      text,
    };
  }

  for (const state of REVIEWER_ERROR_STATES) {
    const locator = page.getByText(state.title, { exact: false }).first();
    if (await locator.isVisible().catch(() => false)) {
      return {
        code: state.code,
        text: (await locator.innerText()).trim(),
      };
    }
  }

  return null;
}

async function getVisibleReviewerErrorText(page) {
  return (await getVisibleReviewerError(page))?.text ?? "";
}

async function verifyNoForbiddenResultErrors(page) {
  const visibleError = await getVisibleReviewerError(page);
  if (visibleError) {
    throw new SmokeFailure(
      "result-validation",
      visibleError.code,
      `The UI showed "${visibleError.text}" after generation.`,
    );
  }

  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const { code, needle } of FORBIDDEN_RESULT_NEEDLES) {
    if (bodyText.includes(needle.toLowerCase())) {
      throw new SmokeFailure(
        "result-validation",
        code,
        `The UI included forbidden diagnostic text: ${needle}.`,
      );
    }
  }
}

async function saveFailureArtifacts({ diagnostics, kind, page, secrets }) {
  await fs.mkdir(DIAGNOSTICS_DIR, { recursive: true });

  if (kind === "auth") {
    await scrubAuthFields(page);
  }
  await scrubVisibleSensitiveText(page, secrets);

  const safeDiagnostics = sanitizeDiagnostics(
    {
      diagnostics,
      kind,
      savedAt: new Date().toISOString(),
    },
    secrets,
  );

  await fs.writeFile(
    path.join(DIAGNOSTICS_DIR, "safe-diagnostics.json"),
    `${JSON.stringify(safeDiagnostics, null, 2)}\n`,
    "utf8",
  );

  const screenshotName = kind === "auth" ? "auth-failure.png" : `${kind}-failure.png`;
  await page.screenshot({
    fullPage: true,
    path: path.join(DIAGNOSTICS_DIR, screenshotName),
  }).catch(() => {});

  await writeMinimalTrace(page.context(), path.join(DIAGNOSTICS_DIR, "trace.zip"));
}

async function scrubAuthFields(page) {
  await page.getByTestId(TEST_IDS.authPasswordInput).fill("").catch(() => {});
  await page.getByTestId(TEST_IDS.authEmailInput).fill("").catch(() => {});
}

async function scrubVisibleSensitiveText(page, secrets) {
  await page
    .evaluate((knownSecrets) => {
      const replacements = knownSecrets.filter(Boolean);
      const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
      const redact = (value) => {
        let next = String(value ?? "").replace(emailPattern, "[REDACTED]");
        for (const secret of replacements) {
          next = next.replaceAll(String(secret), "[REDACTED]");
        }
        return next;
      };

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      for (const node of textNodes) {
        node.nodeValue = redact(node.nodeValue);
      }

      for (const field of document.querySelectorAll("input, textarea")) {
        field.value = redact(field.value);
      }
    }, secrets)
    .catch(() => {});
}

async function writeMinimalTrace(context, tracePath) {
  try {
    await context.tracing.start({
      screenshots: true,
      snapshots: false,
      sources: false,
    });
    await context.tracing.stop({ path: tracePath });
  } catch {}
}

async function resetSessionDir() {
  const resolvedSessionDir = assertSafeSessionPath(SESSION_DIR);
  await fs.rm(resolvedSessionDir, { force: true, recursive: true });
}

async function hasPersistedSessionCandidate() {
  try {
    const stat = await fs.stat(USER_DATA_DIR);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function cleanupStartedServices(startedServices, options) {
  const result = { errors: [], kept: 0, stopped: 0, succeeded: true };

  for (const service of [...startedServices].reverse()) {
    if (
      shouldStopService({
        keepServices: options.keepServices,
        started: Boolean(service),
      })
    ) {
      const stopped = await stopManagedService(service);
      const portReleased = await waitForTcpPortClosed(
        service.port,
        CLEANUP_PORT_RELEASE_TIMEOUT_MS,
      );
      result.stopped += stopped ? 1 : 0;
      if (!stopped || !portReleased) {
        result.succeeded = false;
        result.errors.push(
          `${service.name} cleanup failed; port ${service.port} ${
            portReleased ? "released" : "remained bound"
          }.`,
        );
      }
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
        getWindowsProcessTreeKillArgs(service.child.pid),
        {
          stdio: "ignore",
          windowsHide: true,
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

  const exited = await Promise.race([
    onceExit(service.child).then(() => true),
    delay(5_000).then(() => false),
  ]);

  if (!exited) {
    try {
      process.kill(-service.child.pid, "SIGKILL");
    } catch {}
  }

  await Promise.race([onceExit(service.child), delay(2_000)]);
  return true;
}

function onceExit(child) {
  return new Promise((resolve) => {
    child.once("exit", resolve);
  });
}

export async function waitForTcpPortClosed(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await isTcpPortOpen(port))) {
      return true;
    }

    await delay(250);
  }

  return false;
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

export function isTcpPortOpen(port) {
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

function statusTextPassed(value) {
  return /\bPassed\b/i.test(String(value ?? ""));
}

function normalizeEmail(value) {
  if (typeof value !== "string") {
    return { value: undefined };
  }

  const trimmed = value.trim();
  return { value: trimmed.length > 0 ? trimmed : undefined };
}

function normalizePassword(value) {
  if (typeof value !== "string") {
    return { value: undefined };
  }

  return { value: value.length > 0 ? value : undefined };
}

function pickSmokeCredentialVars(env) {
  return {
    ...(Object.hasOwn(env, "SMOKE_TEST_EMAIL")
      ? { SMOKE_TEST_EMAIL: env.SMOKE_TEST_EMAIL }
      : {}),
    ...(Object.hasOwn(env, "SMOKE_TEST_PASSWORD")
      ? { SMOKE_TEST_PASSWORD: env.SMOKE_TEST_PASSWORD }
      : {}),
  };
}

function credentialSecrets(credentialState) {
  return [
    credentialState?.credentials?.email,
    credentialState?.credentials?.password,
  ].filter(Boolean);
}

async function locatorExists(locator) {
  return (await locator.count().catch(() => 0)) > 0;
}

async function isVisibleTestId(page, testID) {
  return page.getByTestId(testID).first().isVisible().catch(() => false);
}

async function safeInnerText(locator) {
  return locator.first().innerText().catch(() => "");
}

async function visibleLocatorCount(locator) {
  const count = await locator.count().catch(() => 0);
  let visibleCount = 0;

  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) {
      visibleCount += 1;
    }
  }

  return visibleCount;
}

async function visibleInnerTexts(locator) {
  const count = await locator.count().catch(() => 0);
  const values = [];

  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    if (await item.isVisible().catch(() => false)) {
      values.push((await item.innerText()).trim());
    }
  }

  return values;
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
  console.log(`Reviewer POST: HTTP ${result.reviewerStatus}`);
  console.log("Reviewer Ready: visible");
  console.log(
    `Source-faithful: ${result.sourceFaithfulPassed ? "passed" : "failed"}`,
  );
  console.log(`Coverage: ${result.coveragePassed ? "passed" : "failed"}`);
  console.log(`Clean output: ${result.cleanOutputPassed ? "passed" : "failed"}`);
  console.log(`Sections: ${result.sectionCount}`);
  console.log(`Visible key points: ${result.visibleKeyPointCount}`);
  console.log(
    `Explanation: ${result.explanationNonempty ? "nonempty" : "empty"}`,
  );
  console.log(`Session persisted: ${result.sessionPersisted ? "passed" : "failed"}`);
  console.log(
    `Cleanup: passed (${result.cleanupResult.stopped} stopped, ${result.cleanupResult.kept} kept)`,
  );
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
  if (failure.details?.diagnostics) {
    const diagnostics = sanitizeDiagnostics(failure.details.diagnostics);
    console.error(`Auth diagnostics: ${JSON.stringify(diagnostics)}`);
  }
  if (failure.details?.serviceDiagnostics) {
    printServiceDiagnostics(failure.details.serviceDiagnostics);
  }
  console.error(
    `Cleanup: ${cleanupResult.succeeded ? "succeeded" : "failed"} (${cleanupResult.stopped} stopped, ${cleanupResult.kept} kept)`,
  );
  if (cleanupResult.errors.length > 0) {
    console.error(`Cleanup errors: ${cleanupResult.errors.join(" ")}`);
  }
  console.error(redactSensitive(failure.message));
}

function printServiceDiagnostics(diagnostics) {
  const safe = sanitizeDiagnostics(diagnostics);
  console.error(`Service state: ${safe.state}`);
  console.error(`Service command: ${safe.command}`);
  console.error(`Service working directory: ${safe.cwd}`);
  console.error(`Spawned executable: ${safe.command}`);
  console.error(`Spawned arguments: ${JSON.stringify(safe.args ?? [])}`);
  console.error(`Child PID: ${safe.childPid ?? "unknown"}`);
  console.error(`Exit code: ${safe.exitCode ?? "null"}`);
  console.error(`Exit signal: ${safe.signal ?? "null"}`);
  console.error(`Port ${safe.port} ever bound: ${safe.portEverBound}`);
  console.error(`Health attempted: ${safe.healthAttempted}`);
  console.error(`Startup elapsed: ${safe.elapsedMs}ms`);
  console.error(`Service log: ${safe.logPath ?? "unavailable"}`);
  console.error(`Last stdout: ${safe.stdout || "(empty)"}`);
  console.error(`Last stderr: ${safe.stderr || "(empty)"}`);
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
