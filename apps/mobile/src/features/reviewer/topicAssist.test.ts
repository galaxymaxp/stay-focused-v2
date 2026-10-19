import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { selectTopic, TOPIC_PROMPT_VERSION, type TopicAction, type TopicResult, type ReviewerReaderModel } from '@stay-focused/shared';
import { palettes } from '../../design/themeTokens';
import { radius } from '../../design/tokens';
const motion = vi.hoisted(() => ({ timing: vi.fn(), stop: vi.fn(), reduced: false, mode: 'light' as 'light' | 'dark' }));
vi.mock('react-native', () => ({ View: 'View', ScrollView: 'ScrollView', Pressable: 'Pressable',
  Easing: { ease: (value: number) => value, inOut: (fn: unknown) => fn },
  Animated: { View: 'AnimatedView', Value: class { constructor(public value: number) {} setValue(value: number) { this.value = value; } },
    timing: (value: { setValue: (next: number) => void }, config: { toValue: number }) => {
      motion.timing(config); return { start: () => value.setValue(config.toValue), stop: motion.stop };
    },
    parallel: (animations: { start: () => void }[]) => ({ start: () => animations.forEach(animation => animation.start()), stop: motion.stop }),
  },
}));
vi.mock('../../design/primitives', () => ({ Copy: 'Copy' }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ colors: palettes[motion.mode], reducedMotion: motion.reduced }) }));
const mocks = vi.hoisted(() => ({ peek: vi.fn(), run: vi.fn(), begin: vi.fn(() => 1), complete: vi.fn(), cancel: vi.fn() }));
vi.mock('./assistStore', () => ({ topicAssist: { peek: mocks.peek, run: mocks.run } }));
vi.mock('./studyAnswerScroll', () => ({ useAnswerReveal: () => ({ begin: mocks.begin, complete: mocks.complete, cancel: mocks.cancel }), StudyAnswerArea: 'Answer' }));
const { TopicAssist } = await import('./TopicAssist');
const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null, source: { id: 's', title: 'Lesson' }, generatedAt: '2026-10-16T00:00:00Z', freshness: 'current',
  sections: [{ id: 's', title: 'Cells', blocks: [{ id: 'b', title: 'Nucleus', explanation: 'The nucleus contains DNA.', keyPoints: [], evidence: [] }] }] };
