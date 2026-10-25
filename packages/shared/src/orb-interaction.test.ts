import { describe, expect, it } from 'vitest';
import { ORB_MAX_IMPULSES, ORB_RIPPLE_MS, ORB_WAVE_CAP, orbWaveDisplacement, orbWaveHeight, ORB_IDLE_PALETTE, beginOrbGesture, classifyOrbGesture, createOrbInteraction, endOrbGesture, moveOrbGesture, nextOrbColor, orbRippleTime, orbCrossFade, parseOrbColorKey, legacyOrbIndexToKey, pushOrbSpin, ringOrbRadians, ORB_SPIN_FRICTION_SECONDS, projectTapToSphere, sampleOrbInteraction, stepOrbSpin } from './orb-interaction';
describe('orb interaction', () => {
  it('classifies tap, exact hold boundary, and early scroll', () => {
    expect(classifyOrbGesture({ heldMs: 100, dx: 2, dy: 2 })).toBe('tap');
    expect(classifyOrbGesture({ heldMs: 250, dx: 20, dy: 0 })).toBe('rotate');
    expect(classifyOrbGesture({ heldMs: 249, dx: 1, dy: 20 })).toBe('scroll');
  });
  it('settles excess angular velocity back to the existing idle rate', () => {
    const start = { x: 0, y: 0, velocityX: 4, velocityY: -3 };
    const end = stepOrbSpin(start, 3000, false);
    expect(end.velocityX).toBe(0); expect(end.velocityY).toBe(0);
    expect(end.x).toBeGreaterThan(0);
    expect(stepOrbSpin(start, 2000, true)).toEqual({ ...start, velocityX: 0, velocityY: 0 });
    const a = stepOrbSpin(stepOrbSpin(start, 100, false), 100, false), b = stepOrbSpin(start, 200, false);
    expect(a.x).toBeCloseTo(b.x); expect(a.velocityX).toBeCloseTo(b.velocityX);
  });
  it('bounds ripple time to the slower 1800ms packet and disables it under Reduce Motion', () => {
    expect(orbRippleTime(-1, false)).toBe(-1);
    expect(orbRippleTime(0, false)).toBe(0);
    expect(orbRippleTime(450, false)).toBe(0.45);
    expect(orbRippleTime(1800, false)).toBe(-1);
    expect(orbRippleTime(Infinity, false)).toBe(-1);
    expect(orbRippleTime(200, true)).toBe(-1);
  });
  it('crossfades in 600ms or switches instantly with reduced motion', () => {
    expect(orbCrossFade(0, false)).toBe(0); expect(orbCrossFade(300, false)).toBe(0.5);
    expect(orbCrossFade(600, false)).toBe(1); expect(orbCrossFade(0, true)).toBe(1);
  });
  it('starts pearl, cycles stable keys and maps legacy indices', () => {
    expect(ORB_IDLE_PALETTE[0]).toEqual({ key: 'pearl', token: 'knowledgeCore.light.base', hex: '#E6EAF1' });
    expect(ORB_IDLE_PALETTE.map(color => color.key)).toEqual(['pearl', 'gold', 'green', 'violet', 'orange']);
    let index = 0;
    for (const key of ['gold', 'green', 'violet', 'orange', 'pearl']) {
      index = nextOrbColor(index); expect(ORB_IDLE_PALETTE[index]!.key).toBe(key);
    }
    for (const invalid of [null, '', '2', 'unknown']) expect(parseOrbColorKey(invalid)).toBe('pearl');
    for (const color of ORB_IDLE_PALETTE) expect(parseOrbColorKey(color.key)).toBe(color.key);
    expect(['0', '1', '2', '3'].map(legacyOrbIndexToKey)).toEqual(['gold', 'green', 'violet', 'orange']);
    for (const invalid of [null, '', '-1', '4', '1.2']) expect(legacyOrbIndexToKey(invalid)).toBe('pearl');
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
    expect(s.colorIndex).toBe(1); expect(sampleOrbInteraction(s, 100, 0, false).idleColor).toBe('#e6eaf1');
    const mid = sampleOrbInteraction(s, 300, 0, false).idleColor;
    s = endOrbGesture(beginOrbGesture(s, 50, 50, 290), 50, 50, 100, 300, false);
    expect(s.colorFrom).toBe(mid);
    expect(sampleOrbInteraction(s, 2200, 0, false).animating).toBe(false);
    expect(sampleOrbInteraction(s, 300, 0, true).animating).toBe(false);
  });
});

