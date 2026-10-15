import type { Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { ActivityDraft, ActivityDraftContent, ActivitySource, GenerationView } from '@stay-focused/shared';
import { sanitizeCanvasTitleText } from '../canvas-source-safety';
import { ExperienceFailure } from '../experience/errors';
import { MISSING_INFORMATION } from './messages';

export function activityGenerationState(job: Pick<ProcessingJobDatabaseRow, 'status' | 'stage'>): GenerationView['state'] {
    if (job.status === 'succeeded')
        return 'completed';
    if (job.status === 'queued')
        return 'queued';
    if (job.status === 'cancelled')
        return 'cancelled';
    if (job.status === 'cancellation_requested')
        return 'cancelling';
    if (job.status !== 'running')
        return 'failed';
    return job.stage === 'preparing_source' ? 'preparing' : job.stage === 'storing_result' ? 'finalizing' : 'generating';
}
export function object(value: unknown): Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export function validateEditableContent(value: unknown, sourceIds: readonly string[]): ActivityDraftContent {
    const c = object(value);
    const bad = () => { throw new ExperienceFailure(400, 'invalid_request'); };
    if (Object.keys(c).some(k => !['title', 'sections', 'slides'].includes(k)) || typeof c.title !== 'string' || !c.title.trim() || c.title.length > 220 || !Array.isArray(c.sections) || !Array.isArray(c.slides) || c.sections.length + c.slides.length < 1 || c.sections.length + c.slides.length > 100 || JSON.stringify(c).length > 180000)
        return bad();
    if (c.sections.length && c.slides.length)
        return bad();
    const refs = (v: unknown) => Array.isArray(v) && v.length <= 20 && v.every(id => typeof id === 'string' && sourceIds.includes(id));
    for (const [i, raw] of c.sections.entries()) {
        const s = object(raw);
        if (Object.keys(s).some(k => !['id', 'heading', 'level', 'content', 'order', 'sourceRefs'].includes(k)) || typeof s.id !== 'string' || !/^section-\d+$/.test(s.id) || s.order !== i + 1 || typeof s.level !== 'number' || !Number.isInteger(s.level) || s.level < 1 || s.level > 6 || (s.heading !== null && (typeof s.heading !== 'string' || s.heading.length > 500)) || typeof s.content !== 'string' || !s.content.trim() || s.content.length > 20000 || !refs(s.sourceRefs))
            return bad();
    }
    if (new Set(c.sections.map(s => object(s).id)).size !== c.sections.length)
        return bad();
    for (const [i, raw] of c.slides.entries()) {
        const s = object(raw);
        if (Object.keys(s).some(k => !['number', 'title', 'body', 'speakerNotes', 'sourceRefs'].includes(k)) || s.number !== i + 1 || typeof s.title !== 'string' || s.title.length > 500 || typeof s.body !== 'string' || !s.body.trim() || s.body.length > 20000 || (s.speakerNotes !== null && (typeof s.speakerNotes !== 'string' || s.speakerNotes.length > 10000)) || !refs(s.sourceRefs))
            return bad();
    }
    return c as unknown as ActivityDraftContent;
}
export function draftView(row: Database['public']['Tables']['activity_drafts']['Row']): ActivityDraft {
    const sources = (Array.isArray(row.sources) ? row.sources : []).map(s => object(s)).filter(s => typeof s.id === 'string' && typeof s.title === 'string' && ['instructions', 'template', 'reference', 'course_material', 'attachment'].includes(String(s.role))).map(s => ({ id: s.id as string, title: sanitizeCanvasTitleText(s.title as string).slice(0, 220), role: s.role as ActivitySource['role'], ...(s.materialId === null || typeof s.materialId === 'string' && /^(file|page):[0-9a-f-]{36}$/i.test(s.materialId) ? { materialId: s.materialId as string | null } : {}), ...(typeof s.contentSha256 === 'string' && /^[a-f0-9]{64}$/.test(s.contentSha256) ? { contentSha256: s.contentSha256 } : {}) }));
    const content = validateEditableContent(row.content, sources.map(s => s.id));
    const warnings: ActivityDraft['warnings'] = (Array.isArray(row.warnings) ? row.warnings : []).map(object).filter(w => w.code === 'missing_source_information' && typeof w.sectionId === 'string' && /^section-\d+$/.test(w.sectionId)).map(w => ({ code: 'missing_source_information', sectionId: w.sectionId as string, message: MISSING_INFORMATION }));
    return { ...content, id: row.id, activityId: `canvas:${row.activity_id}`, courseId: row.course_id, type: row.activity_type as ActivityDraft['type'], sources, warnings, generationId: row.generation_id, createdAt: row.created_at, updatedAt: row.updated_at, editable: true, revision: row.revision, status: row.status as ActivityDraft['status'] };
}
