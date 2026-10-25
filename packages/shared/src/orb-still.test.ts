import { expect, it, vi } from 'vitest';
import { createOrbStillCache, orbStillKey, orbStillPaletteColor } from './orb-still';
const request = { color: '#E6EAF1', mode: 'dark' as const, pixels: 78 };
it('keys include version, normalized color, mode and physical pixel size', () => {
  expect(orbStillKey(request)).toBe(orbStillKey({ ...request, color: '#e6eaf1' }));
  expect(new Set([request, { ...request, color: '#F4C542' }, { ...request, mode: 'light' as const },
    { ...request, pixels: 52 }].map(orbStillKey)).size).toBe(4);
  expect(orbStillPaletteColor(0)).toBe('#E6EAF1');
  expect(orbStillPaletteColor(-1)).toBe('#E6EAF1');
});
it.each([0, -1, 7, 513, 26.2, NaN, Infinity])('rejects invalid size %s before drawing', pixels => {
  expect(() => orbStillKey({ ...request, pixels })).toThrow('invalid_orb_still');
});
it('rejects invalid color and theme', () => {
  expect(() => orbStillKey({ ...request, color: 'red' })).toThrow();
  expect(() => orbStillKey({ ...request, mode: 'auto' as 'dark' })).toThrow();
});
it('coalesces concurrent draws, invalidates and redraws changed color/mode/size', async () => {
  const draw = vi.fn(async () => 'image'), cache = createOrbStillCache(draw);
  const a = cache.get(request), b = cache.get(request);
  expect(a).toBe(b); await a; expect(draw).toHaveBeenCalledTimes(1);
  for (const next of [{ ...request, color: '#91D5B1' }, { ...request, mode: 'light' as const }, { ...request, pixels: 52 }]) await cache.get(next);
  expect(draw).toHaveBeenCalledTimes(4);
  cache.clear(); await cache.get(request); expect(draw).toHaveBeenCalledTimes(5);
});
it('retries rejected draws and bounds the least recently used cache', async () => {
  const draw = vi.fn().mockRejectedValueOnce(new Error('gl')).mockResolvedValue('image');
  const cache = createOrbStillCache<string>(draw, 2);
  await expect(cache.get(request)).rejects.toThrow('gl'); await cache.get(request);
  await cache.get({ ...request, pixels: 52 }); await cache.get(request);
  await cache.get({ ...request, pixels: 26 }); await cache.get({ ...request, pixels: 52 });
  expect(draw).toHaveBeenCalledTimes(5);
});
it('an old failure cannot evict the replacement after clear', async () => {
  let reject!: (error: Error) => void;
  const draw = vi.fn().mockImplementationOnce(() => new Promise<string>((_, r) => { reject = r; })).mockResolvedValue('new');
  const cache = createOrbStillCache<string>(draw);
  const old = cache.get(request); await Promise.resolve(); cache.clear();
  const replacement = cache.get(request); reject(new Error('old'));
  await expect(old).rejects.toThrow(); await replacement;
  expect(cache.get(request)).toBe(replacement);
});