it.each([[6, 2.5, 5], [1, 0, 2]])('stops %s rad/s within the owner timing window', (velocity, minimum, maximum) => {
  expect(ORB_SPIN_FRICTION_SECONDS).toBe(0.4);
  let spin = { x: 0, y: 0, velocityX: 0, velocityY: velocity! }, ms = 0;
  while (spin.velocityY !== 0 && ms < 10000) { spin = stepOrbSpin(spin, 10, false); ms += 10; }
  expect(ms / 1000).toBeGreaterThan(minimum!); expect(ms / 1000).toBeLessThan(maximum!);
});
it('smooths several samples, caps both signs, and decays a held pause without drifting pose', () => {
  let state = beginOrbGesture(createOrbInteraction(), 50, 50, 0);
  state = moveOrbGesture(state, 60, 50, 100, 250, false);
  const first = state.spin.velocityY;
  state = moveOrbGesture(state, 70, 50, 100, 270, false);
  expect(state.spin.velocityY).toBeGreaterThan(first);
  expect(state.spin.velocityY).toBeLessThan(10 * Math.PI / 100 / 0.02);
  const velocity = state.spin.velocityY, pose = state.spin.y;
  const sampled = sampleOrbInteraction(state, 420, 150, false).state;
  expect(sampled.spin.y).toBe(pose);
  const released = endOrbGesture(sampled, 70, 50, 100, 570, false);
  expect(released.spin.velocityY).toBeCloseTo(velocity * Math.exp(-0.3 / 0.4));
  expect(released.spin.velocityY).toBeGreaterThan(0);
  expect(endOrbGesture(state, 70, 50, 100, 570, false).spin.velocityY).toBeCloseTo(released.spin.velocityY);
  for (let time = 590; time < 1200; time += 20) state = moveOrbGesture(state, time * 100, -time * 100, 100, time, false);
  expect(state.spin.velocityY).toBeLessThanOrEqual(10); expect(state.spin.velocityX).toBeGreaterThanOrEqual(-10);
});
it('stationary pointer samples use the same friction, then resume continuously', () => {
  let state = beginOrbGesture(createOrbInteraction(), 50, 50, 0);
  state = moveOrbGesture(state, 70, 50, 100, 250, false);
  const speed = state.spin.velocityY;
  state = moveOrbGesture(state, 70, 50, 100, 550, false);
  expect(state.spin.velocityY).toBeCloseTo(speed * Math.exp(-0.3 / 0.4));
  state = moveOrbGesture(state, 80, 50, 100, 570, false);
  expect(state.spin.velocityY).toBeGreaterThan(speed * Math.exp(-0.3 / 0.4));
  expect(endOrbGesture(state, 80, 50, 100, 590, true).spin.velocityY).toBe(0);
});
it('pushes ring Y impulses with clockwise sign and gain, coasts, and honors Reduce Motion', () => {
  const delta = ringOrbRadians(120);
  expect(delta).toBeCloseTo(Math.PI / 2);
  const state = pushOrbSpin(createOrbInteraction(), delta, 100);
  expect(state.spin.y).toBeCloseTo(delta); expect(state.spin.x).toBe(0); expect(state.spin.velocityY).toBeGreaterThan(0);
  expect(pushOrbSpin(createOrbInteraction(), -delta, 100).spin.velocityY).toBeLessThan(0);
  const hold = sampleOrbInteraction(state, 400, 300, false);
  expect(hold.state.spin.velocityY).toBeGreaterThan(0); expect(hold.state.spin.velocityY).toBeLessThan(state.spin.velocityY);
  expect(sampleOrbInteraction(hold.state, 5000, 4600, false).animating).toBe(false);
  const reduced = sampleOrbInteraction(pushOrbSpin(createOrbInteraction(), delta, 100, true), 100, 0, true);
  expect(reduced.state.spin.velocityY).toBe(0); expect(reduced.animating).toBe(false);
});
const tap = (s: ReturnType<typeof createOrbInteraction>, x: number, at: number, reduced = false) =>
  endOrbGesture(beginOrbGesture(s, x, 50, at), x, 50, 100, at + 20, reduced);
