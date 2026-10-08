import { expect, it } from "vitest";
import { isSettled, stepSpring, type SpringState } from "./motion";

function run(state: SpringState, target: number, seconds: number) {
  const trace: number[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    state = stepSpring(state, target, 1 / 60);
    trace.push(state.value);
  }
  return { state, trace };
}

it("springs from zero to the value with the mobile app's small overshoot", () => {
  const { state, trace } = run({ value: 0, velocity: 0 }, 100, 1);
  expect(isSettled(state, 100, 100)).toBe(true);
  const peak = Math.max(...trace);
  expect(peak).toBeGreaterThan(100);
  expect(peak).toBeLessThan(104);
  // Settles close to the ~516ms the CSS easing curve is built from.
  const settledAt = trace.findIndex((v, i) =>
    trace.slice(i).every((w) => Math.abs(w - 100) < 0.5),
  );
  expect(settledAt / 60).toBeGreaterThan(0.4);
  expect(settledAt / 60).toBeLessThan(0.65);
});

it("counts down as well as up", () => {
  const { state } = run({ value: 80, velocity: 0 }, 20, 1);
  expect(state.value).toBeCloseTo(20, 1);
});

it("keeps its velocity when the target changes mid-flight", () => {
  const moving = run({ value: 0, velocity: 0 }, 100, 0.1).state;
  expect(moving.velocity).toBeGreaterThan(0);
  const redirected = stepSpring(moving, 0, 1 / 60);
  // Still travelling upward for a moment instead of snapping back.
  expect(redirected.value).toBeGreaterThan(moving.value);
});

it("stays stable when a frame takes much longer than usual", () => {
  const { value } = stepSpring({ value: 0, velocity: 0 }, 1, 0.5);
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThan(0.5);
  expect(value).toBeLessThan(1.1);
});
