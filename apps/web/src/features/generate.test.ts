import { createElement, type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { GenerateCourseSummary } from '@stay-focused/shared';
import type { RefreshPhase } from '../lib/canvas-refresh-core';
const mocks = vi.hoisted(() => ({
  api: vi.fn(), refresh: vi.fn(), phase: 'syncing',
  items: [] as GenerateCourseSummary[], refreshing: false,
  error: null as string | null, savedAt: null as string | null,
}));
vi.mock('../components/providers', () => ({ useAuth: () => ({ api: mocks.api }) }));
vi.mock('next/link', () => ({ default: (props: ComponentProps<'a'>) => createElement('a', props) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({}), useSelectedLayoutSegment: () => null }));
vi.mock('../lib/hooks', () => ({
  useResource: () => ({ data: { items: mocks.items }, refresh: mocks.refresh,
    refreshing: mocks.refreshing, error: mocks.error, savedAt: mocks.savedAt }),
  useAction: () => ({ busy: false, message: null }),
}));
vi.mock('../lib/canvas-refresh', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/canvas-refresh')>(),
  useCanvasRefresh: () => ({ phase: mocks.phase, progress: { finished: 1, total: 4 }, sync: mocks.refresh }),
}));
vi.mock('../lib/canvas-refresh-core', () => ({ performCanvasRefresh: () => new Promise(() => undefined) }));
import { GenerateScreen, selectGenerateSyncStatus } from './generate';
import { State } from '../components/ui';
import { SnapshotStatus } from '../components/snapshot-status';
let tree: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('document', new EventTarget());
  mocks.phase = 'syncing';
  mocks.refreshing = false;
  mocks.error = null;
  mocks.savedAt = null;
  mocks.items = [{ id: 'test', name: 'Test course', code: 'TEST', syncState: 'not_synced', period: 'current',
    status: null, lastActivityAt: null, materialCount: null, reviewerCount: null,
    termName: null, lastSuccessfulSyncAt: null }];
  mocks.api.mockResolvedValue({ selectedCourseIds: ['test'] });
});
afterEach(async () => { await act(async () => tree?.unmount()); vi.unstubAllGlobals(); });
async function sync() {
  await act(async () => { tree = create(createElement(GenerateScreen)); });
  await act(async () => tree.root.findByProps({ className: 'subtle unsynced-toggle' }).props.onClick());
  await act(async () => tree.root.findByProps({ 'aria-label': 'Sync Test course' }).props.onClick());
}
it('shows global sync progress once with a disabled busy course button', async () => {
  await sync();
  const json = JSON.stringify(tree.toJSON());
  expect(json.match(/Syncing…/g)).toHaveLength(1);
  expect(json).not.toContain('Syncing from Canvas');
  expect(tree.root.findByProps({ 'aria-label': 'Sync Test course' }).props).toMatchObject({ disabled: true, 'aria-busy': true });
  expect(tree.root.findAllByType(SnapshotStatus)).toHaveLength(0);
  expect(tree.root.findAllByProps({ className: 'canvas-refresh syncing' })).toHaveLength(1);
});
it('keeps local course sync feedback when the global refresh is idle', async () => {
  mocks.phase = 'idle';
  await sync();
  expect(JSON.stringify(tree.toJSON())).toContain('Syncing from Canvas');
});

const savedAt = '2026-10-18T00:00:00Z';
const now = Date.parse('2026-10-18T00:02:00Z');
it.each<{
  phase: RefreshPhase; refreshing?: boolean; error?: string; savedAt?: string;
  expectedPhase: string; label: string;
}>([
  { phase: 'idle', expectedPhase: 'idle', label: 'Canvas' },
  { phase: 'syncing', expectedPhase: 'syncing', label: 'Syncing…' },
  { phase: 'idle', refreshing: true, expectedPhase: 'syncing', label: 'Syncing…' },
  { phase: 'failed', refreshing: true, error: 'offline', savedAt, expectedPhase: 'syncing', label: 'Syncing…' },
  { phase: 'syncing', error: 'offline', savedAt, expectedPhase: 'syncing', label: 'Syncing…' },
  { phase: 'failed', savedAt, expectedPhase: 'failed', label: 'Canvas sync didn’t finish' },
  { phase: 'partial', savedAt, expectedPhase: 'failed', label: 'Canvas sync didn’t finish' },
  { phase: 'synced', error: 'offline', savedAt, expectedPhase: 'failed', label: 'Canvas sync didn’t finish' },
  { phase: 'idle', savedAt, expectedPhase: 'updated', label: 'Updated 2m ago' },
  { phase: 'synced', savedAt, expectedPhase: 'updated', label: 'Updated 2m ago' },
  { phase: 'synced', expectedPhase: 'updated', label: 'Up to date with Canvas' },
  { phase: 'not_connected', savedAt, expectedPhase: 'not_connected', label: 'Connect Canvas to sync courses' },
  { phase: 'unconfirmed', savedAt, expectedPhase: 'unconfirmed', label: 'Sync status unavailable. Accepted jobs may still be running.' },
])('selects $expectedPhase for Canvas=$phase refreshing=$refreshing error=$error', ({ phase, expectedPhase, label, ...resource }) => {
  expect(selectGenerateSyncStatus(phase, resource, now)).toEqual({ phase: expectedPhase, label });
});

