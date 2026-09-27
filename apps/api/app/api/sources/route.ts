import { createHash } from "node:crypto";
import type { Json } from "@stay-focused/db";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createProcessingJobServiceClient } from "@/lib/processing-jobs/repository";
import { sanitizeSourceDisplayName } from "@/lib/processing-jobs/source-display-name";
import { validateIdempotencyKey } from "@/lib/processing-jobs/creation";

export const runtime = "nodejs";
export const maxDuration = 15;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type SourceType = "text" | "camera" | "local_file";

/** Source acquisition ends here. Generation receives only the persisted source ID. */
export async function POST(request: Request): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) return reply(401, "unauthorized");
  let input: Record<string, unknown>;
  let key: string;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400, "invalid_request");
    input = body as Record<string, unknown>;
    key = validateIdempotencyKey(request.headers.get("idempotency-key"));
  } catch {
    return reply(400, "invalid_request");
  }
  const sourceType = input.sourceType as SourceType;
  const title = input.displayName;
  if (!(["text", "camera", "local_file"] as unknown[]).includes(sourceType) ||
      typeof title !== "string" || title.trim().length === 0 || title.length > 180)
    return reply(400, "invalid_request");
  const displayName = sanitizeSourceDisplayName(title);
  const client = createProcessingJobServiceClient();
  const existing = await client.from("source_versions").select("*")
    .eq("user_id", user.id).contains("metadata", { importKey: key }).maybeSingle();
  if (existing.error) return reply(503, "source_unavailable");

  if (sourceType === "text") {
    const sourceText = input.sourceText;
    if (typeof sourceText !== "string" || !sourceText.trim() || sourceText.length > 100_000 || input.sourceVersionId !== undefined)
      return reply(400, "invalid_request");
    const normalized = sourceText.trim();
    const digest = createHash("sha256").update(normalized).digest("hex");
    if (existing.data) return existing.data.content_sha256 === digest &&
      metadataOf(existing.data.metadata).sourceType === sourceType &&
      metadataOf(existing.data.metadata).sourceTitle === displayName
      ? NextResponse.json({ ok: true, data: { id: existing.data.id, sourceType, displayName } })
      : reply(409, "conflict");
    const inserted = await client.from("source_versions").insert({
      user_id: user.id, revision_kind: "imported_text", content_sha256: digest,
      source_text: normalized, character_count: normalized.length,
      normalization_version: "engine-stage0-v1", created_by: "user",
      metadata: { sourceType, sourceTitle: displayName, importKey: key },
    }).select("id").single();
    if (inserted.error || !inserted.data) {
      const raced = await client.from("source_versions").select("id,content_sha256,metadata")
        .eq("user_id", user.id).contains("metadata", { importKey: key }).maybeSingle();
      return raced.data?.content_sha256 === digest &&
        metadataOf(raced.data.metadata).sourceType === sourceType &&
        metadataOf(raced.data.metadata).sourceTitle === displayName
        ? NextResponse.json({ ok: true, data: { id: raced.data.id, sourceType, displayName } })
        : reply(raced.data ? 409 : 503, raced.data ? "conflict" : "source_unavailable");
    }
    return NextResponse.json({ ok: true, data: { id: inserted.data.id, sourceType, displayName } });
  }

  const sourceVersionId = input.sourceVersionId;
  if (typeof sourceVersionId !== "string" || !uuid.test(sourceVersionId))
    return reply(400, "invalid_request");
  if (input.sourceText !== undefined &&
      (typeof input.sourceText !== "string" || !input.sourceText.trim() || input.sourceText.length > 100_000))
    return reply(400, "invalid_request");
  if (existing.data) {
    const requestedText = typeof input.sourceText === "string" ? input.sourceText.trim() : null;
    const priorMetadata = metadataOf(existing.data.metadata);
    return priorMetadata.sourceType === sourceType && priorMetadata.sourceTitle === displayName &&
      (existing.data.parent_source_version_id === sourceVersionId || existing.data.id === sourceVersionId)
      ? (requestedText === null || existing.data.content_sha256 === createHash("sha256").update(requestedText).digest("hex"))
        ? NextResponse.json({ ok: true, data: { id: existing.data.id, sourceType, displayName } })
        : reply(409, "conflict")
      : reply(409, "conflict");
  }
  const source = await client.from("source_versions").select("*")
    .eq("user_id", user.id).eq("id", sourceVersionId).maybeSingle();
  if (source.error) return reply(503, "source_unavailable");
  if (!source.data || source.data.revision_kind !== "normalized" || !source.data.document_asset_id || !source.data.extraction_result_id)
    return reply(404, "source_unavailable");
  const asset = await client.from("document_assets").select("mime_type,original_file_name")
    .eq("id", source.data.document_asset_id).eq("user_id", user.id).maybeSingle();
  if (asset.error) return reply(503, "source_unavailable");
  if (!asset.data || (sourceType === "camera" ? !["image/jpeg", "image/png"].includes(asset.data.mime_type) : asset.data.mime_type !== "application/pdf"))
    return reply(409, "source_type_mismatch");
  const metadata = metadataOf(source.data.metadata);
  if (metadata.sourceType && metadata.sourceType !== sourceType) return reply(409, "conflict");
  if (metadata.importKey && metadata.importKey !== key) return reply(409, "conflict");
  const corrected = input.sourceText;
  if (typeof corrected === "string" && corrected.trim() !== source.data.source_text.trim()) {
    const normalized = corrected.trim();
    const inserted = await client.from("source_versions").insert({
      user_id: user.id, document_asset_id: source.data.document_asset_id,
      extraction_result_id: source.data.extraction_result_id,
      parent_source_version_id: source.data.id, revision_kind: "user_edited",
      content_sha256: createHash("sha256").update(normalized).digest("hex"),
      source_text: normalized, character_count: normalized.length,
      normalization_version: source.data.normalization_version, created_by: "user",
      metadata: { ...metadata, sourceType, sourceTitle: displayName, importKey: key,
        originalFileName: asset.data.original_file_name, mimeType: asset.data.mime_type },
    }).select("id").single();
    if (inserted.error || !inserted.data) return reply(503, "source_unavailable");
    return NextResponse.json({ ok: true, data: { id: inserted.data.id, sourceType, displayName } });
  }
  const updated = await client.from("source_versions").update({ metadata: {
    ...metadata, sourceType, sourceTitle: displayName, importKey: key,
    originalFileName: asset.data.original_file_name, mimeType: asset.data.mime_type,
  } }).eq("id", source.data.id).eq("user_id", user.id).select("id").single();
  if (updated.error || !updated.data) return reply(503, "source_unavailable");
  return NextResponse.json({ ok: true, data: { id: updated.data.id, sourceType, displayName } });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } });
}

function reply(status: number, code: string): Response {
  return NextResponse.json({ ok: false, error: { code, message: code, retryable: status >= 500 } }, { status });
}

function metadataOf(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Json | undefined> : {};
}
