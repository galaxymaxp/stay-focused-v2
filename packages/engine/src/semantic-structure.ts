import { extractCleanSourceItems } from "./source-items.js";
import type {
  NormalizedSourceBlock,
  PlannedSectionSemanticPlan,
  PlannedSemanticUnit,
  SectionContentTag,
} from "./types.js";

const TERM_PATTERN = /[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu;
const PROCEDURE_FRAME_PATTERN =
  /\b(?:procedure|process(?:ing)?|steps?|sequence|instructions?|how\s+to)\b/i;
const CHECKLIST_FRAME_PATTERN =
  /\b(?:practices?|checklist|guidelines?|recommendations?|rules?|considerations?)\b/i;
const ORDERED_MARKER_PATTERN =
  /(?:^|\n)[ \t]*(?:\d{1,3}|[a-z])[.)][ \t]+(?=\S)/gi;
const ACTION_START_PATTERN =
  /^(?:add|apply|check|choose|collect|communicate|connect|create|determine|ensure|enter|find|gather|identify|install|look|measure|open|place|record|remove|review|run|select|send|set|start|take|test|turn|use|verify|write)\b/i;

export function analyzeSectionSemanticStructure(args: {
  readonly title: string;
  readonly tags: readonly SectionContentTag[];
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
}): PlannedSectionSemanticPlan {
  const semanticSourceText = args.sourceBlocks
    .filter((block) => block.metadata?.layoutStatus !== "ocr_supplemented")
    .map((block) => block.text)
    .join("\n");
  const taxonomyContext = args.sourceBlocks
    .map((block) => block.metadata?.presentationTaxonomyContext)
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  const items = dedupe(
    extractCleanSourceItems({
      sourceSpanText: semanticSourceText,
      sectionTitle: args.title,
    }).map((item) => item.text),
  );
  const blockScopedUnits = extractNumberedParentGroups(
    args.sourceBlocks,
    args.title,
  );
  const indentedUnits = extractIndentedGroups(semanticSourceText, args.title);
  const orderedRun = findOrderedRun(semanticSourceText, args.title, items);
  const cueUnits = extractCueRelationshipUnits(semanticSourceText, args.title, items);
  const pairedUnits = extractLabelRelationshipUnits(items, args.title, args.tags);

  let units: readonly PlannedSemanticUnit[];
  let kind: PlannedSectionSemanticPlan["kind"];

  if (blockScopedUnits.length > 0) {
    units = blockScopedUnits;
    kind = "category-hierarchy";
  } else if (indentedUnits.length > 0) {
    units = indentedUnits;
    kind = "category-hierarchy";
  } else if (cueUnits.length > 0) {
    units = cueUnits;
    kind = cueUnits.some((unit) => unit.kind === "examples")
      ? "example-group"
      : "category-hierarchy";
  } else if (pairedUnits.length > 0) {
    units = pairedUnits;
    kind = relationshipKind(args.title, args.tags);
  } else if (orderedRun.length >= 2 && hasSupportedProcedureSequence(args.title, semanticSourceText)) {
    units = [{ kind: "steps", label: args.title, items: orderedRun }];
    kind = "procedure";
  } else if (items.length >= 2) {
    units = items.map((text) => ({ kind: "point", label: text, items: [] }));
    kind = CHECKLIST_FRAME_PATTERN.test(args.title) ? "checklist" : "list";
  } else {
    units = [];
    kind = "concept";
  }

  const orderedRunAlreadyGrouped = units.some(
    (unit) =>
      unit.kind === "steps" &&
      normalizeKey(unit.items.join(" ")) === normalizeKey(orderedRun.join(" ")),
  );
  if (orderedRun.length >= 2 && kind !== "procedure" && !orderedRunAlreadyGrouped &&
      hasSupportedProcedureSequence(args.title, semanticSourceText)) {
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
    explanationUseful: explanationAddsStudyValue(semanticSourceText, items, units),
    ...(taxonomyContext ? { taxonomyContext } : {}),
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
          orderedChildren &&
            hasSupportedChildSequence(parent, children) &&
            children.every((child) => ACTION_START_PATTERN.test(child))
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

function hasSupportedChildSequence(
  parent: string,
  children: readonly string[],
): boolean {
  if (PROCEDURE_FRAME_PATTERN.test(parent)) return true;
  return children.some((child) =>
    /\b(?:after|before|then|next|finally|following|previous)\b|\(\s*[a-z]\s*\)|\b(?:step|stage|phase)\s+\d+\b/i.test(
      child,
    ),
  );
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
          return unit.items.map((item) => `${unit.label}: ${item}`);
        case "steps":
          return unit.items.map(
            (item, index) => `${index + 1}. ${item}`,
          );
        case "examples":
          return unit.items.map((item) => `${unit.label}: ${item}`);
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

type RelationshipCueKind = "examples" | "group";

interface RelationshipCue {
  readonly kind: RelationshipCueKind;
  readonly label: string;
  readonly inlineItem?: string;
  readonly usePrecedingLabel?: boolean;
  readonly form: "example" | "label" | "sentence";
  readonly childCount?: number;
}

function extractCueRelationshipUnits(
  sourceText: string,
  sectionTitle: string,
  items: readonly string[],
): readonly PlannedSemanticUnit[] {
  const itemSentenceCueIndex = items.findIndex((item) =>
    parseRelationshipCue(item)?.form === "sentence",
  );
  if (itemSentenceCueIndex >= 0) {
    const cue = parseRelationshipCue(items[itemSentenceCueIndex] ?? "");
    if (cue) {
      const availableChildren = items.slice(itemSentenceCueIndex + 1);
      const childCount = Math.min(
        cue.childCount ?? availableChildren.length,
        availableChildren.length,
      );
      const children = availableChildren.slice(0, childCount);
      if (children.length > 0) {
        return [
          { kind: cue.kind, label: cue.label || sectionTitle, items: children },
          ...availableChildren.slice(childCount).map((label) => ({
            kind: "point" as const,
            label,
            items: [],
          })),
        ];
      }
    }
  }
  const itemCueIndexes = items.flatMap((item, index) => {
    const cue = parseRelationshipCue(item);
    return cue ? [{ index, cue }] : [];
  });
  if (itemCueIndexes.length > 0) {
    const relatedUnits: PlannedSemanticUnit[] = [];
    const consumedIndexes = new Set<number>();
    for (const [position, entry] of itemCueIndexes.entries()) {
      const end = itemCueIndexes[position + 1]?.index ?? items.length;
      const children = [
        ...(entry.cue.inlineItem ? [entry.cue.inlineItem] : []),
        ...items.slice(entry.index + 1, end),
      ];
      if (children.length === 0) continue;
      const precedingIndex = entry.index - 1;
      const label = entry.cue.usePrecedingLabel
        ? items[precedingIndex] || sectionTitle
        : entry.cue.label || sectionTitle;
      relatedUnits.push({ kind: entry.cue.kind, label, items: dedupe(children) });
      consumedIndexes.add(entry.index);
      for (let index = entry.index + 1; index < end; index += 1) consumedIndexes.add(index);
      if (entry.cue.usePrecedingLabel && precedingIndex >= 0) consumedIndexes.add(precedingIndex);
    }
    if (relatedUnits.length > 0) {
      return [
        ...items.flatMap((label, index) =>
          consumedIndexes.has(index)
            ? []
            : [{ kind: "point" as const, label, items: [] }],
        ),
        ...relatedUnits,
      ];
    }
  }
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, "").replace(/^(?:\d{1,3}|[a-z])[.)]\s*/i, "").trim());
  const cueIndexes = lines.flatMap((item, index) => {
    const cue = parseRelationshipCue(item);
    return cue ? [{ index, cue }] : [];
  });
  if (cueIndexes.length === 0) return [];

  const units: PlannedSemanticUnit[] = [];
  for (const [position, entry] of cueIndexes.entries()) {
    const end = cueIndexes[position + 1]?.index ?? lines.length;
    const children = [
      ...(entry.cue.inlineItem ? [entry.cue.inlineItem] : []),
      ...lines.slice(entry.index + 1, end),
    ].filter((item) => !parseRelationshipCue(item));
    if (children.length === 0) continue;
    const preceding = lines[entry.index - 1];
    const label = entry.cue.usePrecedingLabel
      ? preceding || sectionTitle
      : entry.cue.label || sectionTitle;
    units.push({
      kind: entry.cue.kind,
      label,
      items: dedupe(children),
    });
  }
  const represented = new Set(
    units.flatMap((unit) => [unit.label, ...unit.items]).map(normalizeKey),
  );
  const remainingPoints = items
    .filter((item) => !represented.has(normalizeKey(item)))
    .filter((item) => !parseRelationshipCue(item))
    .filter((item) => ![...represented].some((value) => value && normalizeKey(item).includes(value)));
  return [
    ...remainingPoints.map((label) => ({ kind: "point" as const, label, items: [] })),
    ...units,
  ];
}

