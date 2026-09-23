import type { TaskPriority, TaskStatus, StudySessionStatus } from './task-planning';

export interface FeatureCapability {
  readonly status: 'available' | 'unavailable' | 'temporarily_unavailable';
  readonly reasonCode?: 'not_implemented' | 'service_unavailable' | 'source_not_ready' | 'unsupported_material';
}
export interface ExperienceCapabilities {
  readonly fileIngestion?: Readonly<Record<'pdf' | 'scanned_pdf' | 'image' | 'docx' | 'pptx' | 'doc' | 'ppt' | 'text' | 'canvas_text', FeatureCapability>>;
  readonly reviewerGeneration: FeatureCapability;
  readonly quizGeneration: FeatureCapability;
  readonly activityMaker: FeatureCapability;
  readonly planner: FeatureCapability;
  readonly calendar: FeatureCapability;
}
export interface GenerationCapability {
  readonly reviewer: FeatureCapability;
  readonly quiz: FeatureCapability;
  readonly activityAssistance: FeatureCapability;
}
export interface CourseReference { readonly id: string; readonly code: string | null; readonly name: string }
export interface CourseSummary extends CourseReference {
  readonly status: string | null;
  /** Null means not counted; never imply an empty course. */
  readonly materialCount: number | null;
  readonly reviewerCount: number | null;
  readonly lastActivityAt: string | null;
}
export interface LearningMaterial {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly kind: 'pdf' | 'document' | 'slides' | 'page' | 'module' | 'announcement' | 'assignment' | 'image' | 'text';
  readonly readiness: 'ready' | 'needs_preparation' | 'empty' | 'unsupported' | 'unavailable';
  readonly count: number | null;
  readonly sourceId: string;
  /** Latest owner-persisted Reviewer grounded in this exact Canvas material. */
  readonly reviewerArtifactId: string | null;
  readonly moduleTitle: string | null;
  readonly generation: GenerationCapability;
}
export interface CourseMaterials {
  readonly items: readonly LearningMaterial[];
  readonly nextOffset: number | null;
  readonly totalKnown: number;
}
export interface CourseLearningWorkspace {
  readonly course: CourseSummary;
  readonly materials: CourseMaterials;
  readonly capabilities: ExperienceCapabilities;
}
export interface ActivitySummary {
  readonly id: string;
  readonly taskId: string | null;
  readonly course: CourseReference | null;
  readonly title: string;
  readonly dueAt: string | null;
  readonly status: TaskStatus | 'submitted' | 'unknown';
  readonly priority: TaskPriority;
  readonly estimatedMinutes: number | null;
  readonly submissionTypes: readonly string[];
  readonly source: 'canvas' | 'local';
  readonly isOverdue: boolean;
  readonly urgency: 'now' | 'next' | 'later';
  readonly hasGeneratedDraft: boolean;
}
export interface ActivityResource { readonly title: string; readonly url: string }
export interface ActivityDetail extends ActivitySummary {
  readonly latestDraftId?: string | null;
  readonly instructions: string | null;
  readonly resources: readonly ActivityResource[];
  readonly courseMaterials: CourseMaterials | null;
  readonly generation: GenerationCapability;
  readonly outputs: readonly LibraryArtifactSummary[];
}
export interface TodayItem {
  readonly id: string;
  readonly kind: 'canvas_activity' | 'personal_task' | 'study_session' | 'calendar_block';
  readonly title: string;
  readonly course: CourseReference | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly dueAt: string | null;
  readonly estimatedMinutes: number | null;
  readonly priority: TaskPriority;
  readonly status: ActivitySummary['status'] | StudySessionStatus;
  readonly source: 'canvas' | 'local';
  readonly deepLinkTarget: { readonly surface: 'activity' | 'study_session'; readonly id: string };
}
export interface TodayOverview {
  readonly date: string;
  /** Fixed UTC offset in minutes for this requested day; supplied by the client. */
  readonly utcOffsetMinutes: number;
  readonly asOf: string;
  readonly progress: { readonly completed: number; readonly total: number; readonly scheduledMinutes: number };
  readonly urgent: readonly TodayItem[];
  readonly current: TodayItem | null;
  readonly next: TodayItem | null;
  readonly later: readonly TodayItem[];
  readonly overdue: readonly TodayItem[];
  readonly upcomingDeadlines: readonly TodayItem[];
  readonly timeline: readonly TodayItem[];
  readonly plannerState: {
    readonly status: 'not_planned' | 'current' | 'stale';
    readonly lastPlannedAt: string | null;
    readonly needsTaskImport: boolean;
  };
}
export interface AnnouncementLink {
  readonly label: string;
  readonly url: string;
}
export interface AnnouncementAttachment extends AnnouncementLink {
  readonly contentType: string | null;
  readonly size: number | null;
}
export interface StudentAnnouncement {
  readonly id: string;
  readonly course: CourseReference;
  readonly title: string;
  /** Readable text converted from Canvas HTML; raw markup is never returned. */
  readonly body: string;
  readonly preview: string | null;
  readonly postedAt: string | null;
  readonly authorName: string | null;
  readonly htmlUrl: string | null;
  readonly attachments: readonly AnnouncementAttachment[];
  readonly links: readonly AnnouncementLink[];
}
export interface StudentAnnouncementList {
  readonly items: readonly StudentAnnouncement[];
  readonly nextOffset: number | null;
}
export type LibraryArtifactType = 'reviewer' | 'quiz' | 'activity_output';
export type GenerationState = 'queued' | 'preparing' | 'generating' | 'finalizing' | 'completed' | 'failed' | 'cancelling' | 'cancelled';
export interface LibraryArtifactSummary {
  readonly quiz?: import('./quiz').QuizSummary;
  readonly id: string;
  readonly type: LibraryArtifactType;
  readonly title: string;
  readonly course: CourseReference | null;
  readonly sourceId: string | null;
  readonly sourceTitle: string | null;
  readonly activityId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastOpenedAt: string | null;
  readonly status: GenerationState;
  readonly relatedArtifactIds: readonly string[];
}
export interface LibraryOverview {
  readonly items: readonly LibraryArtifactSummary[];
  readonly categories: Readonly<Record<LibraryArtifactType, FeatureCapability>>;
  readonly nextOffset: number | null;
}
/** Full owner-scoped artifact returned by `GET /api/experience/library/:id`. */
export type LibraryArtifactDetail =
  | { readonly artifact: LibraryArtifactSummary; readonly reviewer: ReviewerReaderModel }
  | { readonly artifact: LibraryArtifactSummary; readonly quiz: import('./quiz').Quiz }
  | { readonly artifact: LibraryArtifactSummary; readonly draft: import('./activity-maker').ActivityDraft };