it('renders only syncing when a failed Canvas run and a course refresh coincide', async () => {
  mocks.phase = 'failed'; mocks.refreshing = true; mocks.error = 'offline'; mocks.savedAt = savedAt;
  await act(async () => { tree = create(createElement(GenerateScreen)); });
  const json = JSON.stringify(tree.toJSON());
  expect(json.match(/Syncing…/g)).toHaveLength(1);
  expect(json).not.toContain('Canvas sync didn’t finish');
  expect(json).not.toContain('Sync now');
  expect(tree.root.findAllByType(SnapshotStatus)).toHaveLength(0);
});

it('orders current courses before own material and both collapsed sections; search retains own material', async () => {
  const base = mocks.items[0]!;
  mocks.items.push({ ...base, id: 'current', name: 'Current course', syncState: 'synced' },
    { ...base, id: 'past', name: 'Past course', courseState: 'past' });
  await act(async () => { tree = create(createElement(GenerateScreen)); });
  const json = JSON.stringify(tree.toJSON());
  expect(json.indexOf('Current course')).toBeLessThan(json.indexOf('Your own material'));
  expect(json.indexOf('Your own material')).toBeLessThan(json.indexOf('Not synced'));
  expect(json.indexOf('Not synced')).toBeLessThan(json.indexOf('Past courses'));
  expect(tree.root.findByProps({ className: 'subtle unsynced-toggle' }).props['aria-expanded']).toBe(false);
  const past = tree.root.findAllByType('button').find(node => Array.isArray(node.props.children)
    && node.props.children.some((child: unknown) => typeof child === 'string' && child.startsWith('Past courses')))!;
  expect(past.props['aria-expanded']).toBe(false);
  await act(async () => tree.root.findByProps({ type: 'search' }).props.onChange({ target: { value: 'missing' } }));
  expect(JSON.stringify(tree.toJSON())).toContain('Your own material');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Current course');
});

it('State status opt-out preserves default snapshots and initial error recovery', async () => {
  const refresh = vi.fn();
  const resource = { loading: false, error: null, data: {}, savedAt, refresh };
  await act(async () => { tree = create(createElement(State, { resource })); });
  expect(tree.root.findAllByType(SnapshotStatus)).toHaveLength(1);
  await act(async () => tree.update(createElement(State, { resource, status: false })));
  expect(tree.toJSON()).toBe(null);
  await act(async () => tree.update(createElement(State, { resource: { ...resource, data: null, error: 'Could not load courses.' }, status: false })));
  expect(tree.root.findByProps({ role: 'alert' }).props.children).toBe('Could not load courses.');
  await act(async () => tree.root.findByType('button').props.onClick());
  expect(refresh).toHaveBeenCalledOnce();
});

it('keeps narrow Generate search visible while focused or containing raw text', async () => {
  const phone = Object.assign(new EventTarget(), { matches: true });
  const motion = Object.assign(new EventTarget(), { matches: false });
  const browser = Object.assign(new EventTarget(), { scrollY: 0,
    matchMedia: (query: string) => query.includes('760px') ? phone : motion });
  vi.stubGlobal('window', browser);
  await act(async () => { tree = create(createElement(GenerateScreen)); });
  const search = () => tree.root.findByProps({ type: 'search' });
  const header = () => tree.root.findByProps({ className: 'grow generate-course-search' });
  const scroll = async () => { await act(async () => {
    browser.scrollY += 100; browser.dispatchEvent(new Event('scroll'));
  }); };
  await scroll();
  expect(header().props).toMatchObject({ inert: true, 'aria-hidden': true });
  await act(async () => search().props.onFocus()); await scroll();
  expect(header().props.inert).toBe(false);
  await act(async () => search().props.onBlur()); await scroll();
  expect(header().props.inert).toBe(true);
  for (const value of ['course', ' ']) {
    await act(async () => search().props.onChange({ target: { value } })); await scroll();
    expect(header().props.inert).toBe(false);
    expect(header().props['aria-hidden']).toBeUndefined();
  }
  await act(async () => search().props.onFocus());
  await act(async () => search().props.onChange({ target: { value: '' } })); await scroll();
  expect(header().props.inert).toBe(false);
  await act(async () => search().props.onBlur()); await scroll();
  expect(header().props.inert).toBe(true);
});
