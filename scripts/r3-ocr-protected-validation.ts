import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { verifyDocumentExtraction, type OcrPage, type OcrProvider } from "@stay-focused/ocr";
import { config as loadEnv } from "dotenv";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env.smoke.local", override: false });

const apiBaseUrl = required("EXPO_PUBLIC_API_BASE_URL").replace(/\/+$/, "");

type SafeValidationResult = {
  readonly sourceLabel: string;
  readonly expectedPages: number;
  readonly processedPages: number;
  readonly extractedPages: number;
  readonly blankPages: number;
  readonly failedPages: number;
  readonly completeness: string;
  readonly providerCalls: number;
  readonly durationMs: number;
  readonly reviewerStarted: boolean;
  readonly reviewerHttpStatus: number | null;
  readonly pageHashes: readonly { readonly pageNumber: number; readonly hash: string }[];
  readonly reviewerQuality?: {
    readonly coverage: string;
    readonly grounding: string;
    readonly leakage: string;
  };
};

async function main(): Promise<void> {
  await waitForApi();
  const accessToken = await signIn();
  const singleImage = await createTextImage(1, "single");
  const twoPagePdf = await createScannedPdf([
    await createTextImage(1, "two-page"),
    await createTextImage(2, "two-page"),
  ]);
  const fivePagePdf = await createScannedPdf(
    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createTextImage(index + 1, "five-page"),
      ),
    ),
  );
  const blankPagePdf = await createScannedPdf([
    await createTextImage(1, "blank-middle"),
    await createBlankImage(),
    await createTextImage(3, "blank-middle"),
  ]);

  const single = await extractImage({
    accessToken,
    bytes: singleImage,
    sourceLabel: "single-page-image",
  });
  const twoPage = await extractPdf({
    accessToken,
    bytes: twoPagePdf,
    expectedPages: 2,
    sourceLabel: "two-page-scanned-pdf",
  });
  const fivePage = await extractPdf({
    accessToken,
    bytes: fivePagePdf,
    expectedPages: 5,
    sourceLabel: "five-page-scanned-pdf",
    runReviewer: true,
  });
  const blankMiddle = await extractPdf({
    accessToken,
    bytes: blankPagePdf,
    expectedPages: 3,
    sourceLabel: "blank-middle-page-pdf",
  });
  const incomplete = await validateIncompleteProviderSimulation();

  assert(single.completeness === "complete", "single image completeness");
  assert(twoPage.completeness === "complete", "two-page completeness");
  assert(fivePage.completeness === "complete", "five-page completeness");
  assert(fivePage.extractedPages === 5, "five-page contribution count");
  assert(fivePage.reviewerHttpStatus === 200, "five-page reviewer status");
  assert(blankMiddle.completeness === "complete", "blank-page completeness");
  assert(blankMiddle.blankPages === 1, "blank-page count");
  assert(blankMiddle.pageHashes.some((page) => page.pageNumber === 3), "later page identity");
  assert(incomplete.completeness === "incomplete", "incomplete simulation status");
  assert(incomplete.reviewerStarted === false, "incomplete reviewer gate");

  console.log(
    JSON.stringify({
      status: "passed",
      maximumConcurrency: 1,
      results: [single, twoPage, fivePage, blankMiddle, incomplete],
    }),
  );
}

async function signIn(): Promise<string> {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("protected_auth_configuration_missing");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: required("SMOKE_TEST_EMAIL"),
    password: required("SMOKE_TEST_PASSWORD"),
  });
  if (error || !data.session?.access_token) {
    throw new Error("protected_sign_in_failed");
  }
  return data.session.access_token;
}

