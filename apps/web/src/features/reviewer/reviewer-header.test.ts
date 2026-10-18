import { createElement, type ComponentProps, type ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LibraryArtifactSummary, ReviewerReaderModel } from '@stay-focused/shared';
import { ReviewerHeader } from './reviewer-header';
const mocks = vi.hoisted(() => ({ api: vi.fn(), save: vi.fn(), quiz: vi.fn(), focus: vi.fn(), firstFocus: vi.fn() }));
vi.mock('../../components/providers', () => ({ useAuth: () => ({ api: mocks.api, session: { user: { id: 'owner' } } }) }));
vi.mock('../../components/ui', () => ({
  Icon: 'Icon',
  Heading: ({ title, subtitle, action }: { title: string; subtitle: string; action: ReactNode }) => createElement('header', {}, createElement('h1', {}, title), createElement('p', {}, subtitle), action),
}));
const reviewer: ReviewerReaderModel = { id: 'artifact:one', title: 'Cells', course: { id: 'course', name: 'Biology', code: 'BIO' }, source: { id: 'source', title: 'Lecture' }, generatedAt: '2026-10-15T00:00:00Z', freshness: 'current', reviewMinutes: 7,
  sections: [{ id: 's', title: 'Structure', blocks: [] }, { id: 's2', title: 'Membrane', blocks: [] }] };
const artifact: LibraryArtifactSummary = { id: reviewer.id, title: reviewer.title, type: 'reviewer', course: reviewer.course, sourceId: 'source', sourceTitle: 'Lecture', activityId: null,
  createdAt: reviewer.generatedAt, updatedAt: reviewer.generatedAt, lastOpenedAt: null, status: 'completed', relatedArtifactIds: [] };
const props = { artifact, reviewer, onSave: mocks.save, onQuiz: mocks.quiz, quizDisabled: false };
let tree: ReactTestRenderer | undefined;
let listeners: Map<string, (event: unknown) => void>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks();
  listeners = new Map();
  vi.stubGlobal('document', { addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener), removeEventListener: (type: string) => listeners.delete(type) });
  vi.stubGlobal('localStorage', { getItem: () => null });
  mocks.api.mockResolvedValue({ token: 'a'.repeat(64), updatedAt: '' });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
