import type { ReviewerOutput } from "@stay-focused/engine";
import { describe, expect, it } from "vitest";

import type {
  ReviewerSourceStatusPayload,
  SavedReviewerDetail,
  SavedReviewerSourceProvenanceSummary,
  SavedReviewerSummary,
} from "../../services/reviewerLibraryApi";
import {
  describeSavedReviewerCount,
  describeSavedReviewerSavedAt,
  describeSavedReviewerScale,
  describeSavedReviewerSource,
  describeSavedReviewerTechnicalProvenance,
  describeSourceReadiness,
  describeSourceStatusActions,
  describeSourceStatusItem,
  describeSourceStatusSummary,
  formatSavedReviewerDate,
  presentSavedReviewer,
  savedReviewerReaderContext,
  savedReviewerTitle,
} from "./studyLibraryPresentation";

const NOW = new Date("2026-08-29T12:00:00.000Z");

function summary(overrides: Partial<SavedReviewerSummary> = {}): SavedReviewerSummary {
  return {
    id: "reviewer-1",
    title: "Capstone Selective Canvas Reviewer",
    sourceMetadata: {
      sourceMode: "canvas",
      sourceCharacterCount: 1840,
      sourceLabel: "Week 3 announcement",
    },
    sectionCount: 1,
    createdAt: "2026-08-29T10:47:33.123Z",
    updatedAt: "2026-08-29T10:47:33.123Z",
    ...overrides,
  };
}

function provenance(
  overrides: Partial<SavedReviewerSourceProvenanceSummary> = {},
): SavedReviewerSourceProvenanceSummary {
  return {
    sourceSnapshotId: "snapshot-abc",
    sourceMode: "canvas",
    sourceTitle: "Week 3 announcement",
    sourceCount: 1,
    selectedBlockCount: 3,
    wasEdited: false,
    generatedAt: "2026-08-29T10:40:00.000Z",
    parserVersions: ["canvas-html@2"],
    ocrVersions: [],
    ...overrides,
  };
}

function detail(
  overrides: Partial<SavedReviewerDetail> = {},
): SavedReviewerDetail {
  return {
    ...summary(),
    reviewerOutput: {} as ReviewerOutput,
    ...overrides,
  };
}

function sourceStatus(
  overrides: Partial<ReviewerSourceStatusPayload> = {},
): ReviewerSourceStatusPayload {
  return {
    checkedAt: "2026-08-29T11:00:00.000Z",
    overallStatus: "current",
    regenerationReadiness: "ready_current",
    counts: {
      total: 2,
      current: 2,
      changed: 0,
      unavailable: 0,
      unsupported: 0,
      missingAfterSync: 0,
      unknown: 0,
    },
    actions: [],
    items: [],
    ...overrides,
  };
}

describe("savedReviewerTitle", () => {
  it("uses the stored title", () => {
    expect(savedReviewerTitle(summary())).toBe(
      "Capstone Selective Canvas Reviewer",
    );
  });

  it("falls back to the Reader's untitled wording when a title is blank", () => {
    expect(savedReviewerTitle(summary({ title: "   " }))).toBe(
      "Untitled reviewer",
    );
  });

  it("keeps a long title intact rather than truncating it", () => {
    const title =
      "CIT 6 Information Assurance and Security Midterm Consolidated Reviewer for Week 1 to Week 6";
    expect(savedReviewerTitle(summary({ title }))).toBe(title);
  });
});

describe("describeSavedReviewerSource", () => {
  it("names a Canvas reviewer with its stored source label", () => {
    expect(describeSavedReviewerSource(summary())).toBe(
      "Week 3 announcement · Canvas",
    );
  });

  it("names a PDF reviewer with the same vocabulary the Reader uses", () => {
    expect(
      describeSavedReviewerSource(
        summary({
          sourceMetadata: {
            sourceMode: "pdf",
            sourceCharacterCount: 9000,
            pdfPageCount: 12,
            sourceLabel: "Module 1 handout.pdf",
          },
        }),
      ),
    ).toBe("Module 1 handout.pdf · PDF");
  });

  it("falls back to the source kind alone when no label was stored", () => {
    expect(
      describeSavedReviewerSource(
        summary({
          sourceMetadata: { sourceMode: "paste", sourceCharacterCount: 400 },
        }),
      ),
    ).toBe("Pasted text");
  });

  it("does not repeat a label that already says the source kind", () => {
    expect(
      describeSavedReviewerSource(
        summary({
          sourceMetadata: {
            sourceMode: "canvas",
            sourceCharacterCount: 100,
            sourceLabel: " canvas ",
          },
        }),
      ),
    ).toBe("Canvas");
  });

  it("reports camera and gallery reviewers as photos", () => {
    for (const sourceMode of ["camera", "gallery"] as const) {
      expect(
        describeSavedReviewerSource(
          summary({
            sourceMetadata: { sourceMode, sourceCharacterCount: 100 },
          }),
        ),
      ).toBe("Photo");
    }
  });
});

