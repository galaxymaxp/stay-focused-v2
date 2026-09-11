import type { ReviewerOutput } from "@stay-focused/engine";
import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";

import type {
  CanvasReviewerSourceDescriptor,
  CanvasReviewerSourcePreviewPayload,
} from "../../services/canvasApi";
import {
  canvasReviewerProgressLabel,
  canvasSourceModuleLabel,
  createCanvasReviewerJobDraft,
  createCanvasReviewerSaveDraft,
  persistCanvasReviewerAutomatically,
} from "./canvasStudyWorkflow";

describe("Canvas reviewer student workflow", () => {
  it("submits the canonical prepared source identity from the server preview", () => {
    const draft = createCanvasReviewerJobDraft({
      courseId: "course-cit6",
      preview: preview(),
      sourceText: "Prepared Canvas text",
      sourceTitle: "Course Introduction.pdf",
    });

    expect(draft).toEqual({
      canvasCourseId: "course-cit6",
      canvasItemIds: ["file:canonical-source-id"],
      canvasPreviewSessionId: "preview-session",
      canvasResolutionFingerprint: "resolution-fingerprint",
      sourceText: "Prepared Canvas text",
      sourceTitle: "Course Introduction.pdf",
    });
  });

  it("creates the automatic library save from the same immutable snapshot", () => {
    const draft = createCanvasReviewerSaveDraft({
      courseName: "CIT6 Capstone Project 1",
      reviewer: reviewer(),
      sourceSnapshotId: "snapshot-id",
      sourceText: "  Prepared Canvas text  ",
      sourceTitle: "Course Introduction.pdf",
    });

    expect(draft).toMatchObject({
      sourceSnapshotId: "snapshot-id",
      title: "Course Introduction.pdf",
      sourceMetadata: {
        sourceCharacterCount: 20,
        sourceLabel:
          "CIT6 Capstone Project 1 · Course Introduction.pdf",
        sourceMode: "canvas",
      },
    });
    expect(draft.reviewerOutput.id).toBe("reviewer-output-id");
  });

  it("persists a completed reviewer once and returns the saved library item", async () => {
    const persisted: string[] = [];

    const result = await persistCanvasReviewerAutomatically(
      {
        courseName: "CIT6 Capstone Project 1",
        reviewer: reviewer(),
        sourceSnapshotId: "snapshot-id",
        sourceText: "Prepared Canvas text",
        sourceTitle: "Course Introduction.pdf",
      },
      async (draft) => {
        persisted.push(draft.sourceSnapshotId);
        return { id: "saved-reviewer-id", title: draft.title };
      },
    );

    expect(persisted).toEqual(["snapshot-id"]);
    expect(result).toEqual({
      id: "saved-reviewer-id",
      title: "Course Introduction.pdf",
    });
  });

  it("leaves an automatic save failure available to the retrying caller", async () => {
    const failure = { code: "network_error", retryable: true } as const;

    const result = await persistCanvasReviewerAutomatically(
      {
        courseName: "CIT6 Capstone Project 1",
        reviewer: reviewer(),
        sourceSnapshotId: "snapshot-id",
        sourceText: "Prepared Canvas text",
        sourceTitle: "Course Introduction.pdf",
      },
      async () => ({ ok: false as const, error: failure }),
    );

    expect(result).toEqual({ ok: false, error: failure });
  });

  it("keeps course module context student-facing", () => {
    expect(canvasSourceModuleLabel(source("Week 1"))).toBe("Week 1");
    expect(canvasSourceModuleLabel(source(null))).toBe("Other course content");
  });

  it.each([
    ["preparing_source", "Preparing material"],
    ["normalizing_source", "Preparing material"],
    ["detecting_outline", "Creating reviewer"],
    ["generating_sections", "Creating reviewer"],
    ["verifying_coverage", "Finishing reviewer"],
    ["storing_reviewer", "Finishing reviewer"],
  ] as const)("maps %s to coarse progress copy", (stage, expected) => {
    const label = canvasReviewerProgressLabel(job(stage));

    expect(label).toBe(expected);
    expect(label).not.toMatch(/stage|outline|coverage|normaliz|source/i);
  });
});

