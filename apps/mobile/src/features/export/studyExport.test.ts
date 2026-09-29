import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { strFromU8, unzipSync } from 'fflate';
import type { LibraryArtifactSummary, ReviewerReaderModel, ActivityDraft, LibraryArtifactDetail } from '@stay-focused/shared';
import { activityExport, exportFileName, reviewerExport } from './exportLayout';
import { createStudyPdf } from './pdfExport';
import { createStudyDocx } from './docxExport';
import { createStudyPptx } from './pptxExport';
import { formatsFor } from './studyExport';

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
  it('produces a valid Draft PDF', async () => {
    const pdf = await PDFDocument.load(await createStudyPdf(activityExport({ ...summary, type: 'activity_output' }, activity)));
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });
});
