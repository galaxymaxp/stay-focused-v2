import type { CanvasAssignmentRow, CanvasCourseRow, TaskRow, StudySessionRow, StudyPlanRow } from '@stay-focused/db';
import type { ActivitySummary, CourseSummary, ExperienceCapabilities, FeatureCapability, GenerationCapability, GenerationView, LearningMaterial, LibraryArtifactSummary, ProcessingJobStatusView, ReviewerReaderModel, TodayItem, TodayOverview } from '@stay-focused/shared';
import type { CanvasReviewerSourceDescriptor } from '@/lib/canvas-reviewer-sources';
import { ExperienceFailure, normalizeExperienceError } from './errors';

const available: FeatureCapability = { status: 'available' };
const missing: FeatureCapability = { status: 'unavailable', reasonCode: 'not_implemented' };
export function experienceCapabilities(): ExperienceCapabilities {
  return { fileIngestion: {pdf:available,scanned_pdf:available,image:available,docx:available,pptx:available,doc:{status:'unavailable',reasonCode:'unsupported_material'},ppt:{status:'unavailable',reasonCode:'unsupported_material'},text:available,canvas_text:available}, reviewerGeneration: available, quizGeneration: available, activityMaker: available, planner: available, calendar: missing };
}
export function generationCapability(ready: boolean, unsupported = false, quizReady = false): GenerationCapability {
  return { reviewer: ready ? available : { status: 'unavailable', reasonCode: unsupported ? 'unsupported_material' : 'source_not_ready' }, quiz: quizReady ? available : { status: 'unavailable', reasonCode: unsupported ? 'unsupported_material' : 'source_not_ready' }, activityAssistance: missing };
}
export function courseSummary(row: CanvasCourseRow): CourseSummary {
  return { id: row.id, code: row.course_code, name: row.name, status: row.workflow_state, materialCount: null, reviewerCount: null, lastActivityAt: row.last_synced_at };
}
export function learningMaterial(row: CanvasReviewerSourceDescriptor, courseId: string, reviewerId: string | null = null): LearningMaterial {
  // Legacy availability means usable right now, so it is also unavailable for
  // preparable, empty and unsupported materials. Preserve those useful states.
  const readiness = row.capability === 'failed' || row.capability === 'inaccessible' || (row.capability === 'ready' && row.availability !== 'available') ? 'unavailable' : row.capability;
  const kind = row.file?.kind === 'docx' ? 'document' : row.file?.kind === 'pptx' ? 'slides' : row.type !== 'file' ? row.type : row.file?.kind === 'unsupported'
    ? /\.pptx?$/i.test(row.title) ? 'slides' : 'document' : row.file?.kind ?? 'document';
  return { id: row.id, courseId, title: row.title, kind, readiness, count: null, sourceId: row.id, reviewerId,
    moduleTitle: row.placement.moduleTitle, generation: generationCapability(readiness === 'ready', readiness === 'unsupported', reviewerId !== null) };
}
export function dayWindow(date: string, offset = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(offset) || offset < -720 || offset > 840) throw new ExperienceFailure(400, 'invalid_request');
  const utc = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 10) !== date) throw new ExperienceFailure(400, 'invalid_request');
  const start = utc - offset * 60_000;
  return { start, end: start + 86_400_000 };
}
const rank = { high: 0, medium: 1, low: 2 };
export function compareActivities(a: ActivitySummary, b: ActivitySummary): number {
  const urgency = { now: 0, next: 1, later: 2 };
  return Number(a.status === 'completed' || a.status === 'submitted') - Number(b.status === 'completed' || b.status === 'submitted') ||
    urgency[a.urgency] - urgency[b.urgency] || Number(b.isOverdue) - Number(a.isOverdue) ||
    rank[a.priority] - rank[b.priority] || (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity) || a.id.localeCompare(b.id);
}
export function composeActivities(input: {
  userId: string; assignments: readonly CanvasAssignmentRow[]; tasks: readonly TaskRow[];
  courses: readonly CanvasCourseRow[]; submittedAssignmentIds?: ReadonlySet<string>; now: number; dayEnd: number;
}): ActivitySummary[] {
  const courses = new Map(input.courses.filter(r => r.user_id === input.userId).map(r => [r.id, courseSummary(r)]));
  const tasks = input.tasks.filter(r => r.user_id === input.userId);
  const imported = new Map(tasks.filter(t => t.canvas_assignment_row_id).map(t => [t.canvas_assignment_row_id!, t]));
  const ownedAssignments = input.assignments.filter(r => r.user_id === input.userId && courses.has(r.course_id));
  const assignments = ownedAssignments.filter(isActionableCanvasAssignment);
  function finish(item: Omit<ActivitySummary, 'isOverdue' | 'urgency' | 'hasGeneratedDraft'>): ActivitySummary {
    const active = item.status !== 'completed' && item.status !== 'submitted';
    const due = item.dueAt ? Date.parse(item.dueAt) : Infinity;
    return { ...item, isOverdue: active && due < input.now, urgency: !active ? 'later' : due < input.dayEnd || item.priority === 'high' ? 'now' : due < input.dayEnd + 7 * 86_400_000 ? 'next' : 'later', hasGeneratedDraft: false };
  }
  const result = assignments.map(row => {
    const task = imported.get(row.id);
    const course = courses.get(row.course_id)!;
    return finish({ id: `canvas:${row.id}`, taskId: task?.id ?? null, course: { id: course.id, code: course.code, name: course.name },
      title: row.name, dueAt: row.due_at, status: task?.status === 'completed' ? 'completed' : input.submittedAssignmentIds?.has(row.id) ? 'submitted' : task?.status ?? 'unknown',
      priority: task?.priority ?? 'medium', estimatedMinutes: task?.estimated_minutes ?? null, submissionTypes: [...row.submission_types], source: 'canvas' });
  });
  const assignmentIds = new Set(ownedAssignments.map(a => a.id));
  for (const task of tasks) {
    if (task.canvas_assignment_row_id && assignmentIds.has(task.canvas_assignment_row_id)) continue;
    result.push(finish({ id: `task:${task.id}`, taskId: task.id, course: null, title: task.title, dueAt: task.due_at, status: task.status, priority: task.priority, estimatedMinutes: task.estimated_minutes, submissionTypes: [], source: task.source_type === 'canvas' ? 'canvas' : 'local' }));
  }
  return result.sort(compareActivities);
}

