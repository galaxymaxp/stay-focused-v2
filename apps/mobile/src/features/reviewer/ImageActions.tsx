import { STUDY_OFFLINE, type StudyImageDownload, type StudyImageTarget } from '@stay-focused/shared';
import { Text, View } from 'react-native';
import { useTheme } from '../../design/theme';
import { spacing } from '../../design/tokens';
import { AskImageButton } from './AskImageButton';
import { SaveImageButton } from './SaveImageButton';

export function ImageActions({ image, download, offline, onAsk, refreshUri }: {
  image?: StudyImageTarget; download: StudyImageDownload; offline: boolean;
  onAsk?: (image: StudyImageTarget) => void; refreshUri?: () => Promise<string>;
}) {
  const { colors } = useTheme();
  return <View style={{ gap: spacing[2] }}>
    <View style={{ flexDirection: 'column', gap: spacing[2], width: '100%' }}>
      <AskImageButton image={image} offline={offline} onAsk={onAsk} hideOfflineNote />
      <SaveImageButton image={download} offline={offline} refreshUri={refreshUri} />
    </View>
    {offline ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{STUDY_OFFLINE}</Text> : null}
  </View>;
}
