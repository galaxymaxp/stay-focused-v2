import type { RequiredEvidenceTarget, ResidualSourceEvidence, SourceGroundedCore, TypedEvidenceGroup, ReviewerEvidenceBlock } from './types.js';
import { standaloneSourceClause, withoutRepeatedSourceHeading } from './reviewer-presentation-prose.js';

export interface SourceRepresentation {
  readonly id: string;
  readonly text: string;
  readonly target: RequiredEvidenceTarget;
  readonly prose?: boolean;
  readonly displayKind?: ReviewerEvidenceBlock["kind"];
  readonly displayOrder?: number;
  readonly sourceHeading?: string;
}
export interface SourceRepresentationMap {
  readonly entries: readonly SourceRepresentation[];
  readonly owners: ReadonlyMap<string, readonly string[]>;
}
/** Whitespace equivalence only; never infer numbers, operators or words. */
export function sourceSpanKey(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}
/** Paired Markdown display-math delimiters are presentation, not formula facts. */
export function sourceFormulaSpan(text: string): string {
  return /^\s*\$\$([\s\S]*?)\$\$\s*$/u.exec(text)?.[1]?.trim() ?? text;
}
/** Split only explicit prose boundaries; never infer mathematical/code layout. */
export function sourceProseSpans(text: string): readonly string[] {
  if (/[=\\{}|]/u.test(text) || /^\s*(?:\d+|[a-z])[.)]\s/u.test(text)) return [text];
  return text.split(/\r?\n|(?<=[^\d.!?][.!?])\s+(?=[\p{Lu}])/u).map(s => s.trim()).filter(Boolean);
}
export function containsSourceSpan(container: string, span: string): boolean {
  const text = sourceSpanKey(container);
  const part = sourceSpanKey(span);
  let index = text.indexOf(part);
  while (part && index >= 0) {
    const before = text[index - 1] ?? '';
    const after = text[index + part.length] ?? '';
    if (!(/[\p{L}\p{N}]/u.test(before) && /^[\p{L}\p{N}]/u.test(part)) &&
        !(/[\p{L}\p{N}]/u.test(after) && /[\p{L}\p{N}]$/u.test(part))) return true;
    index = text.indexOf(part, index + 1);
  }
  return false;
}
function sameSource(left: RequiredEvidenceTarget, right: RequiredEvidenceTarget): boolean {
  return left.sourceBlockIds.some(id => right.sourceBlockIds.includes(id));
}
function sameRow(left: RequiredEvidenceTarget, right: RequiredEvidenceTarget): boolean {
  return left.provenance.some(a => a.tableBlockId !== undefined && a.tableRowIndex !== undefined &&
    right.provenance.some(b => a.tableBlockId === b.tableBlockId && a.tableRowIndex === b.tableRowIndex));
}
/** Every character is retained as a residual span or owned exact child span.
 * The graph is derived from immutable targets, never from provider output. */
