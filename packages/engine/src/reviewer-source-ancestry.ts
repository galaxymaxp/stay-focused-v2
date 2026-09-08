import { buildSourceRepresentationMap, containsSourceSpan, sourceSpanKey, sourceProseSpans, sourceFormulaSpan } from './reviewer-source-representation.js';
import type { NormalizedSourceBlock, RequiredEvidenceTarget, ResidualSourceEvidence, SourceGroundedCore } from './types.js';
import { isInstructionalHeadingText, isInstructionalNoiseText } from './review-content.js';

/** The manifest is a selection, not a proof that the source span is exhausted.
 * Keep a second, source-owned contract without changing any target identity. */
export function buildResidualSourceEvidence(args: {
  readonly title: string;
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
  readonly targets: readonly RequiredEvidenceTarget[];
}): readonly ResidualSourceEvidence[] {
  const map = buildSourceRepresentationMap(args.targets);
  let instructionalRegion = false;
  return [...args.sourceBlocks].sort((a, b) => a.order - b.order).flatMap(block => {
    const structured = block.structuredBlock;
    if (!structured) return [];
    if (block.kind === 'heading') instructionalRegion = isInstructionalHeadingText(block.text);
    // Typed payloads have their own exact row/formula/code manifest contract.
    const units = structured.type === 'list'
      ? [...structured.items].sort((a, b) => a.order - b.order).map(item => ({id: item.id, text: item.text}))
      : ['paragraph', 'heading'].includes(structured.type)
        ? [{id: block.id, text: block.text}] : [];
    return units.flatMap(unit => {
      // A composite target's explicit provenance can bridge a child whose
      // coarse manifest locator points at another block in that same span.
      const ancestors = args.targets.filter(t => t.sourceBlockIds.includes(block.id));
      const owned = map.entries.filter(e => e.target.sourceBlockIds.includes(block.id) ||
        ancestors.some(parent => e.target.sourceBlockIds.some(id => parent.sourceBlockIds.includes(id)) &&
          (parent.sourceBlockIds.length > 1 || e.target.relationshipLabel === parent.label || map.owners.get(parent.id)?.includes(e.id))));
      const text = sourceSpanKey(unit.text.replace(/^\s*[-*•]\s*/u, ''));
      const fullOwner = owned.find(e => containsSourceSpan(e.text.replace(/^\s*[-*•]\s*/u, ''), text));
      const base = {sourceBlockId: block.id, sourceItemId: unit.id, sourceOrder: block.order,
        ...(structured.parentId ? {parentId: structured.parentId} : {})};
      if (fullOwner) return [{...base, id: `${unit.id}:span:0`, text,
        classification: 'CHILD_OWNED' as const, ownerIds: [fullOwner.id]}];
      // Metadata roles and an exact visible heading are structural proof.
      // Never override an existing factual target, including meaningful headers.
      const activityCommand = instructionalRegion && /^(?:answer|complete|create|implement|run|submit|try|use|write)\b/iu.test(text) &&
        isInstructionalNoiseText(text, {explanationField: true});
      if ((structured.role === 'furniture' || structured.role === 'metadata' || activityCommand ||
          (block.kind === 'heading' && isInstructionalHeadingText(text)) ||
          (block.kind === 'heading' && text === sourceSpanKey(args.title))) &&
          !owned.some(e => containsSourceSpan(text, e.text.replace(/^\s*[-*•]\s*/u, '')))) {
        return [{...base, id: `${unit.id}:span:0`, text,
          classification: 'PRESENTATION_ONLY' as const, ownerIds: []}];
      }
      let remaining = [text];
      const covered: ResidualSourceEvidence[] = [];
      // Only whole owned spans may be removed; never subtract scalar tokens
      // from a neighboring definition or an incomplete table row set.
      for (const entry of [...owned].sort((a, b) => b.text.length - a.text.length)) {
        const part = sourceSpanKey((entry.target.kind === 'formula' ? sourceFormulaSpan(entry.text) : entry.text).replace(/^\s*[-*•]\s*/u, ''));
        if (!part.includes(' ') || ['table-cell', 'table-row'].includes(entry.target.kind)) continue;
        remaining = remaining.flatMap(span => {
          if (!containsSourceSpan(span, part)) return [span];
          const offset = span.indexOf(part);
          const before = span.slice(0, offset).trim();
          const after = span.slice(offset + part.length).trim();
          if (/^(?:\d+|[a-z])[.)]$/u.test(before)) return [span];
          const technical = ['code', 'formula', 'result-value'].includes(entry.target.kind);
          if ((before && !/[.!?:]$/u.test(before)) || (after && !technical && !/[.!?:]$/u.test(part))) return [span];
          covered.push({...base, id: `${unit.id}:owned:${covered.length}`, text: part,
            classification: 'CHILD_OWNED', ownerIds: [entry.id]});
          return [span.slice(0, offset), span.slice(offset + part.length)].map(s => s.trim()).filter(Boolean);
        });
      }
      return [...covered, ...remaining.flatMap(sourceProseSpans).map((span, index) => ({...base,
        id: `${unit.id}:residual:${index}`, text: span,
        classification: structured.role === 'content' || structured.type === 'list'
          ? 'UNIQUE_REQUIRED' as const : 'UNRESOLVED' as const, ownerIds: [],
      }))];
    });
  });
}

export function visibleResidualSourceEvidence(spans: readonly ResidualSourceEvidence[]): readonly ResidualSourceEvidence[] {
  return spans.filter(s => s.classification === 'UNIQUE_REQUIRED' || s.classification === 'UNRESOLVED');
}

/** Internal ancestry is never visible coverage. This also protects serialized
 * outputs after the deterministic marker has been removed. */
export function missingVisibleResidualSourceEvidence(spans: readonly ResidualSourceEvidence[], core: SourceGroundedCore): readonly ResidualSourceEvidence[] {
  const texts = [core.explanation, ...core.keyPoints, ...(core.evidence ?? []).map(b => b.text)];
  return visibleResidualSourceEvidence(spans).filter(span => !texts.some(text =>
    containsSourceSpan(text, span.text) ||
    sourceSpanKey(text.replace(/^\s*[-*•]\s*/u, '').replace(/[.!?]+$/u, '')).toLowerCase() ===
      sourceSpanKey(span.text.replace(/[.!?]+$/u, '')).toLowerCase()));
}
