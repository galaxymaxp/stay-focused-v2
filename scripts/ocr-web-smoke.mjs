#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import {
  API_BASE_URL,
  EXPO_WEB_URL,
  SMOKE_ENV_FILE,
  SMOKE_SOURCE_TITLE,
  TEST_IDS,
  SmokeFailure,
  assertCanAttemptAuthentication,
  cleanupStartedServices,
  createReviewerPostObserver,
  ensureApiService,
  ensureAuthenticated,
  ensureExpoWebService,
  ensureReviewerCorsPreflight,
  hasPersistedSessionCandidate,
  inspectReviewerOutput,
  installTerminationHandlers,
  launchPersistentBrowser,
  loadSmokeCredentialState,
  parseArgs,
  redactSensitive,
  toSmokeFailure,
  validateCorsPreflightResponse,
  verifyNoForbiddenResultErrors,
  waitForReviewerResult,
} from "./reviewer-web-smoke.mjs";

const OCR_EXTRACT_URL = `${API_BASE_URL}/api/ocr/extract`;
const OCR_SMOKE_URL = `${EXPO_WEB_URL}?ocrSmoke=1`;
const OCR_RESULT_TIMEOUT_MS = 30_000;
const OCR_FIXTURE_TEXT = [
  "STUDY HABITS",
  "",
  "Set one clear goal before studying.",
  "Turn off notifications.",
  "Review notes after a short break.",
  "Check understanding without looking at the notes.",
].join("\n");
const EDITED_OCR_TEXT = `${OCR_FIXTURE_TEXT}\nConfirm one answer out loud.`;

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error("FAIL ocr-web smoke");
    console.error("Failed step: cli");
    console.error(`Code: ${error.code ?? "INVALID_ARGUMENT"}`);
    console.error(redactSensitive(error.message));
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    console.log(`Usage: npm run smoke:ocr:web -- [options]

Runs the Expo Web OCR intake flow with a mocked OCR API response and real reviewer generation.
Options are the same as smoke:reviewer:web.`);
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
    credentialState = await loadSmokeCredentialState({
      env: process.env,
      envFilePath: SMOKE_ENV_FILE,
      sessionOnly: options.sessionOnly,
    });

    assertCanAttemptAuthentication({
      credentialState,
      hasSessionCandidate: await hasPersistedSessionCandidate(),
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
    await ensureOcrCorsPreflight({ apiOwnership, expoOwnership });

    context = await launchPersistentBrowser(options);
    smokeResult = await runOcrBrowserSmoke(context, {
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
      printFailure(pendingFailure, cleanupResult, {
        apiOwnership,
        expoOwnership,
      });
    } else if (smokeResult) {
      printSuccess({
        apiOwnership,
        cleanupResult,
        expoOwnership,
        ...smokeResult,
      });
    }
  }
}

async function ensureOcrCorsPreflight({ apiOwnership, expoOwnership }) {
  const response = await fetch(OCR_EXTRACT_URL, {
    headers: {
      "Access-Control-Request-Headers": "authorization, content-type",
      "Access-Control-Request-Method": "POST",
      Origin: EXPO_WEB_URL,
    },
    method: "OPTIONS",
  }).catch(() => null);

  const result = response
    ? validateCorsPreflightResponse({
        expectedOrigin: EXPO_WEB_URL,
        headers: response.headers,
        status: response.status,
      })
    : {
        invalidHeaders: ["request"],
        missingHeaders: [],
        ok: false,
        status: undefined,
      };

  if (!result.ok) {
    throw new SmokeFailure(
      "ocr-cors-preflight",
      "OCR_CORS_PREFLIGHT_FAILED",
      [
        `OCR preflight failed for ${OCR_EXTRACT_URL}.`,
        `Missing: ${result.missingHeaders.join(", ") || "none"}.`,
        `Invalid: ${result.invalidHeaders.join(", ") || "none"}.`,
      ].join(" "),
      {
        apiOwnership,
        expoOrigin: EXPO_WEB_URL,
        expoOwnership,
        invalidHeaders: result.invalidHeaders,
        missingHeaders: result.missingHeaders,
        status: result.status,
      },
    );
  }

  return result;
}

async function runOcrBrowserSmoke(context, { credentialState, sessionOnly }) {
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(15_000);

  const ocrRequest = createOcrRequestMock(page);

  await page.goto(OCR_SMOKE_URL, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });

  const auth = await ensureAuthenticated(page, {
    credentialState,
    sessionOnly,
  });

  await page.getByTestId(TEST_IDS.reviewerGenerateScreen).waitFor({
    state: "visible",
    timeout: 60_000,
  });

  await page.getByTestId(TEST_IDS.reviewerTitleInput).fill("");
  await page.getByTestId(TEST_IDS.reviewerTitleInput).fill(SMOKE_SOURCE_TITLE);
  await page.getByTestId("reviewer-source-mode-image").click();
  await page.getByTestId("reviewer-ocr-smoke-fixture-button").click();
  await page.getByTestId("reviewer-image-preview").waitFor({ state: "visible" });
  await page.getByTestId("reviewer-image-name").waitFor({ state: "visible" });

  await page.getByTestId("reviewer-extract-text-button").click();
  await page.getByTestId("reviewer-ocr-loading").waitFor({ state: "visible" });
  await waitForOcrReady(page, ocrRequest);

  const sourceInput = page.getByTestId(TEST_IDS.reviewerSourceInput);
  await expectInputValueContains(sourceInput, "STUDY HABITS");
  await sourceInput.fill(EDITED_OCR_TEXT);
  await expectInputValueContains(sourceInput, "Confirm one answer out loud.");

  const reviewerRequest = createReviewerPostObserver(page);
  await page.getByTestId(TEST_IDS.reviewerGenerateButton).click({ force: true });
  await waitForReviewerResult(page, reviewerRequest);

  const reviewerState = reviewerRequest.getState();
  const reviewerStatus = reviewerState.status;
  if (
    reviewerStatus === undefined ||
    reviewerStatus >= 400 ||
    reviewerState.failureCategory
  ) {
    throw new SmokeFailure(
      "reviewer-post",
      "REVIEWER_POST_FAILED",
      reviewerStatus === undefined
        ? "Reviewer Ready rendered, but the reviewer POST response was not observed."
        : `Reviewer POST returned HTTP ${reviewerStatus}.`,
      {
        failureCategory: reviewerState.failureCategory,
        status: reviewerStatus,
      },
    );
  }

  await verifyNoForbiddenResultErrors(page);
  const inspection = await inspectReviewerOutput(page, reviewerStatus);
  const reviewer = validateOcrReviewerInspection(inspection);
  reviewerRequest.dispose();
  await ocrRequest.dispose();

  return {
    authenticationMode: auth.mode,
    cleanOutputPassed: reviewer.cleanOutputPassed,
    coveragePassed: reviewer.coveragePassed,
    editedTextConfirmed: true,
    explanationNonempty: reviewer.explanationNonempty,
    ocrMultipartObserved: ocrRequest.getState().multipartObserved,
    ocrStatus: ocrRequest.getState().status,
    reviewerStatus,
    sectionCount: reviewer.sectionCount,
    sessionPersisted: await hasPersistedSessionCandidate(),
    sourceFaithfulPassed: reviewer.sourceFaithfulPassed,
    visibleKeyPointCount: reviewer.visibleKeyPointCount,
  };
}

