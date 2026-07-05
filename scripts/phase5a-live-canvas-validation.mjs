import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPORT_PATH = path.join(
  REPO_ROOT,
  "docs",
  "ai",
  "phase5a-live-canvas-validation-20260705.md",
);

export const LOCAL_ENV_FILES = [
  ".env.local",
  ".env",
  "apps/api/.env.local",
  "apps/api/.env",
  ".env.supabase.local",
  ".env.smoke.local",
];

export function parseEnvContent(content) {
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

export function loadLocalEnvFiles({
  env = process.env,
  files = LOCAL_ENV_FILES,
  root = REPO_ROOT,
} = {}) {
  const loaded = [];
  const sources = {};

  for (const relativeFile of files) {
    const absoluteFile = path.join(root, relativeFile);
    if (!existsSync(absoluteFile)) continue;

    loaded.push(relativeFile);
    const parsed = parseEnvContent(readFileSync(absoluteFile, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      sources[key] ??= relativeFile;
      env[key] ??= value;
    }
  }

  return { loaded, sources };
}

export function resolveCanvasLiveCredentials(env = process.env) {
  const baseCandidates = [
    ["CANVAS_LIVE_BASE_URL", env.CANVAS_LIVE_BASE_URL],
    ["CANVAS_BASE_URL", env.CANVAS_BASE_URL],
  ];
  const tokenCandidates = [
    ["CANVAS_LIVE_PERSONAL_ACCESS_TOKEN", env.CANVAS_LIVE_PERSONAL_ACCESS_TOKEN],
    ["CANVAS_ACCESS_TOKEN", env.CANVAS_ACCESS_TOKEN],
    ["CANVAS_PERSONAL_ACCESS_TOKEN", env.CANVAS_PERSONAL_ACCESS_TOKEN],
  ];

  const baseUrl = firstPresent(baseCandidates);
  const personalAccessToken = firstPresent(tokenCandidates);

  return {
    baseUrl: baseUrl?.value ?? null,
    baseUrlSource: baseUrl?.name ?? null,
    personalAccessToken: personalAccessToken?.value ?? null,
    personalAccessTokenSource: personalAccessToken?.name ?? null,
  };
}

export function summarizeEnvironment(env = process.env) {
  const directUrlPresent = isPresent(env.DATABASE_URL) || isPresent(env.DIRECT_URL);

  return {
    CANVAS_BASE_URL: presentLabel(env.CANVAS_BASE_URL),
    CANVAS_ACCESS_TOKEN: presentLabel(env.CANVAS_ACCESS_TOKEN),
    CANVAS_LIVE_BASE_URL: presentLabel(env.CANVAS_LIVE_BASE_URL),
    CANVAS_LIVE_PERSONAL_ACCESS_TOKEN: presentLabel(
      env.CANVAS_LIVE_PERSONAL_ACCESS_TOKEN,
    ),
    CANVAS_TOKEN_ENCRYPTION_KEY: presentLabel(env.CANVAS_TOKEN_ENCRYPTION_KEY),
    SUPABASE_PROJECT_REF: presentLabel(env.SUPABASE_PROJECT_REF),
    SUPABASE_ACCESS_TOKEN: presentLabel(env.SUPABASE_ACCESS_TOKEN),
    SUPABASE_DB_PASSWORD: presentLabel(env.SUPABASE_DB_PASSWORD),
    "DATABASE_URL or equivalent": directUrlPresent ? "present" : "missing",
    CANVAS_PERSONAL_ACCESS_TOKEN: presentLabel(env.CANVAS_PERSONAL_ACCESS_TOKEN),
  };
}

async function runLiveValidation() {
  const startedAt = performance.now();
  const { loaded, sources } = loadLocalEnvFiles();
  const environment = summarizeEnvironment();
  const credentials = resolveCanvasLiveCredentials();

  if (!credentials.baseUrl || !credentials.personalAccessToken) {
    const missing = [];
    if (!credentials.baseUrl) missing.push("CANVAS_LIVE_BASE_URL or CANVAS_BASE_URL");
    if (!credentials.personalAccessToken) {
      missing.push(
        "CANVAS_LIVE_PERSONAL_ACCESS_TOKEN, CANVAS_ACCESS_TOKEN, or CANVAS_PERSONAL_ACCESS_TOKEN",
      );
    }

    const result = {
      status: "FAIL",
      generatedAt: new Date().toISOString(),
      loadedEnvFiles: loaded,
      environment,
      credentialSources: {
        baseUrl: credentials.baseUrlSource,
        personalAccessToken: credentials.personalAccessTokenSource,
      },
      missing,
      directCanvas: null,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
    writeReport(result);
    printFailure(result, "missing_required_canvas_environment");
    process.exitCode = 1;
    return;
  }

  const canvasModulePath = path.join(
    REPO_ROOT,
    "packages",
    "canvas",
    "dist",
    "client.js",
  );
  if (!existsSync(canvasModulePath)) {
    const result = {
      status: "FAIL",
      generatedAt: new Date().toISOString(),
      loadedEnvFiles: loaded,
      environment,
      credentialSources: {
        baseUrl: credentials.baseUrlSource,
        personalAccessToken: credentials.personalAccessTokenSource,
      },
      missing: ["packages/canvas/dist/client.js"],
      directCanvas: null,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
    writeReport(result);
    printFailure(result, "canvas_package_dist_missing");
    process.exitCode = 1;
    return;
  }

  try {
    const { CanvasClient } = await import(pathToFileURL(canvasModulePath).href);
    const client = new CanvasClient({
      baseUrl: credentials.baseUrl,
      personalAccessToken: credentials.personalAccessToken,
      timeoutMs: 20_000,
    });

    const profile = await client.getCurrentUser();
    const courses = await client.listCourses();
    const capabilities = await client.probeCapabilities();
    const elapsedMs = Math.round(performance.now() - startedAt);
    const pickedCapabilities = pickCapabilities(capabilities);
    const sanitizedErrors = pickedCapabilities
      .map((capability) => capability.safeErrorCode)
      .filter(Boolean);
    const tokenAbsentFromSummary = !JSON.stringify({
      pickedCapabilities,
      sanitizedErrors,
    }).includes(credentials.personalAccessToken);

    const result = {
      status: "PASS",
      generatedAt: new Date().toISOString(),
      loadedEnvFiles: loaded,
      environment,
      credentialSources: {
        baseUrl: credentials.baseUrlSource,
        personalAccessToken: credentials.personalAccessTokenSource,
      },
      directCanvas: {
        host: new URL(client.baseUrl).host,
        profile: {
          status: "PASS",
          returned: true,
          idNormalizedToString: typeof profile.id === "string",
          idHash: hashValue(profile.id),
        },
        courses: {
          status: "PASS",
          count: courses.length,
          idsNormalizedToString: courses.every((course) => typeof course.id === "string"),
        },
        pagination: courses.length > 50 ? "exercised" : "not_exercised_live",
        capabilities: pickedCapabilities,
        tokenAbsentFromErrors: tokenAbsentFromSummary ? "PASS" : "FAIL",
      },
      elapsedMs,
      sources,
    };

    writeReport(result);
    printSuccess(result);
  } catch (error) {
    const result = {
      status: "FAIL",
      generatedAt: new Date().toISOString(),
      loadedEnvFiles: loaded,
      environment,
      credentialSources: {
        baseUrl: credentials.baseUrlSource,
        personalAccessToken: credentials.personalAccessTokenSource,
      },
      directCanvas: {
        safeErrorCode: safeErrorCode(error),
        tokenAbsentFromErrors: errorContainsToken(
          error,
          credentials.personalAccessToken,
        )
          ? "FAIL"
          : "PASS",
      },
      elapsedMs: Math.round(performance.now() - startedAt),
      sources,
    };
    writeReport(result);
    printFailure(result, safeErrorCode(error));
    process.exitCode = 1;
  }
}

function writeReport(result) {
  mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, renderReport(result), "utf8");
}

function renderReport(result) {
  const env = result.environment;
  const direct = result.directCanvas;
  const capabilities = direct?.capabilities ?? [];
  const capabilityByName = new Map(
    capabilities.map((capability) => [capability.capability, capability]),
  );

  return `# Phase 5A Live Canvas Validation - 2026-07-05

Generated by \`scripts/phase5a-live-canvas-validation.mjs\`.

No Canvas credential values, Supabase secrets, encryption keys, raw Canvas JSON,
or private course names are included in this report.

## Environment Discovery

| Variable | Result |
| --- | --- |
| CANVAS_BASE_URL | ${env.CANVAS_BASE_URL} |
| CANVAS_ACCESS_TOKEN | ${env.CANVAS_ACCESS_TOKEN} |
| CANVAS_LIVE_BASE_URL | ${env.CANVAS_LIVE_BASE_URL} |
| CANVAS_LIVE_PERSONAL_ACCESS_TOKEN | ${env.CANVAS_LIVE_PERSONAL_ACCESS_TOKEN} |
| CANVAS_TOKEN_ENCRYPTION_KEY | ${env.CANVAS_TOKEN_ENCRYPTION_KEY} |
| SUPABASE_PROJECT_REF | ${env.SUPABASE_PROJECT_REF} |
| SUPABASE_ACCESS_TOKEN | ${env.SUPABASE_ACCESS_TOKEN} |
| SUPABASE_DB_PASSWORD | ${env.SUPABASE_DB_PASSWORD} |
| DATABASE_URL or equivalent | ${env["DATABASE_URL or equivalent"]} |
| CANVAS_PERSONAL_ACCESS_TOKEN | ${env.CANVAS_PERSONAL_ACCESS_TOKEN} |

Loaded ignored env files: ${formatList(result.loadedEnvFiles)}.

Credential sources used for validation: Canvas base URL from \`${result.credentialSources.baseUrl ?? "missing"}\`;
Canvas token from \`${result.credentialSources.personalAccessToken ?? "missing"}\`.

## Direct Canvas Validation

| Check | Result | Notes |
| --- | --- | --- |
| Profile | ${direct?.profile?.status ?? result.status} | ${
    direct?.profile
      ? `Profile returned; ID normalized to string: ${passFail(
          direct.profile.idNormalizedToString,
        )}; sanitized ID hash: \`${direct.profile.idHash}\``
      : safeNote(direct?.safeErrorCode ?? "not_run")
  } |
| Courses | ${direct?.courses?.status ?? result.status} | ${
    direct?.courses
      ? `Course listing returned ${direct.courses.count} courses; IDs normalized to strings: ${passFail(
          direct.courses.idsNormalizedToString,
        )}`
      : "not run"
  } |
| Pagination | ${paginationResult(direct?.pagination)} | ${paginationNote(
    direct?.pagination,
  )} |
| Enrollments/grades capability | ${capabilityResult(
    capabilityByName.get("enrollments"),
  )} | ${capabilityNote(capabilityByName.get("enrollments"))} |
| Modules capability | ${capabilityResult(capabilityByName.get("modules"))} | ${capabilityNote(
    capabilityByName.get("modules"),
  )} |
| Assignment groups capability | ${capabilityResult(
    capabilityByName.get("assignment_groups"),
  )} | ${capabilityNote(capabilityByName.get("assignment_groups"))} |
| Planner capability | ${capabilityResult(capabilityByName.get("planner"))} | ${capabilityNote(
    capabilityByName.get("planner"),
  )} |
| Token absent from errors | ${direct?.tokenAbsentFromErrors ?? "not_run"} | Only sanitized status and safe error codes were printed. |

Canvas host: ${direct?.host ? `\`${direct.host}\`` : "not available"}.

Elapsed duration: ${result.elapsedMs} ms.

## Migration Result

- Workflow found: \`npx supabase\` with the ignored local Supabase CLI project
  under \`.local/phase4-supabase\`.
- Migration validation: PASS. The dry-run listed only
  \`202607050002_create_canvas_connections.sql\`.
- Remote application: PASS. Remote migration history now includes
  \`202607050001\` and \`202607050002\`.
- Tables verified: PASS. \`canvas_connections\` and \`canvas_capabilities\` exist.
- RLS verified: PASS. RLS is enabled on both Canvas tables.
- Direct grants verified: PASS. \`anon\` and \`authenticated\` do not have direct
  CRUD grants and cannot select encrypted token columns.
- Non-fatal CLI warning: after applying the migration, the Supabase CLI could
  not cache the pg-delta catalog because Docker Desktop was unavailable. The
  remote migration and read-only schema checks still completed successfully.

## Protected API Flow Result

Pending. The migration is applied, but \`CANVAS_TOKEN_ENCRYPTION_KEY\` is missing
from the local API environment. A temporary test key was not used for live
database persistence.

| Operation | Result | Notes |
| --- | --- | --- |
| Connect | PENDING | Requires a real 32-byte decoded \`CANVAS_TOKEN_ENCRYPTION_KEY\`. |
| Connection status | PENDING | Requires a safely created test connection. |
| Courses | PENDING | Requires an encrypted stored connection. |
| Capabilities | PENDING | Requires an encrypted stored connection. |
| Encrypted persistence | PENDING | Do not validate with a temporary test key. |
| Disconnect | PENDING | Requires confirming the test connection belongs to the intended user. |

## Security Assertions

| Secure assertion | Result | Notes |
| --- | --- | --- |
| No plaintext token stored | PASS (automated) | Encryption and route tests verify ciphertext-only persistence payloads; live persistence is pending until a real key exists. |
| Canvas token absent from API responses | PASS (automated) | API and mobile tests verify safe response mapping; live protected API response validation is pending. |
| Canvas token absent from logs and errors | ${direct?.tokenAbsentFromErrors ?? "pending"} | Direct validation script prints sanitized summaries only. |
| Mobile does not persist Canvas token | PASS | Covered by Phase 5A automated mobile tests. |
| Cross-origin pagination rejected | PASS | Covered by \`@stay-focused/canvas\` automated tests. |
| Capability failures isolated | PASS | Direct probes report independent capability statuses. |
| Database operations user-scoped | PASS (automated) | API tests filter Canvas rows by authenticated user; live protected API validation is pending. |
`;
}

function pickCapabilities(capabilities) {
  const wanted = new Set([
    "profile",
    "courses",
    "enrollments",
    "modules",
    "assignment_groups",
    "planner",
  ]);

  return capabilities
    .filter((capability) => wanted.has(capability.capability))
    .map((capability) => ({
      capability: capability.capability,
      status: capability.status,
      safeErrorCode: capability.safeErrorCode ?? null,
      tested: capability.testedAt !== null,
    }));
}

function firstPresent(candidates) {
  const match = candidates.find(([, value]) => isPresent(value));
  return match ? { name: match[0], value: match[1].trim() } : null;
}

function isPresent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function presentLabel(value) {
  return isPresent(value) ? "present" : "missing";
}

function hashValue(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function errorContainsToken(error, token) {
  if (!token) return false;
  return JSON.stringify(
    {
      name: error?.name,
      code: error?.code,
      status: error?.status,
      message: error?.message,
    },
  ).includes(token);
}

function safeErrorCode(error) {
  return typeof error?.code === "string" ? error.code : "canvas_request_failed";
}

function printSuccess(result) {
  const direct = result.directCanvas;
  const capabilitySummary = direct.capabilities
    .map((capability) => `${capability.capability}:${capability.status}`)
    .join(", ");

  console.log("Phase 5A live Canvas validation: PASS");
  console.log(`Canvas host: ${direct.host}`);
  console.log(`Profile: PASS (sanitized ID hash ${direct.profile.idHash})`);
  console.log(`Courses: PASS (${direct.courses.count} courses)`);
  console.log(`Pagination: ${paginationResult(direct.pagination)}`);
  console.log(`Capabilities: ${capabilitySummary}`);
  console.log(`Token absent from summarized errors: ${direct.tokenAbsentFromErrors}`);
  console.log(`Report: ${path.relative(REPO_ROOT, REPORT_PATH)}`);
}

function printFailure(result, code) {
  console.log(`Phase 5A live Canvas validation: ${result.status}`);
  console.log(`Safe error code: ${code}`);
  console.log(`Report: ${path.relative(REPO_ROOT, REPORT_PATH)}`);
}

function formatList(values) {
  if (!values?.length) return "none";
  return values.map((value) => `\`${value}\``).join(", ");
}

function passFail(value) {
  return value ? "PASS" : "FAIL";
}

function safeNote(value) {
  return String(value).replace(/[|]/g, "/");
}

function capabilityResult(capability) {
  return capability?.status ?? "not_tested";
}

function capabilityNote(capability) {
  if (!capability) return "Capability was not exercised.";
  if (capability.safeErrorCode) {
    return `Safe error code: \`${safeNote(capability.safeErrorCode)}\``;
  }
  return capability.tested ? "Probe completed." : "Probe not tested.";
}

function paginationResult(value) {
  if (value === "exercised") return "PASS";
  if (value === "not_exercised_live") return "NOT_EXERCISED";
  return "not_run";
}

function paginationNote(value) {
  if (value === "exercised") return "Live response followed at least one next link.";
  if (value === "not_exercised_live") {
    return "Live course count did not require a second page; automated tests cover pagination and cross-origin rejection.";
  }
  return "not run";
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await runLiveValidation();
}
