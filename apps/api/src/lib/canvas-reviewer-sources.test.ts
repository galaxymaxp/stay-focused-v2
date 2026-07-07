import type { Database } from "@stay-focused/db";
import type { OcrInput, OcrProvider, OcrResult } from "@stay-focused/ocr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { safeObjectKeyForCanvasFile } from "@/lib/canvas-file-policy";
import {
  CANVAS_REVIEWER_MAX_COMBINED_CHARS,
  CANVAS_REVIEWER_MAX_SOURCES,
  CANVAS_REVIEWER_MAX_SOURCE_CHARS,
  CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS,
  assembleCanvasSourcePreview,
  buildSuggestedCanvasReviewerTitle,
  getCanvasReviewerSourceLimits,
  listCanvasReviewerSources,
  normalizeCanvasHtmlToText,
  previewCanvasReviewerSources,
  previewSelectiveCanvasReviewerSources,
  type PreviewSourceRecord,
  structureCanvasReviewerSources,
} from "./canvas-reviewer-sources";
import {
  CANVAS_HTML_STRUCTURED_BLOCKS_VERSION,
  CANVAS_SELECTIVE_PREVIEW_VERSION,
  CANVAS_STRUCTURED_BLOCKS_VERSION,
} from "./canvas-structured-blocks";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const CONNECTION_ID = "00000000-0000-4000-8000-000000000002";
const COURSE_ID = "00000000-0000-4000-8000-000000000003";
const OTHER_COURSE_ID = "00000000-0000-4000-8000-000000000004";
const RUN_ID = "00000000-0000-4000-8000-000000000005";
const PAGE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PAGE_ID = "11111111-1111-4111-8111-111111111112";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";
const ANNOUNCEMENT_ID = "33333333-3333-4333-8333-333333333333";
const FILE_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_FILE_ID = "44444444-4444-4444-8444-444444444445";
const PREVIEW_SESSION_ID = "66666666-6666-4666-8666-666666666666";
const STRUCTURE_SESSION_ID = "77777777-7777-4777-8777-777777777777";
const NOW = "2026-07-07T00:00:00.000Z";

describe("Canvas reviewer source normalization", () => {
  it("extracts readable text while preserving block, list, and table boundaries", () => {
    const text = normalizeCanvasHtmlToText(`
      <h1>Module overview</h1>
      <p>Read the chapter &amp; compare ideas.</p>
      <ol><li>First step</li><li>Second step</li></ol>
      <ul><li>Helpful note</li></ul>
      <table><tr><th>Term</th><th>Meaning</th></tr><tr><td>Focus</td><td>Attention</td></tr></table>
    `);

    expect(text).toContain("Module overview");
    expect(text).toContain("Read the chapter & compare ideas.");
    expect(text).toContain("1. First step");
    expect(text).toContain("2. Second step");
    expect(text).toContain("- Helpful note");
    expect(text).toContain("Term | Meaning");
    expect(text).toContain("Focus | Attention");
  });

  it("removes non-visible or executable content and does not include link targets", () => {
    const text = normalizeCanvasHtmlToText(`
      <p>Visible paragraph</p>
      <script>secretScript()</script>
      <style>.private { color: red; }</style>
      <form><input value="hidden form value"></form>
      <p style="display: none">Hidden text</p>
      <a href="https://canvas.example.invalid/files/1?verifier=secret">reading link</a>
      <p>https://canvas.example.invalid/private?token=secret</p>
      <p>Bearer raw-token-value</p>
    `);

    expect(text).toContain("Visible paragraph");
    expect(text).toContain("reading link");
    expect(text).not.toContain("secretScript");
    expect(text).not.toContain("hidden form value");
    expect(text).not.toContain("Hidden text");
    expect(text).not.toContain("https://canvas.example.invalid");
    expect(text).not.toContain("raw-token-value");
    expect(text).toContain("[link removed]");
    expect(text).toContain("Bearer [redacted]");
  });

  it("returns empty text when the body has no readable content", () => {
    expect(normalizeCanvasHtmlToText(null)).toBe("");
    expect(normalizeCanvasHtmlToText("<script>onlyCode()</script>")).toBe("");
  });

  it("assembles selected sources with deterministic visible boundaries only", () => {
    const sourceText = assembleCanvasSourcePreview([
      source("page:11111111-1111-4111-8111-111111111111", "page", "Overview"),
      source(
        "assignment:22222222-2222-4222-8222-222222222222",
        "assignment",
        "Practice",
      ),
    ]);

    expect(sourceText).toContain("SOURCE 1 - PAGE - Overview");
    expect(sourceText).toContain("SOURCE 2 - ASSIGNMENT - Practice");
    expect(sourceText).toContain("Readable study text.");
    expect(sourceText).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(sourceText).not.toContain("22222222-2222-4222-8222-222222222222");
  });

  it("keeps suggested titles bounded and URL-free", () => {
    const title = buildSuggestedCanvasReviewerTitle(
      `Very long course title ${"unit ".repeat(80)} https://canvas.example.invalid`,
    );

    expect(title.length).toBeLessThanOrEqual(
      CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS,
    );
    expect(title).toContain("Canvas Reviewer");
    expect(title).not.toContain("https://canvas.example.invalid");
  });

  it("keeps preview limits below the existing reviewer request limit", () => {
    expect(getCanvasReviewerSourceLimits()).toMatchObject({
      maximumSources: CANVAS_REVIEWER_MAX_SOURCES,
      maximumCharactersPerSource: CANVAS_REVIEWER_MAX_SOURCE_CHARS,
      maximumCombinedPreviewCharacters: CANVAS_REVIEWER_MAX_COMBINED_CHARS,
      suggestedTitleLimit: CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS,
    });
    expect(CANVAS_REVIEWER_MAX_COMBINED_CHARS).toBeLessThan(100_000);
  });
});

