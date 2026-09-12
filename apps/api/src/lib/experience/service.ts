import type { ActivityDetail, ActivitySummary, CourseLearningWorkspace, CourseMaterials, CourseSummary, GenerationView, LibraryArtifactSummary, LibraryArtifactType, LibraryOverview, ReviewerReaderModel, TodayOverview } from '@stay-focused/shared';
import type { CanvasReviewerSourceList, CanvasReviewerSourceResult } from '@/lib/canvas-reviewer-sources';
import { normalizeCanvasHtmlToText } from '@/lib/canvas-content-normalization';
import { toProcessingJobStatusView } from '@/lib/processing-jobs/repository';
import type { ExperienceRepository } from './repository';
import { ExperienceFailure, requireFound } from './errors';
import { composeActivities, composeToday, courseSummary, dayWindow, experienceCapabilities, generationCapability, generationView, learningMaterial, record, reviewerReader, text } from './mappers';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

export interface ExperienceDependencies {
  readonly repository: ExperienceRepository;
  readonly materials: (userId: string, courseId: string, offset: number) => Promise<CanvasReviewerSourceResult<CanvasReviewerSourceList>>;
  readonly freshness?: (userId: string, reviewerId: string) => Promise<ReviewerReaderModel['freshness']>;
  readonly now?: () => number;
}
interface ArtifactRecord { readonly summary: LibraryArtifactSummary; readonly payload: unknown; readonly reviewerId: string | null; readonly aliases: readonly string[] }
export class ExperienceService {
  constructor(private readonly dependencies: ExperienceDependencies) {}
  private get now() { return this.dependencies.now?.() ?? Date.now(); }
  private rows<T extends Parameters<ExperienceRepository['rows']>[0]>(table: T, userId: string) {
    // Defense in depth for alternate repository adapters and joined records.
    return this.dependencies.repository.rows(table, userId).then(rows => rows.filter(row => row.user_id === userId));
  }
  async getCourses(userId: string): Promise<readonly CourseSummary[]> {
    return (await this.rows('canvas_courses', userId)).map(courseSummary).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }
  async getCourseMaterials(userId: string, courseId: string, offset = 0): Promise<CourseMaterials> {
    requireFound((await this.rows('canvas_courses', userId)).find(c => c.id === courseId));
    const result = await this.dependencies.materials(userId, courseId, offset);
    if (!result.ok) throw new ExperienceFailure(result.status === 404 ? 404 : 503, result.status === 404 ? 'not_found' : 'unavailable');
    return { items: result.value.sources.map(row => learningMaterial(row, courseId)), totalKnown: result.value.pagination.totalKnown,
      nextOffset: result.value.pagination.hasMore ? result.value.pagination.offset + result.value.pagination.returned : null };
  }
  async getCourseLearningWorkspace(userId: string, courseId: string): Promise<CourseLearningWorkspace> {
    const course = requireFound((await this.getCourses(userId)).find(c => c.id === courseId));
    const materials = await this.getCourseMaterials(userId, courseId);
    return { course: { ...course, materialCount: materials.totalKnown }, materials, capabilities: experienceCapabilities() };
  }
  private async activityContext(userId: string, date?: string, offset = 0) {
    const now = this.now;
    const requestedDate = date ?? new Date(now + offset * 60_000).toISOString().slice(0, 10);
    const { end } = dayWindow(requestedDate, offset);
    const [assignments, tasks, courses, submissions] = await Promise.all([
      this.rows('canvas_assignments', userId), this.rows('tasks', userId), this.rows('canvas_courses', userId), this.rows('canvas_assignment_submissions', userId),
    ]);
    const submittedAssignmentIds = new Set(submissions.filter(s => s.submitted_at || s.excused || s.workflow_state === 'submitted' || s.workflow_state === 'pending_review' || (s.workflow_state === 'graded' && !s.missing)).map(s => s.assignment_id));
    return { activities: composeActivities({ userId, assignments, tasks, courses, submittedAssignmentIds, now, dayEnd: end }), assignments, tasks, now, date: requestedDate };
  }
  async getActivityList(userId: string, filters: { courseId?: string; status?: ActivitySummary['status']; offsetMinutes?: number } = {}): Promise<readonly ActivitySummary[]> {
    const { activities } = await this.activityContext(userId, undefined, filters.offsetMinutes);
    return activities.filter(a => (!filters.courseId || a.course?.id === filters.courseId) && (!filters.status || a.status === filters.status));
  }
  async getActivityDetail(userId: string, activityId: string): Promise<ActivityDetail> {
    const context = await this.activityContext(userId);
    const activity = requireFound(context.activities.find(a => a.id === activityId));
    const assignment = context.assignments.find(a => `canvas:${a.id}` === activityId);
    const task = context.tasks.find(t => t.id === activity.taskId);
    let courseMaterials: CourseMaterials | null = null;
    if (activity.course) {
      // A deselected course can still have an assignment; that activity remains
      // usable while materials are unavailable under the existing source gate.
      try { courseMaterials = await this.getCourseMaterials(userId, activity.course.id); }
      catch (error) { if (!(error instanceof ExperienceFailure && error.status === 404)) throw error; }
    }
    return { ...activity, instructions: assignment ? normalizeCanvasHtmlToText(assignment.description_html) || null : task?.notes ?? null,
      resources: assignment ? assignmentResources(assignment.description_html) : [], courseMaterials, generation: generationCapability(false), outputs: [] };
  }
  async getTodayOverview(userId: string, date: string, offset = 0): Promise<TodayOverview> {
    dayWindow(date, offset);
    const [context, sessions, plans] = await Promise.all([this.activityContext(userId, date, offset), this.rows('study_sessions', userId), this.rows('study_plans', userId)]);
    return composeToday({ userId, date, offset, now: context.now, activities: context.activities, tasks: context.tasks, sessions, plans });
  }
  private async artifactRecords(userId: string): Promise<ArtifactRecord[]> {
    const [reviewers, artifacts, versions, jobs, results, snapshots, courses] = await Promise.all([
      this.rows('reviewers', userId), this.rows('generated_artifacts', userId), this.rows('generated_artifact_versions', userId), this.rows('processing_jobs', userId),
      this.rows('processing_job_results', userId), this.rows('reviewer_source_snapshots', userId), this.rows('canvas_courses', userId),
    ]);
    const snapshotMap = new Map(snapshots.map(s => [s.id, s]));
    const courseMap = new Map(courses.map(c => [c.id, { id: c.id, code: c.course_code, name: c.name }]));
    function summary(id: string, title: string, createdAt: string, updatedAt: string, snapshotId: string | null, sourceId: string | null, sourceTitle: string | null): LibraryArtifactSummary {
      const snapshot = snapshotId ? snapshotMap.get(snapshotId) : null;
      return { id, type: 'reviewer', title, course: snapshot ? courseMap.get(snapshot.course_id) ?? null : null,
        sourceId: snapshot?.id ?? sourceId, sourceTitle: snapshot?.source_title ?? sourceTitle, activityId: null,
        createdAt, updatedAt, lastOpenedAt: null, status: 'completed', relatedArtifactIds: [] };
    }
    const records: ArtifactRecord[] = reviewers.map(row => ({
      summary: summary(`reviewer:${row.id}`, row.title, row.created_at, row.updated_at, row.source_snapshot_id, row.source_snapshot_id, text(record(row.source_metadata).sourceLabel)),
      payload: row.reviewer_output, reviewerId: row.id, aliases: [`reviewer:${row.id}`],
    }));
    for (const job of jobs) {
      if (job.job_type !== 'reviewer_generation' || job.status !== 'succeeded' || !job.result_id) continue;
      const result = results.find(r => r.id === job.result_id && r.job_id === job.id && r.result_type === 'reviewer_generation');
      if (!result) continue;
      const version = result.artifact_version_id ? versions.find(v => v.id === result.artifact_version_id && v.artifact_type === 'reviewer') : null;
      const artifact = version ? artifacts.find(a => a.id === version.artifact_id) : null;
      if (result.artifact_version_id && (!artifact || artifact.deleted_at || artifact.latest_version_id !== version?.id)) continue;
      const payload = record(result.payload);
      const snapshotId = text(payload.sourceSnapshotId);
      const saved = snapshotId ? reviewers.find(r => r.source_snapshot_id === snapshotId) : null;
      if (saved) {
        const index = records.findIndex(r => r.reviewerId === saved.id);
        const existing = records[index]!;
        records[index] = { ...existing, aliases: [...existing.aliases, `generation:${job.id}`, ...(artifact ? [`artifact:${artifact.id}`] : [])] };
        continue;
      }
      const existing = artifact ? records.findIndex(r => r.summary.id === `artifact:${artifact.id}`) : -1;
      if (existing >= 0) {
        records[existing] = { ...records[existing]!, aliases: [...records[existing]!.aliases, `generation:${job.id}`] };
        continue;
      }
      const reviewer = record(payload.reviewer);
      const id = artifact ? `artifact:${artifact.id}` : `generation:${job.id}`;
      records.push({ summary: summary(id, artifact?.safe_title ?? text(reviewer.title) ?? 'Reviewer', artifact?.created_at ?? result.created_at, artifact?.updated_at ?? result.created_at, snapshotId, job.source_version_id, text(record(job.source_metadata).displayName)),
        payload: result.payload, reviewerId: null, aliases: [id, `generation:${job.id}`] });
    }
    return records.sort((a, b) => Date.parse(b.summary.updatedAt) - Date.parse(a.summary.updatedAt) || a.summary.id.localeCompare(b.summary.id));
  }
  async getLibrary(userId: string, filters: { type?: LibraryArtifactType; courseId?: string; offset?: number; limit?: number } = {}): Promise<LibraryOverview> {
    const capabilities = experienceCapabilities();
    const categories = { reviewer: { status: 'available' as const }, quiz: capabilities.quizGeneration, activity_output: capabilities.activityMaker };
    if (filters.type && filters.type !== 'reviewer') return { items: [], categories, nextOffset: null };
    const records = (await this.artifactRecords(userId)).filter(r => !filters.courseId || r.summary.course?.id === filters.courseId);
    const offset = filters.offset ?? 0; const limit = filters.limit ?? 50;
    return { items: records.slice(offset, offset + limit).map(r => r.summary), categories, nextOffset: offset + limit < records.length ? offset + limit : null };
  }
  async getLibraryArtifact(userId: string, artifactId: string): Promise<{ artifact: LibraryArtifactSummary; reviewer: ReviewerReaderModel }> {
    const entry = requireFound((await this.artifactRecords(userId)).find(r => r.aliases.includes(artifactId)));
    const freshness = entry.reviewerId && this.dependencies.freshness ? await this.dependencies.freshness(userId, entry.reviewerId) : 'unknown';
    return { artifact: entry.summary, reviewer: reviewerReader(entry.payload, entry.summary, freshness) };
  }
  async getGeneration(userId: string, generationId: string): Promise<GenerationView> {
    const job = requireFound((await this.rows('processing_jobs', userId)).find(j => j.id === generationId && j.job_type === 'reviewer_generation'));
    const artifact = job.status === 'succeeded' ? (await this.artifactRecords(userId)).find(r => r.aliases.includes(`generation:${job.id}`)) : null;
    if (job.status === 'succeeded' && !artifact) throw new ExperienceFailure(404, 'not_found');
    return generationView(toProcessingJobStatusView(job), artifact?.summary.id ?? null);
  }
}
export function assignmentResources(html: string | null): ActivityDetail['resources'] {
  const result: { title: string; url: string }[] = [];
  function walk(node: DefaultTreeAdapterMap['node']) {
    if ('tagName' in node && node.tagName === 'a') {
      const href = node.attrs.find(a => a.name === 'href')?.value;
      if (href) try {
        const url = new URL(href);
        if (url.protocol === 'https:' && !url.username && !url.password && ![...url.searchParams.keys()].some(k => /token|signature|credential|key/i.test(k))) {
          const title = normalizeCanvasHtmlToText('childNodes' in node ? node.childNodes.map(n => 'value' in n ? n.value : '').join(' ') : '') || 'Assignment resource';
          if (!result.some(r => r.url === url.href)) result.push({ title, url: url.href });
        }
      } catch { /* Relative and unsafe URLs are not exposed. */ }
    }
    if ('childNodes' in node) node.childNodes.forEach(walk);
  }
  walk(parseFragment(html ?? ''));
  return result;
}
