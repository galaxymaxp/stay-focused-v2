import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { selectTopic, TOPIC_PROMPT_VERSION, type TopicAction, type TopicResult, type ReviewerReaderModel } from '@stay-focused/shared';

const mocks = vi.hoisted(() => ({ peek: vi.fn(), run: vi.fn(), begin: vi.fn(() => 1), complete: vi.fn(), cancel: vi.fn() }));
vi.mock('./assist-store', () => ({ topicAssist: { peek: mocks.peek, run: mocks.run } }));
vi.mock('./study-answer-scroll', () => ({ useAnswerReveal: () => ({ begin: mocks.begin, complete: mocks.complete, cancel: mocks.cancel }), StudyAnswerArea: 'Answer' }));
const { TopicAssist } = await import('./topic-assist');
const reviewer: ReviewerReaderModel = { id: 'artifact:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Cells', course: null, source: { id: 's', title: 'Lesson' }, generatedAt: '2026-10-16T00:00:00Z', freshness: 'current',
  sections: [{ id: 's', title: 'Cells', blocks: [{ id: 'b', title: 'Nucleus', explanation: 'The nucleus contains DNA.', keyPoints: [], evidence: [] }] }] };
const selection = selectTopic(reviewer, 's')!;
const result = (action: TopicAction): TopicResult => ({ reviewerId: reviewer.id, sectionId: 's', action, contentHash: selection.contentHash, promptVersion: TOPIC_PROMPT_VERSION, grounding: 'source', text: action + '\n- **DNA** is inside.', createdAt: '2026-10-16T00:00:00Z' });
let tree: ReactTestRenderer | undefined;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); mocks.peek.mockResolvedValue(null); mocks.run.mockImplementation(async (_owner: string, _client: unknown, _selection: unknown, action: TopicAction) => result(action)); });
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; });
const props = { reviewer, sectionId: 's', owner: 'owner', client: (async () => undefined) as import("../../lib/api").Api, online: true, children: 'CANONICAL_BODY' };
async function mount(online = true) { await act(async () => { tree = create(createElement(TopicAssist, { ...props, online })); }); }
function button(label: string) { return tree!.root.findAllByType('button').find(node => (node.props['aria-label'] ?? node.props.children) === label)!; }
async function press(label: string) { await act(async () => button(label).props.onClick()); }
const body = () => JSON.stringify(tree!.toJSON());
it('keeps the three level buttons and independent expandable button in one pill', async () => {
  await mount();
  const pill = tree!.root.findByProps({ className: 'segmented' });
  const levels = pill.findByProps({ role: 'radiogroup', 'aria-label': 'Topic level' });
  expect(pill.findAllByType('button')).toHaveLength(4);
  expect(levels.findAllByType('button')).toHaveLength(3);
  expect(pill.findAllByType('button').includes(button('Expound'))).toBe(true);
  expect(button('Expound').props.className).toBeUndefined();
  expect(pill.findAllByProps({ className: 'topic-level-divider' })).toHaveLength(0);
  expect(pill.findAllByProps({ className: 'topic-level-thumb topic-level-thumb-static' })).toHaveLength(0);
  for (const label of ['Original', 'Simplify', 'Explain simply']) {
    expect(button(label).props.role).toBe('radio');
    expect(button(label).props.tabIndex).toBe(label === 'Original' ? 0 : -1);
  }
  for (const label of ['Original', 'Simplify', 'Explain simply']) expect(button(label).props['aria-checked']).toBe(label === 'Original');
  expect(button('Expound').props['aria-expanded']).toBe(false);
  await press('Simplify'); await press('Expound');
  expect(button('Simplify').props['aria-checked']).toBe(true);
  expect(button('Original').props['aria-checked']).toBe(false);
  expect(button('Expound').props['aria-expanded']).toBe(true);
  expect(pill.findAllByProps({ className: 'topic-level-thumb topic-level-thumb-static' })).toHaveLength(1);
  expect(button('Expound').props['aria-checked']).toBeUndefined();
  expect(body()).toContain('topic_expound');
  await press('Explain simply');
  expect(button('Expound').props['aria-expanded']).toBe(true);
  await press('Expound');
  expect(button('Explain simply').props['aria-checked']).toBe(true);
  expect(button('Expound').props['aria-expanded']).toBe(false);
  expect(pill.findAllByProps({ className: 'topic-level-thumb topic-level-thumb-static' })).toHaveLength(0);
  expect(body()).not.toContain('topic_expound');
  expect(button('Explain simply').findByProps({ className: 'topic-label-full' }).props.children).toBe('Explain simply');
  expect(button('Explain simply').findByProps({ className: 'topic-label-short' }).props.children).toBe('Simplest');
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
it('keeps Original keyboard-reachable when the selected pending level becomes disabled offline', async () => {
  mocks.run.mockReturnValue(new Promise<TopicResult>(() => {}));
  await mount(); await press('Simplify');
  await act(async () => tree!.update(createElement(TopicAssist, { ...props, online: false })));
  expect(button('Simplify').props.disabled).toBe(true);
  expect(button('Simplify').props['aria-checked']).toBe(true);
  expect(button('Original').props.tabIndex).toBe(0);
  expect(button('Simplify').props.tabIndex).toBe(-1);
});
it('late responses do not override Original or the currently selected level; pending levels can be revisited', async () => {
  let done!: (r: TopicResult) => void; mocks.run.mockReturnValue(new Promise<TopicResult>(resolve => { done = resolve; }));
  await mount(); await press('Simplify'); expect(body()).toContain('Creating your explanation'); await press('Original');
  await act(async () => done(result('topic_simplify'))); expect(body()).toContain('CANONICAL_BODY'); expect(body()).not.toContain('topic_simplify');
  await press('Simplify'); expect(body()).toContain('topic_simplify'); expect(mocks.run).toHaveBeenCalledOnce();
});
it('failed actions offer safe retry without exposing raw errors', async () => {
  mocks.run.mockRejectedValueOnce(new Error('PRIVATE_PROVIDER_ERROR')); await mount(); await press('Simplify');
  expect(body()).not.toContain('PRIVATE_PROVIDER_ERROR'); expect(body()).toContain('could not be generated'); await press('Retry'); expect(body()).toContain('topic_simplify');
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
