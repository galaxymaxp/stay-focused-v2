import { afterEach, expect, it, vi } from 'vitest';
import { AvatarMemory, EMPTY_AVATAR, parseProfileAvatar } from './avatar-memory';
const photo = () => ({ url: 'https://private.test/photo', expiresAt: new Date(Date.now() + 600_000).toISOString() });
afterEach(() => vi.useRealTimers());
it('drops signed URLs before expiry and falls back when offline', async () => {
  vi.useFakeTimers();
  const load = vi.fn().mockResolvedValueOnce(photo()).mockRejectedValue(new Error('offline'));
  const memory = new AvatarMemory(load);
  await memory.refresh(); expect(memory.getSnapshot().url).toContain('private.test');
  await vi.advanceTimersByTimeAsync(540_000);
  expect(memory.getSnapshot()).toEqual(EMPTY_AVATAR); expect(load).toHaveBeenCalledTimes(2);
  memory.dispose();
});
it('rejects expired or malformed responses', () => {
  for (const value of [null, {}, { url: 'http://private.test/a', expiresAt: photo().expiresAt }, { ...photo(), expiresAt: 'bad' }, { ...photo(), expiresAt: new Date(0).toISOString() }]) expect(() => parseProfileAvatar(value)).toThrow();
});
it('disposal discards the previous owner and ignores late reads', async () => {
  let finish!: (value: ReturnType<typeof photo>) => void;
  const memory = new AvatarMemory(() => new Promise(resolve => { finish = resolve; }));
  const pending = memory.refresh(); memory.dispose(); finish(photo()); await pending;
  expect(memory.getSnapshot()).toEqual(EMPTY_AVATAR);
});
it('a stale GET cannot overwrite a newer upload or removal', async () => {
  let finish!: (value: ReturnType<typeof photo>) => void;
  const memory = new AvatarMemory(() => new Promise(resolve => { finish = resolve; }));
  const pending = memory.refresh();
  await memory.change(async () => EMPTY_AVATAR); finish(photo()); await pending;
  expect(memory.getSnapshot()).toEqual(EMPTY_AVATAR); memory.dispose();
});
it('reconciles authoritative state after a write returns an uncertain failure', async () => {
  const memory = new AvatarMemory(async () => EMPTY_AVATAR);
  await expect(memory.change(async () => { throw new Error('cleanup'); })).rejects.toThrow('cleanup');
  expect(memory.getSnapshot()).toEqual(EMPTY_AVATAR); memory.dispose();
});
it('focus/foreground refresh cannot overtake an in-flight mutation', async () => {
  const load = vi.fn(async () => EMPTY_AVATAR);
  const memory = new AvatarMemory(load);
  let finish!: (value: ReturnType<typeof photo>) => void;
  const pending = memory.change(() => new Promise(resolve => { finish = resolve; }));
  await memory.refresh(); expect(load).not.toHaveBeenCalled();
  finish(photo()); await pending; expect(memory.getSnapshot().url).toContain('private.test'); memory.dispose();
});
