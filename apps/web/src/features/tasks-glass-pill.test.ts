import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivityDetail } from '@stay-focused/shared';
import { TaskDetailScreen } from './tasks';
const mocks = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn(), accepted: vi.fn(), enabled: true, allowed: true }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ api: mocks.api, session: { user: { id: 'owner' } } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('../lib/canvas-refresh', () => ({ CanvasRefreshStatus: () => null, useCanvasRefresh: () => ({}) }));
vi.mock('../lib/generation', () => ({ get generationEnabled() { return mocks.enabled; }, generationKey: () => ({ key: 'draft-key', accepted: mocks.accepted }) }));
vi.mock('../lib/hooks', async original => ({ ...await original<typeof import('../lib/hooks')>(), useResource: (path: string | null) => ({ data: path?.startsWith('/api/experience/activities/') ? {
  id: 'canvas:task', title: 'Synthetic task', taskId: null, course: null, source: 'canvas', priority: 'medium', status: 'pending',
  dueAt: null, estimatedMinutes: 30, estimateSource: null, submissionTypes: [], isOverdue: false, urgency: 'later', hasGeneratedDraft: false,
  instructions: 'Synthetic instructions', resources: [], attachments: [], courseMaterials: null, outputs: [],
  generation: { reviewer: { status: 'unavailable' }, quiz: { status: 'unavailable' }, activityAssistance: mocks.allowed ? { status: 'available' } : { status: 'unavailable' } },
} satisfies ActivityDetail : null, loading: false, error: null, refresh: vi.fn() }) }));
let tree: ReactTestRenderer | undefined;
beforeEach(() => { vi.clearAllMocks(); mocks.enabled = true; mocks.allowed = true; vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('window', new EventTarget()); });
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
it('replaces the draft primary action, displays busy and preserves the existing idempotent handler', async () => {
  let resolve!: (value: { id: string }) => void;
  mocks.api.mockReturnValue(new Promise(done => { resolve = done; }));
  await act(async () => { tree = create(createElement(TaskDetailScreen, { id: 'canvas:task' })); });
  const pills = () => tree!.root.findAllByType('button').filter(node => node.props.className === 'glass-pill glass-pill-md');
  expect(pills()).toHaveLength(1); expect(pills()[0]!.props['aria-label']).toBe('Create draft');
  await act(async () => { pills()[0]!.props.onClick(); pills()[0]!.props.onClick(); });
  expect(pills()).toHaveLength(1); expect(pills()[0]!.props).toMatchObject({ 'aria-label': 'Creating draft', 'aria-busy': true, disabled: true });
  expect(mocks.api).toHaveBeenCalledExactlyOnceWith('/api/experience/activities/canvas%3Atask/generate', { method: 'POST', body: { mode: 'draft' }, key: 'draft-key' });
  await act(async () => resolve({ id: 'draft-job' }));
  expect(mocks.accepted).toHaveBeenCalledOnce(); expect(mocks.push).toHaveBeenCalledWith('/generation/draft-job');
});
it.each(['enabled', 'allowed'] as const)('retains generation gating: %s', async key => {
  mocks[key] = false; await act(async () => { tree = create(createElement(TaskDetailScreen, { id: 'canvas:task' })); });
  expect(tree!.root.findAllByType('button').find(node => node.props['aria-label'] === 'Create draft')!.props.disabled).toBe(true);
  expect(mocks.api).not.toHaveBeenCalled();
});
