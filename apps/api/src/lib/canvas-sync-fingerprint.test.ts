import { describe, expect, it } from "vitest";

import {
  CANVAS_COURSE_SNAPSHOT_FINGERPRINT_VERSION,
  fingerprintCanvasCourseSnapshot,
} from "@/lib/canvas-sync-fingerprint";
import type { CanvasCourseSnapshotPayload } from "@/lib/canvas-sync-normalize";

describe("fingerprintCanvasCourseSnapshot", () => {
  it("returns an explicit version and stable value for identical snapshots", () => {
    const left = fingerprintCanvasCourseSnapshot(snapshot());
    const right = fingerprintCanvasCourseSnapshot(snapshot());

    expect(left).toEqual(right);
    expect(left.version).toBe(CANVAS_COURSE_SNAPSHOT_FINGERPRINT_VERSION);
    expect(left.value).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is stable across object-key insertion order", () => {
    const reordered = snapshot();
    reordered.course = {
      canvas_updated_at: reordered.course.canvas_updated_at,
      syllabus_body: reordered.course.syllabus_body,
      public_syllabus: reordered.course.public_syllabus,
      time_zone: reordered.course.time_zone,
      end_at: reordered.course.end_at,
      start_at: reordered.course.start_at,
      account_id: reordered.course.account_id,
      enrollment_term_id: reordered.course.enrollment_term_id,
      workflow_state: reordered.course.workflow_state,
      course_code: reordered.course.course_code,
      name: reordered.course.name,
      canvas_course_id: reordered.course.canvas_course_id,
    };

    expect(fingerprintCanvasCourseSnapshot(reordered)).toEqual(
      fingerprintCanvasCourseSnapshot(snapshot()),
    );
  });

  it("is stable across collection order when Canvas identities match", () => {
    const reordered = snapshot();
    reordered.modules = [reordered.modules[1]!, reordered.modules[0]!];
    reordered.moduleItems = [
      reordered.moduleItems[1]!,
      reordered.moduleItems[0]!,
    ];
    reordered.pages = [reordered.pages[1]!, reordered.pages[0]!];
    reordered.assignmentGroups = [
      reordered.assignmentGroups[1]!,
      reordered.assignmentGroups[0]!,
    ];
    reordered.assignments = [
      reordered.assignments[1]!,
      reordered.assignments[0]!,
    ];

    expect(fingerprintCanvasCourseSnapshot(reordered)).toEqual(
      fingerprintCanvasCourseSnapshot(snapshot()),
    );
  });

  it.each([
    ["module title", (next: MutableSnapshot) => {
      next.modules[0] = { ...next.modules[0]!, name: "Changed module" };
    }],
    ["module-item field", (next: MutableSnapshot) => {
      next.moduleItems[0] = { ...next.moduleItems[0]!, published: false };
    }],
    ["Page body", (next: MutableSnapshot) => {
      next.pages[0] = { ...next.pages[0]!, body_html: "<p>Changed.</p>" };
    }],
    ["assignment due date", (next: MutableSnapshot) => {
      next.assignments[0] = {
        ...next.assignments[0]!,
        due_at: "2026-08-01T01:00:00.000Z",
      };
    }],
    ["assignment description", (next: MutableSnapshot) => {
      next.assignments[0] = {
        ...next.assignments[0]!,
        description_html: "<p>Changed.</p>",
      };
    }],
  ])("%s changes the fingerprint", (_name, mutate) => {
    const base = snapshot();
    const changed = snapshot();
    mutate(changed);

    expect(fingerprintCanvasCourseSnapshot(changed).value).not.toBe(
      fingerprintCanvasCourseSnapshot(base).value,
    );
  });

  it("preserves null, false, empty array, and absent distinctions", () => {
    const withNull = snapshot();
    withNull.course.course_code = null;

    const withoutCourseCode = snapshot() as unknown as {
      course: Record<string, unknown>;
    };
    delete withoutCourseCode.course.course_code;

    const withFalse = snapshot();
    withFalse.course.public_syllabus = false;

    const withoutFalse = snapshot() as unknown as {
      course: Record<string, unknown>;
    };
    delete withoutFalse.course.public_syllabus;

    const withEmptyArray = snapshot();
    withEmptyArray.modules[0] = {
      ...withEmptyArray.modules[0]!,
      prerequisite_module_ids: [],
    };

    const withoutArray = snapshot() as unknown as {
      modules: Array<Record<string, unknown>>;
    };
    delete withoutArray.modules[0]!.prerequisite_module_ids;

    expect(
      fingerprintCanvasCourseSnapshot(
        withoutCourseCode as unknown as CanvasCourseSnapshotPayload,
      ).value,
    ).not.toBe(fingerprintCanvasCourseSnapshot(withNull).value);
    expect(
      fingerprintCanvasCourseSnapshot(
        withoutFalse as unknown as CanvasCourseSnapshotPayload,
      ).value,
    ).not.toBe(fingerprintCanvasCourseSnapshot(withFalse).value);
    expect(
      fingerprintCanvasCourseSnapshot(
        withoutArray as unknown as CanvasCourseSnapshotPayload,
      ).value,
    ).not.toBe(fingerprintCanvasCourseSnapshot(withEmptyArray).value);
  });

  it("ignores local sync timestamps and internal UUIDs outside the payload contract", () => {
    const withLocalMetadata = snapshot() as unknown as {
      course: Record<string, unknown>;
      modules: Array<Record<string, unknown>>;
      pages: Array<Record<string, unknown>>;
    };
    withLocalMetadata.course.id = "internal-course-1";
    withLocalMetadata.course.user_id = "user-1";
    withLocalMetadata.course.canvas_connection_id = "connection-1";
    withLocalMetadata.course.first_synced_at = "2026-07-01T00:00:00.000Z";
    withLocalMetadata.course.last_synced_at = "2026-07-01T00:00:00.000Z";
    withLocalMetadata.modules[0]!.id = "internal-module-1";
    withLocalMetadata.pages[0]!.updated_at = "local-updated";

    const changedLocalMetadata = snapshot() as unknown as {
      course: Record<string, unknown>;
      modules: Array<Record<string, unknown>>;
      pages: Array<Record<string, unknown>>;
    };
    changedLocalMetadata.course.id = "internal-course-2";
    changedLocalMetadata.course.user_id = "user-2";
    changedLocalMetadata.course.canvas_connection_id = "connection-2";
    changedLocalMetadata.course.first_synced_at = "2026-07-02T00:00:00.000Z";
    changedLocalMetadata.course.last_synced_at = "2026-07-02T00:00:00.000Z";
    changedLocalMetadata.modules[0]!.id = "internal-module-2";
    changedLocalMetadata.pages[0]!.updated_at = "other-local-updated";

    expect(
      fingerprintCanvasCourseSnapshot(
        withLocalMetadata as unknown as CanvasCourseSnapshotPayload,
      ),
    ).toEqual(
      fingerprintCanvasCourseSnapshot(
        changedLocalMetadata as unknown as CanvasCourseSnapshotPayload,
      ),
    );
  });
});