describe("Canvas reviewer source service", () => {
  it("lists only selected-course descriptors without source bodies", async () => {
    const fake = createFakeCanvasClient();
    const provider = createFakeOcrProvider("unused");

    const result = await listCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.courseSync).toMatchObject({
      status: "partial",
      latestResultWasPartial: true,
      synchronizedSourcesAvailable: true,
      failureCategories: ["files", "timeout"],
    });
    expect(result.value.availableSourceCount).toBe(3);
    expect(result.value.unavailableSourceCount).toBe(1);
    expect(result.value.sources.map((entry) => entry.id)).toEqual([
      `page:${PAGE_ID}`,
      `assignment:${ASSIGNMENT_ID}`,
      `announcement:${ANNOUNCEMENT_ID}`,
      `file:${FILE_ID}`,
    ]);
    expect(result.value.sources.find((entry) => entry.type === "file")).toMatchObject({
      availability: "unavailable",
      file: {
        canPrepare: true,
        kind: "pdf",
        preparationStatus: "not_prepared",
      },
      unavailableReason: "Prepare this file before using it.",
    });
    expect(JSON.stringify(result.value)).not.toContain("body_html");
    expect(JSON.stringify(result.value)).not.toContain("description_html");
    expect(JSON.stringify(result.value)).not.toContain("message_html");
    expect(fake.selectedColumnsFor("canvas_connections").join(",")).not.toContain(
      "token_ciphertext",
    );
    expect(fake.storageCalls).toHaveLength(0);
    expect(provider.calls).toHaveLength(0);
  });

  it("lists ready PDF and image descriptors as selectable without private fields", async () => {
    const pdfBytes = await createPdfBytes(1);
    const imageBytes = createPngBytes();
    const pdfFile = readyFileRow({
      bytes: pdfBytes,
      contentType: "application/pdf",
      fileId: FILE_ID,
      title: "Fictional handout.pdf",
    });
    const imageFile = readyFileRow({
      bytes: imageBytes,
      contentType: "image/png",
      fileId: OTHER_FILE_ID,
      title: "Fictional diagram.png",
    });
    const fake = createFakeCanvasClient({
      canvas_files: [pdfFile, imageFile],
    });

    const result = await listCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.sources.filter((entry) => entry.type === "file")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          availability: "available",
          file: {
            canPrepare: false,
            kind: "pdf",
            preparationStatus: "ready",
          },
          id: `file:${FILE_ID}`,
          unavailableReason: null,
        }),
        expect.objectContaining({
          availability: "available",
          file: {
            canPrepare: false,
            kind: "image",
            preparationStatus: "ready",
          },
          id: `file:${OTHER_FILE_ID}`,
          unavailableReason: null,
        }),
      ]),
    );
    const serialized = JSON.stringify(result.value);
    expect(serialized).not.toContain("storage_object_key");
    expect(serialized).not.toContain("current_sha256");
  });

  it.each([
    [
      "failed but retryable",
      {
        content_type: "image/jpeg",
        display_name: "Fictional retry.jpg",
        filename: "fictional-retry.jpg",
        ingestion_eligibility: "eligible_image",
        ingestion_status: "failed",
      },
      {
        file: {
          canPrepare: true,
          kind: "image",
          preparationStatus: "failed",
        },
        reason: "Preparation failed. Try preparing this file again.",
      },
    ],
    [
      "blocked by size",
      {
        ingestion_eligibility: "blocked_size",
        size_bytes: 100_000_000,
      },
      {
        file: {
          canPrepare: false,
          kind: "pdf",
          preparationStatus: "blocked",
        },
        reason: "This file exceeds the supported size.",
      },
    ],
    [
      "unsupported plain text",
      {
        content_type: "text/plain",
        display_name: "Fictional notes.txt",
        filename: "fictional-notes.txt",
        ingestion_eligibility: "metadata_only_unsupported",
        ingestion_status: "metadata_only",
      },
      {
        file: {
          canPrepare: false,
          kind: "unsupported",
          preparationStatus: "unsupported",
        },
        reason: "This file type is not supported yet.",
      },
    ],
  ])("lists %s file descriptors with safe state", async (_name, overrides, expected) => {
    const fake = createFakeCanvasClient({
      canvas_files: [{ ...baseFileRow(), ...overrides }],
    });

    const result = await listCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const descriptor = result.value.sources.find((entry) => entry.type === "file");
    expect(descriptor).toMatchObject({
      availability: "unavailable",
      file: expected.file,
      unavailableReason: expected.reason,
    });
  });

  it("preserves submitted preview order after same-course ownership lookup", async () => {
    const fake = createFakeCanvasClient();

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`assignment:${ASSIGNMENT_ID}`, `page:${PAGE_ID}`],
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.previewSessionId).toBe(PREVIEW_SESSION_ID);
    expect(result.value.sources.map((source) => source.id)).toEqual([
      `assignment:${ASSIGNMENT_ID}`,
      `page:${PAGE_ID}`,
    ]);
    expect(result.value.sourceText.indexOf("SOURCE 1 - ASSIGNMENT")).toBeLessThan(
      result.value.sourceText.indexOf("SOURCE 2 - PAGE"),
    );
    expect(result.value.sourceText).not.toContain(ASSIGNMENT_ID);
    expect(result.value.sourceText).not.toContain(PAGE_ID);
    expect(JSON.stringify(result.value)).not.toContain("source_manifest");
    expect(JSON.stringify(result.value)).not.toContain("sha256");
  });

  it("stores private structured blocks while returning public block selectors", async () => {
    const fake = createFakeCanvasClient();

    const result = await structureCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${PAGE_ID}`],
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.structureSessionId).toBe(STRUCTURE_SESSION_ID);
    expect(result.value.sources).toEqual([
      expect.objectContaining({
        ordinal: 1,
        title: "Fictional Page",
        type: "page",
        blocks: [
          expect.objectContaining({
            kind: "heading",
            selectedByDefault: true,
            sourceOrdinal: 1,
            text: "Overview",
          }),
          expect.objectContaining({
            kind: "paragraph",
            selectedByDefault: true,
            sourceOrdinal: 1,
            text: "Readable page text.",
          }),
        ],
      }),
    ]);
    expect(JSON.stringify(result.value)).not.toContain("block_sha256");
    expect(JSON.stringify(result.value)).not.toContain("parser_version");

    const session = fake.insertedRowsFor("canvas_source_structure_sessions")[0];
    expect(session).toMatchObject({
      id: STRUCTURE_SESSION_ID,
      user_id: USER_ID,
      canvas_connection_id: CONNECTION_ID,
      course_id: COURSE_ID,
      source_count: 1,
      block_count: 2,
      structure_version: CANVAS_STRUCTURED_BLOCKS_VERSION,
    });
    const blockManifest = session.block_manifest as readonly FakeRecord[];
    expect(blockManifest).toHaveLength(2);
    expect(blockManifest[0]).toMatchObject({
      block_kind: "heading",
      block_ordinal: 1,
      parser_version: CANVAS_HTML_STRUCTURED_BLOCKS_VERSION,
      source_ordinal: 1,
    });
    expect(blockManifest[0]?.block_sha256).toMatch(/^[a-f0-9]{64}$/);
    const sourceManifest = session.source_manifest as readonly FakeRecord[];
    expect(sourceManifest[0]).toMatchObject({
      ordinal: 1,
      parser_version: CANVAS_HTML_STRUCTURED_BLOCKS_VERSION,
      source_row_id: PAGE_ID,
      source_type: "page",
    });
  });

  it("builds selective previews from server-held blocks and stores selected-block provenance", async () => {
    const fake = createFakeCanvasClient();
    const structure = await structureCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${PAGE_ID}`],
      userId: USER_ID,
    });
    expect(structure.ok).toBe(true);
    if (!structure.ok) return;

    const blocks = structure.value.sources[0]?.blocks ?? [];
    const result = await previewSelectiveCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      selectedBlockIds: [blocks[1]?.id ?? "", blocks[0]?.id ?? ""],
      structureSessionId: structure.value.structureSessionId,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toMatchObject({
      previewSessionId: PREVIEW_SESSION_ID,
      selectedBlockCount: 2,
      sourceCount: 1,
      sources: [{ id: `page:${PAGE_ID}`, type: "page" }],
    });
    expect(result.value.sourceText).toContain("SOURCE 1 - PAGE - Fictional Page");
    expect(result.value.sourceText.indexOf("# Overview")).toBeLessThan(
      result.value.sourceText.indexOf("Readable page text."),
    );
    expect(JSON.stringify(result.value)).not.toContain("block_sha256");
    expect(JSON.stringify(result.value)).not.toContain("source_manifest");

    const previewSession =
      fake.insertedRowsFor("canvas_source_preview_sessions").at(-1);
    expect(previewSession).toMatchObject({
      id: PREVIEW_SESSION_ID,
      normalization_version: CANVAS_SELECTIVE_PREVIEW_VERSION,
      source_count: 1,
    });
    const selectedBlockManifest =
      previewSession?.selected_block_manifest as readonly FakeRecord[];
    expect(selectedBlockManifest.map((block) => block.block_ordinal)).toEqual([
      1,
      2,
    ]);
    expect(selectedBlockManifest[0]).toMatchObject({
      block_kind: "heading",
      parser_version: CANVAS_HTML_STRUCTURED_BLOCKS_VERSION,
      source_ordinal: 1,
    });
    expect(selectedBlockManifest[0]?.block_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects duplicate selected block IDs before storing selective preview provenance", async () => {
    const fake = createFakeCanvasClient();
    const structure = await structureCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${PAGE_ID}`],
      userId: USER_ID,
    });
    expect(structure.ok).toBe(true);
    if (!structure.ok) return;
    const blockId = structure.value.sources[0]?.blocks[0]?.id ?? "";

    const result = await previewSelectiveCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      selectedBlockIds: [blockId, blockId],
      structureSessionId: structure.value.structureSessionId,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_block_selection_duplicate",
    });
    expect(fake.insertedRowsFor("canvas_source_preview_sessions")).toHaveLength(0);
  });

  it("rejects duplicate IDs before reading storage", async () => {
    const fake = createFakeCanvasClient();

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${PAGE_ID}`, `page:${PAGE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_duplicate",
    });
    expect(fake.calls).toHaveLength(0);
  });

  it("rejects cross-course and unsupported source IDs", async () => {
    const fake = createFakeCanvasClient();

    const crossCourse = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${OTHER_PAGE_ID}`],
      userId: USER_ID,
    });
    const file = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(crossCourse).toMatchObject({
      ok: false,
      code: "canvas_source_not_found",
    });
    expect(file).toMatchObject({
      ok: false,
      code: "canvas_source_file_preparation_required",
    });
  });

  it("preserves mixed Page/PDF/Announcement order through Storage-backed OCR", async () => {
    const pdfBytes = await createPdfBytes(2);
    const file = readyFileRow({
      bytes: pdfBytes,
      contentType: "application/pdf",
      fileId: FILE_ID,
      title: "Fictional handout.pdf",
    });
    const fake = createFakeCanvasClient(
      {
        canvas_files: [file],
      },
      [[String(file.storage_object_key), pdfBytes]],
    );
    const provider = createFakeOcrProvider((input) =>
      input.kind === "pdf"
        ? input.requestedPages.map((page) => `PDF page ${page} text.`).join("\n\n")
        : "unused",
    );

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      ocrProvider: provider,
      sourceIds: [`page:${PAGE_ID}`, `file:${FILE_ID}`, `announcement:${ANNOUNCEMENT_ID}`],
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.sources).toEqual([
      expect.objectContaining({ id: `page:${PAGE_ID}`, type: "page" }),
      expect.objectContaining({
        fileKind: "pdf",
        id: `file:${FILE_ID}`,
        pageCount: 2,
        type: "file",
      }),
      expect.objectContaining({
        id: `announcement:${ANNOUNCEMENT_ID}`,
        type: "announcement",
      }),
    ]);
    expect(result.value.sourceText.indexOf("SOURCE 1 - PAGE")).toBeLessThan(
      result.value.sourceText.indexOf("SOURCE 2 - PDF"),
    );
    expect(result.value.sourceText.indexOf("SOURCE 2 - PDF")).toBeLessThan(
      result.value.sourceText.indexOf("SOURCE 3 - ANNOUNCEMENT"),
    );
    expect(result.value.sourceText).toContain("PDF page 1 text.\n\nPDF page 2 text.");
    expect(fake.storageCalls).toHaveLength(1);
    expect(provider.calls).toHaveLength(1);
    expect(JSON.stringify(result.value)).not.toContain("storage_object_key");
    expect(JSON.stringify(result.value)).not.toContain("current_sha256");

    const session = fake.insertedRowsFor("canvas_source_preview_sessions")[0];
    expect(session).toMatchObject({
      id: PREVIEW_SESSION_ID,
      user_id: USER_ID,
      canvas_connection_id: CONNECTION_ID,
      course_id: COURSE_ID,
      original_preview_text: result.value.sourceText,
      original_preview_sha256: createHash("sha256")
        .update(result.value.sourceText, "utf8")
        .digest("hex"),
      source_count: 3,
      suggested_title: "Fictional Biology - Canvas Reviewer",
      normalization_version: "canvas-source-preview-v1",
    });
    const manifest = session.source_manifest as readonly FakeRecord[];
    expect(manifest.map((item) => item.ordinal)).toEqual([1, 2, 3]);
    expect(manifest.map((item) => item.source_type)).toEqual([
      "page",
      "file",
      "announcement",
    ]);
    expect(manifest[0]).toMatchObject({
      parser_version: "canvas-html-visible-text-v1",
      ocr_version: null,
      source_row_id: PAGE_ID,
    });
    expect(manifest[1]).toMatchObject({
      file_kind: "pdf",
      ocr_version: "canvas-stored-pdf-ocr-v1",
      page_count: 2,
      parser_version: "canvas-stored-file-extraction-v1",
      source_row_id: FILE_ID,
    });
    expect(manifest[2]).toMatchObject({
      parser_version: "canvas-html-visible-text-v1",
      source_row_id: ANNOUNCEMENT_ID,
    });
    for (const item of manifest) {
      expect(item.normalized_content_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item).not.toHaveProperty("storage_bucket");
      expect(item).not.toHaveProperty("storage_object_key");
    }
  });

  it("rejects two file sources before reading Storage or invoking OCR", async () => {
    const fake = createFakeCanvasClient();
    const provider = createFakeOcrProvider("unused");

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      ocrProvider: provider,
      sourceIds: [`file:${FILE_ID}`, `file:${OTHER_FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_ocr_file_limit_exceeded",
    });
    expect(fake.calls).toHaveLength(0);
    expect(fake.storageCalls).toHaveLength(0);
    expect(provider.calls).toHaveLength(0);
  });

  it("rejects an unprepared file without returning partial preview text", async () => {
    const fake = createFakeCanvasClient();
    const provider = createFakeOcrProvider("unused");

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      ocrProvider: provider,
      sourceIds: [`page:${PAGE_ID}`, `file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_file_preparation_required",
    });
    expect(JSON.stringify(result)).not.toContain("Readable page text");
    expect(fake.storageCalls).toHaveLength(0);
    expect(provider.calls).toHaveLength(0);
  });

  it("enforces the per-source limit after file OCR", async () => {
    const imageBytes = createPngBytes();
    const file = readyFileRow({
      bytes: imageBytes,
      contentType: "image/png",
      fileId: FILE_ID,
      title: "Fictional diagram.png",
    });
    const fake = createFakeCanvasClient(
      { canvas_files: [file] },
      [[String(file.storage_object_key), imageBytes]],
    );

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      ocrProvider: createFakeOcrProvider("A".repeat(CANVAS_REVIEWER_MAX_SOURCE_CHARS + 1)),
      sourceIds: [`file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_preview_too_large",
      details: {
        allowedMaximum: CANVAS_REVIEWER_MAX_SOURCE_CHARS,
      },
    });
    expect(JSON.stringify(result)).not.toContain("AAAAA");
  });

  it("enforces the combined limit after file OCR assembly", async () => {
    const pageRows = Array.from({ length: 7 }, (_, index) =>
      pageRow({
        bodyText: "P".repeat(11_500),
        id: pageId(index),
        title: `Fictional Page ${index + 1}`,
      }),
    );
    const imageBytes = createPngBytes();
    const file = readyFileRow({
      bytes: imageBytes,
      contentType: "image/png",
      fileId: FILE_ID,
      title: "Fictional diagram.png",
    });
    const fake = createFakeCanvasClient(
      {
        canvas_files: [file],
        canvas_pages: pageRows,
      },
      [[String(file.storage_object_key), imageBytes]],
    );

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      ocrProvider: createFakeOcrProvider("I".repeat(10_000)),
      sourceIds: [...pageRows.map((row) => `page:${row.id}`), `file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_preview_too_large",
      details: {
        allowedMaximum: CANVAS_REVIEWER_MAX_COMBINED_CHARS,
        selectedSourceCount: 8,
      },
    });
    expect(JSON.stringify(result)).not.toContain("IIIII");
   });

  it("returns safe size details without silently truncating large sources", async () => {
    const largePageBody = `<p>${"Large fictional paragraph. ".repeat(900)}</p>`;
    const fake = createFakeCanvasClient({
      canvas_pages: [
        {
          ...basePageRow(),
          body_html: largePageBody,
        },
      ],
    });

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${PAGE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_preview_too_large",
      details: {
        allowedMaximum: CANVAS_REVIEWER_MAX_SOURCE_CHARS,
        selectedSourceCount: 1,
      },
    });
    expect(JSON.stringify(result)).not.toContain("Large fictional paragraph");
  });
});

