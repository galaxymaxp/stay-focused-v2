import { parseStudyText, type StudyInline } from '@stay-focused/shared';
import { View } from 'react-native';
import { Copy } from '../../design/primitives';
import { spacing } from '../../design/tokens';

function Inline({ content }: { content: readonly StudyInline[] }) {
  return <>{content.map((part, i) => <Copy key={i} style={part.bold ? { fontWeight: '700' } : undefined}>{part.text}</Copy>)}</>;
}

export function StudyText({ text }: { text: string }) {
  return <View style={{ gap: spacing[2] }}>{parseStudyText(text).map((block, i) => block.kind === 'paragraph'
    ? <Copy key={i} style={{ lineHeight: 25 }}><Inline content={block.content} /></Copy>
    : <View key={i} style={{ gap: spacing[1] }}>{block.items.map((item, j) => <View key={j} style={{ flexDirection: 'row', gap: spacing[2], paddingLeft: spacing[2] }}>
      <Copy style={{ lineHeight: 25, minWidth: 24 }}>{block.kind === 'steps' ? `${block.items[j]!.number}.` : '\u2022'}</Copy>
      <Copy style={{ flex: 1, lineHeight: 25 }}><Inline content={'content' in item ? item.content : item} /></Copy>
    </View>)}</View>)}</View>;
}
