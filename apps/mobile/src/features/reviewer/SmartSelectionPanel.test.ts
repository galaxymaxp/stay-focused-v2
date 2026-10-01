import { createElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STUDY_GROUNDING_DETAILS, STUDY_LIMITS, STUDY_OFFLINE, STUDY_QUESTION_TOO_LONG, STUDY_SELECTION_TOO_LARGE, selectAssistBlock, studySurface, type ReviewerReaderModel, type StudyToolRequest } from '@stay-focused/shared';
import { reviewerDetail } from '../../services/localLibrary/localLibrary.testSupport';

vi.mock('react-native', () => ({ View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator',
  Easing: { inOut: () => undefined, quad: undefined },
  Vibration: { vibrate: vi.fn() }, useWindowDimensions: () => ({ width: 360, height: 800 }),
  Animated: { View: 'AnimatedView', Value: class { setValue() {} stopAnimation() {} interpolate() { return 1; } },
    timing: () => ({ start: (done?: () => void) => done?.() }), multiply: () => 1, spring: () => ({ start: () => {} }),
    loop: () => ({ start: () => {}, stop: () => {} }), sequence: () => ({}) },
}));
vi.mock('lucide-react-native', () => Object.fromEntries(['ChevronDown', 'ChevronUp', 'FileQuestion', 'CheckCircle2', 'Circle', 'Sparkles', 'X', 'AlertCircle',
  'AlignLeft', 'ArrowLeftRight', 'Check', 'FlaskConical', 'Lightbulb', 'RotateCcw'].map(name => [name, name])));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Page: 'Page', SearchField: 'SearchField', SegmentedControl: 'SegmentedControl', Sheet: 'Sheet', Surface: 'Surface', SkeletonBlock: 'SkeletonBlock' }));
vi.mock('../../design/haptics', () => ({ haptic: { tap: vi.fn(), select: vi.fn(), press: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner' }, accessToken: 'test' } }) }));
vi.mock('../../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://example.test' }));
vi.mock('../../services/generationRecovery', () => ({ createGenerationIntent: vi.fn() }));
vi.mock('../../design/theme', async () => {
  const tokens = await import('../../design/themeTokens');
  return { ...tokens, useTheme: () => ({ colors: tokens.palettes.light, mode: 'light', reducedMotion: true }) };
});
vi.mock('../../services/studyAssist', async importOriginal => {
  const original = await importOriginal<typeof import('../../services/studyAssist')>();
  return { ...original, studyAssist: { request: vi.fn(), peek: vi.fn(async () => null) } };
});
vi.mock('../../services/experienceApi', async importOriginal => ({ ...await importOriginal<typeof import('../../services/experienceApi')>(), experienceRequest: vi.fn() }));
const { ReviewerReaderScreen } = await import('./ReviewerReader');
const { StudyAssistSheet } = await import('./StudyAssistSheet');
const { experienceRequest, ExperienceApiError } = await import('../../services/experienceApi');
const { assistStore } = await import('./assistStore');
const network = vi.mocked(experienceRequest);

let rendered: ReactTestRenderer | undefined;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; vi.clearAllMocks(); assistStore.reset(); });
const detail = reviewerDetail();
const reviewer = ('reviewer' in detail ? detail.reviewer : null)!;
const block = reviewer.sections[0]!.blocks[0]!;
const selection = selectAssistBlock(reviewer, 'section-1', 'block-1')!;

