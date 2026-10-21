import { describe, expect, it } from 'vitest';
import { ORB_IDLE_PALETTE } from './orb-interaction';
import { orbAppearance, orbPaletteAppearance, orbPosterGradient, ORB_THEME_TONES } from './orb-appearance';

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
