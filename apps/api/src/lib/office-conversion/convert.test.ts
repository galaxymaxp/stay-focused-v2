import { access, mkdir, stat, truncate, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { convertOfficeToPdf, OFFICE_PDF_MAX_BYTES, type OfficeRunner } from './convert';
const input = zipSync({ 'source.xml': strToU8('<source/>') });

async function pdf(pages = 2) {
  const document = await PDFDocument.create();
  for (let i = 0; i < pages; i++) document.addPage();
  return document.save();
}
function harness(work: (cwd: string) => Promise<number>) {
  let directory = '';
  const kill = vi.fn(async () => {});
  const runner: OfficeRunner = vi.fn((_command, _args, cwd) => {
    directory = cwd;
    return { completed: work(cwd), kill };
  });
  return { runner, kill, directory: () => directory };
}
async function removed(h: ReturnType<typeof harness>) { await expect(access(h.directory())).rejects.toThrow(); }

describe('isolated bounded Office conversion', () => {
  it.each(['linked media', 'expanded part', 'active content'])('rejects %s before starting the native process', async failure => {
    const bytes = failure === 'linked media' ? zipSync({
      'ppt/slides/_rels/slide1.xml.rels': strToU8('<Relationships><Relationship Type="image" TargetMode="External" Target="https://private.invalid/image"/></Relationships>'),
    }) : failure === 'expanded part' ? zipSync({ 'ppt/media/image.png': new Uint8Array(4_000_001) })
      : zipSync({ 'ppt/embeddings/object.bin': new Uint8Array([1]) });
    const h = harness(async () => 0);
    await expect(convertOfficeToPdf(bytes, 'pptx', { timeoutMs: 1000, runner: h.runner })).rejects.toThrow('conversion_failed');
    expect(h.runner).not.toHaveBeenCalled();
  });
  it('exports the unedited deck with hidden slides, isolated profile and cleans up', async () => {
    const bytes = await pdf();
    const h = harness(async cwd => {
      expect((await stat(join(cwd, 'source.pptx'))).size).toBe(input.length);
      await writeFile(join(cwd, 'output/source.pdf'), bytes); return 0;
    });
    const result = await convertOfficeToPdf(input, 'pptx', { timeoutMs: 1000, runner: h.runner });
    expect(result).toEqual({ bytes, pageCount: 2 });
    expect(h.runner).toHaveBeenCalledWith('soffice', expect.arrayContaining([
      '--headless', '--convert-to', 'pdf:impress_pdf_Export:{"ExportHiddenSlides":{"type":"boolean","value":"true"}}',
      expect.stringContaining('-env:UserInstallation=file:'),
    ]), h.directory());
    await removed(h);
  });
  it('uses writer export for DOCX without claiming any DOCX block pagination', async () => {
    const h = harness(async cwd => { await writeFile(join(cwd, 'output/source.pdf'), await pdf(1)); return 0; });
    expect((await convertOfficeToPdf(input, 'docx', { timeoutMs: 1000, runner: h.runner })).pageCount).toBe(1);
    expect(h.runner).toHaveBeenCalledWith('soffice', expect.arrayContaining(['pdf:writer_pdf_Export']), h.directory());
    await removed(h);
  });
  it('kills a stalled process before removing the working directory', async () => {
    let directory = ''; let stop: (code: number) => void = () => {};
    const kill = vi.fn(async () => { await access(directory); stop(-1); });
    const runner: OfficeRunner = (_command, _args, cwd) => {
      directory = cwd;
      return { completed: new Promise<number>(resolve => { stop = resolve; }), kill };
    };
    await expect(convertOfficeToPdf(input, 'pptx', { timeoutMs: 10, runner })).rejects.toThrow('conversion_timeout');
    expect(kill).toHaveBeenCalledOnce(); await expect(access(directory)).rejects.toThrow();
  });
  it.each(['missing binary', 'nonzero exit', 'missing output', 'non-PDF', 'malformed PDF', 'directory output'])('rejects %s and always removes temp bytes', async failure => {
    const h = harness(async cwd => {
      const output = join(cwd, 'output/source.pdf');
      if (failure === 'missing binary') throw new Error('ENOENT private provider detail');
      if (failure === 'nonzero exit') return 1;
      if (failure === 'non-PDF') await writeFile(output, 'not a PDF output');
      if (failure === 'malformed PDF') await writeFile(output, '%PDF-1.7 corrupted');
      if (failure === 'directory output') await mkdir(output);
      return 0;
    });
    await expect(convertOfficeToPdf(input, 'pptx', { timeoutMs: 1000, runner: h.runner })).rejects.toThrow(/^conversion_/);
    await removed(h);
  });
  it('rejects oversized output before reading it into memory', async () => {
    const h = harness(async cwd => {
      const output = join(cwd, 'output/source.pdf'); await writeFile(output, '%PDF-'); await truncate(output, OFFICE_PDF_MAX_BYTES + 1); return 0;
    });
    await expect(convertOfficeToPdf(input, 'pptx', { timeoutMs: 1000, runner: h.runner })).rejects.toThrow('conversion_output_too_large');
    await removed(h);
  });
  it('rejects page 101 and removes the parsed PDF', async () => {
    const h = harness(async cwd => { await writeFile(join(cwd, 'output/source.pdf'), await pdf(101)); return 0; });
    await expect(convertOfficeToPdf(input, 'pptx', { timeoutMs: 1000, runner: h.runner })).rejects.toThrow('conversion_page_cap');
    await removed(h);
  });
});
