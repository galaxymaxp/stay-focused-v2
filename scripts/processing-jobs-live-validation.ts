import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env.smoke.local", override: false });

const apiBaseUrl = (
  process.env.PROCESSING_VALIDATION_API_BASE_URL ?? "http://127.0.0.1:3000"
).replace(/\/+$/, "");
const terminalStatuses = new Set([
  "succeeded",
  "failed",
  "cancelled",
  "expired",
]);

async function main(): Promise<void> {
  await waitForApi();
  const accessToken = await signIn();
  const cancellationExtractionJobId =
    process.env.PROCESSING_CANCEL_REVIEWER_FROM_EXTRACTION_JOB_ID?.trim();
  if (cancellationExtractionJobId) {
    await validateExplicitCancellation(
      accessToken,
      cancellationExtractionJobId,
    );
    return;
  }
  const reviewerExtractionJobId =
    process.env.PROCESSING_REVIEWER_FROM_EXTRACTION_JOB_ID?.trim();
  if (reviewerExtractionJobId) {
    await validateReviewerFromExtraction(
      accessToken,
      reviewerExtractionJobId,
    );
    return;
  }
  const retryJobId = process.env.PROCESSING_RETRY_JOB_ID?.trim();
  if (retryJobId) {
    await validateExistingRetry(accessToken, retryJobId);
    return;
  }
  const privateFixturePath =
    process.env.PROCESSING_VALIDATION_PDF_PATH?.trim();
  const pdfBytes = privateFixturePath
    ? new Uint8Array(await readFile(privateFixturePath))
    : await createNeutralNativeTextPdf();
  const displayName = privateFixturePath
    ? basename(privateFixturePath)
    : "Neutral Notes + Appendix.pdf";
  const extractionKey = `validation:extraction:${randomUUID()}`;
  const first = await createExtraction(
    accessToken,
    pdfBytes,
    extractionKey,
    displayName,
  );
  const replay = await createExtraction(
    accessToken,
    pdfBytes,
    extractionKey,
    displayName,
  );
  assert(first.id === replay.id, "idempotent extraction replay");
  assert(first.source?.displayName === displayName, "display name");

  await delay(4_000);
  const extraction = await waitForTerminalJob(
    accessToken,
    first.id,
    privateFixturePath ? 20 * 60_000 : 180_000,
  );
  assert(extraction.status === "succeeded", "extraction success");
  const extractionResult = await getResult(accessToken, first.id);
  const extractedText = readNestedString(extractionResult, ["result", "text"]);
  const sourceVersionId = readString(extractionResult.sourceVersionId);
  const sourceContentSha256 = readString(extractionResult.sourceContentSha256);
  assert(extractedText.length > 500, "extracted character count");
  assert(isUuid(sourceVersionId), "extraction source version");
  assert(/^[a-f0-9]{64}$/.test(sourceContentSha256), "source content hash");

  if (process.env.PROCESSING_EXTRACTION_ONLY === "1") {
    const expectedPageCount = Number.parseInt(
      process.env.PROCESSING_EXPECTED_PAGE_COUNT ?? "",
      10,
    );
    const pageCount = readNestedNumber(extractionResult, [
      "result",
      "pageCount",
    ]);
    const processedPageCount = readNestedNumber(extractionResult, [
      "result",
      "processedPageCount",
    ]);
    const extractionStatus = readNestedString(extractionResult, [
      "result",
      "extraction",
      "status",
    ]);
    const nativeTextPageCount = readNestedNumber(extractionResult, [
      "result",
      "extraction",
      "nativeTextPageCount",
    ]);
    const ocrPageCount = readNestedNumber(extractionResult, [
      "result",
      "extraction",
      "ocrPageCount",
    ]);
    const ocrChunkCount = readNestedNumber(extractionResult, [
      "result",
      "extraction",
      "ocrChunkCount",
    ]);
    const missingPageCount = readNestedArrayLength(extractionResult, [
      "result",
      "extraction",
      "missingPageNumbers",
    ]);
    const failedPageCount = readNestedNumber(extractionResult, [
      "result",
      "extraction",
      "failedPageCount",
    ]);

    assert(Number.isInteger(expectedPageCount), "expected page count setting");
    assert(pageCount === expectedPageCount, "page count");
    assert(processedPageCount === expectedPageCount, "processed page count");
    assert(extractionStatus === "complete", "extraction completeness");
    assert(nativeTextPageCount === expectedPageCount, "native text page count");
    assert(ocrPageCount === 0, "OCR page count");
    assert(ocrChunkCount === 0, "OCR chunk count");
    assert(missingPageCount === 0, "missing page count");
    assert(failedPageCount === 0, "failed page count");

    console.info(JSON.stringify({
      status: "passed",
      extraction: {
        jobId: first.id,
        finalStatus: extraction.status,
        attemptCount: extraction.attemptCount,
        displayName: first.source?.displayName,
        extractedCharacterCount: extractedText.length,
        pageCount,
        processedPageCount,
        extractionStatus,
        nativeTextPageCount,
        ocrPageCount,
        ocrChunkCount,
        missingPageCount,
        failedPageCount,
      },
      disconnectedAfterAcceptance: true,
    }));
    return;
  }

  let reviewerSourceVersionId = sourceVersionId;
  let sourceRevisionCreated = false;
  if (!privateFixturePath) {
    const revision = await createRevision(accessToken, {
      expectedParentSha256: sourceContentSha256,
      parentSourceVersionId: sourceVersionId,
      sourceText: `${extractedText}\n\nRevision note: Compare evidence before drawing a conclusion.`,
    });
    reviewerSourceVersionId = readString(revision.id);
    assert(isUuid(reviewerSourceVersionId), "revised source version");
    sourceRevisionCreated = true;
  }

  const reviewerKey = `validation:reviewer:${randomUUID()}`;
  const reviewer = await createReviewer(
    accessToken,
    reviewerKey,
    reviewerSourceVersionId,
    displayName,
  );
  await delay(4_000);
  const reviewerTerminal = await waitForTerminalJob(
    accessToken,
    reviewer.id,
    12 * 60_000,
  );
  assert(reviewerTerminal.status === "succeeded", "reviewer success");
  const reviewerResult = await getResult(accessToken, reviewer.id);
  const reviewerOutput = readRecord(reviewerResult.result)?.reviewer;
  const reviewerRecord = readRecord(reviewerOutput);
  const sections = Array.isArray(reviewerRecord?.sections)
    ? reviewerRecord.sections
    : [];
  const metadata = readRecord(reviewerRecord?.metadata);
  assert(sections.length > 0, "reviewer sections");

  console.info(JSON.stringify({
    status: "passed",
    extraction: {
      jobId: first.id,
      duplicateReplayJobId: replay.id,
      finalStatus: extraction.status,
      attemptCount: extraction.attemptCount,
      displayName: first.source?.displayName,
      extractedCharacterCount: extractedText.length,
      processedPages: readNestedNumber(extractionResult, [
        "result",
        "processedPageCount",
      ]),
      pageCount: readNestedNumber(extractionResult, ["result", "pageCount"]),
      sourceRevisionCreated,
    },
    reviewer: {
      jobId: reviewer.id,
      finalStatus: reviewerTerminal.status,
      attemptCount: reviewerTerminal.attemptCount,
      sectionCount: sections.length,
      coverage: readSafeStatus(metadata?.coverageStatus),
      grounding: readSafeStatus(metadata?.groundingStatus),
      leakage: readSafeStatus(metadata?.leakageStatus),
      providerCallCount: readNestedNumber(reviewerResult, [
        "metrics",
        "providerCallCount",
      ]),
      retryCount: readNestedNumber(reviewerResult, ["metrics", "retryCount"]),
    },
    disconnectedAfterAcceptance: true,
  }));
}

