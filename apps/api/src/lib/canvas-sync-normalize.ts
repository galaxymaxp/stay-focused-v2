import type {
  CanvasAnnouncement,
  CanvasAssignment,
  CanvasAssignmentGroup,
  CanvasCourse,
  CanvasJsonObject,
  CanvasModule,
  CanvasModuleItem,
  CanvasPageDetail,
  CanvasPlannerItem,
} from "@stay-focused/canvas";
import type { Json } from "@stay-focused/db";
import { createHash } from "node:crypto";

export type CanvasSyncFailureCode =
  | "canvas_sync_normalization_failed"
  | "canvas_course_fetch_failed"
  | "canvas_course_modules_failed"
  | "canvas_course_module_items_failed"
  | "canvas_course_pages_failed"
  | "canvas_course_page_detail_failed"
  | "canvas_course_assignment_groups_failed"
  | "canvas_course_assignments_failed"
  | "canvas_course_response_invalid"
  | "canvas_course_persist_failed"
  | "canvas_course_persistence_failed"
  | "canvas_planner_items_failed"
  | "canvas_planner_persistence_failed"
  | "canvas_course_announcements_failed"
  | "canvas_announcement_persistence_failed"
  | "canvas_course_files_failed"
  | "canvas_file_metadata_invalid"
  | "canvas_file_persistence_failed"
  | "canvas_connection_corrupt"
  | "canvas_storage_failed"
  | "canvas_sync_in_progress"
  | "canvas_unavailable";

export interface CanvasSyncResourceCounts {
  readonly [key: string]: number | undefined;
  readonly modules: number;
  readonly moduleItems: number;
  readonly pages: number;
  readonly assignmentGroups: number;
  readonly assignments: number;
  readonly plannerItems: number;
  readonly announcements: number;
  readonly files: number;
  readonly fileReferences: number;
}

interface SyncJsonObject {
  readonly [key: string]: Json | undefined;
}

export interface CanvasSyncCoursePayload extends SyncJsonObject {
  readonly canvas_course_id: string;
  readonly name: string;
  readonly course_code: string | null;
  readonly workflow_state: string | null;
  readonly enrollment_term_id: string | null;
  readonly account_id: string | null;
  readonly start_at: string | null;
  readonly end_at: string | null;
  readonly time_zone: string | null;
  readonly public_syllabus: boolean | null;
  readonly syllabus_body: string | null;
  readonly canvas_updated_at: string | null;
}

export interface CanvasSyncModulePayload extends SyncJsonObject {
  readonly canvas_module_id: string;
  readonly name: string;
  readonly position: number | null;
  readonly unlock_at: string | null;
  readonly item_count: number | null;
  readonly require_sequential_progress: boolean | null;
  readonly published: boolean | null;
  readonly prerequisite_module_ids: readonly string[];
  readonly canvas_state: string | null;
}

export interface CanvasSyncModuleItemPayload extends SyncJsonObject {
  readonly canvas_module_id: string;
  readonly canvas_module_item_id: string;
  readonly title: string;
  readonly position: number | null;
  readonly indent: number | null;
  readonly item_type: string;
  readonly canvas_content_id: string | null;
  readonly page_url: string | null;
  readonly external_url: string | null;
  readonly html_url: string | null;
  readonly new_tab: boolean | null;
  readonly published: boolean | null;
  readonly completion_requirement: Json | null;
  readonly content_details: Json | null;
}

export interface CanvasSyncPagePayload extends SyncJsonObject {
  readonly canvas_page_id: string | null;
  readonly canvas_page_url: string;
  readonly title: string;
  readonly body_html: string | null;
  readonly published: boolean | null;
  readonly front_page: boolean | null;
  readonly editing_roles: string | null;
  readonly lock_info: Json | null;
  readonly unlock_at: string | null;
  readonly lock_at: string | null;
  readonly canvas_created_at: string | null;
  readonly canvas_updated_at: string | null;
}

export interface CanvasSyncAssignmentGroupPayload extends SyncJsonObject {
  readonly canvas_assignment_group_id: string;
  readonly name: string;
  readonly position: number | null;
  readonly group_weight: number | null;
  readonly rules: Json | null;
  readonly integration_data: Json | null;
}

