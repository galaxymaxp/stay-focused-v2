#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import { chromium } from "playwright";

import {
  API_BASE_URL,
  EXPO_WEB_URL,
  SMOKE_ENV_FILE,
  SmokeFailure,
  assertCanAttemptAuthentication,
  cleanupStartedServices,
  credentialSecrets,
  ensureApiService,
  ensureAuthenticated,
  ensureExpoWebService,
  loadSmokeCredentialState,
  redactSensitive,
  sanitizeDiagnostics,
} from "./reviewer-web-smoke.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
export const SESSION_DIR = path.join(
  ROOT_DIR,
  ".local",
  "smoke",
  "canvas-grades-web",
);
const USER_DATA_DIR = path.join(SESSION_DIR, "browser-profile");
const DIAGNOSTICS_DIR = path.join(SESSION_DIR, "diagnostics");

const PAGE_READY_TIMEOUT_MS = 60_000;
const GRADE_READY_TIMEOUT_MS = 90_000;
const SYNC_TIMEOUT_MS = 240_000;

export const GRADE_TEST_IDS = Object.freeze({
  assignmentList: "canvas-grade-assignment-list",
  canvasConnectedState: "canvas-connected-state",
  coursesOpenButton: "courses-open-button",
  coursesScreen: "courses-screen",
  detail: "canvas-grade-detail",
  detailError: "canvas-grade-detail-error",
  detailLoading: "canvas-grade-detail-loading",
  empty: "canvas-grades-empty",
  gradesLoading: "canvas-grades-loading",
  gradesScreen: "canvas-grades-screen",
  initialError: "canvas-grades-initial-error",
  loadMoreButton: "canvas-grades-load-more-button",
  neverSynced: "canvas-grades-never-synced",
  reloadButton: "canvas-grades-reload-button",
  summary: "canvas-grade-summary",
  syncButton: "canvas-grades-sync-button",
  syncStatus: "canvas-grade-sync-status",
  warning: "canvas-grades-warning",
});

export const FORBIDDEN_RESPONSE_KEYS = [
  "canvas_assignment_id",
  "canvas_course_id",
  "canvas_submission_user_id",
  "canvas_user_id",
  "grader_id",
  "user_id",
  "preview_url",
  "html_url",
  "submission_url",
  "body",
  "comment",
  "comments",
  "attachments",
  "rubric",
  "rubric_assessment",
  "raw",
  "payload",
  "fingerprint",
  "source_fingerprint",
  "unposted",
  "current_score_unposted",
  "final_score_unposted",
  "token",
  "authorization",
];

export const NORMALIZED_STATUSES = [
  "unknown",
  "excused",
  "unavailable",
  "locked",
  "missing",
  "graded_hidden",
  "graded",
  "submitted_late",
  "submitted",
  "late_unsubmitted",
  "available",
  "upcoming",
  "no_due_date",
];

export function parseArgs(argv) {
  const options = {
    edgeOnly: false,
    headed: false,
    help: false,
    keepServices: false,
    sessionOnly: false,
  };

  for (const arg of argv) {
    switch (arg) {
      case "--edge-only":
        options.edgeOnly = true;
        break;
      case "--headed":
        options.headed = true;
        break;
      case "--help":
        options.help = true;
        break;
      case "--keep-services":
        options.keepServices = true;
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

export function classifyGradeApiRequest(url, method = "GET") {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const pathname = parsed.pathname;
  if (!pathname.includes("/api/canvas/courses/") || !pathname.includes("/grades")) {
    return null;
  }

  if (pathname.endsWith("/grades/sync-status")) {
    return { label: "sync-status", method };
  }
  if (pathname.endsWith("/grades/summary")) {
    return { label: "summary", method };
  }
  if (pathname.endsWith("/grades/sync")) {
    return { label: "sync", method };
  }
  if (pathname.endsWith("/grades")) {
    return { label: "list", method };
  }

  return { label: "detail", method };
}

export function scanForbiddenKeys(value, forbiddenKeys = FORBIDDEN_RESPONSE_KEYS) {
  const forbidden = new Set(forbiddenKeys.map((key) => key.toLowerCase()));
  const hits = [];
  const visit = (entry, trail) => {
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, [...trail, String(index)]));
      return;
    }
    if (!isRecord(entry)) {
      return;
    }
    for (const [key, child] of Object.entries(entry)) {
      if (forbidden.has(key.toLowerCase())) {
        hits.push([...trail, key].join("."));
      }
      visit(child, [...trail, key]);
    }
  };
  visit(value, []);
  return hits;
}

