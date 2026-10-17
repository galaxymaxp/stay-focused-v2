import type { LibraryArtifactSummary, ReviewerReaderModel } from '@stay-focused/shared';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';
import { Action, Copy } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import type { ExperienceClient } from '../../services/experienceApi';
import { ShareReviewerMenu } from './ShareReviewerMenu';

export function ReviewerHeader({ artifact, reviewer, secondaryLine, topicCount, client, offline, onExport, onQuiz }: {
  artifact: LibraryArtifactSummary;
  reviewer: ReviewerReaderModel;
  secondaryLine: string | null;
  topicCount: number;
  client: ExperienceClient;
  offline: boolean;
  onExport: () => void;
  onQuiz: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  // Keep both words intact on narrow screens; extreme text sizes get full rows.
  const largeText = fontScale >= 2;
  const actionStyle: ViewStyle = { flex: 1, alignSelf: 'stretch', minWidth: largeText ? '100%' : 0 };
  return (
    <View style={{ gap: spacing[1], paddingRight: spacing[2] }}>
      <Copy size="h1" style={{ fontSize: 26, lineHeight: 33 }}>{artifact.title}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: largeText ? 'wrap' : 'nowrap', gap: spacing[2] }}>
        <Action secondary style={actionStyle} onPress={onExport}>Export</Action>
        {artifact.id.startsWith('artifact:') && <ShareReviewerMenu
          artifactId={artifact.id.slice('artifact:'.length)} reviewer={reviewer} client={client}
          offline={offline} triggerStyle={actionStyle} />}
      </View>
      {secondaryLine ? <Copy muted size="caption">{secondaryLine}</Copy> : null}
      {topicCount > 1 ? <Copy muted size="caption">{topicCount} topics</Copy> : null}
      <View style={{ paddingTop: spacing[2] }}><Action hero onPress={onQuiz}>Generate Quiz</Action></View>
      <Copy muted size="caption">Tap a key point to select it. Hold its group to select all.</Copy>
    </View>
  );
}
