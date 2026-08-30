import { extractCleanSourceItems } from "./source-items.js";
import type {
  NormalizedSourceBlock,
  PlannedSectionSemanticPlan,
  PlannedSemanticUnit,
  SectionContentTag,
} from "./types.js";

const TERM_PATTERN = /[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu;
const PROCEDURE_FRAME_PATTERN =
  /\b(?:procedure|process|steps?|sequence|instructions?|how\s+to)\b/i;
const EXAMPLE_LABEL_PATTERN = /^(?:common\s+)?examples?\s*:?[\s-]*$/i;
const ORDERED_MARKER_PATTERN =
  /(?:^|\n)[ \t]*(?:\d{1,3}|[a-z])[.)][ \t]+(?=\S)/gi;
const ACTION_START_PATTERN =
  /^(?:add|apply|check|choose|collect|communicate|connect|create|determine|ensure|enter|find|gather|identify|install|look|measure|open|place|record|remove|review|run|select|send|set|start|take|test|turn|use|verify|write)\b/i;

export function analyzeSectionSemanticStructure(args: {
  readonly title: string;
  readonly tags: readonly SectionContentTag[];
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
}): PlannedSectionSemanticPlan {
  const sourceText = args.sourceBlocks.map((block) => block.text).join("\n");
  const items = dedupe(
    extractCleanSourceItems({
      sourceSpanText: sourceText,
      sectionTitle: args.title,
    }).map((item) => item.text),
  );
  const blockScopedUnits = extractNumberedParentGroups(
    args.sourceBlocks,
    args.title,
  );
  const indentedUnits = extractIndentedGroups(sourceText, args.title);
  const orderedRun = findOrderedRun(sourceText, args.title, items);
  const exampleUnits = extractExampleUnits(items);
  const pairedUnits = extractLabelRelationshipUnits(items, args.title, args.tags);

  let units: readonly PlannedSemanticUnit[];
  let kind: PlannedSectionSemanticPlan["kind"];

  if (blockScopedUnits.length > 0) {
    units = blockScopedUnits;
    kind = "category-hierarchy";
  } else if (indentedUnits.length > 0) {
    units = indentedUnits;
    kind = "category-hierarchy";
  } else if (exampleUnits.length > 0) {
    units = exampleUnits;
    kind = "example-group";
  } else if (pairedUnits.length > 0) {
    units = pairedUnits;
    kind = relationshipKind(args.title, args.tags);
  } else if (orderedRun.length >= 2 && isExplicitProcedure(sourceText, args.title)) {
    units = [{ kind: "steps", label: args.title, items: orderedRun }];
    kind = "procedure";
  } else if (items.length >= 2) {
    units = items.map((text) => ({ kind: "point", label: text, items: [] }));
    kind = "list";
  } else {
    units = [];
    kind = "concept";
  }

  const orderedRunAlreadyGrouped = units.some(
    (unit) =>
      unit.kind === "steps" &&
      normalizeKey(unit.items.join(" ")) === normalizeKey(orderedRun.join(" ")),
  );
  if (
    orderedRun.length >= 2 &&
    kind !== "procedure" &&
    !orderedRunAlreadyGrouped
  ) {
    const stepKeys = new Set(orderedRun.map(normalizeKey));
    const firstStepIndex = items.findIndex(
      (item) => normalizeKey(item) === normalizeKey(orderedRun[0] ?? ""),
    );
    const stepLabel =
      firstStepIndex > 0 ? items[firstStepIndex - 1] ?? args.title : args.title;
    const stepLabelKey = normalizeKey(stepLabel);
    const retained = units.filter(
      (unit) =>
        unit.kind !== "point" ||
        (!stepKeys.has(normalizeKey(unit.label)) &&
          normalizeKey(unit.label) !== stepLabelKey),
    );
    units = [
      ...retained,
      { kind: "steps", label: stepLabel, items: orderedRun },
    ];
  }

  return {
    kind,
    units,
    explanationUseful: explanationAddsStudyValue(sourceText, items, units),
  };
}

function extractNumberedParentGroups(
  sourceBlocks: readonly NormalizedSourceBlock[],
  title: string,
): readonly PlannedSemanticUnit[] {
  const units: PlannedSemanticUnit[] = [];
  let numberedParentCount = 0;

  for (const block of sourceBlocks) {
    const lines = block.text.split(/\r?\n/);
    let parent: string | undefined;
    let children: string[] = [];
    let childMarkers: string[] = [];
    const flush = (): boolean => {
      if (!parent) return true;
      if (children.length === 0) return false;
      const orderedChildren = childMarkers.every((marker) => /^[a-z][.)]$/i.test(marker));
      units.push({
        kind:
          orderedChildren && children.every((child) => ACTION_START_PATTERN.test(child))
            ? "steps"
            : "group",
        label: parent,
        items: dedupe(children),
      });
      parent = undefined;
      children = [];
      childMarkers = [];
      return true;
    };

    for (const rawLine of lines) {
      const text = rawLine.trim();
      if (!text || normalizeKey(text) === normalizeKey(title)) continue;
      const parentMatch = /^\d{1,3}[.)]\s+(.+)$/.exec(text);
      if (parentMatch) {
        if (!flush()) return [];
        parent = parentMatch[1]?.trim();
        numberedParentCount += 1;
        continue;
      }
      if (!parent) continue;

      const childMatch = /^(?:([a-z][.)])|([-*+•]))\s*(.+)$/i.exec(text);
      if (childMatch) {
        children.push(childMatch[3]?.trim() ?? "");
        childMarkers.push(childMatch[1] ?? childMatch[2] ?? "");
      } else if (children.length > 0) {
        const previous = children.at(-1) ?? "";
        children[children.length - 1] = `${previous} ${text}`.trim();
      }
    }
    if (!flush()) return [];
  }

  return numberedParentCount >= 2 && units.length === numberedParentCount
    ? units
    : [];
}