export function scanVisibilityWrapperViolations(value) {
  const hits = [];
  const visit = (entry, trail) => {
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, [...trail, String(index)]));
      return;
    }
    if (!isRecord(entry)) {
      return;
    }
    if (
      typeof entry.state === "string" &&
      Object.hasOwn(entry, "value") &&
      entry.state !== "visible" &&
      entry.value !== null
    ) {
      hits.push(trail.join("."));
    }
    for (const [key, child] of Object.entries(entry)) {
      visit(child, [...trail, key]);
    }
  };
  visit(value, []);
  return hits;
}

export function summarizeSummaryWrappers(summaryResponse) {
  const summary = summaryResponse?.summary;
  return {
    currentGrade: classifyWrapper(summary?.currentGrade),
    currentScore: classifyWrapper(summary?.currentScore),
    finalGrade: classifyWrapper(summary?.finalGrade),
    finalScore: classifyWrapper(summary?.finalScore),
  };
}

export function summarizeAssignmentList(listResponse) {
  const items = Array.isArray(listResponse?.items) ? listResponse.items : [];
  return {
    assignmentCount: items.length,
    hasDueDate: items.some((item) => item.dueAt !== null),
    hasHiddenGrade: items.some((item) => item.grade?.state === "hidden"),
    hasHiddenScore: items.some((item) => item.score?.state === "hidden"),
    hasNoDueDate: items.some((item) => item.dueAt === null),
    hasSubmittedAt: items.some((item) => item.submittedAt !== null),
    hasVisibleGrade: items.some((item) => item.grade?.state === "visible"),
    hasVisibleScore: items.some((item) => item.score?.state === "visible"),
    statuses: [...new Set(items.map((item) => item.normalizedStatus))].sort(),
  };
}

export function buildFictionalListResponse({ offset = 0 } = {}) {
  const firstPageItems = NORMALIZED_STATUSES.map((status, index) =>
    fictionalAssignment({
      id: `fictional-assignment-${index + 1}`,
      index,
      normalizedStatus: status,
    }),
  );
  const secondPageItems = [
    fictionalAssignment({
      id: "fictional-assignment-2",
      index: 1,
      normalizedStatus: "submitted",
    }),
    fictionalAssignment({
      id: "fictional-assignment-extra",
      index: 99,
      normalizedStatus: "available",
    }),
  ];
  const firstPage = offset === 0;
  return {
    ok: true,
    items: firstPage ? firstPageItems : secondPageItems,
    page: {
      hasMore: firstPage,
      limit: 50,
      nextOffset: firstPage ? 50 : null,
      offset,
    },
    sync: fictionalSyncStatus({ status: "partial", stale: true }),
  };
}

export function buildFictionalSummaryResponse() {
  return {
    ok: true,
    summary: {
      currentGrade: { state: "unknown", value: null },
      currentScore: { state: "hidden", value: null },
      finalGrade: { state: "not_applicable", value: null },
      finalScore: { state: "unavailable", value: null },
      lastSyncedAt: "2026-07-08T00:00:00.000Z",
      sync: fictionalSyncStatus({ status: "partial", stale: true }),
    },
  };
}

