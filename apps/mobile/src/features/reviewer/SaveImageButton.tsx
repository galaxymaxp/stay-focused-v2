import { useRef, useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { Download } from 'lucide-react-native';
import type { StudyImageDownload } from '@stay-focused/shared';
import { useTheme } from '../../design/theme';
import { hitTarget, spacing } from '../../design/tokens';
import { saveImage } from './saveImage';

export function SaveImageButton({ image, offline }: { image: StudyImageDownload; offline: boolean }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function save() {
    if (pending.current || offline) return;
    pending.current = true; setBusy(true);
    try {
      const result = await saveImage(image);
      Alert.alert(result.status === 'saved' ? 'Image saved' : 'Save image', result.message, result.status === 'denied'
        ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => { void result.openSettings().catch(() => {}); } }]
        : [{ text: 'OK' }]);
    } finally { pending.current = false; setBusy(false); }
  }
  return <Pressable accessibilityRole="button" accessibilityLabel="Save image" disabled={busy || offline} accessibilityState={{ busy, disabled: busy || offline }}
    onPress={() => void save()} style={{ minHeight: hitTarget.min, flexDirection: 'row', alignItems: 'center', gap: spacing[2], opacity: busy || offline ? 0.5 : 1 }}>
    <Download size={20} color={colors.accent} accessible={false} />
    <Text style={{ color: colors.accent }}>{busy ? 'Saving…' : 'Save image'}</Text>
  </Pressable>;
}
