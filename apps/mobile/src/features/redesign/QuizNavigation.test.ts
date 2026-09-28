import { createElement, type ElementType } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Quiz, QuizAttempt } from '@stay-focused/shared';
import type { LocalQuizPractice } from '../../services/localLibrary/artifactStore';
import { QuizScreen } from './QuizScreen';
import { QuestionSlider } from './QuestionSlider';
import { newOfflineAttempt } from './localQuizPractice';

const mocks = vi.hoisted(() => ({
  quiz: null as Quiz | null, practice: null as LocalQuizPractice | null,
  remote: null as QuizAttempt | null, request: vi.fn(),
}));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', Pressable: 'Pressable', TextInput: 'TextInput' }));
vi.mock('lucide-react-native', () => ({ ChevronLeft: 'ChevronLeft', ChevronRight: 'ChevronRight' }));
vi.mock('expo-router', () => ({ router: { back: vi.fn() }, useLocalSearchParams: () => ({ id: 'quiz-one' }) }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner' } } }) }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ colors: {} }) }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Page: 'Page', Surface: 'Surface', SkeletonCards: 'SkeletonCards', Sheet: 'Sheet' }));
vi.mock('../../design/feedback', () => ({ playFeedbackSound: vi.fn() }));
vi.mock('../../design/haptics', () => ({ haptic: { select: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: mocks.request, newRequestKey: () => 'key', ExperienceApiError: class extends Error {} }));
vi.mock('./useExperience', () => ({
  useExperience: (path: string) => path.endsWith('/attempts') ? { loading: true, data: [], refresh: vi.fn() } : { data: mocks.quiz },
  useExperienceClient: () => ({ baseUrl: 'https://example.test', accessToken: 'test' }),
}));
vi.mock('./useLocalLibrary', () => ({ useLocalArtifact: () => ({ data: { quiz: mocks.quiz } }) }));
vi.mock('../../services/localLibrary/localArtifactDatabase', () => ({ getLocalArtifactStore: async () => ({
  readQuizPractice: async () => structuredClone(mocks.practice),
  saveQuizPractice: async (_owner: string, _id: string, value: LocalQuizPractice) => { mocks.practice = structuredClone(value); },
}) }));

let tree: ReactTestRenderer;
const event = (pageX: number, pageY = 100) => ({ nativeEvent: { pageX, pageY } });
function arrow(direction: 'left' | 'right') {
  return tree.root.findByProps({ accessibilityLabel: `Go one question ${direction}` });
}
function track() { return tree.root.findByProps({ accessibilityLabel: 'Question slider' }); }
function action(text: string) {
  return tree.root.findAllByType('Action' as ElementType).find(node => node.children.includes(text))!;
}
async function mount() {
  await act(async () => { tree = create(createElement(QuizScreen), {
    createNodeMock: () => ({ measureInWindow: (callback: (x: number) => void) => callback(60) }),
  }); });
}
async function tap(direction: 'left' | 'right') { await act(async () => { arrow(direction).props.onPress(); }); }

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const questions: Quiz['questions'] = Array.from({ length: 30 }, (_, i) => ({
    id: `q${i + 1}`, type: 'single_select', prompt: `Prompt ${i + 1}`, difficulty: 'easy',
    selectionInstruction: 'Choose one', options: [{ id: 'a', text: 'Choice A' }, { id: 'b', text: 'Choice B' }],
  }));
  mocks.quiz = { id: 'quiz-one', title: 'Navigation', courseId: null, reviewerArtifactId: null, sourceId: 'source',
    sourceMaterialIds: [], questionCount: 30, difficulty: 'easy', createdAt: '', updatedAt: '', attemptCount: 1, latestScore: null, bestScore: null, questions };
  const attempt = { ...newOfflineAttempt('quiz-one', 'one'), id: 'server-one', currentQuestion: 9 };
  mocks.practice = { attempt, selected: [], result: null, dirty: false };
  mocks.remote = attempt;
  mocks.request.mockReset();
  mocks.request.mockImplementation(async (_client, path: string, options: { body: { action?: string; position?: number; questionId?: string; selectedOptionIds?: string[] } }) => {
    const body = options.body;
    let value = mocks.remote!;
    if (path.includes('/answers/')) {
      const questionId = path.split('/').at(-1)!;
      value = { ...value, answers: [...value.answers.filter(answer => answer.questionId !== questionId), { questionId, selectedOptionIds: body.selectedOptionIds ?? [], finalizedAt: null }] };
    }
    if (body.action === 'navigate') value = { ...value, currentQuestion: body.position! };
    if (body.action === 'reveal') value = { ...value, revealedQuestionIds: [...value.revealedQuestionIds, body.questionId!], assistedQuestionIds: [...value.assistedQuestionIds, body.questionId!] };
    mocks.remote = value;
    return value;
  });
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });

describe('minimal Quiz navigation', () => {
  it('moves 10 → 11 → 12 → 11 → 10 freely and leaves the question unanswered', async () => {
    await mount();
    for (const [direction, index] of [['right', 10], ['right', 11], ['left', 10], ['left', 9]] as const) {
      await tap(direction);
      expect(track().props.accessibilityValue.now).toBe(index + 1);
    }
    expect(mocks.practice!.attempt!.answers).toEqual([]);
    expect(mocks.practice!.attempt!.skippedQuestionIds).toEqual([]);
    expect(tree.root.findAllByType('Action' as ElementType).some(node => node.props.disabled === false && node.children.includes('Choice A'))).toBe(true);
    const labels = tree.root.findAllByType('Action' as ElementType).flatMap(node => node.children);
    expect(labels).not.toContain('Skip'); expect(labels).not.toContain('Previous'); expect(labels).not.toContain('Next');
    expect(labels).toContain('Reveal Answer');
    expect(mocks.request.mock.calls.every(([, , options]) => options.body.action === 'navigate')).toBe(true);
  });

  it('disables only the outward arrows at the first and final questions', async () => {
    mocks.practice = { ...mocks.practice!, attempt: { ...mocks.practice!.attempt!, currentQuestion: 0 } };
    await mount();
    expect(arrow('left').props.disabled).toBe(true);
    expect(arrow('right').props.disabled).toBe(false);
    await act(async () => tree.root.findByType(QuestionSlider).props.onSettle(29));
    expect(arrow('left').props.disabled).toBe(false);
    expect(arrow('right').props.disabled).toBe(true);
  });

  it.each([['single_select', ['a']], ['multi_select', ['a', 'b']], ['matching', ['left:a', 'other:b']], ['identification', ['written draft']]] as const)(
    'retains a %s draft across arrow and slider jumps', async (type, selection) => {
      mocks.quiz = { ...mocks.quiz!, questions: mocks.quiz!.questions.map((question, i) => i === 9 ? { ...question, type } : question) };
      mocks.practice = { ...mocks.practice!, selected: [...selection] };
      await mount(); await tap('right');
      await act(async () => tree.root.findByType(QuestionSlider).props.onSettle(25));
      await act(async () => tree.root.findByType(QuestionSlider).props.onSettle(9));
      expect(mocks.practice!.selected).toEqual(selection);
      expect(mocks.practice!.attempt!.answers.find(answer => answer.questionId === 'q10')?.finalizedAt).toBeNull();
      expect(mocks.practice!.attempt!.skippedQuestionIds).toEqual([]);
    });

  it('retains reveal and finalized answers through navigation and a local restart', async () => {
    const answer = { questionId: 'q4', selectedOptionIds: ['b'], finalizedAt: '2026-09-28T00:00:00Z' };
    mocks.remote = { ...mocks.remote!, answers: [answer], skippedQuestionIds: ['q8'] };
    mocks.practice = { ...mocks.practice!, attempt: mocks.remote };
    await mount();
    await act(async () => action('Reveal Answer').props.onPress());
    await tap('right'); await tap('left');
    await act(async () => tree.unmount()); await mount();
    expect(mocks.practice!.attempt!.revealedQuestionIds).toContain('q10');
    expect(mocks.practice!.attempt!.answers).toContainEqual(answer);
    expect(mocks.practice!.attempt!.skippedQuestionIds).toEqual(['q8']);
    expect(tree.root.findAllByType('Action' as ElementType).flatMap(node => node.children)).not.toContain('Reveal Answer');
  });
});

describe('slider responder ownership', () => {
  it.each([-8, 8, 0])('retains a horizontal drag with %i dp vertical drift until release', async drift => {
    await mount();
    await act(async () => track().props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
    track().props.onTouchStart(event(100));
    expect(track().props.onStartShouldSetResponder()).toBe(false);
    expect(track().props.onMoveShouldSetResponderCapture(event(130, 100 + drift))).toBe(true);
    await act(async () => track().props.onResponderGrant(event(130, 100 + drift)));
    await act(async () => track().props.onResponderMove(event(270, 150)));
    expect(track().props.onResponderTerminationRequest()).toBe(false);
    expect(track().props.onMoveShouldSetResponderCapture(event(271, 190))).toBe(true);
    expect(track().props.accessibilityValue.now).toBe(10);
    await act(async () => track().props.onResponderRelease());
    expect(track().props.accessibilityValue.now).toBe(21);
  });

  it('lets a dominant vertical gesture scroll and never jumps when that touch ends', async () => {
    await mount();
    track().props.onTouchStart(event(100));
    expect(track().props.onMoveShouldSetResponderCapture(event(103, 125))).toBe(false);
    expect(track().props.onResponderTerminationRequest()).toBe(true);
    expect(track().props.onMoveShouldSetResponderCapture(event(250, 126))).toBe(false);
    await act(async () => track().props.onTouchEnd(event(250, 126)));
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
