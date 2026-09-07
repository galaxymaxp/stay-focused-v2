import { requiredEvidenceTargetIsRepresented } from './required-evidence.js';
import type { RequiredEvidenceTarget, ReviewerEvidenceBlock, SourceGroundedCore } from './types.js';

/** Projects source-owned targets into prose and typed blocks without changing
 * the manifest. The unchanged target matcher is the final conservation gate. */
export function presentDeterministicEvidence(targets: readonly RequiredEvidenceTarget[]): SourceGroundedCore {
  const keyPoints: string[] = [];
  const evidence: ReviewerEvidenceBlock[] = [];
  const tables = new Map<string, RequiredEvidenceTarget[]>();
  for (const target of targets) {
    const tableId = target.provenance.find(p => p.tableBlockId)?.tableBlockId;
    if (target.kind === 'table-row' && tableId) {
      const rows = tables.get(tableId) ?? [];
      rows.push(target);
      tables.set(tableId, rows);
    }
  }
  const renderedTables = new Set<string>();
  for (const target of targets) {
    const tableId = target.provenance.find(p => p.tableBlockId)?.tableBlockId;
    if (target.kind === 'table-row' && tableId) {
      if (renderedTables.has(tableId)) continue;
      renderedTables.add(tableId);
      const rows = [...tables.get(tableId)!].sort((left, right) =>
        (left.provenance.find(p => p.tableBlockId)?.tableRowIndex ?? 0) -
        (right.provenance.find(p => p.tableBlockId)?.tableRowIndex ?? 0));
      const seenRows = new Set<string>();
      const labels = rows.filter(row => {
        // Identity protects distinct source rows even when their values match.
        const identity = `${row.provenance.find(p => p.tableBlockId)?.tableRowIndex}\u001f${row.label}`;
        if (seenRows.has(identity)) return false;
        seenRows.add(identity);
        return true;
      }).map(row => row.label.trim());
      const relations = [...new Set(rows.flatMap(row => row.relationshipLabel ? [row.relationshipLabel.trim()] : []))]
        .filter(relation => !labels.some(label => sameVisibleText(label, relation)));
      evidence.push({kind: 'table', text: [...relations, ...labels].join('\n')});
      continue;
    }
    const text = renderTarget(target);
    const kind = target.kind === 'code' ? 'code' : target.kind === 'formula' ? 'formula'
      : target.kind === 'result-value' ? 'result' : target.kind === 'example' ? 'example' : undefined;
    // A whole-span duplicate can be omitted only when a larger target contains
    // the exact span AND shares provenance. Never remove individual tokens.
    const contained = targets.some(other => other !== target &&
      renderTarget(other).length > text.length && renderTarget(other).includes(text) &&
      target.sourceBlockIds.some(id => other.sourceBlockIds.includes(id)));
    if (contained) continue;
    if (kind) evidence.push({kind, text});
    else if (!keyPoints.includes(text)) keyPoints.push(text);
  }
  // A source passage can contain a table already emitted by the typed path.
  // Remove that exact table span only if the *unchanged* matcher still finds
  // every affected target in the resulting displayed evidence.
  for (let index = 0; index < keyPoints.length; index += 1) {
    const original = keyPoints[index]!;
    for (const block of evidence.filter(block => block.kind === 'table')) {
      const escaped = block.text.trim().split(/\s+/u)
        .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
      const candidate = original.replace(new RegExp(escaped, 'u'), '').trim();
      if (candidate === original) continue;
      const proposed = keyPoints.map((point, i) => i === index ? candidate : point);
      const rows = [...proposed, ...evidence.map(item => item.text)];
      if (targets.every(target => requiredEvidenceTargetIsRepresented(target, rows))) keyPoints[index] = candidate;
    }
  }
  for (const target of targets) {
    const rows = [...keyPoints, ...evidence.map(block => block.text)];
    if (requiredEvidenceTargetIsRepresented(target, rows)) continue;
    // Unsafe overlap remains visible, rather than losing a required relation.
    evidence.push({kind: 'source', text: renderTarget(target)});
  }
  return {explanation: '', keyPoints: keyPoints.filter(Boolean), ...(evidence.length ? {evidence} : {})};
}

function renderTarget(target: RequiredEvidenceTarget): string {
  const label = target.label.trim();
  const relation = target.relationshipLabel?.trim();
  return relation && !sameVisibleText(relation, label) ? `${relation}: ${label}` : label;
}

export function sameVisibleText(a: string, b: string): boolean {
  const normalize = (text: string) => text.normalize('NFKC')
    .replace(/^\s*[-*•]\s*/u, '').replace(/[.!?]+$/u, '').replace(/\s+/gu, ' ').trim().toLowerCase();
  return normalize(a) === normalize(b);
}

/** Restore only the subject supplied by the source heading. */
export function completeSourcePredicate(title: string, explanation: string): string {
  const text = explanation.trim().replace(/^\s*[-*•]\s*/u, "");
  return /^(?:is|are|was|were|may|reports?|has|have)\b/iu.test(text)
    ? `${title.trim()} ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
}