function source(
  id: string,
  type: "page" | "assignment" | "announcement",
  title: string,
): PreviewSourceRecord {
  return {
    descriptor: {
      availability: "available",
      estimatedCharacters: 20,
      file: null,
      id,
      title,
      type,
      unavailableReason: null,
      updatedAt: "2026-07-07T00:00:00.000Z",
    },
    provenance: {
      canvas_connection_id: CONNECTION_ID,
      canvas_course_id: "101",
      canvas_source_object_id: "fictional-source",
      canvas_updated_at: NOW,
      course_id: COURSE_ID,
      file_id: null,
      file_kind: null,
      local_synced_at: NOW,
      mime_type: null,
      module_id: null,
      module_item_id: null,
      normalized_content_sha256: createHash("sha256")
        .update("Readable study text.", "utf8")
        .digest("hex"),
      ocr_version: null,
      page_count: null,
      parser_version: "canvas-html-visible-text-v1",
      source_row_id: id.split(":")[1] ?? null,
      source_title: title,
      source_type: type,
      stored_content_sha256: null,
    },
    text: "Readable study text.",
  };
}

type FakeRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is FakeRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface FakeCall {
  readonly table: string;
  readonly selectedColumns: string;
}

interface FakeStorageCall {
  readonly bucket: string;
  readonly key: string;
}

