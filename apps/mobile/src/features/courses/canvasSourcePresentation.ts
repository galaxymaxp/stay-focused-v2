import type {
  CanvasReviewerSourceDescriptor,
  CanvasReviewerSourceType,
} from "../../services/canvasApi";

export interface CanvasSourceCapabilityPresentation {
  readonly selectable: boolean;
  readonly statusLabel: string;
  readonly explanation: string;
  readonly action: "preview" | "prepare" | "retry" | "none";
}

export interface CanvasSourcePresentationGroup {
  readonly key: string;
  readonly title: string;
  readonly sources: readonly CanvasReviewerSourceDescriptor[];
}

export function mergeCanvasSourceListPages(
  current: import("../../services/canvasApi").CanvasReviewerSourceListPayload,
  next: import("../../services/canvasApi").CanvasReviewerSourceListPayload,
): import("../../services/canvasApi").CanvasReviewerSourceListPayload | null {
  const expectedOffset = current.pagination.offset + current.pagination.returned;
  if (
    current.courseId !== next.courseId ||
    current.courseName !== next.courseName ||
    current.availableSourceCount !== next.availableSourceCount ||
    current.unavailableSourceCount !== next.unavailableSourceCount ||
    current.pagination.totalKnown !== next.pagination.totalKnown ||
    next.pagination.offset !== expectedOffset
  ) {
    return null;
  }

  const knownIds = new Set(current.sources.map((source) => source.id));
  if (next.sources.some((source) => knownIds.has(source.id))) return null;
  if (new Set(next.sources.map((source) => source.id)).size !== next.sources.length) {
    return null;
  }

  return {
    ...next,
    sources: [...current.sources, ...next.sources],
  };
}

export function presentCanvasSourceCapability(
  source: CanvasReviewerSourceDescriptor,
): CanvasSourceCapabilityPresentation {
  switch (source.capability) {
    case "ready":
      return {
        action: "preview",
        explanation: "This material is ready to turn into a reviewer.",
        selectable: true,
        statusLabel: "Ready",
      };
    case "empty":
      return {
        action: "none",
        explanation: "No study text was found in this item.",
        selectable: false,
        statusLabel: "No study text found",
      };
    case "needs_preparation":
      return {
        action: "prepare",
        explanation: "Prepare this material before creating a reviewer.",
        selectable: true,
        statusLabel: "Prepare",
      };
    case "unsupported":
      return {
        action: "none",
        explanation: unsupportedCanvasSourceExplanation(source),
        selectable: false,
        statusLabel: unsupportedCanvasSourceExplanation(source),
      };
    case "inaccessible":
      return {
        action: "none",
        explanation: "This item is unavailable.",
        selectable: false,
        statusLabel: "Unavailable",
      };
    case "failed":
      return {
        action: "retry",
        explanation: "Stay Focused could not prepare this item. You can try again.",
        selectable: true,
        statusLabel: "Try preparation again",
      };
  }
}

export function groupCanvasSourcesForSelection(
  sources: readonly CanvasReviewerSourceDescriptor[],
): readonly CanvasSourcePresentationGroup[] {
  const groups: {
    key: string;
    title: string;
    sources: CanvasReviewerSourceDescriptor[];
  }[] = [];
  const byKey = new Map<string, (typeof groups)[number]>();

  for (const source of sources) {
    if (source.type === "announcement") continue;
    const placement = source.placement;
    const title =
      placement.group === "module" && placement.moduleTitle
        ? placement.moduleTitle
        : "Other course content";
    const key =
      placement.group === "module"
        ? `module:${placement.modulePosition ?? "unknown"}:${title}`
        : "ungrouped";
    let group = byKey.get(key);
    if (!group) {
      group = { key, sources: [], title };
      byKey.set(key, group);
      groups.push(group);
    }
    group.sources.push(source);
  }

  return groups;
}

function unsupportedCanvasSourceExplanation(
  source: CanvasReviewerSourceDescriptor,
): string {
  const extension = source.title.trim().split(".").pop()?.toLowerCase();
  if (extension === "ppt" || extension === "pptx") {
    return "PowerPoint files aren't supported yet.";
  }
  if (extension === "doc" || extension === "docx") {
    return "Word files aren't supported yet.";
  }
  return "This file type isn't supported yet.";
}

export function formatCanvasSourceType(type: CanvasReviewerSourceType): string {
  switch (type) {
    case "page":
      return "Page";
    case "assignment":
      return "Assignment";
    case "announcement":
      return "Announcement";
    case "file":
      return "File";
  }
}

export function sourceSelectionHelp(
  selected: CanvasReviewerSourceDescriptor | null,
): string {
  if (!selected) {
    return "Choose one course material to continue.";
  }
  const presentation = presentCanvasSourceCapability(selected);
  switch (presentation.action) {
    case "preview":
      return "Choose Reviewer to create study notes from this material.";
    case "prepare":
      return "Prepare this material, then choose Reviewer.";
    case "retry":
      return "Try preparing this file again.";
    case "none":
      return presentation.explanation;
  }
}

/**
 * States that the previewed text is what the server resolved from the block
 * selection, rather than the selection itself. The count is server-reported and
 * is omitted rather than substituted when the server does not return it.
 */
export function describeSelectivePreviewScope(
  selectedBlockCount: number | undefined,
): string {
  if (selectedBlockCount === undefined) {
    return "Resolved by the server from the blocks you selected, in source order.";
  }
  return `Resolved by the server from ${selectedBlockCount.toLocaleString()} selected ${
    selectedBlockCount === 1 ? "block" : "blocks"
  }, in source order.`;
}
