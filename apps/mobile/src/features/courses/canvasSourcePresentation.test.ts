import { describe, expect, it } from "vitest";

import type { CanvasReviewerSourceDescriptor } from "../../services/canvasApi";
import {
  groupCanvasSourcesForSelection,
  mergeCanvasSourceListPages,
  presentCanvasSourceCapability,
} from "./canvasSourcePresentation";

describe("Canvas source selection presentation", () => {
  it("preserves authoritative module/item order and groups unproven sources separately", () => {
    const sources = [
      source("ready", "First topic", "Unit one", 1, 1),
      source("empty", "Second topic", "Unit one", 1, 2),
      source("ready", "Later topic", "Unit two", 2, 1),
      source("ready", "Ungrouped reading", null, null, null),
    ];

    const groups = groupCanvasSourcesForSelection(sources);

    expect(groups.map((group) => group.title)).toEqual([
      "Unit one",
      "Unit two",
      "Other course content",
    ]);
    expect(groups[0]?.sources.map((entry) => entry.title)).toEqual([
      "First topic",
      "Second topic",
    ]);
  });

  it.each([
    ["ready", true, "Ready to review", "preview"],
    ["empty", false, "No study text found", "none"],
    ["needs_preparation", true, "Prepare file", "prepare"],
    ["unsupported", false, "Not supported yet", "none"],
    ["inaccessible", false, "Unavailable", "none"],
    ["failed", true, "Try preparation again", "retry"],
  ] as const)(
    "maps %s to safe student-facing capability copy",
    (capability, selectable, statusLabel, action) => {
      const presentation = presentCanvasSourceCapability(
        source(capability, "Fictional item", null, null, null),
      );

      expect(presentation).toMatchObject({
        action,
        selectable,
        statusLabel,
      });
      expect(JSON.stringify(presentation)).not.toMatch(
        /canvas_|fingerprint|storage|https?:|00000000/i,
      );
    },
  );

  it("keeps inaccessible sources opaque and gives failed preparation a safe retry", () => {
    expect(
      presentCanvasSourceCapability(
        source("inaccessible", "Restricted item", null, null, null),
      ).explanation,
    ).toBe("This item is unavailable.");
    expect(
      presentCanvasSourceCapability(
        source("failed", "Retry item", null, null, null),
      ),
    ).toMatchObject({ action: "retry", selectable: true });
  });

  it("merges only a continuous, duplicate-free source inventory page", () => {
    const first = sourceListPage([source("ready", "First", null, null, null)], 0, 1, true);
    const next = sourceListPage([source("ready", "Second", null, null, 2)], 1, 1, false);

    expect(mergeCanvasSourceListPages(first, next)?.sources.map((item) => item.title)).toEqual([
      "First",
      "Second",
    ]);
    expect(
      mergeCanvasSourceListPages(first, {
        ...next,
        sources: first.sources,
      }),
    ).toBeNull();
    expect(
      mergeCanvasSourceListPages(first, {
        ...next,
        pagination: { ...next.pagination, offset: 2 },
      }),
    ).toBeNull();
  });
});

function sourceListPage(
  sources: readonly CanvasReviewerSourceDescriptor[],
  offset: number,
  returned: number,
  hasMore: boolean,
): import("../../services/canvasApi").CanvasReviewerSourceListPayload {
  return {
    availableSourceCount: 2,
    courseId: "course-1",
    courseName: "Fictional Biology",
    courseSync: {
      completedAt: "2026-07-15T00:00:00.000Z",
      failureCategories: [],
      lastSuccessfulSyncAt: "2026-07-15T00:00:00.000Z",
      latestResultWasPartial: false,
      status: "success",
      synchronizedSourcesAvailable: true,
    },
    pagination: {
      hasMore,
      limit: 1,
      offset,
      returned,
      totalKnown: 2,
    },
    sources,
    unavailableSourceCount: 0,
  };
}

function source(
  capability: CanvasReviewerSourceDescriptor["capability"],
  title: string,
  moduleTitle: string | null,
  modulePosition: number | null,
  itemPosition: number | null,
): CanvasReviewerSourceDescriptor {
  return {
    availability: capability === "ready" ? "available" : "unavailable",
    capability,
    estimatedCharacters: capability === "ready" ? 240 : null,
    file: null,
    id: `page:00000000-0000-4000-8000-${String(itemPosition ?? 9).padStart(12, "0")}`,
    placement: {
      group: moduleTitle ? "module" : "ungrouped",
      itemPosition,
      modulePosition,
      moduleTitle,
    },
    title,
    type: "page",
    unavailableReason: null,
    updatedAt: null,
  };
}
