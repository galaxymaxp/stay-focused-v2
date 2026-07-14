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
        explanation: "This item has study text ready to check.",
        selectable: true,
        statusLabel: "Ready to review",
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
        explanation: "Prepare this file before checking its study text.",
        selectable: true,
        statusLabel: "Prepare file",
      };
    case "unsupported":
      return {
        action: "none",
        explanation: "This item type cannot create a reviewer yet.",
        selectable: false,
        statusLabel: "Not supported yet",
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
    return "Choose one ready item to continue.";
  }
  const presentation = presentCanvasSourceCapability(selected);
  switch (presentation.action) {
    case "preview":
      return "Check the exact study text before creating your reviewer.";
    case "prepare":
      return "Prepare this file, then check the extracted study text.";
    case "retry":
      return "Try preparing this file again.";
    case "none":
      return presentation.explanation;
  }
}
