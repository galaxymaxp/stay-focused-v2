/** Exact substrings only: emphasis never adds terminology to the Reviewer. */
export function memoryKeywordRanges(text: string, context: readonly string[] = []): readonly { start: number; end: number }[] {
  const candidates = [
    ...context,
    ...Array.from(text.matchAll(/\b[A-Z]{2,}(?:[-/][A-Z]{2,})?\b/g), match => match[0]),
    ...Array.from(text.matchAll(/[“"]([^”"]{3,48})[”"]/g), match => match[1]!),
  ];
  const lead = text.match(/^\s*(.{3,48}?)\s+(?:is|are|means|refers to|consists of)\b/i)?.[1];
  if (lead) candidates.push(lead.trim());
  const ranges: { start: number; end: number }[] = [];
  for (const candidate of candidates) {
    const term = candidate.trim();
    if (term.length < 3 || term.length > 48) continue;
    const start = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
    if (start < 0 || ranges.some(range => start < range.end && start + term.length > range.start)) continue;
    ranges.push({ start, end: start + term.length });
    if (ranges.length === 3) break;
  }
  if (!ranges.length) {
    const fallback = text.match(/^\s*([\p{L}\p{N}-]+(?:\s+[\p{L}\p{N}-]+){0,2})/u);
    if (fallback) ranges.push({ start: text.indexOf(fallback[1]!), end: text.indexOf(fallback[1]!) + fallback[1]!.length });
  }
  return ranges.sort((a, b) => a.start - b.start);
}