export function buildFictionalDetailResponse() {
  return {
    ok: true,
    assignment: {
      ...fictionalAssignment({
        id: "fictional-assignment-1",
        index: 0,
        normalizedStatus: "missing",
      }),
      allowedAttempts: 2,
      gradeMatchesCurrentSubmission: true,
      hideInGradebook: false,
      latePolicyStatus: "missing",
      pointsPossibleAtSync: 10,
      postManually: false,
      postedAt: "2026-07-08T00:00:00.000Z",
      secondsLate: 3600,
      submissionType: "online_text_entry",
      sync: fictionalSyncStatus({ status: "partial", stale: true }),
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  await loadLocalEnv();
  const startedServices = [];
  let pendingFailure = null;
  let result = null;

  try {
    const credentialState = await loadSmokeCredentialState({
      env: process.env,
      envFilePath: SMOKE_ENV_FILE,
      sessionOnly: options.sessionOnly,
    });
    const hasSessionCandidate = await pathExists(USER_DATA_DIR);
    assertCanAttemptAuthentication({
      credentialState,
      hasSessionCandidate,
      sessionOnly: options.sessionOnly,
    });

    const api = await ensureApiService();
    if (api.service) startedServices.push(api.service);
    const expo = await ensureExpoWebService();
    if (expo.service) startedServices.push(expo.service);

    const context = await launchCanvasGradesBrowser(options);
    try {
      result = await runCanvasGradesSmoke(context, {
        credentialState,
        edgeOnly: options.edgeOnly,
        sessionOnly: options.sessionOnly,
      });
      result.apiOwnership = api.ownership;
      result.expoOwnership = expo.ownership;
    } finally {
      await context.close().catch(() => {});
    }
  } catch (error) {
    pendingFailure = toSmokeFailure(error);
    process.exitCode = 1;
  } finally {
    const cleanup = await cleanupStartedServices(startedServices, options);
    if (pendingFailure) {
      printFailure(pendingFailure, cleanup);
    } else {
      printSuccess({ ...result, cleanup });
    }
  }
}

async function runCanvasGradesSmoke(context, {
  credentialState,
  edgeOnly,
  sessionOnly,
}) {
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(20_000);

  await page.goto(EXPO_WEB_URL, {
    timeout: PAGE_READY_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
  const auth = await ensureAuthenticated(page, {
    credentialState,
    sessionOnly,
  });

  const live = edgeOnly
    ? null
    : await runProtectedLiveGradeFlow(page, credentialSecrets(credentialState));
  const fictional = await runFictionalEdgeFlow(page);

  return {
    authenticationMode: auth.mode,
    fictional,
    live,
    sessionPersisted: true,
  };
}

async function runProtectedLiveGradeFlow(page, secrets) {
  const trace = createGradeRequestTrace(page, secrets);
  await openCourses(page);

  const selectedGradesButtons = await visibleLocatorCount(
    page.locator('[data-testid^="canvas-open-grades-"]'),
  );
  if (selectedGradesButtons < 1) {
    throw new SmokeFailure(
      "courses",
      "NO_SELECTED_GRADES_ENTRY",
      "No selected Canvas course exposed a Grades action.",
    );
  }

  const opened = await openSelectedCourseWithAssignments(page, trace);
  const initial = opened.initial;

  const summaryState = trace.latestSummaryWrappers();
  const assignmentState = trace.latestAssignmentSummary();
  const aggregateRows = await visibleLocatorCount(
    page.locator('[data-testid^="canvas-grade-assignment-"]'),
  );

  const idleMark = trace.mark();
  await page.waitForTimeout(5_000);
  const idle = trace.summarySince(idleMark);
  assertNoSyncPost(idle, "idle-wait");

  const reloadMark = trace.mark();
  await page.getByTestId(GRADE_TEST_IDS.reloadButton).click();
  await waitForGradesReady(page);
  const reload = trace.summarySince(reloadMark);
  assertNoSyncPost(reload, "reload");

  const detailMark = trace.mark();
  await page.locator('[data-testid^="canvas-grade-assignment-"]').first().click();
  await page.getByTestId(GRADE_TEST_IDS.detail).waitFor({
    state: "visible",
    timeout: GRADE_READY_TIMEOUT_MS,
  });
  const detail = trace.summarySince(detailMark);
  assertNoSyncPost(detail, "detail");
  const detailText = await page.locator("body").innerText();
  if (containsVisibleRawIdentifier(detailText)) {
    throw new SmokeFailure(
      "detail",
      "RAW_IDENTIFIER_VISIBLE",
      "Assignment detail exposed a raw identifier or URL.",
    );
  }
  await page.getByText("Back to grades", { exact: true }).click();
  await page.getByTestId(GRADE_TEST_IDS.assignmentList).waitFor({
    state: "visible",
    timeout: GRADE_READY_TIMEOUT_MS,
  });

  const failure = await runReloadFailureCheck(page, trace);
  const recoveryMark = trace.mark();
  await page.getByTestId(GRADE_TEST_IDS.reloadButton).click();
  await waitForGradesReady(page);
  const recovery = trace.summarySince(recoveryMark);
  assertNoSyncPost(recovery, "network-recovery");

  const syncMark = trace.mark();
  const syncButton = page.getByTestId(GRADE_TEST_IDS.syncButton);
  await syncButton.click();
  const duplicateDisabledObserved = await observeDisabled(syncButton);
  await page.waitForResponse(
    (response) => {
      const classified = classifyGradeApiRequest(
        response.url(),
        response.request().method(),
      );
      return classified?.label === "sync" && classified.method === "POST";
    },
    { timeout: SYNC_TIMEOUT_MS },
  );
  await waitForGradesReady(page);
  const sync = trace.summarySince(syncMark);
  if (sync.postSync !== 1) {
    throw new SmokeFailure(
      "sync",
      "SYNC_POST_COUNT_INVALID",
      `Expected one grade sync POST; observed ${sync.postSync}.`,
    );
  }

  trace.dispose();

  return {
    aggregateRows,
    assignmentState,
    detail,
    duplicateDisabledObserved,
    failure,
    initial,
    idle,
    reload,
    recovery,
    selectedGradesButtons,
    summaryState,
    sync,
    tracePrivacy: trace.privacySummary(),
  };
}

async function runReloadFailureCheck(page, trace) {
  const beforeRows = await visibleLocatorCount(
    page.locator('[data-testid^="canvas-grade-assignment-"]'),
  );
  await page.route("**/api/canvas/courses/**/grades**", async (route) => {
    const classified = classifyGradeApiRequest(route.request().url(), route.request().method());
    if (classified && classified.method === "GET") {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  const mark = trace.mark();
  await page.getByTestId(GRADE_TEST_IDS.reloadButton).click();
  await page.getByTestId(GRADE_TEST_IDS.warning).waitFor({
    state: "visible",
    timeout: GRADE_READY_TIMEOUT_MS,
  });
  const afterRows = await visibleLocatorCount(
    page.locator('[data-testid^="canvas-grade-assignment-"]'),
  );
  const summaryVisible = await page.getByTestId(GRADE_TEST_IDS.summary).isVisible();
  await page.unroute("**/api/canvas/courses/**/grades**");
  const requests = trace.summarySince(mark);
  assertNoSyncPost(requests, "reload-network-failure");
  return {
    existingRowsPreserved: beforeRows > 0 && afterRows === beforeRows,
    requests,
    summaryPreserved: summaryVisible,
    warningVisible: true,
  };
}

async function openSelectedCourseWithAssignments(page, trace) {
  const buttons = page.locator('[data-testid^="canvas-open-grades-"]');
  const count = await buttons.count();
  let lastInitial = null;

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    await button.scrollIntoViewIfNeeded().catch(() => {});
    if (!(await button.isVisible().catch(() => false))) {
      continue;
    }

    const initialMark = trace.mark();
    await button.click();
    await waitForGradesReady(page);
    const initial = trace.summarySince(initialMark);
    assertNoSyncPost(initial, "initial-mount");
    lastInitial = initial;

    const rows = await visibleLocatorCount(
      page.locator('[data-testid^="canvas-grade-assignment-"]'),
    );
    if (rows > 0) {
      return { initial, rows };
    }

    await page.getByText("Back to courses", { exact: true }).click();
    await openCourses(page);
  }

  throw new SmokeFailure(
    "grades",
    "NO_ASSIGNMENT_ROWS_RENDERED",
    `No selected course rendered assignment rows. Last initial GET list count: ${lastInitial?.getList ?? 0}.`,
  );
}

async function runFictionalEdgeFlow(page) {
  await openCourses(page);
  await page.route("**/api/canvas/courses/**/grades**", async (route) => {
    const request = route.request();
    const classified = classifyGradeApiRequest(request.url(), request.method());
    if (!classified) {
      await route.continue();
      return;
    }
    if (classified.method === "POST") {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          ok: true,
          assignmentSubmission: {
            assignmentCount: NORMALIZED_STATUSES.length,
            persistedCount: NORMALIZED_STATUSES.length,
            status: "succeeded",
            statusCounts: Object.fromEntries(
              NORMALIZED_STATUSES.map((status) => [status, status === "graded" ? 1 : 0]),
            ),
            submissionEvidenceCount: 3,
          },
          courseGradeSummary: {
            status: "succeeded",
            visibleFieldCount: 0,
          },
          lastCheckedAt: "2026-07-08T00:00:00.000Z",
          lastSuccessfulSyncAt: "2026-07-08T00:00:00.000Z",
          status: "succeeded",
        }),
      });
      return;
    }

    let body;
    if (classified.label === "sync-status") {
      body = { ok: true, sync: fictionalSyncStatus({ status: "partial", stale: true }) };
    } else if (classified.label === "summary") {
      body = buildFictionalSummaryResponse();
    } else if (classified.label === "detail") {
      body = buildFictionalDetailResponse();
    } else {
      const offset = Number(new URL(request.url()).searchParams.get("offset") ?? "0");
      body = buildFictionalListResponse({ offset });
    }
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify(body),
    });
  });

  await page.locator('[data-testid^="canvas-open-grades-"]').first().click();
  await waitForGradesReady(page);
  const firstPageRows = await visibleLocatorCount(
    page.locator('[data-testid^="canvas-grade-assignment-"]'),
  );
  const statusTexts = await page.locator("body").innerText();
  const statusesRendered = NORMALIZED_STATUSES.every((status) =>
    statusTexts.includes(statusLabel(status)),
  );
  const loadMoreVisible = await page
    .getByTestId(GRADE_TEST_IDS.loadMoreButton)
    .isVisible()
    .catch(() => false);
  if (loadMoreVisible) {
    await page.getByTestId(GRADE_TEST_IDS.loadMoreButton).click();
    await page.waitForTimeout(750);
  }
  const afterLoadMoreRows = await visibleLocatorCount(
    page.locator('[data-testid^="canvas-grade-assignment-"]'),
  );
  const summaryText = await page.getByTestId(GRADE_TEST_IDS.summary).innerText();

  await page.locator('[data-testid^="canvas-grade-assignment-"]').first().click();
  await page.getByTestId(GRADE_TEST_IDS.detail).waitFor({
    state: "visible",
    timeout: GRADE_READY_TIMEOUT_MS,
  });
  const detailVisible = await page.getByTestId(GRADE_TEST_IDS.detail).isVisible();
  await page.unroute("**/api/canvas/courses/**/grades**");

  return {
    detailVisible,
    duplicateSkipped: afterLoadMoreRows === firstPageRows + 1,
    firstPageRows,
    loadMoreVisible,
    statusLabelsRendered: statusesRendered,
    summaryRenderedHiddenUnknownUnavailable:
      summaryText.includes("Score hidden in Canvas") &&
      summaryText.includes("Canvas has not provided a visible grade") &&
      summaryText.includes("Score unavailable") &&
      summaryText.includes("Not applicable"),
  };
}