export function serializeSemanticUnits(
  units: readonly PlannedSemanticUnit[],
): readonly string[] {
  return dedupe(
    units.flatMap((unit) => {
      switch (unit.kind) {
        case "point":
          return [unit.label];
        case "definition":
          return [`${unit.label} - ${unit.items.join(" ")}`];
        case "group":
          return [`${unit.label}: ${unit.items.join("; ")}`];
        case "steps":
          return [
            `${unit.label}: ${unit.items
              .map((item, index) => `${index + 1}. ${item}`)
              .join(" ")}`,
          ];
        case "examples":
          return [`${unit.label} - Examples: ${unit.items.join("; ")}`];
      }
    }),
  );
}

function extractLabelRelationshipUnits(
  items: readonly string[],
  title: string,
  tags: readonly SectionContentTag[],
): readonly PlannedSemanticUnit[] {
  if (items.length < 4) return [];
  const labels = items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item, index }) =>
        index < items.length - 1 && isRelationshipLabel(item),
    );
  if (labels.length < 2 || labels[0]?.index !== 0) return [];

  const units: PlannedSemanticUnit[] = [];
  for (let labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
    const label = labels[labelIndex];
    if (!label) continue;
    const nextIndex = labels[labelIndex + 1]?.index ?? items.length;
    const relatedItems = items.slice(label.index + 1, nextIndex);
    if (relatedItems.length === 0) return [];
    units.push({
      kind:
        relationshipKind(title, tags) === "definition-set"
          ? "definition"
          : "group",
      label: label.item,
      items: relatedItems,
    });
  }

  const representedCount = units.reduce(
    (count, unit) => count + 1 + unit.items.length,
    0,
  );
  return representedCount === items.length ? units : [];
}

function extractExampleUnits(
  items: readonly string[],
): readonly PlannedSemanticUnit[] {
  const markerIndex = items.findIndex((item) => EXAMPLE_LABEL_PATTERN.test(item));
  if (markerIndex <= 0 || markerIndex >= items.length - 1) return [];
  const label = items[markerIndex];
  if (!label) return [];

  const units: PlannedSemanticUnit[] = items
    .slice(0, markerIndex)
    .map((text) => ({ kind: "point", label: text, items: [] }));
  units.push({ kind: "examples", label, items: items.slice(markerIndex + 1) });
  return units;
}

function extractIndentedGroups(
  sourceText: string,
  title: string,
): readonly PlannedSemanticUnit[] {
  const lines = sourceText.split(/\r?\n/);
  const groups: PlannedSemanticUnit[] = [];
  let parent: string | undefined;
  let children: string[] = [];
  const flush = (): void => {
    if (parent && children.length > 0) {
      groups.push({ kind: "group", label: parent, items: dedupe(children) });
    }
    parent = undefined;
    children = [];
  };

  for (const rawLine of lines) {
    const marker = /^(\s*)(?:[-*+]\s+)?(.+?)\s*$/.exec(rawLine);
    if (!marker) continue;
    const indent = marker[1]?.replace(/\t/g, "  ").length ?? 0;
    const text = marker[2]?.trim() ?? "";
    if (!text || normalizeKey(text) === normalizeKey(title)) continue;
    if (indent === 0) {
      flush();
      parent = text;
    } else if (parent) {
      children.push(text);
    }
  }
  flush();
  return groups.length >= 2 ? groups : [];
}

function findOrderedRun(
  sourceText: string,
  title: string,
  items: readonly string[],
): readonly string[] {
  const orderedMarkerCount = [...sourceText.matchAll(ORDERED_MARKER_PATTERN)].length;
  if (orderedMarkerCount < 2) return [];
  if (isExplicitProcedure(sourceText, title) && items.length >= 2) return items;
  let best: string[] = [];
  let current: string[] = [];
  for (const item of items) {
    if (ACTION_START_PATTERN.test(item)) {
      current.push(item);
      if (current.length > best.length) best = [...current];
    } else {
      current = [];
    }
  }
  return best.length >= 2 ? best : [];
}

function isExplicitProcedure(sourceText: string, title: string): boolean {
  return PROCEDURE_FRAME_PATTERN.test(`${title}\n${sourceText}`);
}

function isRelationshipLabel(value: string): boolean {
  const terms = value.match(TERM_PATTERN) ?? [];
  return (
    terms.length > 0 &&
    terms.length <= 5 &&
    value.length <= 64 &&
    !/[.!?;:]$/.test(value) &&
    !ACTION_START_PATTERN.test(value) &&
    !/\b(?:is|are|was|were|has|have|can|may|used|refers|means)\b/i.test(value)
  );
}

function relationshipKind(
  title: string,
  tags: readonly SectionContentTag[],
): "definition-set" | "category-hierarchy" {
  return /\b(?:definition|terms?|glossary)\b/i.test(title) ||
    tags.includes("definition")
    ? "definition-set"
    : "category-hierarchy";
}

function explanationAddsStudyValue(
  sourceText: string,
  items: readonly string[],
  units: readonly PlannedSemanticUnit[],
): boolean {
  const wordCount = sourceText.match(TERM_PATTERN)?.length ?? 0;
  if (wordCount <= 8 && items.length <= 1 && !/[.!?]/.test(sourceText)) {
    return false;
  }
  return (
    items.length >= 3 ||
    units.some((unit) => unit.items.length > 0) ||
    /[.!?]/.test(sourceText)
  );
}

function dedupe(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
