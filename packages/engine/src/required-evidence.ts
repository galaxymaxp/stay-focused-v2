import { countWords, isInstructionalNoiseText } from "./review-content.js";
import type {
  NormalizedSourceBlock,
  PlannedSection,
  PlannedSectionSemanticPlan,
  PlannedSemanticUnit,
  RequiredEvidenceProvenance,
  RequiredEvidenceTarget,
  RequiredEvidenceTargetKind,
  SectionOutput,
  TypedEvidenceGroup,
} from "./types.js";

interface EvidenceCandidate {
  readonly unit: PlannedSemanticUnit;
  readonly unitIndex: number;
  readonly itemIndex?: number;
  readonly text: string;
  readonly relationshipLabel?: string;
}

interface LocatedEvidence {
  readonly kind: RequiredEvidenceTargetKind;
  readonly provenance: readonly RequiredEvidenceProvenance[];
}

const CONTENT_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "in", "is", "it", "of", "on", "or", "the", "this", "to", "was",
  "were", "with",
]);

export function buildRequiredEvidenceManifest(args: {
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly semanticPlan: PlannedSectionSemanticPlan;
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
  readonly evidenceGroups?: readonly TypedEvidenceGroup[];
}): readonly RequiredEvidenceTarget[] {
  // Existing semantic targets stay required, including source examples, code,
  // result values and table rows. Only learner commands are not study evidence.
  const candidates = semanticCandidates(args.semanticPlan).filter((candidate) =>
    candidate.text.trim().length > 0 && !isInstructionalNoiseText(candidate.text)
  );

  const conceptCandidates = candidates.length === 0
    ? fallbackConceptCandidates(args.sectionTitle, args.sourceBlocks)
    : [];

  const semanticTargets = [...candidates, ...conceptCandidates].map((candidate) => {
    const located = locateEvidence(
      candidate.text,
      args.sourceBlocks,
      args.evidenceGroups ?? [],
      defaultKind(candidate.unit),
    );
    const sourceBlockIds = unique(
      located.provenance.map((entry) => entry.sourceBlockId),
    );
    const identity = [
      args.sectionId,
      candidate.unitIndex,
      candidate.itemIndex ?? "label",
      located.kind,
      ...located.provenance.map(provenanceIdentity),
    ].join("\u001f");
    const cellIds = new Set(located.provenance.flatMap((entry) => entry.tableCellIds ?? []));
    const tableCells = (args.evidenceGroups ?? []).flatMap((group) =>
      group.members.flatMap((member) => (member.tableCells ?? []).filter((cell) => cellIds.has(cell.cellId)))
    );
    return {
      id: stableId("required-evidence", identity),
      kind: located.kind,
      label: candidate.text,
      evidenceTexts: [candidate.text],
      ...(candidate.relationshipLabel
        ? { relationshipLabel: candidate.relationshipLabel }
        : {}),
      sourceBlockIds,
      provenance: located.provenance,
      ...(tableCells.length > 0 ? { tableCells } : {}),
    } satisfies RequiredEvidenceTarget;
  });
  // Typed technical evidence must not become optional merely because the
  // prose semantic analyzer found no list (for example a definition + formula).
  const technicalTargets: RequiredEvidenceTarget[] = [];
  for (const block of args.sourceBlocks) {
    const structured = block.structuredBlock;
    if (!structured || structured.role === "furniture") continue;
    const group = args.evidenceGroups?.find((entry) => entry.sourceBlockIds.includes(block.id));
    const base = baseProvenance(block, group?.id);
    const add = (kind: RequiredEvidenceTargetKind, text: string, provenance = base) => {
      if (!text.trim()) return;
      if (semanticTargets.some((target) =>
        target.kind === kind && normalize(target.label) === normalize(text) &&
        target.sourceBlockIds.includes(block.id)
      )) return;
      technicalTargets.push({
        id: stableId("required-evidence", `${args.sectionId}\u001f${kind}\u001f${provenanceIdentity(provenance)}`),
        kind, label: text, evidenceTexts: [text], sourceBlockIds: [block.id], provenance: [provenance],
        ...(kind === "table-row" ? {
          tableCells: group?.members.find((member) => member.blockId === block.id)?.tableCells
            ?.filter((cell) => cell.rowIndex === provenance.tableRowIndex) ?? [],
        } : {}),
      });
    };
    if (structured.type === "formula") add("formula", structured.rawText);
    if (structured.type === "code") add("code", structured.text);
    if (structured.type === "table") {
      for (const row of structured.rows) {
        add("table-row", row.cells.map((cell) => cell.text).join(" | "), {
          ...base, tableBlockId: structured.id, tableRowIndex: row.index,
          tableCellIds: row.cells.map((cell) => cell.id),
        });
      }
    }
    if (group?.resultBlockIds.includes(block.id) && /\d/u.test(block.text) && !isInstructionalNoiseText(block.text)) {
      add("result-value", block.text);
    }
  }
  return uniqueTargets([...semanticTargets, ...technicalTargets]);
}

