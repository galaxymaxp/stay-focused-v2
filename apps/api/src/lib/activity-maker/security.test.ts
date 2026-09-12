import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ExperienceService } from '../experience/service';
import type { ExperienceRepository } from '../experience/repository';
import { readBoundedExperienceJson } from '../experience/http';
const mocks = vi.hoisted(() => ({ course: vi.fn(), prepare: vi.fn(), preview: vi.fn(), dispatch: vi.fn(), auth: vi.fn(), userClient: vi.fn() }));
vi.mock('../canvas-reviewer-sources', () => ({ loadStoredSelectedCanvasCourse: mocks.course, prepareCanvasReviewerSources: mocks.prepare, previewCanvasReviewerSources: mocks.preview, listCanvasReviewerSources: vi.fn() }));
vi.mock('../processing-jobs/workflow-dispatch', () => ({ dispatchAcceptedProcessingJob: mocks.dispatch }));
vi.mock('../auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('../reviewer-db', () => ({ createReviewerUserClient: mocks.userClient }));
import { assembleActivitySources } from './sources';
import { startActivityGeneration, readActivityDraft, updateActivityDraft, deleteActivityDraft } from './service';
import { POST } from '@/../app/api/experience/activities/[activityId]/generate/route';
import { GET, PATCH, DELETE } from '@/../app/api/experience/activity-drafts/[draftId]/route';
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const assignment = { id, user_id: A, course_id: 'course', canvas_connection_id: 'connection', canvas_assignment_id: '7', name: 'Activity', description_html: '<p>Answer questions 1–2 using the attached reading.</p><a href="/courses/1/pages/reading">Reading</a>' };
type Row = Record<string, unknown>;
function client(data: Record<string, Row[]> = {}) {
    const calls: {
        table: string;
        filters: Record<string, unknown>;
    }[] = [];
    const from = vi.fn((table: string) => {
        const filters: Record<string, unknown> = {};
        calls.push({ table, filters });
        const result = () => ({ data: (data[table] ?? []).filter(r => Object.entries(filters).every(([k, v]) => r[k] === v)), error: null });
        const chain = { select: vi.fn(() => chain), eq: vi.fn((k: string, v: unknown) => { filters[k] = v; return chain; }), order: vi.fn(() => chain), range: vi.fn(() => Promise.resolve(result())), maybeSingle: vi.fn(async () => ({ ...result(), data: result().data[0] ?? null })), update: vi.fn(() => chain), delete: vi.fn(() => chain) };
        return chain;
    });
    const rpc = vi.fn();
    return { value: { from, rpc } as unknown as SupabaseClient<Database>, calls, from, rpc };
}
beforeEach(() => {
    vi.clearAllMocks();
    mocks.course.mockResolvedValue({ ok: true, value: { course: { id: 'course', canvas_connection_id: 'connection' }, connection: { id: 'connection', base_url: 'https://canvas.test' } } });
    mocks.preview.mockResolvedValue({ ok: true, value: { sourceText: 'Diffusion moves particles from high concentration to low concentration.' } });
    mocks.prepare.mockResolvedValue({ ok: true, value: { results: [{ status: 'ready' }] } });
});
describe('Activity Maker authenticated boundaries', () => {
    it('bounds JSON bytes while reading and rejects malformed bodies', async () => {
        await expect(readBoundedExperienceJson(new Request('https://app.test', { method: 'POST', body: '{"mode":"draft"}' }), 32)).resolves.toEqual({ mode: 'draft' });
        for (const body of ['x'.repeat(100), 'not JSON'])
            await expect(readBoundedExperienceJson(new Request('https://app.test', { method: 'POST', body }), 32)).rejects.toMatchObject({ code: 'invalid_request' });
    });
    it('all generation/read/edit/delete routes deny missing JWT before data/provider access', async () => {
        mocks.auth.mockResolvedValue(null);
        const context = { params: Promise.resolve({ draftId: id, activityId: `canvas:${id}` }) };
        for (const [fn, method] of [[POST, 'POST'], [GET, 'GET'], [PATCH, 'PATCH'], [DELETE, 'DELETE']] as const) {
            const response = await fn(new Request('https://app.test/api/experience/activity-drafts/' + id, { method }), context);
            expect(response.status).toBe(401);
        }
        expect(mocks.preview).not.toHaveBeenCalled();
        expect(mocks.userClient).not.toHaveBeenCalled();
    });
    it('User A cannot generate User B assignment', async () => {
        const c = client({ canvas_assignments: [{ ...assignment, user_id: B }] });
        await expect(startActivityGeneration(c.value, A, `canvas:${id}`, { mode: 'draft', materialIds: [] }, 'request-key')).rejects.toMatchObject({ code: 'activity_not_found' });
        expect(c.rpc).not.toHaveBeenCalled();
    });
    it.each(['file', 'page'])('User A cannot select User B %s material or another course', async (kind) => {
        for (const foreign of [{ user_id: B, course_id: 'course' }, { user_id: A, course_id: 'other-course' }]) {
            const c = client({ canvas_assignments: [assignment], [kind === 'file' ? 'canvas_files' : 'canvas_pages']: [{ id, ...foreign }] });
            await expect(startActivityGeneration(c.value, A, `canvas:${id}`, { mode: 'draft', materialIds: [`${kind}:${id}`] }, 'request-key')).rejects.toMatchObject({ code: 'activity_source_unavailable' });
            expect(c.rpc).not.toHaveBeenCalled();
        }
    });
    it('foreign linked attachments fail before preparation/extraction', async () => {
        const c = client({ canvas_assignments: [{ ...assignment, description_html: '<a href="/files/42">Template</a>' }], canvas_files: [{ id, user_id: B, course_id: 'course', canvas_connection_id: 'connection', canvas_file_id: '42' }] });
        await expect(assembleActivitySources(c.value, A, `canvas:${id}`, [])).rejects.toMatchObject({ code: 'activity_source_unavailable' });
        expect(mocks.prepare).not.toHaveBeenCalled();
    });
    it('assembles linked course pages without client course context', async () => {
        const c = client({ canvas_assignments: [assignment], canvas_pages: [{ id: 'page', user_id: A, course_id: 'course', canvas_connection_id: 'connection', canvas_page_url: 'reading', title: 'Reading' }] });
        const assembled = await assembleActivitySources(c.value, A, `canvas:${id}`, []);
        expect(assembled.sources.map(s => s.role)).toEqual(['instructions', 'attachment']);
        expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({ userId: A, courseId: 'course', sourceIds: ['page:page'] }));
    });
    it('automatically includes exact same-module pages and excludes unrelated module pages', async () => {
        const c = client({ canvas_assignments: [{ ...assignment, description_html: 'Explain diffusion.' }], canvas_pages: [{ id: 'same', user_id: A, course_id: 'course', canvas_connection_id: 'connection', canvas_page_url: 'reading', title: 'Reading' }, { id: 'other', user_id: A, course_id: 'course', canvas_connection_id: 'connection', canvas_page_url: 'unrelated', title: 'Unrelated' }], canvas_module_items: [{ id: 'assignment-item', user_id: A, course_id: 'course', canvas_connection_id: 'connection', module_id: 'm1', item_type: 'Assignment', canvas_content_id: '7' }, { id: 'page-item', user_id: A, course_id: 'course', canvas_connection_id: 'connection', module_id: 'm1', item_type: 'Page', page_url: 'reading' }, { id: 'other-item', user_id: A, course_id: 'course', canvas_connection_id: 'connection', module_id: 'm2', item_type: 'Page', page_url: 'unrelated' }] });
        const result = await assembleActivitySources(c.value, A, `canvas:${id}`, []);
        expect(result.sources.map(s => s.materialId)).toEqual([null, 'page:same']);
        expect(result.sources[1]?.role).toBe('course_material');
    });
    it('Library opens the persisted editable draft and generation resolves its artifact without regeneration', async () => {
        const date = '2026-09-12T00:00:00.000Z';
        const draft = { id, user_id: A, activity_id: id, course_id: 'course', generation_id: 'job', activity_type: 'reflection', content: { title: 'Saved reflection', sections: [{ id: 'section-1', heading: null, level: 1, content: 'Student edit', order: 1, sourceRefs: [] }], slides: [] }, sources: [], warnings: [], created_at: date, updated_at: date, status: 'edited', revision: 2 };
        const repository = { rows: vi.fn(async (table: string) => table === 'activity_drafts' ? [draft] : table === 'processing_jobs' ? [{ id: 'job', user_id: A, job_type: 'activity_generation', status: 'succeeded', updated_at: date }] : []) } as unknown as ExperienceRepository;
        const service = new ExperienceService({ repository, materials: vi.fn() });
        expect((await service.getLibrary(A, { type: 'activity_output' })).items[0]).toMatchObject({ id: `activity:${id}`, type: 'activity_output', activityId: `canvas:${id}` });
        expect(await service.getLibraryArtifact(A, `activity:${id}`)).toMatchObject({ draft: { revision: 2, status: 'edited', sections: [{ content: 'Student edit' }] } });
        expect(await service.getGeneration(A, 'job')).toMatchObject({ state: 'completed', artifactId: `activity:${id}`, progress: null });
        expect(mocks.dispatch).not.toHaveBeenCalled();
        expect(mocks.preview).not.toHaveBeenCalled();
    });
    it('read/edit/delete foreign drafts return the same safe not-found', async () => {
        const c = client({ activity_drafts: [{ id, user_id: B }] });
        await expect(readActivityDraft(c.value, A, id)).rejects.toMatchObject({ code: 'activity_draft_not_found' });
        await expect(updateActivityDraft(c.value, A, id, { revision: 1, content: {} })).rejects.toMatchObject({ code: 'activity_draft_not_found' });
        await expect(deleteActivityDraft(c.value, A, id)).rejects.toMatchObject({ code: 'activity_draft_not_found' });
    });
    it('Library and generation owner filters reject foreign rows even from a permissive adapter', async () => {
        const repository = { rows: vi.fn(async (table: string) => table === 'activity_drafts' ? [{ id, user_id: B }] : table === 'processing_jobs' ? [{ id, user_id: B, job_type: 'activity_generation' }] : []) } as unknown as ExperienceRepository;
        const service = new ExperienceService({ repository, materials: vi.fn() });
        expect((await service.getLibrary(A, { type: 'activity_output' })).items).toEqual([]);
        await expect(service.getLibraryArtifact(A, `activity:${id}`)).rejects.toMatchObject({ status: 404 });
        await expect(service.getGeneration(A, id)).rejects.toMatchObject({ status: 404 });
    });
});