export interface CanvasSyncAssignmentPayload extends SyncJsonObject {
  readonly canvas_assignment_id: string;
  readonly canvas_assignment_group_id: string | null;
  readonly name: string;
  readonly description_html: string | null;
  readonly position: number | null;
  readonly points_possible: number | null;
  readonly grading_type: string | null;
  readonly submission_types: readonly string[];
  readonly due_at: string | null;
  readonly unlock_at: string | null;
  readonly lock_at: string | null;
  readonly published: boolean | null;
  readonly muted: boolean | null;
  readonly omit_from_final_grade: boolean | null;
  readonly anonymous_grading: boolean | null;
  readonly html_url: string | null;
  readonly quiz_id: string | null;
  readonly discussion_topic_id: string | null;
  readonly canvas_created_at: string | null;
  readonly canvas_updated_at: string | null;
}

export interface CanvasSyncPlannerItemPayload extends SyncJsonObject {
  readonly canvas_planner_item_id: string;
  readonly context_code: string | null;
  readonly canvas_course_id: string | null;
  readonly plannable_type: string;
  readonly plannable_id: string;
  readonly title: string | null;
  readonly planner_date: string | null;
  readonly due_at: string | null;
  readonly todo_date: string | null;
  readonly html_url: string | null;
  readonly workflow_state: string | null;
  readonly marked_complete: boolean | null;
  readonly dismissed: boolean | null;
  readonly submission_excused: boolean | null;
  readonly submission_graded: boolean | null;
  readonly submission_late: boolean | null;
  readonly submission_missing: boolean | null;
  readonly submission_needs_grading: boolean | null;
  readonly submission_with_feedback: boolean | null;
  readonly source_fingerprint: string;
}

export interface CanvasSyncAnnouncementPayload extends SyncJsonObject {
  readonly canvas_announcement_id: string;
  readonly canvas_course_id: string;
  readonly title: string;
  readonly message_html: string | null;
  readonly posted_at: string | null;
  readonly delayed_post_at: string | null;
  readonly lock_at: string | null;
  readonly todo_date: string | null;
  readonly workflow_state: string | null;
  readonly published: boolean | null;
  readonly locked: boolean | null;
  readonly html_url: string | null;
  readonly source_fingerprint: string;
}

export interface CanvasCourseSnapshotPayload {
  readonly course: CanvasSyncCoursePayload;
  readonly modules: readonly CanvasSyncModulePayload[];
  readonly moduleItems: readonly CanvasSyncModuleItemPayload[];
  readonly pages: readonly CanvasSyncPagePayload[];
  readonly assignmentGroups: readonly CanvasSyncAssignmentGroupPayload[];
  readonly assignments: readonly CanvasSyncAssignmentPayload[];
}

export class CanvasSyncNormalizationError extends Error {
  public readonly code = "canvas_sync_normalization_failed";

  public constructor(message: string) {
    super(message);
    this.name = "CanvasSyncNormalizationError";
  }
}

export function createCanvasCourseSnapshotPayload({
  assignmentGroups,
  assignments,
  course,
  moduleItemsByModule,
  modules,
  pages,
}: {
  readonly assignmentGroups: readonly CanvasAssignmentGroup[];
  readonly assignments: readonly CanvasAssignment[];
  readonly course: CanvasCourse;
  readonly moduleItemsByModule: readonly {
    readonly module: CanvasModule;
    readonly items: readonly CanvasModuleItem[];
  }[];
  readonly modules: readonly CanvasModule[];
  readonly pages: readonly CanvasPageDetail[];
}): CanvasCourseSnapshotPayload {
  return {
    course: mapCourse(course),
    modules: modules.map(mapModule),
    moduleItems: moduleItemsByModule.flatMap(({ items, module }) =>
      items.map((item) => mapModuleItem(module.id, item)),
    ),
    pages: pages.map(mapPage),
    assignmentGroups: assignmentGroups.map(mapAssignmentGroup),
    assignments: assignments.map(mapAssignment),
  };
}

export function createCanvasPlannerItemsSnapshotPayload(
  items: readonly CanvasPlannerItem[],
): readonly CanvasSyncPlannerItemPayload[] {
  const payloads = items.flatMap((item) => {
    const mapped = mapPlannerItem(item);
    return mapped ? [mapped] : [];
  });
  return dedupeByIdentity(payloads, (item) => item.canvas_planner_item_id);
}

