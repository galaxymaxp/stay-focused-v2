import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Quiz, QuizAttempt, QuizQuestionState } from '@stay-focused/shared';
import { QuestionGrid, QuestionJump } from './quiz-navigation';
import { QuizScreen } from './quiz';

const mocks = vi.hoisted(() => ({ api: vi.fn(), focus: vi.fn(), currentFocus: vi.fn(), showModal: vi.fn(), close: vi.fn(), quiz: null as Quiz | null }));
vi.mock('../components/ui', () => ({ Icon: 'Icon', Heading: 'Heading', State: 'State', Notice: 'Notice', Empty: 'Empty' }));
vi.mock('../components/count-up', () => ({ CountUp: 'CountUp', SpringProgress: 'SpringProgress' }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ api: mocks.api }) }));
vi.mock('../lib/hooks', () => ({
  useResource: (path: string) => ({ data: path.endsWith('/attempts') ? [] : mocks.quiz, refresh: vi.fn() }),
  useAction: () => ({ busy: false, run: async (callback: () => Promise<void>) => callback() }),
}));
vi.mock('next/link', () => ({ default: 'a' }));

let tree: ReactTestRenderer | undefined;
const states: QuizQuestionState[] = ['current', 'revealed', 'answered', 'unanswered'];
const select = vi.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  vi.stubGlobal('window', new EventTarget());
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
async function mount(screen = false) {
  await act(async () => { tree = create(screen ? createElement(QuizScreen, { id: 'quiz' }) : createElement(QuestionJump, { index: 0, states, disabled: false, onSelect: select }), {
    createNodeMock: element => {
      const props = element.props as Record<string, unknown>;
      if (props.className === 'meta quiz-jump-trigger') return { focus: mocks.focus };
      if (element.type === 'dialog') return { showModal: mocks.showModal, close: mocks.close, querySelector: () => ({ focus: mocks.currentFocus }) };
      return null;
    },
  }); });
}
const trigger = () => tree!.root.findAllByType('button').find(node => node.props.className === 'meta quiz-jump-trigger')!;
const dialog = () => tree!.root.findByType('dialog');
const open = async () => act(async () => trigger().props.onClick());