function nodes(type: string) { return rendered!.root.findAll(node => String(node.type) === type); }
function label(node: ReactTestInstance) { return node.findAll(child => String(child.type) === 'Copy').map(child => child.props.children).join(''); }
function pressables(role: string) { return nodes('Pressable').filter(node => node.props.accessibilityRole === role); }
function tab(name: string) { return pressables('tab').find(node => label(node) === name)!; }
function button(name: string) { return pressables('button').find(node => label(node) === name || node.props.accessibilityLabel?.startsWith(name)); }
function action(name: string) { return nodes('Action').find(node => node.props.children === name)!; }
function surface() { return nodes('TextInput').find(node => node.props.testID === 'smart-selection-surface'); }
function text() { return JSON.stringify(rendered!.toJSON()); }
function requests() { return network.mock.calls.map(call => (call[2] as { body: StudyToolRequest }).body); }
const ok = (data: Record<string, unknown>) => ({ outcome: 'answer', grounding: 'source', text: 'Generated.', createdAt: '2026-10-01T00:00:00Z', ...data });
/** Holds the surface, then reports the native range Android would for `phrase` (nothing selected when empty). */
async function select(phrase: string, value = studySurface(block)) {
  const start = phrase ? value.indexOf(phrase) : 0;
  await act(async () => surface()!.parent!.props.onTouchStart({ stopPropagation: vi.fn() }));
  await act(async () => surface()!.props.onSelectionChange({ nativeEvent: { selection: { start, end: start + phrase.length } } }));
}
/** Opens the sheet; by default the student then selects the explanation. */
async function open(target = { selection } as { selection: typeof selection; pointIndex?: number }, phrase: string | null = block.explanation) {
  await act(async () => { rendered = create(createElement(StudyAssistSheet, { target, onClose: vi.fn() })); });
  if (phrase) await select(phrase, studySurface(target.selection.block));
}
async function press(node: ReactTestInstance | undefined) {
  expect(node).toBeDefined();
  await act(async () => { node!.props.onPress(); });
  await act(async () => {});
}
const quoted = (phrase: string) => nodes('Copy').some(node => [node.props.children].flat().some((child: unknown) => typeof child === 'string' && child.includes(`“${phrase}”`)));

