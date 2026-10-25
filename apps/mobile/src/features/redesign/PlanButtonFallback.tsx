import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useIsFocused } from 'expo-router/react-navigation';
import { useTheme } from '../../design/theme';
import { radius } from '../../design/tokens';
import { useClockFonts } from './clockFonts';

export function PlanButtonFallback({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { colors, active, reducedMotion } = useTheme();
  const focused = useIsFocused(), fonts = useClockFonts();
  const flow = useRef(new Animated.Value(0)).current, tilt = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const pressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (reducedMotion || !active || !focused) {
      flow.setValue(0); tilt.setValue(0); opacity.setValue(1); pressAnimation.current?.stop(); return;
    }
    const animation = Animated.loop(Animated.timing(flow, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    animation.start();
    return () => { animation.stop(); flow.setValue(0); pressAnimation.current?.stop(); };
  }, [active, focused, reducedMotion, flow, tilt, opacity]);
  useEffect(() => () => pressAnimation.current?.stop(), []);
  return <Animated.View style={{ opacity }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Plan your free time" accessibilityHint="Opens planning options"
      accessibilityState={{ disabled }} disabled={disabled} onPress={() => {
        pressAnimation.current?.stop(); tilt.setValue(0); opacity.setValue(1);
        pressAnimation.current = reducedMotion
          ? Animated.sequence([Animated.timing(opacity, { toValue: 0.85, duration: 70, useNativeDriver: true }), Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: true })])
          : Animated.sequence([Animated.timing(tilt, { toValue: -5, duration: 150, useNativeDriver: true }), Animated.timing(tilt, { toValue: 3, duration: 180, useNativeDriver: true }), Animated.timing(tilt, { toValue: -1, duration: 130, useNativeDriver: true }), Animated.timing(tilt, { toValue: 0, duration: 140, useNativeDriver: true })]);
        pressAnimation.current.start(); onPress();
      }} style={{ height: 52, width: '100%', borderRadius: radius.control, borderWidth: 1, borderColor: '#d7aa38',
        backgroundColor: 'rgba(215,170,56,0.06)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', inset: -12, transform: [{ rotate: tilt.interpolate({ inputRange: [-5, 5], outputRange: ['-5deg', '5deg'] }) }] }}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: -400, width: 1200,
          transform: [{ translateX: flow.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }] }}>
          <Svg width="100%" height="100%" viewBox="-400 0 1200 76" preserveAspectRatio="none">
            <Path d="M-400 42 Q-350 24 -300 40 T-200 40 T-100 40 T0 40 T100 40 T200 40 T300 40 T400 40 T500 40 T600 40 T700 40 T800 40 V90 H-400Z" fill={'#d7aa38'} opacity={0.32} />
            <Path d="M-400 48 Q-350 33 -300 48 T-200 48 T-100 48 T0 48 T100 48 T200 48 T300 48 T400 48 T500 48 T600 48 T700 48 T800 48 V90 H-400Z" fill={'#d7aa38'} opacity={0.38} />
          </Svg>
        </Animated.View>
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 1, borderRadius: radius.control - 1, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.55)' }} />
      <Text style={{ color: colors.textPrimary, fontFamily: fonts ? 'InterClock700' : undefined, fontWeight: fonts ? 'normal' : '700', fontSize: 24,
        letterSpacing: -0.48, textShadowColor: 'rgba(255,255,255,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>Plan</Text>
    </Pressable>
  </Animated.View>;
}
