import type { CourseLearningWorkspace, CourseMaterials, GenerationView, LearningMaterial } from '@stay-focused/shared';
import { createElement, type ComponentProps } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  api: vi.fn(), push: vi.fn(), accepted: vi.fn(), generationKey: vi.fn(),
  readSnapshot: vi.fn(), listSnapshots: vi.fn(), writeSnapshot: vi.fn(),
  cancelFocus: vi.fn(), remakeFocus: vi.fn(), enabled: true, owner: 'owner',
}));
vi.mock('../components/providers', () => ({ useAuth: () => ({ api: mocks.api, session: { user: { id: mocks.owner } } }) }));
vi.mock('next/link', () => ({ default: (props: ComponentProps<'a'>) => createElement('a', props) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), useSelectedLayoutSegment: () => 'page:first' }));
vi.mock('../components/crumbs', () => ({ PageCrumb: () => null }));
vi.mock('./course-batch', () => ({ CourseBatchControls: () => null }));
vi.mock('../lib/canvas-refresh', () => ({ useCanvasRefresh: () => ({}), CanvasRefreshStatus: () => null }));
vi.mock('../lib/generation', () => ({
  get generationEnabled() { return mocks.enabled; },
  generationKey: mocks.generationKey,
}));
vi.mock('../lib/screen-snapshots', () => ({
  snapshotEpoch: () => 0, isScreenSnapshotPath: () => true,
  readScreenSnapshot: mocks.readSnapshot, listScreenSnapshots: mocks.listSnapshots,
  writeScreenSnapshot: mocks.writeSnapshot, removeScreenSnapshot: vi.fn(),
}));

import { CourseWorkspace, MaterialScreen } from './generate';

const reviewerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const replacementId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const coursePath = '/api/experience/courses/course';
const pagePath = `${coursePath}/materials?offset=100`;
const generationsPath = '/api/experience/generations';
function material(id: string, reviewerArtifactId: string | null): LearningMaterial {
  return {
    id, reviewerArtifactId, sourceId: id, courseId: 'course', title: `Material ${id}`,
    kind: 'page', readiness: 'ready', preparation: { status: 'ready', reasonCode: null },
    count: null, moduleTitle: 'Module one',
    generation: {
      reviewer: { status: 'available' },
      quiz: reviewerArtifactId ? { status: 'available' } : { status: 'unavailable', reasonCode: 'source_not_ready' },
      activityAssistance: { status: 'unavailable', reasonCode: 'not_implemented' },
    },
  };
}
let workspace: CourseLearningWorkspace;
let laterPage: CourseMaterials;
let tree: ReactTestRenderer | undefined;
let submission: GenerationView | Promise<GenerationView>;
let submissionError: Error | null;
const job: GenerationView = { id: 'job', state: 'queued', updatedAt: '2026-10-18T02:00:00Z', progress: null, artifactId: null, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enabled = true;
  mocks.owner = 'owner';
  mocks.generationKey.mockReturnValue({ key: 'idempotency-key', accepted: mocks.accepted });
  mocks.readSnapshot.mockResolvedValue(null);
  mocks.listSnapshots.mockResolvedValue([]);
  mocks.writeSnapshot.mockResolvedValue(undefined);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
  vi.stubGlobal('navigator', { onLine: true });
  workspace = {
    course: { id: 'course', name: 'Example course', code: 'TEST', status: null, materialCount: 2, reviewerCount: 1, lastActivityAt: null },
    materials: { items: [material('page:first', reviewerId), material('page:second', null)], nextOffset: null, totalKnown: 2 },
    capabilities: {
      reviewerGeneration: { status: 'available' }, quizGeneration: { status: 'available' },
      activityMaker: { status: 'available' }, planner: { status: 'available' }, calendar: { status: 'unavailable' },
    },
  };
  laterPage = { items: [material('page:later', reviewerId)], nextOffset: null, totalKnown: 101 };
  submission = job;
  submissionError = null;
  mocks.api.mockImplementation(async (path: string) => {
    if (path === coursePath) return workspace;
    if (path === pagePath) return laterPage;
    if (path === '/api/experience/quizzes') return { id: 'quiz-job' };
    if (path === generationsPath) {
      if (submissionError) throw submissionError;
      return submission;
    }
    throw new Error(`Unexpected mocked API path: ${path}`);
  });
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  vi.unstubAllGlobals();
});

