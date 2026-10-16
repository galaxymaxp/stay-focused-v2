import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLifecycle } from './AppLifecycle';

const fake = vi.hoisted(() => ({ active: true, owner: 'owner', catchUp: vi.fn(), stop: vi.fn(), listener: vi.fn() }));
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() }, usePathname: () => '/today' }));
vi.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: fake.listener } }));
vi.mock('../auth', () => ({ useAuth: () => ({ session: fake.owner ? { user: { id: fake.owner }, accessToken: 'token' } : null }) }));
vi.mock('../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://example.test' }));
vi.mock('../design/theme', () => ({ useTheme: () => ({ active: fake.active }) }));
vi.mock('../services/localLibrary/offlineCatchUp', () => ({ runOfflineCatchUp: fake.catchUp, stopOfflineCatchUp: fake.stop }));
vi.mock('../services/canvasReviewerRecoveryStore', () => ({ readCanvasReviewerRecovery: async () => null }));
vi.mock('../services/completionNotifications', () => ({ subscribeToProcessingNotificationResponses: () => ({ remove() {} }) }));
vi.mock('../services/processingOutboxReconciliation', () => ({ reconcileReviewerProcessingOutbox: async () => undefined }));
vi.mock('../services/generationRecovery', () => ({ resumeAutomaticGenerations: vi.fn() }));
let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); fake.active = true; fake.owner = 'owner';
  fake.listener.mockReturnValue({ remove() {} });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; vi.useRealTimers(); });
async function render() { await act(async () => { rendered = create(createElement(AppLifecycle)); }); }
describe('app-wide offline catch-up lifecycle', () => {
  it('catches up on sign-in and foreground using the existing shared active signal', async () => {
    await render();
    expect(fake.catchUp).toHaveBeenCalledWith('owner', { baseUrl: 'https://example.test', accessToken: 'token' });
    // The sole direct listener is the existing outbox listener; O1 adds none.
    expect(fake.listener).toHaveBeenCalledTimes(1);
    fake.active = false; await act(async () => rendered!.update(createElement(AppLifecycle)));
    expect(fake.catchUp).toHaveBeenCalledTimes(1);
    fake.active = true; await act(async () => rendered!.update(createElement(AppLifecycle)));
    expect(fake.catchUp).toHaveBeenCalledTimes(2);
    expect(fake.listener).toHaveBeenCalledTimes(1);
  });
  it('does not catch up while signed out', async () => {
    fake.owner = ''; await render(); expect(fake.catchUp).not.toHaveBeenCalled();
  });
  it('stops the old owner when the account changes', async () => {
    await render(); fake.owner = 'other';
    await act(async () => rendered!.update(createElement(AppLifecycle)));
    expect(fake.stop).toHaveBeenCalledWith('owner');
    expect(fake.catchUp).toHaveBeenLastCalledWith('other', { baseUrl: 'https://example.test', accessToken: 'token' });
  });
});