interface FakeQueryResult {
  readonly data: unknown;
  readonly error: null;
}

class FakeSupabaseQuery implements PromiseLike<FakeQueryResult> {
  private filters: Array<(row: FakeRecord) => boolean> = [];
  private insertedRows: readonly FakeRecord[] | null = null;
  private limitCount: number | null = null;
  private orders: Array<{
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst: boolean;
  }> = [];
  private selectedColumns = "*";

  public constructor(
    private readonly tableName: string,
    private readonly rows: readonly FakeRecord[],
    private readonly calls: FakeCall[],
    private readonly capturedInserts: Map<string, FakeRecord[]>,
  ) {}

  public select(columns: string): this {
    this.selectedColumns = columns;
    this.calls.push({
      selectedColumns: columns,
      table: this.tableName,
    });
    return this;
  }

  public insert(value: unknown): this {
    const rows = (Array.isArray(value) ? value : [value]).map((entry, index) => {
      const record = isRecord(entry) ? entry : {};
      return {
        id:
          typeof record.id === "string"
            ? record.id
            : this.tableName === "canvas_source_structure_sessions"
              ? STRUCTURE_SESSION_ID
              : index === 0
                ? PREVIEW_SESSION_ID
                : `${PREVIEW_SESSION_ID}-${index}`,
        ...record,
      };
    });
    this.insertedRows = rows;
    const tableRows = this.capturedInserts.get(this.tableName) ?? [];
    tableRows.push(...rows);
    this.capturedInserts.set(this.tableName, tableRows);
    return this;
  }