function validateOcrReviewerInspection(inspection) {
  const sourceFaithfulPassed = statusTextPassed(inspection.sourceFaithfulText);
  const coveragePassed = statusTextPassed(inspection.coverageText);
  const cleanOutputPassed = statusTextPassed(inspection.cleanOutputText);
  const titleIncludesSource = String(inspection.titleText ?? "")
    .toLowerCase()
    .includes(SMOKE_SOURCE_TITLE.toLowerCase());

  if (
    !inspection.readyVisible ||
    !titleIncludesSource ||
    inspection.sectionCount < 1 ||
    inspection.visibleKeyPointCount < 1 ||
    !sourceFaithfulPassed ||
    !coveragePassed ||
    !cleanOutputPassed ||
    inspection.visibleErrorText
  ) {
    throw new SmokeFailure(
      "result-validation",
      "REVIEWER_PREVIEW_NOT_RENDERED",
      "Reviewer Ready rendered, but the OCR reviewer result did not satisfy the smoke assertions.",
      {
        cleanOutputPassed,
        coveragePassed,
        readyVisible: inspection.readyVisible,
        reviewerPostStatus: inspection.reviewerPostStatus,
        sectionCount: inspection.sectionCount,
        sourceFaithfulPassed,
        titleIncludesSource,
        visibleErrorText: inspection.visibleErrorText,
        visibleKeyPointCount: inspection.visibleKeyPointCount,
      },
    );
  }

  return {
    cleanOutputPassed,
    coveragePassed,
    explanationNonempty: inspection.explanationTexts.some(
      (text) => text.trim().length > 0,
    ),
    sectionCount: inspection.sectionCount,
    sourceFaithfulPassed,
    visibleKeyPointCount: inspection.visibleKeyPointCount,
  };
}

