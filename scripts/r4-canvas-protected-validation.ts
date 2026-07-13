import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import { resolveCanvasUsableContent } from "../apps/api/src/lib/canvas-usable-content";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env.smoke.local", override: false });

type SafeResult = {
  readonly sourceLabel: string;
  readonly sourceKind: string;
  readonly resolution: string;
  readonly method: string;
  readonly characterCount: number;
  readonly contentHash: string | null;
  readonly ocrPageCount: number | null;
  readonly reviewerStarted: boolean;
  readonly reviewerHttpResult: number | null;
  readonly reviewerDurationMs?: number;
  readonly durationMs: number;
  readonly validation: "live" | "fixture";
  readonly safeFailureCategory?: string;
  readonly reviewerQuality?: {
    readonly coverage: string;
    readonly grounding: string;
    readonly leakage: string;
  };
};

const apiBaseUrl = required("EXPO_PUBLIC_API_BASE_URL").replace(/\/+$/, "");
let apiCalls = 0;

async function main(): Promise<void> {
  await waitForApi();
  const token = await signIn();
  const results: SafeResult[] = [];
  const courses = await requestJson("/api/canvas/courses", token);
  const selectedCourseIds = array(courses.selectedCourseIds).filter(isString);
  if (selectedCourseIds.length === 0) throw new Error("protected_canvas_course_unavailable");

  let usable:
    | { readonly courseId: string; readonly sourceId: string; readonly resolution: Record<string, unknown> }
    | null = null;
  let firstResolved = false;
  let fileValidated = false;
  let liveFile: { readonly courseId: string; readonly sourceId: string } | null = null;
  let attemptedSources = 0;
  for (const courseId of selectedCourseIds) {
    const listed = await requestJson(
      `/api/canvas/courses/${encodeURIComponent(courseId)}/sources`,
      token,
    );
    const candidates = array(listed.sources)
      .filter(
        (source): source is Record<string, unknown> =>
          isRecord(source) && source.availability === "available" && typeof source.id === "string",
      )
      .sort((left, right) =>
        Number(left.type === "file") - Number(right.type === "file") ||
        Number(right.estimatedCharacters ?? 0) - Number(left.estimatedCharacters ?? 0),
      );
    const fileCandidate = candidates.find((source) => source.type === "file");
    if (!liveFile && fileCandidate) {
      liveFile = { courseId, sourceId: String(fileCandidate.id) };
    }
    for (const source of candidates) {
      if (attemptedSources >= 8) break;
      attemptedSources += 1;
      const startedAt = Date.now();
      const resolved = await requestJson(
        `/api/canvas/courses/${encodeURIComponent(courseId)}/sources/resolve`,
        token,
        { itemId: source.id },
      );
      const safe = safeLiveResolution(
        resolved,
        String(source.type ?? "unknown"),
        Date.now() - startedAt,
        source.type === "file" ? "file-sample-1" : `${String(source.type)}-sample-1`,
      );
      if (!firstResolved || (source.type === "file" && !fileValidated)) {
        results.push(safe);
      }
      firstResolved = true;
      if (source.type === "file") fileValidated = true;
      if (resolved.status === "usable" && typeof resolved.sourceText === "string") {
        usable = { courseId, sourceId: String(source.id), resolution: resolved };
        break;
      }
    }
    if (usable) break;
  }

  if (liveFile && !fileValidated) {
    const startedAt = Date.now();
    const resolvedFile = await requestJson(
      `/api/canvas/courses/${encodeURIComponent(liveFile.courseId)}/sources/resolve`,
      token,
      { itemId: liveFile.sourceId },
    );
    results.push(
      safeLiveResolution(
        resolvedFile,
        "file",
        Date.now() - startedAt,
        "file-sample-1",
      ),
    );
    fileValidated = true;
  }

  results.push(await validateUnsupportedFixture());
  results.push(await validateInaccessibleFixture());
  results.push(await validateIncompleteFixture());

  if (!firstResolved) {
    printReport("blocked", results, "protected_canvas_item_unavailable");
    throw new Error("protected_canvas_item_unavailable");
  }
  if (!usable) {
    printReport("blocked", results, "protected_canvas_usable_sample_unavailable");
    throw new Error("protected_canvas_usable_sample_unavailable");
  }

  const reviewerEvidence = await generateLiveReviewer(usable, token);
  const liveIndex = results.findIndex(
    (result) => result.validation === "live" && result.resolution === "usable",
  );
  const reviewerResult = {
    ...(liveIndex >= 0
      ? results[liveIndex]
      : safeLiveResolution(
          usable.resolution,
          String(usable.resolution.sourceKind ?? "unknown"),
          0,
          "usable-sample-1",
        )),
    sourceLabel: "usable-sample-1",
    reviewerStarted: true,
    reviewerHttpResult: reviewerEvidence.httpStatus,
    reviewerDurationMs: reviewerEvidence.durationMs,
    reviewerQuality: reviewerEvidence.quality,
  };
  if (liveIndex >= 0) results[liveIndex] = reviewerResult;
  else results.push(reviewerResult);

  printReport("passed", results, null);
}