function createGradeRequestTrace(page, secrets) {
  const events = [];
  let forbiddenKeyCount = 0;
  let wrapperViolationCount = 0;
  let latestSummary = null;
  let latestList = null;

  const onRequest = (request) => {
    const classified = classifyGradeApiRequest(request.url(), request.method());
    if (!classified) {
      return;
    }
    events.push({
      bodyPresent: Boolean(request.postData()),
      label: classified.label,
      method: classified.method,
      phase: "request",
      time: Date.now(),
    });
  };
  const onResponse = async (response) => {
    const classified = classifyGradeApiRequest(
      response.url(),
      response.request().method(),
    );
    if (!classified) {
      return;
    }
    const event = {
      cacheControl: response.headers()["cache-control"] ?? null,
      label: classified.label,
      method: classified.method,
      phase: "response",
      status: response.status(),
      time: Date.now(),
    };
    events.push(event);
    if (classified.method === "GET" && response.status() < 500) {
      try {
        const body = await response.json();
        forbiddenKeyCount += scanForbiddenKeys(body).length;
        wrapperViolationCount += scanVisibilityWrapperViolations(body).length;
        if (classified.label === "summary") {
          latestSummary = summarizeSummaryWrappers(body);
        }
        if (classified.label === "list") {
          latestList = summarizeAssignmentList(body);
        }
      } catch (error) {
        events.push({
          label: classified.label,
          message: redactSensitive(error?.message ?? String(error), secrets),
          method: classified.method,
          phase: "parse-failed",
          time: Date.now(),
        });
      }
    }
  };

  page.on("request", onRequest);
  page.on("response", onResponse);

  return {
    dispose() {
      page.off("request", onRequest);
      page.off("response", onResponse);
    },
    latestAssignmentSummary() {
      return latestList;
    },
    latestSummaryWrappers() {
      return latestSummary;
    },
    mark() {
      return events.length;
    },
    privacySummary() {
      return {
        forbiddenKeyCount,
        wrapperViolationCount,
      };
    },
    summarySince(mark) {
      return summarizeTraceEvents(events.slice(mark));
    },
  };
}

