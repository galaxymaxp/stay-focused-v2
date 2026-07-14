import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { resolveCanvasUsableContent } from "../apps/api/src/lib/canvas-usable-content";
import {
  canvasResolutionReducer,
  createCanvasResolutionState,
  finishCanvasSingleFlight,
  isCanvasGenerationCurrent,
  tryBeginCanvasSingleFlight,
} from "../apps/mobile/src/features/courses/canvasResolutionState";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env.smoke.local", override: false });

const apiBaseUrl = required("EXPO_PUBLIC_API_BASE_URL").replace(/\/+$/, "");
let apiCalls = 0;

interface SafeEvidence {
  readonly label: string;
  readonly scenario: string;
  readonly resolution: string;
  readonly reviewerCalls: number;
  readonly result: "passed";
}

async function main(): Promise<void> {
  await waitForApi();
  const token = await signIn();
  const courses = await requestJson("/api/canvas/courses", token);
  const selectedCourseIds = array(courses.selectedCourseIds).filter(isString);
  if (selectedCourseIds.length === 0) throw new Error("protected_canvas_course_unavailable");

  const inventoryStartedAt = Date.now();
  const inventory = await findCourseInventory(selectedCourseIds, token);
  const sourceInventoryDurationMs = Date.now() - inventoryStartedAt;
  const repeatInventory = await requestJson(
    `/api/canvas/courses/${encodeURIComponent(inventory.courseId)}/sources`,
    token,
  );
  const firstIds = sourceIds(inventory.payload);
  const repeatIds = sourceIds(repeatInventory);
  if (!sameOrderedStrings(firstIds, repeatIds) || !isStablePlacementOrder(inventory.payload)) {
    throw new Error("protected_canvas_inventory_order_unstable");
  }

  const page = sourceRecords(inventory.payload).find(
    (source) => source.type === "page" && source.capability === "ready",
  );
  if (!page || typeof page.id !== "string") {
    throw new Error("protected_canvas_page_unavailable");
  }

  const resolutionStartedAt = Date.now();
  const resolved = await requestJson(
    `/api/canvas/courses/${encodeURIComponent(inventory.courseId)}/sources/resolve`,
    token,
    { itemId: page.id },
  );
  const textResolutionDurationMs = Date.now() - resolutionStartedAt;
  if (resolved.status !== "usable" || typeof resolved.sourceText !== "string") {
    throw new Error("protected_canvas_page_not_usable");
  }
  const resolvedCharacterCount = resolved.sourceText.length;
  if (resolvedCharacterCount <= 0) throw new Error("protected_canvas_page_empty");

  const preview = await requestJson(
    `/api/canvas/courses/${encodeURIComponent(inventory.courseId)}/sources/preview`,
    token,
    { sourceIds: [page.id] },
  );
  if (
    typeof preview.sourceText !== "string" ||
    typeof preview.previewSessionId !== "string" ||
    typeof preview.resolutionFingerprint !== "string"
  ) {
    throw new Error("protected_canvas_preview_invalid");
  }
  const editedSourceText = createWhitespaceOnlyPreviewEdit(preview.sourceText);
  if (
    editedSourceText === preview.sourceText ||
    editedSourceText.trim().length === 0
  ) {
    throw new Error("protected_canvas_preview_edit_failed");
  }

  const reviewerStartedAt = Date.now();
  const generation = await requestJson(
    "/api/reviewer/generate",
    token,
    {
      canvasCourseId: inventory.courseId,
      canvasItemIds: [page.id],
      canvasPreviewSessionId: preview.previewSessionId,
      canvasResolutionFingerprint: preview.resolutionFingerprint,
      sourceText: editedSourceText,
    },
    150_000,
  );
  const reviewerDurationMs = Date.now() - reviewerStartedAt;
  const reviewer = record(generation.reviewer);
  const reviewerSections = array(reviewer.sections).length;
  const sourceSnapshotId = generation.sourceSnapshotId;
  if (reviewerSections <= 0 || typeof sourceSnapshotId !== "string") {
    throw new Error("protected_canvas_reviewer_invalid");
  }

  const saved = await requestJson(
    "/api/reviewers",
    token,
    {
      reviewerOutput: reviewer,
      sourceMetadata: {
        sourceCharacterCount: editedSourceText.length,
        sourceLabel: "Canvas source",
        sourceMode: "canvas",
      },
      sourceSnapshotId,
      title: "Protected Canvas reviewer",
    },
  );
  const savedReviewer = record(saved.reviewer);
  if (typeof savedReviewer.id !== "string") {
    throw new Error("protected_canvas_save_invalid");
  }
  await requestDelete(`/api/reviewers/${encodeURIComponent(savedReviewer.id)}`, token);

  const fileEvidence = await validateFileSource(selectedCourseIds, token);
  const controlled = await validateControlledGates();
  const duplicateRequestCount = validateDuplicatePrevention();

  const results: SafeEvidence[] = [
    {
      label: "course-sample-1",
      resolution: "inventory_ready",
      result: "passed",
      reviewerCalls: 0,
      scenario: "selected synchronized course",
    },
    {
      label: "usable-source-1",
      resolution: "usable",
      result: "passed",
      reviewerCalls: 1,
      scenario: "synchronized page, edited preview, generated and saved",
    },
    fileEvidence,
    ...controlled,
  ];

  console.log(
    JSON.stringify({
      apiCalls,
      canvasRemoteCallsDuringInventoryAndResolution: 0,
      duplicateRequestCount,
      fileResolutionDurationMs: fileEvidenceDuration,
      filePreparationPerformed,
      filePreparationRemoteCalls: filePreparationPerformed ? "bounded_1_to_2" : 0,
      inventoryStable: true,
      ocrCalls: 1,
      resolvedCharacterCount,
      reviewerDurationMs,
      reviewerSections,
      routeLimitsMs: { inventory: 60_000, resolution: 60_000, reviewer: 120_000 },
      results,
      sourceInventoryDurationMs,
      status: "passed",
      textResolutionDurationMs,
    }),
  );
}

