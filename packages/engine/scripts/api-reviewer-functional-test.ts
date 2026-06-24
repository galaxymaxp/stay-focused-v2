import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const REVIEWER_GENERATE_ROUTE = "/api/reviewer/generate";
const SOURCE_TITLE = "OCR Functional Timeout Test";
const FIXTURE_FILE_NAME = "ocr-extracted-general-lecture.txt";
const TIMEOUT_MS = 120_000;

const FIXTURE_PATH = resolvePackagePath("scripts", "fixtures", FIXTURE_FILE_NAME);
const OUTPUT_JSON_PATH = resolveRepoPath(
  "docs",
  "ai",
  "api-reviewer-functional-output.json",
);
const OUTPUT_AUDIT_PATH = resolveRepoPath(
  "docs",
  "ai",
  "api-reviewer-functional-audit.md",
);

interface ValidationFailure {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

interface ApiBaseUrlResult {
  readonly value: string | null;
  readonly source: "API_BASE_URL" | "EXPO_PUBLIC_API_BASE_URL" | null;
  readonly present: boolean;
}

type SupabaseTokenSource = "manual_fallback" | "minted_email_password";

interface SupabaseAccessTokenResult {
  readonly value: string;
  readonly source: SupabaseTokenSource;
}

interface SupabaseSignInConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly email: string;
  readonly password: string;
}

interface ResponseCapture {
  readonly status: number;
  readonly statusText: string;
  readonly validJson: boolean;
  readonly json?: unknown;
  readonly textPreview?: string;
}

interface ReviewerSummary {
  readonly title: string;
  readonly sectionCount: number;
  readonly coverageStatus?: string;
  readonly groundingStatus?: string;
  readonly leakageStatus?: string;
}

interface FunctionalTestOutput {
  readonly ok: boolean;
  readonly generatedAt: string;
  readonly completedAt: string;
  readonly pathRecreated: string;
  readonly route: string;
  readonly timeoutMs: number;
  readonly requestDurationMs: number | null;
  readonly env: {
    readonly apiBaseUrlSource: string | null;
    readonly apiBaseUrlPresent: boolean;
    readonly supabaseTokenSource: SupabaseTokenSource | null;
  };
  readonly fixture: {
    readonly path: string;
    readonly characters: number | null;
  };
  readonly request: {
    readonly sourceTitle: string;
    readonly sourceTextCharacters: number | null;
  };
  readonly response: ResponseCapture | null;
  readonly reviewerSummary: ReviewerSummary | null;
  readonly validation: {
    readonly passed: boolean;
    readonly failures: readonly ValidationFailure[];
  };
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const failures: ValidationFailure[] = [];
  let requestDurationMs: number | null = null;
  let response: ResponseCapture | null = null;
  let reviewerSummary: ReviewerSummary | null = null;

  const apiBaseUrl = readApiBaseUrl(failures);
  const supabaseAccessToken = await readSupabaseAccessToken(failures);
  const fixtureText = await readFixtureText(failures);

  if (apiBaseUrl.value && supabaseAccessToken && fixtureText !== null) {
    const result = await sendReviewerRequest({
      apiBaseUrl: apiBaseUrl.value,
      accessToken: supabaseAccessToken.value,
      sourceText: fixtureText,
      failures,
    });

    requestDurationMs = result.durationMs;
    response = result.response;

    if (response?.validJson && response.status === 200) {
      reviewerSummary = validateReviewerResponse(response, failures);
    }
  }

  const output: FunctionalTestOutput = {
    ok: failures.length === 0,
    generatedAt,
    completedAt: new Date().toISOString(),
    pathRecreated:
      "OCR fixture text -> mobile-shaped authenticated POST -> /api/reviewer/generate -> engine pipeline -> API reviewer response",
    route: REVIEWER_GENERATE_ROUTE,
    timeoutMs: TIMEOUT_MS,
    requestDurationMs,
    env: {
      apiBaseUrlSource: apiBaseUrl.source,
      apiBaseUrlPresent: apiBaseUrl.present,
      supabaseTokenSource: supabaseAccessToken?.source ?? null,
    },
    fixture: {
      path: FIXTURE_PATH,
      characters: fixtureText?.length ?? null,
    },
    request: {
      sourceTitle: SOURCE_TITLE,
      sourceTextCharacters: fixtureText?.length ?? null,
    },
    response,
    reviewerSummary,
    validation: {
      passed: failures.length === 0,
      failures,
    },
  };

