import { createRequire } from 'node:module';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from './ocr/pdfjs-runtime';

const require = createRequire(import.meta.url);
const pdfAssets = path.dirname(require.resolve('pdfjs-dist/package.json')).replaceAll('\\', '/');

/** One bounded page, with bundled glyph paths (no system-font substitution). */
export async function renderSourcePdfPage(bytes: Uint8Array, pageNumber: number): Promise<{
  png: Buffer; width: number; height: number;
}> {
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > 100 || bytes.byteLength > 20 * 1024 * 1024)
    throw new Error('snapshot_render_invalid');
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false, verbosity: 0,
    standardFontDataUrl: `${pdfAssets}/standard_fonts/`, cMapUrl: `${pdfAssets}/cmaps/`, cMapPacked: true,
    wasmUrl: `${pdfAssets}/wasm/`, disableFontFace: true, useSystemFonts: false });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100 || pageNumber > pdf.numPages) throw new Error('snapshot_page_missing');
    const page = await pdf.getPage(pageNumber);
    const original = page.getViewport({ scale: 1 });
    if (!Number.isFinite(original.width) || original.width <= 0) throw new Error('snapshot_render_invalid');
    const viewport = page.getViewport({ scale: 1400 / original.width });
    const width = Math.min(1400, Math.ceil(viewport.width));
    const height = Math.ceil(viewport.height);
    if (!Number.isFinite(height) || height <= 0 || height > 10000) throw new Error('snapshot_render_invalid');
    const canvas = createCanvas(width, height);
    const rendering = page.render({ viewport,
      canvasContext: canvas.getContext('2d') as unknown as Parameters<typeof page.render>[0]['canvasContext'] });
    const timer = setTimeout(() => rendering.cancel(), 120_000);
    try { await rendering.promise; } finally { clearTimeout(timer); }
    const png = canvas.toBuffer('image/png');
    if (png.byteLength > 10 * 1024 * 1024) throw new Error('snapshot_render_invalid');
    return { png, width, height };
  } finally { await task.destroy(); }
}
