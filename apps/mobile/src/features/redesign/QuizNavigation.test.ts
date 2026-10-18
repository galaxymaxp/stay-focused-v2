import { createElement, type ElementType } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Quiz, QuizAnswerKey, QuizAttempt } from '@stay-focused/shared';
import type { LocalQuizPractice } from '../../services/localLibrary/artifactStore';
import { QuizScreen } from './QuizScreen';
import { QuestionSlider } from './QuestionSlider';
import { newOfflineAttempt } from './localQuizPractice';

vi.mock('../../auth/sessionStore', () => ({ sessionStore: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined) } }));

const mocks = vi.hoisted(() => ({
  quiz: null as Quiz | null, practice: null as LocalQuizPractice | null,
  remote: null as QuizAttempt | null, request: vi.fn(),
  offline: false, answerKey: null as QuizAnswerKey | null,
  saved: null as { quiz: Quiz } | null, historyReady: false,
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
  useExperience: (path: string) => path.endsWith('/attempts') ? { loading: !mocks.historyReady, data: [], refresh: vi.fn() } : { data: mocks.offline ? null : mocks.quiz },
  useExperienceClient: () => ({ baseUrl: 'https://example.test', accessToken: 'test' }),
}));
vi.mock('./useLocalLibrary', () => ({ useLocalArtifact: () => ({ data: mocks.saved }) }));
vi.mock('../../services/localLibrary/localArtifactDatabase', () => ({ getLocalArtifactStore: async () => ({
  readQuizPractice: async () => structuredClone(mocks.practice),
  readQuizAnswerKey: async () => structuredClone(mocks.answerKey),
  saveQuizPractice: async (_owner: string, _id: string, value: LocalQuizPractice) => { mocks.practice = structuredClone(value); },
}) }));

let tree: ReactTestRenderer;
const event = (pageX: number, pageY = 100) => ({ nativeEvent: { pageX, pageY } });
function arrow(direction: 'left' | 'right') {
  return tree.root.findByProps({ accessibilityLabel: `Go one question ${direction}` });
}
function track() { return tree.root.findByProps({ accessibilityLabel: 'Question slider' }); }
function page() { return tree.root.findByType('Page' as ElementType); }
function action(text: string) {
  return tree.root.findAllByType('Action' as ElementType).find(node => node.children.includes(text))!;
}
async function mount() {
  mocks.saved = { quiz: mocks.quiz! };
  await act(async () => { tree = create(createElement(QuizScreen), {
    createNodeMock: () => ({ measureInWindow: (callback: (x: number) => void) => callback(60) }),
  }); });
}
async function tap(direction: 'left' | 'right') { await act(async () => { arrow(direction).props.onPress(); }); }

