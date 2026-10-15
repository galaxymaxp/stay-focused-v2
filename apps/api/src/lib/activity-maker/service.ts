import { draftView, object, validateEditableContent } from './read-model';
export { activityGenerationState, draftView, object, validateEditableContent } from './read-model';
import type { Database,Json,ProcessingJobDatabaseRow } from '@stay-focused/db';
import { GenerationContractError } from '@stay-focused/engine';
import type { ActivityDraft,OfflineDraftSaveResult,ActivityDraftCopy,ActivityDraftCopies } from '@stay-focused/shared';
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
import { generateActivityDocument } from './ai-first';
import { assembleActivitySources,ownedAssignment } from './sources';
type Client = SupabaseClient<Database>;
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

export async function saveOfflineActivityDraft(client: Client, userId: string, id: string, value: unknown): Promise<OfflineDraftSaveResult> {
    const input = object(value);
    if (Object.keys(input).some(k => !['baseRevision', 'content', 'clientEditId'].includes(k)) ||
        typeof input.baseRevision !== 'number' || !Number.isSafeInteger(input.baseRevision) || input.baseRevision < 1 || input.baseRevision > 2147483646 ||
        typeof input.clientEditId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.clientEditId))
        throw new ExperienceFailure(400, 'invalid_request');
    const existing = await readActivityDraft(client, userId, id);
    const content = validateEditableContent(input.content, existing.sources.map(s => s.id));
    const { data, error } = await client.rpc('save_offline_activity_draft', {
        p_draft_id: id, p_base_revision: input.baseRevision, p_client_edit_id: input.clientEditId,
        p_content: JSON.parse(JSON.stringify(content)) as Json,
    });
    if (error) throw new ExperienceFailure(error.message.includes('activity_draft_not_found') ? 404 : error.message.includes('invalid_request') ? 400 : 503,
        error.message.includes('activity_draft_not_found') ? 'activity_draft_not_found' : error.message.includes('invalid_request') ? 'invalid_request' : 'unavailable');
    const result = object(data), row = object(result.draft);
    if (row.user_id !== userId || row.id !== id || typeof result.conflict !== 'boolean' || typeof result.replayed !== 'boolean' ||
        !(result.copyId === null || typeof result.copyId === 'string')) throw new ExperienceFailure(503, 'unavailable');
    return { draft: draftView(row as unknown as Database['public']['Tables']['activity_drafts']['Row']), conflict: result.conflict, replayed: result.replayed, copyId: result.copyId };
}

export async function listActivityDraftCopies(client: Client, userId: string, id: string): Promise<ActivityDraftCopies> {
    await readActivityDraft(client, userId, id);
    const { data, error } = await client.from('activity_draft_copies').select('id,user_id,draft_id,revision,created_at,content').eq('user_id', userId).eq('draft_id', id).order('created_at', { ascending: false });
    if (error) throw new ExperienceFailure(503, 'unavailable');
    return { copies: (data ?? []).filter(row => row.user_id === userId && row.draft_id === id).map(row => ({ id: row.id, revision: row.revision, createdAt: row.created_at, title: String(object(row.content).title ?? '').slice(0, 220) })) };
}
export async function readActivityDraftCopy(client: Client, userId: string, id: string, copyId: string): Promise<ActivityDraftCopy> {
    const draft = await readActivityDraft(client, userId, id);
    const { data, error } = await client.from('activity_draft_copies').select('*').eq('user_id', userId).eq('draft_id', id).eq('id', copyId).maybeSingle();
    if (error) throw new ExperienceFailure(503, 'unavailable');
    if (!data || data.user_id !== userId || data.draft_id !== id) throw new ExperienceFailure(404, 'activity_draft_not_found');
    const content = validateEditableContent(data.content, draft.sources.map(s => s.id));
    return { id: data.id, revision: data.revision, createdAt: data.created_at, title: content.title, content };
}
export async function deleteActivityDraftCopy(client: Client, userId: string, id: string, copyId: string) {
    await readActivityDraftCopy(client, userId, id, copyId);
    const { data, error } = await client.from('activity_draft_copies').delete().eq('user_id', userId).eq('draft_id', id).eq('id', copyId).select('id');
    if (error || !data?.length) throw new ExperienceFailure(404, 'activity_draft_not_found');
    return { deleted: true };
}