  public eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  public neq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  public in(column: string, values: readonly unknown[]): this {
    const allowed = new Set(values);
    this.filters.push((row) => allowed.has(row[column]));
    return this;
  }

  public order(
    column: string,
    options: { readonly ascending?: boolean; readonly nullsFirst?: boolean } = {},
  ): this {
    this.orders.push({
      ascending: options.ascending ?? true,
      column,
      nullsFirst: options.nullsFirst ?? false,
    });
    return this;
  }

  public limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  public async maybeSingle(): Promise<FakeQueryResult> {
    const rows = this.executeRows();
    return {
      data: rows[0] ?? null,
      error: null,
    };
  }

  public async single(): Promise<FakeQueryResult> {
    const rows = this.insertedRows ?? this.executeRows();
    return {
      data: rows[0] ?? null,
      error: null,
    };
  }

  public then<TResult1 = FakeQueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: FakeQueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.executeRows(),
      error: null,
    }).then(onfulfilled, onrejected);
  }

  private executeRows(): readonly FakeRecord[] {
    if (this.insertedRows) {
      return this.insertedRows;
    }
    const allRows = [
      ...this.rows,
      ...(this.capturedInserts.get(this.tableName) ?? []),
    ];
    const filtered = allRows.filter((row) =>
      this.filters.every((filter) => filter(row)),
    );
    const ordered = [...filtered].sort((left, right) =>
      compareByOrders(left, right, this.orders),
    );
    return this.limitCount === null ? ordered : ordered.slice(0, this.limitCount);
  }
}

