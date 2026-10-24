import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlanModeSync } from '@stay-focused/shared';
import type { PlanMode } from '@stay-focused/shared/task-planning';
import { PlanModePreferencesSync } from './PlanModePreferencesSync';
import { planModeStore } from '../features/redesign/planMode';

const mocks = vi.hoisted(() => ({ owner: 'a', offline: false, request: vi.fn(), foreground: undefined as undefined | ((state: string) => void), disk: new Map<string, string>() }));
vi.mock('../auth', () => ({ useAuth: () => ({ session: mocks.owner ? { user: { id: mocks.owner }, accessToken: 'jwt', offline: mocks.offline } : null, isSigningOut: false }) }));
vi.mock('../auth/sessionStore', () => ({ sessionStore: { getItem: async (key: string) => mocks.disk.get(key) ?? null, setItem: async (key: string, value: string) => { mocks.disk.set(key, value); }, removeItem: async (key: string) => { mocks.disk.delete(key); } } }));
vi.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: (_: string, fn: (state: string) => void) => { mocks.foreground = fn; return { remove: () => { mocks.foreground = undefined; } }; } } }));
vi.mock('../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://api.test' }));
vi.mock('../services/plannerPreferencesApi', () => ({ plannerPreferencesRequest: mocks.request }));
let tree: ReactTestRenderer | undefined;
const mount = async () => { await act(async () => { tree = create(createElement(PlanModePreferencesSync)); }); };
const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); mocks.owner = 'a'; mocks.offline = false; mocks.disk.clear(); mocks.request.mockReset(); mocks.request.mockResolvedValue({ planMode: 'reviewers_tasks' }); planModeStore.reset(); });
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; planModeStore.reset(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('shows the per-owner cache while offline, persists the last choice and retries on reconnect', async () => {
  mocks.disk.set('sf.plan-mode.a', 'tasks'); mocks.offline = true; await mount();
  expect(planModeStore.get()).toBe('tasks');
  await act(async () => planModeStore.choose('reviewers')); await tick(300);
  await act(async () => planModeStore.choose('reviewers_tasks')); await tick(600);
  expect(mocks.request).not.toHaveBeenCalled(); expect(mocks.disk.get('sf.plan-mode.pending.a')).toBe('reviewers_tasks');
  mocks.offline = false; await act(async () => tree!.update(createElement(PlanModePreferencesSync)));
  expect(mocks.request).toHaveBeenCalledWith({ baseUrl: 'https://api.test', accessToken: 'jwt', planMode: 'reviewers_tasks' });
  expect(mocks.disk.has('sf.plan-mode.pending.a')).toBe(false);
});
it('recovers pending changes on restart and ignores a late result after owner change/sign-out', async () => {
  mocks.disk.set('sf.plan-mode.pending.a', 'reviewers'); mocks.request.mockResolvedValue({ planMode: 'reviewers' }); await mount();
  expect(planModeStore.get()).toBe('reviewers');
  let finish!: (value: unknown) => void;
  mocks.request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => mocks.foreground?.('active'));
  mocks.owner = 'b'; mocks.disk.set('sf.plan-mode.b', 'tasks'); mocks.offline = true;
  await act(async () => tree!.update(createElement(PlanModePreferencesSync)));
  await act(async () => finish({ planMode: 'reviewers' })); expect(planModeStore.get()).toBe('tasks');
  mocks.owner = ''; await act(async () => tree!.update(createElement(PlanModePreferencesSync)));
  expect(planModeStore.get()).toBe('reviewers_tasks'); expect(mocks.foreground).toBeUndefined();
});
it('exchanges preferences with an independent web sync through the shared per-user contract', async () => {
  let server: PlanMode = 'reviewers_tasks';
  mocks.request.mockImplementation(async ({ planMode }: { planMode?: PlanMode }) => { if (planMode) server = planMode; return { planMode: server }; });
  await mount();
  let webMode: PlanMode = 'reviewers_tasks';
  const web = new PlanModeSync({ readPending: async () => null, writePending: async () => {}, request: async mode => { if (mode) server = mode; return { planMode: server }; }, apply: mode => { webMode = mode; } });
  try {
    web.choose('reviewers'); await tick(600); await act(async () => mocks.foreground?.('active'));
    expect(planModeStore.get()).toBe('reviewers');
    await act(async () => planModeStore.choose('tasks')); await tick(600); await web.refresh();
    expect(webMode).toBe('tasks');
  } finally { web.dispose(); }
});