export function findMissingRequiredEvidenceTargets(
  section: PlannedSection,
  output: SectionOutput | undefined,
): readonly RequiredEvidenceTarget[] {
  const targets = section.requiredEvidence ?? [];
  if (!output) return targets;
  const visibleRows = [
    ...(output.deterministicEvidence ? [] : [output.sourceCore?.explanation]),
    ...(output.sourceCore?.keyPoints ?? []),
  ].filter((value): value is string => typeof value === "string")
    .map((value) => value.trim()).filter(Boolean);
  const visibleText = visibleRows.join("\n");
  return targets.filter((target) => !requiredEvidenceTargetIsRepresented(target, visibleRows, visibleText));
}

export function requiredEvidenceTargetIsRepresented(
  target: RequiredEvidenceTarget,
  rows: readonly string[],
  visibleText = rows.join("\n"),
): boolean {
  return targetIsRepresented(target, rows, visibleText);
}

export function requiredEvidenceSourceIsAvailable(args: {
  readonly section: PlannedSection;
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
}): boolean {
  const blockById = new Map(args.sourceBlocks.map((block) => [block.id, block] as const));
  return (args.section.requiredEvidence ?? []).every((target) => {
    if (target.sourceBlockIds.length === 0) return false;
    const sourceText = target.sourceBlockIds
      .map((id) => blockById.get(id)?.text ?? "")
      .join("\n");
    return target.sourceBlockIds.every((id) => blockById.has(id)) &&
      target.evidenceTexts.every((text) => evidenceRecall(text, sourceText) === 1);
  });
}

export function serializeRequiredEvidenceTarget(target: RequiredEvidenceTarget): string {
  return JSON.stringify({
    id: target.id,
    kind: target.kind,
    sourceLabel: target.label,
    sourceEvidence: target.evidenceTexts,
    relationshipLabel: target.relationshipLabel ?? null,
    provenance: target.provenance,
    ...(target.tableCells ? { cells: target.tableCells } : {}),
  });
}

function semanticCandidates(
  plan: PlannedSectionSemanticPlan,
): readonly EvidenceCandidate[] {
  return plan.units.flatMap((unit, unitIndex) => {
    if (unit.kind === "point" || unit.items.length === 0) {
      return [{ unit, unitIndex, text: unit.label }];
    }
    const children = unit.items.map((text, itemIndex) => ({
      unit,
      unitIndex,
      itemIndex,
      text,
      relationshipLabel: unit.label,
    }));
    return [{ unit, unitIndex, text: unit.label }, ...children];
  });
}

function fallbackConceptCandidates(
  sectionTitle: string,
  blocks: readonly NormalizedSourceBlock[],
): readonly EvidenceCandidate[] {
  const titleKey = normalize(sectionTitle);
  const informative = blocks.filter((block) =>
    block.kind !== "heading" &&
    block.structuredBlock?.role !== "furniture" &&
    !isInstructionalNoiseText(block.text) &&
    normalize(block.text) !== titleKey
  );
  const preferred = informative.find((block) =>
    block.kind === "paragraph" && countWords(block.text) >= 5 && countWords(block.text) <= 50
  ) ?? (informative.length === 1 ? informative[0] : undefined);
  if (!preferred) return [];
  const unit: PlannedSemanticUnit = { kind: "point", label: preferred.text, items: [] };
  return [{ unit, unitIndex: 0, text: preferred.text }];
}

