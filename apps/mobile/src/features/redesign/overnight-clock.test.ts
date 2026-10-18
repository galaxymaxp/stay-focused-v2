import { describe, expect, it } from 'vitest';
import { freeTimeDuration, todayClockWindow } from '@stay-focused/shared';
import { planningRequest, freeTimeAround } from './presentation';
import { CLOCK, dragEdge, followMinutes, hitTest, moveRange, ringArc, ringPoint, snapRange } from './dayClock';
describe('overnight clock', () => {
  it.each([[1320, 240, 18, 4, 0], [1410, 30, 18, 0, 30], [540, 660, 17, 11, 0]])('plans %i to %i exactly', (start, end, endDay, endHour, endMinute) => {
    const result = planningRequest('2026-10-17', start, end);
    const until = new Date(2026, 9, endDay, endHour, endMinute).toISOString();
    expect(result.availability).toEqual([{ startsAt: new Date(2026, 9, 17, Math.floor(start / 60), start % 60).toISOString(), endsAt: until }]);
    expect(result.planningRange).toEqual({ startsAt: new Date(2026, 9, 17).toISOString(), endsAt: endDay === 18 ? until : new Date(2026, 9, 18).toISOString() });
  });
  it('rejects equal time and recovers an overnight window from real blocks', () => {
    expect(() => planningRequest('2026-10-17', 600, 600)).toThrow('different');
    expect(freeTimeAround([{ from: 1320, to: 1440 }, { from: 1440, to: 1680 }], 1300)).toEqual({ start: 1320, end: 240 });
  });
  it('draws a clockwise arc and handles on both sides of midnight', () => {
    for (const [start, end] of [[1320, 240], [1410, 30]]) {
      const path = ringArc(start!, end!, CLOCK.ring);
      const a = ringPoint(start!), b = ringPoint(end!);
      expect(path).toBe(`M ${a.x} ${a.y} A ${CLOCK.ring} ${CLOCK.ring} 0 0 1 ${ringPoint(end! + 1440).x} ${ringPoint(end! + 1440).y}`);
      expect(b.y).toBeLessThan(CLOCK.center);
      expect(hitTest(a.x, a.y, start!, end!)).toBe('start');
      expect(hitTest(b.x, b.y, start!, end!)).toBe('end');
    }
    const middle = ringPoint(60);
    expect(hitTest(middle.x, middle.y, 1320, 240)).toBe('move');
    const noon = ringPoint(720);
    expect(hitTest(noon.x, noon.y, 1320, 240)).toBeNull();
  });
  it('drags either handle through midnight and preserves whole-block duration', () => {
    expect(dragEdge('end', followMinutes(1425, 30), 1320, 1425)).toEqual({ start: 1320, end: 30 });
    expect(dragEdge('start', followMinutes(15, 1425), 15, 120)).toEqual({ start: 1425, end: 120 });
    const moved = snapRange(...Object.values(moveRange(1320, 240, 180)) as [number, number], 'move');
    expect(moved).toEqual({ start: 60, end: 420 });
    expect(freeTimeDuration(moved.start, moved.end)).toBe(360);
  });
  it('selects the previous plan at 01:30 and today at 05:00', () => {
    const previous = { start: 1320, end: 240 };
    expect(todayClockWindow(new Date(2026, 9, 18, 1, 30), previous, null).date).toBe('2026-10-17');
    expect(todayClockWindow(new Date(2026, 9, 18, 5), previous, null).date).toBe('2026-10-18');
  });
});