describe('Smart Selection learning sheet', () => {
  it('opens from the topic tap with nothing selected, showing whole-topic quick assists only', async () => {
    await act(async () => { rendered = create(createElement(ReviewerReaderScreen, { artifact: detail.artifact, reviewer, deviceCopy: false })); });
    const explanation = nodes('Text').find(node => node.props.children === block.explanation)!;
    await act(async () => explanation.props.onPress());
    expect(nodes('Sheet')).toHaveLength(1);
    const input = surface()!;
    expect(input.props.value).toBe(studySurface(block));
    expect(input.props.value).toContain(block.keyPoints[0]);
    // Selection never opens a keyboard and the text cannot be edited.
    expect(input.props.showSoftInputOnFocus).toBe(false);
    expect(input.props.caretHidden).toBe(true);
    expect(input.props.contextMenuHidden).toBeUndefined();
    expect(nodes('Copy').some(node => [node.props.children].flat().some((child: unknown) => typeof child === 'string' && child.startsWith('QUICK ASSISTS')))).toBe(true);
    expect(pressables('tab')).toHaveLength(0);
    expect(network).not.toHaveBeenCalled();
  });
  it('replaces the quick assists with the five selection actions while text is selected, and back when cleared', async () => {
    await open(undefined, null);
    await select('membrane controls');
    expect(pressables('tab').map(label)).toEqual(['Define', 'Explain', 'Example', 'Test Me', 'Ask']);
    expect(text()).not.toContain('QUICK ASSISTS');
    expect(quoted('membrane controls')).toBe(true);
    await select('');
    expect(pressables('tab')).toHaveLength(0);
    expect(text()).toContain('QUICK ASSISTS');
  });
  it('keeps selection drags from moving the sheet', async () => {
    await open();
    const wrapper = surface()!.parent!;
    const event = { stopPropagation: vi.fn() };
    for (const handler of ['onTouchStart', 'onTouchMove', 'onTouchEnd']) wrapper.props[handler](event);
    expect(event.stopPropagation).toHaveBeenCalledTimes(3);
  });
  it('follows the exact native range from a tapped key point and retains it in the action', async () => {
    await open({ selection, pointIndex: 0 }, null);
    await select('membrane controls');
    network.mockResolvedValue(ok({ action: 'define' }));
    await press(tab('Define'));
    expect(requests()[0]).toMatchObject({ action: 'define', selection: 'membrane controls', blockId: 'block-1', contentHash: selection.contentHash });
    expect(requests()[0]).not.toHaveProperty('modifier');
    // The selected range is retained once the action runs.
    expect(text()).toContain('“membrane controls”');
  });
  it('restores the previous range on Change selection, ignoring the collapsed cursor that focusing reports', async () => {
    await open();
    network.mockResolvedValue(ok({ action: 'explain' }));
    await press(tab('Explain'));
    await press(button('Change selection'));
    await act(async () => surface()!.props.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 0 } } }));
    expect(tab('Define').props.disabled).toBe(false);
    expect(quoted(block.explanation)).toBe(true);
  });
  it('blocks oversized selections before any request', async () => {
    const long: ReviewerReaderModel = { ...reviewer, sections: [{ ...reviewer.sections[0]!, blocks: [{ ...block, explanation: 'cells '.repeat(500).trim() }] }] };
    const longSelection = selectAssistBlock(long, 'section-1', 'block-1')!;
    await open({ selection: longSelection }, longSelection.block.explanation);
    expect(nodes('Notice').map(node => node.props.children)).toContain(STUDY_SELECTION_TOO_LARGE);
    expect(tab('Explain').props.disabled).toBe(true);
    expect(text()).not.toContain('QUICK ASSISTS');
    expect(network).not.toHaveBeenCalled();
  });
  it('renders a Define result with a tappable grounding badge, generating refinements only on tap', async () => {
    await open();
    network.mockResolvedValue(ok({ action: 'define', grounding: 'mixed', text: 'A barrier that controls entry.' }));
    await press(tab('Define'));
    expect(text()).toContain('A barrier that controls entry.');
    expect(text()).toContain('Source + general knowledge');
    expect(text()).not.toContain(STUDY_GROUNDING_DETAILS.mixed);
    await press(button('Source + general knowledge'));
    expect(text()).toContain(STUDY_GROUNDING_DETAILS.mixed);
    expect(network).toHaveBeenCalledTimes(1);
    for (const chip of ['Plain words', 'In context', 'Key traits', 'Compare']) expect(button(chip)).toBeDefined();
    network.mockResolvedValue(ok({ action: 'define', modifier: 'plain_words', grounding: 'general', text: 'It lets some things in.' }));
    await press(button('Plain words'));
    expect(requests()[1]).toMatchObject({ action: 'define', modifier: 'plain_words', previous: 'A barrier that controls entry.' });
    expect(text()).toContain('General knowledge');
  });
  it('shows Explain refinements and reuses a repeated refinement in the same session', async () => {
    await open();
    network.mockResolvedValueOnce(ok({ action: 'explain' }));
    await press(tab('Explain'));
    expect(['Simpler', 'Deeper', 'Analogy', 'Why it matters'].every(chip => button(chip))).toBe(true);
    network.mockResolvedValueOnce(ok({ action: 'explain', modifier: 'analogy', text: 'Like a door guard.' }));
    await press(button('Analogy'));
    network.mockResolvedValueOnce(ok({ action: 'explain', modifier: 'simpler', text: 'Simpler.' }));
    await press(button('Simpler'));
    await press(button('Analogy'));
    expect(text()).toContain('Like a door guard.');
    expect(requests().map(request => request.modifier ?? 'default')).toEqual(['default', 'analogy', 'simpler']);
  });
  it('shows Example refinements and always asks for a genuinely new Another', async () => {
    await open();
    network.mockResolvedValueOnce(ok({ action: 'example', text: 'First example.' }));
    await press(tab('Example'));
    expect(['Real world', 'Step-by-step', 'Another', 'Counterexample'].every(chip => button(chip))).toBe(true);
    network.mockResolvedValueOnce(ok({ action: 'example', modifier: 'another', text: 'Second example.' }));
    await press(button('Another'));
    network.mockResolvedValueOnce(ok({ action: 'example', modifier: 'another', text: 'Third example.' }));
    await press(button('Another'));
    expect(requests().slice(1).map(request => request.previous)).toEqual(['First example.', 'Second example.']);
  });
  it('runs Test Me as recall, checks the attempt, then offers source-only follow-ups', async () => {
    await open();
    network.mockResolvedValueOnce({ action: 'test', outcome: 'question', grounding: 'source', text: '', question: 'What controls entry to the cell?', createdAt: '2026-10-01T00:00:00Z' });
    await press(tab('Test Me'));
    expect(text()).toContain('What controls entry to the cell?');
    expect(action('Check Answer').props.disabled).toBe(true);
    expect(button('Harder')).toBeUndefined();
    const answer = nodes('TextInput').find(node => node.props.accessibilityLabel === 'Your answer')!;
    await act(async () => answer.props.onChangeText('the membrane'));
    network.mockResolvedValueOnce({ action: 'test', modifier: 'check', outcome: 'checked', grounding: 'source', verdict: 'correct', text: 'Yes, the membrane.', createdAt: '2026-10-01T00:00:00Z' });
    await press(action('Check Answer'));
    expect(requests()[1]).toMatchObject({ action: 'test', modifier: 'check', question: 'What controls entry to the cell?', answer: 'the membrane' });
    expect(text()).toContain('Correct');
    expect(['Another', 'Harder', 'Apply it', 'Explain answer'].every(chip => button(chip))).toBe(true);
    network.mockResolvedValueOnce({ action: 'test', modifier: 'harder', outcome: 'question', grounding: 'source', text: '', question: 'Why must it be selective?', createdAt: '2026-10-01T00:00:00Z' });
    await press(button('Harder'));
    expect(requests()[2]).toMatchObject({ modifier: 'harder', previous: 'What controls entry to the cell?' });
    expect(text()).toContain('Why must it be selective?');
    expect(text()).not.toContain('General knowledge');
  });
  it('shows the truthful insufficient state for Test Me', async () => {
    await open();
    network.mockResolvedValueOnce({ action: 'test', outcome: 'insufficient', grounding: 'source', text: 'There isn’t enough course material around this selection to create a reliable question.', createdAt: '2026-10-01T00:00:00Z' });
    await press(tab('Test Me'));
    expect(nodes('Notice').map(node => node.props.children).join()).toContain('enough course material');
  });
  it('limits Ask questions on the device and bounds the follow-up thread', async () => {
    await open();
    await press(tab('Ask'));
    expect(text()).toContain('Ask about this');
    const field = () => nodes('TextInput').find(node => String(node.props.accessibilityLabel).startsWith('Ask'))!;
    await act(async () => field().props.onChangeText('x'.repeat(STUDY_LIMITS.question + 1)));
    expect(text()).toContain(STUDY_QUESTION_TOO_LONG);
    expect(action('Ask').props.disabled).toBe(true);
    for (let turn = 0; turn < 3; turn++) {
      network.mockResolvedValueOnce(ok({ action: 'ask', text: `Answer ${turn}` }));
      await act(async () => field().props.onChangeText(`Question ${turn}?`));
      await press(action('Ask'));
    }
    expect(requests().map(request => request.followUps?.length ?? 0)).toEqual([0, 1, 2]);
    expect(field()).toBeUndefined();
    expect(action('New question')).toBeDefined();
  });
  it('explains that learning tools need a connection without implying the Reviewer is unavailable', async () => {
    await open();
    network.mockRejectedValueOnce(new ExperienceApiError('connection', 'Could not connect.', true));
    await press(tab('Explain'));
    expect(nodes('Notice').map(node => node.props.children)).toContain(STUDY_OFFLINE);
    expect(surface()).toBeUndefined();
    expect(text()).toContain(block.explanation);
  });
  it('maps auth, size and AI failures to distinct messages and never signs out', async () => {
    await open();
    network.mockRejectedValueOnce(new ExperienceApiError('server_error', 'x', true));
    await press(tab('Define'));
    expect(text()).toContain('temporarily unavailable');
    network.mockRejectedValueOnce(new ExperienceApiError('sign_in_required', 'x'));
    await press(tab('Explain'));
    expect(text()).toContain('Sign in again to use this learning tool');
    network.mockRejectedValueOnce(new ExperienceApiError('rate_limited', 'x', true));
    await press(tab('Example'));
    expect(text()).toContain('Wait a moment');
  });
  it('keeps quick assists hidden while an action is open and dismisses like any sheet', async () => {
    const onClose = vi.fn();
    await act(async () => { rendered = create(createElement(StudyAssistSheet, { target: { selection }, onClose })); });
    expect(text()).toContain('QUICK ASSISTS');
    await select(block.explanation);
    network.mockResolvedValueOnce(ok({ action: 'explain' }));
    await press(tab('Explain'));
    expect(text()).not.toContain('QUICK ASSISTS');
    await press(button('Change selection'));
    expect(surface()).toBeDefined();
    await act(async () => nodes('Sheet')[0]!.props.onClose());
    expect(onClose).toHaveBeenCalledOnce();
  });
});