export function buildSourceRepresentationMap(targets: readonly RequiredEvidenceTarget[]): SourceRepresentationMap {
  const entries: SourceRepresentation[] = [];
  const owners = new Map<string, readonly string[]>();
  const building = new Set<string>();
  const build = (target: RequiredEvidenceTarget): readonly string[] => {
    const existing = owners.get(target.id);
    if (existing) return existing;
    building.add(target.id);
    const index = targets.indexOf(target);
    const alias = targets.find((other, otherIndex) => otherIndex < index && sameSource(target, other) &&
      sourceSpanKey(other.label) === sourceSpanKey(target.label) &&
      (!target.provenance.some(p => p.tableBlockId) || sameRow(target, other)) && !building.has(other.id));
    if (alias) {
      const result = build(alias);
      owners.set(target.id, result);
      building.delete(target.id);
      return result;
    }
    const rowOwner = target.kind === 'table-cell' || target.kind === 'table-row'
      ? targets.find(other => other !== target && other.kind === 'table-row' && sameRow(target, other) &&
        other.label.length > target.label.length && containsSourceSpan(other.label, target.label) && !building.has(other.id))
      : undefined;
    if (rowOwner) {
      const result = build(rowOwner);
      owners.set(target.id, result);
      building.delete(target.id);
      return result;
    }
    const compositeParent = target.relationshipLabel &&
      !['code', 'formula', 'result-value', 'table-row'].includes(target.kind)
      ? targets.slice(0, index).reverse().find(other => other.label === target.relationshipLabel &&
        containsSourceSpan(other.label, target.label) && !building.has(other.id)) : undefined;
    if (compositeParent) {
      const result = build(compositeParent);
      owners.set(target.id, result);
      building.delete(target.id);
      return result;
    }
    let residuals = [target.label.trim()];
    const references: string[] = [];
    let prose = false;
    const subtract = (text: string, ids: readonly string[]) => {
      if (!residuals.some(part => containsSourceSpan(part, text))) return;
      const pattern = sourceSpanKey(text).split(' ')
        .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
      residuals = residuals.flatMap(part => containsSourceSpan(part, text)
        ? part.split(new RegExp(pattern, 'u')).map(span => span.trim()).filter(Boolean) : [part]);
      references.push(...ids);
    };
    // A source prose prefix followed by an exact cached code suffix may be
    // separated, but indentation or code syntax is never reconstructed.
    if (target.kind === 'code') {
      const code = targets.filter(other => other !== target && other.kind === 'code' && sameSource(target, other) &&
        target.label.endsWith(other.label) && other.label.length < target.label.length &&
        /[:.]\s*$/u.test(target.label.slice(0, -other.label.length)) && !building.has(other.id))
        .sort((a, b) => b.label.length - a.label.length)[0];
      if (code) {
        prose = true;
        subtract(code.label, build(code));
      }
    }
    // A table is subtracted as a complete ordered row set, never as scattered
    // cells/numbers inside prose. Partial matches must leave the passage intact.
    if (!['code', 'formula', 'result-value', 'table-row', 'table-cell'].includes(target.kind)) {
      const tableIds = new Set(targets.flatMap(other => other.kind === 'table-row'
        ? other.provenance.flatMap(p => p.tableBlockId ? [p.tableBlockId] : []) : []));
      for (const tableId of tableIds) {
        const rows = targets.filter(other => other.kind === 'table-row' && other !== target &&
          other.provenance.some(p => p.tableBlockId === tableId) && !building.has(other.id));
        if (!rows.length || !rows.every(row => sameSource(target, row) || row.relationshipLabel === target.label)) continue;
        const uniqueRows = rows.filter((row, i) => rows.findIndex(other => sameRow(row, other) && other.label === row.label) === i)
          .sort((a, b) => (a.provenance.find(p => p.tableBlockId)?.tableRowIndex ?? 0) -
            (b.provenance.find(p => p.tableBlockId)?.tableRowIndex ?? 0));
        const text = uniqueRows.map(row => row.label).join('\n');
        if (residuals.some(part => containsSourceSpan(part, text))) subtract(text, uniqueRows.flatMap(build));
      }
    }
    const children = targets.filter(other => other !== target && !building.has(other.id) &&
      // Scalars and partial mathematical/code runs are not independent spans.
      !['code', 'formula', 'result-value', 'table-row', 'table-cell'].includes(target.kind) &&
      ['code', 'formula', 'result-value'].includes(other.kind) &&
      sourceSpanKey(other.label).includes(' ') &&
      other.label.trim().length < target.label.trim().length &&
      (sourceSpanKey(other.relationshipLabel ?? '') === sourceSpanKey(target.label) ||
       (sameSource(target, other) && ['code', 'formula', 'result-value'].includes(other.kind) &&
        target.kind !== 'table-row' && target.kind !== 'table-cell')))
      .sort((a, b) => b.label.length - a.label.length);
    for (const child of children) {
      const span = child.kind === 'formula' ? sourceFormulaSpan(child.label) : child.label;
      if (!residuals.some(text => containsSourceSpan(text, span))) continue;
      subtract(span, build(child));
    }
    if (prose || !['code', 'formula', 'result-value', 'table-row', 'table-cell'].includes(target.kind)) {
      residuals = residuals.flatMap(sourceProseSpans);
    }
    const ownIds = residuals.map((text, part) => {
      const id = `${target.id}:${part}`;
      entries.push({id, text, target, ...(prose ? {prose: true} : {})});
      return id;
    });
    const result = [...ownIds, ...references];
    owners.set(target.id, result);
    building.delete(target.id);
    return result;
  };
  for (const target of targets) build(target);
  // Labels usually equal evidenceTexts, but the factual contract may carry
  // additional spans. Display ownership must cover those too.
  for (const target of targets) {
    target.evidenceTexts.forEach((text, index) => {
      if (containsSourceSpan(target.label, text)) return;
      const id = `${target.id}:evidence:${index}`;
      entries.push({id, text, target});
      owners.set(target.id, [...(owners.get(target.id) ?? []), id]);
    });
  }
  // Explicit relationship parents own their label once. Unknown relations stay
  // local; equal text in separate source contexts is never globally deduped.
  const labelOwners = new Map(owners);
  for (const target of targets) {
    const relation = target.relationshipLabel?.trim();
    if (!relation || sourceSpanKey(relation) === sourceSpanKey(target.label)) continue;
    const index = targets.indexOf(target);
    const parent = targets.slice(0, index).reverse().find(other => sourceSpanKey(other.label) === sourceSpanKey(relation));
    if (parent) owners.set(target.id, [...new Set([...(owners.get(target.id) ?? []), ...(labelOwners.get(parent.id) ?? [])])]);
    else {
      const id = `${target.id}:relation`;
      entries.push({id, text: relation, target});
      owners.set(target.id, [...(owners.get(target.id) ?? []), id]);
    }
  }
  // Semantic list order is already frozen in the manifest. Coarse block
  // provenance can assign several items to a parent and must not reorder them.
  // Table rows have their own explicit row-index ordering in the projection.
  entries.sort((a, b) => targets.indexOf(a.target) - targets.indexOf(b.target));
  const aliases = new Map<string, readonly string[]>();
  const tableIds = new Set(targets.flatMap(t => t.kind === 'table-row'
    ? t.provenance.flatMap(p => p.tableBlockId ? [p.tableBlockId] : []) : []));
  for (const tableId of tableIds) {
    const rows = entries.filter(e => e.target.kind === 'table-row' &&
      e.target.provenance.some(p => p.tableBlockId === tableId))
      .sort((a, b) => (a.target.provenance.find(p => p.tableBlockId === tableId)?.tableRowIndex ?? 0) -
        (b.target.provenance.find(p => p.tableBlockId === tableId)?.tableRowIndex ?? 0));
    // Flatten only known cell/row separators. Cross-row mapping fragments can
    // be owned by the complete ordered table, never by scattered matching cells.
    const tableText = sourceSpanKey(rows.map(r => r.text.replace(/\|/gu, ' ')).join(' '));
    for (const entry of entries) {
      if (entry.target.kind !== 'mapping' || !sourceSpanKey(entry.text).includes(' ') ||
          !rows.some(row => sameSource(entry.target, row.target))) continue;
      if (containsSourceSpan(tableText, entry.text)) aliases.set(entry.id, rows.map(row => row.id));
    }
  }
  // Exact spans in the same source context share one display owner. Independent
  // rows (including equal-valued rows) and different source contexts remain.
  for (const [index, entry] of entries.entries()) {
    if (aliases.has(entry.id) || !entry.prose && ['table-row', 'table-cell', 'code', 'formula'].includes(entry.target.kind)) continue;
    const owner = entries.slice(0, index).find(other => !aliases.has(other.id) &&
      sameSource(entry.target, other.target) && sourceSpanKey(other.text) === sourceSpanKey(entry.text));
    if (owner) aliases.set(entry.id, [owner.id]);
  }
  for (const [targetId, ids] of owners) owners.set(targetId,
    [...new Set(ids.flatMap(id => aliases.get(id) ?? [id]))]);
  return {entries: entries.filter(entry => !aliases.has(entry.id)), owners};
}