async function generateLiveReviewer(
  selected: { readonly courseId: string; readonly sourceId: string },
  token: string,
): Promise<{
  readonly durationMs: number;
  readonly httpStatus: number;
  readonly quality: { readonly coverage: string; readonly grounding: string; readonly leakage: string };
}> {
  const structure = await requestJson(
    `/api/canvas/courses/${encodeURIComponent(selected.courseId)}/sources/structure`,
    token,
    { sourceIds: [selected.sourceId] },
  );
  const blocks = array(structure.sources).flatMap((source) =>
    isRecord(source) ? array(source.blocks) : [],
  ).filter(isRecord);
  const selectedBlockIds = blocks
    .filter((block) => isRecord(block) && block.selectable === true && block.selectedByDefault === true)
    .map((block) => block.id)
    .filter(isString)
    .slice(0, Number((structure.limits as Record<string, unknown> | undefined)?.maximumSelectedBlocks ?? 80));
  if (selectedBlockIds.length === 0) throw new Error("protected_canvas_blocks_unavailable");
  const preview = await requestJson(
    `/api/canvas/courses/${encodeURIComponent(selected.courseId)}/sources/selective-preview`,
    token,
    { structureSessionId: structure.structureSessionId, selectedBlockIds },
  );
  if (
    typeof preview.sourceText !== "string" ||
    typeof preview.previewSessionId !== "string" ||
    typeof preview.resolutionFingerprint !== "string"
  ) {
    throw new Error("protected_canvas_preview_invalid");
  }
  const startedAt = Date.now();
  apiCalls += 1;
  const response = await fetch(`${apiBaseUrl}/api/reviewer/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceText: preview.sourceText,
      sourceTitle: typeof preview.suggestedTitle === "string" ? preview.suggestedTitle : undefined,
      canvasPreviewSessionId: preview.previewSessionId,
      canvasCourseId: selected.courseId,
      canvasItemIds: array(preview.sources).map((source) =>
        isRecord(source) ? source.id : null,
      ).filter(isString),
      canvasResolutionFingerprint: preview.resolutionFingerprint,
    }),
    signal: AbortSignal.timeout(150_000),
  });
  const body = (await response.json()) as unknown;
  if (!response.ok || !isRecord(body) || body.ok !== true || !isRecord(body.reviewer)) {
    throw new Error(`protected_canvas_reviewer_http_${response.status}`);
  }
  const metadata = isRecord(body.reviewer.metadata) ? body.reviewer.metadata : {};
  return {
    durationMs: Date.now() - startedAt,
    httpStatus: response.status,
    quality: {
      coverage: String(metadata.coverageStatus ?? "unknown"),
      grounding: String(metadata.groundingStatus ?? "unknown"),
      leakage: String(metadata.leakageStatus ?? "unknown"),
    },
  };
}

async function validateUnsupportedFixture(): Promise<SafeResult> {
  let linkedCalls = 0;
  const startedAt = Date.now();
  const result = await resolveCanvasUsableContent({
    ...fixtureBoundary(),
    accessible: true,
    method: "module_reference",
    moduleItemType: "ExternalUrl",
    provenance: {},
    resolveLinkedItem: async () => {
      linkedCalls += 1;
      return null;
    },
    sourceId: "module_item:00000000-0000-4000-8000-000000000004",
    sourceKind: "module_item",
  });
  if (result.status !== "unsupported" || linkedCalls !== 0 || result.sourceText !== undefined) {
    throw new Error("controlled_unsupported_gate_failed");
  }
  return fixtureResult("unsupported-sample-1", "module_item", result.status, result.method, Date.now() - startedAt);
}

async function validateInaccessibleFixture(): Promise<SafeResult> {
  const boundary = fixtureBoundary();
  const startedAt = Date.now();
  const result = await resolveCanvasUsableContent({
    ...boundary,
    accessible: true,
    expectedCourseId: "00000000-0000-4000-8000-000000000099",
    html: "<p>Synthetic fixture text.</p>",
    method: "synchronized_page_html",
    provenance: {},
    sourceId: "page:00000000-0000-4000-8000-000000000004",
    sourceKind: "page",
  });
  if (result.status !== "inaccessible" || result.sourceText !== undefined) {
    throw new Error("controlled_inaccessible_gate_failed");
  }
  return fixtureResult("controlled-inaccessible", "page", result.status, result.method, Date.now() - startedAt);
}

async function validateIncompleteFixture(): Promise<SafeResult> {
  let providerCalls = 0;
  const startedAt = Date.now();
  const result = await resolveCanvasUsableContent({
    ...fixtureBoundary(),
    accessible: true,
    extractFile: async () => {
      providerCalls += 1;
      return { status: "failed", evidence: { completeness: "incomplete" } };
    },
    method: "stored_pdf_ocr",
    provenance: {},
    sourceId: "file:00000000-0000-4000-8000-000000000004",
    sourceKind: "file",
  });
  if (result.status !== "failed" || providerCalls !== 1 || result.sourceText !== undefined) {
    throw new Error("controlled_incomplete_gate_failed");
  }
  return fixtureResult("controlled-incomplete", "file", result.status, result.method, Date.now() - startedAt);
}

function fixtureBoundary() {
  return {
    userId: "00000000-0000-4000-8000-000000000001",
    connectionId: "00000000-0000-4000-8000-000000000002",
    courseId: "00000000-0000-4000-8000-000000000003",
    expectedUserId: "00000000-0000-4000-8000-000000000001",
    expectedConnectionId: "00000000-0000-4000-8000-000000000002",
    expectedCourseId: "00000000-0000-4000-8000-000000000003",
  } as const;
}

function fixtureResult(
  sourceLabel: string,
  sourceKind: string,
  resolution: string,
  method: string,
  durationMs: number,
): SafeResult {
  return {
    sourceLabel,
    sourceKind,
    resolution,
    method,
    characterCount: 0,
    contentHash: null,
    ocrPageCount: null,
    reviewerStarted: false,
    reviewerHttpResult: null,
    durationMs,
    validation: "fixture",
  };
}

function safeLiveResolution(
  resolved: Record<string, unknown>,
  sourceKind: string,
  durationMs: number,
  sourceLabel: string,
): SafeResult {
  const sourceText = typeof resolved.sourceText === "string" ? resolved.sourceText : "";
  return {
    sourceLabel,
    sourceKind,
    resolution: String(resolved.status ?? "failed"),
    method: String(resolved.method ?? "unknown"),
    characterCount: sourceText.length,
    contentHash: sourceText ? createHash("sha256").update(sourceText, "utf8").digest("hex") : null,
    ocrPageCount: typeof resolved.pageCount === "number" ? resolved.pageCount : null,
    reviewerStarted: false,
    reviewerHttpResult: null,
    durationMs,
    validation: "live",
  };
}

function printReport(status: "passed" | "blocked", results: readonly SafeResult[], safeFailureCategory: string | null): void {
  console.log(
    JSON.stringify({
      status,
      safeFailureCategory,
      apiCalls,
      databasePolicy: "selected-item-scoped",
      maximumOcrCallsPerResolution: 1,
      maximumReviewerCallsPerUsableResolution: 1,
      nonUsableReviewerCalls: 0,
      pagination: "existing-list-helper",
      results,
    }),
  );
}

async function requestJson(
  path: string,
  token: string,
  body?: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  apiCalls += 1;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(75_000),
  });
  const parsed = (await response.json()) as unknown;
  if (!response.ok || !isRecord(parsed) || parsed.ok !== true) {
    throw new Error(`protected_canvas_step_http_${response.status}`);
  }
  return parsed;
}

async function signIn(): Promise<string> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("protected_auth_configuration_missing");
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: required("SMOKE_TEST_EMAIL"),
    password: required("SMOKE_TEST_PASSWORD"),
  });
  if (error || !data.session?.access_token) throw new Error("protected_sign_in_failed");
  return data.session.access_token;
}

async function waitForApi(): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The bounded retry is intentionally silent and contains no endpoint data.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("protected_api_unavailable");
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`protected_setting_missing_${name.toLowerCase()}`);
  return value;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  const safeFailureCategory = /^(?:protected|controlled)_[a-z0-9_]+$/.test(
    message,
  )
    ? message
    : "protected_canvas_validation_failed";
  console.error(
    JSON.stringify({
      status: "failed",
      safeFailureCategory,
    }),
  );
  process.exitCode = 1;
});
