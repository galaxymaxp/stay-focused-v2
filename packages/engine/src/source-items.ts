import { normalizeCoverageTitleKey } from "./stage4-verify.js";

export interface SourceItem {
  readonly text: string;
}

export interface ExtractCleanSourceItemsArgs {
  readonly sourceSpanText: string;
  readonly sectionTitle: string;
}

const LIST_MARKER_PATTERN =
  /(?:^|\s)(?:[-*]\s+|\u2022\s+|\d{1,2}[.)]\s*|[a-z]\)\s*)/gi;

export function extractCleanSourceItems(
  args: ExtractCleanSourceItemsArgs,
): readonly SourceItem[] {
  const normalized = normalizeListMarkers(args.sourceSpanText);
  const markerMatches = [...normalized.matchAll(LIST_MARKER_PATTERN)];
  if (markerMatches.length < 2) {
    return [];
  }

  const items: SourceItem[] = [];
  for (let index = 0; index < markerMatches.length; index += 1) {
    const match = markerMatches[index];
    const nextMatch = markerMatches[index + 1];
    if (!match || match.index === undefined) {
      continue;
    }

    const itemStart = match.index + match[0].length;
    const itemEnd = nextMatch?.index ?? normalized.length;
    const rawItemText = cleanSourceItemText(
      normalized.slice(itemStart, itemEnd),
    );
    const itemText = stripTrailingRepeatedSectionTitle(
      rawItemText,
      args.sectionTitle,
    );
    if (
      itemText.length > 0 &&
      normalizeCoverageTitleKey(itemText).length > 0
    ) {
      items.push({ text: itemText });
    }
  }

  return items;
}

function normalizeListMarkers(value: string): string {
  return value
    .replace(/\u00e2\u20ac\u00a2/g, " \u2022 ")
    .replace(/\u2022/g, " \u2022 ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSourceItemText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[.:;,\s]+/, "")
    .trim();
}

function stripTrailingRepeatedSectionTitle(
  itemText: string,
  sectionTitle: string,
): string {
  const normalizedTitleKey = normalizeCoverageTitleKey(sectionTitle);
  if (!itemText || !normalizedTitleKey) {
    return itemText;
  }

  // Repeated headings can be fused onto the final item when source slides/lists repeat titles.
  // Clean before grounding and before passing detected items into Stage 3, or the model will
  // faithfully copy polluted items such as "Scareware Types of Malware".
  let cleaned = itemText;
  while (true) {
    const suffixStart = cleaned
      .toLocaleLowerCase()
      .lastIndexOf(sectionTitle.toLocaleLowerCase());
    if (suffixStart <= 0) {
      return cleaned;
    }

    const suffix = cleaned
      .slice(suffixStart)
      .replace(/[\s:;,.!?-]+$/, "");
    const prefix = cleaned.slice(0, suffixStart).trim();
    if (
      normalizeCoverageTitleKey(suffix) !== normalizedTitleKey ||
      normalizeCoverageTitleKey(prefix).length === 0
    ) {
      return cleaned;
    }
    cleaned = prefix;
  }
}