it('retains earlier traveling waves and each new direction instead of restarting', () => {
  let state = tap(createOrbInteraction(), 35, 0);
  state = tap(state, 75, 150);
  const frame = sampleOrbInteraction(state, 500, 0, false);
  expect(frame.waves.map(w => w.time)).toEqual([0.48, 0.33]);
  expect(frame.waves[0]!.direction.x).toBeCloseTo(-0.3); expect(frame.waves[1]!.direction.x).toBeCloseTo(0.5);
  expect(frame.state.impulses).toHaveLength(2);
});
it('sums coincident waves, grows on five taps and smoothly caps displacement', () => {
  const normal = { x: Math.sin(0.95), y: 0, z: Math.cos(0.95) };
  const wave = { direction: { x: 0, y: 0, z: 1 }, time: 0.4 };
  const one = Math.abs(orbWaveDisplacement(normal, [wave]));
  const five = Math.abs(orbWaveDisplacement(normal, Array(5).fill(wave)));
  expect(one).toBeGreaterThan(0); expect(five).toBeGreaterThan(one * 4);
  let state = createOrbInteraction();
  for (let i = 0; i < 100; i++) state = tap(state, 50, i * 2);
  expect(state.impulses).toHaveLength(ORB_MAX_IMPULSES);
  for (let ms = 0; ms <= ORB_RIPPLE_MS; ms += 17) {
    const frame = sampleOrbInteraction(state, 220 + ms, 17, false);
    expect(Math.abs(orbWaveDisplacement(normal, frame.waves))).toBeLessThanOrEqual(ORB_WAVE_CAP);
  }
  const peak = (s: typeof state, now: number) => Math.max(...Array.from({length: 100}, (_, i) =>
    Math.abs(orbWaveDisplacement({ x: Math.sin(i * Math.PI / 100), y: 0, z: Math.cos(i * Math.PI / 100) }, sampleOrbInteraction(s, now, 0, false).waves))));
  let fiveTaps = createOrbInteraction(); for (let i = 0; i < 5; i++) fiveTaps = tap(fiveTaps, 50, i * 150);
  expect(peak(fiveTaps, 850)).toBeGreaterThan(peak(tap(createOrbInteraction(), 50, 600), 850));
});
it('prunes expired waves on input and samples; a late isolated tap starts gently', () => {
  const first = tap(createOrbInteraction(), 50, 0);
  const before = sampleOrbInteraction(first, 1819, 0, false);
  expect(before.state.impulses).toHaveLength(1);
  expect(Math.abs(orbWaveHeight(3, 1.799))).toBeLessThan(0.000001);
  expect(sampleOrbInteraction(first, 1820, 0, false).state.impulses).toEqual([]);
  expect(sampleOrbInteraction(first, 1e12, 0, false).animating).toBe(false);
  const late = tap(first, 50, 1e12);
  expect(late.impulses).toHaveLength(1);
  expect(sampleOrbInteraction(late, 1e12 + 420, 0, false).waves).toEqual(sampleOrbInteraction(first, 420, 0, false).waves);
});
it('builds peak and spatial energy from one through five taps at 150ms without destructive cancellation', () => {
  let previousPeak = 0, previousEnergy = 0;
  for (let count = 1; count <= 5; count++) {
    let state = createOrbInteraction();
    for (let i = 0; i < count; i++) state = tap(state, 50, i * 150);
    const frame = sampleOrbInteraction(state, (count - 1) * 150 + 420, 0, false);
    const heights = Array.from({ length: 180 }, (_, i) => {
      const angle = i * Math.PI / 180;
      return orbWaveDisplacement({ x: Math.sin(angle), y: 0, z: Math.cos(angle) }, frame.waves);
    });
    const peak = Math.max(...heights), energy = heights.reduce((sum, height) => sum + height ** 2, 0);
    expect(peak, `peak after ${count} taps`).toBeGreaterThan(previousPeak);
    expect(energy, `energy after ${count} taps`).toBeGreaterThan(previousEnergy);
    previousPeak = peak; previousEnergy = energy;
  }
});
it('uses absolute impulse time independent of frame count, gaps or invalid samples', () => {
  const initial = tap(tap(createOrbInteraction(), 40, 0), 65, 150);
  const step = (dt: number) => {
    let s = initial;
    for (let now = 200; now < 1200; now += dt) s = sampleOrbInteraction(s, now, dt, false).state;
    return sampleOrbInteraction(s, 1200, dt, false).waves;
  };
  expect(step(16)).toEqual(step(80));
  expect(step(80)).toEqual(sampleOrbInteraction(initial, 1200, 1000, false).waves);
  expect(sampleOrbInteraction(initial, NaN, 16, false).waves).toEqual([]);
  for (const time of [NaN, Infinity, -1, 0, 1.8, 10000]) expect(orbWaveHeight(1, time)).toBe(0);
});
it('clears waves under Reduce Motion and acknowledges taps only by stable palette changes', () => {
  const active = tap(createOrbInteraction(), 50, 0);
  const frame = sampleOrbInteraction(active, 150, 16, true);
  expect(frame.waves).toEqual([]); expect(frame.state.impulses).toEqual([]); expect(frame.animating).toBe(false);
  let state = frame.state; for(let i = 0; i < 5; i++) state = tap(state, 50, 200 + i * 150, true);
  expect(state.impulses).toEqual([]); expect(state.colorIndex).toBe(1);
  expect(sampleOrbInteraction(state, 1000, 16, false).waves).toEqual([]);
});

