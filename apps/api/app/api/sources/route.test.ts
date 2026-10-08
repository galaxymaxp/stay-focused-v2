import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const sourceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const childId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const assetId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const mocks = vi.hoisted(() => ({ owner: "", rows: { source_versions: [] as Record<string, unknown>[], document_assets: [] as Record<string, unknown>[] } }));

vi.mock("@/lib/auth", () => ({ verifyBearerToken: async () => mocks.owner ? { id: mocks.owner } : null }));
vi.mock("@/lib/processing-jobs/repository", () => ({ createProcessingJobServiceClient: () => ({
  from: (table: "source_versions" | "document_assets") => {
    const filters: ((row: Record<string, unknown>) => boolean)[] = [];
    let insertion: Record<string, unknown> | null = null;
    let update: Record<string, unknown> | null = null;
    const query = {
      select: () => query,
      eq: (field: string, value: unknown) => { filters.push(row => row[field] === value); return query; },
      contains: (field: string, value: Record<string, unknown>) => { filters.push(row => Object.entries(value).every(([key, expected]) => (row[field] as Record<string, unknown>)?.[key] === expected)); return query; },
      maybeSingle: async () => ({ data: mocks.rows[table].find(row => filters.every(check => check(row))) ?? null, error: null }),
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
});

describe("canonical source creation", () => {
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