function view(id = 'page:first') {
  const props: ComponentProps<typeof CourseWorkspace> = { courseId: 'course', children: createElement(MaterialScreen, { id }) };
  return createElement(CourseWorkspace, props);
}
async function mount(id = 'page:first') {
  await act(async () => {
    tree = create(view(id), { createNodeMock: element => {
      const props = element.props;
      const cancel = typeof props === 'object' && props !== null && 'children' in props && props.children === 'Cancel';
      return { focus: cancel ? mocks.cancelFocus : mocks.remakeFocus };
    } });
  });
}
function button(label: string) {
  const found = tree!.root.findAllByType('button').find(node => node.props.children === label);
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}
function text(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
}
function row(id: string) {
  return tree!.root.findAllByType('a').find(node => node.props.href === `/generate/course/${encodeURIComponent(id)}`)!;
}
function openReviewer() {
  return tree!.root.findAllByType('a').find(node => text(node) === 'Open reviewer');
}
function reviewerFact() {
  const facts = tree!.root.findByProps({ className: 'facts' }).children;
  const index = facts.findIndex(node => typeof node !== 'string' && text(node) === 'Reviewer');
  return text(facts[index + 1] as ReactTestInstance);
}
function posts() {
  return mocks.api.mock.calls.filter(([, options]) => options?.method === 'POST');
}
async function click(label: string) {
  await act(async () => { button(label).props.onClick(); });
}

it('adds exactly one ready label and accessible state only to rows with a saved Reviewer', async () => {
  await mount();
  const saved = row('page:first');
  const empty = row('page:second');
  expect(text(saved).match(/Reviewer ready/g)).toHaveLength(1);
  expect(saved.props['aria-label']).toBe('Open material: Material page:first, Reviewer ready');
  expect(text(empty)).not.toContain('Reviewer ready');
  expect(empty.props['aria-label']).not.toContain('Reviewer ready');
  expect(text(saved)).not.toMatch(/Generating|Failed/);
});

it('opens the encoded Library artifact, offers secondary Remake and reports Reviewer Ready', async () => {
  await mount();
  expect(openReviewer()?.props).toMatchObject({ href: `/library/artifact%3A${reviewerId}`, className: 'button primary' });
  expect(button('Remake').props.className).not.toBe('primary');
  expect(button('Remake').props['aria-expanded']).toBe(false);
  expect(reviewerFact()).toBe('Ready');
  expect(button('Generate Quiz').props.disabled).toBe(false);
  expect(tree!.root.findAllByType('button').some(node => node.props.children === 'Generate Reviewer')).toBe(false);
});

it('keeps direct Generate Reviewer and the existing Quiz availability without a saved Reviewer', async () => {
  await mount('page:second');
  expect(openReviewer()).toBeUndefined();
  expect(button('Generate Reviewer').props).toMatchObject({ className: 'primary', disabled: false });
  expect(button('Generate Quiz').props.disabled).toBe(true);
  expect(reviewerFact()).toBe('Available');
  await click('Generate Reviewer');
  expect(posts()).toEqual([[generationsPath, { method: 'POST', body: { courseId: 'course', materialId: 'page:second' }, key: 'idempotency-key' }]]);
  expect(mocks.push).toHaveBeenCalledWith('/generation/job');
});

it('requires the explicit inline confirmation and lets Cancel keep the current Reviewer', async () => {
  await mount();
  await click('Remake');
  const dialog = tree!.root.findByProps({ role: 'alertdialog' });
  expect(dialog.props['aria-label']).toBe('Remake Reviewer?');
  expect(text(dialog.findByType('p'))).toBe('Create a fresh version from this material? The current Reviewer stays available until the replacement finishes.');
  expect(dialog.props['aria-describedby']).toBe(dialog.findByType('p').props.id);
  expect(button('Remake').props['aria-controls']).toBe(dialog.props.id);
  expect(mocks.cancelFocus).toHaveBeenCalledOnce();
  expect(posts()).toHaveLength(0);
  await click('Cancel');
  expect(tree!.root.findAllByProps({ role: 'alertdialog' })).toHaveLength(0);
  expect(mocks.remakeFocus).toHaveBeenCalledOnce();
  expect(posts()).toHaveLength(0);
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${reviewerId}`);
});

it('dismisses confirmation on Escape and restores focus without posting', async () => {
  await mount();
  await click('Remake');
  const preventDefault = vi.fn();
  await act(async () => { tree!.root.findByProps({ role: 'alertdialog' }).props.onKeyDown({ key: 'Escape', preventDefault }); });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(mocks.remakeFocus).toHaveBeenCalledOnce();
  expect(tree!.root.findAllByProps({ role: 'alertdialog' })).toHaveLength(0);
  expect(posts()).toHaveLength(0);
});

it('submits a confirmed remake once, keeps the old link while busy, and refreshes after acceptance', async () => {
  let resolve!: (value: GenerationView) => void;
  submission = new Promise(done => { resolve = done; });
  await mount();
  await click('Remake');
  await act(async () => { const confirm = button('Remake Reviewer'); confirm.props.onClick(); confirm.props.onClick(); });
  expect(posts()).toEqual([[generationsPath, { method: 'POST', body: { courseId: 'course', materialId: 'page:first' }, key: 'idempotency-key' }]]);
  expect(button('Remake Reviewer').props.disabled).toBe(true);
  expect(button('Cancel').props.disabled).toBe(true);
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${reviewerId}`);
  expect(mocks.accepted).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  workspace = { ...workspace, materials: { ...workspace.materials, items: [material('page:first', replacementId)] } };
  await act(async () => { resolve(job); });
  expect(mocks.generationKey).toHaveBeenCalledWith('owner', 'reviewer', { courseId: 'course', materialId: 'page:first' });
  expect(mocks.accepted).toHaveBeenCalledOnce();
  expect(mocks.api.mock.calls.filter(([path]) => path === coursePath).length).toBeGreaterThan(1);
  expect(mocks.push).toHaveBeenCalledWith('/generation/job');
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${replacementId}`);
});

it('preserves the saved Reviewer and confirmation after a failed POST and supports retry', async () => {
  submissionError = new Error('Could not start this generation. Try again.');
  await mount();
  await click('Remake');
  await click('Remake Reviewer');
  expect(text(tree!.root.findByProps({ role: 'alert' }))).toBe('Could not start this generation. Try again.');
  expect(tree!.root.findAllByProps({ role: 'alertdialog' })).toHaveLength(1);
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${reviewerId}`);
  expect(button('Remake Reviewer').props.disabled).toBe(false);
  expect(mocks.accepted).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  submissionError = null;
  await click('Remake Reviewer');
  expect(posts()).toHaveLength(2);
  expect(mocks.accepted).toHaveBeenCalledOnce();
});

