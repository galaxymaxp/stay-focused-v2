import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../design/theme';

export interface GlassPillProps {
  label: string;
  sub?: string;
  size: 'lg' | 'md' | 'sm';
  busy?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityExpanded?: boolean;
}

/** Vector shell and clipped native gradient; the outer hit target is >=44px. */
export function GlassPill({ label, sub, size, busy = false, disabled = false, onPress, accessibilityLabel, accessibilityExpanded }: GlassPillProps) {
  const { mode, reducedMotion } = useTheme();
  const dark = mode === 'dark', blocked = disabled || busy;
  const height = size === 'lg' ? 52 : size === 'md' ? 46 : 34;
  const color = dark ? '#f2efe8' : '#141415';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? [label, sub].filter(Boolean).join(', ')}
    accessibilityState={{ disabled: blocked, busy, expanded: accessibilityExpanded }} disabled={blocked}
    onPress={() => { if (!blocked) onPress?.(); }}
    style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', borderRadius: height / 2,
      opacity: blocked ? .75 : 1, transform: [{ scale: pressed && !blocked && !reducedMotion ? .98 : 1 }],
      shadowColor: dark ? '#000000' : '#141415', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: dark ? .35 : .08, shadowRadius: dark ? 18 : 16, elevation: dark ? 4 : 2 })}>
    <View testID="glass-pill-shell" style={{ height, minWidth: size === 'lg' ? 232 : undefined, borderRadius: height / 2,
      overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: dark ? 'rgba(255,255,255,.13)' : 'rgba(20,20,21,.12)' }}>
      <LinearGradient colors={dark ? ['rgba(255,255,255,.075)', 'rgba(255,255,255,.02)'] : ['rgba(255,255,255,.95)', 'rgba(255,255,255,.6)']}
        start={{ x: .5, y: 0 }} end={{ x: .5, y: 1 }} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: size === 'sm' ? 14 : 22 }}>
        <View pointerEvents="none" testID="glass-pill-highlight" style={{ position: 'absolute', top: 0, left: 12, right: 12,
          height: StyleSheet.hairlineWidth, backgroundColor: dark ? 'rgba(255,255,255,.09)' : '#ffffff' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          {busy ? reducedMotion ? <View testID="glass-pill-static-spinner" style={{ width: 14, height: 14, borderRadius: 7,
            borderWidth: 2, borderColor: color, borderRightColor: 'transparent' }} /> : <ActivityIndicator size="small" color={color} /> : null}
          <Text style={{ color, fontSize: size === 'lg' ? 16 : size === 'md' ? 15 : 13, fontWeight: '600', letterSpacing: .15 }}>{label}</Text>
          {sub !== undefined ? <><View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, opacity: .3 }} />
            <Text style={{ color: dark ? '#bdb9b1' : '#5d5a55', fontSize: 14, fontWeight: '400' }}>{sub}</Text></> : null}
        </View>
      </LinearGradient>
    </View>
  </Pressable>;
}
