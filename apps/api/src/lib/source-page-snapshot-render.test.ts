import { createCanvas, loadImage } from '@napi-rs/canvas';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { renderSourcePdfPage } from './source-page-snapshot-render';

async function fixture() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([600, 800]);
  page.drawRectangle({ x: 50, y: 600, width: 350, height: 60, color: rgb(0.2, 0.5, 0.8) });
  page.drawText('Accepted source page', { x: 50, y: 700, font: await pdf.embedFont(StandardFonts.Helvetica), size: 22 });
  pdf.addPage([600, 800]);
  return pdf.save();
}
describe('single-page native PDF rendering', () => {
  it('renders actual text and graphics at 1400 px using installed native canvas', async () => {
    const result = await renderSourcePdfPage(await fixture(), 1);
    expect(result).toMatchObject({ width: 1400, height: 1867 });
    const image = await loadImage(result.png);
    const canvas = createCanvas(result.width, result.height); const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const color = context.getImageData(200, 400, 1, 1).data;
    expect(color[2]).toBeGreaterThan(color[0]!);
    // Text must be painted, not silently omitted by a missing font setup.
    const textArea = context.getImageData(100, 170, 900, 120).data;
    let dark = 0; for (let i = 0; i < textArea.length; i += 4) if (textArea[i]! < 50 && textArea[i + 1]! < 50) dark++;
    expect(dark).toBeGreaterThan(1000);
  });
  it('preserves an explicit blank page', async () => {
    const rendered = await renderSourcePdfPage(await fixture(), 2);
    const canvas = createCanvas(rendered.width, rendered.height); const context = canvas.getContext('2d');
    context.drawImage(await loadImage(rendered.png), 0, 0);
    expect(Array.from(context.getImageData(500, 500, 1, 1).data)).toEqual([255, 255, 255, 255]);
  });
  it.each([0, -1, 1.5, 3, 101])('fails safely for missing/invalid page %s', async page => {
    await expect(renderSourcePdfPage(await fixture(), page)).rejects.toThrow();
  });
  it('rejects invalid PDF bytes', async () => { await expect(renderSourcePdfPage(new Uint8Array([1, 2]), 1)).rejects.toThrow(); });
});
