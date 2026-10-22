import { orbAppearance, orbIdleColor, type OrbVariant, type OrbTheme } from '@stay-focused/shared';
import { useEffect, useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { OrbInteractionHandle } from './orbInteraction';

/** Static compatibility surface: no GL, timer or motion; the same resolved palette as the body. */
export function OrbPoster({ size, mode, interaction, idle = true, variant = 'standalone' }: {
  size: number; mode: OrbTheme; interaction: OrbInteractionHandle; idle?: boolean; variant?: OrbVariant;
}) {
  const id = useId().replace(/:/g, '');
  const sample = () => idle ? orbIdleColor(interaction.state.current, Date.now(), true) : undefined;
  const [color, setColor] = useState(sample);
  useEffect(() => {
    const sync = () => setColor(idle ? orbIdleColor(interaction.state.current, Date.now(), true) : undefined);
    interaction.wake.current = sync; sync();
    return () => { if (interaction.wake.current === sync) interaction.wake.current = null; };
  }, [interaction, idle]);
  const appearance = orbAppearance(mode, color);
  const spillRadius = variant === 'standalone' ? 85 : 72;
  // Android SVGs rasterize into a bitmap of the declared viewport size. CSS
  // overflow cannot extend that bitmap: the spill used to end at a square edge.
  // Include the complete spill plus a transparent guard, keeping the body and
  // the caller's layout footprint at `size`.
  const padding = spillRadius - 50 + 1;
  const extent = 100 + padding * 2;
  return <View style={{ width: size, height: size }} pointerEvents="none" accessible={false}>
    <Svg width={size * extent / 100} height={size * extent / 100} viewBox={`${-padding} ${-padding} ${extent} ${extent}`} style={{ position: 'absolute', left: -size * padding / 100, top: -size * padding / 100 }} testID="orb-poster" accessible={false}>
    <Defs><RadialGradient id={id} cx="40%" cy="32%" r="68%">
      <Stop offset="0" stopColor={appearance.glow} />
      <Stop offset="0.45" stopColor={appearance.base} />
      <Stop offset="1" stopColor={appearance.deep} />
    </RadialGradient>
    <RadialGradient id={`${id}spill`}><Stop offset="0.45" stopColor={appearance.base} stopOpacity={(mode === "dark" ? 0.38 : 0.18) * (variant === "standalone" ? 0.5 : 1)} /><Stop offset="1" stopColor={appearance.deep} stopOpacity={0} /></RadialGradient></Defs>
    <Circle cx="50" cy="50" r={spillRadius} fill={`url(#${id}spill)`} />
    <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
  </Svg></View>;
}
