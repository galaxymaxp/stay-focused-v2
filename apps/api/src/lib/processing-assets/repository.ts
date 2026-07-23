import type {
  Database,
  SourceVersionRow,
} from "@stay-focused/db";
import type {
  SourceVersionRevisionResult,
  SourceVersionSummary,
} from "@stay-focused/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProcessingAssetServiceClient = SupabaseClient<Database>;

export async function findOwnedSourceVersion(
  client: ProcessingAssetServiceClient,
  userId: string,
  sourceVersionId: string,
): Promise<SourceVersionRow | null> {
  const { data, error } = await client
    .from("source_versions")
    .select("*")
    .eq("id", sourceVersionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ProcessingAssetRepositoryError("source_version_read_failed");
  return data;
}

export async function createOwnedSourceRevision(
  client: ProcessingAssetServiceClient,
  input: {
    readonly userId: string;
    readonly parentSourceVersionId: string;
    readonly expectedParentSha256: string;
    readonly sourceText: string;
    readonly selectAsActive: boolean;
  },
): Promise<SourceVersionRevisionResult> {
  const { data, error } = await client.rpc("create_source_version_revision", {
    p_user_id: input.userId,
    p_parent_source_version_id: input.parentSourceVersionId,
    p_expected_parent_sha256: input.expectedParentSha256,
    p_source_text: input.sourceText,
    p_select_as_active: input.selectAsActive,
  });
  if (error) {
    throw new ProcessingAssetRepositoryError(mapRevisionError(error.message));
  }
  const created = data?.[0];
  if (!created) {
    throw new ProcessingAssetRepositoryError("source_version_storage_failed");
  }
  const version = await findOwnedSourceVersion(
    client,
    input.userId,
    created.source_version_id,
  );
  if (!version) {
    throw new ProcessingAssetRepositoryError("source_version_storage_failed");
  }
  return {
    ...toSourceVersionSummary(version),
    conflictDetected: created.conflict_detected,
    selectedAsActive: created.selected_as_active,
  };
}

export function toSourceVersionSummary(
  version: SourceVersionRow,
): SourceVersionSummary {
  return {
    id: version.id,
    documentAssetId: version.document_asset_id,
    parentSourceVersionId: version.parent_source_version_id,
    revisionKind: version.revision_kind,
    contentSha256: version.content_sha256,
    characterCount: version.character_count,
    normalizationVersion: version.normalization_version,
    createdBy: version.created_by,
    createdAt: version.created_at,
    supersededAt: version.superseded_at,
  };
}

function mapRevisionError(message: string): string {
  for (const code of [
    "source_version_not_found",
    "source_version_precondition_failed",
    "source_version_limit_reached",
    "source_revision_text_missing",
  ]) {
    if (message.includes(code)) return code;
  }
  return "source_version_storage_failed";
}

export class ProcessingAssetRepositoryError extends Error {
  public constructor(public readonly code: string) {
    super(code);
    this.name = "ProcessingAssetRepositoryError";
  }
}
