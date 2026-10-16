import { createStudyAnswerScroll } from '@stay-focused/shared';
import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { View, type ScrollView } from 'react-native';
import { useTheme } from '../../design/theme';

export function useStudyAnswerScroll(scroll: RefObject<ScrollView | null>) {
  const root = useRef<View>(null);
  const anchors = useRef(new Map<string, View>());
  const controller = useRef(createStudyAnswerScroll((target, animated, stillCurrent) => {
    const node = anchors.current.get(target), content = root.current;
    if (node && content) node.measureLayout(content, (_x, y) => { if (stillCurrent()) scroll.current?.scrollTo({ y: Math.max(0, y), animated }); }, () => undefined);
  }, work => requestAnimationFrame(work))).current;
  useEffect(() => () => controller.cancel(), [controller]);
  return { root, anchors, controller };
}

type AnswerScroll = ReturnType<typeof useStudyAnswerScroll>;
export const StudyAnswerScrollContext = createContext<AnswerScroll | null>(null);
export function useAnswerReveal() {
  const value = useContext(StudyAnswerScrollContext);
  const { reducedMotion } = useTheme();
  return {
    begin: (id: string) => value?.controller.begin(id, reducedMotion) ?? 0,
    complete: (token: number) => value?.controller.complete(token),
    cancel: () => value?.controller.cancel(),
  };
}
export function StudyAnswerArea({ id, children }: { id: string; children: ReactNode }) {
  const scroll = useContext(StudyAnswerScrollContext);
  return <View testID={`study-answer-${id}`} collapsable={false} ref={node => { if (node) scroll?.anchors.current.set(id, node); else scroll?.anchors.current.delete(id); }} accessibilityLiveRegion="polite">{children}</View>;
}