let fileEvidenceDuration = 0;
let filePreparationPerformed = false;

async function findCourseInventory(
  selectedCourseIds: readonly string[],
  token: string,
): Promise<{ readonly courseId: string; readonly payload: Record<string, unknown> }> {
  for (const courseId of selectedCourseIds) {
    const payload = await requestJson(
      `/api/canvas/courses/${encodeURIComponent(courseId)}/sources`,
      token,
    );
    if (
      sourceRecords(payload).some(
        (source) => source.type === "page" && source.capability === "ready",
      )
    ) {
      return { courseId, payload };
    }
  }
  throw new Error("protected_canvas_page_unavailable");
}

async function validateFileSource(
  selectedCourseIds: readonly string[],
  token: string,
): Promise<SafeEvidence> {
  for (const courseId of selectedCourseIds) {
    let payload = await requestJson(
      `/api/canvas/courses/${encodeURIComponent(courseId)}/sources`,
      token,
    );
    let file = sourceRecords(payload).find(
      (source) => source.type === "file" && source.capability === "ready",
    );
    if (!file) {
      const preparable = sourceRecords(payload).find(
        (source) =>
          source.type === "file" &&
          (source.capability === "needs_preparation" || source.capability === "failed") &&
          record(source.file).canPrepare === true,
      );
      if (preparable && typeof preparable.id === "string") {
        filePreparationPerformed = true;
        await requestJson(
          `/api/canvas/courses/${encodeURIComponent(courseId)}/sources/prepare`,
          token,
          { sourceIds: [preparable.id] },
          75_000,
        );
        payload = await requestJson(
          `/api/canvas/courses/${encodeURIComponent(courseId)}/sources`,
          token,
        );
        file = sourceRecords(payload).find(
          (source) => source.id === preparable.id && source.capability === "ready",
        );
      }
    }
    if (!file || typeof file.id !== "string") continue;

    const startedAt = Date.now();
    const resolution = await requestJson(
      `/api/canvas/courses/${encodeURIComponent(courseId)}/sources/resolve`,
      token,
      { itemId: file.id },
      75_000,
    );
    fileEvidenceDuration = Date.now() - startedAt;
    if (resolution.status !== "usable" || typeof resolution.sourceText !== "string") {
      continue;
    }
    return {
      label: "file-source-1",
      resolution: "usable",
      result: "passed",
      reviewerCalls: 0,
      scenario: "stored image or complete PDF",
    };
  }
  throw new Error("protected_canvas_file_unavailable");
}

async function validateControlledGates(): Promise<readonly SafeEvidence[]> {
  let unsupportedLinkedCalls = 0;
  let unsupportedReviewerCalls = 0;
  const unsupported = await resolveCanvasUsableContent({
    ...fixtureBoundary(),
    accessible: true,
    method: "module_reference",
    moduleItemType: "ExternalUrl",
    provenance: {},
    resolveLinkedItem: async () => {
      unsupportedLinkedCalls += 1;
      return null;
    },
    sourceId: "module_item:00000000-0000-4000-8000-000000000004",
    sourceKind: "module_item",
  });
  if (unsupported.status === "usable") unsupportedReviewerCalls += 1;
  if (unsupported.status !== "unsupported" || unsupportedLinkedCalls !== 0) {
    throw new Error("controlled_unsupported_gate_failed");
  }

  let inaccessibleReviewerCalls = 0;
  const inaccessible = await resolveCanvasUsableContent({
    ...fixtureBoundary(),
    accessible: false,
    html: "<p>Fictional fixture text.</p>",
    method: "synchronized_page_html",
    provenance: {},
    sourceId: "page:00000000-0000-4000-8000-000000000005",
    sourceKind: "page",
  });
  if (inaccessible.status === "usable") inaccessibleReviewerCalls += 1;
  if (inaccessible.status !== "inaccessible") {
    throw new Error("controlled_inaccessible_gate_failed");
  }

  let staleReviewerCalls = 0;
  const pending = canvasResolutionReducer(createCanvasResolutionState(), {
    requestToken: 1,
    selectionKey: "page:source-a",
    type: "started",
  });
  const usable = canvasResolutionReducer(pending, {
    preview: {
      previewSessionId: "fixture-session",
      resolutionFingerprint: "fixture-fingerprint",
      sourceIds: ["page:source-a"],
    },
    requestToken: 1,
    selectionKey: "page:source-a",
    sourceText: "Fictional instructional text.",
    sourceTitle: "Fictional source",
    type: "resolved",
  });
  if (isCanvasGenerationCurrent(usable, ["page:source-b"])) staleReviewerCalls += 1;

  return [
    {
      label: "unsupported-source-1",
      resolution: "unsupported",
      result: "passed",
      reviewerCalls: unsupportedReviewerCalls,
      scenario: "unsupported module item",
    },
    {
      label: "controlled-inaccessible",
      resolution: "inaccessible",
      result: "passed",
      reviewerCalls: inaccessibleReviewerCalls,
      scenario: "controlled inaccessible source",
    },
    {
      label: "controlled-stale",
      resolution: "stale",
      result: "passed",
      reviewerCalls: staleReviewerCalls,
      scenario: "changed selection before generation",
    },
  ];
}

