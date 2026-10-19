import { Image, View, type ImageSourcePropType } from 'react-native';

/** Static fallback: diffuse the exact displayed raster, with no clock or settings. */
export function OrbImageSpill({ source, size, mode }: {
  source: ImageSourcePropType; size: number; mode: 'light' | 'dark';
}) {
  return <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    <Image testID="orb-image-spill" accessible={false}
      source={source} blurRadius={size * 0.06} resizeMode="contain"
      style={{ width: size * 1.1, height: size * 1.1,
        opacity: mode === 'dark' ? 0.28 : 0.12 }} />
  </View>;
}
