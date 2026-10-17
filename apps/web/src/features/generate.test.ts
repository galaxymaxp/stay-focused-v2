import { createElement, type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ api: vi.fn(), refresh: vi.fn(), phase: 'syncing' }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ api: mocks.api }) }));
vi.mock('next/link', () => ({ default: (props: ComponentProps<'a'>) => createElement('a', props) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({}), useSelectedLayoutSegment: () => null }));
vi.mock('../lib/hooks', () => ({
  useResource: () => ({ data: { items: [{ id: 'test', name: 'Test course', code: 'TEST', syncState: 'not_synced', period: 'current', materialCount: null, reviewerCount: null }] }, refresh: mocks.refresh }),
  useAction: () => ({ busy: false, message: null }),
}));
vi.mock('../lib/canvas-refresh', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/canvas-refresh')>(),
  useCanvasRefresh: () => ({ phase: mocks.phase, progress: { finished: 1, total: 4 }, sync: mocks.refresh }),
}));
vi.mock('../lib/canvas-refresh-core', () => ({ performCanvasRefresh: () => new Promise(() => undefined) }));
import { GenerateScreen } from './generate';
import { CanvasRefreshStatus } from '../lib/canvas-refresh';
let tree: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('document', new EventTarget());
  mocks.phase = 'syncing';
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
  expect(json.match(/Syncing with Canvas/g)).toHaveLength(1);
  expect(json).not.toContain('Syncing from Canvas');
  expect(json).not.toContain('Syncing…');
  expect(tree.root.findByProps({ 'aria-label': 'Sync Test course' }).props).toMatchObject({ disabled: true, 'aria-busy': true });
  expect(tree.root.findAllByType(CanvasRefreshStatus)).toHaveLength(1);
});
it('keeps local course sync feedback when the global refresh is idle', async () => {
  mocks.phase = 'idle';
  await sync();
  expect(JSON.stringify(tree.toJSON())).toContain('Syncing from Canvas');
});
