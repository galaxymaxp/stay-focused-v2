import type {
  Database,
  GeneratedArtifactRow,
  GeneratedArtifactVersionRow,
  SourceVersionRow,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CanonicalReviewerRecord {
  readonly artifact: GeneratedArtifactRow;
  readonly version: GeneratedArtifactVersionRow;
  readonly source: SourceVersionRow;
}

export async function listCanonicalReviewerRecords(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ readonly ok: true; readonly value: readonly CanonicalReviewerRecord[] } | { readonly ok: false }> {
  const [artifactsResult, versionsResult, sourcesResult] = await Promise.all([
    client.from("generated_artifacts").select("*").eq("user_id", userId).eq("artifact_type", "reviewer").is("deleted_at", null).order("updated_at", { ascending: false }).order("id"),
    client.from("generated_artifact_versions").select("*").eq("user_id", userId).eq("artifact_type", "reviewer"),
    client.from("source_versions").select("*").eq("user_id", userId),
  ]);
  if (artifactsResult.error || versionsResult.error || sourcesResult.error || !artifactsResult.data || !versionsResult.data || !sourcesResult.data) {
    return { ok: false };
  }
  const versions = new Map(versionsResult.data.map(row => [row.id, row]));
  const sources = new Map(sourcesResult.data.map(row => [row.id, row]));
  const records: CanonicalReviewerRecord[] = [];
  for (const artifact of artifactsResult.data) {
    if (artifact.user_id !== userId || artifact.artifact_type !== "reviewer" || artifact.deleted_at !== null) continue;
    if (!artifact.latest_version_id) continue;
    const version = versions.get(artifact.latest_version_id);
    if (!version || version.artifact_id !== artifact.id || version.user_id !== userId || version.artifact_type !== "reviewer") continue;
    const source = sources.get(version.source_version_id);
    if (!source || source.user_id !== userId) continue;
    records.push({ artifact, version, source });
  }
  return { ok: true, value: records };
}

export async function readCanonicalReviewerRecord(
  client: SupabaseClient<Database>,
  userId: string,
  artifactId: string,
): Promise<{ readonly ok: true; readonly value: CanonicalReviewerRecord | null } | { readonly ok: false }> {
  const records = await listCanonicalReviewerRecords(client, userId);
  if (!records.ok) return records;
  return { ok: true, value: records.value.find(record => record.artifact.id === artifactId) ?? null };
}