export function createCanvasAnnouncementsSnapshotPayload({
  announcements,
  canvasCourseId,
}: {
  readonly announcements: readonly CanvasAnnouncement[];
  readonly canvasCourseId: string;
}): readonly CanvasSyncAnnouncementPayload[] {
  return dedupeByIdentity(
    announcements.map((announcement) => mapAnnouncement(canvasCourseId, announcement)),
    (announcement) => announcement.canvas_announcement_id,
  );
}

export function resourceCountsForSnapshot(
  snapshot: CanvasCourseSnapshotPayload,
): CanvasSyncResourceCounts {
  return {
    modules: snapshot.modules.length,
    moduleItems: snapshot.moduleItems.length,
    pages: snapshot.pages.length,
    assignmentGroups: snapshot.assignmentGroups.length,
    assignments: snapshot.assignments.length,
    plannerItems: 0,
    announcements: 0,
    files: 0,
    fileReferences: 0,
  };
}

export function addResourceCounts(
  left: CanvasSyncResourceCounts,
  right: CanvasSyncResourceCounts,
): CanvasSyncResourceCounts {
  return {
    modules: left.modules + right.modules,
    moduleItems: left.moduleItems + right.moduleItems,
    pages: left.pages + right.pages,
    assignmentGroups: left.assignmentGroups + right.assignmentGroups,
    assignments: left.assignments + right.assignments,
    plannerItems: left.plannerItems + right.plannerItems,
    announcements: left.announcements + right.announcements,
    files: left.files + right.files,
    fileReferences: left.fileReferences + right.fileReferences,
  };
}

export function emptyResourceCounts(): CanvasSyncResourceCounts {
  return {
    modules: 0,
    moduleItems: 0,
    pages: 0,
    assignmentGroups: 0,
    assignments: 0,
    plannerItems: 0,
    announcements: 0,
    files: 0,
    fileReferences: 0,
  };
}

function mapCourse(course: CanvasCourse): CanvasSyncCoursePayload {
  return {
    canvas_course_id: requiredIdentifier(course.id, "course"),
    name: requiredText(course.name, "course name"),
    course_code: nullableText(course.courseCode),
    workflow_state: nullableText(course.workflowState),
    enrollment_term_id: nullableIdentifier(course.enrollmentTermId),
    account_id: nullableIdentifier(course.accountId),
    start_at: course.startAt,
    end_at: course.endAt,
    time_zone: nullableText(course.timeZone),
    public_syllabus: course.publicSyllabus,
    syllabus_body: course.syllabusBody,
    canvas_updated_at: course.updatedAt,
  };
}

function mapModule(module: CanvasModule): CanvasSyncModulePayload {
  return {
    canvas_module_id: requiredIdentifier(module.id, "module"),
    name: requiredText(module.name, "module name"),
    position: module.position,
    unlock_at: module.unlockAt,
    item_count: module.itemCount,
    require_sequential_progress: module.requireSequentialProgress,
    published: module.published,
    prerequisite_module_ids: module.prerequisiteModuleIds.map((id) =>
      requiredIdentifier(id, "prerequisite module"),
    ),
    canvas_state: nullableText(module.state),
  };
}

function mapModuleItem(
  moduleId: string,
  item: CanvasModuleItem,
): CanvasSyncModuleItemPayload {
  return {
    canvas_module_id: requiredIdentifier(moduleId, "module"),
    canvas_module_item_id: requiredIdentifier(item.id, "module item"),
    title: requiredText(item.title, "module item title"),
    position: item.position,
    indent: item.indent,
    item_type: requiredText(item.type, "module item type"),
    canvas_content_id: nullableIdentifier(item.contentId),
    page_url: nullableText(item.pageUrl),
    external_url: nullableText(item.externalUrl),
    html_url: nullableText(item.htmlUrl),
    new_tab: item.newTab,
    published: item.published,
    completion_requirement: jsonObjectOrNull(item.completionRequirement),
    content_details: jsonObjectOrNull(item.contentDetails),
  };
}