function compareByOrders(
  left: FakeRecord,
  right: FakeRecord,
  orders: readonly {
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst: boolean;
  }[],
): number {
  for (const order of orders) {
    const comparison = compareFakeValues(
      left[order.column],
      right[order.column],
      order.nullsFirst,
    );
    if (comparison !== 0) {
      return order.ascending ? comparison : -comparison;
    }
  }
  return 0;
}

function compareFakeValues(
  left: unknown,
  right: unknown,
  nullsFirst: boolean,
): number {
  const leftMissing = left === null || left === undefined;
  const rightMissing = right === null || right === undefined;
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing === nullsFirst ? -1 : 1;
  }
  const leftText = String(left);
  const rightText = String(right);
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
}

function createFakeCanvasClient(
  overrides: Partial<Record<string, readonly FakeRecord[]>> = {},
  storageEntries: readonly (readonly [string, Uint8Array])[] = [],
): {
  readonly calls: readonly FakeCall[];
  readonly client: SupabaseClient<Database>;
  readonly insertedRowsFor: (table: string) => readonly FakeRecord[];
  readonly selectedColumnsFor: (table: string) => readonly string[];
  readonly storageCalls: readonly FakeStorageCall[];
} {
  const calls: FakeCall[] = [];
  const capturedInserts = new Map<string, FakeRecord[]>();
  const storageCalls: FakeStorageCall[] = [];
  const storageObjects = new Map(storageEntries);
  const tables = {
    ...baseCanvasTables(),
    ...overrides,
  };
  const client = {
    from: (tableName: string) =>
      new FakeSupabaseQuery(
        tableName,
        tables[tableName] ?? [],
        calls,
        capturedInserts,
      ),
    storage: {
      from: (bucket: string) => ({
        download: async (key: string) => {
          storageCalls.push({ bucket, key });
          const bytes = storageObjects.get(key);
          if (!bytes) {
            return {
              data: null,
              error: {
                message: "Object not found",
                name: "StorageApiError",
                status: 404,
              },
            };
          }
          return {
            data: new Blob([arrayBufferFromBytes(bytes)]),
            error: null,
          };
        },
      }),
    },
  } as unknown as SupabaseClient<Database>;

  return {
    calls,
    client,
    insertedRowsFor: (table) => capturedInserts.get(table) ?? [],
    selectedColumnsFor: (table) =>
      calls
        .filter((call) => call.table === table)
        .map((call) => call.selectedColumns),
    storageCalls,
  };
}

