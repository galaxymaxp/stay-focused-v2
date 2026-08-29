import type {
  ReviewerMetadata,
  ReviewerOutput,
  ReviewerSection,
  SectionOutput,
} from "@stay-focused/engine";
import { describe, expect, it } from "vitest";

import {
  describeGroundingStatus,
  describeReviewerQualityNotice,
  describeReviewerScale,
  describeReviewerSource,
  describeSectionNotice,
  presentReviewerSection,
  presentReviewerSections,
  readerReviewerTitle,
} from "./reviewerReaderPresentation";

function item(overrides: Partial<SectionOutput> = {}): SectionOutput {
  return {
    id: "item-1",
    plannedSectionId: "planned-1",
    title: "What is IT Security",
    sourceBlockIds: ["block-1"],
    sourceCore: {
      explanation: "",
      keyPoints: ["Confidentiality", "Integrity", "Availability"],
    },
    enrichment: null,
    kind: "concept-card",
    ...overrides,
  } as SectionOutput;
}

function section(overrides: Partial<ReviewerSection> = {}): ReviewerSection {
  return {
    id: "section-1",
    sourceSectionId: "source-section-1",
    plannedSectionId: "planned-1",
    title: "What is IT Security",
    order: 0,
    kind: "concept-card",
    sourceBlockIds: ["block-1"],
    coverageStatus: "passed",
    coverageScore: 1,
    groundingStatus: "passed",
    groundingScore: 1,
    groundingIssues: [],
    leakageStatus: "passed",
    leakageIssues: [],
    qualityStatus: "generated",
    items: [item()],
    ...overrides,
  };
}

function metadata(overrides: Partial<ReviewerMetadata> = {}): ReviewerMetadata {
  return {
    sourceId: "source-1",
    planId: "plan-1",
    coverageReportId: "coverage-1",
    sourceTitle: "IT Security Module 1",
    sourceKind: "document",
    language: "en",
    sectionCount: 1,
    generatedSectionCount: 1,
    coverageStatus: "passed",
    coverageScore: 1,
    coverage: {} as ReviewerMetadata["coverage"],
    groundingStatus: "passed",
    groundingScore: 1,
    grounding: {} as ReviewerMetadata["grounding"],
    leakageStatus: "passed",
    leakage: {} as ReviewerMetadata["leakage"],
    ...overrides,
  };
}

function reviewer(overrides: Partial<ReviewerOutput> = {}): ReviewerOutput {
  return {
    id: "reviewer-1",
    title: "IT Security",
    sections: [section()],
    metadata: metadata(),
    ...overrides,
  };
}

describe("readerReviewerTitle", () => {
  it("uses the generated title", () => {
    expect(readerReviewerTitle(reviewer())).toBe("IT Security");
  });

  it("falls back without inventing a title", () => {
    expect(readerReviewerTitle(reviewer({ title: "   " }))).toBe(
      "Untitled reviewer",
    );
  });
});

describe("describeReviewerSource", () => {
  it("names the Canvas course, source, and origin", () => {
    expect(
      describeReviewerSource(reviewer(), {
        courseName: "Information Assurance",
        sourceLabel: "Module 1 slides",
        sourceMode: "canvas",
      }),
    ).toBe("Information Assurance · Module 1 slides · Canvas");
  });

  it("describes a PDF reviewer as first-class without Canvas context", () => {
    expect(
      describeReviewerSource(reviewer(), {
        sourceLabel: "it-security.pdf",
        sourceMode: "pdf",
      }),
    ).toBe("it-security.pdf · PDF");
  });

  it("falls back to reviewer metadata when the screen supplies no context", () => {
    expect(describeReviewerSource(reviewer())).toBe(
      "IT Security Module 1 · Document",
    );
  });

  it("omits an unknown source kind rather than labelling it", () => {
    expect(
      describeReviewerSource(
        reviewer({ metadata: metadata({ sourceKind: "unknown" }) }),
      ),
    ).toBe("IT Security Module 1");
  });

  it("does not repeat a course that is also the source name", () => {
    expect(
      describeReviewerSource(reviewer(), {
        courseName: "IT Security Module 1",
        sourceLabel: "it security module 1",
        sourceMode: "canvas",
      }),
    ).toBe("IT Security Module 1 · Canvas");
  });

  it("returns nothing when no source information exists", () => {
    expect(
      describeReviewerSource(
        reviewer({
          metadata: metadata({ sourceTitle: "  ", sourceKind: "unknown" }),
        }),
      ),
    ).toBeNull();
  });
});

