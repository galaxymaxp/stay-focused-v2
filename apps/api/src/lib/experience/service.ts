import type { Quiz } from '@stay-focused/shared';
import type { CanvasAssignmentRow } from '@stay-focused/db';
import { quizView } from '../quiz/service';
import type { ActivityDetail, ActivitySummary, AnnouncementAttachment, AnnouncementLink, CourseLearningWorkspace, CourseMaterials, CourseSummary, GenerateCourseList, GenerationView, LibraryArtifactDetail, LibraryArtifactSummary,LibraryArtifactType, LibraryOverview, ReviewerReaderModel, StudentAnnouncement, StudentAnnouncementList, TodayOverview } from '@stay-focused/shared';
import type { CanvasReviewerSourceList, CanvasReviewerSourceResult } from '@/lib/canvas-reviewer-sources';
import type { CanvasCourseInventory, CanvasCourseSelectionResult } from '@/lib/canvas-course-selection';
import { normalizeCanvasHtmlToText } from '@/lib/canvas-content-normalization';
import { toProcessingJobStatusView } from '@/lib/processing-jobs/repository';
import type { ExperienceRepository } from './repository';
import { ExperienceFailure, requireFound } from './errors';
import { composeToday, courseSummary, dayWindow, experienceCapabilities, generationCapability, generationView, learningMaterial, orderGenerateCourses, record, reviewerReader, text } from './mappers';
import { readActivityContext } from './task-state';
import { activityGenerationState, draftView } from '../activity-maker/service';
import type { ActivityDraft } from '@stay-focused/shared';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

function sourceType(metadata: unknown): LibraryArtifactSummary['sourceType'] {
  const value = record(metadata).sourceType;
  return value === 'canvas_file' || value === 'canvas_page' || value === 'canvas_mixed' || value === 'text' || value === 'camera' || value === 'local_file' ? value : null;
}

