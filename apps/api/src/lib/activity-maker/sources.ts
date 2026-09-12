import type { Database, CanvasAssignmentRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivitySource, TaskSpecification } from '@stay-focused/shared';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { normalizeCanvasHtmlToText } from '../canvas-content-normalization';
import { sanitizeCanvasTitleText } from '../canvas-source-safety';
import { loadStoredSelectedCanvasCourse, prepareCanvasReviewerSources, previewCanvasReviewerSources } from '../canvas-reviewer-sources';
import { createServerOcrProvider } from '../ocr/create-server-ocr-provider';
import { ExperienceFailure } from '../experience/errors';
import { sourceRole } from './generation';
type Client = SupabaseClient<Database>;
export async function ownedAssignment(client: Client, userId: string, activityId: string): Promise<CanvasAssignmentRow> {
    if (!/^canvas:[0-9a-f-]{36}$/i.test(activityId))
        throw new ExperienceFailure(404, 'activity_not_found');
    const { data, error } = await client.from('canvas_assignments').select('*').eq('id', activityId.slice(7)).eq('user_id', userId).maybeSingle();
    if (error)
        throw new ExperienceFailure(503, 'unavailable');
    if (!data || data.user_id !== userId)
        throw new ExperienceFailure(404, 'activity_not_found');
    return data;
}
export function assignmentLinks(html: string, baseUrl: string): {
    kind: 'file' | 'page';
    externalId: string;
}[] {
    const links: {
        kind: 'file' | 'page';
        externalId: string;
    }[] = [];
    const base = new URL(baseUrl);
    function walk(n: DefaultTreeAdapterMap['node']) {
        if ('attrs' in n)
            for (const a of n.attrs.filter(a => ['href', 'src', 'data-api-endpoint'].includes(a.name))) {
                try {
                    const url = new URL(a.value, base);
                    if (url.origin !== base.origin)
                        continue;
                    const file = url.pathname.match(/\/(?:files)\/(\d+)(?:\/|$)/);
                    const page = url.pathname.match(/\/pages\/([^/]+)\/?$/);
                    if (file)
                        links.push({ kind: 'file', externalId: file[1]! });
                    else if (page)
                        links.push({ kind: 'page', externalId: decodeURIComponent(page[1]!) });
                }
                catch { /* Malformed links never become fetch targets. */ }
            }
        if ('childNodes' in n)
            n.childNodes.forEach(walk);
    }
    walk(parseFragment(html));
    return links.filter((l, i) => links.findIndex(o => o.kind === l.kind && o.externalId === l.externalId) === i);
}
export async function assembleActivitySources(client: Client, userId: string, activityId: string, materialIds: readonly string[]): Promise<{
    assignment: CanvasAssignmentRow;
    sources: ActivitySource[];
    context: TaskSpecification['context'];
}> {
    const assignment = await ownedAssignment(client, userId, activityId);
    const course = await loadStoredSelectedCanvasCourse({ client, userId, courseId: assignment.course_id });
    if (!course.ok || course.value.course.canvas_connection_id !== assignment.canvas_connection_id)
        throw new ExperienceFailure(409, 'activity_source_unavailable');
    type SourceTable = 'canvas_files' | 'canvas_pages' | 'canvas_module_items';
    async function rows<T extends SourceTable>(table: T): Promise<Database['public']['Tables'][T]['Row'][]> {
        const result: Database['public']['Tables'][T]['Row'][] = [];
        for (let offset = 0; offset < 10000; offset += 200) {
            const { data, error } = await client.from(table as SourceTable).select('*').eq('user_id', userId).eq('course_id', assignment.course_id).eq('canvas_connection_id', assignment.canvas_connection_id).order('id').range(offset, offset + 199);
            if (error || !data)
                throw new ExperienceFailure(503, 'unavailable');
            const page = data as unknown as Database['public']['Tables'][T]['Row'][];
            result.push(...page.filter(r => r.user_id === userId && r.course_id === assignment.course_id && r.canvas_connection_id === assignment.canvas_connection_id));
            if (page.length < 200)
                return result;
        }
        throw new ExperienceFailure(409, 'activity_source_unavailable');
    }
    const [files, pages, items] = await Promise.all([rows('canvas_files'), rows('canvas_pages'), rows('canvas_module_items')]);
    const instructions = normalizeCanvasHtmlToText(assignment.description_html);
    const sources: ActivitySource[] = [{ id: 'instructions', title: sanitizeCanvasTitleText(assignment.name).slice(0, 220), role: 'instructions', text: instructions, materialId: null }];
    const selected = new Map<string, ActivitySource['role']>();
    const links = assignmentLinks(assignment.description_html ?? '', course.value.connection.base_url);
    for (const link of links) {
        const row = link.kind === 'file' ? files.find(f => f.canvas_file_id === link.externalId) : pages.find(p => p.canvas_page_url === link.externalId);
        if (!row)
            throw new ExperienceFailure(409, 'activity_source_unavailable');
        selected.set(`${link.kind}:${row.id}`, 'attachment');
    }
    const modules = new Set(items.filter(i => i.item_type === 'Assignment' && i.canvas_content_id === assignment.canvas_assignment_id).map(i => i.module_id));
    // Exact module identities, never equal module titles or course-wide fuzzy search.
    for (const item of items.filter(i => modules.has(i.module_id)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id))) {
        const file = item.item_type === 'File' ? files.find(f => f.canvas_file_id === item.canvas_content_id) : null;
        const page = item.item_type === 'Page' ? pages.find(p => p.canvas_page_url === item.page_url) : null;
        if (file && (file.ingestion_status === 'stored' || file.ingestion_status === 'unchanged')) {
            const id = `file:${file.id}`;
            if (!selected.has(id))
                selected.set(id, 'course_material');
        }
        if (page) {
            const id = `page:${page.id}`;
            if (!selected.has(id))
                selected.set(id, 'course_material');
        }
    }
    for (const id of materialIds) {
        if (!files.some(f => id === `file:${f.id}`) && !pages.some(p => id === `page:${p.id}`))
            throw new ExperienceFailure(404, 'activity_source_unavailable');
        if (!selected.has(id))
            selected.set(id, 'reference');
    }
    if (selected.size > 12)
        throw new ExperienceFailure(409, 'activity_source_unavailable');
    for (const [id, role] of selected) {
        const file = files.find(f => id === `file:${f.id}`);
        if (file) {
            if (/\.(?:doc|ppt)$/i.test(file.filename ?? file.display_name))
                throw new ExperienceFailure(422, 'unsupported_attachment_type');
            const prepared = await prepareCanvasReviewerSources({ client, userId, courseId: assignment.course_id, sourceIds: [id] });
            if (!prepared.ok || prepared.value.results.some(r => r.status !== 'ready'))
                throw new ExperienceFailure(409, 'activity_source_unavailable');
        }
        let ocrProvider;
        if (file && /pdf|image\//.test(file.content_type ?? ''))
            ocrProvider = createServerOcrProvider();
        const preview = await previewCanvasReviewerSources({ client, userId, courseId: assignment.course_id, sourceIds: [id], ...(ocrProvider ? { ocrProvider } : {}) });
        if (!preview.ok)
            throw new ExperienceFailure(422, /template|worksheet/i.test(file?.display_name ?? '') ? 'activity_template_unreadable' : 'activity_source_unavailable');
        const title = sanitizeCanvasTitleText(file?.display_name ?? pages.find(p => id === `page:${p.id}`)?.title ?? 'Course material').slice(0, 220);
        sources.push({ id: `source-${sources.length}`, title, role: sourceRole(title, preview.value.sourceText, instructions, role), text: preview.value.sourceText, materialId: id });
    }
    if (sources.reduce((n, s) => n + s.text.length, 0) > 120000)
        throw new ExperienceFailure(409, 'activity_source_unavailable');
    const priority = { instructions: 0, template: 1, attachment: 2, course_material: 4, reference: 5 };
    sources.sort((a, b) => priority[a.role] - priority[b.role]);
    return { assignment, sources, context: { courseId: assignment.course_id, courseTitle: sanitizeCanvasTitleText(course.value.course.name ?? 'Course').slice(0, 220), moduleIds: [...modules] } };
}
