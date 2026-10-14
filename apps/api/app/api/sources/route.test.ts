import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanonicalReviewerRecord } from "@/lib/canonical-reviewers";
import { referencedSourceBlocks } from "@/lib/study-assist";
import { lowestSectionPage } from "@/lib/source-page-snapshots";
import { POST } from "./route";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const sourceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const childId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const assetId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const mocks = vi.hoisted(() => ({ owner: "", blockLoad: "ok", extractionReads: [] as Record<string, unknown>[], rows: {
  source_versions: [] as Record<string, unknown>[], document_assets: [] as Record<string, unknown>[],
  processing_job_results: [] as Record<string, unknown>[],
} }));

vi.mock("@/lib/auth", () => ({ verifyBearerToken: async () => mocks.owner ? { id: mocks.owner } : null }));
vi.mock("@/lib/processing-jobs/repository", () => ({ createProcessingJobServiceClient: () => ({
  from: (table: keyof typeof mocks.rows) => {
    const filters: ((row: Record<string, unknown>) => boolean)[] = [];
    let insertion: Record<string, unknown> | null = null;
    let update: Record<string, unknown> | null = null;
    const query = {
      select: () => query,
      eq: (field: string, value: unknown) => { filters.push(row => row[field] === value); return query; },
      contains: (field: string, value: Record<string, unknown>) => { filters.push(row => Object.entries(value).every(([key, expected]) => (row[field] as Record<string, unknown>)?.[key] === expected)); return query; },
      maybeSingle: async () => {
        if (table === "processing_job_results") {
          if (mocks.blockLoad === "throw") throw new Error("private provider detail");
          if (mocks.blockLoad === "error") return { data: null, error: { message: "private provider detail" } };
        }
        const data = mocks.rows[table].find(row => filters.every(check => check(row))) ?? null;
        if (table === "processing_job_results" && data) mocks.extractionReads.push(data);
        return { data, error: null };
      },
      insert: (value: Record<string, unknown>) => { insertion = value; return query; },
      update: (value: Record<string, unknown>) => { update = value; return query; },
      single: async () => {
        if (insertion) {
          const row = { id: mocks.rows[table].length === 0 ? sourceId : childId, ...insertion };
          mocks.rows[table].push(row);
          return { data: row, error: null };
        }
        // Mirrors the source_versions_are_immutable trigger.
        if (update && table === "source_versions") return { data: null, error: { message: "immutable_processing_version" } };
        const row = mocks.rows[table].find(value => filters.every(check => check(value)));
        if (row && update) Object.assign(row, update);
        return { data: row ?? null, error: row ? null : { message: "missing" } };
      },
    };
    return query;
  },
}) }));

function request(body: object, key = "source-import-123") {
  return new Request("https://example.test/api/sources", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) });
}

beforeEach(() => {
  mocks.owner = A;
  mocks.rows.source_versions.length = 0;
  mocks.rows.document_assets.length = 0;
  mocks.rows.processing_job_results.length = 0;
  mocks.extractionReads.length = 0;
  mocks.blockLoad = "ok";
});

