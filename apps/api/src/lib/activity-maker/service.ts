import type { Database,Json,ProcessingJobDatabaseRow } from '@stay-focused/db';
import { GenerationContractError } from '@stay-focused/engine';
import type { ActivityDraft,ActivityDraftContent,ActivitySource,GenerationView } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { sanitizeCanvasTitleText } from '../canvas-source-safety';
import { ExperienceFailure } from '../experience/errors';
import { durableGenerationProvider } from '../processing-jobs/ai-generation';
import { validateIdempotencyKey } from '../processing-jobs/creation';
import { findProcessingJobSource } from '../processing-jobs/repository';
import { updateProcessingJobProgress } from '../processing-jobs/worker-repository';
import { dispatchAcceptedProcessingJob } from '../processing-jobs/workflow-dispatch';
import { readProcessingJobCheckpoint,writeProcessingJobCheckpoint } from '../processing-jobs/workflow-repository';
import { generateActivityDocument,MISSING_INFORMATION } from './ai-first';
import { assembleActivitySources,ownedAssignment } from './sources';
type Client = SupabaseClient<Database>;
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
export function readGenerationInput(value: unknown): {
    mode: 'draft';
    materialIds: string[];
} {
    const input = object(value);
    if (input.mode !== 'draft' || Object.keys(input).some(k => !['mode', 'materialIds'].includes(k)) || (input.materialIds !== undefined && !Array.isArray(input.materialIds)))
        throw new ExperienceFailure(400, 'invalid_request');
    const ids = input.materialIds ?? [];
    if (!Array.isArray(ids) || ids.length > 12 || !ids.every(id => typeof id === 'string' && /^(file|page):[0-9a-f-]{36}$/i.test(id)) || new Set(ids).size !== ids.length)
        throw new ExperienceFailure(400, 'invalid_request');
    return { mode: 'draft', materialIds: [...ids].sort() as string[] };
}
export async function startActivityGeneration(client: Client, userId: string, activityId: string, input: {
    mode: 'draft';
    materialIds: string[];
}, requestKey: string | null) {
    let key: string;
    try {
        key = validateIdempotencyKey(requestKey);
    }
    catch {
        throw new ExperienceFailure(400, 'invalid_request');
    }
    const assignment = await ownedAssignment(client, userId, activityId);
    for (const id of input.materialIds) {
        const [kind, rowId] = id.split(':');
        const { data, error } = await client.from(kind === 'file' ? 'canvas_files' : 'canvas_pages').select('id,user_id,course_id').eq('id', rowId!).eq('user_id', userId).eq('course_id', assignment.course_id).maybeSingle();
        if (error)
            throw new ExperienceFailure(503, 'unavailable');
        if (!data || data.user_id !== userId || data.course_id !== assignment.course_id)
            throw new ExperienceFailure(404, 'activity_source_unavailable');
    }
    const { data, error } = await client.rpc('create_activity_processing_job', { p_user_id: userId, p_activity_id: assignment.id, p_idempotency_key: key, p_material_ids: input.materialIds });
    if (error)
        throw new ExperienceFailure(error.message.includes('conflict') ? 409 : error.message.includes('limit') ? 429 : 503, error.message.includes('conflict') ? 'activity_draft_conflict' : error.message.includes('limit') ? 'rate_limited' : 'activity_generation_unavailable');
    if (!data?.[0] || data[0].user_id !== userId)
        throw new ExperienceFailure(503, 'activity_generation_unavailable');
    return dispatchAcceptedProcessingJob(data[0]);
}
export async function processActivityJob(client: Client, job: ProcessingJobDatabaseRow, workerId: string) {
    const source = await findProcessingJobSource(client, job);
    const metadata = object(source.metadata);
    if (job.job_type !== 'activity_generation' || source.user_id !== job.user_id || typeof metadata.activityId !== 'string')
        throw new ExperienceFailure(404, 'activity_not_found');
    const input = readGenerationInput({ mode: 'draft', materialIds: metadata.materialIds });
    await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'preparing_source', statusMessage: 'Preparing activity sources' });
    const prepared = await readProcessingJobCheckpoint(client, job.id, 'activity:source:ai-first');
    const assembled = prepared ? prepared.payload as unknown as Awaited<ReturnType<typeof assembleActivitySources>> : await assembleActivitySources(client, job.user_id, metadata.activityId, input.materialIds);
    const { assignment, sources, context } = assembled;
    if (!prepared) await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey: 'activity:source:ai-first', payload: JSON.parse(JSON.stringify({ assignment: { name: assignment.name, course_id: assignment.course_id, due_at: assignment.due_at, submission_types: assignment.submission_types }, sources, context })) as Json });
    const specification = { title: sanitizeCanvasTitleText(assignment.name).slice(0, 220) || 'Activity draft', context, dueAt: assignment.due_at, submissionTypes: assignment.submission_types };
    await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'generating_sections', statusMessage: 'Generating draft' });
    const saved = await readProcessingJobCheckpoint(client, job.id, 'activity:complete:ai-first');
    let generated: Awaited<ReturnType<typeof generateActivityDocument>>;
    if (saved) generated = saved.payload as unknown as typeof generated;
    else {
        try { generated = await generateActivityDocument(durableGenerationProvider(client, job.id, workerId), specification.title, sources, { dueAt: specification.dueAt, submissionTypes: specification.submissionTypes }); }
        catch (error) { if (error instanceof ExperienceFailure) throw error; throw new ExperienceFailure(error instanceof GenerationContractError ? 422 : 503, 'activity_generation_failed'); }
        await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey: 'activity:complete:ai-first', payload: JSON.parse(JSON.stringify(generated)) as Json });
    }
    validateEditableContent(generated.content, sources.map(s => s.id));
    // Ownership is rechecked immediately before transactional completion too.
    await ownedAssignment(client, job.user_id, metadata.activityId);
    await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'storing_result', statusMessage: 'Saving editable draft' });
    return { payload: { activityId: metadata.activityId, courseId: assignment.course_id, type: generated.activityType, content: generated.content, specification, sources: sources.map(({ id, title, role, materialId, text }) => ({ id, title, role, materialId, contentSha256: createHash('sha256').update(text).digest('hex') })), warnings: generated.warnings }, metrics: { sourceCount: sources.length } };
}
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
export async function readActivityDraft(client: Client, userId: string, id: string): Promise<ActivityDraft> {
    const { data, error } = await client.from('activity_drafts').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    if (error)
        throw new ExperienceFailure(503, 'unavailable');
    if (!data || data.user_id !== userId)
        throw new ExperienceFailure(404, 'activity_draft_not_found');
    return draftView(data);
}
export async function updateActivityDraft(client: Client, userId: string, id: string, value: unknown) {
    const input = object(value);
    if (Object.keys(input).some(k => !['content', 'revision'].includes(k)) || typeof input.revision !== 'number' || !Number.isInteger(input.revision) || input.revision < 1)
        throw new ExperienceFailure(400, 'invalid_request');
    const existing = await readActivityDraft(client, userId, id);
    const content = validateEditableContent(input.content, existing.sources.map(s => s.id));
    const { data, error } = await client.from('activity_drafts').update({ content: JSON.parse(JSON.stringify(content)) as Json, revision: input.revision + 1, status: 'edited' }).eq('id', id).eq('user_id', userId).eq('revision', input.revision).select('*').maybeSingle();
    if (error || !data)
        throw new ExperienceFailure(409, 'activity_draft_conflict');
    return draftView(data);
}
export async function deleteActivityDraft(client: Client, userId: string, id: string) {
    await readActivityDraft(client, userId, id);
    const { data, error } = await client.from('activity_drafts').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error || !data?.length)
        throw new ExperienceFailure(404, 'activity_draft_not_found');
    return { deleted: true };
}
