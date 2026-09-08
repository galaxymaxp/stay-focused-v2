import { buildSourceRepresentationMap, containsSourceSpan, sourceBoundaryPresentation } from './reviewer-source-representation.js';
import type { RequiredEvidenceTarget, ResidualSourceEvidence, ReviewerEvidenceBlock, SourceGroundedCore } from './types.js';
import { visibleResidualSourceEvidence } from './reviewer-source-ancestry.js';
import { displayProseKey, standaloneSourceClause, withoutRepeatedSourceHeading } from './reviewer-presentation-prose.js';

/** Projects immutable factual identities into source-owned visible spans. */
export function presentDeterministicEvidence(targets: readonly RequiredEvidenceTarget[], residuals: readonly ResidualSourceEvidence[] = [], title?: string): SourceGroundedCore {
  const keyPoints: string[] = [];
  const evidence: ReviewerEvidenceBlock[] = [];
  const map = buildSourceRepresentationMap(targets);
  const tables = new Set<string>();
  for (const entry of map.entries) {
    const target = entry.target;
    // A complete source item can visibly own a truncated manifest phrase.
    if (!['code', 'formula', 'result-value', 'table-row', 'table-cell'].includes(target.kind) &&
        visibleResidualSourceEvidence(residuals).some(span => target.sourceBlockIds.includes(span.sourceBlockId) &&
          containsSourceSpan(span.text, entry.text))) continue;
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
    else keyPoints.push(standaloneSourceClause(sourceBoundaryPresentation(entry, residuals).text));
  }
  keyPoints.push(...visibleResidualSourceEvidence(residuals).map(span => standaloneSourceClause(span.displayText ?? span.text)));
  if (title) keyPoints.splice(0, keyPoints.length, ...keyPoints.map(point => {
    const remainder = withoutRepeatedSourceHeading(point, title);
    // An existing grammatical subject must not be stripped (Archive is...).
    const completed = completeSourcePredicate(title, remainder);
    return remainder !== point && completed !== remainder ? point : completed;
  }));
  return {explanation: '', keyPoints, evidence};
}
export function sameVisibleText(a: string, b: string): boolean {
  return displayProseKey(a) === displayProseKey(b);
}
/** Restore only the subject supplied by the source heading. */
export function completeSourcePredicate(title: string, explanation: string, sourceHeading = title): string {
  const text = explanation.trim().replace(/^\s*[-*•]\s*/u, '');
  if (!title.trim() || displayProseKey(title) !== displayProseKey(sourceHeading)) return text;
  if (/^prepared (?:before|after|by|for)\s+\S/iu.test(text)) return `${title.trim()} is ${text}`;
  return /^(?:is|are|was|were|can|could|may|must|will|should|reports?|has|have)\b/iu.test(text)
    ? `${title.trim()} ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
}