/** A second, display-only graph. The factual/ancestry graph above stays frozen.
 * Split composites only at accepted member boundaries; no word-based fact repair.
 * Every original owner resolves to all its pieces or to a complete typed owner. */
export function buildSourceRoleRepresentationMap(
  targets: readonly RequiredEvidenceTarget[],
  groups: readonly TypedEvidenceGroup[] = [],
): SourceRepresentationMap {
  const map = buildSourceRepresentationMap(targets);
  const active = groups.filter(group => map.entries.some(entry =>
    !['code', 'formula', 'result-value', 'table-row', 'table-cell'].includes(entry.target.kind) &&
    group.members.filter(member => member.kind === 'paragraph' &&
      entry.target.sourceBlockIds.includes(member.blockId) && member.evidenceTexts.some(text =>
        containsSourceSpan(entry.text, text))).length >= 2));
  if (!active.length) return map;
  const members = active.flatMap(group => group.members);
  const orderOf = (blockId: string) => targets.flatMap(t => t.provenance)
    .find(p => p.sourceBlockId === blockId)?.sourceOrder ?? Number.MAX_SAFE_INTEGER;
  const sameContext = (entry: SourceRepresentation, blockId: string) =>
    entry.target.sourceBlockIds.includes(blockId) || active.some(group =>
      group.sourceBlockIds.includes(blockId) && entry.target.provenance.some(p => p.evidenceGroupId === group.id));
  const candidates = members.flatMap(member => {
    if (member.kind === 'paragraph' || member.kind === 'heading') return member.evidenceTexts.flatMap(text => {
      const suffix=text.replace(/^\s*(?:\d+|[a-z])[.)]\s+/iu,'');
      return [{text,member},...(suffix!==text?[{text:suffix,member}]:[])];
    });
    if (member.kind !== 'table' || !member.tableCells?.length) return [];
    // A typed table's leading text before its first row is a caption. It remains
    // visible beside the table, even when the frozen caption is incomplete.
    const firstRow = Math.min(...member.tableCells.map(c => c.rowIndex));
    const header = member.tableCells.filter(c => c.rowIndex === firstRow)
      .sort((a,b) => a.columnIndex-b.columnIndex).map(c => c.text).join(' | ');
    return member.evidenceTexts.flatMap(text => {
      const firstCell = member.tableCells?.find(c => c.rowIndex === firstRow && c.columnIndex === 0)?.text;
      const rowLine = text.split('\n').find(line => line.includes('|') && firstCell && containsSourceSpan(line,firstCell));
      const offset = text.indexOf(rowLine ?? header);
      return offset > 0 ? [{text:text.slice(0,offset).trim(),member}] : [];
    });
  }).filter(c => sourceSpanKey(c.text).includes(' ') || /^[\p{L}]+:$/u.test(c.text.trim())).sort((a,b) => b.text.length-a.text.length);
  const entries: SourceRepresentation[] = [];
  const replacements = new Map<string, readonly string[]>();
  for (const entry of map.entries) {
    if (!members.some(m => sameContext(entry,m.blockId)) ||
        ['code','formula','table-row','table-cell','result-value'].includes(entry.target.kind)) {
      const member = members.find(m => entry.target.sourceBlockIds.length === 1 && m.blockId === entry.target.sourceBlockIds[0]);
      entries.push({...entry,...(member ? {displayOrder:orderOf(member.blockId)} : {})});
      continue;
    }
    type Piece = {text:string; member?: (typeof members)[number]};
    let pieces: Piece[] = [{text:sourceSpanKey(entry.text)}];
    for (const candidate of candidates) {
      if (!sameContext(entry,candidate.member.blockId)) continue;
      const span = sourceSpanKey(candidate.text);
      pieces = pieces.flatMap(piece => {
        if (piece.member || !containsSourceSpan(piece.text,span)) return [piece];
        const offset=piece.text.indexOf(span);
        return [{text:piece.text.slice(0,offset).trim()}, {text:span,member:candidate.member},
          {text:piece.text.slice(offset+span.length).trim()}].filter(p=>p.text);
      });
    }
    const ids: string[]=[];
    for (const [index,piece] of pieces.entries()) {
      // A table fragment must match one contiguous sequence in its canonical
      // ordered cells, and all rows must have visible owners. Never collect
      // scattered matching numbers or accept an incomplete row set.
      const table = !piece.member && members.find(m => {
        if (m.kind !== 'table' || !m.tableCells?.length || !sameContext(entry,m.blockId)) return false;
        const cells=[...m.tableCells].sort((a,b)=>a.rowIndex-b.rowIndex||a.columnIndex-b.columnIndex);
        const rowIndices=[...new Set(cells.map(c=>c.rowIndex))];
        const rows=map.entries.filter(e=>e.target.kind==='table-row' && e.target.provenance.some(p=>p.tableBlockId===m.blockId));
        return rowIndices.every(i=>rows.some(r=>r.target.provenance.some(p=>p.tableRowIndex===i) &&
          containsSourceSpan(r.text,cells.filter(c=>c.rowIndex===i).map(c=>c.text).join(' | ')))) &&
          containsSourceSpan(cells.map(c=>c.text).join(' '),piece.text);
      });
      if (table) {
        ids.push(...map.entries.filter(e=>e.target.kind==='table-row'&&e.target.provenance.some(p=>p.tableBlockId===table.blockId)).map(e=>e.id));
        continue;
      }
      const existing = map.entries.find(other => other.id !== entry.id &&
        ['example','result-value'].includes(other.target.kind) && sameSource(entry.target,other.target) &&
        containsSourceSpan(other.text,piece.text));
      if (existing) {ids.push(existing.id); continue;}
      const heading = piece.member ? undefined : members.find(m => m.kind === 'heading' && m.evidenceTexts.some(text =>
        sourceSpanKey(text.replace(/^\s*(?:\d+|[a-z])[.)]\s+/iu,'')) === sourceSpanKey(piece.text)));
      const member=piece.member ?? heading;
      const group=member && active.find(g=>g.sourceBlockIds.includes(member.blockId));
      const order=member ? orderOf(member.blockId) : undefined;
      const afterFormula=group && order !== undefined && group.formulaBlockIds.some(id=>orderOf(id)<order);
      const objective=member && /^(?:Example\b|Find\b|Compute\b|Calculate\b)/iu.test(piece.text) &&
        group?.members.some(m=>orderOf(m.blockId)>order! && ['table','formula'].includes(m.kind));
      const displayKind = objective ? 'example' as const : member && (member.kind==='table' || afterFormula) ? 'source' as const : undefined;
      const id=pieces.length===1?entry.id:`${entry.id}:role:${index}`;
      entries.push({...entry,id,text:piece.text,...(displayKind?{displayKind}:{}),...(member?.kind==='heading'?{sourceHeading:member.evidenceTexts[0]}:{}),...(order!==undefined?{displayOrder:order}:{}),
        ...(member?{target:{...entry.target,sourceBlockIds:[member.blockId]}}:{})});
      ids.push(id);
    }
    replacements.set(entry.id,ids);
  }
  const resolve=(id:string,seen=new Set<string>()):readonly string[]=>{
    if(seen.has(id)) return [id];
    const next=replacements.get(id);
    return next ? next.flatMap(child=>child===id?[id]:resolve(child,new Set([...seen,id]))) : [id];
  };
  return {entries:entries.sort((a,b)=>(a.displayOrder??Math.min(...a.target.provenance.map(p=>p.sourceOrder)))-
      (b.displayOrder??Math.min(...b.target.provenance.map(p=>p.sourceOrder)))),
    owners:new Map([...map.owners].map(([id,owned])=>[id,[...new Set(owned.flatMap(o=>resolve(o)))]]))};
}