function mapPage(page: CanvasPageDetail): CanvasSyncPagePayload {
  return {
    canvas_page_id: nullableIdentifier(page.pageId),
    canvas_page_url: requiredText(page.url, "Page URL"),
    title: requiredText(page.title, "Page title"),
    body_html: page.body,
    published: page.published,
    front_page: page.frontPage,
    editing_roles: nullableText(page.editingRoles),
    lock_info: jsonObjectOrNull(page.lockInfo),
    unlock_at: page.unlockAt,
    lock_at: page.lockAt,
    canvas_created_at: page.createdAt,
    canvas_updated_at: page.updatedAt,
  };
}

function mapAssignmentGroup(
  group: CanvasAssignmentGroup,
): CanvasSyncAssignmentGroupPayload {
  return {
    canvas_assignment_group_id: requiredIdentifier(group.id, "assignment group"),
    name: requiredText(group.name, "assignment group name"),
    position: group.position,
    group_weight: group.groupWeight,
    rules: jsonObjectOrNull(group.rules),
    integration_data: jsonObjectOrNull(group.integrationData),
  };
}

function mapAssignment(assignment: CanvasAssignment): CanvasSyncAssignmentPayload {
  return {
    canvas_assignment_id: requiredIdentifier(assignment.id, "assignment"),
    canvas_assignment_group_id: nullableIdentifier(assignment.assignmentGroupId),
    name: requiredText(assignment.name, "assignment name"),
    description_html: assignment.description,
    position: assignment.position,
    points_possible: assignment.pointsPossible,
    grading_type: nullableText(assignment.gradingType),
    submission_types: assignment.submissionTypes.map((type) =>
      requiredText(type, "submission type"),
    ),
    due_at: assignment.dueAt,
    unlock_at: assignment.unlockAt,
    lock_at: assignment.lockAt,
    published: assignment.published,
    muted: assignment.muted,
    omit_from_final_grade: assignment.omitFromFinalGrade,
    anonymous_grading: assignment.anonymousGrading,
    html_url: nullableText(assignment.htmlUrl),
    quiz_id: nullableIdentifier(assignment.quizId),
    discussion_topic_id: nullableIdentifier(assignment.discussionTopicId),
    canvas_created_at: assignment.createdAt,
    canvas_updated_at: assignment.updatedAt,
  };
}

function mapPlannerItem(
  item: CanvasPlannerItem,
): CanvasSyncPlannerItemPayload | null {
  const contextCode = nullableText(item.contextCode);
  if (contextCode !== null && !isCourseContextCode(contextCode)) {
    return null;
  }
  if (item.contextType !== null && item.contextType.toLowerCase() === "group") {
    return null;
  }

  const canvasCourseId = nullableIdentifier(item.courseId);
  const plannableType = normalizeCanvasTypeName(item.plannableType);
  const plannableId = requiredIdentifier(item.plannableId, "planner plannable");
  const identity = `${contextCode ?? "no_context"}:${plannableType}:${plannableId}`;
  const payloadWithoutFingerprint = {
    canvas_planner_item_id: identity,
    context_code: contextCode,
    canvas_course_id: canvasCourseId,
    plannable_type: plannableType,
    plannable_id: plannableId,
    title: nullableText(item.title),
    planner_date: nullableDate(item.plannerDate),
    due_at: nullableDate(item.dueAt),
    todo_date: nullableDate(item.todoDate),
    html_url: nullableText(item.htmlUrl),
    workflow_state:
      nullableText(item.workflowState) ??
      nullableText(item.plannerOverride?.workflowState ?? null),
    marked_complete: item.plannerOverride?.markedComplete ?? null,
    dismissed: item.plannerOverride?.dismissed ?? null,
    submission_excused: item.submission?.excused ?? null,
    submission_graded: item.submission?.graded ?? null,
    submission_late: item.submission?.late ?? null,
    submission_missing: item.submission?.missing ?? null,
    submission_needs_grading: item.submission?.needsGrading ?? null,
    submission_with_feedback: item.submission?.withFeedback ?? null,
  } satisfies Omit<CanvasSyncPlannerItemPayload, "source_fingerprint">;

  return {
    ...payloadWithoutFingerprint,
    source_fingerprint: fingerprintNormalizedPayload(
      "canvas-planner-item-v1",
      payloadWithoutFingerprint,
    ),
  };
}