describe("describeReviewerScale", () => {
  it("counts sections", () => {
    expect(describeReviewerScale(reviewer())).toBe("1 section");
    expect(
      describeReviewerScale(
        reviewer({ sections: [section(), section({ id: "section-2" })] }),
      ),
    ).toBe("2 sections");
  });

  it("adds the selected block count only when the screen knows it", () => {
    expect(describeReviewerScale(reviewer(), { selectedBlockCount: 3 })).toBe(
      "1 section · from 3 selected blocks",
    );
    expect(describeReviewerScale(reviewer(), { selectedBlockCount: null })).toBe(
      "1 section",
    );
    expect(describeReviewerScale(reviewer(), { selectedBlockCount: 0 })).toBe(
      "1 section",
    );
  });
});

describe("describeGroundingStatus", () => {
  it("reports grounded reviewers in student language, without a score", () => {
    const grounding = describeGroundingStatus(metadata());

    expect(grounding).not.toBeNull();
    expect(grounding?.label).toBe("Grounded");
    expect(grounding?.tone).toBe("grounded");
    expect(`${grounding?.label} ${grounding?.detail}`).not.toMatch(/1\.0|100%|verified|guaranteed/i);
  });

  it("reports a failed grounding report as limited grounding", () => {
    const grounding = describeGroundingStatus(
      metadata({ groundingStatus: "failed" }),
    );

    expect(grounding?.label).toBe("Limited grounding");
    expect(grounding?.tone).toBe("limited");
  });

  it("reports nothing for a saved reviewer with no grounding status stored", () => {
    const legacy = {
      ...metadata(),
      groundingStatus: undefined,
    } as unknown as ReviewerMetadata;

    expect(describeGroundingStatus(legacy)).toBeNull();
  });
});

describe("describeReviewerQualityNotice", () => {
  it("discloses fallback sections", () => {
    expect(
      describeReviewerQualityNotice(
        metadata({ reviewerQualityStatus: "complete_with_fallbacks" }),
      ),
    ).toMatch(/source-only fallback/);
  });

  it("stays quiet for a complete reviewer", () => {
    expect(
      describeReviewerQualityNotice(
        metadata({ reviewerQualityStatus: "complete" }),
      ),
    ).toBeNull();
    expect(describeReviewerQualityNotice(metadata())).toBeNull();
  });
});

