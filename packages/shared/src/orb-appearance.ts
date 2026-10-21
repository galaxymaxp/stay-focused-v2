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
  const appearance = orbAppearance(mode, sampledColor);
  return `radial-gradient(circle at 40% 32%, ${appearance.glow} 0%, ${appearance.base} 45%, ${appearance.deep} 100%)`;
}