function parseRelationshipCue(value: string): RelationshipCue | undefined {
  const normalized = value.trim();
  const inlineExample = /^(?:examples?\s*[:.-]|ex\.\s*|e\.g\.\s*|for\s+example\s*[:,.-]?)\s*(.+)$/i.exec(normalized);
  if (inlineExample?.[1]) {
    return {
      kind: "examples",
      label: "Examples",
      inlineItem: inlineExample[1].trim(),
      usePrecedingLabel: true,
      form: "example",
    };
  }
  if (/^(?:common\s+)?(?:examples?|ex\.?|for\s+example)\s*:?[\s-]*$/i.test(normalized)) {
    return { kind: "examples", label: "Examples", usePrecedingLabel: true, form: "example" };
  }

  const labelCue = /^(?:(common)\s+)?(components?|parts?|advantages?|benefits?|disadvantages?|limitations?|drawbacks?|implementations?|types?|categories?|classes?|forms?|characteristics?|features?|properties?|requirements?)\s*:?[\s-]*$/i.exec(normalized);
  if (labelCue) return { kind: "group", label: normalized.replace(/\s*:\s*$/, ""), form: "label" };

  const sentenceCue = /^(.*?)(?:is|are)?\s*(?:made\s+up\s+of|composed\s+of|consists?\s+of|comprises?|contains?)\s+(?:the\s+following\s+)?(?:(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+)?(?:components?|parts?|types?|categories?|elements?)\s*:?$/i.exec(normalized);
  if (sentenceCue) {
    return {
      kind: "group",
      label: conciseRelationshipLabel(sentenceCue[1]?.trim() ?? ""),
      form: "sentence",
      ...(sentenceCue[2] ? { childCount: parseCount(sentenceCue[2]) } : {}),
    };
  }
  return undefined;
}

function conciseRelationshipLabel(value: string): string {
  return value.split(/\s+/).filter(Boolean).length > 5 ? "" : value;
}

function parseCount(value: string): number {
  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric)) return numeric;
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"].indexOf(value.toLocaleLowerCase());
}

export function hasExplicitRelationshipCue(sourceText: string): boolean {
  return sourceText.split(/\r?\n/).some((line) => parseRelationshipCue(line.replace(/^\s*(?:[-*+]|\d+[.)])\s*/, "")) !== undefined);
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
  if (hasSupportedProcedureSequence(title, sourceText) && items.length >= 2) return items;
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

export function hasSupportedProcedureSequence(title: string, sourceText: string): boolean {
  const orderedMarkerCount = [...sourceText.matchAll(ORDERED_MARKER_PATTERN)].length;
  if (orderedMarkerCount < 2) return false;
  if (PROCEDURE_FRAME_PATTERN.test(title)) return true;
  const lines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lead = lines.find((line) => normalizeKey(line) !== normalizeKey(title) && !/^(?:\d{1,3}|[a-z])[.)]\s+/i.test(line));
  return Boolean(
    lead &&
    PROCEDURE_FRAME_PATTERN.test(lead) &&
    /[:：]\s*$/.test(lead),
  );
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