export function summarizeTraceEvents(events) {
  const requestEvents = events.filter((event) => event.phase === "request");
  return {
    getDetail: requestEvents.filter(
      (event) => event.method === "GET" && event.label === "detail",
    ).length,
    getList: requestEvents.filter(
      (event) => event.method === "GET" && event.label === "list",
    ).length,
    getSummary: requestEvents.filter(
      (event) => event.method === "GET" && event.label === "summary",
    ).length,
    getSyncStatus: requestEvents.filter(
      (event) => event.method === "GET" && event.label === "sync-status",
    ).length,
    postSync: requestEvents.filter(
      (event) => event.method === "POST" && event.label === "sync",
    ).length,
    syncPostBodyPresent: requestEvents.some(
      (event) =>
        event.method === "POST" && event.label === "sync" && event.bodyPresent,
    ),
  };
}

async function openCourses(page) {
  if (!(await page.getByTestId(GRADE_TEST_IDS.coursesScreen).isVisible().catch(() => false))) {
    if (await page.getByText("Back to courses", { exact: true }).isVisible().catch(() => false)) {
      await page.getByText("Back to courses", { exact: true }).click();
    } else if (
      await page.getByText("Back to grades", { exact: true }).isVisible().catch(() => false)
    ) {
      await page.getByText("Back to grades", { exact: true }).click();
      await page.getByText("Back to courses", { exact: true }).click();
    } else if (
      await page.getByTestId(GRADE_TEST_IDS.coursesOpenButton).isVisible().catch(() => false)
    ) {
      await page.getByTestId(GRADE_TEST_IDS.coursesOpenButton).click();
    }
  }
  await page.getByTestId(GRADE_TEST_IDS.coursesScreen).waitFor({
    state: "visible",
    timeout: PAGE_READY_TIMEOUT_MS,
  });
  await page.getByTestId(GRADE_TEST_IDS.canvasConnectedState).waitFor({
    state: "visible",
    timeout: PAGE_READY_TIMEOUT_MS,
  });
}

