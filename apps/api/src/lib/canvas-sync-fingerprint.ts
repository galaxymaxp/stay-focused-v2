import { createHash } from "node:crypto";

import type {
  CanvasCourseSnapshotPayload,
  CanvasSyncAssignmentGroupPayload,
  CanvasSyncAssignmentPayload,
  CanvasSyncCoursePayload,
  CanvasSyncModuleItemPayload,
  CanvasSyncModulePayload,
  CanvasSyncPagePayload,
} from "@/lib/canvas-sync-normalize";

export const CANVAS_COURSE_SNAPSHOT_FINGERPRINT_VERSION =
  "canvas-course-snapshot-v1";

export interface CanvasCourseSnapshotFingerprint {
  readonly value: string;
  readonly version: typeof CANVAS_COURSE_SNAPSHOT_FINGERPRINT_VERSION;
}

const COURSE_FIELDS = [
  "canvas_course_id",
  "name",
  "course_code",
  "workflow_state",
  "enrollment_term_id",
  "account_id",
  "start_at",
  "end_at",
  "time_zone",
  "public_syllabus",
  "syllabus_body",
  "canvas_updated_at",
] as const satisfies readonly (keyof CanvasSyncCoursePayload)[];

const MODULE_FIELDS = [
  "canvas_module_id",
  "name",
  "position",
  "unlock_at",
  "item_count",
  "require_sequential_progress",
  "published",
  "prerequisite_module_ids",
  "canvas_state",
] as const satisfies readonly (keyof CanvasSyncModulePayload)[];

const MODULE_ITEM_FIELDS = [
  "canvas_module_id",
  "canvas_module_item_id",
  "title",
  "position",
  "indent",
  "item_type",
  "canvas_content_id",
  "page_url",
  "external_url",
  "html_url",
  "new_tab",
  "published",
  "completion_requirement",
  "content_details",
] as const satisfies readonly (keyof CanvasSyncModuleItemPayload)[];

const PAGE_FIELDS = [
  "canvas_page_id",
  "canvas_page_url",
  "title",
  "body_html",
  "published",
  "front_page",
  "editing_roles",
  "lock_info",
  "unlock_at",
  "lock_at",
  "canvas_created_at",
  "canvas_updated_at",
] as const satisfies readonly (keyof CanvasSyncPagePayload)[];

const ASSIGNMENT_GROUP_FIELDS = [
  "canvas_assignment_group_id",
  "name",
  "position",
  "group_weight",
  "rules",
  "integration_data",
] as const satisfies readonly (keyof CanvasSyncAssignmentGroupPayload)[];

const ASSIGNMENT_FIELDS = [
  "canvas_assignment_id",
  "canvas_assignment_group_id",
  "name",
  "description_html",
  "position",
  "points_possible",
  "grading_type",
  "submission_types",
  "due_at",
  "unlock_at",
  "lock_at",
  "published",
  "muted",
  "omit_from_final_grade",
  "anonymous_grading",
  "html_url",
  "quiz_id",
  "discussion_topic_id",
  "canvas_created_at",
  "canvas_updated_at",
] as const satisfies readonly (keyof CanvasSyncAssignmentPayload)[];

export function fingerprintCanvasCourseSnapshot(
  snapshot: CanvasCourseSnapshotPayload,
): CanvasCourseSnapshotFingerprint {
  const canonicalSnapshot = canonicalSnapshotPayload(snapshot);
  const canonical = canonicalSerialize(canonicalSnapshot);
  const value = createHash("sha256")
    .update(CANVAS_COURSE_SNAPSHOT_FINGERPRINT_VERSION)
    .update("\n")
    .update(canonical)
    .digest("hex");

  return {
    value,
    version: CANVAS_COURSE_SNAPSHOT_FINGERPRINT_VERSION,
  };
}

