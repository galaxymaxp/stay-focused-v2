import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { styledRuns, type ExportDocument, type ExportBlock } from './exportLayout';

const PAGE_WIDTH = 612, PAGE_HEIGHT = 792, MARGIN = 48, BODY_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ink = rgb(0.12, 0.16, 0.15), muted = rgb(0.38, 0.42, 0.41), accent = rgb(0.09, 0.35, 0.25), highlight = rgb(0.90, 0.94, 0.70);
/** Standard PDF fonts are WinAnsi. Keep unsupported glyphs visible as a fallback. */
const safe = (value: string) => value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-')
  .replace(/[\u2022]/g, '*').replace(/[\u00b7]/g, '-').replace(/[\u2192]/g, '->').replace(/[\u2190]/g, '<-')
  .replace(/[\u00a0]/g, ' ').replace(/[^\x20-\x7E\n]/g, '?');

export async function createStudyPdf(document: ExportDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(document.title); pdf.setAuthor('Stay Focused');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const newPage = () => { page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); y = PAGE_HEIGHT - MARGIN; };
  const room = (height: number) => { if (y - height < MARGIN + 22) newPage(); };
  const plain = (value: string, size: number, font: PDFFont, color = ink, indent = 0, lineHeight = size * 1.45) => {
    const text = safe(value);
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && font.widthOfTextAtSize(candidate, size) > BODY_WIDTH - indent) {
          room(lineHeight); page.drawText(line, { x: MARGIN + indent, y, size, font, color }); y -= lineHeight; line = word;
        } else line = candidate;
      }
      room(lineHeight); if (line) page.drawText(line, { x: MARGIN + indent, y, size, font, color }); y -= lineHeight;
    }
  };
  const rich = (block: ExportBlock, size = 11, indent = 0) => {
    const lineHeight = size * 1.55;
    let x = MARGIN + indent;
    room(lineHeight);
    for (const run of styledRuns(block)) {
      const font = run.style === 'bold' ? bold : regular;
      for (const token of safe(run.text).split(/(\s+)/).filter(Boolean)) {
        if (token.includes('\n')) { y -= lineHeight; x = MARGIN + indent; room(lineHeight); continue; }
        const width = font.widthOfTextAtSize(token, size);
        if (x + width > PAGE_WIDTH - MARGIN && token.trim()) { y -= lineHeight; x = MARGIN + indent; room(lineHeight); }
        if (run.style === 'highlight' && token.trim()) page.drawRectangle({ x, y: y - 2, width, height: size + 4, color: highlight });
        if (token.trim()) page.drawText(token, { x, y, size, font, color: ink });
        if (run.style === 'underline' && token.trim()) page.drawLine({ start: { x, y: y - 2 }, end: { x: x + width, y: y - 2 }, thickness: 0.8, color: accent });
        x += width;
      }
    }
    y -= lineHeight;
  };
  for (const block of document.blocks) {
    if (block.kind === 'table' && block.rows?.length) {
      y -= 7;
      const cols = Math.max(...block.rows.map(row => row.length));
      const cellWidth = BODY_WIDTH / cols;
      for (const row of block.rows) {
        const cellLines = row.map(cell => {
          const words = safe(cell).split(/\s+/); const lines: string[] = []; let line = '';
          for (const word of words) { const next = line ? `${line} ${word}` : word;
            if (line && regular.widthOfTextAtSize(next, 9) > cellWidth - 12) { lines.push(line); line = word; } else line = next; }
          lines.push(line); return lines;
        });
        const height = Math.max(24, Math.max(...cellLines.map(lines => lines.length)) * 13 + 10);
        room(height);
        for (let column = 0; column < cols; column++) {
          const x = MARGIN + column * cellWidth;
          page.drawRectangle({ x, y: y - height + 9, width: cellWidth, height, borderWidth: 0.5, borderColor: muted });
          (cellLines[column] ?? []).forEach((line, index) => page.drawText(line, { x: x + 6, y: y - 4 - index * 13, size: 9, font: regular, color: ink }));
        }
        y -= height;
      }
      y -= 10;
      continue;
    }
    const gap = block.kind === 'heading' ? 13 : block.kind === 'question' ? 11 : 5;
    room(gap + 24); y -= gap;
    if (block.kind === 'brand') plain(block.text.toUpperCase(), 10, bold, accent);
    else if (block.kind === 'title') plain(block.text, 24, bold, ink, 0, 30);
    else if (block.kind === 'subtitle') plain(block.text, 10, regular, muted);
    else if (block.kind === 'heading') plain(block.text, 16, bold, accent, 0, 22);
    else if (block.kind === 'question') plain(block.text, 12, bold);
    else if (block.kind === 'bullet') { plain('*', 11, bold, accent, 4); y += 16; rich(block, 11, 19); }
    else rich(block, 11, block.kind === 'answer' ? 12 : 0);
  }
  pdf.getPages().forEach((p: PDFPage, index: number) => {
    p.drawText(`Stay Focused  -  ${index + 1} / ${pdf.getPageCount()}`, { x: MARGIN, y: 25, size: 8, font: regular, color: muted });
  });
  return pdf.save();
}
