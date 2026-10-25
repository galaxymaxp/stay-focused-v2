import { orbStillPaletteColor, type OrbStillRequest } from '@stay-focused/shared/orb-still';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, PixelRatio, View, type ImageSourcePropType } from 'react-native';
import type { OrbInteractionHandle } from '../generation-core/orbInteraction';
import { queueOrbAsset } from './queueOrbAssets';
import { palettes } from '../../design/themeTokens';

export function QueueOrb({ interaction, size, mode, live, reducedMotion }: {
  interaction: OrbInteractionHandle; size: number; mode: 'light' | 'dark'; live: boolean; reducedMotion: boolean;
}) {
  const [source, setSource] = useState<ImageSourcePropType>(() => queueOrbAsset(orbStillPaletteColor(interaction.state.current.colorIndex), mode));
  const [previous, setPrevious] = useState<ImageSourcePropType | null>(null);
  const last = useRef({ color: orbStillPaletteColor(interaction.state.current.colorIndex), mode, source });
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let disposed = false, revision = 0;
    const sync = () => {
      const ticket = ++revision;
      if (disposed || !live) return;
      const request: OrbStillRequest = { color: orbStillPaletteColor(interaction.state.current.colorIndex), mode,
        pixels: Math.max(8, Math.min(512, Math.round(size * Math.min(PixelRatio.get(), 3)))) };
      const fallback = queueOrbAsset(request.color, mode);
      opacity.stopAnimation();
      if (last.current.color !== request.color && last.current.mode === mode && !reducedMotion) {
        setPrevious(last.current.source); opacity.setValue(1);
        Animated.timing(opacity, { toValue: 0, duration: 600, easing: t => t * t * (3 - 2 * t),
          useNativeDriver: true, isInteraction: false }).start();
      } else { setPrevious(null); opacity.setValue(0); }
      last.current = { color: request.color, mode, source: fallback }; setSource(fallback);
      void import('./queueOrbStill').then(({ queueOrbStills }) => {
        if (disposed || revision !== ticket) return undefined;
        return queueOrbStills.get(request);
      }).then(uri => {
        if (uri && !disposed && revision === ticket) {
          last.current.source = { uri }; setSource({ uri });
        }
      })
        .catch(() => { /* Bundled shared-scene pixels remain visible. */ });
    };
    interaction.wake.current = sync; sync();
    return () => {
      disposed = true; revision++; opacity.stopAnimation(); opacity.setValue(0);
      if (interaction.wake.current === sync) interaction.wake.current = null;
    };
  }, [interaction, size, mode, live, reducedMotion, opacity]);
  const backgroundColor = palettes[mode].backgroundPrimary;
  return <View testID="queue-orb-still" pointerEvents="none" accessible={false}
    style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor }}>
    <Image source={source} accessible={false} resizeMode="contain" style={{ width: size, height: size }}
      onError={() => {
        const fallback = queueOrbAsset(orbStillPaletteColor(interaction.state.current.colorIndex), mode);
        last.current.source = fallback; setSource(fallback);
        void import('./queueOrbStill').then(({ queueOrbStills }) => queueOrbStills.clear()).catch(() => {});
      }} />
    {previous ? <Animated.Image source={previous} accessible={false} resizeMode="contain"
      style={{ position: 'absolute', width: size, height: size, opacity, backgroundColor }} /> : null}
  </View>;
}