type MutableSnapshot = DeepMutable<CanvasCourseSnapshotPayload>;

type DeepMutable<TValue> = TValue extends readonly (infer TEntry)[]
  ? DeepMutable<TEntry>[]
  : TValue extends object
    ? { -readonly [Key in keyof TValue]: DeepMutable<TValue[Key]> }
    : TValue;

function snapshot(): MutableSnapshot {
  return {
    course: {
      canvas_course_id: "course-1",
      name: "Fictional Course",
      course_code: "FC101",
      workflow_state: "available",
      enrollment_term_id: "term-1",
      account_id: "account-1",
      start_at: "2026-07-01T00:00:00.000Z",
      end_at: null,
      time_zone: "Asia/Manila",
      public_syllabus: false,
      syllabus_body: "<p>Syllabus.</p>",
      canvas_updated_at: "2026-07-02T00:00:00.000Z",
    },
    modules: [
      {
        canvas_module_id: "module-2",
        name: "Module Two",
        position: 2,
        unlock_at: null,
        item_count: 1,
        require_sequential_progress: false,
        published: true,
        prerequisite_module_ids: ["module-1"],
        canvas_state: "active",
      },
      {
        canvas_module_id: "module-1",
        name: "Module One",
        position: 1,
        unlock_at: null,
        item_count: 1,
        require_sequential_progress: false,
        published: true,
        prerequisite_module_ids: [],
        canvas_state: "active",
      },
    ],
    moduleItems: [
      {
        canvas_module_id: "module-2",
        canvas_module_item_id: "item-2",
        title: "Item Two",
        position: 2,
        indent: 0,
        item_type: "Page",
        canvas_content_id: null,
        page_url: "page-two",
        external_url: null,
        html_url: "https://canvas.example.invalid/item-two",
        new_tab: false,
        published: true,
        completion_requirement: { type: "must_view" },
        content_details: { points_possible: 0 },
      },
      {
        canvas_module_id: "module-1",
        canvas_module_item_id: "item-1",
        title: "Item One",
        position: 1,
        indent: 0,
        item_type: "Page",
        canvas_content_id: null,
        page_url: "page-one",
        external_url: null,
        html_url: "https://canvas.example.invalid/item-one",
        new_tab: false,
        published: true,
        completion_requirement: { type: "must_view" },
        content_details: { points_possible: 0 },
      },
    ],
    pages: [
      {
        canvas_page_id: "page-2",
        canvas_page_url: "page-two",
        title: "Page Two",
        body_html: "<p>Page two.</p>",
        published: true,
        front_page: false,
        editing_roles: "teachers",
        lock_info: { locked: false },
        unlock_at: null,
        lock_at: null,
        canvas_created_at: "2026-07-01T00:00:00.000Z",
        canvas_updated_at: "2026-07-02T00:00:00.000Z",
      },
      {
        canvas_page_id: "page-1",
        canvas_page_url: "page-one",
        title: "Page One",
        body_html: "<p>Page one.</p>",
        published: true,
        front_page: false,
        editing_roles: "teachers",
        lock_info: { locked: false },
        unlock_at: null,
        lock_at: null,
        canvas_created_at: "2026-07-01T00:00:00.000Z",
        canvas_updated_at: "2026-07-02T00:00:00.000Z",
      },
    ],
    assignmentGroups: [
      {
        canvas_assignment_group_id: "group-2",
        name: "Group Two",
        position: 2,
        group_weight: 50,
        rules: { drop_lowest: 0 },
        integration_data: { source: "canvas" },
      },
      {
        canvas_assignment_group_id: "group-1",
        name: "Group One",
        position: 1,
        group_weight: 50,
        rules: { drop_lowest: 0 },
        integration_data: { source: "canvas" },
      },
    ],
    assignments: [
      {
        canvas_assignment_id: "assignment-2",
        canvas_assignment_group_id: "group-2",
        name: "Assignment Two",
        description_html: "<p>Assignment two.</p>",
        position: 2,
        points_possible: 20,
        grading_type: "points",
        submission_types: ["online_upload"],
        due_at: "2026-07-15T00:00:00.000Z",
        unlock_at: null,
        lock_at: null,
        published: true,
        muted: false,
        omit_from_final_grade: false,
        anonymous_grading: false,
        html_url: "https://canvas.example.invalid/assignment-two",
        quiz_id: null,
        discussion_topic_id: null,
        canvas_created_at: "2026-07-01T00:00:00.000Z",
        canvas_updated_at: "2026-07-02T00:00:00.000Z",
      },
      {
        canvas_assignment_id: "assignment-1",
        canvas_assignment_group_id: "group-1",
        name: "Assignment One",
        description_html: "<p>Assignment one.</p>",
        position: 1,
        points_possible: 10,
        grading_type: "points",
        submission_types: ["online_upload"],
        due_at: "2026-07-10T00:00:00.000Z",
        unlock_at: null,
        lock_at: null,
        published: true,
        muted: false,
        omit_from_final_grade: false,
        anonymous_grading: false,
        html_url: "https://canvas.example.invalid/assignment-one",
        quiz_id: null,
        discussion_topic_id: null,
        canvas_created_at: "2026-07-01T00:00:00.000Z",
        canvas_updated_at: "2026-07-02T00:00:00.000Z",
      },
    ],
  };
}
