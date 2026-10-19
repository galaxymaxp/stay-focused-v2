export interface ClockGlyphMetric {
  readonly advance: number;
  readonly bearingX: number;
  readonly bearingY: number;
  readonly width: number;
  readonly height: number;
  readonly uv: readonly number[];
}
export interface ClockGlyphMetrics {
  readonly fontSize: number;
  readonly width: number;
  readonly height: number;
  readonly glyphs: Readonly<Record<string, ClockGlyphMetric>>;
}
export interface ClockGlyphQuad {
  readonly char: string;
  /** Em units, y down, baseline at zero. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly uv: readonly number[];
}
export interface ClockGlassReadout {
  readonly text: string;
  /** Display pixels/points, independent of the orb's backing resolution. */
  readonly fontSize: number;
}

/** Pure layout: tabular cells, tight tracking, small baseline-aligned AM/PM.
 * Unknown glyphs contribute neither quad nor advance; space contributes a gap.
 */
export function layoutClockGlyphs(text: string, metrics: ClockGlyphMetrics) {
  const quads: ClockGlyphQuad[] = [];
  const tabular = Math.max(...'0123456789'.split('').map(char => metrics.glyphs[char]?.advance ?? 0));
  let x = 0;
  for (const char of text) {
    const glyph = metrics.glyphs[char];
    if (!glyph) continue;
    if (char === ' ') { x += 0.14; continue; }
    const scale = /[AMP]/.test(char) ? 0.45 : 1;
    const digit = /[0-9]/.test(char);
    const advance = digit ? tabular : glyph.advance;
    const k = scale / metrics.fontSize;
    quads.push({ char, x: x + (glyph.bearingX + (digit ? (tabular - glyph.advance) / 2 : 0)) * k,
      y: -glyph.bearingY * k, width: glyph.width * k, height: glyph.height * k, scale, uv: glyph.uv });
    x += advance * k - 0.02 * scale;
  }
  return { quads, width: x, minY: Math.min(0, ...quads.map(q => q.y)),
    maxY: Math.max(0, ...quads.map(q => q.y + q.height)) };
}
