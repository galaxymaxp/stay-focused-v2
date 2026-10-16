import { createHash } from 'node:crypto';
import type { Database, SectionExternalVisualRow } from '@stay-focused/db';
import type { StudyImageReference } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalReviewerRecord } from './canonical-reviewers';
import { ExperienceFailure } from './experience/errors';
import { loadImageData, VISUAL_IMAGE_BYTES } from './external-visuals/match';
import { citedFigures, readMaterialFigures } from './source-figures/sections';
import { FIGURE_BUCKET } from './source-figures/store';
import { getSourcePageSnapshot, SNAPSHOT_BUCKET } from './source-page-snapshots';

export const STUDY_IMAGE_BYTES = VISUAL_IMAGE_BYTES; // 3 MiB; reject rather than silently change the image.
export interface ResolvedStudyImage { readonly data: string; readonly context: string }

/** Opaque revision identity, not an authorization token. Lookup always repeats owner/version/section checks. */
export function externalVisualId(row: SectionExternalVisualRow): string {
  return createHash('sha256').update(JSON.stringify([row.user_id, row.artifact_id, row.version_id, row.section_id,
    row.image_url, row.updated_at])).digest('hex');
}
function missing(): never { throw new ExperienceFailure(404, 'not_found'); }

/** Storage content-type is not trusted. Only provider-supported raster signatures are accepted. */
export async function studyImageData(blob: Blob): Promise<string> {
  if (blob.size < 1 || blob.size > STUDY_IMAGE_BYTES) throw new ExperienceFailure(422, 'invalid_request');
  const bytes = Buffer.from(await blob.arrayBuffer());
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
    : /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii')) ? 'image/gif'
    : bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP' ? 'image/webp' : null;
  if (!mime) throw new ExperienceFailure(422, 'invalid_request');
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

export async function resolveStudyImage(client: SupabaseClient<Database>, input: {
  userId: string; artifactId: string; sectionId: string; image: StudyImageReference; saved: CanonicalReviewerRecord;
}, dependencies: { snapshot?: typeof getSourcePageSnapshot; materials?: typeof readMaterialFigures; load?: typeof loadImageData } = {}): Promise<ResolvedStudyImage> {
  const { userId, artifactId, sectionId, image, saved } = input;
  if (saved.artifact.user_id !== userId || saved.version.user_id !== userId || saved.source.user_id !== userId ||
      saved.artifact.id !== artifactId || saved.artifact.deleted_at !== null) missing();
  let bucket: string, path: string;
  if (image.kind === 'external_visual') {
    const read = await client.from('section_external_visuals').select('*').eq('user_id', userId)
      .eq('artifact_id', artifactId).eq('version_id', saved.version.id).eq('section_id', sectionId).maybeSingle();
    if (read.error) throw new ExperienceFailure(503, 'unavailable');
    const row = read.data;
    if (!row || row.user_id !== userId || row.artifact_id !== artifactId || row.version_id !== saved.version.id ||
        row.section_id !== sectionId || row.status !== 'found' || externalVisualId(row) !== image.id || !row.image_url) missing();
    let url: URL;
    try { url = new URL(row.image_url); } catch { return missing(); }
    // Same VL3 image allow-list, no redirects or client-provided URL.
    if (url.protocol !== 'https:' || url.hostname !== 'upload.wikimedia.org' || url.username || url.password || url.port) missing();
    const data = await (dependencies.load ?? loadImageData)(url.href);
    if (!data) throw new ExperienceFailure(503, 'unavailable');
    const match = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match) throw new ExperienceFailure(503, 'unavailable');
    const validated = await studyImageData(new Blob([Buffer.from(match[2]!, 'base64')]));
    return { data: validated, context: `External reference, not course evidence. Title: ${row.title ?? ''}. Attribution: ${row.credit ?? ''}. License: ${row.license ?? ''}.` };
  }
  if (image.kind === 'page_snapshot') {
    // This is a read-only probe: no rendering, reservations or dispatch.
    const snapshot = await (dependencies.snapshot ?? getSourcePageSnapshot)(client, { userId, artifactId, sectionId, render: false });
    if (!snapshot.available || !('url' in snapshot) || snapshot.id !== image.id) missing();
    const read = await client.from('source_page_snapshots').select('*').eq('user_id', userId).eq('id', image.id)
      .eq('source_version_id', saved.source.id).eq('page_number', snapshot.page).maybeSingle();
    if (read.error) throw new ExperienceFailure(503, 'unavailable');
    const row = read.data;
    if (!row || row.user_id !== userId || row.id !== image.id || row.source_version_id !== saved.source.id ||
        row.page_number !== snapshot.page || row.status !== 'ready' || !row.storage_path) missing();
    bucket = SNAPSHOT_BUCKET; path = row.storage_path;
  } else {
    const materials = await (dependencies.materials ?? readMaterialFigures)(client, saved, userId);
    const figure = citedFigures(saved, sectionId, materials).find(row => row.id === image.id && row.user_id === userId);
    if (!figure) missing();
    if (figure.byte_size > STUDY_IMAGE_BYTES) throw new ExperienceFailure(422, 'invalid_request');
    bucket = FIGURE_BUCKET; path = figure.storage_path;
  }
  // Private buckets have no client read policy. The server-only service client
  // downloads only after the explicit owner/current-source/citation checks above.
  // Snapshot paths use snapshot UUID / lease UUID; figures use owner UUID / file.
  const prefix = image.kind === 'page_snapshot' ? `${image.id}/` : `${userId}/`;
  if (!path.startsWith(prefix) || path.split('/').some(part => part === '..' || part === '.')) missing();
  const read = await client.storage.from(bucket).download(path);
  if (read.error || !read.data) throw new ExperienceFailure(503, 'unavailable');
  return { data: await studyImageData(read.data), context: 'Image from the accepted course material for this section.' };
}
