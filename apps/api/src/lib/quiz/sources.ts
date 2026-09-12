import type { Database } from '@stay-focused/db';
import type { QuizGenerationRequest, QuizSourceReference } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { prepareCanvasReviewerSources, structureCanvasReviewerSources } from '../canvas-reviewer-sources';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';
import { sanitizeCanvasTitleText } from '../canvas-source-safety';
import { normalized, type QuizRegion } from './generation';
type Client = SupabaseClient<Database>;
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const isId = (id: unknown): id is string => typeof id === 'string' && new RegExp(`^${uuid}$`, 'i').test(id);
export function readQuizRequest(value: unknown): QuizGenerationRequest {
    const v = record(value);
    if (Object.keys(v).some(k => !['sourceType', 'sourceIds', 'reviewerId', 'questionCount', 'difficulty', 'questionTypes'].includes(k)) || !['material', 'reviewer'].includes(String(v.sourceType)) || !Array.isArray(v.sourceIds) || v.sourceIds.length > 4 || new Set(v.sourceIds).size !== v.sourceIds.length || !Number.isInteger(v.questionCount) || Number(v.questionCount) < 5 || Number(v.questionCount) > 20 || !['easy', 'medium', 'hard', 'mixed'].includes(String(v.difficulty)) || (v.reviewerId !== undefined && !isId(v.reviewerId)))
        throw new ExperienceFailure(400, 'invalid_request');
    if (v.sourceType === 'reviewer' ? v.sourceIds.length !== 1 || !isId(v.sourceIds[0]) || (v.reviewerId !== undefined && v.reviewerId !== v.sourceIds[0]) : v.sourceIds.length < 1 || !v.sourceIds.every(id => typeof id === 'string' && new RegExp(`^(file|page|assignment|announcement):${uuid}$`, 'i').test(id)))
        throw new ExperienceFailure(400, 'invalid_request');
    if (v.questionTypes !== undefined && (!Array.isArray(v.questionTypes) || !v.questionTypes.length || new Set(v.questionTypes).size !== v.questionTypes.length || !v.questionTypes.every(t => ['single_select', 'multi_select', 'true_false'].includes(t))))
        throw new ExperienceFailure(400, 'invalid_request');
    return { sourceType: v.sourceType as QuizGenerationRequest['sourceType'], sourceIds: (v.sourceIds as string[]).map(s => s.toLowerCase()).sort(), questionCount: Number(v.questionCount), difficulty: v.difficulty as QuizGenerationRequest['difficulty'], ...(v.reviewerId ? { reviewerId: String(v.reviewerId).toLowerCase() } : {}), ...(v.questionTypes ? { questionTypes: v.questionTypes as NonNullable<QuizGenerationRequest['questionTypes']> } : {}) };
}
export async function resolveQuizSources(client: Client, userId: string, request: QuizGenerationRequest) {
    const reviewerId = request.sourceType === 'reviewer' ? request.sourceIds[0]! : request.reviewerId ?? null;
    let reviewer: Database['public']['Tables']['reviewers']['Row'] | null = null;
    let snapshot: Database['public']['Tables']['reviewer_source_snapshots']['Row'] | null = null;
    let materialIds = [...request.sourceIds];
    if (reviewerId) {
        const r = await client.from('reviewers').select('*').eq('user_id', userId).eq('id', reviewerId).maybeSingle();
        if (r.error || !r.data || r.data.user_id !== userId || !r.data.source_snapshot_id)
            throw new ExperienceFailure(404, 'quiz_source_unavailable');
        reviewer = r.data;
        const s = await client.from('reviewer_source_snapshots').select('*').eq('user_id', userId).eq('id', r.data.source_snapshot_id).maybeSingle();
        if (s.error || !s.data || s.data.user_id !== userId || s.data.was_edited)
            throw new ExperienceFailure(409, 'quiz_source_unavailable');
        snapshot = s.data;
        const items = await client.from('reviewer_source_snapshot_items').select('*').eq('user_id', userId).eq('source_snapshot_id', snapshot.id).order('ordinal').limit(5);
        if (items.error || !items.data?.length || items.data.length > 4 || items.data.some(i => i.user_id !== userId || !i.source_row_id))
            throw new ExperienceFailure(409, 'quiz_source_unavailable');
        const associated = items.data.map(i => `${i.source_type}:${i.source_row_id}`);
        if (request.sourceType === 'reviewer')
            materialIds = associated;
        else if (materialIds.some(id => !associated.includes(id)))
            throw new ExperienceFailure(409, 'quiz_source_unavailable');
    }
    let courseId: string | null = null, connectionId: string | null = null;
    const tableMap = { file: 'canvas_files', page: 'canvas_pages', assignment: 'canvas_assignments', announcement: 'canvas_announcements' } as const;
    for (const id of materialIds) {
        const [kind, rowId] = id.split(':');
        const table = tableMap[kind as keyof typeof tableMap];
        if (!table)
            throw new ExperienceFailure(404, 'quiz_source_unavailable');
        const r = await client.from(table).select('id,user_id,course_id,canvas_connection_id').eq('user_id', userId).eq('id', rowId!).maybeSingle();
        if (r.error || !r.data || r.data.user_id !== userId || (courseId && courseId !== r.data.course_id) || (connectionId && connectionId !== r.data.canvas_connection_id))
            throw new ExperienceFailure(404, 'quiz_source_unavailable');
        courseId = r.data.course_id;
        connectionId = r.data.canvas_connection_id;
    }
    if (!courseId || !connectionId || (snapshot && snapshot.course_id !== courseId))
        throw new ExperienceFailure(409, 'quiz_source_unavailable');
    return { courseId, connectionId, reviewerId, reviewer, snapshot, materialIds };
}
export interface SourceBlock {
    id: string;
    kind: string;
    text: string;
    page?: number;
    slide?: number;
}
export function regionsFromBlocks(materialId: string, title: string, blocks: readonly SourceBlock[], reviewerOutput?: unknown): QuizRegion[] {
    const output = record(reviewerOutput), reviewer = 'reviewer' in output ? record(output.reviewer) : output;
    const sections = Array.isArray(reviewer.sections) ? reviewer.sections.map(record) : [];
    const regions: QuizRegion[] = [];
    let label = title, group: SourceBlock[] = [];
    const flush = () => {
        if (!group.length)
            return;
        const id = `${materialId}/${group[0]!.id}`;
        const refs: QuizSourceReference[] = group.map(b => ({ materialId, regionId: b.id, page: b.page ?? null, slide: b.slide ?? null }));
        // Only an exact, unique source heading match can become a Reviewer deep link.
        const matched = sections.filter(s => typeof s.title === 'string' && normalized(s.title) === normalized(label) && typeof s.id === 'string');
        regions.push({ id, label: sanitizeCanvasTitleText(label).slice(0, 220), text: group.map(b => b.text).join('\n'), sourceRefs: refs, reviewerSectionIds: matched.length === 1 ? [String(matched[0]!.id)] : [] });
        group = [];
    };
    for (const block of blocks) {
        if (block.kind === 'heading' && !/^(?:solution\s*:?|\d+[.)]\s*(?:substitute|calculate|compute|find|look|arrange|determine|locate|identify)\b.*)$/i.test(block.text.trim())) {
            flush();
            label = block.text.replace(/^#+\s*/, '').trim();
            continue;
        }
        if (!block.text.trim() || /^(?:prepared by|contact|email|copyright)\b/i.test(block.text.trim()))
            continue;
        if (group.length && (group.reduce((n, b) => n + b.text.length, 0) + block.text.length > 8000 || (block.slide !== undefined && group[0]!.slide !== block.slide)))
            flush();
        group.push(block);
    }
    flush();
    return regions;
}
export async function assembleQuizSources(client: Client, userId: string, request: QuizGenerationRequest) {
    const resolved = await resolveQuizSources(client, userId, request);
    const regions: QuizRegion[] = [];
    // Reuse preparation/structuring per explicitly selected material; never expand a course.
    for (const materialId of resolved.materialIds) {
        if (materialId.startsWith('file:')) {
            const prepared = await prepareCanvasReviewerSources({ client, userId, courseId: resolved.courseId, sourceIds: [materialId] });
            if (!prepared.ok || prepared.value.results.some(r => r.status !== 'ready'))
                throw new ExperienceFailure(409, 'quiz_source_unavailable');
        }
        const structure = await structureCanvasReviewerSources({ client, userId, courseId: resolved.courseId, sourceIds: [materialId] });
        if (!structure.ok)
            throw new ExperienceFailure(409, 'quiz_source_unavailable');
        for (const source of structure.value.sources)
            regions.push(...regionsFromBlocks(materialId, source.title, source.blocks.filter(b => b.selectable).map(b => ({ id: b.id, kind: b.kind, text: b.text, page: b.pageNumber, slide: b.slideNumber })), resolved.reviewer?.reviewer_output));
    }
    if (!regions.length || regions.reduce((n, r) => n + r.text.length, 0) > 120000)
        throw new ExperienceFailure(409, 'quiz_source_unavailable');
    return { ...resolved, regions };
}