export interface ExperienceDependencies {
  readonly repository: ExperienceRepository;
  readonly materials: (userId: string, courseId: string, offset: number) => Promise<CanvasReviewerSourceResult<CanvasReviewerSourceList>>;
  /** Sync page source of truth: selection, latest sync attempt, and Canvas term/enrollment classification. */
  readonly courseInventory?: (userId: string) => Promise<CanvasCourseSelectionResult<CanvasCourseInventory>>;
  readonly freshness?: (userId: string, reviewerArtifactId: string) => Promise<ReviewerReaderModel['freshness']>;
  readonly now?: () => number;
}
interface ArtifactRecord { readonly summary: LibraryArtifactSummary; readonly payload: unknown; readonly reviewerArtifactId: string | null; readonly aliases: readonly string[] }
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
  async getGenerateCourses(userId: string): Promise<GenerateCourseList> {
    if (!this.dependencies.courseInventory) throw new ExperienceFailure(503, 'unavailable');
    const inventory = await this.dependencies.courseInventory(userId);
    if (!inventory.ok) {
      // No Canvas connection means nothing is synchronized yet: an empty list, not an outage.
      if (inventory.code === 'canvas_connection_missing') return { items: [], classificationSource: 'stored' };
      console.error('experience.generate_courses.failed', { code: inventory.code, status: inventory.status });
      throw new ExperienceFailure(503, 'unavailable');
    }
    return { items: orderGenerateCourses(inventory.value.courses), classificationSource: inventory.value.classificationSource };
  }
  async getCourseMaterials(userId: string, courseId: string, offset = 0): Promise<CourseMaterials> {
    requireFound((await this.rows('canvas_courses', userId)).find(c => c.id === courseId));
    const [result, artifacts, versions, sourceVersions, snapshots, snapshotItems] = await Promise.all([
      this.dependencies.materials(userId, courseId, offset),
      this.rows('generated_artifacts', userId),
      this.rows('generated_artifact_versions', userId),
      this.rows('source_versions', userId),
      this.rows('reviewer_source_snapshots', userId),
      this.rows('reviewer_source_snapshot_items', userId),
    ]);
    if (!result.ok) {
      // Unselected or disconnected courses are a sync state, not a server outage.
      if (result.code === 'canvas_course_not_selected' || result.code === 'canvas_connection_missing') throw new ExperienceFailure(409, 'course_not_synced');
      if (result.status === 404) throw new ExperienceFailure(404, 'not_found');
      console.error('experience.course_materials.failed', { code: result.code, status: result.status });
      throw new ExperienceFailure(503, 'unavailable');
    }
    const courseSnapshots = new Set(snapshots.filter(snapshot => snapshot.course_id === courseId).map(snapshot => snapshot.id));
    const versionMap = new Map(versions.filter(version => version.artifact_type === 'reviewer').map(version => [version.id, version]));
    const sourceVersionMap = new Map(sourceVersions.map(source => [source.id, source]));
    const latestReviewerBySnapshot = new Map<string, { id: string; updatedAt: string }>();
    for (const artifact of [...artifacts].filter(row => row.artifact_type === 'reviewer' && !row.deleted_at).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))) {
      const version = artifact.latest_version_id ? versionMap.get(artifact.latest_version_id) : null;
      const source = version ? sourceVersionMap.get(version.source_version_id) : null;
      const snapshotId = source ? text(record(source.metadata).reviewerSourceSnapshotId) : null;
      if (version?.artifact_id === artifact.id && snapshotId && courseSnapshots.has(snapshotId) && !latestReviewerBySnapshot.has(snapshotId)) {
        latestReviewerBySnapshot.set(snapshotId, { id: artifact.id, updatedAt: artifact.updated_at });
      }
    }
    const reviewerByMaterial = new Map<string, { id: string; updatedAt: string }>();
    for (const item of snapshotItems) {
      if (item.course_id !== courseId || !item.source_row_id) continue;
      const reviewer = latestReviewerBySnapshot.get(item.source_snapshot_id);
      const key = `${item.source_type}:${item.source_row_id}`;
      if (reviewer && (!reviewerByMaterial.has(key) || Date.parse(reviewer.updatedAt) > Date.parse(reviewerByMaterial.get(key)!.updatedAt))) reviewerByMaterial.set(key, reviewer);
    }
    return { items: result.value.sources.map(row => learningMaterial(row, courseId, reviewerByMaterial.get(row.id)?.id ?? null)), totalKnown: result.value.pagination.totalKnown,
      nextOffset: result.value.pagination.hasMore ? result.value.pagination.offset + result.value.pagination.returned : null };
  }
  async getCourseLearningWorkspace(userId: string, courseId: string): Promise<CourseLearningWorkspace> {
    const course = requireFound((await this.getCourses(userId)).find(c => c.id === courseId));
    const materials = await this.getCourseMaterials(userId, courseId);
    return { course: { ...course, materialCount: materials.totalKnown }, materials, capabilities: experienceCapabilities() };
  }
  private async activityContext(userId: string, date?: string, offset = 0, includeArchivedCourses = false) {
    const now = this.now;
    const requestedDate = date ?? new Date(now + offset * 60_000).toISOString().slice(0, 10);
    const { end } = dayWindow(requestedDate, offset);
    return { ...await readActivityContext(this.dependencies.repository, userId, now, end, includeArchivedCourses), now, date: requestedDate };
  }
  async getActivityList(userId: string, filters: { courseId?: string; status?: ActivitySummary['status']; offsetMinutes?: number } = {}): Promise<readonly ActivitySummary[]> {
    const { activities } = await this.activityContext(userId, undefined, filters.offsetMinutes);
    const drafts = await this.activityDraftRecords(userId);
    return activities.map(a=>({...a,hasGeneratedDraft:drafts.some(d=>d.summary.activityId===a.id)})).filter(a => (!filters.courseId || a.course?.id === filters.courseId) && (!filters.status || a.status === filters.status));
  }
  async getActivityDetail(userId: string, activityId: string): Promise<ActivityDetail> {
    const context = await this.activityContext(userId, undefined, 0, true);
    const activity = requireFound(context.activities.find(a => a.id === activityId));
    const assignment = context.assignments.find(a => `canvas:${a.id}` === activityId);
    const task = context.tasks.find(t => t.id === activity.taskId);
    const attachments = assignment ? await this.activityAttachments(userId, assignment) : [];
    let courseMaterials: CourseMaterials | null = null;
    if (activity.course) {
      // A deselected course can still have an assignment; that activity remains
      // usable while materials are unavailable under the existing source gate.
      try { courseMaterials = await this.getCourseMaterials(userId, activity.course.id); }
      catch (error) { if (!(error instanceof ExperienceFailure && (error.status === 404 || error.code === 'course_not_synced'))) throw error; }
    }
    const drafts = (await this.activityDraftRecords(userId)).filter(r => r.summary.activityId === activityId);
    return { ...activity, hasGeneratedDraft: drafts.length > 0, latestDraftId: drafts[0]?.draft.id ?? null, instructions: assignment ? normalizeCanvasHtmlToText(assignment.description_html) || null : task?.notes ?? null,
      resources: assignment ? assignmentResources(assignment.description_html).filter(resource => !isCanvasFileUrl(resource.url)) : [], attachments: attachments.map(({ canvasFileId: _canvasFileId, ...attachment }) => attachment), courseMaterials, generation: { ...generationCapability(false), activityAssistance: assignment && activity.course ? { status: 'available' } : { status: 'unavailable', reasonCode: 'unsupported_material' } }, outputs: drafts.map(d => d.summary) };
  }
  /** Re-resolve an attachment against owner-scoped synced assignment/file rows before download. */
  async getActivityAttachmentDownload(userId: string, activityId: string, key: string) {
    const context = await this.activityContext(userId, undefined, 0, true);
    const activity = requireFound(context.activities.find(item => item.id === activityId));
    const assignment = context.assignments.find(row => `canvas:${row.id}` === activity.id);
    if (!assignment || !activity.course) throw new ExperienceFailure(404, 'not_found');
    const attachment = (await this.activityAttachments(userId, assignment)).find(item => item.key === key);
    if (!attachment) throw new ExperienceFailure(404, 'not_found');
    const course = (await this.rows('canvas_courses', userId)).find(row => row.id === assignment.course_id);
    if (!course || course.user_id !== userId || course.canvas_connection_id !== assignment.canvas_connection_id)
      throw new ExperienceFailure(404, 'not_found');
    return { attachment, canvasCourseId: course.canvas_course_id, canvasConnectionId: course.canvas_connection_id };
  }
  private async activityAttachments(userId: string, assignment: CanvasAssignmentRow) {
    const [files, references] = await Promise.all([this.rows('canvas_files', userId), this.rows('canvas_file_references', userId)]);
    const courseFiles = files.filter(file => file.course_id === assignment.course_id && file.canvas_connection_id === assignment.canvas_connection_id);
    const filesById = new Map(courseFiles.map(file => [file.id, file]));
    const byCanvasId = new Map<string, { filename: string; contentType: string | null; size: number | null; canvasFileId: string }>();
    for (const reference of references) {
      if (reference.course_id !== assignment.course_id || reference.canvas_connection_id !== assignment.canvas_connection_id || reference.canvas_assignment_id !== assignment.canvas_assignment_id) continue;
      const file = filesById.get(reference.file_id);
      if (!file) continue;
      byCanvasId.set(file.canvas_file_id, { filename: safeAttachmentFilename(file.filename || file.display_name), contentType: safeAttachmentMime(file.content_type), size: Number.isSafeInteger(file.size_bytes) && file.size_bytes! >= 0 ? file.size_bytes : null, canvasFileId: file.canvas_file_id });
    }
    return [...byCanvasId.values()].sort((a, b) => a.filename.localeCompare(b.filename) || a.canvasFileId.localeCompare(b.canvasFileId))
      .map((item, index) => ({ key: `a${index}`, filename: item.filename, contentType: item.contentType, extension: attachmentExtension(item.filename), size: item.size, canvasFileId: item.canvasFileId }));
  }
  async getTodayOverview(userId: string, date: string, offset = 0): Promise<TodayOverview> {
    dayWindow(date, offset);
    const [context, sessions, plans] = await Promise.all([this.activityContext(userId, date, offset), this.rows('study_sessions', userId), this.rows('study_plans', userId)]);
    return composeToday({ userId, date, offset, now: context.now, activities: context.activities, tasks: context.tasks, sessions, plans });
  }
  async getAnnouncements(
    userId: string,
    filters: { courseId?: string; offset?: number; limit?: number } = {},
  ): Promise<StudentAnnouncementList> {
    const [announcements, courses] = await Promise.all([
      this.rows('canvas_announcements', userId),
      this.rows('canvas_courses', userId),
    ]);
    const courseMap = new Map(courses.map(course => [course.id, courseSummary(course)]));
    const items = announcements
      .filter(row => row.published !== false && row.locked !== true)
      .flatMap((row): readonly StudentAnnouncement[] => {
        const course = courseMap.get(row.course_id);
        if (!course || (filters.courseId && course.id !== filters.courseId)) return [];
        const attachments = announcementAttachments(row.attachments);
        const attachmentUrls = new Set(attachments.map(item => item.url));
        const links = announcementResources(row.message_html).filter(link => !attachmentUrls.has(link.url));
        const body = normalizeCanvasHtmlToText(row.message_html);
        return [{
          id: row.id,
          course: { id: course.id, code: course.code, name: course.name },
          title: row.title.trim(),
          body,
          preview: announcementPreview(body),
          postedAt: row.posted_at ?? row.delayed_post_at ?? row.todo_date,
          authorName: row.author_name?.trim() || null,
          htmlUrl: safeAnnouncementUrl(row.html_url),
          attachments,
          links,
        }];
      })
      .sort((left, right) =>
        announcementTime(right.postedAt) - announcementTime(left.postedAt) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id));
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 50;
    return {
      items: items.slice(offset, offset + limit),
      nextOffset: offset + limit < items.length ? offset + limit : null,
    };
  }
  private async quizRecords(userId: string): Promise<{summary:LibraryArtifactSummary;quiz:Quiz;generationId:string|null}[]> {
    const [rows,attempts,courses,sources] = await Promise.all([this.rows('quizzes',userId),this.rows('quiz_attempts',userId),this.getCourses(userId),this.rows('source_versions',userId)]);
    return rows.map(row=>{
      const quiz=quizView(row,attempts), course=courses.find(c=>c.id===quiz.courseId);
      const summary = { ...quiz, questions: undefined };
      const source = sources.find(value => value.id === row.source_version_id);
      return {quiz,generationId:row.generation_id,summary:{id:`quiz:${quiz.id}`,type:'quiz',title:quiz.title,course:course?{id:course.id,code:course.code,name:course.name}:null,sourceId:quiz.sourceId,sourceType:sourceType(source?.metadata),sourceTitle:source ? text(record(source.metadata).sourceTitle) : null,activityId:null,createdAt:quiz.createdAt,updatedAt:quiz.updatedAt,lastOpenedAt:null,status:'completed',relatedArtifactIds:quiz.reviewerArtifactId?[`artifact:${quiz.reviewerArtifactId}`]:[],quiz:summary}};
    });
  }
  private async activityDraftRecords(userId: string): Promise<{summary:LibraryArtifactSummary;draft:ActivityDraft}[]> {
    const [drafts,courses] = await Promise.all([this.rows('activity_drafts',userId),this.getCourses(userId)]);
    return drafts.map(row => { const draft=draftView(row); const course=courses.find(c=>c.id===row.course_id);
      return {draft,summary:{id:`activity:${row.id}`,type:'activity_output' as const,title:draft.title,course:course?{id:course.id,code:course.code,name:course.name}:null,sourceId:draft.activityId,sourceTitle:draft.title,activityId:draft.activityId,createdAt:draft.createdAt,updatedAt:draft.updatedAt,lastOpenedAt:null,status:'completed' as const,relatedArtifactIds:[]}};
    }).sort((a,b)=>Date.parse(b.draft.createdAt)-Date.parse(a.draft.createdAt)||a.draft.id.localeCompare(b.draft.id));
  }
  private async artifactRecords(userId: string): Promise<ArtifactRecord[]> {
    const [artifacts, versions, sourceVersions, snapshots, courses, snapshotItems] = await Promise.all([
      this.rows('generated_artifacts', userId), this.rows('generated_artifact_versions', userId), this.rows('source_versions', userId),
      this.rows('reviewer_source_snapshots', userId), this.rows('canvas_courses', userId), this.rows('reviewer_source_snapshot_items', userId),
    ]);
    const snapshotMap = new Map(snapshots.map(s => [s.id, s]));
    const courseMap = new Map(courses.map(c => [c.id, { id: c.id, code: c.course_code, name: c.name }]));
    function summary(id: string, title: string, createdAt: string, updatedAt: string, snapshotId: string | null, sourceId: string | null, sourceTitle: string | null, kind: LibraryArtifactSummary['sourceType']): LibraryArtifactSummary {
      const snapshot = snapshotId ? snapshotMap.get(snapshotId) : null;
      const originalItems = snapshotId ? snapshotItems.filter(item => item.source_snapshot_id === snapshotId) : [];
      return { id, type: 'reviewer', title, course: snapshot ? courseMap.get(snapshot.course_id) ?? null : null,
        sourceId: snapshot?.id ?? sourceId, sourceType: kind, sourceTitle: snapshot?.source_title ?? sourceTitle, activityId: null,
        sourceMaterialId: originalItems.length === 1 && originalItems[0]!.source_row_id ? `${originalItems[0]!.source_type}:${originalItems[0]!.source_row_id}` : null,
        createdAt, updatedAt, lastOpenedAt: null, status: 'completed', relatedArtifactIds: [] };
    }
    const versionMap = new Map(versions.filter(version => version.artifact_type === 'reviewer').map(version => [version.id, version]));
    const sourceVersionMap = new Map(sourceVersions.map(source => [source.id, source]));
    const records: ArtifactRecord[] = [];
    for (const artifact of artifacts) {
      if (artifact.artifact_type !== 'reviewer' || artifact.deleted_at || !artifact.latest_version_id) continue;
      const version = versionMap.get(artifact.latest_version_id);
      if (!version || version.artifact_id !== artifact.id) continue;
      const source = sourceVersionMap.get(version.source_version_id);
      if (!source) continue;
      const snapshotId = text(record(source.metadata).reviewerSourceSnapshotId);
      const id = `artifact:${artifact.id}`;
      records.push({
        summary: summary(id, artifact.safe_title, artifact.created_at, artifact.updated_at, snapshotId, source.id, text(record(source.metadata).sourceTitle), sourceType(source.metadata)),
        payload: version.payload,
        reviewerArtifactId: artifact.id,
        aliases: [id, ...(version.generation_job_id ? [`generation:${version.generation_job_id}`] : [])],
      });
    }
    return records.sort((a, b) => Date.parse(b.summary.updatedAt) - Date.parse(a.summary.updatedAt) || a.summary.id.localeCompare(b.summary.id));
  }
  async getLibrary(userId: string, filters: { type?: LibraryArtifactType; courseId?: string; offset?: number; limit?: number } = {}): Promise<LibraryOverview> {
    const capabilities = experienceCapabilities();
    const categories = { reviewer: { status: 'available' as const }, quiz: capabilities.quizGeneration, activity_output: capabilities.activityMaker };
    const records = [...(await this.artifactRecords(userId)),...(await this.activityDraftRecords(userId)),...(await this.quizRecords(userId))].filter(r => (!filters.type || r.summary.type===filters.type) && (!filters.courseId || r.summary.course?.id === filters.courseId)).sort((a,b)=>Date.parse(b.summary.updatedAt)-Date.parse(a.summary.updatedAt)||a.summary.id.localeCompare(b.summary.id));
    // A new generation from the same single Canvas material supersedes its
    // prior Reviewer card. Older artifacts remain addressable by existing Quizzes.
    const visible = records.filter((record, index) => record.summary.type !== 'reviewer' || !records.slice(0, index).some(earlier => earlier.summary.type === 'reviewer' && earlier.summary.course?.id === record.summary.course?.id && (earlier.summary.sourceMaterialId ?? earlier.summary.sourceId) && (earlier.summary.sourceMaterialId ?? earlier.summary.sourceId) === (record.summary.sourceMaterialId ?? record.summary.sourceId)));
    const offset = filters.offset ?? 0; const limit = filters.limit ?? 50;
    const visibleIds = new Set(visible.map(record => record.summary.id));
    return { items: visible.slice(offset, offset + limit).map(r => r.summary), categories, nextOffset: offset + limit < visible.length ? offset + limit : null,
      supersededReviewerIds: records.filter(record => record.summary.type === 'reviewer' && !visibleIds.has(record.summary.id)).map(record => record.summary.id) };
  }
  async getLibraryArtifact(userId: string, artifactId: string): Promise<LibraryArtifactDetail> {
    if (artifactId.startsWith('quiz:')) { const entry=requireFound((await this.quizRecords(userId)).find(r=>r.summary.id===artifactId)); return {artifact:entry.summary,quiz:entry.quiz}; }
    if (artifactId.startsWith('activity:')) { const entry=requireFound((await this.activityDraftRecords(userId)).find(r=>r.summary.id===artifactId)); return {artifact:entry.summary,draft:entry.draft}; }
    const entry = requireFound((await this.artifactRecords(userId)).find(r => r.aliases.includes(artifactId)));
    const freshness = entry.reviewerArtifactId && this.dependencies.freshness ? await this.dependencies.freshness(userId, entry.reviewerArtifactId) : 'unknown';
    return { artifact: entry.summary, reviewer: reviewerReader(entry.payload, entry.summary, freshness) };
  }
  async getGeneration(userId: string, generationId: string): Promise<GenerationView> {
    const job = requireFound((await this.rows('processing_jobs', userId)).find(j => j.id === generationId && (j.job_type === 'reviewer_generation' || j.job_type === 'activity_generation' || j.job_type === 'quiz_generation')));
    if (job.job_type === 'quiz_generation') {
      const quiz=job.status==='succeeded'?(await this.quizRecords(userId)).find(r=>r.generationId===job.id):null;
      return {id:job.id,state:activityGenerationState(job),updatedAt:job.updated_at,progress:null,artifactId:quiz?.summary.id??null,error:['failed','expired'].includes(job.status)?{code:'quiz_generation_failed',title:'Quiz',message:'Quiz generation did not finish.',retryable:job.retryable===true,action:job.retryable===true?'retry':'none'}:null};
    }
    if (job.job_type === 'activity_generation') {
      const draft=job.status==='succeeded'?(await this.activityDraftRecords(userId)).find(r=>r.draft.generationId===job.id):null;
      const sourceUnavailable = job.error_code === 'activity_source_unavailable';
      return {id:job.id,state:activityGenerationState(job),updatedAt:job.updated_at,progress:null,artifactId:draft?.summary.id??null,error:job.status==='failed'?{code:sourceUnavailable?'activity_source_unavailable':'activity_generation_failed',title:'Activity Maker',message:sourceUnavailable?'A linked assignment resource could not be prepared. Open the assignment or choose another source.':'Draft generation did not finish.',retryable:false,action:'none'}:null};
    }
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

function isCanvasFileUrl(value: string): boolean {
  try { return /(?:^|\/)files(?:\/|$)/i.test(new URL(value).pathname); }
  catch { return false; }
}
function safeAttachmentFilename(value: string): string {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/]/g, '').trim().slice(0, 240);
  return cleaned || 'Canvas attachment';
}
function safeAttachmentMime(value: string | null): string | null {
  if (!value || !/^[\w.+-]+\/[\w.+-]+$/.test(value)) return null;
  return value.toLowerCase();
}
function attachmentExtension(filename: string): string | null {
  const match = /\.([a-z0-9]{1,10})$/i.exec(filename);
  return match ? match[1]!.toUpperCase() : null;
}

