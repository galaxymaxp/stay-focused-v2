import { describe, expect, it, vi } from 'vitest';
import { createLocalMeasurements, type LocalMeasurement, type LocalMeasurementName, type LocalMeasurementOutcome } from './local-measurements';

describe('local-only measurements', () => {
  it('is inert when disabled, including spans finished after observer removal', () => {
    const measurements = createLocalMeasurements();
    measurements.start('api.library_page')('success', 10);
    const now = vi.fn(() => 5), sink = vi.fn();
    const remove = measurements.observe({ now, sink });
    const finish = measurements.start('library.overview_read');
    expect(now).toHaveBeenCalledTimes(1);
    remove(); finish('success', 10);
    measurements.start('library.setup')('error');
    expect(now).toHaveBeenCalledTimes(1); expect(sink).not.toHaveBeenCalled();
  });
  it('takes exactly two monotonic clock samples and emits a fixed immutable event once', () => {
    const measurements = createLocalMeasurements(); const events: LocalMeasurement[] = [];
    const now = vi.fn().mockReturnValueOnce(100.25).mockReturnValueOnce(103.75);
    measurements.observe({ now, sink: event => { events.push(event); } });
    const finish = measurements.start('library.overview_read');
    finish('success', 240); finish('error');
    expect(events).toEqual([{ name: 'library.overview_read', outcome: 'success', durationMs: 3.5, count: 240 }]);
    expect(now).toHaveBeenCalledTimes(2); expect(Object.isFrozen(events[0])).toBe(true);
  });
  it('rejects arbitrary names/outcomes and drops invalid counts, with no string metadata channel', () => {
    const measurements = createLocalMeasurements(); const sink = vi.fn(); const now = vi.fn(() => 1);
    measurements.observe({ now, sink });
    measurements.start('Bearer secret /private?user=x' as LocalMeasurementName)('success');
    expect(now).not.toHaveBeenCalled();
    measurements.start('api.library_page')('raw provider error' as LocalMeasurementOutcome);
    expect(sink).not.toHaveBeenCalled();
    for (const count of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) measurements.start('api.library_page')('success', count);
    measurements.start('api.library_page')('cancelled', 100);
    expect(sink.mock.calls.every(([event]) => Object.keys(event).sort().join() === 'durationMs,name,outcome')).toBe(true);
    expect(JSON.stringify(sink.mock.calls)).not.toMatch(/Bearer|secret|private|provider/);
  });
  it('drops nonmonotonic and nonfinite clock evidence and tolerates clock failures', () => {
    const measurements = createLocalMeasurements(); const sink = vi.fn();
    for (const samples of [[2, 1], [NaN, 3], [0, Infinity]]) {
      const now = vi.fn().mockReturnValueOnce(samples[0]).mockReturnValueOnce(samples[1]);
      measurements.observe({ now, sink }); measurements.start('library.setup')('success');
    }
    measurements.observe({ now: () => { throw new Error('private clock'); }, sink });
    expect(() => measurements.start('library.setup')('error')).not.toThrow();
    expect(sink).not.toHaveBeenCalled();
  });
  it('contains both thrown and rejected sinks and never reuses unfinished spans across observers', async () => {
    const measurements = createLocalMeasurements(); const next = vi.fn();
    const firstRemove = measurements.observe({ now: () => 1, sink: () => { throw new Error('private'); } });
    expect(() => measurements.start('library.setup')('success')).not.toThrow();
    const stale = measurements.start('api.library_page');
    const remove = measurements.observe({ now: () => 2, sink: next });
    firstRemove(); stale('success', 7);
    measurements.start('api.library_page')('success', 2);
    expect(next).toHaveBeenCalledTimes(1);
    remove();
    measurements.observe({ now: () => 3, sink: async () => { throw new Error('private rejection'); } });
    measurements.start('library.setup')('error'); await Promise.resolve();
  });
});