function isActionableCanvasAssignment(assignment: CanvasAssignmentRow): boolean {
  if (assignment.due_at !== null) return true;
  return assignment.submission_types.some(type => {
    const normalized = type.trim().toLowerCase();
    return normalized !== '' && normalized !== 'none' && normalized !== 'not_graded';
  });
}
export function composeToday(input: {
  userId: string; date: string; offset: number; now: number; activities: readonly ActivitySummary[];
  tasks: readonly TaskRow[]; sessions: readonly StudySessionRow[]; plans: readonly StudyPlanRow[];
}): TodayOverview {
  const { start, end } = dayWindow(input.date, input.offset);
  const asOf = input.now;
  const tasks = input.tasks.filter(t => t.user_id === input.userId);
  const byTask = new Map(input.activities.filter(a => a.taskId).map(a => [a.taskId!, a]));
  const activityItems: TodayItem[] = input.activities.map(a => ({ id: a.id, kind: a.source === 'canvas' ? 'canvas_activity' : 'personal_task', title: a.title, course: a.course, startAt: null, endAt: null, dueAt: a.dueAt, estimatedMinutes: a.estimatedMinutes, priority: a.priority, status: a.status, source: a.source, deepLinkTarget: { surface: 'activity', id: a.id } }));
  const timeline: TodayItem[] = input.sessions.filter(s => s.user_id === input.userId && Date.parse(s.starts_at) < end && Date.parse(s.ends_at) > start).map((s): TodayItem => {
    const task = tasks.find(t => t.id === s.task_id);
    const activity = byTask.get(s.task_id);
    return { id: `session:${s.id}`, kind: 'study_session', title: activity?.title ?? task?.title ?? 'Study session', course: activity?.course ?? null, startAt: s.starts_at, endAt: s.ends_at, dueAt: activity?.dueAt ?? task?.due_at ?? null,
      estimatedMinutes: Math.round((Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60_000), priority: task?.priority ?? 'medium', status: s.status, source: activity?.source ?? 'local', deepLinkTarget: { surface: 'study_session', id: s.id } };
  }).sort((a, b) => Date.parse(a.startAt!) - Date.parse(b.startAt!) || a.id.localeCompare(b.id));
  const active = (item: TodayItem) => !['completed', 'submitted', 'skipped'].includes(item.status);
  const todayTasks = activityItems.filter(i => i.dueAt && Date.parse(i.dueAt) >= start && Date.parse(i.dueAt) < end);
  const urgent = activityItems.filter((i, n) => active(i) && input.activities[n]!.urgency === 'now');
  const current = timeline.find(i => active(i) && Date.parse(i.startAt!) <= asOf && Date.parse(i.endAt!) > asOf) ?? null;
  const next = current ?? timeline.find(i => active(i) && Date.parse(i.startAt!) > Math.max(start - 1, asOf)) ?? urgent[0] ?? todayTasks.find(active) ?? null;
  const plans = input.plans.filter(p => p.user_id === input.userId && Date.parse(p.planning_starts_at) < end && Date.parse(p.planning_ends_at) > start)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id));
  const latest = plans[0];
  const stale = latest && (Date.parse(latest.planning_ends_at) < end || tasks.some(t => Date.parse(t.updated_at) > Date.parse(latest.created_at)));
  const progressItems = [...todayTasks, ...timeline];
  return { date: input.date, utcOffsetMinutes: input.offset, asOf: new Date(asOf).toISOString(),
    progress: { completed: progressItems.filter(i => i.status === 'completed' || i.status === 'submitted').length, total: progressItems.length, scheduledMinutes: timeline.filter(i => i.status !== 'skipped').reduce((sum, i) => sum + (i.estimatedMinutes ?? 0), 0) },
    urgent, current, next, later: [...timeline.filter(i => active(i) && Date.parse(i.startAt!) > asOf), ...todayTasks.filter(active)].filter(i => i.id !== next?.id),
    overdue: activityItems.filter(i => active(i) && i.dueAt && Date.parse(i.dueAt) < Math.min(end, asOf)),
    upcomingDeadlines: activityItems.filter(i => active(i) && i.dueAt && Date.parse(i.dueAt) >= end).sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!) || a.id.localeCompare(b.id)),
    timeline, plannerState: { status: !latest ? 'not_planned' : stale ? 'stale' : 'current', lastPlannedAt: latest?.created_at ?? null, needsTaskImport: input.activities.some(a => a.source === 'canvas' && !a.taskId && !['completed', 'submitted'].includes(a.status)) } };
}
export function generationView(job: ProcessingJobStatusView, artifactId: string | null): GenerationView {
  const state = job.status === 'queued' ? 'queued' : job.status === 'succeeded' ? artifactId ? 'completed' : 'finalizing' :
    job.status === 'cancellation_requested' ? 'cancelling' : job.status === 'cancelled' ? 'cancelled' :
      job.status === 'failed' || job.status === 'expired' ? 'failed' :
        ['preparing_source', 'normalizing_source', 'detecting_outline', 'planning_sections'].includes(job.stage) ? 'preparing' :
          ['assembling_reviewer', 'storing_reviewer'].includes(job.stage) ? 'finalizing' : 'generating';
  const p = job.progress;
  const progress = p.completedUnits != null && p.totalUnits != null && p.unitLabel && Number.isInteger(p.completedUnits) && Number.isInteger(p.totalUnits) && p.totalUnits > 0 && p.completedUnits >= 0 && p.completedUnits <= p.totalUnits
    ? { completed: p.completedUnits, total: p.totalUnits, unit: p.unitLabel } : null;
  return { id: job.id, state, updatedAt: job.updatedAt, progress, artifactId: state === 'completed' ? artifactId : null,
    error: state === 'failed' ? normalizeExperienceError(new ExperienceFailure(422, 'generation_failed')).error : null };
}
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function text(value: unknown): string | null { return typeof value === 'string' ? value : null; }
export function reviewerReader(payload: unknown, summary: LibraryArtifactSummary, freshness: ReviewerReaderModel['freshness'] = 'unknown'): ReviewerReaderModel {
  const root = record(payload);
  const reviewer = 'reviewer' in root ? record(root.reviewer) : root;
  if (!Array.isArray(reviewer.sections)) throw new ExperienceFailure(503, 'unavailable');
  const sections = reviewer.sections.map((value: unknown) => {
    const section = record(value);
    if (!Array.isArray(section.items) || typeof section.title !== 'string' || typeof section.id !== 'string') throw new ExperienceFailure(503, 'unavailable');
    return { id: section.id, title: section.title, blocks: section.items.map((value: unknown) => {
      const item = record(value); const core = record(item.sourceCore);
      if (typeof item.id !== 'string' || typeof item.title !== 'string' || typeof core.explanation !== 'string' || !Array.isArray(core.keyPoints) || !core.keyPoints.every(p => typeof p === 'string')) throw new ExperienceFailure(503, 'unavailable');
      const evidence: ReviewerReaderModel['sections'][number]['blocks'][number]['evidence'] = Array.isArray(core.evidence) ? core.evidence.map((value: unknown) => {
        const e = record(value);
        if (!['code', 'formula', 'table', 'result', 'example', 'source'].includes(String(e.kind)) || typeof e.text !== 'string') throw new ExperienceFailure(503, 'unavailable');
        return { kind: e.kind as 'code' | 'formula' | 'table' | 'result' | 'example' | 'source', text: e.text };
      }) : [];
      return { id: item.id, title: item.title, explanation: core.explanation, keyPoints: core.keyPoints as string[], evidence };
    }) };
  });
  return { id: summary.id, title: summary.title, course: summary.course, source: { id: summary.sourceId, title: summary.sourceTitle }, generatedAt: summary.createdAt, freshness, sections };
}