  await writeOutputFiles(output);
  printDiagnostics(output);

  if (!output.ok) {
    process.exitCode = 1;
  }
}

function readApiBaseUrl(failures: ValidationFailure[]): ApiBaseUrlResult {
  const candidates: readonly ApiBaseUrlResult[] = [
    {
      source: "API_BASE_URL",
      value: process.env.API_BASE_URL?.trim() ?? "",
      present: Boolean(process.env.API_BASE_URL?.trim()),
    },
    {
      source: "EXPO_PUBLIC_API_BASE_URL",
      value: process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "",
      present: Boolean(process.env.EXPO_PUBLIC_API_BASE_URL?.trim()),
    },
  ];

  const selected = candidates.find(
    (candidate): candidate is ApiBaseUrlResult & { readonly value: string } =>
      Boolean(candidate.value),
  );
  if (!selected) {
    failures.push({
      code: "missing_api_base_url",
      message: "Set API_BASE_URL or EXPO_PUBLIC_API_BASE_URL.",
    });
    return { source: null, value: null, present: false };
  }

  const normalized = selected.value.replace(/\/+$/, "");
  if (!isHttpUrl(normalized)) {
    failures.push({
      code: "invalid_api_base_url",
      message: `${selected.source} must be a valid HTTP(S) origin or base URL without query or hash.`,
    });
    return { source: selected.source, value: null, present: true };
  }

  return { source: selected.source, value: normalized, present: true };
}

async function readSupabaseAccessToken(
  failures: ValidationFailure[],
): Promise<SupabaseAccessTokenResult | null> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim() ?? "";
  if (token) {
    return { value: token, source: "manual_fallback" };
  }

  const config = readSupabaseSignInConfig(failures);
  if (!config) {
    return null;
  }

  return mintSupabaseAccessToken(config, failures);
}

function readSupabaseSignInConfig(
  failures: ValidationFailure[],
): SupabaseSignInConfig | null {
  const required = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "",
    EXPO_PUBLIC_SUPABASE_ANON_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
    TEST_SUPABASE_EMAIL: process.env.TEST_SUPABASE_EMAIL?.trim() ?? "",
    TEST_SUPABASE_PASSWORD: process.env.TEST_SUPABASE_PASSWORD ?? "",
  } as const;

  const missing = Object.entries(required)
    .filter(([, value]) => value.length === 0)
    .map(([name]) => name);

  if (missing.length > 0) {
    failures.push({
      code: "missing_supabase_sign_in_env",
      message: `Missing required Supabase sign-in env vars: ${missing.join(", ")}.`,
    });
    return null;
  }

  const supabaseUrl = required.EXPO_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  if (!isHttpUrl(supabaseUrl)) {
    failures.push({
      code: "invalid_supabase_url",
      message: "EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL without query or hash.",
    });
    return null;
  }

  const email = required.TEST_SUPABASE_EMAIL.toLowerCase();
  if (!isValidEmail(email)) {
    failures.push({
      code: "invalid_test_supabase_email",
      message: "TEST_SUPABASE_EMAIL must be a valid email address.",
    });
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey: required.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    email,
    password: required.TEST_SUPABASE_PASSWORD,
  };
}

