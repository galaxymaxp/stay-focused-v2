/** Synthetic contract fixtures only. No production identities or private content. */
import type { ActivitySummary, CourseLearningWorkspace, CourseSummary, GenerationView, LibraryArtifactSummary, LibraryOverview, ReviewerReaderModel, TodayOverview } from './experience';
const unavailable = { status: 'unavailable', reasonCode: 'not_implemented' } as const;
export const fixtureCapabilities = { reviewerGeneration: { status: 'available' }, quizGeneration: {status:'available'}, activityMaker: {status:'available'}, planner: { status: 'available' }, calendar: unavailable } as const;
export const fixtureCourses: readonly CourseSummary[] = [
  { id: 'course-a', name: 'Biology', code: 'BIO101', status: 'available', materialCount: 2, reviewerCount: 1, lastActivityAt: null },
  { id: 'course-b', name: 'Mathematics', code: 'MATH101', status: 'available', materialCount: null, reviewerCount: null, lastActivityAt: null },
];
export const fixtureWorkspace: CourseLearningWorkspace = {
  course: fixtureCourses[0]!, capabilities: fixtureCapabilities,
  materials: { totalKnown: 2, nextOffset: null, items: [
    { id: 'file:example', sourceId: 'file:example', courseId: 'course-a', title: 'Cells.pdf', kind: 'pdf', readiness: 'ready', count: null, moduleTitle: 'Cells', generation: { reviewer: { status: 'available' }, quiz: { status: 'available' }, activityAssistance: unavailable } },
    { id: 'file:slides', sourceId: 'file:slides', courseId: 'course-a', title: 'Cells.pptx', kind: 'slides', readiness: 'unsupported', count: null, moduleTitle: 'Cells', generation: { reviewer: { status: 'unavailable', reasonCode: 'unsupported_material' }, quiz: { status: 'unavailable', reasonCode: 'unsupported_material' }, activityAssistance: unavailable } },
  ] },
};
export const fixtureActivity: ActivitySummary = { id: 'canvas:activity', taskId: null, title: 'Cell worksheet', course: fixtureCourses[0]!, dueAt: '2026-09-12T15:00:00Z', status: 'unknown', priority: 'high', estimatedMinutes: null, submissionTypes: ['online_upload'], source: 'canvas', isOverdue: false, urgency: 'now', hasGeneratedDraft: false };
export const fixtureOverdueActivity: ActivitySummary = { ...fixtureActivity, id: 'canvas:overdue', dueAt: '2026-09-11T15:00:00Z', isOverdue: true };
export const fixtureArtifact: LibraryArtifactSummary = { id: 'reviewer:example', type: 'reviewer', title: 'Cells', course: fixtureCourses[0]!, sourceId: 'file:example', sourceTitle: 'Cells.pdf', activityId: null, createdAt: '2026-09-12T09:00:00Z', updatedAt: '2026-09-12T09:00:00Z', lastOpenedAt: null, status: 'completed', relatedArtifactIds: [] };
export const fixtureLibrary: LibraryOverview = { items: [fixtureArtifact], categories: { reviewer: { status: 'available' }, quiz: { status: 'available' }, activity_output: unavailable }, nextOffset: null };
export const fixtureEmptyLibrary: LibraryOverview = { ...fixtureLibrary, items: [] };
export const fixtureGenerating: GenerationView = { id: 'generation-example', state: 'generating', updatedAt: '2026-09-12T09:00:00Z', progress: { completed: 2, total: 5, unit: 'sections' }, artifactId: null, error: null };
export const fixtureCompleted: GenerationView = { ...fixtureGenerating, state: 'completed', artifactId: fixtureArtifact.id, progress: null };
export const fixtureReader: ReviewerReaderModel = { id: fixtureArtifact.id, title: 'Cells', course: fixtureCourses[0]!, source: { id: 'file:example', title: 'Cells.pdf' }, generatedAt: fixtureArtifact.createdAt, freshness: 'unknown', sections: [{ id: 'section-1', title: 'Cells', blocks: [{ id: 'block-1', title: 'Cell structure', explanation: 'Cells are the basic units of life.', keyPoints: ['Cells contain genetic material.'], evidence: [] }] }] };
const urgent = { id: fixtureActivity.id, kind: 'canvas_activity', title: fixtureActivity.title, course: fixtureActivity.course, startAt: null, endAt: null, dueAt: fixtureActivity.dueAt, estimatedMinutes: null, priority: 'high', status: 'unknown', source: 'canvas', deepLinkTarget: { surface: 'activity', id: fixtureActivity.id } } as const;
const session = { ...urgent, id: 'session:example', kind: 'study_session', startAt: '2026-09-12T10:00:00Z', endAt: '2026-09-12T11:00:00Z', estimatedMinutes: 60, status: 'planned', deepLinkTarget: { surface: 'study_session', id: 'example' } } as const;
export const fixtureToday: TodayOverview = { date: '2026-09-12', utcOffsetMinutes: 0, asOf: '2026-09-12T09:00:00Z', progress: { completed: 0, total: 2, scheduledMinutes: 60 }, urgent: [urgent], current: null, next: session, later: [urgent], overdue: [], upcomingDeadlines: [], timeline: [session], plannerState: { status: 'current', lastPlannedAt: '2026-09-12T08:00:00Z', needsTaskImport: true } };