async function validateExplicitCancellation(
  accessToken: string,
  extractionJobId: string,
): Promise<void> {
  assert(isUuid(extractionJobId), "cancellation extraction job id");
  const extractionResult = await getResult(accessToken, extractionJobId);
  const sourceVersionId = readString(extractionResult.sourceVersionId);
  assert(isUuid(sourceVersionId), "cancellation source version");

  const reviewer = await createReviewer(
    accessToken,
    `validation:cancel:${randomUUID()}`,
    sourceVersionId,
  );
  const running = await waitForJobStatus(
    accessToken,
    reviewer.id,
    new Set(["running", "succeeded", "failed", "cancelled"]),
    30_000,
    200,
  );
  assert(running.status === "running", "job reached running before cancellation");

  const cancelResponse = await fetch(
    `${apiBaseUrl}/api/jobs/${reviewer.id}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const cancelBody = await readJson(cancelResponse);
  const cancelledRequest = parseJob(cancelBody.data);
  if (!cancelResponse.ok || cancelBody.ok !== true || !cancelledRequest) {
    throw new Error(`validation_job_cancel_http_${cancelResponse.status}`);
  }
  assert(
    cancelledRequest.status === "cancellation_requested" ||
      cancelledRequest.status === "cancelled",
    "cancellation request recorded",
  );

  const terminal = await waitForTerminalJob(accessToken, reviewer.id, 180_000);
  assert(terminal.status === "cancelled", "cancelled terminal status");
  const resultResponse = await fetch(
    `${apiBaseUrl}/api/jobs/${reviewer.id}/result`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  assert(resultResponse.status === 409, "cancelled result not published");

  console.info(JSON.stringify({
    status: "passed",
    cancellation: {
      jobId: reviewer.id,
      requestedStatus: cancelledRequest.status,
      finalStatus: terminal.status,
      attemptCount: terminal.attemptCount,
      resultPublished: false,
    },
  }));
}

async function validateReviewerFromExtraction(
  accessToken: string,
  extractionJobId: string,
): Promise<void> {
  assert(isUuid(extractionJobId), "reviewer extraction job id");
  const extractionResult = await getResult(accessToken, extractionJobId);
  const sourceVersionId = readString(extractionResult.sourceVersionId);
  assert(isUuid(sourceVersionId), "reviewer source version");

  const reviewer = await createReviewer(
    accessToken,
    `validation:reviewer:${randomUUID()}`,
    sourceVersionId,
  );
  await delay(4_000);
  const terminal = await waitForTerminalJob(
    accessToken,
    reviewer.id,
    15 * 60_000,
  );
  assert(terminal.status === "succeeded", "private reviewer success");
  const result = await getResult(accessToken, reviewer.id);
  const reviewerRecord = readRecord(readRecord(result.result)?.reviewer);
  const metadata = readRecord(reviewerRecord?.metadata);
  const sections = Array.isArray(reviewerRecord?.sections)
    ? reviewerRecord.sections
    : [];
  assert(sections.length > 0, "private reviewer sections");

  console.info(JSON.stringify({
    status: "passed",
    reviewer: {
      extractionJobId,
      jobId: reviewer.id,
      finalStatus: terminal.status,
      attemptCount: terminal.attemptCount,
      sectionCount: sections.length,
      coverage: readSafeStatus(metadata?.coverageStatus),
      grounding: readSafeStatus(metadata?.groundingStatus),
      leakage: readSafeStatus(metadata?.leakageStatus),
      plannedSectionCount: readNestedNumber(result, [
        "metrics",
        "plannedSectionCount",
      ]),
      providerCallCount: readNestedNumber(result, [
        "metrics",
        "providerCallCount",
      ]),
      retryCount: readNestedNumber(result, ["metrics", "retryCount"]),
      generationDurationMs: readNestedNumber(result, [
        "metrics",
        "generationDurationMs",
      ]),
    },
    disconnectedAfterAcceptance: true,
  }));
}

async function validateExistingRetry(
  accessToken: string,
  parentJobId: string,
): Promise<void> {
  assert(isUuid(parentJobId), "retry parent job id");
  const response = await fetch(`${apiBaseUrl}/api/jobs/${parentJobId}/retry`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Idempotency-Key": `validation:retry:${randomUUID()}`,
    },
  });
  const body = await readJson(response);
  const child = parseJob(body.data);
  if (response.status !== 202 || body.ok !== true || !child) {
    throw new Error(`validation_job_retry_http_${response.status}`);
  }

  await delay(4_000);
  const terminal = await waitForTerminalJob(accessToken, child.id, 12 * 60_000);
  assert(terminal.status === "succeeded", "retried extraction success");
  const result = await getResult(accessToken, child.id);
  const text = readNestedString(result, ["result", "text"]);
  assert(text.length > 0, "retried extraction text");

  console.info(JSON.stringify({
    status: "passed",
    retry: {
      parentJobId,
      childJobId: child.id,
      finalStatus: terminal.status,
      attemptCount: terminal.attemptCount,
      displayName: child.source?.displayName,
      extractedCharacterCount: text.length,
      processedPages: readNestedNumber(result, [
        "result",
        "processedPageCount",
      ]),
      pageCount: readNestedNumber(result, ["result", "pageCount"]),
      failedPageCount: readNestedNumber(result, [
        "metrics",
        "failedPageCount",
      ]),
      blankPageCount: readNestedNumber(result, [
        "metrics",
        "blankPageCount",
      ]),
    },
    disconnectedAfterAcceptance: true,
  }));
}

async function signIn(): Promise<string> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("validation_auth_config_missing");

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: required("SMOKE_TEST_EMAIL"),
    password: required("SMOKE_TEST_PASSWORD"),
  });
  if (error || !data.session?.access_token) {
    throw new Error("validation_sign_in_failed");
  }
  return data.session.access_token;
}

async function createExtraction(
  accessToken: string,
  pdfBytes: Uint8Array,
  idempotencyKey: string,
  displayName: string,
): Promise<JobView> {
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/)/i.test(apiBaseUrl)) {
    return await createHostedExtraction(
      accessToken,
      pdfBytes,
      idempotencyKey,
      displayName,
    );
  }
  const formData = new FormData();
  formData.append(
    "source",
    new Blob([toArrayBuffer(pdfBytes)], { type: "application/pdf" }),
    "transport-encoded-name.pdf",
  );
  formData.append("displayName", displayName);
  formData.append("jobType", "document_extraction");
  return await requestJob("/api/jobs", accessToken, {
    body: formData,
    headers: { "Idempotency-Key": idempotencyKey },
    method: "POST",
    expectedStatus: 202,
  });
}

async function createHostedExtraction(
  accessToken: string,
  pdfBytes: Uint8Array,
  idempotencyKey: string,
  displayName: string,
): Promise<JobView> {
  const intentResponse = await fetch(`${apiBaseUrl}/api/job-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayName,
      mimeType: "application/pdf",
      byteSize: pdfBytes.byteLength,
    }),
  });
  const intentBody = await readJson(intentResponse);
  const intent = readRecord(intentBody.data);
  const uploadId = readString(intent?.uploadId);
  const bucket = readString(intent?.bucket);
  const objectPath = readString(intent?.objectPath);
  if (
    intentResponse.status !== 201 ||
    intentBody.ok !== true ||
    !isUuid(uploadId) ||
    !bucket ||
    !objectPath
  ) {
    throw new Error(`validation_upload_intent_http_${intentResponse.status}`);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("validation_upload_config_missing");
  }
  const storage = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
  const uploaded = await storage.storage
    .from(bucket)
    .upload(objectPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploaded.error) {
    throw new Error("validation_source_upload_failed");
  }

  return await requestJob(
    `/api/job-uploads/${encodeURIComponent(uploadId)}/accept`,
    accessToken,
    {
      headers: { "Idempotency-Key": idempotencyKey },
      method: "POST",
      expectedStatus: 202,
    },
  );
}