it('opens a labelled dialog, focuses current, and renders every shared state', async () => {
  await mount();
  expect(trigger().props['aria-expanded']).toBe(false);
  expect(trigger().props['aria-label']).toBe('Question 1 of 4, show all questions');
  await open();
  expect(trigger().props['aria-expanded']).toBe(true);
  expect(mocks.showModal).toHaveBeenCalledOnce(); expect(mocks.currentFocus).toHaveBeenCalledOnce();
  expect(dialog().props['aria-labelledby']).toBe(dialog().findByType('h2').props.id);
  const dots = dialog().findByType(QuestionGrid).findAllByType('button');
  expect(dots.map(dot => dot.props['aria-label'])).toEqual(['Question 1, current', 'Question 2, revealed', 'Question 3, answered', 'Question 4, unanswered']);
  expect(dots[0]!.props['aria-current']).toBe('step');
});
it('selects exactly once, closes and restores trigger focus', async () => {
  await mount(); await open();
  await act(async () => dialog().findByType(QuestionGrid).findAllByType('button')[3]!.props.onClick());
  expect(select).toHaveBeenCalledExactlyOnceWith(3);
  expect(tree!.root.findAllByType('dialog')).toHaveLength(0);
  expect(mocks.focus).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
});
it('closes on Escape through native cancel and returns focus without navigation', async () => {
  await mount(); await open(); const preventDefault = vi.fn();
  await act(async () => dialog().props.onCancel({ preventDefault }));
  expect(preventDefault).toHaveBeenCalledOnce(); expect(mocks.focus).toHaveBeenCalledOnce();
  expect(select).not.toHaveBeenCalled(); expect(tree!.root.findAllByType('dialog')).toHaveLength(0);
});
it('ignores inside clicks and dismisses backdrop clicks with focus return', async () => {
  await mount(); await open(); const outside = {};
  await act(async () => dialog().props.onClick({ target: {}, currentTarget: outside }));
  expect(tree!.root.findAllByType('dialog')).toHaveLength(1);
  await act(async () => dialog().props.onClick({ target: outside, currentTarget: outside }));
  expect(tree!.root.findAllByType('dialog')).toHaveLength(0);
  expect(mocks.focus).toHaveBeenCalledOnce(); expect(select).not.toHaveBeenCalled();
});
it('Done closes without navigation and can reopen', async () => {
  await mount(); await open();
  await act(async () => dialog().findAllByType('button').find(node => node.children.includes('Done'))!.props.onClick());
  expect(trigger().props['aria-expanded']).toBe(false); expect(mocks.focus).toHaveBeenCalledOnce();
  await open(); expect(mocks.showModal).toHaveBeenCalledTimes(2); expect(select).not.toHaveBeenCalled();
});
it('renders 100 questions without truncation and disables navigation while busy', async () => {
  await mount();
  await act(async () => tree!.update(createElement(QuestionJump, { index: 0, states: Array.from({ length: 100 }, (_, index) => index === 0 ? 'current' : 'unanswered'), disabled: true, onSelect: select })));
  expect(trigger().props['aria-disabled']).toBe(true);
  expect(trigger().props.disabled).toBeUndefined();
  await open(); expect(tree!.root.findAllByType('dialog')).toHaveLength(0);
  await act(async () => tree!.update(createElement(QuestionJump, { index: 0, states: Array.from({ length: 100 }, (): QuizQuestionState => 'unanswered'), disabled: false, onSelect: select })));
  await open(); expect(dialog().findByType(QuestionGrid).findAllByType('button')).toHaveLength(100);
  await act(async () => tree!.update(createElement(QuestionJump, { index: 0, states, disabled: true, onSelect: select })));
  expect(dialog().findByType(QuestionGrid).findAllByType('button').every(node => node.props.disabled)).toBe(true);
});
it('shares the rail grid, calls the real moveTo once, and keeps the focused trigger mounted across a jump', async () => {
  mocks.quiz = { id: 'quiz', title: 'Navigation', courseId: null, reviewerArtifactId: null, sourceId: 'source',
    sourceMaterialIds: [], difficulty: 'easy', createdAt: '', updatedAt: '', attemptCount: 0, latestScore: null, bestScore: null,
    questionCount: 4, questions: states.map((_, index) => ({ id: `q${index}`, type: 'single_select', difficulty: 'easy', prompt: `Prompt ${index}`,
      options: [{ id: 'a', text: 'Choice A' }, { id: 'b', text: 'Choice B' }], selectionInstruction: 'Choose one' })) };
  let attempt: QuizAttempt = { id: 'attempt', quizId: 'quiz', currentQuestion: 0, status: 'in_progress', answers: [], feedback: [], revealedQuestionIds: [], assistedQuestionIds: [], skippedQuestionIds: [], startedAt: '', updatedAt: '', completedAt: null };
  mocks.api.mockImplementation(async (_path: string, options: { body?: { action?: string; position?: number } }) => {
    if (options.body?.action === 'navigate') attempt = { ...attempt, currentQuestion: options.body.position! };
    return attempt;
  });
  await mount(true);
  await act(async () => tree!.root.findAllByType('button').find(node => node.children.includes('Start practice'))!.props.onClick());
  const originalTrigger = trigger();
  await open(); expect(tree!.root.findAllByType(QuestionGrid)).toHaveLength(2);
  mocks.api.mockClear();
  // Modal key events must not navigate the background quiz.
  const keyEvent = new Event('keydown'); Object.defineProperties(keyEvent, { key: { value: 'ArrowRight' }, target: { value: { closest: () => ({}) } } });
  window.dispatchEvent(keyEvent); expect(mocks.api).not.toHaveBeenCalled();
  await act(async () => dialog().findByType(QuestionGrid).findAllByType('button')[3]!.props.onClick());
  expect(mocks.api).toHaveBeenCalledExactlyOnceWith('/api/experience/quiz-attempts/attempt/study-state', { method: 'PATCH', body: { action: 'navigate', position: 3 } });
  expect(trigger()).toBe(originalTrigger);
  expect(trigger().props['aria-label']).toBe('Question 4 of 4, show all questions');
  expect(mocks.focus).toHaveBeenCalledOnce(); expect(tree!.root.findAllByType('dialog')).toHaveLength(0);
});
