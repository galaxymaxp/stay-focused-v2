import { buildSourceRepresentationMap } from './reviewer-source-representation.js';
import type { RequiredEvidenceTarget, ReviewerEvidenceBlock, SourceGroundedCore } from './types.js';

/** Projects immutable factual identities into source-owned visible spans. */
export function presentDeterministicEvidence(targets: readonly RequiredEvidenceTarget[]): SourceGroundedCore {
  const keyPoints: string[] = [];
  const evidence: ReviewerEvidenceBlock[] = [];
  const map = buildSourceRepresentationMap(targets);
  const tables = new Set<string>();
  for (const entry of map.entries) {
    const target = entry.target;
    const tableId = target.kind === 'table-row' ? target.provenance.find(p => p.tableBlockId)?.tableBlockId : undefined;
    if (tableId) {
      if (tables.has(tableId)) continue;
      tables.add(tableId);
      const rows = map.entries.filter(item => item.target.kind === 'table-row' &&
        item.target.provenance.some(p => p.tableBlockId === tableId))
        .sort((a, b) => (a.target.provenance.find(p => p.tableBlockId)?.tableRowIndex ?? 0) -
          (b.target.provenance.find(p => p.tableBlockId)?.tableRowIndex ?? 0));
      evidence.push({kind: 'table', text: rows.map(row => row.text).join('\n')});
      continue;
    }
    const kind = entry.prose ? undefined : target.kind === 'code' ? 'code' : target.kind === 'formula' ? 'formula'
      : target.kind === 'result-value' ? 'result' : target.kind === 'example' ? 'example' : undefined;
    if (kind) evidence.push({kind, text: entry.text});
    else keyPoints.push(entry.text);
  }
  return {explanation: '', keyPoints, evidence};
}
export function sameVisibleText(a: string, b: string): boolean {
  const normalize = (text: string) => text.normalize('NFKC')
    .replace(/^\s*[-*•]\s*/u, '').replace(/[.!?]+$/u, '').replace(/\s+/gu, ' ').trim().toLowerCase();
  return normalize(a) === normalize(b);
}
/** Restore only the subject supplied by the source heading. */
export function completeSourcePredicate(title: string, explanation: string): string {
  const text = explanation.trim().replace(/^\s*[-*•]\s*/u, '');
  return /^(?:is|are|was|were|may|reports?|has|have)\b/iu.test(text)
    ? `${title.trim()} ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
}
