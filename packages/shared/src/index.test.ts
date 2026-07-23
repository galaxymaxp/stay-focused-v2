import { describe, expect, it } from "vitest";

import {
  GENERATED_ARTIFACT_TYPES,
  isActiveProcessingJobStatus,
  isTerminalProcessingJobStatus,
  PROCESSING_JOB_STATUSES,
  SOURCE_REVISION_KINDS,
} from "./index";

describe("shared reusable processing contracts", () => {
  it("keeps reviewer semantics while reserving neutral future artifact types", () => {
    expect(GENERATED_ARTIFACT_TYPES).toEqual([
      "reviewer",
      "flashcards",
      "quiz",
      "summary",
      "practice_test",
      "study_guide",
    ]);
  });

  it("recognizes immutable source revision kinds without subject coupling", () => {
    expect(SOURCE_REVISION_KINDS).toContain("normalized");
    expect(SOURCE_REVISION_KINDS).toContain("user_edited");
    expect(SOURCE_REVISION_KINDS).toContain("canvas_resolved");
  });

  it("partitions every processing status into active or terminal", () => {
    for (const status of PROCESSING_JOB_STATUSES) {
      expect(
        isActiveProcessingJobStatus(status) !==
          isTerminalProcessingJobStatus(status),
      ).toBe(true);
    }
  });
});
