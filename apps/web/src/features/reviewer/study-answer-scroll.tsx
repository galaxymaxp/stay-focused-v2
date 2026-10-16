"use client";
import { createStudyAnswerScroll } from '@stay-focused/shared';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';

export function useStudyAnswerScroll() {
  const anchors = useRef(new Map<string, HTMLDivElement>());
  const controller = useRef(createStudyAnswerScroll((target, animated) => {
    const node = anchors.current.get(target);
    node?.scrollIntoView({ block: 'nearest', behavior: animated ? 'smooth' : 'instant' });
    node?.focus({ preventScroll: true });
  }, work => requestAnimationFrame(work))).current;
  useEffect(() => {
    const manual = () => controller.manualScroll();
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) manual();
    };
    const pointer = (event: PointerEvent) => {
      // Scrollbar drags are scroll intent too; ordinary content clicks are not.
      if (!(event.target instanceof HTMLElement)) return;
      const node = event.target, rect = node.getBoundingClientRect();
      if (node.scrollHeight > node.clientHeight && event.clientX >= rect.left + node.clientWidth) manual();
    };
    window.addEventListener('wheel', manual, { passive: true, capture: true });
    window.addEventListener('touchmove', manual, { passive: true, capture: true });
    window.addEventListener('keydown', key, true);
    window.addEventListener('pointerdown', pointer, true);
    return () => {
      controller.cancel();
      window.removeEventListener('wheel', manual, true);
      window.removeEventListener('touchmove', manual, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('pointerdown', pointer, true);
    };
  }, [controller]);
  return { anchors, controller };
}
export const StudyAnswerScrollContext = createContext<ReturnType<typeof useStudyAnswerScroll> | null>(null);
export function useAnswerReveal() {
  const value = useContext(StudyAnswerScrollContext);
  return {
    begin: (id: string) => value?.controller.begin(id, window.matchMedia('(prefers-reduced-motion: reduce)').matches) ?? 0,
    complete: (token: number) => value?.controller.complete(token),
    cancel: () => value?.controller.cancel(),
  };
}
export function StudyAnswerArea({ id, children }: { id: string; children: ReactNode }) {
  const scroll = useContext(StudyAnswerScrollContext);
  return <div data-study-answer={id} ref={node => { if (node) scroll?.anchors.current.set(id, node); else scroll?.anchors.current.delete(id); }} tabIndex={-1} aria-live="polite">{children}</div>;
}
