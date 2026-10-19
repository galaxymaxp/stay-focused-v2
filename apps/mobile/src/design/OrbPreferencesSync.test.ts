import { createElement, Fragment } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ORB_COLOR_KEY, orbIdleColor } from '@stay-focused/shared';
import { OrbPreferencesSync } from './OrbPreferencesSync';
import { rememberOrbColor, useOrbInteraction, type OrbInteractionHandle } from '../features/generation-core/orbInteraction';
const store = new Map<string,string>();
const mocks = vi.hoisted(() => ({ owner: 'owner-a', offline: false, request: vi.fn(), foreground: undefined as undefined | ((state: string) => void) }));
vi.mock('../auth', () => ({ useAuth: () => ({ session: mocks.owner ? { user: { id: mocks.owner }, accessToken: 'jwt', offline: mocks.offline } : null, isSigningOut: false }) }));
vi.mock('../auth/sessionStore', () => ({ sessionStore: { getItem: async (key: string) => store.get(key) ?? null, setItem: async (key: string,value: string) => { store.set(key,value); }, removeItem: async (key: string) => { store.delete(key); } } }));
vi.mock('react-native', () => ({ View: 'View', AppState: { currentState: 'active', addEventListener: (_: string, callback: (state:string) => void) => { mocks.foreground=callback; return { remove: () => { mocks.foreground=undefined; } }; } } }));
vi.mock('../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://api.test' }));
vi.mock('../services/profilePreferencesApi', () => ({ profilePreferencesRequest: mocks.request }));
let tree: ReactTestRenderer | undefined, handle: OrbInteractionHandle;
function Probe() { handle = useOrbInteraction(); return null; }
const element = () => createElement(Fragment, null, createElement(OrbPreferencesSync), createElement(Probe));
async function mount() { await act(async () => { tree = create(element()); }); }
async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(async () => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.owner = 'owner-a'; mocks.offline = false; mocks.request.mockReset(); store.clear();

  mocks.request.mockResolvedValue({ orbColor: 'pearl' });
  rememberOrbColor(0);
  await Promise.resolve();
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
it('renders the local cache while the network is unresolved, then cross-fades 600ms; Reduce Motion is instant', async () => {
  rememberOrbColor(1); let finish!: (value: unknown) => void;
  mocks.request.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount(); expect(handle.state.current.colorIndex).toBe(1);
  await act(async () => finish({ orbColor: 'violet' }));
  const state = handle.state.current;
  expect(state.colorIndex).toBe(3); expect(orbIdleColor(state, state.colorAt, false)).toBe('#f4c542');
  expect(orbIdleColor(state, state.colorAt + 600, false)).toBe('#cfbaf2');
  expect(orbIdleColor(state, state.colorAt, true)).toBe('#cfbaf2');
  await tick(0); expect(store.get(ORB_COLOR_KEY)).toBe('violet');
});
it('changes locally at once and sends only the last of rapid taps after 600ms', async () => {
  await mount(); mocks.request.mockClear(); mocks.request.mockResolvedValue({ orbColor: 'violet' });
  await act(async () => rememberOrbColor(1)); expect(handle.state.current.colorIndex).toBe(1);
  await tick(250); await act(async () => rememberOrbColor(2)); await tick(250);
  await act(async () => rememberOrbColor(3)); await tick(599); expect(mocks.request).not.toHaveBeenCalled();
  await tick(1); expect(mocks.request).toHaveBeenCalledTimes(1); expect(mocks.request).toHaveBeenLastCalledWith({baseUrl:'https://api.test',accessToken:'jwt',orbColor:'violet'});
});
it('silently keeps unavailable/offline color and durable pending, then sends on reconnect', async () => {
  await mount(); mocks.request.mockRejectedValue({ code: 'profile_preferences_unavailable' });
  await act(async () => rememberOrbColor(4)); await tick(600);
  expect(handle.state.current.colorIndex).toBe(4); expect(store.get('sf.orb.pending.owner-a')).toBe('orange');
  mocks.request.mockResolvedValue({ orbColor: 'orange' });
  await tick(15_000);
  expect(handle.state.current.colorIndex).toBe(4); expect(mocks.request).toHaveBeenLastCalledWith({baseUrl:'https://api.test',accessToken:'jwt',orbColor:'orange'});
  expect(store.get('sf.orb.pending.owner-a') || null).toBe(null);
});
it('recovers pending on restart and keeps writes scoped to their original owner', async () => {
  store.set('sf.orb.pending.owner-a', 'green'); mocks.request.mockResolvedValue({ orbColor: 'green' });
  await mount(); expect(mocks.request).toHaveBeenCalledWith({baseUrl:'https://api.test',accessToken:'jwt',orbColor:'green'});
  mocks.request.mockRejectedValue(new Error('offline'));
  await act(async () => rememberOrbColor(3)); await tick(600);
  expect(store.get('sf.orb.pending.owner-a')).toBe('violet');
  mocks.owner='owner-b'; mocks.request.mockClear(); mocks.request.mockResolvedValue({orbColor:'pearl'});
  await act(async () => tree!.update(element()));
  expect(mocks.request).toHaveBeenCalledWith({baseUrl:'https://api.test',accessToken:'jwt',orbColor:undefined});
  expect(store.get('sf.orb.pending.owner-a')).toBe('violet');
});
it('ignores late server color after account switch/sign-out and cleans lifecycle listeners', async () => {
  let finish!: (value: unknown) => void;
  mocks.request.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount(); mocks.owner=''; await act(async () => tree!.update(element()));
  await act(async () => finish({orbColor:'orange'})); expect(handle.state.current.colorIndex).toBe(0);
});

it('refreshes on foreground, online session restoration and sign-in', async () => {
  await mount(); mocks.request.mockClear(); mocks.request.mockResolvedValue({orbColor:'gold'});
  await act(async () => mocks.foreground?.('active'));
  expect(handle.state.current.colorIndex).toBe(1);
  mocks.offline=true; await act(async () => tree!.update(element())); mocks.request.mockClear();
  mocks.offline=false; mocks.request.mockResolvedValue({orbColor:'green'});
  await act(async () => tree!.update(element())); expect(handle.state.current.colorIndex).toBe(2);
  mocks.owner=''; await act(async () => tree!.update(element())); expect(mocks.foreground).toBeUndefined();
  mocks.owner='owner-a'; mocks.request.mockResolvedValue({orbColor:'violet'});
  await act(async () => tree!.update(element())); expect(handle.state.current.colorIndex).toBe(3);
});