async function mintSupabaseAccessToken(
  config: SupabaseSignInConfig,
  failures: ValidationFailure[],
): Promise<SupabaseAccessTokenResult | null> {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: false,
    },
  });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: config.email,
      password: config.password,
    });

    if (error) {
      failures.push({
        code: "supabase_sign_in_failed",
        message: "Supabase email/password sign-in failed.",
        ...(error.status ? { details: { status: error.status } } : {}),
      });
      return null;
    }

    const accessToken = data.session?.access_token?.trim() ?? "";
    if (!accessToken) {
      failures.push({
        code: "supabase_session_token_missing",
        message: "Supabase email/password sign-in did not return a session access token.",
      });
      return null;
    }

    return { value: accessToken, source: "minted_email_password" };
  } catch {
    failures.push({
      code: "supabase_sign_in_request_failed",
      message:
        "Supabase email/password sign-in request failed before a session was returned.",
    });
    return null;
  }
}

async function readFixtureText(
  failures: ValidationFailure[],
): Promise<string | null> {
  try {
    const text = (await readFile(FIXTURE_PATH, "utf8")).trim();
    if (text.length === 0) {
      failures.push({
        code: "empty_fixture",
        message: `Fixture ${FIXTURE_PATH} is empty.`,
      });
      return null;
    }

    return text;
  } catch (error) {
    failures.push({
      code: "fixture_read_failed",
      message: `Could not read fixture ${FIXTURE_PATH}.`,
      details: errorMessage(error),
    });
    return null;
  }
}

