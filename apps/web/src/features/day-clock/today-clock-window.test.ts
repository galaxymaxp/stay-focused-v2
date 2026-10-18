import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useTodayClockWindow } from './use-today-clock-window';
const state = vi.hoisted(() => ({ entries: new Map<string, string>() }));

let tree: ReactTestRenderer | undefined;
let value: ReturnType<typeof useTodayClockWindow>;
function Harness() { value = useTodayClockWindow(); return createElement('clock'); }
beforeEach(() => {
 Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.useFakeTimers(); state.entries.clear();
 vi.setSystemTime(new Date(2026, 9, 18, 1, 30));
 state.entries.set('sf.today.free-time.2026-10-17', JSON.stringify({ start: 1320, end: 240 }));
 state.entries.set('sf.today.free-time.2026-10-18', JSON.stringify({ start: 540, end: 660 }));
 vi.stubGlobal('localStorage', { getItem: (key: string) => state.entries.get(key) ?? null, setItem: (key: string, value: string) => state.entries.set(key, value) });
 vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
 vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(async () => { if(tree) await act(async () => tree!.unmount()); tree = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => { tree = create(createElement(Harness)); }); }
it('reads yesterday and automatically switches at its wrapped end without reopening Today', async () => {
 await mount(); expect(value.ready).toBe(true); expect(value.date).toBe('2026-10-17'); expect(value.window).toEqual({ start: 1320, end: 240 });
 expect(value.path).toContain('endsAt='); expect(value.path).not.toContain('startsAt=');
 await act(async () => { vi.advanceTimersByTime(150 * 60_000); });
 expect(value.date).toBe('2026-10-18'); expect(value.window).toEqual({ start: 540, end: 660 });
 expect(value.path).toContain('startsAt='); expect(value.path).not.toContain('endsAt=');
});
it('saves to the owned date using the existing key', async () => {
 await mount(); await act(async () => { value.save({ start: 1410, end: 180 }); });
 expect(JSON.parse(state.entries.get('sf.today.free-time.2026-10-17')!)).toEqual({ start: 1410, end: 180 });
 expect(JSON.parse(state.entries.get('sf.today.free-time.2026-10-18')!)).toEqual({ start: 540, end: 660 });
});
it('loads the previous entry when an open clock crosses calendar midnight', async () => {
 vi.setSystemTime(new Date(2026, 9, 17, 23, 59)); await mount();
 expect(value.date).toBe('2026-10-17');
 await act(async () => { vi.advanceTimersByTime(60_000); });
 expect(value.date).toBe('2026-10-17'); expect(value.window).toEqual({ start: 1320, end: 240 });
});