async function waitForGradesReady(page) {
  await page.getByTestId(GRADE_TEST_IDS.gradesScreen).waitFor({
    state: "visible",
    timeout: PAGE_READY_TIMEOUT_MS,
  });
  await Promise.race([
    page.getByTestId(GRADE_TEST_IDS.assignmentList).waitFor({
      state: "visible",
      timeout: GRADE_READY_TIMEOUT_MS,
    }),
    page.getByTestId(GRADE_TEST_IDS.neverSynced).waitFor({
      state: "visible",
      timeout: GRADE_READY_TIMEOUT_MS,
    }),
    page.getByTestId(GRADE_TEST_IDS.empty).waitFor({
      state: "visible",
      timeout: GRADE_READY_TIMEOUT_MS,
    }),
    page.getByTestId(GRADE_TEST_IDS.initialError).waitFor({
      state: "visible",
      timeout: GRADE_READY_TIMEOUT_MS,
    }),
  ]);
}

async function observeDisabled(locator) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const disabled = await locator
      .evaluate((element) => {
        const ariaDisabled = element.getAttribute("aria-disabled");
        return ariaDisabled === "true" || element.hasAttribute("disabled");
      })
      .catch(() => false);
    if (disabled) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

function assertNoSyncPost(summary, step) {
  if (summary.postSync !== 0) {
    throw new SmokeFailure(
      step,
      "UNEXPECTED_SYNC_POST",
      `Expected no grade sync POST during ${step}; observed ${summary.postSync}.`,
    );
  }
}