function locateEvidence(
  text: string,
  blocks: readonly NormalizedSourceBlock[],
  groups: readonly TypedEvidenceGroup[],
  fallbackKind: RequiredEvidenceTargetKind,
): LocatedEvidence {
  const groupByBlockId = new Map<string, string>();
  const resultBlockIds = new Set<string>();
  for (const group of groups) {
    for (const blockId of group.sourceBlockIds) groupByBlockId.set(blockId, group.id);
    for (const blockId of group.resultBlockIds) resultBlockIds.add(blockId);
  }

  let best: { score: number; kind: RequiredEvidenceTargetKind; provenance: RequiredEvidenceProvenance } | undefined;
  for (const block of blocks) {
    const base = baseProvenance(block, groupByBlockId.get(block.id));
    const structured = block.structuredBlock;
    if (structured?.type === "table") {
      for (const row of structured.rows) {
        const rowText = row.cells.map((cell) => cell.text).join(" | ");
        best = prefer(best, {
          score: evidenceRecall(text, rowText),
          kind: "table-row",
          provenance: {
            ...base,
            tableBlockId: structured.id,
            tableRowIndex: row.index,
            tableCellIds: row.cells.map((cell) => cell.id),
          },
        });
        for (const cell of row.cells) {
          best = prefer(best, {
            score: evidenceRecall(text, cell.text),
            kind: "table-cell",
            provenance: {
              ...base,
              tableBlockId: structured.id,
              tableRowIndex: row.index,
              tableCellIds: [cell.id],
            },
          });
        }
      }
    } else if (structured?.type === "list") {
      for (const item of structured.items) {
        best = prefer(best, {
          score: evidenceRecall(text, item.text),
          kind: "list-item",
          provenance: { ...base, sourceItemId: item.id },
        });
      }
    } else if (structured?.type === "formula") {
      for (const formula of [structured.rawText, structured.latex ?? ""].filter(Boolean)) {
        best = prefer(best, { score: evidenceRecall(text, formula), kind: "formula" as const, provenance: base });
      }
    } else if (structured?.type === "code") {
      best = prefer(best, { score: evidenceRecall(text, structured.text), kind: "code" as const, provenance: base });
    }
    best = prefer(best, {
      score: evidenceRecall(text, block.text),
      kind: resultBlockIds.has(block.id) ? "result-value" : fallbackKind,
      provenance: base,
    });
  }

  // Semantic units can span a label, a code/formula block and its result.
  // Retain each contributing block, rather than pretending the best matching
  // block contains the complete target. This does not add source evidence.
  const bestBlock = blocks.find((block) => block.id === best?.provenance.sourceBlockId);
  if (best && bestBlock && evidenceRecall(text, bestBlock.text) < 1) {
    const relevant = blocks.filter((block) => {
      if (block.structuredBlock?.role === "furniture") return false;
      const terms = contentTerms(block.text);
      const expected = new Set(contentTerms(text));
      const matches = terms.filter((term) => expected.has(term)).length;
      return terms.length > 0 && (matches >= 2 || matches / terms.length >= 0.5 ||
        protectedTokens(text).some((token) => protectedTokens(block.text).includes(token)));
    });
    const contributors = [best.provenance, ...relevant
      .filter((block) => block.id !== best.provenance.sourceBlockId)
      .map((block) => baseProvenance(block, groupByBlockId.get(block.id)))];
    if (evidenceRecall(text, relevant.map((block) => block.text).join("\n")) === 1) {
      return { kind: best.kind, provenance: contributors.sort((a, b) => a.sourceOrder - b.sourceOrder) };
    }
  }
  if (!best || best.score < 0.45) {
    const fallbackBlock = blocks.find((block) => block.structuredBlock?.role !== "furniture") ?? blocks[0];
    return {
      kind: fallbackKind,
      provenance: fallbackBlock ? [baseProvenance(fallbackBlock, groupByBlockId.get(fallbackBlock.id))] : [],
    };
  }
  return { kind: best.kind, provenance: [best.provenance] };
}

