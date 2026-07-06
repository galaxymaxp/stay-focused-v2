import type {
  CanvasAnnouncement,
  CanvasAssignment,
  CanvasFile,
  CanvasModule,
  CanvasModuleItem,
  CanvasPageDetail,
} from "@stay-focused/canvas";
import { describe, expect, it } from "vitest";

import { createCanvasFileInventoryPayload } from "@/lib/canvas-file-normalize";

describe("Canvas file inventory normalization", () => {
  it("normalizes file metadata and bounded references without content extraction", () => {
    const payload = createCanvasFileInventoryPayload({
      announcements: [
        announcement({
          message:
            '<a data-api-endpoint="https://canvas.test/api/v1/files/10">File</a>',
        }),
      ],
      assignments: [
        assignment({
          description:
            '<a href="/api/v1/courses/course-1/files/10?download=1">File</a>' +
            '<a href="/courses/other-course/files/10">Wrong course</a>' +
            '<a href="/files/999">Stale file</a>',
        }),
      ],
      canvasBaseUrl: "https://canvas.test",
      canvasCourseId: "course-1",
      files: [
        canvasFile({ id: "10" }),
        canvasFile({
          contentType: "video/mp4",
          displayName: "Lecture Recording.mp4",
          filename: "lecture-recording.mp4",
          id: "11",
          mediaClass: "video",
          size: 4_096,
        }),
        canvasFile({
          contentType: "application/x-msdownload",
          displayName: "Unsafe.exe",
          filename: "unsafe.exe",
          id: "12",
          size: 512,
        }),
      ],
      moduleItemsByModule: [
        {
          module: moduleFixture(),
          items: [moduleItem({ contentId: "10", type: "File" })],
        },
      ],
      pages: [
        page({
          body:
            '<a href="/courses/course-1/files/10?wrap=1">File</a>' +
            '<img src="https://outside.example.test/file.png">',
        }),
      ],
    });

    expect(payload.files).toEqual([
      expect.objectContaining({
        canvas_file_id: "10",
        content_type: "application/pdf",
        display_name: "Lecture Notes.pdf",
        ingestion_eligibility: "eligible_document",
        ingestion_status: "not_requested",
      }),
      expect.objectContaining({
        canvas_file_id: "11",
        ingestion_eligibility: "metadata_only_media",
        ingestion_status: "metadata_only",
      }),
      expect.objectContaining({
        canvas_file_id: "12",
        ingestion_eligibility: "blocked_security",
        ingestion_status: "blocked",
      }),
    ]);

    expect(payload.references).toHaveLength(4);
    expect(payload.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        canvas_file_id: "10",
        canvas_module_id: "module-1",
        canvas_module_item_id: "item-1",
        reference_type: "module_item",
      }),
      expect.objectContaining({
        canvas_file_id: "10",
        canvas_page_url: "week-one",
        reference_type: "page",
      }),
      expect.objectContaining({
        canvas_assignment_id: "assignment-1",
        canvas_file_id: "10",
        reference_type: "assignment",
      }),
      expect.objectContaining({
        canvas_announcement_id: "announcement-1",
        canvas_file_id: "10",
        reference_type: "announcement",
      }),
    ]));
    expect(payload.ignoredReferences).toEqual({
      external: 1,
      malformed: 0,
      unknownFile: 1,
      wrongCourse: 1,
    });
  });
});

function canvasFile(overrides: Partial<CanvasFile> = {}): CanvasFile {
  return {
    id: "10",
    folderId: "folder-1",
    displayName: "Lecture Notes.pdf",
    filename: "lecture-notes.pdf",
    contentType: "application/pdf",
    size: 1024,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    modifiedAt: "2026-07-02T00:00:00.000Z",
    lockAt: null,
    unlockAt: null,
    locked: false,
    hidden: false,
    hiddenForUser: false,
    visibilityLevel: "inherit",
    mediaClass: null,
    mediaEntryId: null,
    downloadUrl: "https://canvas.test/files/10/download",
    ...overrides,
  };
}

function moduleFixture(overrides: Partial<CanvasModule> = {}): CanvasModule {
  return {
    id: "module-1",
    name: "Week One",
    position: 1,
    unlockAt: null,
    itemCount: 1,
    requireSequentialProgress: false,
    published: true,
    prerequisiteModuleIds: [],
    state: "active",
    ...overrides,
  };
}

function moduleItem(
  overrides: Partial<CanvasModuleItem> = {},
): CanvasModuleItem {
  return {
    id: "item-1",
    title: "Lecture notes",
    position: 1,
    indent: 0,
    type: "File",
    contentId: "10",
    pageUrl: null,
    externalUrl: null,
    htmlUrl: "https://canvas.test/courses/course-1/modules/items/item-1",
    newTab: false,
    published: true,
    completionRequirement: null,
    contentDetails: null,
    ...overrides,
  };
}

function page(overrides: Partial<CanvasPageDetail> = {}): CanvasPageDetail {
  return {
    pageId: "page-1",
    url: "week-one",
    title: "Week One",
    body: null,
    published: true,
    frontPage: false,
    editingRoles: "teachers",
    lockInfo: null,
    unlockAt: null,
    lockAt: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function assignment(
  overrides: Partial<CanvasAssignment> = {},
): CanvasAssignment {
  return {
    id: "assignment-1",
    assignmentGroupId: "group-1",
    name: "Worksheet",
    description: null,
    position: 1,
    pointsPossible: 10,
    gradingType: "points",
    submissionTypes: ["online_upload"],
    dueAt: null,
    unlockAt: null,
    lockAt: null,
    published: true,
    muted: false,
    omitFromFinalGrade: false,
    anonymousGrading: false,
    htmlUrl: "https://canvas.test/courses/course-1/assignments/assignment-1",
    quizId: null,
    discussionTopicId: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function announcement(
  overrides: Partial<CanvasAnnouncement> = {},
): CanvasAnnouncement {
  return {
    id: "announcement-1",
    contextCode: "course_course-1",
    title: "Announcement",
    message: null,
    postedAt: "2026-07-03T00:00:00.000Z",
    delayedPostAt: null,
    lockAt: null,
    todoDate: null,
    workflowState: "active",
    published: true,
    locked: false,
    htmlUrl: "https://canvas.test/courses/course-1/discussion_topics/1",
    ...overrides,
  };
}
