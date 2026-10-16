/** Deliberately flat: no HTML, links, images, headings or recursive markdown. */
export type StudyInline = { readonly text: string; readonly bold: boolean };
export type StudyTextBlock =
  | { readonly kind: 'paragraph'; readonly content: readonly StudyInline[] }
  | { readonly kind: 'bullets'; readonly items: readonly (readonly StudyInline[])[] }
  | { readonly kind: 'steps'; readonly items: readonly { readonly number: number; readonly content: readonly StudyInline[] }[] };

function inline(text: string): StudyInline[] {
  // Only balanced, non-nested **key terms**. Escaped/unknown syntax stays literal.
  const pattern = /(?<![\\*])\*\*([^*\n\\]+)\*\*(?!\*)/g;
  const result: StudyInline[] = [];
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > start) result.push({ text: text.slice(start, match.index), bold: false });
    result.push({ text: match[1]!, bold: true });
    start = match.index + match[0].length;
  }
  if (start < text.length) result.push({ text: text.slice(start), bold: false });
  return result;
}

export function parseStudyText(text: string): StudyTextBlock[] {
  const blocks: StudyTextBlock[] = [];
  let lines: string[] = [];
  const flush = () => {
    if (lines.length) blocks.push({ kind: 'paragraph', content: inline(lines.join('\n')) });
    lines = [];
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) { flush(); continue; }
    const bullet = /^- (\S.*)$/.exec(line);
    const step = /^([1-9]\d{0,2})\. (\S.*)$/.exec(line);
    if (bullet) {
      flush();
      const last = blocks.at(-1);
      const item = inline(bullet[1]!);
      if (last?.kind === 'bullets') blocks[blocks.length - 1] = { kind: 'bullets', items: [...last.items, item] };
      else blocks.push({ kind: 'bullets', items: [item] });
    } else if (step) {
      flush();
      const last = blocks.at(-1);
      const item = { number: Number(step[1]), content: inline(step[2]!) };
      if (last?.kind === 'steps') blocks[blocks.length - 1] = { kind: 'steps', items: [...last.items, item] };
      else blocks.push({ kind: 'steps', items: [item] });
    } else lines.push(line);
  }
  flush();
  return blocks;
}

/** Shared instruction; factual grounding and action-specific caps remain authoritative. */
export const STUDY_FORMAT_INSTRUCTIONS = 'Format explanatory text with one short lead line, then short "- " bullets; use "1. " numbered steps for processes. Use **bold** only for key terms. No nested lists, markdown headings, HTML, links or images. Keep all existing word targets and character caps, including formatting. Truthful unavailable replies may stay one sentence.';
