import type { CanvasConnectionRow, CanvasCourseRow, CanvasFileInsert, CanvasFileRow, CanvasPageRow, Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { discoverCanvasPageFileIds, mapCanvasFile } from '@/lib/canvas-file-normalize';
import { CONNECTION_SECRET_COLUMNS, createCanvasClient, decryptConnectionToken, readConnection } from '@/lib/canvas-routes';
import { ExperienceFailure } from './errors';

const ADMINISTRATIVE_FILE = /\b(?:syllabus|course[ _-]*outline|grading|attendance|calendar|schedule|policy|policies|orientation|rubric)\b/i;
const MAX_PAGE_FILES = 1; // Existing Reviewer structure admits one extracted file.

export function isInstructionalPageAttachment(name: string, eligibility: string): boolean {
  return (eligibility === 'eligible_document' || eligibility === 'eligible_image') &&
    !ADMINISTRATIVE_FILE.test(name);
}

/** Resolve only links inside this owned instructional Page, never course-wide files. */
export async function resolveInstructionalPageAttachments({ client, course, page, userId }: {
  readonly client: SupabaseClient<Database>;
  readonly course: CanvasCourseRow;
  readonly page: CanvasPageRow;
  readonly userId: string;
}): Promise<readonly CanvasFileRow[]> {
  if (page.user_id !== userId || page.course_id !== course.id || page.canvas_connection_id !== course.canvas_connection_id)
    throw new ExperienceFailure(404, 'not_found');
  if (!/\/files\//i.test(page.body_html ?? '')) return [];
  const connection = await readConnection(client, userId, CONNECTION_SECRET_COLUMNS);
  if (!connection.ok || !connection.row || connection.row.id !== course.canvas_connection_id)
    throw new ExperienceFailure(503, 'source_attachment_unavailable');
  const ownedConnection = connection.row as CanvasConnectionRow;
  const linkedIds = discoverCanvasPageFileIds({
    canvasBaseUrl: ownedConnection.base_url,
    canvasCourseId: course.canvas_course_id,
    html: page.body_html,
  });
  if (!linkedIds.length) return [];
  if (linkedIds.length > 40) throw new ExperienceFailure(413, 'source_attachment_unavailable');
  let canvas;
  try { canvas = createCanvasClient(ownedConnection.base_url, decryptConnectionToken(ownedConnection)); }
  catch { throw new ExperienceFailure(503, 'source_attachment_unavailable'); }

  const selected: CanvasFileRow[] = [];
  for (const fileId of linkedIds) {
    let file;
    try { file = await canvas.getCourseFile(course.canvas_course_id, fileId); }
    catch { throw new ExperienceFailure(503, 'source_attachment_unavailable'); }
    const payload = mapCanvasFile(file);
    if (!isInstructionalPageAttachment(payload.display_name, payload.ingestion_eligibility)) continue;
    const { data: existing, error: readError } = await client.from('canvas_files').select('*')
      .eq('user_id', userId).eq('course_id', course.id).eq('canvas_file_id', fileId).maybeSingle();
    if (readError) throw new ExperienceFailure(503, 'unavailable');
    let row = existing as CanvasFileRow | null;
    if (!row) {
      const insert: CanvasFileInsert = {
        ...payload,
        user_id: userId,
        canvas_connection_id: course.canvas_connection_id,
        course_id: course.id,
        canvas_course_id: course.canvas_course_id,
        availability_status: 'available',
      };
      const { data, error } = await client.from('canvas_files').insert(insert).select('*').maybeSingle();
      if (error) {
        // Concurrent requests may discover the same link. The unique course/file
        // identity is authoritative; re-read it without replacing stored bytes.
        const reread = await client.from('canvas_files').select('*').eq('user_id', userId)
          .eq('course_id', course.id).eq('canvas_file_id', fileId).maybeSingle();
        if (reread.error || !reread.data) throw new ExperienceFailure(503, 'unavailable');
        row = reread.data as CanvasFileRow;
      } else row = data as CanvasFileRow | null;
    }
    if (!row) throw new ExperienceFailure(503, 'unavailable');
    const reference = {
      user_id: userId,
      canvas_connection_id: course.canvas_connection_id,
      course_id: course.id,
      file_id: row.id,
      reference_type: 'page',
      reference_identity: `page:${page.canvas_page_url}:file:${fileId}`,
      referenced_row_id: page.id,
      canvas_page_url: page.canvas_page_url,
      last_seen_at: new Date().toISOString(),
    };
    const saved = await client.from('canvas_file_references').upsert(reference, {
      onConflict: 'user_id,canvas_connection_id,course_id,file_id,reference_type,reference_identity',
    });
    if (saved.error) throw new ExperienceFailure(503, 'unavailable');
    selected.push(row);
  }
  if (selected.length > MAX_PAGE_FILES) throw new ExperienceFailure(413, 'source_attachment_unavailable');
  return selected;
}
