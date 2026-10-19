import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivityDraft, LibraryArtifactDetail } from '@stay-focused/shared';
import { fixtureArtifact, fixtureReader } from '../../../../packages/shared/src/experience.fixtures';
import { downloadStudyFile, EXPORT_FAILURE, studyFormats } from './study-export';

const reviewer: LibraryArtifactDetail = { artifact: fixtureArtifact, reviewer: fixtureReader };
const draft: LibraryArtifactDetail = { artifact: { ...fixtureArtifact, type: 'activity_output' }, draft: {
  title: 'Saved draft', sections: [], slides: [],
} as unknown as ActivityDraft };
let blob: Blob, anchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
const revoke = vi.fn<(url: string) => void>();
beforeEach(() => {
  vi.useFakeTimers();
  anchor = { href: '', download: '', click: vi.fn() }; revoke.mockReset();
  vi.stubGlobal('document', { createElement: vi.fn(() => anchor) });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(value => { blob = value as Blob; return 'blob:local-export'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revoke);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Export must be local'); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('uses shared formats for Reviewer, Draft and Quiz', async () => {
  expect(await studyFormats(reviewer)).toEqual(['pdf']);
  expect(await studyFormats(draft)).toEqual(['pdf', 'docx', 'pptx']);
  expect(await studyFormats({ artifact: { ...fixtureArtifact, type: 'quiz' }, quiz: {} } as LibraryArtifactDetail)).toEqual([]);
});
it.each([
  ['pdf', 'application/pdf'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
] as const)('downloads saved Draft %s with the shared filename and correct MIME', async (format, mime) => {
  await downloadStudyFile(draft, format);
  expect(blob.type).toBe(mime); expect(blob.size).toBeGreaterThan(0);
  expect(anchor.href).toBe('blob:local-export'); expect(anchor.download).toBe(`BIO101_Cells_Draft.${format}`);
  expect(anchor.click).toHaveBeenCalledOnce(); expect(fetch).not.toHaveBeenCalled();
  expect(revoke).not.toHaveBeenCalled(); vi.advanceTimersByTime(999); expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1); expect(revoke).toHaveBeenCalledWith('blob:local-export');
});
it('downloads Reviewer PDF with its own name', async () => {
  await downloadStudyFile(reviewer, 'pdf');
  expect(anchor.download).toBe('BIO101_Cells_Reviewer.pdf'); expect(blob.type).toBe('application/pdf');
});
it('masks builder errors without creating a download', async () => {
  await expect(downloadStudyFile(reviewer, 'docx')).rejects.toThrow(EXPORT_FAILURE);
  expect(anchor.click).not.toHaveBeenCalled(); expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('releases the URL even if browser download fails, with safe copy', async () => {
  anchor.click.mockImplementation(() => { throw new Error('private browser error'); });
  await expect(downloadStudyFile(reviewer, 'pdf')).rejects.toThrow(EXPORT_FAILURE);
  vi.advanceTimersByTime(1000); expect(revoke).toHaveBeenCalledWith('blob:local-export');
});
it('keeps builders behind a dynamic import, including in Reviewer and Library', () => {
  const helper = readFileSync(new URL('./study-export.ts', import.meta.url), 'utf8');
  expect(helper).toContain("await import('@stay-focused/shared/study-export')");
  for (const path of ['./study-export.ts', './study-export-control.tsx', './reviewer/reviewer-reader.tsx', './reviewer/reviewer-header.tsx', './library.tsx']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    expect(source).not.toMatch(/from ['"](?:pdf-lib|fflate)['"]/);
    expect(source).not.toMatch(/import (?!type\b)[^;\n]+ from ['"]@stay-focused\/shared\/study-export['"]/);
  }
});