it('ring move, hold, move and release preserves a continuously decaying speed', () => {
  let state = pushOrbSpin({ ...createOrbInteraction(), inputAt: 0 }, ringOrbRadians(20), 20);
  const first = state.spin.velocityY;
  state = sampleOrbInteraction(state, 320, 300, false).state;
  expect(state.spin.velocityY).toBeCloseTo(first * Math.exp(-0.3 / 0.4));
  state = pushOrbSpin(state, ringOrbRadians(20), 340);
  expect(state.spin.velocityY).toBeGreaterThan(0);
  const release = sampleOrbInteraction(state, 640, 300, false);
  expect(release.state.spin.velocityY).toBeCloseTo(state.spin.velocityY * Math.exp(-0.3 / 0.4));
  expect(release.animating).toBe(true);
});

it('retains input delivered after the display-frame timestamp without ageing waves or momentum early', () => {
  const tapped = endOrbGesture(beginOrbGesture(createOrbInteraction(), 50, 50, 550), 50, 50, 100, 600, false);
  const pending = sampleOrbInteraction(tapped, 550, 16, false);
  expect(pending.state.impulses).toHaveLength(1);
  expect(pending.waves[0]!.time).toBe(0);
  expect(sampleOrbInteraction(pending.state, 700, 16, false).waves[0]!.time).toBe(.1);
  expect(sampleOrbInteraction(pending.state, 2400, 16, false).waves).toEqual([]);
  expect(sampleOrbInteraction(tapped, 550, 16, true).waves).toEqual([]);
  const spinning = pushOrbSpin(createOrbInteraction(), .2, 600);
  const early = sampleOrbInteraction(spinning, 550, 16, false);
  expect(early.state.spinAt).toBe(600);
  expect(sampleOrbInteraction(early.state, 700, 16, false).state.spin)
    .toEqual(sampleOrbInteraction(spinning, 700, 16, false).state.spin);
});
