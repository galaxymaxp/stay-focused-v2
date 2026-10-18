import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useTheme } from './theme';

export function Avatar({ uri, initial, size = 32 }: { uri?: string; initial: string; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState<string>();
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}>
    {uri && failed !== uri ? <Image source={{ uri }} style={{ width: size, height: size }} onError={() => setFailed(uri)} accessible={false} /> :
      <Text style={{ color: colors.blue, fontSize: size * 0.44, lineHeight: size * 0.56, fontWeight: '600' }}>{initial}</Text>}
  </View>;
}
