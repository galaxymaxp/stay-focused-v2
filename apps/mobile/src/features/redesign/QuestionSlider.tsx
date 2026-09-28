import { useRef, useState } from 'react';
import { View, Text, type GestureResponderEvent } from 'react-native';
import { useTheme } from '../../design/theme';
import { sliderQuestionIndexFromPageX } from './questionSliderModel';

/** A question-position scrubber. The question itself changes only on release. */
export function QuestionSlider({ current, count, onSettle }: {
  current: number; count: number; onSettle: (index: number) => void;
}) {
  const { colors } = useTheme();
  const width = useRef(1);
  const track = useRef<View>(null);
  const trackLeft = useRef<number | null>(null);
  const preview = useRef(current);
  const [dragging, setDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(current);
  const move = (event: GestureResponderEvent) => {
    if (trackLeft.current === null) return;
    const next = sliderQuestionIndexFromPageX(event.nativeEvent.pageX, trackLeft.current, width.current, count);
    preview.current = next;
    setPreviewIndex(old => old === next ? old : next);
  };
  return <View style={{ paddingVertical: 12 }}>
    <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 4 }}>
      {dragging ? `Question ${previewIndex + 1} / ${count}` : `Question ${current + 1} of ${count}`}
    </Text>
    <View
      ref={track}
      accessible accessibilityRole="adjustable" accessibilityLabel="Question slider"
      accessibilityValue={{ min: 1, max: count, now: current + 1, text: `Question ${current + 1} of ${count}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => onSettle(Math.max(0, Math.min(count - 1, current + (event.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      onLayout={event => {
        width.current = event.nativeEvent.layout.width;
        track.current?.measureInWindow(x => { trackLeft.current = x; });
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={event => { setDragging(true); move(event); }}
      onResponderMove={move}
      onResponderRelease={() => { setDragging(false); onSettle(preview.current); }}
      onResponderTerminate={() => setDragging(false)}
      style={{ height: 48, justifyContent: 'center' }}>
      <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.separator }} />
      <View style={{ position: 'absolute', left: 0, width: `${count <= 1 ? 0 : (dragging ? previewIndex : current) / (count - 1) * 100}%`, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />
      <View style={{ position: 'absolute', left: `${count <= 1 ? 0 : (dragging ? previewIndex : current) / (count - 1) * 100}%`, width: 24, height: 24, marginLeft: -12, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.surfaceElevated }} />
    </View>
  </View>;
}