async function launchCanvasGradesBrowser(options) {
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
      "Playwright Chromium could not be launched.",
      { cause: error },
    );
  }
}

async function loadLocalEnv() {
  for (const file of [".env.local", ".env", ".env.smoke.local"]) {
    try {
      const parsed = dotenv.parse(
        await fs.readFile(path.join(ROOT_DIR, file), "utf8"),
      );
      for (const [key, value] of Object.entries(parsed)) {
        process.env[key] ??= value;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
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

function fictionalAssignment({ id, index, normalizedStatus }) {
  const dueAt = normalizedStatus === "no_due_date"
    ? null
    : "2026-07-08T00:00:00.000Z";
  return {
    assignmentVisible: normalizedStatus !== "unavailable",
    attempt: index % 3 === 0 ? 1 : null,
    dueAt,
    excused: normalizedStatus === "excused",
    grade:
      normalizedStatus === "graded"
        ? { state: "visible", value: "Complete" }
        : normalizedStatus === "graded_hidden"
          ? { state: "hidden", value: null }
          : { state: "unknown", value: null },
    gradedAt: normalizedStatus === "graded" ? "2026-07-08T00:00:00.000Z" : null,
    gradingType: "points",
    id,
    lastSyncedAt: "2026-07-08T00:00:00.000Z",
    late: normalizedStatus === "submitted_late" || normalizedStatus === "late_unsubmitted",
    lockAt: null,
    missing: normalizedStatus === "missing",
    normalizedStatus,
    pointsPossible: 10,
    score:
      normalizedStatus === "graded"
        ? { state: "visible", value: 8 }
        : normalizedStatus === "graded_hidden"
          ? { state: "hidden", value: null }
          : { state: "unknown", value: null },
    submittedAt:
      normalizedStatus === "submitted" || normalizedStatus === "submitted_late"
        ? "2026-07-08T00:00:00.000Z"
        : null,
    submissionTypes: ["online_text_entry"],
    title: `Fictional assignment ${index + 1}`,
    unlockAt: null,
    workflowState: normalizedStatus === "submitted" ? "submitted" : "unsubmitted",
  };
}

function fictionalSyncStatus({ status = "succeeded", stale = false } = {}) {
  return {
    assignmentSubmissionState: status === "partial" ? "partial" : "succeeded",
    authoritativeAssignmentSubmission: true,
    courseGradeSummaryState: status === "partial" ? "partial" : "succeeded",
    failureCode: status === "failed" ? "canvas_unavailable" : null,
    lastCheckedAt: "2026-07-08T00:00:00.000Z",
    lastSuccessfulSyncAt: status === "failed" ? null : "2026-07-08T00:00:00.000Z",
    stale,
    status,
  };
}

function classifyWrapper(wrapper) {
  if (!wrapper || typeof wrapper.state !== "string") {
    return "unknown";
  }
  return wrapper.state;
}

function containsVisibleRawIdentifier(text) {
  return (
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(text) ||
    /https?:\/\//i.test(text)
  );
}

function statusLabel(status) {
  return {
    available: "Available",
    excused: "Excused",
    graded: "Graded",
    graded_hidden: "Grade hidden",
    late_unsubmitted: "Late, submission unclear",
    locked: "Locked",
    missing: "Missing",
    no_due_date: "No due date",
    submitted: "Submitted",
    submitted_late: "Submitted late",
    unavailable: "Unavailable",
    unknown: "Unknown",
    upcoming: "Upcoming",
  }[status];
}

async function visibleLocatorCount(locator) {
  const count = await locator.count().catch(() => 0);
  let visible = 0;
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) {
      visible += 1;
    }
  }
  return visible;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSmokeFailure(error) {
  if (error instanceof SmokeFailure) {
    return error;
  }
  return new SmokeFailure(
    "unknown",
    "UNEXPECTED_ERROR",
    redactSensitive(error?.message ?? String(error)),
    { cause: error },
  );
}

async function saveSafeDiagnostics(failure) {
  await fs.mkdir(DIAGNOSTICS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DIAGNOSTICS_DIR, "safe-diagnostics.json"),
    `${JSON.stringify(
      sanitizeDiagnostics({
        code: failure.code,
        message: failure.message,
        step: failure.step,
      }),
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function printSuccess(result) {
  console.log("PASS canvas-grades-web smoke");
  console.log(`API: ${result.apiOwnership}`);
  console.log(`Expo Web: ${result.expoOwnership}`);
  console.log(`Authentication: ${result.authenticationMode}`);
  if (result.live) {
    console.log(`Selected grade entries: ${result.live.selectedGradesButtons}`);
    console.log(`Initial POST sync count: ${result.live.initial.postSync}`);
    console.log(`Idle POST sync count: ${result.live.idle.postSync}`);
    console.log(`Reload POST sync count: ${result.live.reload.postSync}`);
    console.log(`Sync POST count: ${result.live.sync.postSync}`);
    console.log(`Post-sync GET count: ${result.live.sync.getSyncStatus + result.live.sync.getSummary + result.live.sync.getList}`);
    console.log(`Assignment rows rendered: ${result.live.aggregateRows}`);
    console.log(`Detail GET count: ${result.live.detail.getDetail}`);
    console.log(`Network warning: ${result.live.failure.warningVisible ? "visible" : "missing"}`);
    console.log(`Network rows preserved: ${result.live.failure.existingRowsPreserved ? "passed" : "failed"}`);
    console.log(`Forbidden response keys: ${result.live.tracePrivacy.forbiddenKeyCount}`);
    console.log(`Wrapper violations: ${result.live.tracePrivacy.wrapperViolationCount}`);
    console.log(`Duplicate sync disabled observed: ${result.live.duplicateDisabledObserved ? "passed" : "not-observed"}`);
    console.log(`Summary wrappers: ${JSON.stringify(result.live.summaryState)}`);
    console.log(`Observed statuses: ${(result.live.assignmentState?.statuses ?? []).join(",") || "none"}`);
  }
  console.log(`Fictional edge statuses: ${result.fictional.statusLabelsRendered ? "passed" : "failed"}`);
  console.log(`Fictional load more: ${result.fictional.duplicateSkipped ? "passed" : "failed"}`);
  console.log(`Fictional wrapper rendering: ${result.fictional.summaryRenderedHiddenUnknownUnavailable ? "passed" : "failed"}`);
  console.log(
    `Cleanup: ${result.cleanup.succeeded ? "passed" : "failed"} (${result.cleanup.stopped} stopped, ${result.cleanup.kept} kept)`,
  );
}

async function printFailure(failure, cleanup) {
  await saveSafeDiagnostics(failure).catch(() => {});
  console.error("FAIL canvas-grades-web smoke");
  console.error(`Failed step: ${failure.step}`);
  console.error(`Code: ${failure.code}`);
  console.error(redactSensitive(failure.message));
  console.error(
    `Cleanup: ${cleanup.succeeded ? "succeeded" : "failed"} (${cleanup.stopped} stopped, ${cleanup.kept} kept)`,
  );
}

function printHelp() {
  console.log(`Usage: npm run smoke:canvas-grades:web -- [options]

Options:
  --edge-only       Run only fictional deterministic edge validation.
  --headed          Show the Chromium window.
  --keep-services   Leave services started by this command running.
  --session-only    Use only an existing smoke browser session.
  --help            Show this help.
`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("FAIL canvas-grades-web smoke");
    console.error("Failed step: fatal");
    console.error("Code: UNEXPECTED_ERROR");
    console.error(redactSensitive(error?.message ?? String(error)));
    process.exitCode = 1;
  });
}
