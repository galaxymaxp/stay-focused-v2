import { createElement, type ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { selectAssistBlock, type StudyToolResult } from '@stay-focused/shared';
import { reviewerDetail } from '../../services/localLibrary/localLibrary.testSupport';

const mocks = vi.hoisted(() => ({ run: vi.fn(), request: vi.fn(), reduced: false, scrollTo: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable', TextInput: 'TextInput', ActivityIndicator: 'Spinner', useWindowDimensions: () => ({ height: 800 }) }));
vi.mock('../../design/primitives', async () => {
  const { createElement } = await import('react');
  return { Copy: 'Copy', Notice: 'Notice', SkeletonBlock: 'Skeleton', Action: 'Action', Sheet: (props: { scrollRef: { current: unknown }; children: ReactNode }) => {
    props.scrollRef.current = { scrollTo: mocks.scrollTo }; return createElement('Sheet', props, props.children);
  } };
});
vi.mock('lucide-react-native', () => ({ AlignLeft: 'Icon', ArrowLeftRight: 'Icon', Check: 'Icon', FlaskConical: 'Icon', Lightbulb: 'Icon', RotateCcw: 'Icon' }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ colors: {}, reducedMotion: mocks.reduced }) }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner' }, accessToken: 'synthetic' } }) }));
vi.mock('../../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://example.test' }));
vi.mock('../../design/haptics', () => ({ haptic: { tap: vi.fn(), select: vi.fn(), success: vi.fn() } }));
vi.mock('../../services/studyTools', () => ({ createStudyToolsSession: () => ({ run: mocks.run }), StudyToolsError: class extends Error {} }));
vi.mock('../../services/studyAssist', () => ({ studyAssist: { request: mocks.request, peek: vi.fn(async () => null) }, StudyAssistError: class extends Error {} }));
const { StudyAssistSheet } = await import('./StudyAssistSheet');
const { assistStore } = await import('./assistStore');
const { StudyText } = await import('./StudyText');
let tree: ReactTestRenderer | undefined, frames: FrameRequestCallback[];
const detail = reviewerDetail(), reviewer = ('reviewer' in detail ? detail.reviewer : null)!;
const selection = selectAssistBlock(reviewer, reviewer.sections[0]!.id, reviewer.sections[0]!.blocks[0]!.id)!;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.reduced = false; mocks.run.mockReset(); mocks.request.mockReset(); mocks.scrollTo.mockReset(); frames = [];
  vi.stubGlobal('requestAnimationFrame', (work: FrameRequestCallback) => { frames.push(work); return frames.length; });
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; assistStore.reset(); vi.unstubAllGlobals(); });
async function mount() {
  await act(async () => { tree = create(createElement(StudyAssistSheet, { target: { selection }, onClose: vi.fn() }), {
    createNodeMock: () => ({ measureLayout: (_root: unknown, success: (x: number, y: number) => void) => success(0, 140) }),
  }); });
}
function flush() { frames.splice(0).forEach(work => work(0)); }
function action(label: string) { return tree!.root.findAllByType('Action' as never).find(n => n.props.children === label)!; }
function chip(label: string) { return tree!.root.findAllByType('Pressable' as never).find(n => n.findAllByType('Copy' as never).some(c => c.props.children === label))!; }
function manual() { tree!.root.findByType('Sheet' as never).props.onScrollBeginDrag(); }
function toolDeferred() {
  let resolve!: (result: StudyToolResult) => void;
  mocks.run.mockReturnValue(new Promise<StudyToolResult>(done => { resolve = done; }));
  return async () => { const request = mocks.run.mock.calls.at(-1)![1]; await act(async () => resolve({ action: request.action, ...(request.modifier ? { modifier: request.modifier } : {}), outcome: request.action === 'test' && (!request.modifier || request.modifier === 'choices') ? 'question' : request.modifier === 'check' ? 'checked' : 'answer', ...(request.action === 'test' ? { question: 'What does it contain?' } : {}), ...(request.modifier === 'choices' ? { choices: ['DNA', 'Water', 'Air'] } : {}), ...(request.modifier === 'check' ? { verdict: 'correct' as const } : {}), grounding: 'source', text: 'Lead\n- **Term** matters.', createdAt: '2026-10-16T00:00:00Z' })); };
}
async function select() {
  const input = tree!.root.findByProps({ testID: 'smart-selection-surface' });
  await act(async () => input.props.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 5 } } }));
}
it.each([false, true])('reveals quick loading/completion with reduced motion=%s', async reduced => {
  mocks.reduced = reduced; let resolve!: (value: { text: string }) => void;
  mocks.request.mockReturnValue(new Promise(done => { resolve = done; })); await mount();
  await act(async () => tree!.root.findAllByType('Pressable' as never).find(n => String(n.props.accessibilityLabel).startsWith('Summarize,'))!.props.onPress()); flush();
  expect(JSON.stringify(tree!.toJSON())).toContain('Creating your'); expect(mocks.scrollTo).toHaveBeenLastCalledWith({ y: 140, animated: !reduced });
  await act(async () => resolve({ text: 'Lead\n- **Term**' })); flush(); expect(mocks.scrollTo).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(tree!.toJSON())).not.toContain('**Term**');
});
it.each([false, true])('reveals selected answers on press/completion, manual scroll=%s', async moved => {
  const finish = toolDeferred(); await mount(); await select();
  await act(async () => tree!.root.findAllByType('Pressable' as never).find(n => n.props.accessibilityRole === 'tab' && n.findAllByType('Copy' as never).some(c => c.props.children === 'Explain'))!.props.onPress()); flush();
  expect(mocks.scrollTo).toHaveBeenCalledOnce(); if (moved) manual(); await finish(); flush();
  expect(mocks.scrollTo).toHaveBeenCalledTimes(moved ? 1 : 2);
});
it('Ask shows What is this? first, and chips/follow-ups reveal their own answers', async () => {
  await mount(); await act(async () => action('Ask about this concept or key point').props.onPress()); flush(); mocks.scrollTo.mockClear();
  const suggestions = tree!.root.findAllByType('Pressable' as never).filter(n => n.props.accessibilityState?.selected === false && n.props.accessibilityRole === 'button');
  expect(suggestions[0]!.findByType('Copy' as never).props.children).toBe('What is this?');
  const finish = toolDeferred(); await act(async () => chip('What is this?').props.onPress()); flush(); await finish(); flush();
  expect(mocks.run.mock.calls.at(-1)![1].question).toBe('What is this?'); expect(mocks.scrollTo).toHaveBeenCalledTimes(2);
  const next = toolDeferred(); await act(async () => tree!.root.findByProps({ accessibilityLabel: 'Ask a follow-up' }).props.onChangeText('Why?'));
  await act(async () => action('Ask').props.onPress()); flush(); await next(); flush(); expect(mocks.scrollTo).toHaveBeenCalledTimes(4);
});
it('renders old text and structured answers through Copy with no raw markup', async () => {
  await act(async () => { tree = create(createElement(StudyText, { text: 'Old text\n\nLead\n- **Term**\n1. Step\n<img src=x>' })); });
  const output = JSON.stringify(tree!.toJSON()); expect(output).toContain('Old text'); expect(output).toContain('<img src=x>');
  expect(output).not.toContain('**Term**'); expect(output).toContain('700'); expect(output).toContain('1.');
});
it('refinements reveal on press and completion with Reduce Motion', async () => {
  const first = toolDeferred(); await mount(); await select();
  await act(async () => tree!.root.findAllByType('Pressable' as never).find(n => n.props.accessibilityRole === 'tab' && n.findAllByType('Copy' as never).some(c => c.props.children === 'Explain'))!.props.onPress()); flush(); await first(); flush();
  mocks.reduced = true; await act(async () => tree!.update(createElement(StudyAssistSheet, { target: { selection }, onClose: vi.fn() })));
  const next = toolDeferred(); await act(async () => chip('Simpler').props.onPress()); flush(); await next(); flush();
  expect(mocks.scrollTo).toHaveBeenCalledTimes(4); expect(mocks.scrollTo).toHaveBeenLastCalledWith({ y: 140, animated: false });
});
it('quick completion does not move a manually scrolled sheet', async () => {
  let resolve!: (value: { text: string }) => void; mocks.request.mockReturnValue(new Promise(done => { resolve = done; })); await mount();
  await act(async () => tree!.root.findAllByType('Pressable' as never).find(n => String(n.props.accessibilityLabel).startsWith('Analogy,'))!.props.onPress()); flush(); manual();
  await act(async () => resolve({ text: 'Like a library.' })); flush(); expect(mocks.scrollTo).toHaveBeenCalledOnce();
});
it('Test Me reveals each question, choices, feedback and explanation without changing their structure', async () => {
  const question = toolDeferred(); await mount(); await select();
  await act(async () => tree!.root.findAllByType('Pressable' as never).find(n => n.props.accessibilityRole === 'tab' && n.findAllByType('Copy' as never).some(c => c.props.children === 'Test Me'))!.props.onPress()); flush(); await question(); flush();
  expect(mocks.scrollTo).toHaveBeenCalledTimes(2);
  const choices = toolDeferred(); await act(async () => chip('Need choices?').props.onPress()); flush(); await choices(); flush();
  expect(mocks.scrollTo).toHaveBeenCalledTimes(4);
  await act(async () => tree!.root.findAllByType('Pressable' as never).find(n => n.props.accessibilityRole === 'radio')!.props.onPress());
  const checked = toolDeferred(); await act(async () => action('Check Answer').props.onPress()); flush(); await checked(); flush();
  expect(mocks.scrollTo).toHaveBeenCalledTimes(6);
  const explanation = toolDeferred(); await act(async () => chip('Explain answer').props.onPress()); flush(); await explanation(); flush();
  expect(mocks.scrollTo).toHaveBeenCalledTimes(8);
});
