import assert from "node:assert/strict";
import test from "node:test";

import {
  FORBIDDEN_RESPONSE_KEYS,
  NORMALIZED_STATUSES,
  buildFictionalListResponse,
  buildFictionalSummaryResponse,
  classifyGradeApiRequest,
  parseArgs,
  scanForbiddenKeys,
  scanVisibilityWrapperViolations,
  summarizeAssignmentList,
  summarizeSummaryWrappers,
  summarizeTraceEvents,
} from "./canvas-grades-web-smoke.mjs";

test("parseArgs accepts documented flags", () => {
  assert.deepEqual(
    parseArgs(["--headed", "--keep-services", "--session-only", "--edge-only"]),
    {
      edgeOnly: true,
      headed: true,
      help: false,
      keepServices: true,
      sessionOnly: true,
    },
  );
});

test("parseArgs rejects unknown flags", () => {
  assert.throws(() => parseArgs(["--verbose"]), {
    code: "INVALID_ARGUMENT",
  });
});

test("classifyGradeApiRequest recognizes protected grade routes", () => {
  const base = "http://localhost:3000/api/canvas/courses/course-1/grades";

  assert.deepEqual(classifyGradeApiRequest(`${base}/sync-status`, "GET"), {
    label: "sync-status",
    method: "GET",
  });
  assert.deepEqual(classifyGradeApiRequest(`${base}/summary`, "GET"), {
    label: "summary",
    method: "GET",
  });
  assert.deepEqual(classifyGradeApiRequest(`${base}/sync`, "POST"), {
    label: "sync",
    method: "POST",
  });
  assert.deepEqual(classifyGradeApiRequest(`${base}?limit=50&offset=0`, "GET"), {
    label: "list",
    method: "GET",
  });
  assert.deepEqual(classifyGradeApiRequest(`${base}/assignment-1`, "GET"), {
    label: "detail",
    method: "GET",
  });
  assert.equal(classifyGradeApiRequest("http://localhost:3000/api/health"), null);
});

test("scanForbiddenKeys finds forbidden keys recursively", () => {
  const hits = scanForbiddenKeys({
    ok: true,
    nested: [{ token: "redacted", safe: true }],
    raw: {},
  });

  assert.deepEqual(hits.sort(), ["nested.0.token", "raw"]);
  assert.ok(FORBIDDEN_RESPONSE_KEYS.includes("token"));
});

test("scanVisibilityWrapperViolations rejects hidden wrapper values", () => {
  assert.deepEqual(
    scanVisibilityWrapperViolations({
      hidden: { state: "hidden", value: "private" },
      visible: { state: "visible", value: 1 },
      unavailable: { state: "unavailable", value: null },
    }),
    ["hidden"],
  );
});

test("fictional list covers every normalized status and pagination dedupe case", () => {
  const first = buildFictionalListResponse({ offset: 0 });
  const second = buildFictionalListResponse({ offset: 50 });
  const summary = summarizeAssignmentList(first);

  assert.deepEqual([...summary.statuses].sort(), [...NORMALIZED_STATUSES].sort());
  assert.equal(first.page.hasMore, true);
  assert.equal(first.page.nextOffset, 50);
  assert.equal(second.page.hasMore, false);
  assert.equal(second.items[0].id, first.items[1].id);
});

test("fictional summary classifies wrappers without exposing values", () => {
  assert.deepEqual(summarizeSummaryWrappers(buildFictionalSummaryResponse()), {
    currentGrade: "unknown",
    currentScore: "hidden",
    finalGrade: "not_applicable",
    finalScore: "unavailable",
  });
});

test("summarizeTraceEvents counts grade requests only", () => {
  assert.deepEqual(
    summarizeTraceEvents([
      { label: "sync-status", method: "GET", phase: "request" },
      { label: "summary", method: "GET", phase: "request" },
      { label: "list", method: "GET", phase: "request" },
      { label: "detail", method: "GET", phase: "request" },
      { bodyPresent: false, label: "sync", method: "POST", phase: "request" },
      { label: "sync", method: "POST", phase: "response" },
    ]),
    {
      getDetail: 1,
      getList: 1,
      getSummary: 1,
      getSyncStatus: 1,
      postSync: 1,
      syncPostBodyPresent: false,
    },
  );
});
