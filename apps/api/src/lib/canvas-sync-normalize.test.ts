import type { CanvasAnnouncement, CanvasPlannerItem } from "@stay-focused/canvas";
import { describe, expect, it } from "vitest";

import {
  createCanvasAnnouncementsSnapshotPayload,
  createCanvasPlannerItemsSnapshotPayload,
} from "@/lib/canvas-sync-normalize";

describe("Canvas planner and announcement normalization", () => {
  it("normalizes planner assignment references without retaining nested payloads", () => {
    const [payload] = createCanvasPlannerItemsSnapshotPayload([
      plannerItem({
        plannerOverride: {
          id: "override-1",
          plannableType: "Assignment",
          plannableId: "assignment-1",
          workflowState: "completed",
          markedComplete: true,
          dismissed: false,
          deletedAt: null,
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-02T00:00:00.000Z",
        },
        submission: {
          excused: false,
          graded: true,
          late: false,
          missing: false,
          needsGrading: false,
          withFeedback: true,
        },
      }),
    ]);

    expect(payload).toMatchObject({
      canvas_planner_item_id: "course_course-1:assignment:assignment-1",
      context_code: "course_course-1",
      canvas_course_id: "course-1",
      plannable_type: "assignment",
      plannable_id: "assignment-1",
      planner_date: "2026-07-10T00:00:00.000Z",
      marked_complete: true,
      submission_graded: true,
      submission_with_feedback: true,
    });
    expect(Object.keys(payload ?? {})).not.toContain("plannable");
    expect(Object.keys(payload ?? {})).not.toContain("submission_history");
  });

  it("allows null-course planner items and skips non-course contexts", () => {
    const payload = createCanvasPlannerItemsSnapshotPayload([
      plannerItem({
        contextCode: null,
        contextType: null,
        courseId: null,
        plannableId: "note-1",
        plannableType: "planner-note",
        title: null,
      }),
      plannerItem({
        contextCode: "group_1",
        contextType: "Group",
        courseId: null,
        plannableId: "group-note",
      }),
    ]);

    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      canvas_planner_item_id: "no_context:planner_note:note-1",
      canvas_course_id: null,
      context_code: null,
      title: null,
    });
  });

  it("rejects malformed planner identities and deduplicates deterministically", () => {
    expect(() =>
      createCanvasPlannerItemsSnapshotPayload([
        plannerItem({ plannableId: "   " }),
      ]),
    ).toThrow(/identifier/);

    const first = createCanvasPlannerItemsSnapshotPayload([
      plannerItem({ title: "B" }),
      plannerItem({ title: "A" }),
    ]);
    const second = createCanvasPlannerItemsSnapshotPayload([
      plannerItem({ title: "A" }),
      plannerItem({ title: "B" }),
    ]);

    expect(first).toHaveLength(1);
    expect(second).toEqual(first);
  });

  it("normalizes announcements with safe HTML and deterministic fingerprints", () => {
    const first = createCanvasAnnouncementsSnapshotPayload({
      canvasCourseId: "course-1",
      announcements: [
        announcement({
          delayedPostAt: "2026-07-11T00:00:00.000Z",
          message: "<p>Fictional announcement.</p>",
          postedAt: null,
        }),
      ],
    });
    const second = createCanvasAnnouncementsSnapshotPayload({
      canvasCourseId: "course-1",
      announcements: [
        announcement({
          delayedPostAt: "2026-07-11T00:00:00.000Z",
          message: "<p>Fictional announcement.</p>",
          postedAt: null,
        }),
      ],
    });
    const changed = createCanvasAnnouncementsSnapshotPayload({
      canvasCourseId: "course-1",
      announcements: [announcement({ title: "Changed title" })],
    });

    expect(first[0]).toMatchObject({
      canvas_announcement_id: "announcement-1",
      canvas_course_id: "course-1",
      message_html: "<p>Fictional announcement.</p>",
      posted_at: null,
      delayed_post_at: "2026-07-11T00:00:00.000Z",
    });
    expect(second[0]?.source_fingerprint).toBe(first[0]?.source_fingerprint);
    expect(changed[0]?.source_fingerprint).not.toBe(
      first[0]?.source_fingerprint,
    );
  });

  it("rejects announcements whose context does not match the requested course", () => {
    expect(() =>
      createCanvasAnnouncementsSnapshotPayload({
        canvasCourseId: "course-1",
        announcements: [announcement({ contextCode: "course_course-2" })],
      }),
    ).toThrow(/context code/);
  });
});

function plannerItem(
  overrides: Partial<CanvasPlannerItem> = {},
): CanvasPlannerItem {
  return {
    contextType: "Course",
    contextCode: "course_course-1",
    courseId: "course-1",
    plannableId: "assignment-1",
    plannableType: "Assignment",
    title: "Fictional planner item",
    plannerDate: "2026-07-10T00:00:00+00:00",
    dueAt: "2026-07-10T00:00:00+00:00",
    todoDate: null,
    htmlUrl: "https://canvas.example.invalid/planner",
    workflowState: "published",
    plannerOverride: null,
    submission: null,
    ...overrides,
  };
}

function announcement(
  overrides: Partial<CanvasAnnouncement> = {},
): CanvasAnnouncement {
  return {
    id: "announcement-1",
    contextCode: "course_course-1",
    title: "Fictional announcement",
    message: null,
    postedAt: "2026-07-10T00:00:00+00:00",
    delayedPostAt: null,
    lockAt: null,
    todoDate: null,
    workflowState: "active",
    published: true,
    locked: false,
    htmlUrl: "https://canvas.example.invalid/announcement",
    ...overrides,
  };
}