function mapAnnouncement(
  canvasCourseId: string,
  announcement: CanvasAnnouncement,
): CanvasSyncAnnouncementPayload {
  const normalizedCourseId = requiredIdentifier(canvasCourseId, "course");
  const contextCode = nullableText(announcement.contextCode);
  if (contextCode !== null && contextCode !== `course_${normalizedCourseId}`) {
    throw new CanvasSyncNormalizationError(
      "announcement context code does not match course.",
    );
  }

  const payloadWithoutFingerprint = {
    canvas_announcement_id: requiredIdentifier(
      announcement.id,
      "announcement",
    ),
    canvas_course_id: normalizedCourseId,
    title: requiredText(announcement.title, "announcement title"),
    message_html: announcement.message,
    posted_at: nullableDate(announcement.postedAt),
    delayed_post_at: nullableDate(announcement.delayedPostAt),
    lock_at: nullableDate(announcement.lockAt),
    todo_date: nullableDate(announcement.todoDate),
    workflow_state: nullableText(announcement.workflowState),
    published: announcement.published,
    locked: announcement.locked,
    html_url: nullableText(announcement.htmlUrl),
  } satisfies Omit<CanvasSyncAnnouncementPayload, "source_fingerprint">;

  return {
    ...payloadWithoutFingerprint,
    source_fingerprint: fingerprintNormalizedPayload(
      "canvas-announcement-v1",
      payloadWithoutFingerprint,
    ),
  };
}

function requiredIdentifier(value: string, label: string): string {
  const normalized = nullableIdentifier(value);
  if (!normalized) {
    throw new CanvasSyncNormalizationError(`${label} identifier is required.`);
  }
  return normalized;
}

function nullableIdentifier(value: string | null): string | null {
  return nullableText(value);
}

function requiredText(value: string, label: string): string {
  const normalized = nullableText(value);
  if (!normalized) {
    throw new CanvasSyncNormalizationError(`${label} is required.`);
  }
  return normalized;
}

function nullableText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableDate(value: string | null): string | null {
  const text = nullableText(value);
  if (text === null) {
    return null;
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    throw new CanvasSyncNormalizationError("Canvas date value is invalid.");
  }
  return new Date(parsed).toISOString();
}

function jsonObjectOrNull(value: CanvasJsonObject | null): Json | null {
  return value;
}

function normalizeCanvasTypeName(value: string): string {
  const normalized = requiredText(value, "Canvas type")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    throw new CanvasSyncNormalizationError("Canvas type is invalid.");
  }
  return normalized;
}

function isCourseContextCode(value: string): boolean {
  return /^course_[^_\s]+$/.test(value);
}

function dedupeByIdentity<TItem>(
  items: readonly TItem[],
  identityForItem: (item: TItem) => string,
): readonly TItem[] {
  const sorted = [...items].sort((left, right) => {
    const leftIdentity = identityForItem(left);
    const rightIdentity = identityForItem(right);
    if (leftIdentity !== rightIdentity) {
      return leftIdentity.localeCompare(rightIdentity);
    }
    return JSON.stringify(left).localeCompare(JSON.stringify(right));
  });
  const seen = new Set<string>();
  const deduped: TItem[] = [];
  for (const item of sorted) {
    const identity = identityForItem(item);
    if (!seen.has(identity)) {
      seen.add(identity);
      deduped.push(item);
    }
  }
  return deduped;
}

function fingerprintNormalizedPayload(
  version: string,
  payload: Readonly<Record<string, Json | undefined>>,
): string {
  return createHash("sha256")
    .update(version)
    .update("\n")
    .update(canonicalSerialize(payload))
    .digest("hex");
}

function canonicalSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) {
    return ["undefined"];
  }
  if (value === null) {
    return ["null"];
  }
  if (typeof value === "string") {
    return ["string", value];
  }
  if (typeof value === "number") {
    return ["number", value];
  }
  if (typeof value === "boolean") {
    return ["boolean", value];
  }
  if (Array.isArray(value)) {
    return ["array", value.map(canonicalize)];
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Readonly<Record<string, unknown>>;
    return [
      "object",
      Object.keys(record)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, canonicalize(record[key])]),
    ];
  }
  return ["unsupported", String(value)];
}