async function createReviewer(
  accessToken: string,
  idempotencyKey: string,
  sourceVersionId: string,
  sourceTitle = "Neutral multi-subject study notes",
): Promise<JobView> {
  return await requestJob("/api/jobs", accessToken, {
    body: JSON.stringify({
      jobType: "reviewer_generation",
      outputMode: "standard",
      reuseMode: "fresh",
      sourceTitle,
      sourceVersionId,
    }),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    method: "POST",
    expectedStatus: 202,
  });
}

async function createRevision(
  accessToken: string,
  input: {
    readonly expectedParentSha256: string;
    readonly parentSourceVersionId: string;
    readonly sourceText: string;
  },
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${apiBaseUrl}/api/sources/${input.parentSourceVersionId}/revisions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedParentSha256: input.expectedParentSha256,
        selectAsActive: false,
        sourceText: input.sourceText,
      }),
    },
  );
  const body = await readJson(response);
  if (response.status !== 201 || body.ok !== true || !readRecord(body.data)) {
    throw new Error(`validation_revision_http_${response.status}`);
  }
  return readRecord(body.data) ?? {};
}

async function requestJob(
  path: string,
  accessToken: string,
  input: {
    readonly body: BodyInit;
    readonly headers: Readonly<Record<string, string>>;
    readonly method: "POST";
    readonly expectedStatus: number;
  },
): Promise<JobView> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...input.headers,
    },
    body: input.body,
  });
  const body = await readJson(response);
  const job = parseJob(body.data);
  if (response.status !== input.expectedStatus || body.ok !== true || !job) {
    const errorCode = readString(readRecord(body.error)?.code);
    throw new Error(
      `validation_job_creation_http_${response.status}${
        /^[a-z0-9_]+$/i.test(errorCode) ? `_${errorCode}` : ""
      }`,
    );
  }
  return job;
}

