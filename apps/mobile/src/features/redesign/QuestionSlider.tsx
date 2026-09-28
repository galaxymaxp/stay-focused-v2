import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, View, Text, type GestureResponderEvent } from 'react-native';
import { useTheme } from '../../design/theme';
import { sliderGestureIntent, sliderQuestionIndexFromPageX, type SliderIntent } from './questionSliderModel';

/** A question-position scrubber. The question itself changes only on release. */
export function QuestionSlider({ current, count, onSettle, disabled = false }: {
  current: number; count: number; onSettle: (index: number) => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const width = useRef(1);
  const track = useRef<View>(null);
  const trackLeft = useRef<number | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const intent = useRef<SliderIntent>('pending');
  const preview = useRef(current);
  const [dragging, setDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(current);
  const move = (event: GestureResponderEvent) => {
    if (trackLeft.current === null) return;
    const next = sliderQuestionIndexFromPageX(event.nativeEvent.pageX, trackLeft.current, width.current, count);
    preview.current = next;
    setPreviewIndex(old => old === next ? old : next);
  };
  const ownsGesture = (event: GestureResponderEvent) => {
    if (disabled || count <= 1) return false;
    intent.current = sliderGestureIntent(intent.current,
      event.nativeEvent.pageX - start.current.x, event.nativeEvent.pageY - start.current.y);
    return intent.current === 'horizontal';
  };
  const settle = () => { setDragging(false); if (!disabled) onSettle(preview.current); };
  return <View style={{ paddingVertical: 12 }}>
    <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 4 }}>
      {dragging ? `Question ${previewIndex + 1} / ${count}` : `Question ${current + 1} of ${count}`}
    </Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go one question left"
        accessibilityState={{ disabled: disabled || current <= 0 }} disabled={disabled || current <= 0}
        onPress={() => onSettle(current - 1)}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled || current <= 0 ? 0.35 : 1 }}>
        <ChevronLeft size={20} color={colors.textPrimary} />
      </Pressable>
      <View
      ref={track}
      accessible accessibilityRole="adjustable" accessibilityLabel="Question slider"
      accessibilityState={{ disabled: disabled || count <= 1 }}
      accessibilityValue={{ min: 1, max: count, now: current + 1, text: `Question ${current + 1} of ${count}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        if (!disabled) onSettle(Math.max(0, Math.min(count - 1, current + (event.nativeEvent.actionName === 'increment' ? 1 : -1))));
      }}
      onLayout={event => {
        width.current = event.nativeEvent.layout.width;
        track.current?.measureInWindow(x => { trackLeft.current = x; });
      }}
      onTouchStart={event => {
        start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        intent.current = 'pending'; preview.current = current;
        track.current?.measureInWindow(x => { trackLeft.current = x; });
      }}
      onStartShouldSetResponder={() => false}
      onMoveShouldSetResponderCapture={ownsGesture}
      onMoveShouldSetResponder={ownsGesture}
      onResponderGrant={event => { setDragging(true); move(event); }}
      onResponderMove={move}
      onResponderTerminationRequest={() => intent.current !== 'horizontal'}
      onResponderRelease={event => { move(event); settle(); }}
      onResponderTerminate={() => { intent.current = 'vertical'; setDragging(false); }}
      onTouchEnd={event => {
        // A tap can jump directly, but a scroll or an ambiguous drag cannot.
        if (!disabled && count > 1 && intent.current === 'pending' &&
          Math.abs(event.nativeEvent.pageX - start.current.x) < 6 && Math.abs(event.nativeEvent.pageY - start.current.y) < 6) {
          move(event); settle();
        }
      }}
      style={{ flex: 1, height: 48, justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: colors.separator }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: `${count <= 1 ? 0 : (dragging ? previewIndex : current) / (count - 1) * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: `${count <= 1 ? 0 : (dragging ? previewIndex : current) / (count - 1) * 100}%`, width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.surfaceElevated }} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Go one question right"
        accessibilityState={{ disabled: disabled || current >= count - 1 }} disabled={disabled || current >= count - 1}
        onPress={() => onSettle(current + 1)}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled || current >= count - 1 ? 0.35 : 1 }}>
        <ChevronRight size={20} color={colors.textPrimary} />
      </Pressable>
    </View>
  </View>;
}
