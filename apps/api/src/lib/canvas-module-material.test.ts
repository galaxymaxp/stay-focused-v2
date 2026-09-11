import { describe, expect, it } from "vitest";
import type {
  CanvasAssignment,
  CanvasFile,
  CanvasModuleItem,
  CanvasPageDetail,
} from "@stay-focused/canvas";

import { classifyCanvasModuleItem } from "./canvas-module-material";

describe("Canvas module learner-material classification", () => {
  it.each([
    ["application/pdf", "lesson.pdf"],
    ["image/png", "diagram.png"],
  ])("classifies a module-linked %s file as supported", (contentType, filename) => {
    expect(
      classifyCanvasModuleItem({
        file: fileFixture({ contentType, filename }),
        item: itemFixture("File"),
        resolution: "resolved",
      }),
    ).toEqual({
      classification: "SUPPORTED_LEARNER_MATERIAL",
      unsupportedFormat: null,
    });
  });

  it("classifies a substantive module Page as supported and an empty Page as empty", () => {
    expect(
      classifyCanvasModuleItem({
        item: itemFixture("Page"),
        page: pageFixture("<h2>Networks</h2><p>A network connects devices for communication.</p>"),
      }).classification,
    ).toBe("SUPPORTED_LEARNER_MATERIAL");
    expect(
      classifyCanvasModuleItem({
        item: itemFixture("Page"),
        page: pageFixture("<p>&nbsp;</p>"),
      }).classification,
    ).toBe("EMPTY");
  });

  it("separates substantive assignment material from task-only metadata", () => {
    expect(
      classifyCanvasModuleItem({
        assignment: assignmentFixture({
          description: "<p>Compare symmetric and asymmetric encryption with examples.</p>",
        }),
        item: itemFixture("Assignment"),
      }).classification,
    ).toBe("SUPPORTED_LEARNER_MATERIAL");
    expect(
      classifyCanvasModuleItem({
        assignment: assignmentFixture({ description: null }),
        item: itemFixture("Assignment"),
      }).classification,
    ).toBe("TASK_METADATA");
  });

  it.each([
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "lesson.docx",
      "DOCX",
    ],
    [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "slides.pptx",
      "PPTX",
    ],
  ] as const)("safely classifies unsupported %s material", (contentType, filename, format) => {
    expect(
      classifyCanvasModuleItem({
        file: fileFixture({ contentType, filename }),
        item: itemFixture("File"),
      }),
    ).toEqual({
      classification: "UNSUPPORTED_LEARNER_MATERIAL",
      unsupportedFormat: format,
    });
  });

  it.each(["missing", "inaccessible"] as const)(
    "classifies a %s module resource without treating it as material",
    (resolution) => {
      expect(
        classifyCanvasModuleItem({ item: itemFixture("File"), resolution }),
      ).toEqual({ classification: "INACCESSIBLE", unsupportedFormat: null });
    },
  );

  it.each([
    ["SubHeader", "NAVIGATION_ONLY"],
    ["ExternalUrl", "EXTERNAL_RESOURCE"],
    ["ExternalTool", "EXTERNAL_RESOURCE"],
    ["Quiz", "TASK_METADATA"],
    ["Discussion", "TASK_METADATA"],
    ["Mystery", "UNKNOWN"],
  ])("classifies %s module items as %s", (type, classification) => {
    expect(classifyCanvasModuleItem({ item: itemFixture(type) }).classification).toBe(
      classification,
    );
  });
});

function itemFixture(type: string): CanvasModuleItem {
  return {
    apiUrl: null,
    completionRequirement: null,
    contentDetails: null,
    contentId: "resource-1",
    externalUrl: null,
    htmlUrl: null,
    id: "item-1",
    indent: null,
    newTab: null,
    pageUrl: type === "Page" ? "lesson" : null,
    position: 1,
    published: true,
    title: "Lesson",
    type,
  };
}

function fileFixture(
  values: Pick<CanvasFile, "contentType" | "filename">,
): CanvasFile {
  return {
    contentType: values.contentType,
    createdAt: null,
    displayName: values.filename,
    downloadUrl: "https://canvas.test/files/1/download",
    filename: values.filename,
    folderId: null,
    hidden: false,
    hiddenForUser: false,
    id: "file-1",
    lockAt: null,
    locked: false,
    mediaClass: null,
    mediaEntryId: null,
    modifiedAt: null,
    size: 1024,
    unlockAt: null,
    updatedAt: null,
    visibilityLevel: "course_members",
  };
}

function pageFixture(body: string): CanvasPageDetail {
  return {
    body,
    createdAt: null,
    editingRoles: null,
    frontPage: false,
    lockAt: null,
    lockInfo: null,
    pageId: "page-1",
    published: true,
    title: "Lesson",
    unlockAt: null,
    updatedAt: null,
    url: "lesson",
  };
}

function assignmentFixture(
  values: Pick<CanvasAssignment, "description">,
): CanvasAssignment {
  return {
    allowedAttempts: null,
    allowedAttemptsUnlimited: null,
    anonymousGrading: null,
    assignmentGroupId: null,
    assignmentVisible: true,
    attachments: [],
    createdAt: null,
    description: values.description,
    discussionTopicId: null,
    dueAt: "2026-09-20T00:00:00.000Z",
    gradingType: null,
    hideInGradebook: null,
    htmlUrl: null,
    id: "assignment-1",
    lockAt: null,
    muted: null,
    name: "Read lesson",
    omitFromFinalGrade: null,
    pointsPossible: null,
    position: 1,
    postManually: null,
    published: true,
    quizId: null,
    submissionTypes: [],
    unlockAt: null,
    updatedAt: null,
  };
}
