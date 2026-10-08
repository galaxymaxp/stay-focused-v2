import type { CanvasAssignment, CanvasFile } from "@stay-focused/canvas";
import { describe, expect, it, vi } from "vitest";

import { resolveAssignmentFileMetadata } from "./unit-executor";

describe("Canvas assignment file metadata", () => {
  it("resolves same-course files linked from assignment instructions when inventory omits them", async () => {
    const file = { id: "file-42", filename: "Learning-Contract-Template.docx" } as CanvasFile;
    const getCourseFile = vi.fn().mockResolvedValue(file);
    const assignments = [{
      id: "assignment-1",
      description: '<a href="/courses/course-1/files/file-42?download=1">Template</a>',
      attachments: [],
    }] as unknown as readonly CanvasAssignment[];

    const result = await resolveAssignmentFileMetadata({
      assignments,
      canvas: { getCourseFile },
      canvasBaseUrl: "https://canvas.test",
      courseCanvasId: "course-1",
    });

    expect(getCourseFile).toHaveBeenCalledWith("course-1", "file-42");
    expect(result[0]?.attachments).toEqual([file]);
  });

  it("does not resolve external or other-course links", async () => {
    const getCourseFile = vi.fn();
    const assignments = [{
      id: "assignment-1",
      description: '<a href="/courses/other/files/file-42">Other course</a><a href="https://outside.test/files/file-43">External</a>',
      attachments: [],
    }] as unknown as readonly CanvasAssignment[];

    const result = await resolveAssignmentFileMetadata({
      assignments,
      canvas: { getCourseFile },
      canvasBaseUrl: "https://canvas.test",
      courseCanvasId: "course-1",
    });

    expect(getCourseFile).not.toHaveBeenCalled();
    expect(result[0]?.attachments).toEqual([]);
  });
});