it('discards confirmation when switching materials or accounts', async () => {
  await mount();
  await click('Remake');
  await act(async () => { tree!.update(view('page:second')); });
  expect(tree!.root.findAllByProps({ role: 'alertdialog' })).toHaveLength(0);
  await act(async () => { tree!.update(view()); });
  expect(tree!.root.findAllByProps({ role: 'alertdialog' })).toHaveLength(0);
  await click('Remake');
  mocks.owner = 'another-owner';
  await act(async () => { tree!.update(view()); });
  expect(tree!.root.findAllByProps({ role: 'alertdialog' })).toHaveLength(0);
  expect(posts()).toHaveLength(0);
});

it('refreshes both the row and selected detail on focus without a full reload', async () => {
  workspace = { ...workspace, materials: { ...workspace.materials, items: [material('page:first', null)] } };
  await mount();
  expect(text(row('page:first'))).not.toContain('Reviewer ready');
  expect(openReviewer()).toBeUndefined();
  workspace = { ...workspace, materials: { ...workspace.materials, items: [material('page:first', reviewerId)] } };
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(text(row('page:first'))).toContain('Reviewer ready');
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${reviewerId}`);
  expect(reviewerFact()).toBe('Ready');
});

it('revalidates cached later-page rows and deep-linked detail using the original offset', async () => {
  workspace = { ...workspace, materials: { ...workspace.materials, nextOffset: 100 } };
  mocks.listSnapshots.mockResolvedValue([{ key: `data:${pagePath}`, data: laterPage, savedAt: '2026-10-17T00:00:00Z' }]);
  await mount('page:later');
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${reviewerId}`);
  laterPage = { ...laterPage, items: [material('page:later', replacementId)] };
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(mocks.api).toHaveBeenCalledWith(pagePath, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(text(row('page:later')).match(/Reviewer ready/g)).toHaveLength(1);
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${replacementId}`);
});

it('fetches new saved state when returning from generation even with an older course snapshot', async () => {
  workspace = { ...workspace, materials: { ...workspace.materials, items: [material('page:first', null)] } };
  await mount();
  const oldWorkspace = workspace;
  await act(async () => { tree!.unmount(); });
  tree = undefined;
  mocks.readSnapshot.mockResolvedValue({ data: oldWorkspace, savedAt: '2026-10-17T00:00:00Z' });
  workspace = { ...workspace, materials: { ...workspace.materials, items: [material('page:first', reviewerId)] } };
  await mount();
  expect(text(row('page:first'))).toContain('Reviewer ready');
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${reviewerId}`);
  expect(mocks.api.mock.calls.filter(([path]) => path === coursePath)).toHaveLength(2);
});

it('keeps saved reading available when generation is disabled', async () => {
  mocks.enabled = false;
  await mount();
  expect(openReviewer()?.props.href).toBe(`/library/artifact%3A${reviewerId}`);
  expect(button('Remake').props.disabled).toBe(true);
  expect(button('Generate Quiz').props.disabled).toBe(true);
  expect(reviewerFact()).toBe('Ready');
});

it('preserves the existing material Quiz setup and submission when a Reviewer exists', async () => {
  await mount();
  await click('Generate Quiz');
  const quizButtons = tree!.root.findAllByType('button').filter(node => node.props.children === 'Generate Quiz');
  await act(async () => { quizButtons[quizButtons.length - 1]!.props.onClick(); });
  expect(posts()).toEqual([['/api/experience/quizzes', {
    method: 'POST', key: 'idempotency-key',
    body: { sourceType: 'material', sourceIds: ['page:first'], questionCount: 5, difficulty: 'mixed', questionTypes: ['single_select', 'true_false'] },
  }]]);
  expect(mocks.push).toHaveBeenCalledWith('/generation/quiz-job');
  expect(tree!.root.findAllByProps({ role: 'alertdialog' })).toHaveLength(0);
});