async function waitForTerminalJob(
  accessToken: string,
  jobId: string,
  deadlineMs: number,
): Promise<JobView> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${apiBaseUrl}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await readJson(response);
    const job = parseJob(body.data);
    if (!response.ok || body.ok !== true || !job) {
      throw new Error(`validation_job_status_http_${response.status}`);
    }
    if (terminalStatuses.has(job.status)) return job;
    await delay(2_000);
  }
  throw new Error("validation_job_deadline_exceeded");
}

async function waitForJobStatus(
  accessToken: string,
  jobId: string,
  expected: ReadonlySet<string>,
  deadlineMs: number,
  intervalMs: number,
): Promise<JobView> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${apiBaseUrl}/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await readJson(response);
    const job = parseJob(body.data);
    if (!response.ok || body.ok !== true || !job) {
      throw new Error(`validation_job_status_http_${response.status}`);
    }
    if (expected.has(job.status)) return job;
    await delay(intervalMs);
  }
  throw new Error("validation_job_status_deadline_exceeded");
}

async function getResult(
  accessToken: string,
  jobId: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBaseUrl}/api/jobs/${jobId}/result`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await readJson(response);
  const data = readRecord(body.data);
  if (!response.ok || body.ok !== true || !data) {
    throw new Error(`validation_job_result_http_${response.status}`);
  }
  return data;
}

async function createNeutralNativeTextPdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = [
    {
      heading: "Biology observation",
      lines: [
        "Plants move water from roots toward leaves through xylem tissue.",
        "Water loss from leaf surfaces contributes to the upward movement.",
        "A controlled comparison changes one condition while holding others steady.",
        "Measurements should include units, timing, and the observed response.",
        "A conclusion must distinguish the observation from its interpretation.",
      ],
    },
    {
      heading: "Historical evidence",
      lines: [
        "A primary source was produced during the period being investigated.",
        "A secondary source interprets evidence after the events took place.",
        "Authorship, audience, purpose, and context affect how evidence is read.",
        "Two accounts may disagree without either account being useless.",
        "A supported claim identifies the evidence and explains its relevance.",
      ],
    },
    {
      heading: "Mathematical representation",
      lines: [
        "A linear relationship has a constant rate of change over an interval.",
        "The slope describes how much the output changes for one input unit.",
        "The intercept identifies the output when the input is zero.",
        "Tables, equations, and graphs can represent the same relationship.",
        "Checking substituted values helps verify an equation against observations.",
      ],
    },
  ];

  for (const fixture of pages) {
    const page = document.addPage([612, 792]);
    page.drawText(fixture.heading, {
      x: 54,
      y: 720,
      font: bold,
      size: 20,
      color: rgb(0.1, 0.1, 0.1),
    });
    fixture.lines.forEach((line, index) => {
      page.drawText(line, {
        x: 54,
        y: 665 - index * 68,
        font,
        size: 11,
        color: rgb(0.1, 0.1, 0.1),
      });
      page.drawText(
        `Study prompt ${index + 1}: restate the idea and identify its evidence.`,
        {
          x: 72,
          y: 643 - index * 68,
          font,
          size: 10,
          color: rgb(0.25, 0.25, 0.25),
        },
      );
    });
  }
  return await document.save({ useObjectStreams: false });
}

async function waitForApi(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health`, {
        cache: "no-store",
      });
      if (response.ok) return;
    } catch {
      // The local API may still be compiling.
    }
    await delay(1_000);
  }
  throw new Error("validation_api_unreachable");
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const value = await response.json().catch(() => null);
  return readRecord(value) ?? {};
}

