import { describe, expect, it } from 'vitest';
import { ORB_IDLE_PALETTE, beginOrbGesture, classifyOrbGesture, createOrbInteraction, endOrbGesture, moveOrbGesture, nextOrbColor, orbBulge, orbCrossFade, parseOrbColor, projectTapToSphere, sampleOrbInteraction, stepOrbSpin } from './orb-interaction';
describe('orb interaction', () => {
  it('classifies tap, exact hold boundary, and early scroll', () => {
    expect(classifyOrbGesture({ heldMs: 100, dx: 2, dy: 2 })).toBe('tap');
    expect(classifyOrbGesture({ heldMs: 250, dx: 20, dy: 0 })).toBe('rotate');
    expect(classifyOrbGesture({ heldMs: 249, dx: 1, dy: 20 })).toBe('scroll');
  });
  it('settles excess angular velocity back to the existing idle rate', () => {
    const start = { x: 0, y: 0, velocityX: 4, velocityY: -3 };
    const end = stepOrbSpin(start, 2000, false);
    expect(end.velocityX).toBe(0); expect(end.velocityY).toBe(0);
    expect(end.x).toBeGreaterThan(0);
    expect(stepOrbSpin(start, 2000, true)).toEqual({ ...start, velocityX: 0, velocityY: 0 });
    const a = stepOrbSpin(stepOrbSpin(start, 100, false), 100, false), b = stepOrbSpin(start, 200, false);
    expect(a.x).toBeCloseTo(b.x); expect(a.velocityX).toBeCloseTo(b.velocityX);
  });
  it('bulges then damps within 700ms, with no reduced motion bulge', () => {
    expect(orbBulge(0, false)).toBe(0);
    expect(orbBulge(100, false)).toBeGreaterThan(0.5);
    expect(orbBulge(550, false)).toBeLessThan(orbBulge(100, false));
    expect(orbBulge(650, false)).toBe(0);
    for (let t = 0; t <= 700; t += 10) { expect(orbBulge(t, false)).toBeGreaterThanOrEqual(0); expect(orbBulge(t, false)).toBeLessThanOrEqual(1); expect(orbBulge(t, true)).toBe(0); }
  });
  it('crossfades in 600ms or switches instantly with reduced motion', () => {
    expect(orbCrossFade(0, false)).toBe(0); expect(orbCrossFade(300, false)).toBe(0.5);
    expect(orbCrossFade(600, false)).toBe(1); expect(orbCrossFade(0, true)).toBe(1);
  });
  it('wraps an existing gold token first and validates persisted indices', () => {
    expect(ORB_IDLE_PALETTE[0]).toEqual({ token: 'light.findActive', hex: '#F4C542' });
    expect(nextOrbColor(ORB_IDLE_PALETTE.length - 1)).toBe(0);
    for (const invalid of [null, '', '-1', '4', 'NaN', '1.2']) expect(parseOrbColor(invalid)).toBe(0);
  });
  it('projects the ball footprint onto the front unit hemisphere', () => {
    expect(projectTapToSphere(50, 50, 100)).toEqual({ x: 0, y: 0, z: 1 });
    expect(projectTapToSphere(0, 0, 100)).toBeNull();
    expect(projectTapToSphere(100, 50, 100)).toEqual({ x: 1, y: 0, z: 0 });
    const v = projectTapToSphere(60, 30, 100)!; expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1);
    expect(projectTapToSphere(NaN, 1, 100)).toBeNull();
  });
  it('never turns an early scroll into a later rotation or tap', () => {
    let s = beginOrbGesture(createOrbInteraction(), 50, 50, 0);
    s = moveOrbGesture(s, 50, 80, 100, 100, false);
    s = moveOrbGesture(s, 50, 90, 100, 400, false);
    expect(s.gesture?.rotating).toBe(false);
    expect(endOrbGesture(s, 50, 50, 100, 450, false).colorIndex).toBe(0);
  });
  it('rotates only after a hold; release preserves inertia and cancel suppresses it', () => {
    let s = beginOrbGesture(createOrbInteraction(), 50, 50, 0);
    s = moveOrbGesture(s, 70, 55, 100, 250, false);
    expect(s.spin.y).toBeGreaterThan(0); expect(s.gesture?.rotating).toBe(true);
    expect(endOrbGesture(s, 70, 55, 100, 260, false).spin.velocityY).toBeGreaterThan(0);
    expect(endOrbGesture(s, 70, 55, 100, 260, false, true).spin.velocityY).toBe(0);
    expect(endOrbGesture(s, 70, 55, 100, 260, false).colorIndex).toBe(0);
  });
  it('taps crossfade from the current color, including rapid taps, and finish with no work', () => {
    let s = endOrbGesture(beginOrbGesture(createOrbInteraction(), 50, 50, 0), 50, 50, 100, 100, false);
    expect(s.colorIndex).toBe(1); expect(sampleOrbInteraction(s, 100, 0, false).idleColor).toBe('#f4c542');
    const mid = sampleOrbInteraction(s, 300, 0, false).idleColor;
    s = endOrbGesture(beginOrbGesture(s, 50, 50, 290), 50, 50, 100, 300, false);
    expect(s.colorFrom).toBe(mid);
    expect(sampleOrbInteraction(s, 1000, 0, false).animating).toBe(false);
    expect(sampleOrbInteraction(s, 300, 0, true).animating).toBe(false);
  });
});
