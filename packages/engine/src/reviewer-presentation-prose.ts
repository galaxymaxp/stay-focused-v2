/** Display edits to source prose only. A typed referent must be established by
 * the caller from this section's source-owned evidence, never provider output. */
export function presentSourceNavigation(text: string, hasTypedReferent: boolean): string {
  if (!hasTypedReferent) return text;
  if (/^examples?:\s*$/iu.test(text)) return '';
  if (/^(?:an?|the) example(?: of this)? (?:is )?shown (?:here|above|below|in the (?:next|previous) (?:slide|page))[.:]?$/iu.test(text.trim())) return '';
  const projected = text
    .replace(/^As (?:seen|shown) (?:in|on) the (?:previous|next) (?:slide|page),\s*/u, '')
    .replace(/^(The code) (?:in|on) the (?:previous|next) (?:slide|page)(?= is\b)/u, '$1');
  return projected === text ? text : projected.charAt(0).toUpperCase() + projected.slice(1);
}

/** Sentence equality, not semantic similarity. Punctuation is display-only;
 * numeric separators, operators, and word order remain significant. */
export function displayProseKey(text: string): string {
  return text.normalize('NFKC').replace(/^\s*[-*•]\s*/u, '')
    .replace(/[.!?]+$/u, '').replace(/\s+/gu, ' ').trim().toLowerCase();
}

export function displayProseSentences(text: string): readonly string[] {
  // Do not split code, equations, or enumerated source lists as sentences.
  if (/[=\\{}|]/u.test(text)) return [text];
  return text.split(/(?<=[^\d.!?][.!?])\s+(?=[\p{Lu}])/u).filter(Boolean);
}

/** Remove only an exact copy of the local section heading from a prose prefix. */
export function withoutRepeatedSourceHeading(text: string, title: string): string {
  const heading = title.replace(/^\s*(?:[a-z]|\d+)[.)]\s+/iu, '').trim();
  if (!heading) return text;
  const prefix = heading.split(/\s+/u).map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');
  const remainder = text.replace(new RegExp(`^${prefix}\\s+(?=\\S)`, 'iu'), '');
  // A title that is the sentence's subject (including a parenthetical symbol)
  // is not a redundant prefix. Require an independently supplied subject.
  return /^(?:The|A|An|This|These|Those|It|They)\s/u.test(remainder) ? remainder : text;
}

/** A factual since-clause can stand alone after removing its linking word.
 * Conditional clauses (if/unless) and partial predicates are never rewritten. */
export function standaloneSourceClause(text: string): string {
  const clause = /^Since (.+\b(?:is|are|was|were|has|have)\b.+),\s*$/u.exec(text)?.[1];
  return clause ? `${clause.charAt(0).toUpperCase()}${clause.slice(1)}.` : text;
}