describe("presentReviewerSection", () => {
  it("keeps section and key-point order exactly as generated", () => {
    const presented = presentReviewerSection(section(), 1);

    expect(presented.title).toBe("What is IT Security");
    expect(presented.number).toBe(1);
    expect(presented.blocks[0]?.keyPoints).toEqual([
      "Confidentiality",
      "Integrity",
      "Availability",
    ]);
  });

  it("drops a repeated item heading for a single-item section", () => {
    expect(presentReviewerSection(section(), 1).blocks[0]?.heading).toBeNull();
  });

  it("keeps item headings when a section has several items", () => {
    const presented = presentReviewerSection(
      section({
        items: [
          item({ id: "item-1", title: "What is IT Security" }),
          item({ id: "item-2", title: "Why it matters" }),
        ],
      }),
      1,
    );

    expect(presented.blocks.map((block) => block.heading)).toEqual([
      "What is IT Security",
      "Why it matters",
    ]);
  });

  it("hides an explanation that only repeats the single key point", () => {
    const presented = presentReviewerSection(
      section({
        title: "Introduction",
        items: [
          item({
            title: "Introduction",
            sourceCore: {
              explanation: "Intro to IT Security Module 1",
              keyPoints: ["Intro to IT Security Module 1"],
            },
          }),
        ],
      }),
      1,
    );

    expect(presented.blocks[0]?.explanation).toBeNull();
    expect(presented.blocks[0]?.keyPoints).toEqual([
      "Intro to IT Security Module 1",
    ]);
  });

  it("keeps an explanation that adds something the key points do not", () => {
    const presented = presentReviewerSection(
      section({
        items: [
          item({
            sourceCore: {
              explanation: "IT security protects organisational assets.",
              keyPoints: ["Confidentiality"],
            },
          }),
        ],
      }),
      1,
    );

    expect(presented.blocks[0]?.explanation).toBe(
      "IT security protects organisational assets.",
    );
  });

  it("leaves key points unlabelled when they are the whole section body", () => {
    const presented = presentReviewerSection(section(), 1);

    expect(presented.blocks[0]?.heading).toBeNull();
    expect(presented.blocks[0]?.explanation).toBeNull();
    expect(presented.blocks[0]?.showKeyPointsLabel).toBe(false);
  });

  it("labels key points when prose sits beside them", () => {
    const presented = presentReviewerSection(
      section({
        items: [
          item({
            sourceCore: {
              explanation: "IT security protects organisational assets.",
              keyPoints: ["Confidentiality"],
            },
          }),
        ],
      }),
      1,
    );

    expect(presented.blocks[0]?.showKeyPointsLabel).toBe(true);
  });

  it("labels key points when the item carries its own heading", () => {
    const presented = presentReviewerSection(
      section({
        items: [
          item({ id: "item-1", title: "First part" }),
          item({ id: "item-2", title: "Second part" }),
        ],
      }),
      1,
    );

    expect(presented.blocks.map((block) => block.showKeyPointsLabel)).toEqual([
      true,
      true,
    ]);
  });

  it("reports an empty item honestly instead of inventing study content", () => {
    const presented = presentReviewerSection(
      section({
        items: [item({ sourceCore: { explanation: "  ", keyPoints: ["", " "] } })],
      }),
      1,
    );

    expect(presented.blocks[0]?.keyPoints).toEqual([]);
    expect(presented.blocks[0]?.explanation).toBeNull();
    expect(presented.blocks[0]?.emptyMessage).toBe(
      "No study content was returned here.",
    );
  });

  it("reports a section with no items", () => {
    const presented = presentReviewerSection(section({ items: [] }), 4);

    expect(presented.blocks).toEqual([]);
    expect(presented.emptyMessage).toBe("This section returned no study content.");
    expect(presented.number).toBe(4);
  });

  it("falls back for a missing section title", () => {
    expect(presentReviewerSection(section({ title: "" }), 1).title).toBe(
      "Untitled section",
    );
  });
});

describe("describeSectionNotice", () => {
  it("flags a section that failed grounding", () => {
    expect(describeSectionNotice(section({ groundingStatus: "failed" }))).toMatch(
      /could not be matched/,
    );
  });

  it("names source-only fallback sections", () => {
    expect(
      describeSectionNotice(section({ qualityStatus: "extractive_fallback" })),
    ).toBe("Taken directly from your source material.");
  });

  it("stays quiet for a normally generated section", () => {
    expect(describeSectionNotice(section())).toBeNull();
  });
});

describe("presentReviewerSections", () => {
  it("numbers sections in generated order", () => {
    const presented = presentReviewerSections(
      reviewer({
        sections: [
          section({ id: "a", title: "Introduction" }),
          section({ id: "b", title: "Goal of IT Security" }),
          section({ id: "c", title: "Domains of IT Security" }),
        ],
      }),
    );

    expect(presented.map((entry) => [entry.number, entry.title])).toEqual([
      [1, "Introduction"],
      [2, "Goal of IT Security"],
      [3, "Domains of IT Security"],
    ]);
  });

  it("renders a saved reviewer with no live job context", () => {
    const presented = presentReviewerSections(reviewer());

    expect(presented).toHaveLength(1);
    expect(presented[0]?.blocks[0]?.keyPoints).toHaveLength(3);
  });
});
