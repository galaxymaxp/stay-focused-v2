import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { experienceRepository } from '@/lib/experience/repository';
import { mapReviewerArtifactsByMaterial } from '@/lib/experience/service';

/** The shared reader scopes every page of every table to the owner. */
export async function readReviewedMaterialIds(client: SupabaseClient<Database>, userId: string, courseId: string): Promise<ReadonlySet<string>> {
  const reader = experienceRepository(client);
  const [artifacts, versions, sourceVersions, snapshots, snapshotItems] = await Promise.all([
    reader.rows('generated_artifacts', userId),
    reader.rows('generated_artifact_versions', userId),
    reader.rows('source_versions', userId),
    reader.rows('reviewer_source_snapshots', userId),
    reader.rows('reviewer_source_snapshot_items', userId),
  ]);
  return new Set(mapReviewerArtifactsByMaterial({ courseId, artifacts, versions, sourceVersions, snapshots, snapshotItems }).keys());
}
