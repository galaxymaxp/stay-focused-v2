import { afterEach, expect, it, vi } from 'vitest';
import { isOrbColorKey, parseProfilePreferences } from './profile-preferences';
import { OrbPreferenceSync } from './orb-preference-sync';
import { ORB_IDLE_PALETTE } from './orb-interaction';
afterEach(() => vi.useRealTimers());
it('validates exactly the shared palette keys and strict payload shape', () => {
  for (const { key } of ORB_IDLE_PALETTE) expect(parseProfilePreferences({ orbColor: key })).toEqual({ orbColor: key });
  for (const value of ['blue', null, 1, {}, undefined]) expect(isOrbColorKey(value)).toBe(false);
  for (const value of [{ orbColor: 'gold', user_id: 'other' }, [], null, {}, { orbColor: 'blue' }]) expect(() => parseProfilePreferences(value)).toThrow();
});
it('debounces rapid choices into one PATCH with the latest key', async () => {
  vi.useFakeTimers(); const request = vi.fn(async () => ({ orbColor: 'violet' as const }));
  const writePending = vi.fn(async () => {}), apply = vi.fn();
  const sync = new OrbPreferenceSync({ readPending: async () => null, writePending, request, apply });
  sync.choose('gold'); await vi.advanceTimersByTimeAsync(300); sync.choose('green');
  await vi.advanceTimersByTimeAsync(300); sync.choose('violet'); await vi.advanceTimersByTimeAsync(599);
  expect(request).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(1);
  expect(request).toHaveBeenCalledExactlyOnceWith('violet'); expect(writePending).toHaveBeenLastCalledWith(null); sync.dispose();
});
it('keeps offline/unavailable choices durable and sends pending before GET on reconnect/restart', async () => {
  vi.useFakeTimers(); let pending: string | null = null;
  const request = vi.fn().mockRejectedValue({ code: 'profile_preferences_unavailable' });
  const apply = vi.fn(), options = { readPending: async () => pending, writePending: async (key: string | null) => { pending = key; }, request, apply };
  const first = new OrbPreferenceSync(options); first.choose('orange'); await vi.advanceTimersByTimeAsync(600);
  expect(pending).toBe('orange'); expect(apply).not.toHaveBeenCalled(); first.dispose();
  request.mockResolvedValue({ orbColor: 'orange' }); const second = new OrbPreferenceSync(options); await second.refresh();
  expect(request).toHaveBeenLastCalledWith('orange'); expect(apply).toHaveBeenCalledWith('orange');
  await Promise.resolve(); expect(pending).toBe(null); second.dispose();
});
it('rejects late reads/acks, serializes in-flight changes and ignores disposed owner responses', async () => {
  vi.useFakeTimers(); let resolve!: (value: { orbColor: 'gold' }) => void;
  const request = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue({ orbColor: 'violet' });
  const apply = vi.fn(), sync = new OrbPreferenceSync({ readPending: async () => null, writePending: async () => {}, request, apply });
  const reading = sync.refresh(); await vi.advanceTimersByTimeAsync(0);
  sync.choose('violet'); await vi.advanceTimersByTimeAsync(600); expect(request).toHaveBeenCalledOnce();
  resolve({ orbColor: 'gold' }); await reading; await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenLastCalledWith('violet'); expect(apply).not.toHaveBeenCalledWith('gold'); sync.dispose();
  const disposed = new OrbPreferenceSync({ readPending: async () => 'gold', writePending: async () => {}, request, apply });
  apply.mockClear(); disposed.dispose(); await disposed.refresh(); expect(apply).not.toHaveBeenCalled();
});
