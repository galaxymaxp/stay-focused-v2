import { orbIdleColor } from '@stay-focused/shared';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { useTheme } from '../../design/theme';
import { PLAN_PILL_RADIUS } from './planPill';
import { useClockFonts } from './clockFonts';
import { useOrbInteraction, type OrbInteractionHandle } from '../generation-core/orbInteraction';

/** GL-unavailable equivalent: a flat palette-coloured action with fixed bounds. */
export function PlanButtonFallback({ onPress, disabled, interaction: supplied }: {
  onPress: () => void; disabled?: boolean; interaction?: OrbInteractionHandle;
}) {
  const interaction = useOrbInteraction(supplied);
  const { colors, active, reducedMotion } = useTheme();
  const focused = useIsFocused(), fonts = useClockFonts();
  const [color, setColor] = useState(() => orbIdleColor(interaction.state.current, Date.now(), reducedMotion));
  const opacity = useRef(new Animated.Value(1)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    let pending: number | null = null;
    const draw = () => {
      pending = null;
      setColor(orbIdleColor(interaction.state.current, Date.now(), reducedMotion));
      if (active && focused && !reducedMotion && Date.now() - interaction.state.current.colorAt < 600)
        pending = requestAnimationFrame(draw);
    };
    const wake = () => { if (pending === null) pending = requestAnimationFrame(draw); };
    interaction.wake.current = wake; draw();
    return () => { interaction.wake.current = null; if (pending !== null) cancelAnimationFrame(pending); animation.current?.stop(); opacity.setValue(1); };
  }, [interaction, active, focused, reducedMotion, opacity]);
  return <Animated.View style={{ opacity }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Plan your free time" accessibilityHint="Opens planning options"
      accessibilityState={{ disabled }} disabled={disabled} onPress={() => {
        animation.current?.stop(); opacity.setValue(1);
        animation.current = Animated.sequence([
          Animated.timing(opacity, { toValue: 0.85, duration: 70, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: true }),
        ]);
        animation.current.start(); onPress();
      }} style={{ height: 52, width: '100%', borderRadius: PLAN_PILL_RADIUS, borderWidth: 1, borderColor: color,
        backgroundColor: color + '20', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: colors.textPrimary, fontFamily: fonts ? 'InterClock700' : undefined,
        fontWeight: fonts ? 'normal' : '700', fontSize: 24, letterSpacing: -0.48 }}>Plan</Text>
    </Pressable>
  </Animated.View>;
}
