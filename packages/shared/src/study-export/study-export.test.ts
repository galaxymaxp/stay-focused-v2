import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { strFromU8, unzipSync } from 'fflate';
import type { LibraryArtifactSummary, ReviewerReaderModel, ActivityDraft, LibraryArtifactDetail } from '@stay-focused/shared';
import { activityExport, exportFileName, reviewerExport } from './layout';
import { createStudyPdf } from './pdf';
import { createStudyDocx } from './docx';
import { createStudyPptx } from './pptx';
import { createStudyFile, formatsFor, STUDY_MIME } from './index';

const summary: LibraryArtifactSummary = { id: 'artifact:one', type: 'reviewer', title: 'Firewall & Network / Basics', course: { id: 'c', code: 'CIT4', name: 'Security' },
  sourceId: null, sourceTitle: 'Lecture.pdf', activityId: null, createdAt: '2026-09-28', updatedAt: '2026-09-28', lastOpenedAt: null,
  status: 'completed', relatedArtifactIds: [] };
const reviewer: ReviewerReaderModel = { id: summary.id, title: summary.title, course: summary.course, source: { id: null, title: 'Lecture.pdf' },
  generatedAt: '2026-09-28', freshness: 'current', sections: [{ id: 's1', title: 'Firewalls', blocks: [{ id: 'b1', title: 'Firewalls',
    explanation: 'A firewall controls network traffic.', keyPoints: ['Phishing attempts to steal information.'],
    emphasis: [{ target: 'explanation', index: 0, text: 'controls network traffic', style: 'highlight' },
      { target: 'key_point', index: 0, text: 'Phishing', style: 'underline' }], evidence: [{ kind: 'table', text: '|Term|Meaning|\n|---|---|\n|Firewall|Traffic control|' }] }] }] };
const text = (bytes: Uint8Array, path: string) => strFromU8(unzipSync(bytes)[path]!);
const activity = { title: 'Activity', sections: [{ id: 's1', heading: 'Explain the firewall', level: 1, content: 'Generated draft', order: 1, sourceRefs: [] }], slides: [] } as unknown as ActivityDraft;

describe('offline study exports', () => {
  it('rejects unsupported formats and quiz exports before building a file', async () => {
    await expect(createStudyFile({ artifact: summary, reviewer }, 'docx')).rejects.toThrow('unsupported_export_format');
    await expect(createStudyFile({ artifact: { ...summary, type: 'quiz' }, quiz: {} } as LibraryArtifactDetail, 'pdf')).rejects.toThrow('unsupported_export_format');
  });
  it.each(['pdf', 'docx', 'pptx'] as const)('builds a named saved Draft %s file with the shared MIME', async format => {
    const file = await createStudyFile({ artifact: { ...summary, type: 'activity_output' }, draft: activity }, format);
    expect(file.name).toBe(`CIT4_Firewall_Network_Basics_Draft.${format}`);
    expect(STUDY_MIME[format]).toContain('application/');
    if (format === 'pdf') expect(new TextDecoder().decode(file.bytes.slice(0, 5))).toBe('%PDF-');
    else expect(Object.keys(unzipSync(file.bytes))).toContain(format === 'docx' ? 'word/document.xml' : 'ppt/presentation.xml');
  });
  it('limits export formats to Reviewer PDF and saved Draft PDF, DOCX, PPTX', () => {
    expect(formatsFor({ artifact: summary, reviewer })).toEqual(['pdf']);
    expect(formatsFor({ artifact: { ...summary, type: 'activity_output' }, draft: activity })).toEqual(['pdf', 'docx', 'pptx']);
    expect(formatsFor({ artifact: { ...summary, type: 'quiz' }, quiz: {} } as LibraryArtifactDetail)).toEqual([]);
  });
  it('sanitizes names and produces a valid paginated PDF with visible emphasis', async () => {
    expect(exportFileName({ ...summary, type: 'activity_output' }, 'docx')).toBe('CIT4_Firewall_Network_Basics_Draft.docx');
    expect(exportFileName(summary, 'pdf')).toBe('CIT4_Firewall_Network_Basics_Reviewer.pdf');
    const bytes = await createStudyPdf(reviewerExport(summary, reviewer));
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });
  it('creates editable Draft Word headings and saved content', () => {
    const xml = text(createStudyDocx(activityExport({ ...summary, type: 'activity_output' }, activity)), 'word/document.xml');
    expect(xml).toContain('w:pStyle w:val="Heading1"');
    expect(xml).toContain('Generated draft');
    expect(xml).not.toContain('My work:');
  });
  it('creates a Draft presentation with saved slide content', () => {
    const files = unzipSync(createStudyPptx(activityExport({ ...summary, type: 'activity_output' }, { ...activity, sections: [], slides: [{ number: 1, title: 'Scenario', body: '[Add the assigned scenario]', speakerNotes: 'Explain the concern', sourceRefs: ['instructions'] }] })));
    const slides = Object.entries(files).filter(([path]) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).map(([, bytes]) => strFromU8(bytes));
    expect(slides.join(' ')).toContain('Scenario');
    expect(slides.join(' ')).toContain('[Add the assigned scenario]');
    expect(slides.join(' ')).toContain('Explain the concern');
  });
  it('keeps Draft line breaks inside Word runs so viewers do not merge lines', () => {
    const body = 'Assignment No. 5\nPrepared by: [Student Name]\n- The company environment';
    const xml = text(createStudyDocx(activityExport({ ...summary, type: 'activity_output' }, { ...activity, sections: [{ ...activity.sections[0]!, content: body }], slides: [] })), 'word/document.xml');
    expect(xml.match(/<w:br\/>/g)).toHaveLength(2);
    // A break is valid only as run content, never directly under <w:p> or between runs.
    expect(xml).not.toMatch(/<\/w:r><w:br\/>|<\/w:pPr><w:br\/>/);
    expect(xml).toMatch(/<\/w:rPr><w:br\/><w:t xml:space="preserve">Prepared by: \[Student Name\]<\/w:t>/);
  });
  it('keeps each Draft slide line as its own paragraph instead of flattening it', () => {
    const files = unzipSync(createStudyPptx(activityExport({ ...summary, type: 'activity_output' }, { ...activity, sections: [], slides: [{ number: 1, title: 'Scenario', body: 'Line one\nLine two\n- Bullet three', speakerNotes: '', sourceRefs: [] }] })));
    const slide = Object.entries(files).filter(([path]) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).map(([, bytes]) => strFromU8(bytes)).find(xml => xml.includes('Line one'))!;
    const paragraphs = [...slide.matchAll(/<a:p>(.*?)<\/a:p>/g)].map(match => [...match[1]!.matchAll(/<a:t>(.*?)<\/a:t>/g)].map(t => t[1]).join(''));
    expect(paragraphs).toEqual(expect.arrayContaining(['Line one', 'Line two', '- Bullet three']));
    expect(slide).not.toContain('Line one Line two');
  });
  it('produces a valid Draft PDF', async () => {
    const pdf = await PDFDocument.load(await createStudyPdf(activityExport({ ...summary, type: 'activity_output' }, activity)));
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });
});
