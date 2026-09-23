import { describe, expect, it, vi } from 'vitest';
import type { CanvasAssignmentRow, CanvasCourseRow, TaskRow, StudySessionRow, StudyPlanRow } from '@stay-focused/db';
import type { ProcessingJobStatusView } from '@stay-focused/shared';
import type { CanvasReviewerSourceDescriptor, CanvasReviewerSourceList } from '@/lib/canvas-reviewer-sources';
import type { CanvasCourseInventory, CanvasCourseInventoryItem } from '@/lib/canvas-course-selection';
import { composeActivities, composeToday, dayWindow, experienceCapabilities, generateCourseSyncState, generationView, learningMaterial, orderGenerateCourses, reviewerReader } from './mappers';
import { ExperienceService, assignmentResources } from './service';
import type { ExperienceRepository, ExperienceRow, ExperienceTable } from './repository';
import { ExperienceFailure, normalizeExperienceError } from './errors';

const now = Date.parse('2026-09-12T09:00:00Z');
const date = '2026-09-12';
const course = { id: 'course', user_id: 'owner', name: 'Biology', course_code: 'BIO', workflow_state: 'available', last_synced_at: date } as CanvasCourseRow;
const task = { id: 'task', user_id: 'owner', title: 'Personal work', notes: null, status: 'pending', priority: 'medium', due_at: '2026-09-12T10:00:00Z', estimated_minutes: 30, source_type: 'manual', canvas_assignment_row_id: null, created_at: '2026-09-10T00:00:00Z', updated_at: '2026-09-10T00:00:00Z' } as TaskRow;
const assignment = { id: 'assignment', user_id: 'owner', course_id: course.id, name: 'Worksheet', due_at: '2026-09-12T08:00:00Z', submission_types: ['online_upload'], description_html: '<p>Read the chapter.</p><a href="https://canvas.example/files/1">Chapter PDF</a>' } as CanvasAssignmentRow;
const descriptor: CanvasReviewerSourceDescriptor = { id: 'file:source', type: 'file', title: 'Cells.pdf', capability: 'ready', availability: 'available', unavailableReason: 'private OCR diagnostic', updatedAt: null, estimatedCharacters: 900, placement: { group: 'module', moduleTitle: 'Cells', modulePosition: 1, itemPosition: 1 }, file: { kind: 'pdf', preparationStatus: 'ready', canPrepare: false } };
const sourceList: CanvasReviewerSourceList = { courseId: course.id, courseName: course.name, courseSync: { status: 'partial', completedAt: null, lastSuccessfulSyncAt: null, latestResultWasPartial: true, synchronizedSourcesAvailable: true, failureCategories: ['private diagnostics'] }, availableSourceCount: 1, unavailableSourceCount: 0, sources: [descriptor], pagination: { limit: 100, offset: 0, returned: 1, hasMore: false, totalKnown: 1 } };
const payload = { reviewer: { title: 'Cells', metadata: { provider_id: 'private', prompt: 'private' }, sections: [{ id: 's1', title: 'Cells', plannedSectionId: 'private', items: [{ id: 'i1', title: 'Cell', sourceCore: { explanation: 'Cells contain genetic material.', keyPoints: ['Cells are living units.'], evidence: [{ kind: 'formula', text: 'a + b' }, { kind: 'table', text: '| a | b |' }] }, enrichment: { note: 'private' } }] }] }, sourceSnapshotId: 'snapshot' };
type TestData = Partial<{ [T in ExperienceTable]: readonly Partial<ExperienceRow<T>>[] }>;
function service(data: TestData = {}, materials = vi.fn(async () => ({ ok: true as const, value: sourceList }))) {
  const repository: ExperienceRepository = { async rows<T extends ExperienceTable>(table: T) { return (data[table] ?? []) as unknown as readonly ExperienceRow<T>[]; } };
  return { api: new ExperienceService({ repository, materials, now: () => now }), materials };
}
function activities(tasks: readonly TaskRow[] = [task], assignments: readonly CanvasAssignmentRow[] = [assignment]) {
  return composeActivities({ userId: 'owner', assignments, tasks, courses: [course], now, dayEnd: dayWindow(date).end });
}
const session = { id: 'session', user_id: 'owner', task_id: task.id, starts_at: '2026-09-12T08:30:00Z', ends_at: '2026-09-12T09:30:00Z', status: 'planned' } as StudySessionRow;
const plan = { id: 'plan', user_id: 'owner', planning_starts_at: '2026-09-12T00:00:00Z', planning_ends_at: '2026-09-13T00:00:00Z', created_at: '2026-09-11T00:00:00Z' } as StudyPlanRow;
const libraryData: TestData = {
  canvas_courses: [course], reviewer_source_snapshots: [{ id: 'snapshot', user_id: 'owner', course_id: course.id, source_title: 'Cells.pdf' }],
  source_versions: [{ id: 'source-version', user_id: 'owner', character_count: 100, metadata: { reviewerSourceSnapshotId: 'snapshot', sourceTitle: 'Cells.pdf' } }],
  processing_jobs: [{ id: 'job', user_id: 'owner', job_type: 'reviewer_generation', status: 'succeeded', stage: 'storing_reviewer', result_id: 'result', updated_at: date, source_metadata: { displayName: 'Cells.pdf' } }],
  processing_job_results: [{ id: 'result', user_id: 'owner', job_id: 'job', result_type: 'reviewer_generation', artifact_version_id: 'version', payload, created_at: date }],
  generated_artifacts: [{ id: 'artifact', user_id: 'owner', artifact_type: 'reviewer', safe_title: 'Cells', source_version_id: 'source-version', latest_version_id: 'version', deleted_at: null, created_at: date, updated_at: date }],
  generated_artifact_versions: [{ id: 'version', user_id: 'owner', artifact_id: 'artifact', artifact_type: 'reviewer', source_version_id: 'source-version', generation_job_id: 'job', payload }],
};
describe('Today and activity composition', () => {
  it('combines assignments, manual tasks and sessions without importing on reads', async () => {
    const { api } = service({ canvas_courses: [course], canvas_assignments: [assignment], tasks: [task], study_sessions: [session], study_plans: [plan] });
    const result = await api.getTodayOverview('owner', date);
    expect(result.urgent.map(i => i.kind)).toEqual(['canvas_activity', 'personal_task']);
    expect(result.current?.id).toBe('session:session');
    expect(result.next?.id).toBe('session:session');
    expect(result.timeline[0]?.estimatedMinutes).toBe(60);
    expect(result.overdue.map(i => i.id)).toEqual(['canvas:assignment']);
    expect(result.plannerState).toEqual({ status: 'current', lastPlannedAt: plan.created_at, needsTaskImport: true });
  });
  it('deduplicates imported Canvas tasks, retaining priority and task identity', () => {
    const imported = { ...task, canvas_assignment_row_id: assignment.id, source_type: 'canvas' as const, priority: 'high' as const };
    const result = activities([imported]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'canvas:assignment', taskId: task.id, priority: 'high', estimatedMinutes: 30 });
  });
  it('routes only deadline-bearing or submittable Canvas assignments to Tasks', () => {
    const deadlineOnly = { ...assignment, id: 'deadline-only', submission_types: [] };
    const submissionOnly = { ...assignment, id: 'submission-only', due_at: null };
    const informational = {
      ...assignment,
      id: 'informational',
      due_at: null,
      submission_types: [],
    };
    const explicitlyNotSubmittable = {
      ...assignment,
      id: 'not-submittable',
      due_at: null,
      submission_types: ['none'],
    };
    const importedInformational = {
      ...task,
      id: 'imported-informational',
      canvas_assignment_row_id: informational.id,
      source_type: 'canvas' as const,
    };

    const result = activities(
      [importedInformational],
      [deadlineOnly, submissionOnly, informational, explicitlyNotSubmittable],
    );

    expect(result.map(item => item.id)).toEqual([
      'canvas:deadline-only',
      'canvas:submission-only',
    ]);
  });
  it('orders priority, then deadline, then stable identity within urgency', () => {
    const items = activities([
      { ...task, id: 'b', priority: 'high', due_at: '2026-09-12T12:00:00Z' },
      { ...task, id: 'c', priority: 'high' }, { ...task, id: 'a', priority: 'high' }, task,
    ], []);
    expect(items.map(i => i.id)).toEqual(['task:a', 'task:c', 'task:b', 'task:task']);
  });
  it('does not call completed/submitted work overdue', () => {
    const result = composeActivities({ userId: 'owner', assignments: [assignment], tasks: [{ ...task, status: 'completed', due_at: assignment.due_at }], courses: [course], submittedAssignmentIds: new Set([assignment.id]), now, dayEnd: dayWindow(date).end });
    expect(result.every(a => !a.isOverdue && a.urgency === 'later')).toBe(true);
  });
  it('marks planner stale after a task edit and excludes other owners', () => {
    const result = composeToday({ userId: 'owner', date, offset: 0, now, activities: activities(), tasks: [{ ...task, updated_at: '2026-09-12T01:00:00Z' }], sessions: [{ ...session, user_id: 'other' }], plans: [plan] });
    expect(result.timeline).toEqual([]);
    expect(result.plannerState.status).toBe('stale');
  });
  it('reports no plan instead of inventing freshness', () => {
    expect(composeToday({ userId: 'owner', date, offset: 0, now, activities: [], tasks: [], sessions: [], plans: [{ ...plan, user_id: 'other' }] }).plannerState.status).toBe('not_planned');
  });
  it('honors timezone midnight and overlapping study sessions', () => {
    expect(dayWindow(date, 480).start).toBe(Date.parse('2026-09-11T16:00:00Z'));
    const result = composeToday({ userId: 'owner', date, offset: 480, now, activities: [], tasks: [], sessions: [{ ...session, starts_at: '2026-09-11T15:30:00Z', ends_at: '2026-09-11T16:30:00Z' }], plans: [] });
    expect(result.timeline).toHaveLength(1);
  });
  it.each(['2026-02-30', '2026-13-01', 'invalid'])('rejects invalid date %s', invalid => expect(() => dayWindow(invalid)).toThrow(ExperienceFailure));
  it('keeps skipped/completed sessions but never promotes them as next', () => {
    const result = composeToday({ userId: 'owner', date, offset: 0, now, activities: [], tasks: [], sessions: [{ ...session, status: 'skipped' }, { ...session, id: 'done', status: 'completed' }], plans: [] });
    expect(result.timeline).toHaveLength(2); expect(result.next).toBeNull(); expect(result.progress.completed).toBe(1);
  });
  it('filters task, assignment, session and plan ownership in Today', async () => {
    const { api } = service({ canvas_courses: [course], tasks: [{ ...task, user_id: 'other' }], canvas_assignments: [{ ...assignment, user_id: 'other' }], study_sessions: [{ ...session, user_id: 'other' }], study_plans: [{ ...plan, user_id: 'other' }] });
    const result = await api.getTodayOverview('owner', date);
    expect(result.urgent).toEqual([]); expect(result.timeline).toEqual([]); expect(result.plannerState.status).toBe('not_planned');
  });
});
describe('Student announcements', () => {
  const announcement = {
    id: 'announcement-row',
    user_id: 'owner',
    course_id: course.id,
    title: 'Schedule updated',
    message_html: '<p><strong>Monday</strong> class moves online.</p><ul><li>Use the course room.</li></ul><a href="https://school.example/room">Join class</a><script>unsafe()</script>',
    posted_at: '2026-09-12T08:00:00Z',
    delayed_post_at: null,
    todo_date: null,
    published: true,
    locked: false,
    author_name: 'Instructor Example',
    html_url: 'https://canvas.example/courses/1/announcements/2',
    attachments: [{ display_name: 'Updated schedule.pdf', content_type: 'application/pdf', size: 512, url: 'https://canvas.example/files/3/download' }],
  };

  it('retains course, title, body, date, author, links and attachments without raw HTML', async () => {
    const result = await service({ canvas_courses: [course], canvas_announcements: [announcement] }).api.getAnnouncements('owner');
    expect(result.items[0]).toMatchObject({
      id: 'announcement-row',
      course: { id: course.id, code: 'BIO', name: 'Biology' },
      title: 'Schedule updated',
      postedAt: '2026-09-12T08:00:00Z',
      authorName: 'Instructor Example',
      attachments: [{ label: 'Updated schedule.pdf', contentType: 'application/pdf', size: 512 }],
      links: [{ label: 'Join class', url: 'https://school.example/room' }],
    });
    expect(result.items[0]?.body).toContain('Monday class moves online.');
    expect(result.items[0]?.body).toContain('- Use the course room.');
    expect(JSON.stringify(result)).not.toMatch(/<p>|<script>|unsafe\(\)/);
  });

  it('orders newest first, tolerates missing metadata, and excludes other owners', async () => {
    const result = await service({
      canvas_courses: [course],
      canvas_announcements: [
        { ...announcement, id: 'older', posted_at: null, message_html: null, author_name: null, attachments: [] },
        { ...announcement, id: 'foreign', user_id: 'other', posted_at: '2026-09-14T08:00:00Z' },
        { ...announcement, id: 'newer', posted_at: '2026-09-13T08:00:00Z' },
      ],
    }).api.getAnnouncements('owner');
    expect(result.items.map(item => item.id)).toEqual(['newer', 'older']);
    expect(result.items[1]).toMatchObject({ body: '', preview: null, postedAt: null, authorName: null });
  });

  it('returns an intentional empty dataset', async () => {
    await expect(service({ canvas_courses: [course] }).api.getAnnouncements('owner')).resolves.toEqual({ items: [], nextOffset: null });
  });

  it('drops unsafe URLs and credential-like query parameters', async () => {
    const result = await service({
      canvas_courses: [course],
      canvas_announcements: [{ ...announcement, html_url: 'javascript:alert(1)', message_html: '<a href="https://school.example/?access_token=secret">bad</a>', attachments: [{ display_name: 'Bad', url: 'https://u:p@school.example/file' }] }],
    }).api.getAnnouncements('owner');
    expect(result.items[0]).toMatchObject({ htmlUrl: null, links: [], attachments: [] });
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
describe('Learn and Activity details', () => {
  it.each(['ready', 'needs_preparation', 'empty', 'unsupported', 'inaccessible', 'failed'] as const)('maps material %s without diagnostics', capability => {
    const mapped = learningMaterial({ ...descriptor, capability, availability: capability === 'ready' ? 'available' : 'unavailable' }, course.id);
    expect(mapped.generation.reviewer.status).toBe(capability === 'ready' ? 'available' : 'unavailable');
    expect(mapped.readiness).toBe(['failed', 'inaccessible'].includes(capability) ? 'unavailable' : capability);
    expect(JSON.stringify(mapped)).not.toMatch(/diagnostic|estimatedCharacters|preparationStatus|capability|fingerprint/i);
  });
  it('maps unsupported slides and suppresses generation for unavailable ready descriptors', () => {
    expect(learningMaterial({ ...descriptor, title: 'Cells.pptx', capability: 'unsupported', file: { kind: 'unsupported', preparationStatus: 'unsupported', canPrepare: false } }, course.id).kind).toBe('slides');
    expect(learningMaterial({ ...descriptor, availability: 'unavailable' }, course.id).generation.reviewer.status).toBe('unavailable');
  });
  it('maps a course workspace and pagination', async () => {
    const { api } = service({ canvas_courses: [course] });
    const result = await api.getCourseLearningWorkspace('owner', course.id);
    expect(result.course.materialCount).toBe(1); expect(result.materials.items[0]?.kind).toBe('pdf');
    expect(result.materials.items[0]).toMatchObject({ reviewerArtifactId: null, generation: { quiz: { status: 'unavailable' } } });
    expect(JSON.stringify(result)).not.toContain('failureCategories');
  });
  it('enables Quiz only through the latest persisted Reviewer relationship', async () => {
    const { api } = service({
      canvas_courses: [course],
      reviewer_source_snapshots: [{ id: 'snapshot', user_id: 'owner', course_id: course.id }],
      reviewer_source_snapshot_items: [{ id: 'item', user_id: 'owner', course_id: course.id, source_snapshot_id: 'snapshot', source_type: 'file', source_row_id: 'source' }],
      source_versions: [{ id: 'source-version', user_id: 'owner', metadata: { reviewerSourceSnapshotId: 'snapshot' } }],
      generated_artifacts: [{ id: 'artifact', user_id: 'owner', artifact_type: 'reviewer', latest_version_id: 'version', deleted_at: null, updated_at: date }],
      generated_artifact_versions: [{ id: 'version', user_id: 'owner', artifact_id: 'artifact', artifact_type: 'reviewer', source_version_id: 'source-version' }],
    });
    const material = (await api.getCourseLearningWorkspace('owner', course.id)).materials.items[0];
    expect(material).toMatchObject({ reviewerArtifactId: 'artifact', generation: { reviewer: { status: 'available' }, quiz: { status: 'available' } } });
  });
  it('denies another owner course before invoking materials', async () => {
    const { api, materials } = service({ canvas_courses: [{ ...course, user_id: 'other' }] });
    await expect(api.getCourseLearningWorkspace('owner', course.id)).rejects.toMatchObject({ status: 404 });
    expect(materials).not.toHaveBeenCalled();
  });
  it('exposes instructions, linked resources and course materials for Activity Maker', async () => {
    const { api } = service({ canvas_courses: [course], canvas_assignments: [assignment] });
    const detail = await api.getActivityDetail('owner', 'canvas:assignment');
    expect(detail.instructions).toContain('Read the chapter.');
    expect(detail.resources[0]?.url).toBe('https://canvas.example/files/1');
    expect(detail.courseMaterials?.items).toHaveLength(1);
    expect(detail.generation.activityAssistance.status).toBe('available'); expect(detail.outputs).toEqual([]);
  });
  it('denies another owner activity in list and detail', async () => {
    const { api } = service({ canvas_courses: [course], canvas_assignments: [{ ...assignment, user_id: 'other' }], tasks: [{ ...task, user_id: 'other' }] });
    expect(await api.getActivityList('owner')).toEqual([]);
    await expect(api.getActivityDetail('owner', 'canvas:assignment')).rejects.toMatchObject({ status: 404 });
    await expect(api.getActivityDetail('owner', 'task:task')).rejects.toMatchObject({ status: 404 });
  });
  it('rejects unsafe resource URLs and never exposes tokens', () => {
    expect(assignmentResources('<a href="javascript:alert(1)">x</a><a href="https://site.example/f?access_token=secret">secret</a><a href="https://u:p@site.example">bad</a>')).toEqual([]);
  });
});
describe('Library ownership and persisted output', () => {
  it('opens the persisted durable artifact without calling materials/generation', async () => {
    const { api, materials } = service(libraryData);
    const library = await api.getLibrary('owner');
    expect(library.items[0]).toMatchObject({ id: 'artifact:artifact', course: { id: course.id }, sourceId: 'snapshot' });
    const open = await api.getLibraryArtifact('owner', 'generation:job');
    if (!('reviewer' in open)) throw new Error('Expected reviewer');
    expect(open.reviewer.sections[0]?.blocks[0]?.evidence).toHaveLength(2);
    expect(JSON.stringify(open)).not.toMatch(/sourceCore|plannedSectionId|metadata|prompt|provider_id|enrichment/);
    expect(materials).not.toHaveBeenCalled();
    expect((await api.getGeneration('owner', 'job')).artifactId).toBe('artifact:artifact');
  });
  it('opens one canonical artifact through both artifact and generation identities', async () => {
    const { api } = service(libraryData);
    expect((await api.getLibrary('owner')).items.map(i => i.id)).toEqual(['artifact:artifact']);
    for (const id of ['artifact:artifact', 'generation:job']) { const opened=await api.getLibraryArtifact('owner', id); if (!('reviewer' in opened)) throw new Error('Expected reviewer'); expect(opened.reviewer.title).toBe('Cells'); }
  });
  it('does not expose deleted artifacts', async () => {
    const { api } = service({ ...libraryData, generated_artifacts: [{ ...libraryData.generated_artifacts![0], deleted_at: date }] });
    expect((await api.getLibrary('owner')).items).toEqual([]);
    await expect(api.getLibraryArtifact('owner', 'generation:job')).rejects.toMatchObject({ status: 404 });
  });
  it.each(['cancelled', 'cancellation_requested', 'failed', 'running'] as const)('never publishes persisted result for %s job', async status => {
    const { api } = service({ ...libraryData, processing_jobs: [{ ...libraryData.processing_jobs![0], status }], generated_artifacts: [] });
    expect((await api.getLibrary('owner')).items).toEqual([]);
  });
  it.each(['source_versions', 'generated_artifacts', 'generated_artifact_versions'] as const)('denies foreign %s at artifact boundary', async table => {
    const data = { ...libraryData, [table]: (libraryData[table] ?? [{ id: 'saved', title: 'private' }]).map(r => ({ ...r, user_id: 'other' })) };
    const { api } = service(data);
    expect((await api.getLibrary('owner')).items).toEqual([]);
    await expect(api.getLibraryArtifact('owner', 'generation:job')).rejects.toMatchObject({ status: 404 });
  });
  it('denies foreign generation state', async () => {
    const { api } = service(libraryData);
    await expect(api.getGeneration('other', 'job')).rejects.toMatchObject({ status: 404 });
    expect((await api.getLibrary('other')).items).toEqual([]);
  });
  it('returns supported empty categories with explicit missing capability', async () => {
    const { api } = service(libraryData);
    for (const type of ['quiz', 'activity_output'] as const) {
      const result = await api.getLibrary('owner', { type });
      expect(result.items).toEqual([]); expect(result.categories[type].status).toBe('available');
    }
    expect(experienceCapabilities().calendar.status).toBe('unavailable');
  });
  it('rejects malformed persisted reader data', async () => {
    const summary = (await service(libraryData).api.getLibrary('owner')).items[0]!;
    expect(() => reviewerReader({ reviewer: { sections: [{ items: [{}] }] } }, summary)).toThrow(ExperienceFailure);
  });
});
describe('lifecycle and errors', () => {
  it.each([
    ['queued', 'preparing_source', 'queued'], ['running', 'normalizing_source', 'preparing'], ['running', 'generating_sections', 'generating'], ['running', 'retrying_sections', 'generating'],
    ['running', 'storing_reviewer', 'finalizing'], ['succeeded', 'storing_reviewer', 'completed'], ['failed', 'generating_sections', 'failed'], ['expired', 'generating_sections', 'failed'], ['cancelled', 'generating_sections', 'cancelled'], ['cancellation_requested', 'generating_sections', 'cancelling'],
  ] as const)('maps %s/%s to %s', (status, stage, expected) => {
    const view = generationView({ id: 'job', status, stage, updatedAt: date, progress: { completedUnits: null, totalUnits: null, unitLabel: null, message: 'private' } } as ProcessingJobStatusView, 'artifact:artifact');
    expect(view.state).toBe(expected); expect(view.progress).toBeNull();
    expect(view.artifactId).toBe(expected === 'completed' ? 'artifact:artifact' : null);
    expect(JSON.stringify(view)).not.toContain('private');
  });
  it('reports genuine unit progress and rejects impossible progress', () => {
    const job = { id: 'job', status: 'running', stage: 'generating_sections', updatedAt: date, progress: { completedUnits: 2, totalUnits: 5, unitLabel: 'sections', message: 'private' } } as ProcessingJobStatusView;
    expect(generationView(job, null).progress).toEqual({ completed: 2, total: 5, unit: 'sections' });
    expect(generationView({ ...job, progress: { ...job.progress, completedUnits: 7 } }, null).progress).toBeNull();
  });
  it('normalizes raw errors without provider/postgres/OCR details', () => {
    const normalized = normalizeExperienceError(new Error('postgres secret token OCR stack trace'));
    expect(normalized.status).toBe(503); expect(normalized.error.retryable).toBe(true);
    expect(JSON.stringify(normalized)).not.toMatch(/postgres|secret|token|OCR|stack/);
  });
});

const synced = { status: 'success', startedAt: null, completedAt: '2026-09-20T00:00:00Z', lastCheckedAt: null, lastSuccessfulSyncAt: '2026-09-20T00:00:00Z', failureCode: null } as const;
function inventoryItem(id: string, overrides: Partial<CanvasCourseInventoryItem> = {}): CanvasCourseInventoryItem {
  return { id, displayName: id, courseCode: id, workflowState: 'available', startAt: null, endAt: null, term: null, classification: 'likely_current', selectable: true, unavailableReason: null, selected: true, lastSync: synced, ...overrides };
}
function inventory(courses: readonly CanvasCourseInventoryItem[]) {
  return { ok: true as const, value: { courses, classificationSource: 'canvas' as const, selectedCourseIds: [], counts: { total: 0, likelyCurrent: 0, pastOrConcluded: 0, otherOrUncertain: 0, unavailable: 0 }, connection: {} as CanvasCourseInventory['connection'] } };
}
describe('Generate course sync state and ordering', () => {
  it('routes only selected, completed synchronization as synced', () => {
    expect(generateCourseSyncState({ selected: true, lastSync: synced })).toBe('synced');
    expect(generateCourseSyncState({ selected: true, lastSync: { ...synced, status: 'partial' } })).toBe('synced');
    expect(generateCourseSyncState({ selected: false, lastSync: synced })).toBe('not_synced');
    expect(generateCourseSyncState({ selected: false, lastSync: null })).toBe('not_synced');
    expect(generateCourseSyncState({ selected: true, lastSync: null })).toBe('not_synced');
    expect(generateCourseSyncState({ selected: true, lastSync: { ...synced, status: 'failed', failureCode: 'canvas_unavailable' } })).toBe('sync_incomplete');
    expect(generateCourseSyncState({ selected: true, lastSync: { ...synced, status: 'running', completedAt: null } })).toBe('sync_incomplete');
    expect(generateCourseSyncState({ selected: true, lastSync: { ...synced, completedAt: null, lastCheckedAt: null } })).toBe('sync_incomplete');
  });
  it('orders current before previous, keeps previous courses, and is independent of input order', () => {
    const term = (endAt: string) => ({ id: endAt, name: endAt.slice(0, 7), startAt: null, endAt });
    const courses = [
      inventoryItem('old-previous', { classification: 'past_or_concluded', term: term('2023-01-01T00:00:00Z') }),
      inventoryItem('uncertain', { classification: 'other_or_uncertain' }),
      inventoryItem('current-unsynced', { selected: false, lastSync: null }),
      inventoryItem('recent-previous', { classification: 'past_or_concluded', term: term('2026-03-01T00:00:00Z') }),
      inventoryItem('current-synced'),
      inventoryItem('undated-previous', { classification: 'past_or_concluded' }),
      inventoryItem('previous-failed', { classification: 'past_or_concluded', lastSync: { ...synced, status: 'failed' } }),
    ];
    const expected = ['current-synced', 'current-unsynced', 'recent-previous', 'old-previous', 'undated-previous', 'previous-failed', 'uncertain'];
    expect(orderGenerateCourses(courses).map(c => c.id)).toEqual(expected);
    expect(orderGenerateCourses([...courses].reverse()).map(c => c.id)).toEqual(expected);
    expect(orderGenerateCourses(courses).map(c => [c.period, c.syncState])).toContainEqual(['previous', 'synced']);
  });
  it('breaks ties by course code/name then id, and tolerates missing term metadata', () => {
    const tied = [inventoryItem('b', { displayName: 'Same' }), inventoryItem('a', { displayName: 'Same' }), inventoryItem('c', { displayName: 'Alpha', term: { id: null, name: null, startAt: null, endAt: null } })];
    expect(orderGenerateCourses(tied).map(c => c.id)).toEqual(['c', 'a', 'b']);
    expect(orderGenerateCourses(tied)[0]).toMatchObject({ termName: null, lastSuccessfulSyncAt: synced.lastSuccessfulSyncAt });
  });
  it('lists Generate courses through the bound course inventory and never reads materials', async () => {
    const courseInventory = vi.fn(async () => inventory([inventoryItem('previous', { classification: 'past_or_concluded' }), inventoryItem('current', { selected: false, lastSync: null })]));
    const materials = vi.fn();
    const api = new ExperienceService({ repository: { rows: async () => [] }, materials, courseInventory });
    const result = await api.getGenerateCourses('owner');
    expect(result.items.map(c => [c.id, c.period, c.syncState])).toEqual([['current', 'current', 'not_synced'], ['previous', 'previous', 'synced']]);
    expect(courseInventory).toHaveBeenCalledWith('owner'); expect(materials).not.toHaveBeenCalled();
  });
  it('keeps an assignment detail usable when its course is no longer selected for sync', async () => {
    const data: TestData = { canvas_courses: [course], canvas_assignments: [assignment] };
    const repository: ExperienceRepository = { async rows<T extends ExperienceTable>(table: T) { return (data[table] ?? []) as unknown as readonly ExperienceRow<T>[]; } };
    const api = new ExperienceService({ repository, now: () => now, materials: async () => ({ ok: false, status: 400, code: 'canvas_course_not_selected', message: 'Select this course.' }) });
    const detail = await api.getActivityDetail('owner', 'canvas:assignment');
    expect(detail.courseMaterials).toBeNull();
  });
});