function parseJob(value: unknown): JobView | null {
  const record = readRecord(value);
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.status !== "string"
  ) {
    return null;
  }
  return {
    id: record.id,
    status: record.status,
    attemptCount:
      typeof record.attemptCount === "number" ? record.attemptCount : 0,
    source: readRecord(record.source) as JobView["source"],
  };
}

interface JobView {
  readonly id: string;
  readonly status: string;
  readonly attemptCount: number;
  readonly source?: {
    readonly displayName?: unknown;
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNestedString(
  value: Record<string, unknown>,
  path: readonly string[],
): string {
  let current: unknown = value;
  for (const key of path) current = readRecord(current)?.[key];
  return readString(current);
}

function readNestedNumber(
  value: Record<string, unknown>,
  path: readonly string[],
): number | null {
  let current: unknown = value;
  for (const key of path) current = readRecord(current)?.[key];
  return typeof current === "number" && Number.isFinite(current)
    ? current
    : null;
}

function readNestedArrayLength(
  value: Record<string, unknown>,
  path: readonly string[],
): number | null {
  let current: unknown = value;
  for (const key of path) current = readRecord(current)?.[key];
  return Array.isArray(current) ? current.length : null;
}

function readSafeStatus(value: unknown): string {
  return typeof value === "string" && /^[a-z_]+$/i.test(value)
    ? value
    : "unknown";
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`validation_setting_missing_${name}`);
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function assert(condition: boolean, category: string): asserts condition {
  if (!condition) {
    throw new Error(`validation_assertion_${category.replace(/\s+/g, "_")}`);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    errorCode:
      error instanceof Error && /^[a-z0-9_]+$/i.test(error.message)
        ? error.message
        : "processing_validation_failed",
  }));
  process.exitCode = 1;
});
