import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { layoutClockGlyphs, type ClockGlyphMetrics } from './clock-glyphs';

const mobile = new URL('../../../apps/mobile/assets/clock/clock-atlas.json', import.meta.url);
const web = new URL('../../../apps/web/public/clock/clock-atlas.json', import.meta.url);
const metrics: ClockGlyphMetrics = JSON.parse(readFileSync(mobile, 'utf8'));
it('commits identical complete metrics and PNGs on both platforms', () => {
  expect(readFileSync(mobile, 'utf8')).toBe(readFileSync(web, 'utf8'));
  expect(readFileSync(new URL('clock-atlas.png', mobile))).toEqual(readFileSync(new URL('clock-atlas.png', web)));
  expect(Object.keys(metrics.glyphs).sort()).toEqual('0123456789:AMP '.split('').sort());
  for (const metric of Object.values(metrics.glyphs)) {
    expect(metric.advance).toBeGreaterThan(0);
    expect(metric.uv).toHaveLength(4);
    expect(metric.uv.every(n => Number.isFinite(n) && n >= 0 && n <= 1)).toBe(true);
  }
});
it('uses equal cells for every digit, including narrow 1, with -2% tracking', () => {
  const widths = [...'0123456789'].map(char => layoutClockGlyphs(char, metrics).width);
  expect(new Set(widths).size).toBe(1);
  const all = layoutClockGlyphs('11:11 AM', metrics), other = layoutClockGlyphs('88:88 AM', metrics);
  expect(all.width).toBe(other.width);
  expect(all.width).toBeCloseTo(4 * (43 / 64 - 0.02) + (metrics.glyphs[':']!.advance / 64 - 0.02) + 0.14
    + 0.45 * ((metrics.glyphs.A!.advance + metrics.glyphs.M!.advance) / 64 - 0.04));
});
it('scales AM/PM to 45% on the same baseline and gives the suffix a small gap', () => {
  for (const suffix of ['AM', 'PM']) {
    const layout = layoutClockGlyphs(`1:30 ${suffix}`, metrics);
    const letter = layout.quads.at(-2)!;
    expect(letter.scale).toBe(0.45);
    expect(letter.y + metrics.glyphs[letter.char]!.bearingY * 0.45 / metrics.fontSize).toBeCloseTo(0);
    expect(layout.quads.at(-1)!.scale).toBe(0.45);
    expect(layout.quads).toHaveLength(6);
  }
});
it('skips unknown glyphs without changing layout', () => {
  expect(layoutClockGlyphs('1?2', metrics)).toEqual(layoutClockGlyphs('12', metrics));
});
it('handles empty text with no quads and zero bounds', () => {
  expect(layoutClockGlyphs('', metrics)).toEqual({ quads: [], width: 0, minY: 0, maxY: 0 });
});