export function canonicalSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalSnapshotPayload(
  snapshot: CanvasCourseSnapshotPayload,
): Readonly<Record<string, unknown>> {
  const source = snapshot as unknown as Readonly<Record<string, unknown>>;
  const canonical: Record<string, unknown> = {};

  if (hasOwn(source, "course")) {
    canonical.course = pickKnownFields(
      source.course,
      COURSE_FIELDS,
      normalizeCourseField,
    );
  }
  if (hasOwn(source, "modules")) {
    canonical.modules = sortByKeys(
      readArray(source.modules).map((module) =>
        pickKnownFields(module, MODULE_FIELDS, normalizeModuleField),
      ),
      ["canvas_module_id"],
    );
  }
  if (hasOwn(source, "moduleItems")) {
    canonical.moduleItems = sortByKeys(
      readArray(source.moduleItems).map((item) =>
        pickKnownFields(item, MODULE_ITEM_FIELDS, normalizeModuleItemField),
      ),
      ["canvas_module_id", "canvas_module_item_id"],
    );
  }
  if (hasOwn(source, "pages")) {
    canonical.pages = sortByKeys(
      readArray(source.pages).map((page) =>
        pickKnownFields(page, PAGE_FIELDS, normalizePageField),
      ),
      ["canvas_page_url", "canvas_page_id"],
    );
  }
  if (hasOwn(source, "assignmentGroups")) {
    canonical.assignmentGroups = sortByKeys(
      readArray(source.assignmentGroups).map((group) =>
        pickKnownFields(
          group,
          ASSIGNMENT_GROUP_FIELDS,
          normalizeAssignmentGroupField,
        ),
      ),
      ["canvas_assignment_group_id"],
    );
  }
  if (hasOwn(source, "assignments")) {
    canonical.assignments = sortByKeys(
      readArray(source.assignments).map((assignment) =>
        pickKnownFields(
          assignment,
          ASSIGNMENT_FIELDS,
          normalizeAssignmentField,
        ),
      ),
      ["canvas_assignment_id"],
    );
  }

  return canonical;
}

function normalizeCourseField(
  _key: string,
  value: unknown,
): unknown {
  return value;
}

function normalizeModuleField(key: string, value: unknown): unknown {
  if (key === "prerequisite_module_ids" && Array.isArray(value)) {
    return [...value].sort(compareScalar);
  }
  return value;
}

function normalizeModuleItemField(
  _key: string,
  value: unknown,
): unknown {
  return value;
}

function normalizePageField(_key: string, value: unknown): unknown {
  return value;
}

function normalizeAssignmentGroupField(
  _key: string,
  value: unknown,
): unknown {
  return value;
}

function normalizeAssignmentField(key: string, value: unknown): unknown {
  if (key === "submission_types" && Array.isArray(value)) {
    return [...value].sort(compareScalar);
  }
  return value;
}

function pickKnownFields(
  value: unknown,
  fields: readonly string[],
  normalizeField: (key: string, value: unknown) => unknown,
): Readonly<Record<string, unknown>> {
  const record = isRecord(value) ? value : {};
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    if (hasOwn(record, field)) {
      picked[field] = normalizeField(field, record[field]);
    }
  }
  return picked;
}

function sortByKeys<TEntry extends Readonly<Record<string, unknown>>>(
  entries: readonly TEntry[],
  keys: readonly string[],
): readonly TEntry[] {
  return [...entries].sort((left, right) => {
    for (const key of keys) {
      const compared = String(left[key] ?? "").localeCompare(
        String(right[key] ?? ""),
      );
      if (compared !== 0) {
        return compared;
      }
    }
    return 0;
  });
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
  if (isRecord(value)) {
    return [
      "object",
      Object.keys(value)
        .sort(compareScalar)
        .map((key) => [key, canonicalize(value[key])]),
    ];
  }
  return ["unsupported", String(value)];
}

function readArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function compareScalar(left: unknown, right: unknown): number {
  return String(left).localeCompare(String(right));
}

function hasOwn(
  value: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