function baseCanvasTables(): Record<string, readonly FakeRecord[]> {
  return {
    canvas_announcements: [baseAnnouncementRow()],
    canvas_assignments: [baseAssignmentRow()],
    canvas_connections: [baseConnectionRow()],
    canvas_course_sync_preferences: [basePreferenceRow()],
    canvas_course_sync_states: [baseSyncStateRow()],
    canvas_courses: [baseCourseRow()],
    canvas_files: [baseFileRow()],
    canvas_pages: [basePageRow(), baseOtherCoursePageRow()],
    canvas_sync_course_results: [baseCourseResultRow()],
    canvas_sync_runs: [baseSyncRunRow()],
  };
}

function baseConnectionRow(): FakeRecord {
  return {
    id: CONNECTION_ID,
    user_id: USER_ID,
    base_url: "https://canvas.example.invalid",
    canvas_user_id: "fictional-user",
    canvas_user_name: "Fictional Student",
    canvas_user_email: null,
    status: "active",
    last_verified_at: NOW,
    last_error_code: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function baseCourseRow(): FakeRecord {
  return {
    id: COURSE_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    name: "Fictional Biology",
    course_code: "BIO-FICTION",
    workflow_state: "available",
    enrollment_term_id: null,
    account_id: null,
    start_at: null,
    end_at: null,
    time_zone: null,
    public_syllabus: null,
    syllabus_body: null,
    canvas_updated_at: NOW,
    first_synced_at: NOW,
    last_synced_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  };
}

function basePreferenceRow(): FakeRecord {
  return {
    id: "00000000-0000-4000-8000-000000000006",
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    selected: true,
    display_order: 0,
    selected_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  };
}

function baseSyncRunRow(): FakeRecord {
  return {
    id: RUN_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    scope_course_id: COURSE_ID,
    sync_mode: "course",
    status: "partial",
    started_at: NOW,
    completed_at: NOW,
    heartbeat_at: NOW,
    discovered_course_count: 1,
    successful_course_count: 0,
    failed_course_count: 1,
    resource_counts: {},
    failure_code: null,
    failure_summary: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function baseSyncStateRow(): FakeRecord {
  return {
    id: "00000000-0000-4000-8000-000000000007",
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    course_id: COURSE_ID,
    snapshot_fingerprint: "fictional-fingerprint",
    fingerprint_version: "v1",
    last_checked_at: NOW,
    last_changed_at: NOW,
    last_successful_sync_at: NOW,
    consecutive_failure_count: 0,
    last_failure_code: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function baseCourseResultRow(): FakeRecord {
  return {
    id: "00000000-0000-4000-8000-000000000008",
    sync_run_id: RUN_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_fingerprint: "fictional-fingerprint",
    status: "failed",
    failure_code: null,
    failed_operation: "files",
    failure_category: "timeout",
    http_status_class: "none",
    retryable: true,
    retry_count: 1,
    duration_ms: 100,
    created_at: NOW,
    updated_at: NOW,
  };
}

function basePageRow(): FakeRecord {
  return {
    id: PAGE_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_page_id: "page-1",
    title: "Fictional Page",
    body_html: "<h1>Overview</h1><p>Readable page text.</p>",
    canvas_updated_at: NOW,
    last_synced_at: NOW,
    updated_at: NOW,
  };
}

function baseOtherCoursePageRow(): FakeRecord {
  return {
    ...basePageRow(),
    id: OTHER_PAGE_ID,
    course_id: OTHER_COURSE_ID,
    title: "Other Fictional Page",
  };
}

function baseAssignmentRow(): FakeRecord {
  return {
    id: ASSIGNMENT_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_assignment_id: "assignment-1",
    assignment_group_id: null,
    name: "Fictional Assignment",
    description_html: "<p>Readable assignment text.</p>",
    canvas_updated_at: NOW,
    last_synced_at: NOW,
    updated_at: NOW,
  };
}

function baseAnnouncementRow(): FakeRecord {
  return {
    id: ANNOUNCEMENT_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_announcement_id: "announcement-1",
    title: "Fictional Announcement",
    message_html: "<p>Readable announcement text.</p>",
    posted_at: NOW,
    last_synced_at: NOW,
    updated_at: NOW,
  };
}

function baseFileRow(): FakeRecord {
  return {
    id: FILE_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_course_id: "101",
    canvas_file_id: "file-1",
    content_type: "application/pdf",
    display_name: "Fictional handout.pdf",
    filename: "fictional-handout.pdf",
    ingestion_eligibility: "eligible_document",
    ingestion_status: "not_requested",
    availability_status: "available",
    size_bytes: 4096,
    stored_content_type: null,
    stored_byte_count: null,
    storage_bucket: null,
    storage_object_key: null,
    current_sha256: null,
    hidden: false,
    hidden_for_user: false,
    locked: false,
    lock_at: null,
    unlock_at: null,
    media_class: null,
    media_entry_id: null,
    canvas_modified_at: NOW,
    canvas_updated_at: NOW,
    last_synced_at: NOW,
    updated_at: NOW,
  };
}

function readyFileRow({
  bytes,
  contentType,
  fileId,
  title,
}: {
  readonly bytes: Uint8Array;
  readonly contentType: "application/pdf" | "image/png" | "image/jpeg";
  readonly fileId: string;
  readonly title: string;
}): FakeRecord {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const extension =
    contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : "jpg";
  return {
    ...baseFileRow(),
    id: fileId,
    content_type: contentType,
    current_sha256: hash,
    display_name: title,
    filename: `fictional-${fileId.slice(-4)}.${extension}`,
    ingestion_eligibility:
      contentType === "application/pdf" ? "eligible_document" : "eligible_image",
    ingestion_status: "stored",
    last_successful_ingestion_at: NOW,
    storage_bucket: "canvas-source-files",
    storage_object_key: safeObjectKeyForCanvasFile({
      contentHash: hash,
      fileId,
      userId: USER_ID,
    }),
    stored_byte_count: bytes.byteLength,
    stored_content_type: contentType,
  };
}

function pageRow({
  bodyText,
  id,
  title,
}: {
  readonly bodyText: string;
  readonly id: string;
  readonly title: string;
}): FakeRecord {
  return {
    ...basePageRow(),
    body_html: `<p>${bodyText}</p>`,
    canvas_page_id: `page-${id.slice(-2)}`,
    id,
    title,
  };
}

function pageId(index: number): string {
  return `55555555-5555-4555-8555-55555555555${index}`;
}

function createFakeOcrProvider(
  textOrFactory: string | ((input: OcrInput) => string),
): OcrProvider & { readonly calls: OcrInput[] } {
  const calls: OcrInput[] = [];
  return {
    calls,
    id: "fake-ocr",
    async extract(input) {
      calls.push(input);
      const text =
        typeof textOrFactory === "function" ? textOrFactory(input) : textOrFactory;
      return ocrResult(input, text);
    },
  };
}

function ocrResult(input: OcrInput, text: string): OcrResult {
  return {
    mimeType: input.mimeType,
    pages:
      input.kind === "pdf"
        ? input.requestedPages.map((pageNumber) => ({
            blocks: [],
            pageNumber,
            text,
          }))
        : [{ blocks: [], pageNumber: 1, text }],
    provider: "fake-ocr",
    text,
    warnings: [],
  };
}

function createPngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x66, 0x69, 0x78,
  ]);
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function createPdfBytes(pageCount: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    pdf.addPage([200, 200]);
  }
  return pdf.save({ updateFieldAppearances: false });
}
