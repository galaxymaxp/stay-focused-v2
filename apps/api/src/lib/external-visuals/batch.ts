import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readCanonicalReviewerRecord } from '../canonical-reviewers';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';
import { EXTERNAL_VISUAL_LABEL, findSectionVisual } from './service';

type Client = SupabaseClient<Database>;
/** Sections checked in parallel; each section is one Commons query set plus one vision call. */
export const REVIEWER_VISUAL_CONCURRENCY = 4;

export type ReviewerVisual = { status: 'found'; image: string; title: string; credit: string; license: string; licenseUrl: string;
  sourceUrl: string; label: typeof EXTERNAL_VISUAL_LABEL; width: number; height: number; attemptCount: number };
export interface ReviewerVisuals { readonly sections: Record<string, ReviewerVisual>; readonly checked: number; readonly total: number; readonly running: boolean }

async function savedReviewer(client: Client, userId: string, artifactId: string) {
  const read = await readCanonicalReviewerRecord(client, userId, artifactId);
  if (!read.ok) throw new ExperienceFailure(503, 'unavailable');
  const saved = read.value;
  if (!saved || saved.artifact.user_id !== userId || saved.version.user_id !== userId || saved.artifact.deleted_at !== null) throw new ExperienceFailure(404, 'not_found');
  const payload = record(saved.version.payload); const reviewer = record(payload.reviewer ?? payload);
  const sectionIds = (Array.isArray(reviewer.sections) ? reviewer.sections : []).map(record).map(s => s.id).filter((id): id is string => typeof id === 'string');
  return { versionId: saved.version.id, sectionIds };
}

/** Every cached labeled visual for the reviewer's current version, in one read. */
export async function readReviewerVisuals(client: Client, input: { userId: string; artifactId: string }): Promise<ReviewerVisuals> {
  const { versionId, sectionIds } = await savedReviewer(client, input.userId, input.artifactId);
  const [rows, pending] = await Promise.all([
    client.from('section_external_visuals').select('*').eq('user_id', input.userId).eq('artifact_id', input.artifactId).eq('version_id', versionId),
    client.from('section_external_visual_requests').select('token', { count: 'exact', head: true }).eq('user_id', input.userId)
      .eq('artifact_id', input.artifactId).eq('version_id', versionId).eq('released', false).gt('expires_at', new Date().toISOString()),
  ]);
  if (rows.error || pending.error) throw new ExperienceFailure(503, 'unavailable');
  const sections: Record<string, ReviewerVisual> = {};
  for (const row of rows.data ?? []) {
    if (row.status !== 'found' || !row.image_url || !row.source_url || !row.title || !row.credit || !row.license || !row.license_url || !row.width || !row.height) continue;
    sections[row.section_id] = { status: 'found', image: row.image_url, title: row.title, credit: row.credit, license: row.license, licenseUrl: row.license_url,
      sourceUrl: row.source_url, label: EXTERNAL_VISUAL_LABEL, width: row.width, height: row.height, attemptCount: row.attempt_count };
  }
  return { sections, checked: rows.data?.length ?? 0, total: sectionIds.length, running: (pending.count ?? 0) > 0 };
}

/**
 * Fill labeled visuals for every section of a reviewer. Sections with course visuals are skipped by
 * findSectionVisual (409), cached sections return immediately, and failures never stop the batch.
 */
export async function prepareReviewerVisuals(client: Client, input: { userId: string; artifactId: string },
  find: typeof findSectionVisual = findSectionVisual): Promise<{ found: number; none: number; skipped: number; failed: number }> {
  const { sectionIds } = await savedReviewer(client, input.userId, input.artifactId);
  const counts = { found: 0, none: 0, skipped: 0, failed: 0 };
  let next = 0;
  const worker = async () => {
    while (next < sectionIds.length) {
      const sectionId = sectionIds[next++]!;
      try {
        const result = await find(client, { ...input, sectionId, findAnother: false });
        if (result.status === 'found') counts.found++; else counts.none++;
      } catch (error) {
        const status = error instanceof ExperienceFailure ? error.status : 0;
        if (status === 409 || status === 400 || status === 404) counts.skipped++;
        else if (status === 429) { counts.failed++; next = sectionIds.length; } // daily cap: stop early
        else counts.failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(REVIEWER_VISUAL_CONCURRENCY, sectionIds.length) }, worker));
  console.info('external_visual.batch', counts);
  return counts;
}