function targetIsRepresented(
  target: RequiredEvidenceTarget,
  rows: readonly string[],
  visibleText: string,
): boolean {
  const evidencePresent = target.evidenceTexts.every((expected) => {
    if (target.kind === "formula") {
      const formula = normalizeFormula(expected);
      return formula.length > 0 && normalizeFormula(visibleText).includes(formula);
    }
    if (target.kind === "code") {
      return rows.some((row) => row.replace(/\s+/g, "").includes(expected.replace(/\s+/g, "")));
    }
    if (target.kind === "table-row" || target.kind === "table-cell" || target.kind === "list-item" || target.kind === "result-value") {
      return rows.some((row) => evidenceRecall(expected, row) === 1);
    }
    return rows.some((row) => evidenceRecall(expected, row) >= 0.85) ||
      evidenceRecall(expected, visibleText) >= 0.9;
  });
  if (!evidencePresent) return false;
  if (!target.relationshipLabel) return true;
  return rows.some((row) =>
    evidenceRecall(target.relationshipLabel ?? "", row) >= 0.65 &&
    target.evidenceTexts.every((expected) => evidenceRecall(expected, row) >= 0.75)
  );
}

function defaultKind(unit: PlannedSemanticUnit): RequiredEvidenceTargetKind {
  switch (unit.kind) {
    case "point": return "concept";
    case "mapping": return "mapping";
    case "definition": return "relationship";
    case "group": return "relationship";
    case "steps": return "procedure-step";
    case "sequence": return "procedure-step";
    case "examples": return "example";
  }
}

function baseProvenance(
  block: NormalizedSourceBlock,
  evidenceGroupId?: string,
): RequiredEvidenceProvenance {
  return {
    sourceBlockId: block.id,
    sourceOrder: block.order,
    ...(block.pageNumber !== undefined ? { pageNumber: block.pageNumber } : {}),
    ...(evidenceGroupId ? { evidenceGroupId } : {}),
  };
}

function prefer<T extends { readonly score: number }>(
  current: T | undefined,
  candidate: T,
): T {
  return !current || candidate.score > current.score ? candidate : current;
}

function evidenceRecall(expected: string, actual: string): number {
  const expectedTerms = contentTerms(expected);
  const actualTerms = new Set(contentTerms(actual));
  if (expectedTerms.length === 0 || actualTerms.size === 0) {
    return normalize(expected) === normalize(actual) && normalize(expected).length > 0 ? 1 : 0;
  }
  const matched = expectedTerms.filter((term) => actualTerms.has(term)).length;
  const protectedExpected = protectedTokens(expected);
  const protectedActual = new Set(protectedTokens(actual));
  if (protectedExpected.some((token) => !protectedActual.has(token))) return 0;
  return matched / expectedTerms.length;
}

function contentTerms(value: string): readonly string[] {
  return (value.toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:[-/&][\p{L}\p{N}]+)*/gu) ?? [])
    .filter((term) => !CONTENT_STOPWORDS.has(term));
}

function protectedTokens(value: string): readonly string[] {
  return value.match(/(?:\d[\d,.]*|[A-Z]{2,}|[=+*/^∑Σ])/gu) ?? [];
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function normalizeFormula(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "").trim();
}

function provenanceIdentity(value: RequiredEvidenceProvenance): string {
  return [
    value.sourceBlockId,
    value.sourceItemId ?? "",
    value.tableBlockId ?? "",
    value.tableRowIndex ?? "",
    ...(value.tableCellIds ?? []),
  ].join(":");
}

function uniqueTargets(
  targets: readonly RequiredEvidenceTarget[],
): readonly RequiredEvidenceTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.kind}\u001f${target.provenance.map(provenanceIdentity).join("|")}\u001f${normalize(target.label)}\u001f${target.relationshipLabel ? normalize(target.relationshipLabel) : ""}`;
    if (!normalize(target.label) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter(Boolean))];
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