export interface ReviewerReaderModel {
  readonly id: string;
  readonly title: string;
  readonly course: CourseReference | null;
  readonly source: { readonly id: string | null; readonly title: string | null };
  readonly generatedAt: string;
  readonly freshness: 'current' | 'changed' | 'attention_required' | 'unknown';
  readonly sections: readonly {
    readonly id: string;
    readonly title: string;
    readonly blocks: readonly {
      readonly id: string;
      readonly title: string;
      readonly explanation: string;
      readonly keyPoints: readonly string[];
      readonly evidence: readonly { readonly kind: 'code' | 'formula' | 'table' | 'result' | 'example' | 'source'; readonly text: string }[];
    }[];
  }[];
}
export interface GenerationView {
  readonly id: string;
  readonly state: GenerationState;
  readonly updatedAt: string;
  readonly progress: { readonly completed: number; readonly total: number; readonly unit: 'pages' | 'sections' } | null;
  readonly artifactId: string | null;
  readonly error: ExperienceError | null;
}
export interface ExperienceError {
  readonly code: 'sign_in_required' | 'not_found' | 'invalid_request' | 'not_ready' | 'unavailable' | 'generation_failed' | 'rate_limited' | 'conflict' | 'activity_not_found' | 'activity_generation_unavailable' | 'activity_source_unavailable' | 'activity_template_unreadable' | 'unsupported_attachment_type' | 'activity_draft_not_found' | 'activity_generation_failed' | 'activity_draft_conflict' | 'quiz_generation_unavailable' | 'quiz_source_unavailable' | 'quiz_not_found' | 'quiz_generation_failed' | 'quiz_attempt_not_found' | 'quiz_attempt_completed' | 'quiz_question_not_found' | 'quiz_answer_invalid' | 'quiz_answer_already_finalized' | 'quiz_result_unavailable';
  readonly title: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly action: 'sign_in' | 'retry' | 'choose_material' | 'none';
}
export type ExperienceResponse<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ExperienceError };
/** Legacy B24.5 placeholder. New integrations use ActivityDraft from activity-maker. */
export interface ActivityOutputDraft {
  readonly id: string;
  readonly activityId: string;
  readonly title: string;
  readonly content: string;
  readonly status: 'draft' | 'saved';
  readonly updatedAt: string;
}
