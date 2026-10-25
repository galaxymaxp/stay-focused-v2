import { expect, it, vi } from 'vitest';

it('calibrates rAF to the current clock and keeps one timestamp despite sequential draw work', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  const epoch = Date.now();
  // Native/controlled clocks need not share the browser's original timeOrigin.
  vi.stubGlobal('performance', { timeOrigin: 0, now: () => 150 });
  vi.resetModules();
  try {
    const { orbAnimationTime } = await import('./orb-interaction');
    expect(orbAnimationTime(170)).toBe(epoch + 20);
    vi.advanceTimersByTime(30);
    expect(orbAnimationTime(170)).toBe(epoch + 20);
    expect(orbAnimationTime(epoch + 30)).toBe(epoch + 30);
  } finally {
    vi.unstubAllGlobals(); vi.useRealTimers();
  }
});