function preview(): CanvasReviewerSourcePreviewPayload {
  return {
    characterCount: 20,
    courseSync: { completedAt: "2026-09-11T00:00:00.000Z", status: "partial" },
    limits: {
      existingReviewerRequestLimit: 120_000,
      maximumCharactersPerSource: 120_000,
      maximumCombinedPreviewCharacters: 120_000,
      maximumOcrFilesPerPreview: 5,
      maximumSelectedBlocks: 250,
      maximumSources: 1,
      maximumStructuredBlocks: 400,
      suggestedTitleLimit: 160,
    },
    previewSessionId: "preview-session",
    resolutionFingerprint: "resolution-fingerprint",
    selectedBlockCount: 23,
    sourceCount: 1,
    sourceText: "Prepared Canvas text",
    sources: [
      {
        fileKind: "pdf",
        id: "file:canonical-source-id",
        pageCount: 23,
        type: "file",
        updatedAt: null,
      },
    ],
    suggestedTitle: "Course Introduction.pdf",
  };
}

function source(moduleTitle: string | null): CanvasReviewerSourceDescriptor {
  return {
    availability: "available",
    capability: "ready",
    estimatedCharacters: 7_211,
    file: { canPrepare: false, kind: "pdf", preparationStatus: "ready" },
    id: "file:canonical-source-id",
    placement: {
      group: moduleTitle ? "module" : "ungrouped",
      itemPosition: moduleTitle ? 4 : null,
      modulePosition: moduleTitle ? 1 : null,
      moduleTitle,
    },
    title: "Course Introduction.pdf",
    type: "file",
    unavailableReason: null,
    updatedAt: null,
  };
}

function job(
  stage: ProcessingJobStatusView["stage"],
): ProcessingJobStatusView {
  return {
    acceptedAt: "2026-09-11T00:00:00.000Z",
    attemptCount: 1,
    artifactType: null,
    cancellationRequestedAt: null,
    completedAt: null,
    createdAt: "2026-09-11T00:00:00.000Z",
    errorCode: null,
    failedAt: null,
    id: "job-id",
    jobType: "reviewer_generation",
    progress: {
      completedUnits: null,
      message: "Internal progress",
      totalUnits: null,
      unitLabel: null,
    },
    resultAvailable: false,
    retryOfJobId: null,
    retryable: false,
    reuseCandidateArtifactVersionId: null,
    reusedFromJobId: null,
    reuseMode: "fresh",
    safeErrorMessage: null,
    source: {
      characterCount: 20,
      displayName: "Course Introduction.pdf",
      mimeType: "application/pdf",
      sourceKind: "pdf",
    },
    sourceVersionId: null,
    stage,
    startedAt: "2026-09-11T00:00:01.000Z",
    status: "running",
    updatedAt: "2026-09-11T00:00:01.000Z",
    provenance: null,
  };
}

function reviewer(): ReviewerOutput {
  return {
    id: "reviewer-output-id",
    metadata: {
      coverage: {
        coverageBasis: "source-outline",
        coverageScore: 1,
        id: "coverage-id",
        issues: [],
        planId: "plan-id",
        score: 1,
        sections: [],
        sourceId: "source-id",
        sourceSections: [],
        sourceSectionsCovered: 0,
        sourceSectionsTotal: 0,
        status: "passed",
      },
      coverageReportId: "coverage-id",
      coverageScore: 1,
      coverageStatus: "passed",
      generatedSectionCount: 0,
      grounding: {
        id: "grounding-id",
        issues: [],
        phase1FabricationFailures: [],
        phase1FabricationFails: 0,
        planId: "plan-id",
        score: 1,
        sections: [],
        sourceId: "source-id",
        status: "passed",
        threshold: 0.8,
      },
      groundingScore: 1,
      groundingStatus: "passed",
      language: "en",
      leakage: {
        id: "leakage-id",
        issues: [],
        planId: "plan-id",
        sections: [],
        sourceId: "source-id",
        status: "passed",
      },
      leakageStatus: "passed",
      planId: "plan-id",
      sectionCount: 0,
      sourceId: "source-id",
      sourceKind: "plain-text",
      sourceTitle: "Course Introduction.pdf",
    },
    sections: [],
    title: "Course Introduction",
  };
}
