import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LibraryArtifactSummary } from '@stay-focused/shared';
import { ExperienceFailure } from './errors';

type Table = 'canvas_courses' | 'canvas_modules' | 'canvas_module_items' | 'canvas_files' | 'canvas_pages' | 'canvas_assignments';
type Rows<T extends Table> = Database['public']['Tables'][T]['Row'];
const columns = {
  canvas_courses: 'id,user_id,canvas_connection_id',
  canvas_modules: 'id,user_id,course_id,canvas_connection_id,position',
  canvas_module_items: 'id,user_id,course_id,canvas_connection_id,module_id,position,item_type,canvas_content_id,page_url',
  canvas_files: 'id,user_id,course_id,canvas_connection_id,canvas_file_id',
  canvas_pages: 'id,user_id,course_id,canvas_connection_id,canvas_page_id,canvas_page_url',
  canvas_assignments: 'id,user_id,course_id,canvas_connection_id,canvas_assignment_id',
} as const;

/** Existing synced metadata only; no Canvas requests, source bodies or private paths. */
export async function libraryPositions(client: SupabaseClient<Database>, owner: string, items: readonly LibraryArtifactSummary[]): Promise<LibraryArtifactSummary[]> {
  async function read<T extends Table>(table: T, courseId: string): Promise<Rows<T>[]> {
    const rows: Rows<T>[] = [];
    for (let offset = 0; offset < 10_000; offset += 200) {
      let query = client.from(table as Table).select(columns[table]).eq('user_id', owner);
      query = query.filter(table === 'canvas_courses' ? 'id' : 'course_id', 'eq', courseId);
      const result = await query.order('id').range(offset, offset + 199);
      if (result.error || !result.data) throw new ExperienceFailure(503, 'unavailable');
      const page = result.data as unknown as Rows<T>[];
      rows.push(...page.filter(row => row.user_id === owner));
      if (page.length < 200) return rows;
    }
    throw new ExperienceFailure(503, 'unavailable');
  }
  const eligible = (item: LibraryArtifactSummary) => !!item.course && !!item.sourceMaterialId
    && item.sourceType !== 'canvas_mixed' && item.sourceType !== 'text' && item.sourceType !== 'camera' && item.sourceType !== 'local_file';
  const positions = new Map<string, NonNullable<LibraryArtifactSummary['sourcePosition']>>();
  const courses = [...new Set(items.filter(eligible).map(item => item.course!.id))];
  for (const courseId of courses) {
    const course = (await read('canvas_courses', courseId)).find(row => row.id === courseId);
    if (!course) continue;
    const [modules, moduleItems, files, pages, assignments] = await Promise.all([
      read('canvas_modules', courseId), read('canvas_module_items', courseId), read('canvas_files', courseId), read('canvas_pages', courseId), read('canvas_assignments', courseId),
    ]);
    const scoped = <T extends { user_id: string; course_id: string; canvas_connection_id: string }>(rows: readonly T[]) => rows.filter(row => row.user_id === owner && row.course_id === courseId && row.canvas_connection_id === course.canvas_connection_id);
    const moduleById = new Map(scoped(modules).map(row => [row.id, row]));
    const fileById = new Map(scoped(files).map(row => [row.canvas_file_id, row]));
    const pageById = new Map(scoped(pages).filter(row => row.canvas_page_id).map(row => [row.canvas_page_id!, row]));
    const pageByUrl = new Map(scoped(pages).filter(row => row.canvas_page_url).map(row => [row.canvas_page_url!, row]));
    const assignmentById = new Map(scoped(assignments).map(row => [row.canvas_assignment_id, row]));
    const validPosition = (value: number | null | undefined): value is number => Number.isSafeInteger(value) && value! >= 0;
    for (const item of scoped(moduleItems)) {
      const moduleRow = moduleById.get(item.module_id);
      if (!validPosition(moduleRow?.position) || !validPosition(item.position)) continue;
      const source = item.item_type === 'File' ? fileById.get(item.canvas_content_id ?? '')
        : item.item_type === 'Page' ? pageByUrl.get(item.page_url ?? '') ?? pageById.get(item.canvas_content_id ?? '')
        : item.item_type === 'Assignment' ? assignmentById.get(item.canvas_content_id ?? '') : undefined;
      if (!source) continue;
      const kind = item.item_type === 'File' ? 'file' : item.item_type === 'Page' ? 'page' : 'assignment';
      const key = courseId + ':' + kind + ':' + source.id;
      const position = { moduleIndex: moduleRow!.position!, itemIndex: item.position };
      const previous = positions.get(key);
      if (!previous || position.moduleIndex < previous.moduleIndex || (position.moduleIndex === previous.moduleIndex && position.itemIndex < previous.itemIndex)) positions.set(key, position);
    }
  }
  return items.map(item => ({ ...item, sourcePosition: eligible(item)
    ? positions.get(item.course!.id + ':' + item.sourceMaterialId) ?? null : null }));
}