export function announcementResources(html: string | null): readonly AnnouncementLink[] {
  const result: AnnouncementLink[] = [];
  function walk(node: DefaultTreeAdapterMap['node']) {
    if ('tagName' in node && node.tagName === 'a') {
      const href = node.attrs.find(attribute => attribute.name === 'href')?.value;
      const url = safeAnnouncementUrl(href ?? null);
      if (url) {
        const label = normalizeCanvasHtmlToText(
          'childNodes' in node
            ? node.childNodes.map(child => 'value' in child ? child.value : '').join(' ')
            : '',
        ) || 'Open link';
        if (!result.some(link => link.url === url)) result.push({ label, url });
      }
    }
    if ('childNodes' in node) node.childNodes.forEach(walk);
  }
  walk(parseFragment(html ?? ''));
  return result;
}

function announcementAttachments(value: unknown): readonly AnnouncementAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): readonly AnnouncementAttachment[] => {
    const item = record(entry);
    const label = text(item.display_name) ?? text(item.filename);
    const url = safeAnnouncementUrl(text(item.url));
    if (!label || !url) return [];
    return [{
      label,
      url,
      contentType: text(item.content_type),
      size: typeof item.size === 'number' && Number.isFinite(item.size) && item.size >= 0
        ? item.size
        : null,
    }];
  });
}

function safeAnnouncementUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      [...url.searchParams.keys()].some(key => /token|signature|credential|key/i.test(key))
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

function announcementPreview(body: string): string | null {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (!compact) return null;
  return compact.length <= 180 ? compact : `${compact.slice(0, 177).trimEnd()}...`;
}

function announcementTime(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
