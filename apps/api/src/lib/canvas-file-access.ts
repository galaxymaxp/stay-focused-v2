import type {
  CanvasAnnouncementRow, CanvasAssignmentRow, CanvasFileReferenceRow, CanvasModuleItemRow,
  CanvasModuleRow, CanvasPageRow, Database,
} from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanvasFileAccessReference } from './canvas-file-policy';

export interface CanvasSourceAccessInput {
  readonly published: boolean | null;
  readonly locked?: boolean | null;
  readonly lockAt?: string | null;
  readonly unlockAt?: string | null;
  readonly lockInfo?: unknown;
  readonly state?: string | null;
}

export function canvasSourceAccessReference(source: CanvasSourceAccessInput, now = new Date()): CanvasFileAccessReference {
  const lockAt = Date.parse(source.lockAt ?? '');
  const unlockAt = Date.parse(source.unlockAt ?? '');
  return { current: true, published: source.published,
    visible: source.published !== false && source.locked !== true && source.lockInfo == null &&
      !['locked', 'unpublished', 'deleted'].includes(source.state ?? '') &&
      !(Number.isFinite(lockAt) && lockAt <= now.getTime()) &&
      !(Number.isFinite(unlockAt) && unlockAt > now.getTime()) };
}

interface SourceReferenceIdentity {
  readonly reference_type: string;
  readonly canvas_page_url: string | null;
  readonly canvas_assignment_id: string | null;
  readonly canvas_announcement_id: string | null;
  readonly canvas_module_item_id: string | null;
}

export function referenceSourceKey(reference: SourceReferenceIdentity): string | null {
  switch (reference.reference_type) {
    case 'page': return reference.canvas_page_url ? `page:${reference.canvas_page_url}` : null;
    case 'assignment':
    case 'typed_attachment': return reference.canvas_assignment_id ? `assignment:${reference.canvas_assignment_id}` : null;
    case 'announcement': return reference.canvas_announcement_id ? `announcement:${reference.canvas_announcement_id}` : null;
    case 'module_item': return reference.canvas_module_item_id ? `module_item:${reference.canvas_module_item_id}` : null;
    default: return null;
  }
}

export function accessReferencesForFile<T extends SourceReferenceIdentity>(
  references: readonly T[], sources: ReadonlyMap<string, CanvasFileAccessReference>,
): readonly CanvasFileAccessReference[] {
  return references.flatMap(reference => {
    const key = referenceSourceKey(reference);
    const source = key ? sources.get(key) : undefined;
    return source ? [source] : [];
  });
}

export function storedCanvasFileAccessSources(input: {
  pages: readonly CanvasPageRow[]; assignments: readonly CanvasAssignmentRow[];
  announcements: readonly CanvasAnnouncementRow[]; modules: readonly CanvasModuleRow[];
  moduleItems: readonly CanvasModuleItemRow[];
}, now = new Date()): ReadonlyMap<string, CanvasFileAccessReference> {
  const sources = new Map<string, CanvasFileAccessReference>();
  for (const page of input.pages) sources.set(`page:${page.canvas_page_url}`, canvasSourceAccessReference({
    published: page.published, lockAt: page.lock_at, unlockAt: page.unlock_at, lockInfo: page.lock_info,
  }, now));
  for (const assignment of input.assignments) sources.set(`assignment:${assignment.canvas_assignment_id}`, canvasSourceAccessReference({
    published: assignment.published, lockAt: assignment.lock_at, unlockAt: assignment.unlock_at,
  }, now));
  for (const announcement of input.announcements) sources.set(`announcement:${announcement.canvas_announcement_id}`, canvasSourceAccessReference({
    published: announcement.published, locked: announcement.locked, lockAt: announcement.lock_at,
    unlockAt: announcement.delayed_post_at, state: announcement.workflow_state,
  }, now));
  const modules = new Map(input.modules.map(module => [module.id, module]));
  for (const item of input.moduleItems) {
    const module = modules.get(item.module_id);
    const details = item.content_details;
    const locked = typeof details === 'object' && details !== null && 'locked_for_user' in details && details.locked_for_user === true;
    const parent = module ? canvasSourceAccessReference({ published: module.published,
      unlockAt: module.unlock_at, state: module.canvas_state }, now) : null;
    sources.set(`module_item:${item.canvas_module_item_id}`, { current: true, published: item.published,
      visible: Boolean(parent?.visible) && item.published !== false && !locked });
  }
  return sources;
}

const PAGE_SIZE = 200;
const MAX_PAGES = 50;
type AccessTable = 'canvas_file_references' | 'canvas_pages' | 'canvas_assignments' |
  'canvas_announcements' | 'canvas_modules' | 'canvas_module_items';
export interface CanvasFileAccessQuery {
  readonly client: SupabaseClient<Database>;
  readonly userId: string;
  readonly connectionId: string;
  readonly courseId: string;
}

/** Complete, owner-scoped course batches; no file-by-file reference queries. */
export async function readCanvasFileAccessReferences(query: CanvasFileAccessQuery): Promise<ReadonlyMap<string, readonly CanvasFileAccessReference[]>> {
  async function read<TRow>(table: AccessTable): Promise<TRow[]> {
    const rows: TRow[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await query.client.from(table).select('*').eq('user_id', query.userId)
        .eq('canvas_connection_id', query.connectionId).eq('course_id', query.courseId)
        .order('id', { ascending: true }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (result.error || !result.data) throw new Error('canvas_file_reference_inventory_incomplete');
      rows.push(...result.data as unknown as TRow[]);
      if (result.data.length < PAGE_SIZE) return rows;
    }
    throw new Error('canvas_file_reference_inventory_incomplete');
  }
  const references = await read<CanvasFileReferenceRow>('canvas_file_references');
  if (!references.length) return new Map();
  const kinds = new Set(references.map(reference => reference.reference_type));
  const [pages, assignments, announcements, modules, moduleItems] = await Promise.all([
    kinds.has('page') ? read<CanvasPageRow>('canvas_pages') : [],
    kinds.has('assignment') || kinds.has('typed_attachment') ? read<CanvasAssignmentRow>('canvas_assignments') : [],
    kinds.has('announcement') ? read<CanvasAnnouncementRow>('canvas_announcements') : [],
    kinds.has('module_item') ? read<CanvasModuleRow>('canvas_modules') : [],
    kinds.has('module_item') ? read<CanvasModuleItemRow>('canvas_module_items') : [],
  ]);
  const sources = storedCanvasFileAccessSources({ pages, assignments, announcements, modules, moduleItems });
  const byFile = new Map<string, CanvasFileReferenceRow[]>();
  for (const reference of references) {
    const group = byFile.get(reference.file_id) ?? [];
    group.push(reference);
    byFile.set(reference.file_id, group);
  }
  return new Map([...byFile].map(([id, group]) => [id, accessReferencesForFile(group, sources)]));
}