async function mount(overrides: Partial<ComponentProps<typeof ReviewerHeader>> = {}) {
  await act(async () => { tree = create(createElement(ReviewerHeader, { ...props, ...overrides }), { createNodeMock: element => {
    const nodeProps = element.props as Record<string, unknown>;
    if (element.type === 'button' && nodeProps['aria-label'] === 'Reviewer actions') return { focus: mocks.focus };
    if (element.type === 'div' && nodeProps.role === 'menu') return { querySelector: () => ({ focus: mocks.firstFocus }) };
    if (element.type === 'div' && nodeProps.className === 'reviewer-actions') return { contains: () => false };
    return null;
  } }); });
}
const trigger = () => tree!.root.findAllByType('button').find(node => node.props['aria-label'] === 'Reviewer actions')!;
const items = () => tree!.root.findAllByType('button').filter(node => node.props.role === 'menuitem');
const menu = () => tree!.root.findAllByType('div').find(node => node.props.role === 'menu');
const open = async () => act(async () => trigger().props.onClick());
it('offers Share and Save to file in the menu, and keeps Generate Quiz visible', async () => {
  await mount(); expect(trigger().props['aria-haspopup']).toBe('menu'); expect(trigger().props['aria-expanded']).toBe(false);
  expect(items()).toHaveLength(0); expect(mocks.api).not.toHaveBeenCalled();
  await open(); expect(trigger().props['aria-expanded']).toBe(true);
  expect(items().map(item => item.props.children[1])).toEqual(['Share', 'Save to file']); expect(mocks.firstFocus).toHaveBeenCalledOnce();
  await act(async () => items()[1]!.props.onClick()); expect(mocks.save).toHaveBeenCalledOnce(); expect(items()).toHaveLength(0);
  const quiz = tree!.root.findAllByType('button').find(node => node.props.children === 'Generate Quiz')!;
  await act(async () => quiz.props.onClick()); expect(mocks.quiz).toHaveBeenCalledOnce();
});
it('opens the existing Share interface using its unchanged request', async () => {
  await mount(); await open(); await act(async () => items()[0]!.props.onClick());
  expect(items()).toHaveLength(0);
  expect(mocks.api).toHaveBeenCalledWith('/api/experience/shares/one', { method: 'POST', body: { assists: [] } });
  expect(tree!.root.findAllByType('div').some(node => node.props['aria-label'] === 'Share Reviewer')).toBe(true);
});
it('omits Share for non-artifact ids', async () => {
  await mount({ artifact: { ...artifact, id: 'local:one' } }); await open();
  expect(items().map(item => item.props.children[1])).toEqual(['Save to file']);
});
it('handles Escape with focus restoration, outside taps and Tab leaving the menu', async () => {
  await mount(); await open();
  const preventDefault = vi.fn();
  await act(async () => listeners.get('keydown')!({ key: 'Escape', preventDefault }));
  expect(preventDefault).toHaveBeenCalledOnce(); expect(mocks.focus).toHaveBeenCalledOnce(); expect(menu()).toBeUndefined();
  await open(); await act(async () => listeners.get('mousedown')!({ target: {} })); expect(menu()).toBeUndefined();
  await open(); await act(async () => tree!.root.findAllByType('div').find(node => node.props.className === 'reviewer-actions')!.props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: {} }));
  expect(menu()).toBeUndefined(); expect(listeners.size).toBe(0);
});
it('supports arrow/Home/End navigation and opening from ArrowDown', async () => {
  await mount(); const preventDefault = vi.fn();
  await act(async () => trigger().props.onKeyDown({ key: 'ArrowDown', preventDefault }));
  const first = { focus: vi.fn() }, last = { focus: vi.fn() };
  const currentTarget = { querySelectorAll: () => [first, last] };
  Object.assign(document, { activeElement: first });
  for (const key of ['ArrowDown', 'End']) await act(async () => menu()!.props.onKeyDown({ key, currentTarget, preventDefault }));
  expect(last.focus).toHaveBeenCalledTimes(2);
  Object.assign(document, { activeElement: last });
  for (const key of ['ArrowUp', 'Home']) await act(async () => menu()!.props.onKeyDown({ key, currentTarget, preventDefault }));
  expect(first.focus).toHaveBeenCalledTimes(2);
});
it.each([
  [7, 1, ['~7 min review']],
  [undefined, 2, ['2 topics']],
  [7, 2, ['~7 min review', '2 topics']],
] as const)('groups compact meta (%s, %s) and keeps only course/date in the subtitle', async (reviewMinutes, topics, expected) => {
  await mount({ reviewer: { ...reviewer, reviewMinutes, sections: reviewer.sections.slice(0, topics) } });
  const meta = tree!.root.findAllByType('div').find(node => node.props.className === 'meta reviewer-meta')!;
  expect(meta.findAllByType('span').map(node => node.props.children)).toEqual(expected);
  const subtitle = tree!.root.findByType('header').findByType('p').props.children;
  expect(subtitle).toContain('Biology'); expect(subtitle).not.toContain('topics'); expect(subtitle).not.toContain('min review');
});
it('omits empty meta and preserves the generation-disabled state', async () => {
  await mount({ reviewer: { ...reviewer, reviewMinutes: undefined, sections: reviewer.sections.slice(0, 1) }, quizDisabled: true });
  expect(tree!.root.findAllByType('div').some(node => node.props.className === 'meta reviewer-meta')).toBe(false);
  expect(tree!.root.findAllByType('button').find(node => node.props.children === 'Generate Quiz')!.props.disabled).toBe(true);
});