async function extractImage({
  accessToken,
  bytes,
  sourceLabel,
}: {
  readonly accessToken: string;
  readonly bytes: Uint8Array;
  readonly sourceLabel: string;
}): Promise<SafeValidationResult> {
  const startedAt = Date.now();
  const body = new FormData();
  body.append("image", new Blob([toArrayBuffer(bytes)], { type: "image/png" }), "fictional-image.png");
  const response = await fetch(`${apiBaseUrl}/api/ocr/extract`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
  const parsed = await readSuccessfulExtraction(response);
  return summarizeExtraction({
    data: parsed.data,
    durationMs: Date.now() - startedAt,
    expectedPages: 1,
    sourceLabel,
  });
}

async function extractPdf({
  accessToken,
  bytes,
  expectedPages,
  runReviewer = false,
  sourceLabel,
}: {
  readonly accessToken: string;
  readonly bytes: Uint8Array;
  readonly expectedPages: number;
  readonly runReviewer?: boolean;
  readonly sourceLabel: string;
}): Promise<SafeValidationResult> {
  const startedAt = Date.now();
  const body = new FormData();
  body.append("pdf", new Blob([toArrayBuffer(bytes)], { type: "application/pdf" }), "fictional-document.pdf");
  const response = await fetch(`${apiBaseUrl}/api/ocr/extract-pdf`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
  const parsed = await readSuccessfulExtraction(response);
  const extractionDurationMs = Date.now() - startedAt;
  let reviewerHttpStatus: number | null = null;
  let reviewerQuality: SafeValidationResult["reviewerQuality"];

  if (runReviewer) {
    const reviewerResponse = await fetch(`${apiBaseUrl}/api/reviewer/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sourceText: parsed.data.text }),
    });
    reviewerHttpStatus = reviewerResponse.status;
    const reviewerBody = await reviewerResponse.json().catch(() => null) as Record<string, unknown> | null;
    if (!reviewerResponse.ok || reviewerBody?.ok !== true || !isRecord(reviewerBody.reviewer)) {
      throw new Error("protected_reviewer_failed");
    }
    const metadata = isRecord(reviewerBody.reviewer.metadata)
      ? reviewerBody.reviewer.metadata
      : {};
    reviewerQuality = {
      coverage: safeStatus(metadata.coverageStatus),
      grounding: safeStatus(metadata.groundingStatus),
      leakage: safeStatus(metadata.leakageStatus),
    };
  }

  return {
    ...summarizeExtraction({
      data: parsed.data,
      durationMs: extractionDurationMs,
      expectedPages,
      sourceLabel,
    }),
    reviewerStarted: runReviewer,
    reviewerHttpStatus,
    ...(reviewerQuality ? { reviewerQuality } : {}),
  };
}

async function validateIncompleteProviderSimulation(): Promise<SafeValidationResult> {
  let providerCalls = 0;
  let reviewerCalls = 0;
  const provider: OcrProvider = {
    id: "controlled-simulation",
    async extract(input) {
      providerCalls += 1;
      return {
        text: "not used after verification",
        pages: [textPage(1), textPage(3)],
        mimeType: input.mimeType,
        provider: "controlled-simulation",
        warnings: [],
      };
    },
  };
  const startedAt = Date.now();
  const result = await provider.extract({
    kind: "pdf",
    mimeType: "application/pdf",
    bytes: new Uint8Array([1]),
    requestedPages: [1, 2, 3],
  });
  const verification = verifyDocumentExtraction({
    expectedPageCount: 3,
    pages: result.pages,
  });
  if (verification.sourceEligible) {
    reviewerCalls += 1;
  }

  return {
    sourceLabel: "controlled-incomplete-provider",
    expectedPages: verification.diagnostics.expectedPageCount,
    processedPages: verification.diagnostics.processedPageCount,
    extractedPages: verification.diagnostics.successfulPageCount,
    blankPages: verification.diagnostics.blankPageCount,
    failedPages: verification.diagnostics.failedPageCount,
    completeness: verification.status,
    providerCalls,
    durationMs: Date.now() - startedAt,
    reviewerStarted: reviewerCalls > 0,
    reviewerHttpStatus: null,
    pageHashes: [],
  };
}

function summarizeExtraction({
  data,
  durationMs,
  expectedPages,
  sourceLabel,
}: {
  readonly data: Record<string, unknown>;
  readonly durationMs: number;
  readonly expectedPages: number;
  readonly sourceLabel: string;
}): SafeValidationResult {
  const extraction = isRecord(data.extraction) ? data.extraction : {};
  const pages = Array.isArray(data.pages) ? data.pages.filter(isPage) : [];
  assert(Number(extraction.expectedPageCount) === expectedPages, "expected page count");
  assert(String(extraction.status) === "complete", "complete extraction status");
  assert(pages.length === expectedPages, "page result count");

  return {
    sourceLabel,
    expectedPages,
    processedPages: Number(extraction.processedPageCount ?? 0),
    extractedPages: Number(extraction.successfulPageCount ?? 0),
    blankPages: Number(extraction.blankPageCount ?? 0),
    failedPages: Number(extraction.failedPageCount ?? 0),
    completeness: String(extraction.status ?? "unknown"),
    providerCalls: 1,
    durationMs,
    reviewerStarted: false,
    reviewerHttpStatus: null,
    pageHashes: pages.map((page) => ({
      pageNumber: page.pageNumber,
      hash: createHash("sha256").update(page.text).digest("hex").slice(0, 12),
    })),
  };
}

async function readSuccessfulExtraction(
  response: Response,
): Promise<{ readonly data: Record<string, unknown> }> {
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || body?.ok !== true || !isRecord(body.data)) {
    throw new Error(`protected_extraction_http_${response.status}`);
  }
  return { data: body.data };
}

async function createScannedPdf(images: readonly Uint8Array[]): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (const imageBytes of images) {
    const image = await document.embedPng(imageBytes);
    const page = document.addPage([612, 792]);
    page.drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
  }
  return await document.save({ useObjectStreams: false });
}

async function createTextImage(pageNumber: number, label: string): Promise<Uint8Array> {
  const lines = [
    `FICTIONAL STUDY METHOD ${pageNumber}`,
    `The ${label} lesson uses checkpoint ${pageNumber} for deliberate practice.`,
    `Learners record one observation before comparing a worked example.`,
    `A short recall round is followed by a verified correction step.`,
    `The final reflection links the checkpoint to the next fictional topic.`,
    `Unique validation token RTHREE${pageNumber} confirms this page contributed.`,
  ];
  const textElements = lines
    .map(
      (line, index) =>
        `<text x="70" y="${150 + index * 95}" font-family="Arial" font-size="${index === 0 ? 46 : 32}" font-weight="${index === 0 ? "700" : "400"}" fill="#111827">${escapeXml(line)}</text>`,
    )
    .join("");
  const svg = `<svg width="1224" height="1584" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/>${textElements}</svg>`;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

async function createBlankImage(): Promise<Uint8Array> {
  return await sharp({
    create: {
      width: 1224,
      height: 1584,
      channels: 3,
      background: "white",
    },
  }).png().toBuffer();
}

function textPage(pageNumber: number): OcrPage {
  return {
    pageNumber,
    status: "text_extracted",
    method: "ocr",
    text: `Controlled fictional page ${pageNumber}`,
    blocks: [],
  };
}

async function waitForApi(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health`, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // The caller may still be starting the local API.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("protected_api_unreachable");
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`protected_setting_missing_${name}`);
  }
  return value;
}

function isPage(value: unknown): value is { readonly pageNumber: number; readonly text: string } {
  return (
    isRecord(value) &&
    typeof value.pageNumber === "number" &&
    Number.isInteger(value.pageNumber) &&
    typeof value.text === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeStatus(value: unknown): string {
  return typeof value === "string" && /^[a-z_]+$/i.test(value) ? value : "unknown";
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function assert(condition: boolean, category: string): asserts condition {
  if (!condition) {
    throw new Error(`protected_assertion_${category.replace(/\s+/g, "_")}`);
  }
}

main().catch(() => {
  console.error(JSON.stringify({ status: "failed", category: "protected_validation_failed" }));
  process.exitCode = 1;
});