/** Only displayed text discharges an owner. Internal target IDs never suffice. */
export function representedSourceOwners(map: SourceRepresentationMap, core: SourceGroundedCore, title?: string, residuals: readonly ResidualSourceEvidence[] = []): ReadonlySet<string> {
  const texts = [core.explanation, ...core.keyPoints, ...(core.evidence ?? []).map(block => block.text)];
  const represented = new Set<string>();
  const used = new Map<string, number>();
  for (const entry of map.entries) {
    if (title && entry.sourceHeading === title) {represented.add(entry.id); continue;}
    const technical = !entry.prose && ['code', 'formula', 'table-row', 'table-cell'].includes(entry.target.kind);
    const boundary = sourceBoundaryPresentation(entry, residuals);
    const sourceProse = boundary.text.replace(/^\s*[-*•]\s*/u, '');
    const prose = ['example','result-value'].includes(entry.target.kind) ? sourceProse : standaloneSourceClause(sourceProse);
    const key = sourceSpanKey(technical ? entry.text : title ? withoutRepeatedSourceHeading(prose, title) : prose);
    const count = texts.reduce((total, text) => total + sourceSpanKey(text).split(key).length - 1, 0);
    const ordinal = used.get(key) ?? 0;
    if (key && count > ordinal && texts.some(text => containsSourceSpan(text, key)) &&
        (!boundary.continuation || texts.some(text => containsSourceSpan(text, boundary.continuation!)))) represented.add(entry.id);
    used.set(key, ordinal + 1);
  }
  return represented;
}

