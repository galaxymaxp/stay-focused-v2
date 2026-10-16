import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningMaterial, LibraryArtifactSummary } from '@stay-focused/shared';
import { libraryRemovalPath, loadCourseMaterials, reviewerTargets, submitCourseReviewers } from './courseReviewerActions';

const mocks = vi.hoisted(() => ({ request: vi.fn(), read: vi.fn(), create: vi.fn(), accept: vi.fn() }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: mocks.request }));
vi.mock('../../services/generationRecovery', () => ({ readGenerationIntents: mocks.read, createGenerationIntent: mocks.create, acceptGeneration: mocks.accept }));
const client = { baseUrl: 'https://example.test', accessToken: 'test' };
const material = (id: string, extra: Partial<LearningMaterial> = {}): LearningMaterial => ({
  id, courseId: 'course', title: id, kind: 'slides', readiness: 'ready', count: null, sourceId: id,
  reviewerArtifactId: null, moduleTitle: null,
  generation: { reviewer: { status: 'available' }, quiz: { status: 'unavailable' }, activityAssistance: { status: 'unavailable' } }, ...extra,
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue([]);
  mocks.create.mockImplementation(async (_owner, input) => ({ ...input, key: 'saved-key' }));
  mocks.accept.mockResolvedValue({ generationId: 'job' });
});
describe('course Reviewer batches', () => {
  it('includes PPTX slides and skips generated, preparing and unsupported materials', () => {
    const slides = material('pptx');
    expect(reviewerTargets([slides, slides, material('saved', { reviewerArtifactId: 'reviewer' }), material('pending', { readiness: 'needs_preparation' }), material('unsupported', { readiness: 'unsupported' })])).toEqual([slides]);
  });
  it('remakes only unique saved sources with ready originals', () => {
    const saved = material('saved', { reviewerArtifactId: 'reviewer' });
    expect(reviewerTargets([saved, saved, material('new')], new Set(['saved', 'missing']))).toEqual([saved]);
  });
  it('collects all pages before choosing targets', async () => {
    mocks.request.mockResolvedValueOnce({ items: [material('one')], nextOffset: 50 }).mockResolvedValueOnce({ items: [material('one'), material('two')], nextOffset: null });
    expect((await loadCourseMaterials(client, 'course')).map(item => item.id)).toEqual(['one', 'two']);
    expect(mocks.request.mock.calls.map(call => call[1])).toEqual(['/api/experience/courses/course/materials?offset=0', '/api/experience/courses/course/materials?offset=50']);
  });
  it('fails closed if pagination repeats', async () => {
    mocks.request.mockResolvedValue({ items: [], nextOffset: 0 });
    await expect(loadCourseMaterials(client, 'course')).rejects.toThrow('every material');
  });
  it('reuses an uncertain saved admission instead of making another request', async () => {
    const saved = { key: 'pending', type: 'reviewer', body: { courseId: 'course', materialId: 'pptx' } };
    mocks.read.mockResolvedValue([saved]);
    const progress = vi.fn();
    await submitCourseReviewers('owner', client, [material('pptx')], progress);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.accept).toHaveBeenCalledWith('owner', client, saved);
    expect(progress).toHaveBeenCalledWith(1, 1);
  });
  it('keeps existing active work and allows an explicit remake after completion', async () => {
    mocks.read.mockResolvedValue([{ key: 'accepted', type: 'reviewer', generationId: 'job', body: { courseId: 'course', materialId: 'pptx' } }]);
    mocks.request.mockResolvedValueOnce({ state: 'generating' }).mockResolvedValueOnce({ state: 'completed' });
    await submitCourseReviewers('owner', client, [material('pptx')], vi.fn());
    expect(mocks.accept).not.toHaveBeenCalled();
    await submitCourseReviewers('owner', client, [material('pptx')], vi.fn());
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.accept).toHaveBeenCalledTimes(1);
  });
  it('stops after a failed admission while keeping the saved request recoverable', async () => {
    mocks.accept.mockRejectedValue(new Error('connection'));
    await expect(submitCourseReviewers('owner', client, [material('one'), material('two')], vi.fn())).rejects.toThrow('connection');
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
it('routes draft removal to the draft endpoint and leaves Reviewer deletion separate', () => {
  const draft = { id: 'activity:draft', type: 'activity_output' } as LibraryArtifactSummary;
  expect(libraryRemovalPath(draft)).toBe('/api/experience/activity-drafts/draft');
  expect(libraryRemovalPath({ ...draft, id: 'artifact:reviewer', type: 'reviewer' })).toBeNull();
});
