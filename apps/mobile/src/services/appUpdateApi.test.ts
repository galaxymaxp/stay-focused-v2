import { describe, expect, it, vi } from 'vitest';
import { appUpdateOnline, loadAppUpdate } from './appUpdateApi';
describe('public mobile update API', () => {
  it('sends no token and treats 204 as no release', async () => {
    const fetchImpl=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:204}));
    expect(await loadAppUpdate('https://local.invalid/',fetchImpl)).toBeNull();
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://local.invalid/api/app/latest-release');
    expect(fetchImpl.mock.calls[0]![1]).not.toHaveProperty('headers');
  });
  it('silences reachability failure and rejects invalid release data safely', async () => {
    expect(await appUpdateOnline('https://local.invalid',vi.fn().mockRejectedValue(new Error('offline')))).toBe(false);
    await expect(loadAppUpdate('https://local.invalid',vi.fn().mockResolvedValue(new Response('{}')))).rejects.toThrow('invalid_release');
    await expect(loadAppUpdate('https://local.invalid',vi.fn().mockResolvedValue(new Response('provider error',{status:500})))).rejects.toThrow('release_unavailable');
  });
  it('aborts slow body transfers within five seconds', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl=vi.fn<typeof fetch>().mockImplementation(async (_url,options) => ({ ok:true, text:() => new Promise<string>((_resolve,reject) => {options!.signal!.addEventListener('abort',()=>reject(new Error('aborted')));}) } as Response));
      const pending=appUpdateOnline('https://local.invalid',fetchImpl);
      await vi.advanceTimersByTimeAsync(5000);expect(await pending).toBe(false);
    } finally {vi.useRealTimers();}
  });
});