/** A clipped determiner belongs to the next complete source unit. The unit
 * boundary and the entire visible continuation are both required as proof. */
export function sourceBoundaryPresentation(entry: SourceRepresentation, residuals: readonly ResidualSourceEvidence[]): {text: string; continuation?: string} {
  if (['code', 'formula', 'table-row', 'table-cell'].includes(entry.target.kind)) return {text:entry.text};
  const ordered = [...residuals].sort((a,b)=>a.sourceOrder-b.sourceOrder);
  const index = ordered.findIndex(span => span.classification === 'CHILD_OWNED' &&
    span.ownerIds.includes(entry.id) && entry.target.sourceBlockIds.includes(span.sourceBlockId) &&
    sourceSpanKey(entry.text).startsWith(`${sourceSpanKey(span.text)} `));
  const span = ordered[index];
  const next = ordered[index+1];
  if (!span || !next || !['UNIQUE_REQUIRED','UNRESOLVED','CHILD_OWNED'].includes(next.classification)) return {text:entry.text};
  const suffix = sourceSpanKey(entry.text).slice(sourceSpanKey(span.text).length).trim();
  if (!/^(?:The|A|An)$/u.test(suffix) || !next.text.startsWith(`${suffix} `)) return {text:entry.text};
  return {text:span.text,continuation:next.displayText ?? next.text};
}

/** A collective source-item proof is scoped by source identity and requires all
 * source characters. It does not use the legacy prose token-recall allowance. */
export function sourceItemHasVisibleOwnedEvidence(
  item: {readonly text: string; readonly sourceBlockIds?: readonly string[]},
  targets: readonly RequiredEvidenceTarget[],
  core: SourceGroundedCore,
  title?: string,
  residuals: readonly ResidualSourceEvidence[] = [],
  groups: readonly TypedEvidenceGroup[] = [],
): boolean {
  if (!item.sourceBlockIds?.length) return false;
  const map = buildSourceRoleRepresentationMap(targets, groups);
  const represented = representedSourceOwners(map, core, title, residuals);
  const owned = map.entries.filter(entry => represented.has(entry.id) &&
    entry.target.sourceBlockIds.some(id => item.sourceBlockIds!.includes(id)));
  let remaining = sourceSpanKey(item.text);
  for (const entry of [...owned].sort((a, b) => b.text.length - a.text.length)) {
    if (containsSourceSpan(entry.text, item.text)) return true;
    const text = sourceSpanKey(entry.text);
    if (containsSourceSpan(remaining, text)) remaining = remaining.replace(text, ' ').trim();
  }
  return remaining.length === 0;
}
