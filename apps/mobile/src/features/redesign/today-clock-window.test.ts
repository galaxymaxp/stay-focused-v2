import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useTodayClockWindow } from './useTodayClockWindow';
const state = vi.hoisted(() => ({ entries: new Map<string, string>() }));
vi.mock('../../auth/sessionStore', () => ({ sessionStore: { getItem: async (key: string) => state.entries.get(key) ?? null, setItem: async (key: string, value: string) => { state.entries.set(key, value); } } }));
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ active: true }) }));
let tree: ReactTestRenderer | undefined;
let value: ReturnType<typeof useTodayClockWindow>;
function Harness() { value = useTodayClockWindow(); return createElement('clock'); }
beforeEach(() => {
 Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.useFakeTimers(); state.entries.clear();
 vi.setSystemTime(new Date(2026, 9, 18, 1, 30));
 state.entries.set('sf.today.free-time.2026-10-17', JSON.stringify({ start: 1320, end: 240 }));
 state.entries.set('sf.today.free-time.2026-10-18', JSON.stringify({ start: 540, end: 660 }));

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

it('keeps the Today read identity stable for saved gesture commits', async () => {
 vi.setSystemTime(new Date(2026, 9, 18, 12)); await mount();
 const path = value.path;
 await act(async () => { value.save({ start: 1320, end: 240 }); });
 expect(value.path).toBe(path);
 await act(async () => { value.save({ start: 1320, end: 180 }); });
 expect(value.path).toBe(path);
 await act(async () => { value.save({ start: 540, end: 660 }); });
 expect(value.path).toBe(path);
});

it('defers calendar rollover while held and keeps the latest committed overnight tail', async () => {
 vi.setSystemTime(new Date(2026, 9, 18, 23, 59)); await mount();
 const path = value.path;
 await act(async () => value.setAdjusting(true));
 await act(async () => { vi.advanceTimersByTime(60_000); });
 expect(value.path).toBe(path); expect(value.date).toBe('2026-10-18');
 await act(async () => { value.save({ start: 1320, end: 180 }); value.setAdjusting(false); });
 expect(value.date).toBe('2026-10-18'); expect(value.window).toEqual({ start: 1320, end: 180 });
 expect(value.path).toContain('endsAt=');
 await act(async () => { vi.advanceTimersByTime(180 * 60_000); });
 expect(value.date).toBe('2026-10-19');
});

it('explicit reconciliation sees saved bounds without another persistence', async () => {
 vi.setSystemTime(new Date(2026, 9, 18, 12)); await mount();
 const path = value.path;
 await act(async () => value.save({ start: 1320, end: 240 })); expect(value.path).toBe(path);
 await act(async () => value.reconcile()); expect(value.path).not.toBe(path);
 expect(value.window).toEqual({ start: 1320, end: 240 });
});