describe("canonical source creation", () => {
  it("marks owner success and missing-source denial private, no-store", async () => {
    const success = await POST(request({ sourceType: "text", displayName: "Unit", sourceText: "Synthetic lesson" }));
    expect(success.status).toBe(200);
    expect(success.headers.get("Cache-Control")).toBe("private, no-store");
    const denial = await POST(request({ sourceType: "local_file", displayName: "Unit", sourceVersionId: sourceId }, "missing-source-key"));
    expect(denial.status).toBe(404);
    expect(denial.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("stores Text with the authenticated owner and replays the same import key", async () => {
    const body = { sourceType: "text", displayName: "Unit 1", sourceText: "Cells contain DNA." };
    const first = await POST(request(body));
    const second = await POST(request(body));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mocks.rows.source_versions).toHaveLength(1);
    expect(mocks.rows.source_versions[0]).toMatchObject({ user_id: A, metadata: { sourceType: "text", sourceTitle: "Unit 1", importKey: "source-import-123" } });
    expect(mocks.rows.source_versions[0]).not.toHaveProperty("course_id");
    expect((await POST(request({ ...body, sourceText: "Different content." }))).status).toBe(409);
    expect((await POST(request({ ...body, displayName: "Another title" }))).status).toBe(409);
  });

  it("claims only an owned extracted Camera or PDF source of the matching type", async () => {
    mocks.rows.source_versions.push({ id: sourceId, user_id: A, revision_kind: "normalized", source_text: "A page about cells", document_asset_id: assetId, extraction_result_id: sourceId, metadata: {} });
    mocks.rows.document_assets.push({ id: assetId, user_id: A, mime_type: "application/pdf", original_file_name: "cells.pdf" });
    expect((await POST(request({ sourceType: "camera", displayName: "Photo", sourceVersionId: sourceId }))).status).toBe(409);
    const claimed = await POST(request({ sourceType: "local_file", displayName: "Cells", sourceVersionId: sourceId, sourceText: "A page about cells" }));
    expect(claimed.status).toBe(200);
    expect((await claimed.json()).data.id).toBe(childId);
    expect(mocks.rows.source_versions).toHaveLength(2);
    expect(mocks.rows.source_versions[0]!.metadata).toEqual({});
    expect(mocks.rows.source_versions[1]).toMatchObject({ parent_source_version_id: sourceId, revision_kind: "user_edited", source_text: "A page about cells",
      metadata: { sourceType: "local_file", sourceTitle: "Cells", originalFileName: "cells.pdf", mimeType: "application/pdf" } });
    const replayed = await POST(request({ sourceType: "local_file", displayName: "Cells", sourceVersionId: sourceId, sourceText: "A page about cells" }));
    expect((await replayed.json()).data.id).toBe(childId);
    expect(mocks.rows.source_versions).toHaveLength(2);
    expect((await POST(request({ sourceType: "local_file", displayName: "Another title", sourceVersionId: sourceId }))).status).toBe(409);
    mocks.owner = B;
    expect((await POST(request({ sourceType: "local_file", displayName: "Cells", sourceVersionId: sourceId }, "other-user-key"))).status).toBe(404);
  });

  it("preserves Camera image and OCR provenance under the authenticated owner", async () => {
    mocks.rows.source_versions.push({ id: sourceId, user_id: A, revision_kind: "normalized", source_text: "Cells have nuclei", document_asset_id: assetId, extraction_result_id: sourceId, metadata: {} });
    mocks.rows.document_assets.push({ id: assetId, user_id: A, mime_type: "image/jpeg", original_file_name: "page.jpg" });
    const response = await POST(request({ sourceType: "camera", displayName: "Biology page", sourceVersionId: sourceId, sourceText: "Cells have nuclei" }));
    expect(response.status).toBe(200);
    expect(mocks.rows.source_versions).toHaveLength(2);
    expect(mocks.rows.source_versions[1]).toMatchObject({ user_id: A, document_asset_id: assetId, extraction_result_id: sourceId, parent_source_version_id: sourceId,
      metadata: { sourceType: "camera", sourceTitle: "Biology page", originalFileName: "page.jpg", mimeType: "image/jpeg" } });
    expect(mocks.rows.source_versions[1]!.metadata).not.toHaveProperty("pageProvenance");
    expect(mocks.rows.source_versions[1]!.metadata).not.toHaveProperty("reviewerSourceBlocks");
    expect(mocks.extractionReads).toHaveLength(0);
  });

  it("claims a corrected OCR text as the reviewed revision", async () => {
    mocks.rows.source_versions.push({ id: sourceId, user_id: A, revision_kind: "normalized", source_text: "Cels have nucle1", document_asset_id: assetId, extraction_result_id: sourceId, metadata: {} });
    mocks.rows.document_assets.push({ id: assetId, user_id: A, mime_type: "image/jpeg", original_file_name: "page.jpg" });
    const response = await POST(request({ sourceType: "camera", displayName: "Biology page", sourceVersionId: sourceId, sourceText: " Cells have nuclei 🧬 " }));
    expect(response.status).toBe(200);
    expect(mocks.rows.source_versions[1]).toMatchObject({ revision_kind: "user_edited", source_text: "Cells have nuclei 🧬", character_count: 19 });
  });

  it("never trusts a body owner or accepts an unauthenticated import", async () => {
    const imported = await POST(request({ sourceType: "text", displayName: "Mine", sourceText: "Study material", user_id: B }));
    expect(imported.status).toBe(200);
    expect(mocks.rows.source_versions[0]!.user_id).toBe(A);
    mocks.owner = "";
    expect((await POST(request({ sourceType: "text", displayName: "X", sourceText: "Material" }, "another-key"))).status).toBe(401);
  });
});

const pdfText = "Cells contain DNA.\n\nNuclei protect DNA.";
const pageBlocks = [
  { id: "page-1", kind: "unknown", order: 0, pageNumber: 1, text: "Cells contain DNA.", metadata: { extractionMethod: "native_text" } },
  // Page 2 was explicitly blank: no invented block and page 3 keeps its number.
  { id: "page-3", kind: "unknown", order: 1, pageNumber: 3, text: "Nuclei protect DNA.", metadata: { extractionMethod: "ocr" } },
];
const pdfBody = { sourceType: "local_file", displayName: "Cells", sourceVersionId: sourceId };
function seedPdf() {
  mocks.rows.source_versions.push({ id: sourceId, user_id: A, revision_kind: "normalized", source_text: pdfText,
    content_sha256: createHash("sha256").update(pdfText).digest("hex"),
    document_asset_id: assetId, extraction_result_id: sourceId, metadata: {} });
  mocks.rows.document_assets.push({ id: assetId, user_id: A, mime_type: "application/pdf", original_file_name: "cells.pdf" });
  mocks.rows.processing_job_results.push({ user_id: A, extraction_result_id: sourceId, payload: { text: pdfText, sourceBlocks: pageBlocks } });
}
function acceptedReviewer(): CanonicalReviewerRecord {
  return { source: mocks.rows.source_versions[1], version: { payload: { reviewer: {
    metadata: { sourceId: sourceId }, sections: [{ id: "section", sourceBlockIds: ["page-3"],
      items: [{ id: "item", sourceBlockIds: ["page-3"] }] }],
  } } } } as unknown as CanonicalReviewerRecord;
}
describe("accepted local PDF page provenance", () => {
  it.each([undefined, `  ${pdfText}\n`])("stores the worker page blocks for unchanged text (%s) and replays immutably", async sourceText => {
    seedPdf();
    const response = await POST(request({ ...pdfBody, ...(sourceText === undefined ? {} : { sourceText }) }));
    expect(response.status).toBe(200);
    expect(mocks.rows.source_versions[1]!.metadata).toMatchObject({ pageProvenance: "extracted", reviewerSourceBlocks: [
      { id: "page-1", pageNumber: 1, text: pageBlocks[0]!.text },
      { id: "page-3", pageNumber: 3, text: pageBlocks[1]!.text },
    ] });
    expect(mocks.rows.source_versions[0]!.metadata).toEqual({});
    const saved = acceptedReviewer();
    expect(lowestSectionPage(saved, "section")).toBe(3);
    expect(await referencedSourceBlocks(saved, "section", "item")).toMatchObject([
      { id: "page-3", pageNumber: 3, text: "Nuclei protect DNA." },
    ]);
    mocks.blockLoad = "throw";
    expect((await POST(request(pdfBody))).status).toBe(200);
    expect(mocks.rows.source_versions).toHaveLength(2);
    expect(mocks.extractionReads).toHaveLength(1);
  });

  it("drops inherited blocks when one word changes and keeps readers unavailable", async () => {
    seedPdf();
    mocks.rows.source_versions[0]!.metadata = { reviewerSourceBlocks: pageBlocks, pageProvenance: "extracted" };
    const response = await POST(request({ ...pdfBody, sourceText: pdfText.replace("protect", "contain") }));
    expect(response.status).toBe(200);
    expect(mocks.rows.source_versions[1]!.metadata).toMatchObject({ pageProvenance: "edited" });
    expect(mocks.rows.source_versions[1]!.metadata).not.toHaveProperty("reviewerSourceBlocks");
    expect(mocks.rows.source_versions[0]!.metadata).toHaveProperty("reviewerSourceBlocks", pageBlocks);
    expect(mocks.extractionReads).toHaveLength(0);
    expect(lowestSectionPage(acceptedReviewer(), "section")).toBeNull();
    expect(await referencedSourceBlocks(acceptedReviewer(), "section", "item")).toEqual([]);
  });

  it.each(["error", "throw"])("accepts without inherited blocks after a block-load %s", async failure => {
    seedPdf();
    mocks.rows.source_versions[0]!.metadata = { reviewerSourceBlocks: pageBlocks, pageProvenance: "extracted" };
    mocks.blockLoad = failure;
    const response = await POST(request(pdfBody));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { id: childId, sourceType: "local_file", displayName: "Cells" } });
    expect(mocks.rows.source_versions[1]!.metadata).toMatchObject({ pageProvenance: "unavailable" });
    expect(mocks.rows.source_versions[1]!.metadata).not.toHaveProperty("reviewerSourceBlocks");
  });

  it("never reads another owner's extraction even with the same result link", async () => {
    seedPdf(); mocks.rows.processing_job_results[0]!.user_id = B;
    expect((await POST(request(pdfBody))).status).toBe(200);
    expect(mocks.extractionReads).toHaveLength(0);
    expect(mocks.rows.source_versions[1]!.metadata).toMatchObject({ pageProvenance: "unavailable" });
    expect(mocks.rows.source_versions[1]!.metadata).not.toHaveProperty("reviewerSourceBlocks");
  });

  it("uses only the parent's exact extraction link", async () => {
    seedPdf(); mocks.rows.processing_job_results[0]!.extraction_result_id = assetId;
    expect((await POST(request(pdfBody))).status).toBe(200);
    expect(mocks.extractionReads).toHaveLength(0);
    expect(mocks.rows.source_versions[1]!.metadata).toMatchObject({ pageProvenance: "unavailable" });
  });

  it.each([undefined, [], [{ id: "page-1", pageNumber: 0, text: "Invalid" }],
    [pageBlocks[0], { id: "page-3", pageNumber: 3, text: "" }],
    [pageBlocks[0], pageBlocks[0]], [{ id: "page-101", pageNumber: 101, text: "Invalid" }],
    [{ text: "Unnumbered" }]])("fails closed on missing or invalid page evidence (%j)", async sourceBlocks => {
    seedPdf(); mocks.rows.processing_job_results[0]!.payload = { sourceBlocks };
    expect((await POST(request(pdfBody))).status).toBe(200);
    expect(mocks.rows.source_versions[1]!.metadata).toMatchObject({ pageProvenance: "unavailable" });
    expect(mocks.rows.source_versions[1]!.metadata).not.toHaveProperty("reviewerSourceBlocks");
  });
});