describe("describeSavedReviewerScale", () => {
  it("uses the singular for one section", () => {
    expect(describeSavedReviewerScale(summary())).toBe("1 section");
  });

  it("uses the plural for several sections", () => {
    expect(describeSavedReviewerScale(summary({ sectionCount: 18 }))).toBe(
      "18 sections",
    );
  });

  it("says so plainly rather than reporting zero sections", () => {
    expect(describeSavedReviewerScale(summary({ sectionCount: 0 }))).toBe(
      "No sections",
    );
  });

  it("adds the PDF page count only when the record stores one", () => {
    expect(
      describeSavedReviewerScale(
        summary({
          sectionCount: 4,
          sourceMetadata: {
            sourceMode: "pdf",
            sourceCharacterCount: 9000,
            pdfPageCount: 12,
          },
        }),
      ),
    ).toBe("4 sections · from 12 pages");

    expect(
      describeSavedReviewerScale(
        summary({
          sectionCount: 4,
          sourceMetadata: { sourceMode: "pdf", sourceCharacterCount: 9000 },
        }),
      ),
    ).toBe("4 sections");
  });

  it("never invents a Canvas selected-block count the list endpoint does not carry", () => {
    expect(describeSavedReviewerScale(summary({ sectionCount: 3 }))).toBe(
      "3 sections",
    );
  });
});

describe("formatSavedReviewerDate", () => {
  it("omits the year for a reviewer saved this year", () => {
    const formatted = formatSavedReviewerDate("2026-08-29T10:47:33.123Z", NOW);
    expect(formatted).not.toBeNull();
    expect(formatted).not.toContain("2026");
    expect(formatted).not.toContain("T10:47");
  });

  it("keeps the year for a reviewer saved in an earlier year", () => {
    expect(formatSavedReviewerDate("2025-01-04T10:47:33.123Z", NOW)).toContain(
      "2025",
    );
  });

  it("reports nothing for an unparseable timestamp instead of leaking it", () => {
    expect(formatSavedReviewerDate("not-a-date", NOW)).toBeNull();
  });
});

describe("describeSavedReviewerSavedAt", () => {
  it("prefers the saved time over the rename-driven updated time", () => {
    const savedAt = describeSavedReviewerSavedAt(
      summary({
        createdAt: "2025-01-04T10:00:00.000Z",
        updatedAt: "2026-08-29T10:00:00.000Z",
      }),
      NOW,
    );

    expect(savedAt).toContain("Saved ");
    expect(savedAt).toContain("2025");
  });

  it("reports nothing when the saved timestamp cannot be read", () => {
    expect(
      describeSavedReviewerSavedAt(summary({ createdAt: "" }), NOW),
    ).toBeNull();
  });
});

describe("describeSavedReviewerCount", () => {
  it("uses the singular for one saved reviewer", () => {
    expect(describeSavedReviewerCount(1)).toBe("1 saved reviewer");
  });

  it("uses the plural beyond one", () => {
    expect(describeSavedReviewerCount(8)).toBe("8 saved reviewers");
  });
});

describe("presentSavedReviewer", () => {
  it("builds a Canvas card from stored fields only", () => {
    const card = presentSavedReviewer(summary(), NOW);

    expect(card.title).toBe("Capstone Selective Canvas Reviewer");
    expect(card.sourceLine).toBe("Week 3 announcement · Canvas");
    expect(card.scaleLine).toContain("1 section · Saved ");
  });

  it("builds a PDF card without any Canvas-only metadata", () => {
    const card = presentSavedReviewer(
      summary({
        title: "Module 1 handout reviewer",
        sectionCount: 6,
        sourceMetadata: {
          sourceMode: "pdf",
          sourceCharacterCount: 9000,
          pdfPageCount: 12,
          sourceLabel: "Module 1 handout.pdf",
        },
      }),
      NOW,
    );

    expect(card.sourceLine).toBe("Module 1 handout.pdf · PDF");
    expect(card.scaleLine).toContain("6 sections · from 12 pages · Saved ");
    expect(card.scaleLine).not.toContain("block");
  });

  it("degrades to source kind and section count for a legacy record", () => {
    const card = presentSavedReviewer(
      summary({
        title: "",
        sectionCount: 0,
        sourceMetadata: { sourceMode: "paste", sourceCharacterCount: 0 },
        createdAt: "not-a-date",
      }),
      NOW,
    );

    expect(card.title).toBe("Untitled reviewer");
    expect(card.sourceLine).toBe("Pasted text");
    expect(card.scaleLine).toBe("No sections");
    expect(card.scaleLine).not.toContain("Saved");
  });

  it("names the reviewer in both action labels", () => {
    const card = presentSavedReviewer(summary(), NOW);

    expect(card.openAccessibilityLabel).toBe(
      "Open reviewer Capstone Selective Canvas Reviewer",
    );
    expect(card.deleteAccessibilityLabel).toBe(
      "Delete reviewer Capstone Selective Canvas Reviewer",
    );
  });

  it("never renders a placeholder for metadata the record does not hold", () => {
    const card = presentSavedReviewer(
      summary({
        sourceMetadata: { sourceMode: "canvas", sourceCharacterCount: 0 },
      }),
      NOW,
    );

    for (const line of [card.title, card.sourceLine ?? "", card.scaleLine]) {
      expect(line).not.toContain("Unknown");
      expect(line).not.toContain("N/A");
      expect(line).not.toContain("undefined");
      expect(line).not.toContain("null");
    }
  });
});