function createOcrRequestMock(page) {
  const state = {
    authorizationObserved: false,
    failureCategory: undefined,
    method: undefined,
    multipartObserved: false,
    occurred: false,
    status: undefined,
  };

  const routePromise = page.route("**/api/ocr/extract", async (route, request) => {
    state.occurred = true;
    state.method = request.method();
    state.authorizationObserved = request.headers().authorization?.startsWith(
      "Bearer ",
    ) ?? false;
    state.multipartObserved =
      request.headers()["content-type"]?.includes("multipart/form-data") ?? false;

    if (request.method() !== "POST") {
      state.status = 405;
      await route.fulfill({
        contentType: "application/json",
        status: 405,
        body: JSON.stringify({
          ok: false,
          error: { code: "invalid_request", message: "Expected POST." },
        }),
      });
      return;
    }

    state.status = 200;
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        ok: true,
        data: {
          text: OCR_FIXTURE_TEXT,
          pages: [],
          mimeType: "image/png",
          provider: "mocked-browser-ocr",
          warnings: [],
        },
      }),
    });
  });

  return {
    async dispose() {
      await routePromise.catch(() => {});
      await page.unroute("**/api/ocr/extract").catch(() => {});
    },
    getState() {
      return { ...state };
    },
  };
}

async function waitForOcrReady(page, ocrRequest) {
  const deadline = Date.now() + OCR_RESULT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await page.getByTestId("reviewer-ocr-ready").isVisible().catch(() => false)) {
      const state = ocrRequest.getState();
      if (!state.occurred || state.status !== 200) {
        throw new SmokeFailure(
          "ocr-post",
          "OCR_POST_NOT_OBSERVED",
          "The OCR ready state rendered, but the OCR POST was not observed.",
          { status: state.status },
        );
      }
      if (!state.authorizationObserved || !state.multipartObserved) {
        throw new SmokeFailure(
          "ocr-post",
          "OCR_POST_INVALID_REQUEST",
          "The OCR POST did not include the expected auth or multipart request shape.",
          state,
        );
      }
      return;
    }

    const error = await page.getByTestId("reviewer-ocr-error").isVisible().catch(
      () => false,
    );
    if (error) {
      throw new SmokeFailure(
        "ocr-ui",
        "OCR_ERROR_VISIBLE",
        await page.getByTestId("reviewer-ocr-error").innerText(),
        { status: ocrRequest.getState().status },
      );
    }

    await delay(250);
  }

  throw new SmokeFailure(
    "ocr-ui",
    "OCR_READY_TIMEOUT",
    "Timed out waiting for OCR extracted text.",
    { status: ocrRequest.getState().status },
  );
}

async function expectInputValueContains(locator, expected) {
  const value = await locator.inputValue();
  if (!value.includes(expected)) {
    throw new SmokeFailure(
      "ocr-ui",
      "OCR_TEXT_NOT_EDITABLE",
      `Expected source input to contain "${expected}".`,
    );
  }
}

function printSuccess(result) {
  console.log("PASS ocr-web smoke");
  console.log(`API: ${result.apiOwnership}`);
  console.log("API health: passed");
  console.log("Reviewer CORS preflight: passed");
  console.log("OCR CORS preflight: passed");
  console.log(`Expo Web: ${result.expoOwnership}`);
  console.log(`Expo URL: ${OCR_SMOKE_URL}`);
  console.log(`Authentication: ${result.authenticationMode}`);
  console.log(`OCR POST: HTTP ${result.ocrStatus}`);
  console.log(
    `OCR multipart/auth: ${
      result.ocrMultipartObserved ? "observed" : "not observed"
    }`,
  );
  console.log("Extracted text: visible and editable");
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
  console.log("Live Google OCR: not exercised; OCR response was mocked.");
}

function printFailure(failure, cleanupResult, ownership) {
  console.error(
    failure.code === "AUTH_REQUIRED" ? "AUTH_REQUIRED ocr-web smoke" : "FAIL ocr-web smoke",
  );
  console.error(`Failed step: ${failure.step}`);
  console.error(`Code: ${failure.code}`);
  if (failure.status !== undefined) {
    console.error(`HTTP status: ${failure.status}`);
  }
  console.error(`API: ${API_BASE_URL} (${failure.apiOwnership ?? ownership.apiOwnership})`);
  console.error(
    `Expo Web: ${EXPO_WEB_URL} (${failure.expoOwnership ?? ownership.expoOwnership})`,
  );
  console.error(
    `Cleanup: ${cleanupResult.succeeded ? "succeeded" : "failed"} (${cleanupResult.stopped} stopped, ${cleanupResult.kept} kept)`,
  );
  console.error(redactSensitive(failure.message));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusTextPassed(value) {
  return /\bPassed\b/i.test(String(value ?? ""));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("FAIL ocr-web smoke");
    console.error("Failed step: fatal");
    console.error("Code: UNEXPECTED_ERROR");
    console.error(redactSensitive(error?.message ?? String(error)));
    process.exitCode = 1;
  });
}