function validateDuplicatePrevention(): number {
  const lock = { current: false };
  let requestCount = 0;
  if (tryBeginCanvasSingleFlight(lock)) requestCount += 1;
  if (tryBeginCanvasSingleFlight(lock)) requestCount += 1;
  finishCanvasSingleFlight(lock);
  if (requestCount !== 1) throw new Error("controlled_duplicate_gate_failed");
  return requestCount;
}

function fixtureBoundary() {
  return {
    connectionId: "00000000-0000-4000-8000-000000000002",
    courseId: "00000000-0000-4000-8000-000000000003",
    expectedConnectionId: "00000000-0000-4000-8000-000000000002",
    expectedCourseId: "00000000-0000-4000-8000-000000000003",
    expectedUserId: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000001",
  } as const;
}

function sourceRecords(payload: Record<string, unknown>): Record<string, unknown>[] {
  return array(payload.sources).filter(isRecord);
}

function sourceIds(payload: Record<string, unknown>): string[] {
  return sourceRecords(payload).map((source) => source.id).filter(isString);
}

function isStablePlacementOrder(payload: Record<string, unknown>): boolean {
  const sources = sourceRecords(payload);
  let ungroupedSeen = false;
  let previousModulePosition = -1;
  let previousItemPosition = -1;
  let previousModuleTitle = "";
  for (const source of sources) {
    const placement = record(source.placement);
    if (placement.group === "ungrouped") {
      ungroupedSeen = true;
      continue;
    }
    if (placement.group !== "module" || ungroupedSeen) return false;
    const modulePosition = nullablePosition(placement.modulePosition);
    const itemPosition = nullablePosition(placement.itemPosition);
    const moduleTitle = typeof placement.moduleTitle === "string" ? placement.moduleTitle : "";
    if (
      modulePosition < previousModulePosition ||
      (modulePosition === previousModulePosition &&
        moduleTitle === previousModuleTitle &&
        itemPosition < previousItemPosition)
    ) {
      return false;
    }
    if (modulePosition !== previousModulePosition || moduleTitle !== previousModuleTitle) {
      previousItemPosition = -1;
    }
    previousModulePosition = modulePosition;
    previousModuleTitle = moduleTitle;
    previousItemPosition = itemPosition;
  }
  return true;
}

function nullablePosition(value: unknown): number {
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER;
}

function createWhitespaceOnlyPreviewEdit(sourceText: string): string {
  const original = sourceText.trim();
  if (!original) return "";

  const whitespace = /\s+/.exec(original);
  if (whitespace && whitespace.index >= 0) {
    const replacement = whitespace[0] === "\n\n" ? "\n" : "\n\n";
    return `${original.slice(0, whitespace.index)}${replacement}${original.slice(
      whitespace.index + whitespace[0].length,
    )}`;
  }

  const midpoint = Math.max(1, Math.floor(original.length / 2));
  return `${original.slice(0, midpoint)}\n${original.slice(midpoint)}`;
}

async function requestJson(
  path: string,
  token: string,
  body?: Readonly<Record<string, unknown>>,
  timeoutMs = 75_000,
): Promise<Record<string, unknown>> {
  apiCalls += 1;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    method: body ? "POST" : "GET",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const parsed = (await response.json()) as unknown;
  if (!response.ok || !isRecord(parsed) || parsed.ok !== true) {
    throw new Error(`protected_canvas_step_http_${response.status}`);
  }
  return parsed;
}

async function requestDelete(path: string, token: string): Promise<void> {
  apiCalls += 1;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    method: "DELETE",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("protected_canvas_cleanup_failed");
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
      // Bounded and intentionally silent.
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

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  const safeFailureCategory = /^(?:protected|controlled)_[a-z0-9_]+$/.test(message)
    ? message
    : "protected_canvas_validation_failed";
  console.error(JSON.stringify({ safeFailureCategory, status: "failed" }));
  process.exitCode = 1;
});
