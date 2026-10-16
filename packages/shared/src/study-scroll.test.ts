import { expect, it, vi } from 'vitest';
import { createStudyAnswerScroll } from './study-scroll';

function setup() {
  const reveal = vi.fn(), frames: (() => void)[] = [];
  const scroll = createStudyAnswerScroll(reveal, work => frames.push(work));
  return { reveal, scroll, flush: () => { frames.splice(0).forEach(work => work()); } };
}
it('reveals on press and completion, after the corresponding render', () => {
  const s = setup(), token = s.scroll.begin('answer', false);
  expect(s.reveal).not.toHaveBeenCalled(); s.flush();
  expect(s.reveal).toHaveBeenLastCalledWith('answer', true, expect.any(Function));
  s.scroll.complete(token); s.flush(); expect(s.reveal).toHaveBeenCalledTimes(2);
});
it('does not reveal a completion after manual scrolling, including a queued frame', () => {
  const s = setup(), token = s.scroll.begin('answer', false); s.flush();
  s.scroll.complete(token); s.scroll.manualScroll(); s.flush();
  s.scroll.complete(token); s.flush(); expect(s.reveal).toHaveBeenCalledTimes(1);
});
it('jumps for Reduce Motion and resets manual intent for a new action', () => {
  const s = setup(); s.scroll.begin('old', false); s.scroll.manualScroll(); s.flush();
  const token = s.scroll.begin('new', true); s.flush(); s.scroll.complete(token); s.flush();
  expect(s.reveal).toHaveBeenCalledTimes(2); expect(s.reveal).toHaveBeenLastCalledWith('new', false, expect.any(Function));
});
it('fences stale requests and queued callbacks after close or a new action', () => {
  const s = setup(), old = s.scroll.begin('old', false), next = s.scroll.begin('new', false); s.flush();
  s.scroll.complete(old); s.flush(); expect(s.reveal).toHaveBeenCalledTimes(1);
  s.scroll.complete(next); s.scroll.cancel(); s.flush(); expect(s.reveal).toHaveBeenCalledTimes(1);
});
it('can guard an asynchronous native measurement callback', () => {
  const s = setup(); s.scroll.begin('answer', false); s.flush();
  const guard = s.reveal.mock.calls[0]![2] as () => boolean;
  expect(guard()).toBe(true); s.scroll.manualScroll(); expect(guard()).toBe(false);
});
