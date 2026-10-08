import type { ActivityDraft, LibraryArtifactSummary, ReviewerReaderModel } from '@stay-focused/shared';

export type StudyFormat = 'pdf' | 'docx' | 'pptx';
export type ExportBlock = {
  kind: 'brand' | 'title' | 'subtitle' | 'heading' | 'body' | 'bullet' | 'question' | 'answer' | 'table';
  text: string;
  emphasis?: readonly { text: string; style: 'bold' | 'underline' | 'highlight' }[];
  rows?: readonly (readonly string[])[];
};
export type ExportDocument = { title: string; blocks: ExportBlock[] };

export function styledRuns(block: ExportBlock): { text: string; style: 'normal' | 'bold' | 'underline' | 'highlight' }[] {
  const ranges = (block.emphasis ?? []).map(mark => ({ ...mark, start: block.text.indexOf(mark.text) }))
    .filter(mark => mark.start >= 0).sort((a, b) => a.start - b.start);
  const runs: { text: string; style: 'normal' | 'bold' | 'underline' | 'highlight' }[] = [];
  let from = 0;
  for (const range of ranges) {
    if (range.start < from) continue;
    if (range.start > from) runs.push({ text: block.text.slice(from, range.start), style: 'normal' });
    runs.push({ text: range.text, style: range.style });
    from = range.start + range.text.length;
  }
  if (from < block.text.length) runs.push({ text: block.text.slice(from), style: 'normal' });
  return runs.length ? runs : [{ text: block.text, style: 'normal' }];
}

export function exportFileName(summary: Pick<LibraryArtifactSummary, 'title' | 'type' | 'course'>, format: StudyFormat): string {
  const clean = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70);
  const course = summary.course?.code ? `${clean(summary.course.code)}_` : '';
  const type = summary.type === 'activity_output' ? 'Draft' : 'Reviewer';
  return `${course}${clean(summary.title) || 'Study'}_${type}.${format}`;
}

export function reviewerExport(summary: LibraryArtifactSummary, reviewer: ReviewerReaderModel): ExportDocument {
  const blocks: ExportBlock[] = [
    { kind: 'brand', text: 'Stay Focused' },
    ...(summary.course ? [{ kind: 'subtitle' as const, text: summary.course.name }] : []),
    { kind: 'title', text: summary.title },
    ...(summary.sourceTitle ? [{ kind: 'subtitle' as const, text: `Source: ${summary.sourceTitle}` }] : []),
  ];
  reviewer.sections.forEach((section, index) => {
    blocks.push({ kind: 'heading', text: `Topic ${index + 1} · ${section.title}` });
    section.blocks.forEach(block => {
      if (block.title.trim().toLowerCase() !== section.title.trim().toLowerCase()) blocks.push({ kind: 'heading', text: block.title });
      blocks.push({ kind: 'body', text: block.explanation, emphasis: block.emphasis?.filter(mark => mark.target === 'explanation' && mark.index === 0) });
      block.keyPoints.forEach((point, pointIndex) => blocks.push({ kind: 'bullet', text: point, emphasis: block.emphasis?.filter(mark => mark.target === 'key_point' && mark.index === pointIndex) }));
      block.evidence.forEach(item => {
        if (item.kind === 'table') {
          const rows = item.text.split('\n').map(line => line.trim()).filter(line => line.startsWith('|'))
            .map(line => line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()))
            .filter(row => row.some(cell => cell) && !row.every(cell => /^:?-{2,}:?$/.test(cell)));
          if (rows.length > 1) blocks.push({ kind: 'table', text: '', rows });
          else blocks.push({ kind: 'body', text: item.text });
        } else blocks.push({ kind: 'body', text: item.text });
      });
    });
  });
  return { title: summary.title, blocks };
}

export function activityExport(summary: LibraryArtifactSummary, draft: ActivityDraft): ExportDocument {
  const blocks: ExportBlock[] = [{ kind: 'brand', text: 'Stay Focused' },
    ...(summary.course ? [{ kind: 'subtitle' as const, text: summary.course.name }] : []),
    { kind: 'title', text: draft.title }];
  draft.sections.forEach((section, index) => {
    blocks.push({ kind: 'heading', text: section.heading || `Section ${index + 1}` });
    blocks.push({ kind: 'body', text: section.content });
  });
  draft.slides.forEach(slide => {
    blocks.push({ kind: 'heading', text: slide.title });
    blocks.push({ kind: 'body', text: slide.body });
    if (slide.speakerNotes) blocks.push({ kind: 'body', text: `Speaker notes: ${slide.speakerNotes}` });
  });
  return { title: draft.title, blocks };
}