async function sendReviewerRequest(args: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly sourceText: string;
  readonly failures: ValidationFailure[];
}): Promise<{ readonly durationMs: number; readonly response: ResponseCapture | null }> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  const startedAt = Date.now();
  try {
    const httpResponse = await fetch(
      `${args.apiBaseUrl}${REVIEWER_GENERATE_ROUTE}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceTitle: SOURCE_TITLE,
          sourceText: args.sourceText,
        }),
        signal: controller.signal,
      },
    );
    const durationMs = Date.now() - startedAt;
    const capturedResponse = await captureResponse(httpResponse);

    if (!capturedResponse.validJson) {
      args.failures.push({
        code: "invalid_json_response",
        message: "Reviewer API response body was not valid JSON.",
        details: {
          status: capturedResponse.status,
          textPreview: capturedResponse.textPreview,
        },
      });
    }

    if (capturedResponse.status !== 200) {
      args.failures.push({
        code: "unexpected_http_status",
        message: `Expected HTTP 200 from reviewer API, received ${capturedResponse.status}.`,
        details: capturedResponse.validJson
          ? capturedResponse.json
          : capturedResponse.textPreview,
      });
    }

    return { durationMs, response: capturedResponse };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    args.failures.push(
      timedOut
        ? {
            code: "request_timeout",
            message: `Reviewer generation request timed out after ${TIMEOUT_MS} ms.`,
          }
        : {
            code: "network_error",
            message: "Reviewer generation request failed before receiving an API response.",
            details: errorMessage(error),
          },
    );
    return { durationMs, response: null };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function captureResponse(response: Response): Promise<ResponseCapture> {
  const text = await response.text();
  if (text.trim().length === 0) {
    return {
      status: response.status,
      statusText: response.statusText,
      validJson: false,
      textPreview: "",
    };
  }

  try {
    return {
      status: response.status,
      statusText: response.statusText,
      validJson: true,
      json: JSON.parse(text) as unknown,
    };
  } catch {
    return {
      status: response.status,
      statusText: response.statusText,
      validJson: false,
      textPreview: previewText(text),
    };
  }
}

function validateReviewerResponse(
  response: ResponseCapture,
  failures: ValidationFailure[],
): ReviewerSummary | null {
  const body = response.json;
  if (!isRecord(body) || body["ok"] !== true || !isRecord(body["reviewer"])) {
    failures.push({
      code: "invalid_success_response",
      message: "Reviewer API response must be { ok: true, reviewer }.",
      details: body,
    });
    return null;
  }

  const reviewer = body["reviewer"];
  const title = readNonEmptyString(reviewer["title"]);
  if (!title) {
    failures.push({
      code: "missing_reviewer_title",
      message: "Reviewer title is missing or empty.",
    });
  }

  const sections = reviewer["sections"];
  if (!Array.isArray(sections) || sections.length === 0) {
    failures.push({
      code: "missing_reviewer_sections",
      message: "Reviewer sections are missing or empty.",
    });
  } else {
    validateSectionExplanations(sections, failures);
  }

  const metadata = isRecord(reviewer["metadata"]) ? reviewer["metadata"] : {};
  const coverageStatuses = readStatuses(
    metadata["coverageStatus"],
    metadata["coverage"],
  );
  const groundingStatuses = readStatuses(
    metadata["groundingStatus"],
    metadata["grounding"],
  );
  const leakageStatuses = readStatuses(
    metadata["leakageStatus"],
    metadata["leakage"],
  );

  failIfReportFailed("coverage", coverageStatuses, failures);
  failIfReportFailed("grounding", groundingStatuses, failures);
  failIfReportFailed("leakage", leakageStatuses, failures);

  return {
    title: title ?? "",
    sectionCount: Array.isArray(sections) ? sections.length : 0,
    ...(coverageStatuses[0] ? { coverageStatus: coverageStatuses[0] } : {}),
    ...(groundingStatuses[0] ? { groundingStatus: groundingStatuses[0] } : {}),
    ...(leakageStatuses[0] ? { leakageStatus: leakageStatuses[0] } : {}),
  };
}

function validateSectionExplanations(
  sections: readonly unknown[],
  failures: ValidationFailure[],
): void {
  sections.forEach((section, sectionIndex) => {
    if (!isRecord(section)) {
      failures.push({
        code: "invalid_reviewer_section",
        message: `Reviewer section ${sectionIndex + 1} is not an object.`,
      });
      return;
    }

    const items = section["items"];
    if (!Array.isArray(items) || items.length === 0) {
      failures.push({
        code: "missing_section_explanation",
        message: `Reviewer section ${formatSectionLabel(section, sectionIndex)} has no generated items with explanations.`,
      });
      return;
    }

    items.forEach((item, itemIndex) => {
      const explanation =
        isRecord(item) && isRecord(item["sourceCore"])
          ? readNonEmptyString(item["sourceCore"]["explanation"])
          : undefined;

      if (!explanation) {
        failures.push({
          code: "empty_section_explanation",
          message: `Reviewer section ${formatSectionLabel(section, sectionIndex)} item ${itemIndex + 1} has an empty explanation.`,
        });
      }
    });
  });
}

function readStatuses(
  metadataStatus: unknown,
  report: unknown,
): readonly string[] {
  const statuses: string[] = [];

  if (typeof metadataStatus === "string" && metadataStatus.trim()) {
    statuses.push(metadataStatus.trim());
  }

  if (isRecord(report) && typeof report["status"] === "string") {
    const reportStatus = report["status"].trim();
    if (reportStatus) {
      statuses.push(reportStatus);
    }
  }

  return statuses;
}

function failIfReportFailed(
  reportName: "coverage" | "grounding" | "leakage",
  statuses: readonly string[],
  failures: ValidationFailure[],
): void {
  if (!statuses.some((status) => status.toLowerCase() === "failed")) {
    return;
  }

  failures.push({
    code: `${reportName}_report_failed`,
    message: `${capitalize(reportName)} report status is failed.`,
  });
}

async function writeOutputFiles(output: FunctionalTestOutput): Promise<void> {
  await mkdir(dirname(OUTPUT_JSON_PATH), { recursive: true });
  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(OUTPUT_AUDIT_PATH, renderAuditMarkdown(output));
}

function printDiagnostics(output: FunctionalTestOutput): void {
  const status = output.ok ? "PASS" : "FAIL";
  console.log(`API reviewer functional timeout validation: ${status}`);
  console.log(`Path: ${output.pathRecreated}`);
  console.log(`Route: ${output.route}`);
  console.log(`Timeout: ${output.timeoutMs} ms`);
  console.log(`API base URL present: ${yesNo(output.env.apiBaseUrlPresent)}`);
  console.log(`Token source: ${formatTokenSource(output.env.supabaseTokenSource)}`);
  console.log(
    `Request duration: ${
      output.requestDurationMs === null
        ? "not started"
        : `${output.requestDurationMs} ms`
    }`,
  );
  console.log(`Output JSON: ${OUTPUT_JSON_PATH}`);
  console.log(`Audit: ${OUTPUT_AUDIT_PATH}`);

  if (output.validation.failures.length > 0) {
    console.error("Failures:");
    for (const failure of output.validation.failures) {
      console.error(`- ${failure.code}: ${failure.message}`);
    }
  }
}

function renderAuditMarkdown(output: FunctionalTestOutput): string {
  const failures =
    output.validation.failures.length === 0
      ? "- None"
      : output.validation.failures
          .map((failure) => `- ${failure.code}: ${failure.message}`)
          .join("\n");

  const responseStatus = output.response
    ? `${output.response.status} ${output.response.statusText}`.trim()
    : "No response";

  return `# API reviewer functional timeout validation

This test recreates the Expo Go functional request path without UI rendering:
OCR fixture text -> mobile-shaped authenticated POST -> \`${REVIEWER_GENERATE_ROUTE}\` -> engine pipeline -> API reviewer response.

## Result

- Pass/fail result: ${output.ok ? "PASS" : "FAIL"}
- Generated at: ${output.generatedAt}
- Completed at: ${output.completedAt}
- Client timeout: ${output.timeoutMs} ms
- Token source: ${formatTokenSource(output.env.supabaseTokenSource)}
- API base URL present: ${yesNo(output.env.apiBaseUrlPresent)}
- Request duration: ${
    output.requestDurationMs === null
      ? "not started"
      : `${output.requestDurationMs} ms`
  }
- HTTP status: ${responseStatus}

## Request

- Route: \`${output.route}\`
- Source title: ${output.request.sourceTitle}
- Fixture: \`${output.fixture.path}\`
- Source characters: ${output.request.sourceTextCharacters ?? "unavailable"}

## Reviewer summary

- Title: ${output.reviewerSummary?.title || "unavailable"}
- Sections: ${output.reviewerSummary?.sectionCount ?? "unavailable"}
- Coverage status: ${output.reviewerSummary?.coverageStatus ?? "unavailable"}
- Grounding status: ${output.reviewerSummary?.groundingStatus ?? "unavailable"}
- Leakage status: ${output.reviewerSummary?.leakageStatus ?? "unavailable"}

## Validation failures

${failures}

## Output files

- JSON: \`${OUTPUT_JSON_PATH}\`
- Audit: \`${OUTPUT_AUDIT_PATH}\`
`;
}

function formatTokenSource(source: SupabaseTokenSource | null): string {
  if (source === "manual_fallback") {
    return "manual fallback";
  }
  if (source === "minted_email_password") {
    return "minted via email/password";
  }

  return "missing";
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.search.length === 0 &&
      url.hash.length === 0
    );
  } catch {
    return false;
  }
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatSectionLabel(
  section: Readonly<Record<string, unknown>>,
  sectionIndex: number,
): string {
  return (
    readNonEmptyString(section["title"]) ??
    readNonEmptyString(section["id"]) ??
    String(sectionIndex + 1)
  );
}

function previewText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 500
    ? `${normalized.slice(0, 500)}...`
    : normalized;
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolvePackagePath(...pathSegments: readonly string[]): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const parentDirectory = dirname(moduleDirectory);
  const packageDirectory =
    basename(parentDirectory) === "dist-live"
      ? dirname(parentDirectory)
      : parentDirectory;

  return join(packageDirectory, ...pathSegments);
}

function resolveRepoPath(...pathSegments: readonly string[]): string {
  return join(resolvePackagePath("..", ".."), ...pathSegments);
}

try {
  await main();
} catch (error) {
  console.error(errorMessage(error));
  process.exitCode = 1;
}
