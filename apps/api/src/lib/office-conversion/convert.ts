import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const OFFICE_CONVERSION_TIMEOUT_MS = 60_000;
export const OFFICE_PDF_MAX_BYTES = 20 * 1024 * 1024;
export const OFFICE_PDF_MAX_PAGES = 100;
export type OfficeKind = 'pptx' | 'docx';
export type ConversionCode = 'conversion_timeout' | 'conversion_unavailable' | 'conversion_failed' |
  'conversion_output_too_large' | 'conversion_page_cap' | 'conversion_invalid_pdf';
export class OfficeConversionFailure extends Error {
  constructor(readonly code: ConversionCode) { super(code); }
}
export interface OfficeRun {
  readonly completed: Promise<number>;
  /** Resolves only once the process (and its writers) have stopped. */
  readonly kill: () => Promise<void>;
}
export type OfficeRunner = (command: string, args: readonly string[], cwd: string) => OfficeRun;

/** The native parser sees the whole archive: bound even parts omitted by text
 * extraction, and never let linked media add remotely fetched source content. */
function validateConversionArchive(bytes: Uint8Array) {
  let expanded = 0; let count = 0;
  const names = new Set<string>();
  const relationships = unzipSync(bytes, { filter(entry) {
    expanded += entry.originalSize;
    if (++count > 2000 || entry.originalSize > 4_000_000 || expanded > 40_000_000 ||
        names.has(entry.name) || /^\/|\\|(^|\/)\.\.(\/|$)|vbaProject|activeX|embeddings/i.test(entry.name))
      throw new OfficeConversionFailure('conversion_failed');
    names.add(entry.name);
    return entry.name.endsWith('.rels');
  } });
  for (const part of Object.values(relationships)) {
    const xml = new TextDecoder('utf-8', { fatal: true }).decode(part);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new OfficeConversionFailure('conversion_failed');
    const parsed: unknown = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', removeNSPrefix: true }).parse(xml);
    const root = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).Relationships : null;
    const value = root && typeof root === 'object' ? (root as Record<string, unknown>).Relationship : null;
    for (const relation of Array.isArray(value) ? value as unknown[] : value ? [value] : []) {
      if (!relation || typeof relation !== 'object') throw new OfficeConversionFailure('conversion_failed');
      const r = relation as Record<string, unknown>;
      if (r.TargetMode === 'External' && (typeof r.Type !== 'string' || !r.Type.endsWith('/hyperlink')))
        throw new OfficeConversionFailure('conversion_failed');
    }
  }
}

export const runOffice: OfficeRunner = (command, args, cwd) => {
  const child = spawn(command, [...args], { cwd, shell: false, stdio: 'ignore',
    windowsHide: true, detached: process.platform !== 'win32' });
  const completed = new Promise<number>((resolve, reject) => {
    child.once('error', () => reject(new OfficeConversionFailure('conversion_unavailable')));
    child.once('close', code => resolve(code ?? -1));
  });
  return { completed, kill: async () => {
    if (child.pid && child.exitCode === null) {
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch { /* A concurrent exit is already stopped. */ }
    }
    await completed.catch(() => {});
  } };
};

/** Grounded rendering only. No OCR, enhancement, model calls or shared profile. */
export async function convertOfficeToPdf(bytes: Uint8Array, kind: OfficeKind, options: {
  readonly timeoutMs: number; readonly runner?: OfficeRunner;
}): Promise<{ bytes: Uint8Array; pageCount: number }> {
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > OFFICE_CONVERSION_TIMEOUT_MS ||
      bytes.length < 1 || bytes.length > 20_000_000) throw new OfficeConversionFailure('conversion_failed');
  try { validateConversionArchive(bytes); }
  catch { throw new OfficeConversionFailure('conversion_failed'); }
  const directory = await mkdtemp(join(tmpdir(), 'stay-focused-office-'));
  let run: OfficeRun | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const input = join(directory, `source.${kind}`);
    const output = join(directory, 'output');
    const profile = join(directory, 'profile');
    await mkdir(output); await mkdir(profile);
    await writeFile(input, bytes, { mode: 0o600 });
    run = (options.runner ?? runOffice)('soffice', [
      `-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--nologo', '--nodefault',
      '--nofirststartwizard', '--norestore', '--convert-to',
      kind === 'pptx' ? 'pdf:impress_pdf_Export:{"ExportHiddenSlides":{"type":"boolean","value":"true"}}' : 'pdf:writer_pdf_Export',
      '--outdir', output, input,
    ], directory);
    const code = await Promise.race([run.completed, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new OfficeConversionFailure('conversion_timeout')), options.timeoutMs);
    })]);
    if (code !== 0) throw new OfficeConversionFailure('conversion_failed');
    const path = join(output, 'source.pdf');
    const info = await stat(path);
    if (!info.isFile() || info.size < 5) throw new OfficeConversionFailure('conversion_invalid_pdf');
    if (info.size > OFFICE_PDF_MAX_BYTES) throw new OfficeConversionFailure('conversion_output_too_large');
    const pdf = new Uint8Array(await readFile(path));
    if (pdf.length > OFFICE_PDF_MAX_BYTES) throw new OfficeConversionFailure('conversion_output_too_large');
    if (new TextDecoder().decode(pdf.subarray(0, 5)) !== '%PDF-') throw new OfficeConversionFailure('conversion_invalid_pdf');
    let pageCount: number;
    try { pageCount = (await PDFDocument.load(pdf, { updateMetadata: false })).getPageCount(); }
    catch { throw new OfficeConversionFailure('conversion_invalid_pdf'); }
    if (pageCount < 1 || pageCount > OFFICE_PDF_MAX_PAGES) throw new OfficeConversionFailure('conversion_page_cap');
    return { bytes: pdf, pageCount };
  } catch (error) {
    throw error instanceof OfficeConversionFailure ? error : new OfficeConversionFailure('conversion_failed');
  } finally {
    clearTimeout(timer);
    try { await run?.kill(); } finally { await rm(directory, { recursive: true, force: true }); }
  }
}