const selection = selectTopic(reviewer, 's')!;
const result = (action: TopicAction): TopicResult => ({ reviewerId: reviewer.id, sectionId: 's', action, contentHash: selection.contentHash, promptVersion: TOPIC_PROMPT_VERSION, grounding: 'source', text: action + '\n- **DNA** is inside.', createdAt: '2026-10-16T00:00:00Z' });
let tree: ReactTestRenderer | undefined;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); motion.reduced = false; motion.mode = 'light'; mocks.peek.mockResolvedValue(null); mocks.run.mockImplementation(async (_owner: string, _client: unknown, _selection: unknown, action: TopicAction) => result(action)); });
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; });
const props = { reviewer, sectionId: 's', owner: 'owner', client: { baseUrl: 'https://example.test', accessToken: 'synthetic' }, online: true, children: 'CANONICAL_BODY' };
async function mount(online = true) {
  await act(async () => { tree = create(createElement(TopicAssist, { ...props, online })); });
  await act(async () => ['Original', 'Simplify', 'Explain simply'].forEach((label, index) => button(label).props.onLayout({ nativeEvent: { layout: { x: [0, 65, 135][index], width: [65, 70, 95][index] } } })));
}
function button(label: string) { return tree!.root.findAllByType('Pressable' as never).find(node => node.props.accessibilityLabel === label)!; }
async function press(label: string) { await act(async () => button(label).props.onPress()); }
const body = () => JSON.stringify(tree!.toJSON());
it('keeps full radio labels and an independent Expound button together without scrolling', async () => {
  await mount();
  const pill = tree!.root.findByProps({ testID: 'topic-level-pill' });
  const levels = pill.findByProps({ accessibilityRole: 'radiogroup' });
  expect(tree!.root.findAllByType('ScrollView' as never)).toHaveLength(0);
  expect(pill.findAllByType('Pressable' as never)).toHaveLength(4);
  expect(levels.findAllByType('Pressable' as never)).toHaveLength(3);
  expect(pill.findAllByType('Pressable' as never).includes(button('Expound'))).toBe(true);
  for (const label of ['Original', 'Simplify', 'Explain simply']) {
    expect(button(label).props.accessibilityRole).toBe('radio');
    expect(button(label).props.accessibilityState).toEqual({ checked: label === 'Original', disabled: false });
  }
  expect(button('Expound').props.accessibilityState.expanded).toBe(false);
  expect(button('Expound').findByType('Copy' as never).props.color).toBe(palettes.light.textPrimary);
  expect(pill.findAllByProps({ testID: 'topic-level-thumb' })).toHaveLength(1);
  expect(pill.findAllByProps({ testID: 'topic-expound-thumb' })).toHaveLength(0);
  expect(pill.findAll(node => node.props.style?.width === 1)).toHaveLength(0);
  await press('Simplify'); await press('Expound');
  expect(button('Simplify').props.accessibilityState.checked).toBe(true);
  expect(button('Expound').props.accessibilityRole).toBe('button');
  expect(button('Expound').props.accessibilityState).toEqual({ expanded: true, disabled: false });
  expect(pill.findByProps({ testID: 'topic-expound-thumb' }).props.style.backgroundColor).toBe(palettes.light.surfaceElevated);
  expect(body()).toContain('topic_expound');
  await press('Explain simply');
  expect(button('Expound').props.accessibilityState.expanded).toBe(true);
  await press('Expound');
  expect(button('Explain simply').props.accessibilityState.checked).toBe(true);
  expect(button('Expound').props.style.backgroundColor).toBeUndefined();
  expect(pill.findAllByProps({ testID: 'topic-expound-thumb' })).toHaveLength(0);
  expect(body()).not.toContain('topic_expound');
});
it('uses compact labels below 380 measured points with centered single-line text and vertical 44pt targets', async () => {
  await mount();
  const pill = tree!.root.findByProps({ testID: 'topic-level-pill' });
  const available = tree!.root.findByProps({ testID: 'topic-level-available-width' });
  const visible = (label: string) => button(label).findByType('Copy' as never).props.children;
  for (const width of [360, 379, 380, 500, 320]) {
    await act(async () => available.props.onLayout({ nativeEvent: { layout: { width } } }));
    expect(visible('Simplify')).toBe(width < 380 ? 'Simpler' : 'Simplify');
    expect(visible('Explain simply')).toBe(width < 380 ? 'Simplest' : 'Explain simply');
    for (const label of ['Original', 'Simplify', 'Explain simply', 'Expound']) {
      const segment = button(label), text = segment.findByType('Copy' as never);
      expect(text.props.numberOfLines).toBe(1); expect(text.props.style.textAlign).toBe('center');
      expect(segment.props.style.minHeight).toBe(44);
      expect(segment.props.style.minHeight + segment.props.hitSlop.top + segment.props.hitSlop.bottom).toBeGreaterThanOrEqual(44);
      expect(segment.props.hitSlop.left).toBeUndefined(); expect(segment.props.hitSlop.right).toBeUndefined();
    }
    expect(pill.props.style.minHeight).toBeGreaterThanOrEqual(44);
    expect(pill.findByProps({ accessibilityRole: 'radiogroup' }).props.style.minHeight).toBeGreaterThanOrEqual(44);
    expect(pill.props.style.alignSelf).toBe('flex-start');
    expect(pill.props.style.flex).toBeUndefined();
    expect(button('Expound').parent!.props.style.minHeight).toBe(48);
  }
  await press('Simplify');
  expect(mocks.run).toHaveBeenCalledWith(props.owner, props.client, selection, 'topic_simplify', true);
});
it.each(['light', 'dark'] as const)('uses existing %s neutral tokens, pill radii and a 40pt track with inset 32pt thumbs', async mode => {
  motion.mode = mode; await mount();
  const track = tree!.root.findByProps({ testID: 'topic-level-track' });
  expect(track.props.style).toMatchObject({ borderRadius: radius.pill, backgroundColor: palettes[mode].surfaceSecondary, top: 4, bottom: 4 });
  const thumb = tree!.root.findByProps({ testID: 'topic-level-thumb' });
  expect(thumb.props.style).toMatchObject({ borderRadius: radius.pill, backgroundColor: palettes[mode].surfaceElevated });
  expect(thumb.parent!.props.style).toMatchObject({ top: 8, bottom: 8 });
  for (const label of ['Original', 'Simplify', 'Explain simply', 'Expound']) expect(button(label).findByType('Copy' as never).props.color).toBe(palettes[mode].textPrimary);
});
it('slides to measured option positions and widths, stops interrupted motion, and snaps for live Reduce Motion', async () => {
  await mount(); expect(motion.timing).not.toHaveBeenCalled();
  await press('Simplify');
  expect(motion.timing.mock.calls.map(call => call[0])).toEqual([
    expect.objectContaining({ toValue: 65, duration: 200, useNativeDriver: true }),
    expect.objectContaining({ toValue: 70, duration: 200, useNativeDriver: false }),
  ]);
  const thumb = () => tree!.root.findByProps({ testID: 'topic-level-thumb' });
  expect(thumb().props.style.width.value).toBe(70);
  expect(thumb().parent!.props.style.transform[0].translateX.value).toBe(65);
  await press('Explain simply'); expect(motion.stop).toHaveBeenCalled();
  expect(thumb().props.style.width.value).toBe(95);
  motion.reduced = true;
  await act(async () => tree!.update(createElement(TopicAssist, props)));
  motion.timing.mockClear(); await press('Original');
  expect(motion.timing).not.toHaveBeenCalled();
  expect(thumb().props.style.width.value).toBe(65);
  expect(thumb().parent!.props.style.transform[0].translateX.value).toBe(0);
  await act(async () => button('Original').props.onLayout({ nativeEvent: { layout: { x: 2, width: 60 } } }));
  expect(thumb().props.style.width.value).toBe(60);
  expect(thumb().parent!.props.style.transform[0].translateX.value).toBe(2);
});
it('Original renders instantly without generation; each topic has one compact level control and Expound', async () => {
  await mount(); expect(body()).toContain('CANONICAL_BODY'); expect(mocks.run).not.toHaveBeenCalled();
  for (const label of ['Original', 'Simplify', 'Explain simply', 'Expound']) expect(button(label)).toBeDefined();
  await press('Original'); expect(mocks.run).not.toHaveBeenCalled(); expect(mocks.cancel).toHaveBeenCalled();
});
it('levels replace the body, cached switches do not call again, Expound is formatted and collapses', async () => {
  await mount();
  for (const label of ['Simplify', 'Explain simply']) { await press(label); expect(body()).not.toContain('CANONICAL_BODY'); await press('Original'); expect(body()).toContain('CANONICAL_BODY'); await press(label); }
  await press('Expound'); expect(body()).toContain('topic_expound'); expect(body()).toContain('From your material'); expect(body()).not.toContain('**DNA**');
  await press('Expound'); expect(body()).not.toContain('topic_expound'); await press('Expound');
  expect(mocks.run).toHaveBeenCalledTimes(3); expect(mocks.begin).toHaveBeenCalled(); expect(mocks.complete).toHaveBeenCalledTimes(3);
});
it('offline disables uncached actions but hydrates saved levels and Expound without calls', async () => {
  await mount(false); expect(button('Original').props.disabled).toBeFalsy(); expect(button('Simplify').props.disabled).toBe(true); expect(button('Expound').props.disabled).toBe(true); expect(body()).toContain('offline');
  await act(async () => tree!.unmount()); mocks.peek.mockImplementation(async (_owner: string, _selection: unknown, action: TopicAction) => result(action));
  await mount(false);
  for (const label of ['Simplify', 'Explain simply', 'Expound']) { expect(button(label).props.disabled).toBe(false); await press(label); }
  expect(mocks.run).not.toHaveBeenCalled();
});
it('late responses do not override Original or the currently selected level; pending levels can be revisited', async () => {
  let done!: (r: TopicResult) => void; mocks.run.mockReturnValue(new Promise<TopicResult>(resolve => { done = resolve; }));
  await mount(); await press('Simplify'); expect(body()).toContain('Creating your explanation'); await press('Original');
  await act(async () => done(result('topic_simplify'))); expect(body()).toContain('CANONICAL_BODY'); expect(body()).not.toContain('topic_simplify');
  await press('Simplify'); expect(body()).toContain('topic_simplify'); expect(mocks.run).toHaveBeenCalledOnce();
});
it('failed actions offer safe retry without exposing raw errors', async () => {
  mocks.run.mockRejectedValueOnce(new Error('PRIVATE_PROVIDER_ERROR')); await mount(); await press('Simplify');
  expect(body()).not.toContain('PRIVATE_PROVIDER_ERROR'); expect(body()).toContain('could not be generated'); await press('Retry topic explanation'); expect(body()).toContain('topic_simplify');
});

it('exact-content changes reset the reading choice and cannot reuse the old displayed rewrite', async () => {
  await mount(); await press('Simplify');
  const changed = { ...reviewer, sections: [{ ...reviewer.sections[0]!, blocks: [{ ...reviewer.sections[0]!.blocks[0]!, explanation: 'Different canonical content.' }] }] };
  await act(async () => tree!.update(createElement(TopicAssist, { ...props, reviewer: changed })));
  expect(body()).toContain('CANONICAL_BODY'); expect(body()).not.toContain('topic_simplify');
});
it('out-of-order level completions keep the most recent selected body', async () => {
  const finish = new Map<TopicAction, (r: TopicResult) => void>();
  mocks.run.mockImplementation((_owner: string, _client: unknown, _selection: unknown, action: TopicAction) => new Promise<TopicResult>(resolve => finish.set(action, resolve)));
  await mount(); await press('Simplify'); await press('Explain simply');
  await act(async () => finish.get('topic_explain_simply')!(result('topic_explain_simply')));
  await act(async () => finish.get('topic_simplify')!(result('topic_simplify')));
  expect(body()).toContain('topic_explain_simply'); expect(body()).not.toContain('topic_simplify');
});
