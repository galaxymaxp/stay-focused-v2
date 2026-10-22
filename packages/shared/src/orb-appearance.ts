import { ORB_IDLE_PALETTE, type OrbColorKey } from './orb-interaction';

export type OrbTheme = 'light' | 'dark';
/** Existing Knowledge Core tokens. Palette storage and transition samples stay theme independent. */
export const ORB_THEME_TONES = {
  dark: { base: '#DDE3EE', deep: '#161B26', glow: '#CFDDFF', envFloor: '#010102', envSky: '#1C2028' },
  light: { base: '#E6EAF1', deep: '#4F5868', glow: '#9FB8F0', envFloor: '#2E333C', envSky: '#9AA2AF' },
} as const;

/** All renderers resolve the same theme and already-sampled synced palette color. */
export function orbAppearance(mode: OrbTheme, sampledColor?: string) {
  const tones = ORB_THEME_TONES[mode];
  return { ...tones, base: sampledColor ?? tones.base, glow: sampledColor ?? tones.glow };
}

export function orbPaletteAppearance(key: OrbColorKey, mode: OrbTheme) {
  return orbAppearance(mode, ORB_IDLE_PALETTE.find(color => color.key === key)!.hex);
}

export function orbPosterGradient(mode: OrbTheme, sampledColor?: string) {
  const stops = orbPosterStops(mode, sampledColor);
  const color = (i: number) => mode === 'dark' ? stops[i]!.color : stops[i]!.color + Math.round(stops[i]!.opacity * 255).toString(16).padStart(2, '0');
  return `radial-gradient(circle at 40% 32%, ${color(0)} 0%, ${color(1)} 45%, ${color(2)} 100%)`;
}

/** Light glass transmits the paper between liquid sheets; dark retains its original studio. */
export const ORB_GLASS_MATERIAL = {
  light: { density: 0.28, ambient: 0.38, emission: 1.1, rimOpacity: 0.56, floor: '#68788C', sky: '#DCE4EE', posterOpacity: [0.18, 0.38, 0.28] },
  dark: { density: 0.38, ambient: 0.06, emission: 2.1, rimOpacity: 0.9, floor: ORB_THEME_TONES.dark.envFloor, sky: ORB_THEME_TONES.dark.envSky, posterOpacity: [1, 1, 1] },
} as const;

/** Shared coverage for CSS stills and the padded native SVG; palette samples stay unchanged. */
export function orbPosterStops(mode: OrbTheme, sampledColor?: string) {
  const appearance = orbAppearance(mode, sampledColor);
  return [appearance.glow, appearance.base, appearance.deep].map((color, i) => ({
    color, opacity: ORB_GLASS_MATERIAL[mode].posterOpacity[i]!,
  }));
}
