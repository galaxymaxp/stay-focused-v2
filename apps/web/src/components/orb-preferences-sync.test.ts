import { createElement, Fragment } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ORB_COLOR_KEY, orbIdleColor } from '@stay-focused/shared';
const store = new Map<string,string>();
const mocks = vi.hoisted(() => ({ owner: 'owner-a', offline: false, request: vi.fn() }));
vi.mock('./providers', () => ({ useAuth: () => ({ session: mocks.owner ? { user: { id: mocks.owner } } : null, api: mocks.request }) }));
import { OrbPreferencesSync } from './orb-preferences-sync';
import { rememberOrbColor, useOrbInteraction, type OrbInteractionHandle } from '../features/knowledge-core/orbInteraction';
let tree: ReactTestRenderer | undefined, handle: OrbInteractionHandle;
function Probe() { handle = useOrbInteraction(); return null; }
const element = () => createElement(Fragment, null, createElement(OrbPreferencesSync), createElement(Probe));
async function mount() { await act(async () => { tree = create(element()); }); }
async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(async () => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.owner = 'owner-a'; mocks.offline = false; mocks.request.mockReset(); store.clear();
  vi.stubGlobal('window', Object.assign(new EventTarget(), {matchMedia: () => ({matches:false})}));
  vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));
  vi.stubGlobal('localStorage',{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>{store.set(key,value);}});
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
  await tick(1); expect(mocks.request).toHaveBeenCalledTimes(1); expect(mocks.request).toHaveBeenLastCalledWith('/api/profile/preferences',{method:'PATCH',body:{orbColor:'violet'}});
});
it('silently keeps unavailable/offline color and durable pending, then sends on reconnect', async () => {
  await mount(); mocks.request.mockRejectedValue({ code: 'profile_preferences_unavailable' });
  await act(async () => rememberOrbColor(4)); await tick(600);
  expect(handle.state.current.colorIndex).toBe(4); expect(store.get('sf.orb.pending.owner-a')).toBe('orange');
  mocks.request.mockResolvedValue({ orbColor: 'orange' });
  await act(async () => { window.dispatchEvent(new Event('online')); });
  expect(handle.state.current.colorIndex).toBe(4); expect(mocks.request).toHaveBeenLastCalledWith('/api/profile/preferences',{method:'PATCH',body:{orbColor:'orange'}});
  expect(store.get('sf.orb.pending.owner-a') || null).toBe(null);
});
it('recovers pending on restart and keeps writes scoped to their original owner', async () => {
  store.set('sf.orb.pending.owner-a', 'green'); mocks.request.mockResolvedValue({ orbColor: 'green' });
  await mount(); expect(mocks.request).toHaveBeenCalledWith('/api/profile/preferences',{method:'PATCH',body:{orbColor:'green'}});
  mocks.request.mockRejectedValue(new Error('offline'));
  await act(async () => rememberOrbColor(3)); await tick(600);
  expect(store.get('sf.orb.pending.owner-a')).toBe('violet');
  mocks.owner='owner-b'; mocks.request.mockClear(); mocks.request.mockResolvedValue({orbColor:'pearl'});
  await act(async () => tree!.update(element()));
  expect(mocks.request).toHaveBeenCalledWith('/api/profile/preferences',undefined);
  expect(store.get('sf.orb.pending.owner-a')).toBe('violet');
});
it('ignores late server color after account switch/sign-out and cleans lifecycle listeners', async () => {
  let finish!: (value: unknown) => void;
  mocks.request.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount(); mocks.owner=''; await act(async () => tree!.update(element()));
  await act(async () => finish({orbColor:'orange'})); expect(handle.state.current.colorIndex).toBe(0);
});

it('refreshes on tab focus and visibility restoration, and removes listeners on sign-out', async () => {
  await mount(); mocks.request.mockResolvedValue({orbColor:'gold'});
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(handle.state.current.colorIndex).toBe(1);
  mocks.request.mockResolvedValue({orbColor:'green'});
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(handle.state.current.colorIndex).toBe(2);
  mocks.owner=''; await act(async () => tree!.update(element())); mocks.request.mockClear();
  await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
  expect(mocks.request).not.toHaveBeenCalled();
});
