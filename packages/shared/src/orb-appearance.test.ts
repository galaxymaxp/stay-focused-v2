import { describe, expect, it } from 'vitest';
import { ORB_IDLE_PALETTE } from './orb-interaction';
import { orbAppearance, orbPaletteAppearance, orbPosterGradient, orbPosterStops, ORB_THEME_TONES } from './orb-appearance';

describe('orb appearance', () => {
  it.each(ORB_IDLE_PALETTE)('resolves $key in both themes without changing its synced color', color => {
    const light = orbPaletteAppearance(color.key, 'light');
    const dark = orbPaletteAppearance(color.key, 'dark');
    expect(light).toEqual({ ...ORB_THEME_TONES.light, base: color.hex, glow: color.hex });
    expect(dark).toEqual({ ...ORB_THEME_TONES.dark, base: color.hex, glow: color.hex });
    expect(light.deep).not.toBe(dark.deep);
    expect(light.envSky).not.toBe(dark.envSky);
    expect(orbPosterGradient('light', color.hex)).toContain(light.deep);
    expect(orbPosterGradient('dark', color.hex)).toContain(dark.deep);
  });
  it('preserves existing state defaults and palette transition samples', () => {
    expect(orbAppearance('light')).toEqual(ORB_THEME_TONES.light);
    expect(orbAppearance('dark')).toEqual(ORB_THEME_TONES.dark);
    expect(orbPosterGradient('light')).toContain(ORB_THEME_TONES.light.glow);
    expect(orbPosterGradient('dark')).toContain(ORB_THEME_TONES.dark.glow);
    const sample = '#dfc987';
    expect(orbAppearance('dark', sample).base).toBe(sample);
    expect(orbAppearance('light', sample).base).toBe(sample);
  });
});

it.each(ORB_IDLE_PALETTE)('keeps $key fallback coverage translucent on paper and opaque in the dark studio', color => {
  const light = orbPosterStops('light', color.hex);
  const dark = orbPosterStops('dark', color.hex);
  expect(light.slice(0, 2).map(stop => stop.color)).toEqual([color.hex, color.hex]);
  expect(dark.slice(0, 2).map(stop => stop.color)).toEqual([color.hex, color.hex]);
  expect(light[2]!.color).toBe(ORB_THEME_TONES.light.deep);
  expect(dark[2]!.color).toBe(ORB_THEME_TONES.dark.deep);
  for (const stop of light) { expect(stop.opacity).toBeGreaterThan(0); expect(stop.opacity).toBeLessThan(0.5); }
  expect(dark.every(stop => stop.opacity === 1)).toBe(true);
  expect(orbPosterGradient('dark', color.hex)).toBe(`radial-gradient(circle at 40% 32%, ${color.hex} 0%, ${color.hex} 45%, ${ORB_THEME_TONES.dark.deep} 100%)`);
});