beforeEach(() => {
  mocks.offline = false; mocks.answerKey = null; mocks.historyReady = false;
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
  it('opens Questions from the progress label and navigates exactly once from a number chip', async () => {
    await mount();
    expect(tree.root.findAllByType('Sheet' as ElementType)).toHaveLength(0);
    const label = tree.root.findByProps({ accessibilityLabel: 'Question 10 of 30, show all questions' });
    expect(label.props.accessibilityRole).toBe('button');
    expect(label.props.style.minHeight).toBeGreaterThanOrEqual(44);
    await act(async () => label.props.onPress());
    expect(tree.root.findByType('Sheet' as ElementType).props.title).toBe('Questions');
    const chip = tree.root.findByProps({ accessibilityLabel: 'Question 20, Unanswered' });
    expect(chip.findByType('Copy' as ElementType).children).toEqual(['20']);
    await act(async () => chip.props.onPress());
    expect(tree.root.findAllByType('Sheet' as ElementType)).toHaveLength(0);
    expect(track().props.accessibilityValue.now).toBe(20);
    expect(mocks.request).toHaveBeenCalledTimes(1);
    expect(mocks.request.mock.calls[0]![2].body).toEqual({ action: 'navigate', position: 19 });
    expect(tree.root.findAllByType('Action' as ElementType).flatMap(node => node.children)).not.toContain('Questions');
  });
  it('does not open the overview during an active drag, including a stale label callback', async () => {
    await mount();
    const press = tree.root.findByProps({ accessibilityLabel: 'Question 10 of 30, show all questions' }).props.onPress;
    track().props.onResponderGrant(event(100));
    await act(async () => track().props.onResponderMove(event(140)));
    expect(tree.root.findByProps({ accessibilityLabel: 'Question 10 of 30, show all questions' }).props.disabled).toBe(true);
    await act(async () => press());
    expect(tree.root.findAllByType('Sheet' as ElementType)).toHaveLength(0);
    expect(mocks.request).not.toHaveBeenCalled();
    await act(async () => track().props.onResponderTerminate());
    await act(async () => tree.root.findByProps({ accessibilityLabel: 'Question 10 of 30, show all questions' }).props.onPress());
    expect(tree.root.findAllByType('Sheet' as ElementType)).toHaveLength(1);
  });
  it('keeps all 100 chips available and announces current, revealed, answered and unanswered', async () => {
    mocks.quiz = { ...mocks.quiz!, questionCount: 100, questions: Array.from({ length: 100 }, (_, index) => ({ ...mocks.quiz!.questions[0]!, id: `q${index + 1}` })) };
    mocks.practice = { ...mocks.practice!, attempt: { ...mocks.remote!, revealedQuestionIds: ['q2'], answers: [{ questionId: 'q3', selectedOptionIds: ['a'], finalizedAt: 'checked' }] } };
    await mount();
    await act(async () => tree.root.findByProps({ accessibilityLabel: 'Question 10 of 100, show all questions' }).props.onPress());
    const sheet = tree.root.findByType('Sheet' as ElementType);
    expect(sheet.findAllByType('Pressable' as ElementType)).toHaveLength(100);
    for (const label of ['Question 10, Current', 'Question 2, Revealed', 'Question 3, Answered', 'Question 100, Unanswered']) expect(sheet.findByProps({ accessibilityLabel: label })).toBeDefined();
    await act(async () => sheet.props.onClose());
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('opens the saved-only caption list and jumps locally without an attempt or request', async () => {
    mocks.offline = true; mocks.practice = null;
    await mount();
    const labels = tree.root.findAllByProps({ accessibilityLabel: 'Question 1 of 30, show all questions' });
    await act(async () => labels[0]!.props.onPress());
    const sheet = tree.root.findByType('Sheet' as ElementType);
    await act(async () => sheet.findByProps({ label: 'Question 25, Unanswered' }).props.onPress());
    expect(tree.root.findAllByType('Sheet' as ElementType)).toHaveLength(0);
    expect(track().props.accessibilityValue.now).toBe(25);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('keeps the optional label inert when QuestionSlider has no callback', async () => {
    await mount();
    await act(async () => tree.update(createElement(QuestionSlider, { current: 0, count: 2, onSettle: vi.fn() })));
    expect(tree.root.findAllByType('Pressable' as ElementType)).toHaveLength(2);
    expect(tree.root.findAllByType('Text' as ElementType).some(node => node.children.includes('Question 1 of 2'))).toBe(true);
  });
  it.each(['identification', 'modified_true_false'] as const)('keeps checked %s feedback to the verdict until final review', async type => {
    mocks.quiz = { ...mocks.quiz!, questions: mocks.quiz!.questions.map((q, index) => index === 9 ? { ...q, type } : q) };
    const feedback = { questionId: 'q10', selectedOptionIds: ['a'], correctOptionIds: ['secret-key'], correctAnswerText: 'Accepted term',
      correct: false, explanation: 'Secret explanation', topicId: 't', topic: 'Topic', sourceRefs: [], reviewerSectionIds: [] };
    mocks.practice = { ...mocks.practice!, attempt: { ...mocks.remote!, feedback: [feedback] } };
    await mount();
    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain('Keep learning');
    for (const hidden of ['Correct answer:', 'Accepted term', 'Secret explanation', 'Reveal Answer']) expect(rendered).not.toContain(hidden);
  });
  it('moves with explicit Previous/Next and keeps the slider in sync', async () => {
    await mount();
    await act(async () => action('Next').props.onPress());
    expect(track().props.accessibilityValue.now).toBe(11);
    await act(async () => action('Previous').props.onPress());
    expect(track().props.accessibilityValue.now).toBe(10);
  });
  it('reviews questions by identity when result order differs from quiz order', async () => {
    const entry = (questionId: string) => ({ questionId, selectedOptionIds: ['a'], correctOptionIds: ['b'], correct: false,
      explanation: 'Review', topicId: 't', topic: 'Topic', sourceRefs: [], reviewerSectionIds: [] });
    mocks.practice = { ...mocks.practice!, attempt: null, result: { attemptId: 'one', quizId: 'quiz-one', correctCount: 0, incorrectCount: 2,
      skippedCount: 28, revealedCount: 0, totalQuestions: 30, earnedPoints: 0, possiblePoints: 30, percentage: 0,
      questions: [entry('q20'), entry('q3')], topicPerformance: [], weakAreas: [] } };
    await mount();
    await act(async () => action('Review answers').props.onPress());
    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain('Prompt 20');
    expect(rendered).toContain('Prompt 3');
    expect(rendered).not.toContain('Prompt 1');
  });
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
    expect(labels).not.toContain('Skip'); expect(labels).toContain('Previous'); expect(labels).toContain('Next');
    expect(labels).toContain('Reveal Answer');
    expect(mocks.request.mock.calls.every(([, , options]) => options.body.action === 'navigate')).toBe(true);
  });

  it('disables only the outward arrows at the first and final questions', async () => {
    mocks.practice = { ...mocks.practice!, attempt: { ...mocks.practice!.attempt!, currentQuestion: 0 } };
    await mount();
    expect(arrow('left').props.disabled).toBe(true);
    expect(action('Previous').props.disabled).toBe(true);
    expect(arrow('right').props.disabled).toBe(false);
    await act(async () => tree.root.findByType(QuestionSlider).props.onSettle(29));
    expect(arrow('left').props.disabled).toBe(false);
    expect(arrow('right').props.disabled).toBe(true);
    expect(action('Next').props.disabled).toBe(true);
  });

  it('shows the destination immediately on release while the online position save is pending', async () => {
    await mount();
    let finishSave!: (value: QuizAttempt) => void;
    mocks.request.mockImplementationOnce(() => new Promise<QuizAttempt>(resolve => { finishSave = resolve; }));
    await act(async () => tree.root.findByType(QuestionSlider).props.onSettle(24));
    expect(track().props.accessibilityValue.now).toBe(25);
    expect(tree.root.findAllByType('Copy' as ElementType).flatMap(node => node.children)).toContain('Prompt 25');
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await act(async () => finishSave({ ...mocks.remote!, currentQuestion: 24 }));
    expect(track().props.accessibilityValue.now).toBe(25);
    expect(mocks.practice!.attempt!.currentQuestion).toBe(24);
  });

  it('restores the previous question and draft if an online navigation save is rejected', async () => {
    mocks.practice = { ...mocks.practice!, selected: ['a'] };
    await mount();
    mocks.request.mockRejectedValueOnce(new Error('save rejected'));
    await act(async () => tree.root.findByType(QuestionSlider).props.onSettle(24));
    expect(track().props.accessibilityValue.now).toBe(10);
    expect(mocks.practice!.selected).toEqual(['a']);
    expect(mocks.practice!.attempt!.currentQuestion).toBe(9);
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

describe('saved quiz with offline answer keys', () => {
  function enableKeys() {
    mocks.offline = true;
    mocks.answerKey = { quizId: mocks.quiz!.id, versionId: 'v1', questions: mocks.quiz!.questions.map(q => ({
      id: q.id, correctOptionIds: ['a'], explanation: 'Synthetic local explanation' })) };
  }
  it('reveals and finishes from a stored key, then restores the scored result after restart', async () => {
    enableKeys();
    await mount();
    expect(action('Reveal Answer').props.disabled).toBe(false);
    await act(async () => action('Reveal Answer').props.onPress());
    expect(mocks.practice!.attempt!.assistedQuestionIds).toContain('q10');
    expect(tree.root.findAllByType('Copy' as ElementType).flatMap(node => node.children)).toContain('Synthetic local explanation');
    await act(async () => action('Finish quiz').props.onPress());
    expect(mocks.practice).toMatchObject({ dirty: true, attempt: { status: 'completed' }, result: { percentage: 0 } });
    expect(tree.root.findAllByType('Copy' as ElementType).flatMap(node => node.children)).toContain('Scored offline · will sync');
    await act(async () => tree.unmount()); await mount();
    expect(tree.root.findAllByType('Copy' as ElementType).flatMap(node => node.children)).toContain('Scored offline · will sync');
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('checks an answer offline and scores it using the shared grader', async () => {
    enableKeys(); mocks.practice = { ...mocks.practice!, selected: ['a'] };
    await mount();
    expect(action('Check answer').props.disabled).toBe(false);
    await act(async () => action('Check answer').props.onPress());
    await act(async () => action('Finish quiz').props.onPress());
    expect(mocks.practice!.result).toMatchObject({ earnedPoints: 1, possiblePoints: 30, percentage: 3.33 });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('keeps the existing connection-required controls when there is no key', async () => {
    mocks.offline = true;
    await mount();
    expect(action('Reveal Answer').props.disabled).toBe(true);
    expect(action('Finish quiz').props.disabled).toBe(true);
    expect(tree.root.findAllByType('Notice' as ElementType).flatMap(node => node.children)).toContain('Offline practice is saved on this device. Connect to check or reveal answers and sync your progress.');
  });
  it('loads a key that finishes hydration after the first device read', async () => {
    mocks.offline = true;
    await mount();
    expect(action('Reveal Answer').props.disabled).toBe(true);
    enableKeys();
    mocks.saved = { quiz: mocks.quiz! };
    await act(async () => tree.update(createElement(QuizScreen)));
    expect(action('Reveal Answer').props.disabled).toBe(false);
  });
  it('adopts and persists the completed server result after reconnect', async () => {
    enableKeys(); mocks.practice = { ...mocks.practice!, selected: ['a'] };
    await mount();
    await act(async () => action('Check answer').props.onPress());
    await act(async () => action('Finish quiz').props.onPress());
    const serverResult = { ...mocks.practice!.result!, attemptId: 'server-one', percentage: 25 };
    mocks.request.mockImplementation(async (_client, path: string) => path.endsWith('/result') ? serverResult : { ...mocks.practice!.attempt!, id: 'server-one', status: 'completed' });
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    await act(async () => action('Sync progress').props.onPress());
    expect(mocks.practice).toMatchObject({ dirty: false, result: { percentage: 25 } });
    expect(tree.root.findAllByType('Copy' as ElementType).flatMap(node => node.children)).not.toContain('Scored offline · will sync');
    expect(log).toHaveBeenCalledExactlyOnceWith('offline_score_mismatch');
    log.mockRestore();
  });
  it('automatically adopts the completed server score when the online reads recover', async () => {
    enableKeys();
    await mount();
    await act(async () => action('Finish quiz').props.onPress());
    const serverResult = { ...mocks.practice!.result!, attemptId: 'server-one' };
    mocks.request.mockImplementation(async (_client, path: string) => path.endsWith('/result') ? serverResult : { ...mocks.practice!.attempt!, id: 'server-one', status: 'completed' });
    mocks.offline = false; mocks.historyReady = true;
    await act(async () => tree.update(createElement(QuizScreen)));
    expect(mocks.practice).toMatchObject({ dirty: false, result: { attemptId: 'server-one' } });
    expect(tree.root.findAllByType('Copy' as ElementType).flatMap(node => node.children)).not.toContain('Scored offline · will sync');
  });
});

describe('slider responder ownership', () => {
  it.each([
    [[0, 0], [5, 1], [14, 4], [28, 7], [45, 10], [70, 8], [120, 15], [170, -10]],
    [[0, 0], [-6, 2], [-18, 5], [-35, 9], [-60, 14], [-120, 20]],
    [[0, 0], [10, 2], [20, 6], [35, 3], [50, 9], [70, 5]],
  ].map(points => [points]))('retains the responder and only navigates on release for %j', async points => {
    await mount();
    await act(async () => track().props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
    const slider = tree.root.findByType(QuestionSlider);
    expect(track().props.onStartShouldSetResponder()).toBe(true);
    track().props.onResponderGrant(event(200));
    expect(page().props.scrollEnabled).toBe(true);
    for (const [dx, dy] of points.slice(1)) {
      await act(async () => track().props.onResponderMove(event(200 + dx, 100 + dy)));
      expect(track().props.onResponderTerminationRequest(event(200 + dx, 100 + dy))).toBe(false);
      expect(tree.root.findByType(QuestionSlider)).toBe(slider);
    }
    expect(page().props.scrollEnabled).toBe(false);
    expect(track().props.accessibilityValue.now).toBe(10);
    const [dx, dy] = points.at(-1)!;
    await act(async () => track().props.onResponderRelease(event(200 + dx, 100 + dy)));
    expect(page().props.scrollEnabled).toBe(true);
    expect(track().props.accessibilityValue.now).not.toBe(10);
  });

  it('lets a dominant vertical gesture scroll and never jumps when that touch ends', async () => {
    await mount();
    expect(track().props.onStartShouldSetResponder()).toBe(true);
    track().props.onResponderGrant(event(100));
    await act(async () => track().props.onResponderMove(event(103, 108)));
    expect(page().props.scrollEnabled).toBe(true);
    expect(track().props.onResponderTerminationRequest(event(103, 108))).toBe(false);
    await act(async () => track().props.onResponderMove(event(103, 125)));
    expect(track().props.onResponderTerminationRequest(event(103, 125))).toBe(true);
    await act(async () => track().props.onResponderTerminate());
    expect(page().props.scrollEnabled).toBe(true);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('restores page scrolling without navigation when an active drag is cancelled', async () => {
    await mount();
    track().props.onResponderGrant(event(100));
    await act(async () => track().props.onResponderMove(event(140, 106)));
    expect(page().props.scrollEnabled).toBe(false);
    await act(async () => track().props.onResponderTerminate());
    expect(page().props.scrollEnabled).toBe(true);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('keeps a 100-question drag mounted through long vertical wobble and settles once', async () => {
    mocks.quiz = { ...mocks.quiz!, questionCount: 100, questions: Array.from({ length: 100 }, (_, i) => ({
      ...mocks.quiz!.questions[0]!, id: `q${i + 1}`, prompt: `Prompt ${i + 1}`,
    })) };
    mocks.practice = { ...mocks.practice!, attempt: { ...mocks.practice!.attempt!, currentQuestion: 4 } };
    mocks.remote = mocks.practice.attempt;
    await mount();
    await act(async () => track().props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
    const slider = tree.root.findByType(QuestionSlider);
    track().props.onResponderGrant(event(72));
    for (const [x, y] of [[90, 101], [160, 115], [240, 90], [340, 120]]) {
      await act(async () => track().props.onResponderMove(event(x, y)));
      expect(tree.root.findByType(QuestionSlider)).toBe(slider);
      expect(track().props.onResponderTerminationRequest(event(x, y))).toBe(false);
      expect(track().props.accessibilityValue.now).toBe(5);
    }
    expect(page().props.scrollEnabled).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
    await act(async () => track().props.onResponderRelease(event(345, 130)));
    expect(track().props.accessibilityValue.now).toBe(95);
    expect(page().props.scrollEnabled).toBe(true);
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
});