describe("savedReviewerReaderContext", () => {
  it("passes the stored Canvas context through to the Reader", () => {
    expect(
      savedReviewerReaderContext(detail({ sourceProvenance: provenance() })),
    ).toEqual({
      sourceLabel: "Week 3 announcement",
      sourceMode: "canvas",
      selectedBlockCount: 3,
    });
  });

  it("falls back to the snapshot source title when no label was saved", () => {
    expect(
      savedReviewerReaderContext(
        detail({
          sourceMetadata: { sourceMode: "canvas", sourceCharacterCount: 10 },
          sourceProvenance: provenance({ sourceTitle: "Module 2 page" }),
        }),
      ).sourceLabel,
    ).toBe("Module 2 page");
  });

  it("omits Canvas-only context for a reviewer saved without provenance", () => {
    expect(
      savedReviewerReaderContext(
        detail({
          sourceMetadata: {
            sourceMode: "pdf",
            sourceCharacterCount: 10,
            sourceLabel: "Module 1 handout.pdf",
          },
        }),
      ),
    ).toEqual({
      sourceLabel: "Module 1 handout.pdf",
      sourceMode: "pdf",
      selectedBlockCount: null,
    });
  });

  it("gives the Reader no source at all when nothing was stored", () => {
    expect(
      savedReviewerReaderContext(
        detail({
          sourceMetadata: { sourceMode: "paste", sourceCharacterCount: 10 },
        }),
      ).sourceLabel,
    ).toBeNull();
  });
});

describe("describeSavedReviewerTechnicalProvenance", () => {
  it("keeps snapshot and version data available for troubleshooting", () => {
    const details = describeSavedReviewerTechnicalProvenance(provenance());
    const byLabel = new Map(details.map((entry) => [entry.label, entry.value]));

    expect(byLabel.get("Snapshot")).toBe("snapshot-abc");
    expect(byLabel.get("Sources")).toBe("1 source");
    expect(byLabel.get("Source edited")).toBe("No");
    expect(byLabel.get("Parsers")).toBe("canvas-html@2");
    expect(byLabel.get("OCR")).toBe("None recorded");
  });

  it("is not needed to present the card itself", () => {
    const card = presentSavedReviewer(summary(), NOW);

    expect(card.sourceLine).not.toContain("snapshot");
    expect(card.scaleLine).not.toContain("@");
  });
});

describe("describeSourceStatusSummary", () => {
  it("reports the overall status with only the non-zero counts", () => {
    expect(describeSourceStatusSummary(sourceStatus())).toBe(
      "Sources current · 2 current",
    );
  });

  it("names each bucket that actually has sources in it", () => {
    expect(
      describeSourceStatusSummary(
        sourceStatus({
          overallStatus: "attention_required",
          counts: {
            total: 3,
            current: 1,
            changed: 0,
            unavailable: 0,
            unsupported: 0,
            missingAfterSync: 2,
            unknown: 0,
          },
        }),
      ),
    ).toBe("Sources need attention · 1 current, 2 missing after sync");
  });

  it("falls back to the overall status when nothing was counted", () => {
    expect(
      describeSourceStatusSummary(
        sourceStatus({
          overallStatus: "unknown",
          counts: {
            total: 0,
            current: 0,
            changed: 0,
            unavailable: 0,
            unsupported: 0,
            missingAfterSync: 0,
            unknown: 0,
          },
        }),
      ),
    ).toBe("Source status unknown");
  });
});

describe("source status detail wording", () => {
  it("states readiness as an outcome rather than a field name", () => {
    expect(describeSourceReadiness("blocked_missing_sources")).toBe(
      "Cannot regenerate: sources are missing",
    );
  });

  it("reports no next action when the server listed none", () => {
    expect(describeSourceStatusActions([])).toBeNull();
    expect(describeSourceStatusActions(["sync_canvas_course"])).toBe(
      "Next action: sync Canvas course",
    );
  });

  it("describes one source with its server message", () => {
    expect(
      describeSourceStatusItem({
        ordinal: 1,
        sourceType: "announcement",
        title: "Week 3 announcement",
        status: "changed",
        message: "Content changed since this reviewer was generated.",
      }),
    ).toBe(
      "Changed announcement · Content changed since this reviewer was generated.",
    );
  });
});
