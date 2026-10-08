"use client";
import { useEffect, useRef, useState } from "react";

/** Same values as the mobile app's `motion` tokens (apps/mobile/src/design/themeTokens.ts). */
export const motion = {
  small: 220,
  normal: 320,
  spatial: 480,
  spring: { damping: 18, stiffness: 180, mass: 0.8 },
} as const;

export interface SpringState {
  value: number;
  velocity: number;
}

/**
 * Advances a damped spring toward `target` by `dt` seconds. Velocity carries
 * over between calls, so a target that changes mid-flight bends the motion
 * instead of restarting it.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  dt: number,
  { damping, stiffness, mass } = motion.spring,
): SpringState {
  // Fixed sub-steps keep the integration stable when a frame is slow.
  let { value, velocity } = state;
  const steps = Math.max(1, Math.ceil(dt / (1 / 240))),
    h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const force = -stiffness * (value - target) - damping * velocity;
    velocity += (force / mass) * h;
    value += velocity * h;
  }
  return { value, velocity };
}

export function isSettled(state: SpringState, target: number, scale = 1) {
  const tolerance = Math.max(Math.abs(scale) * 0.001, 0.001);
  return (
    Math.abs(state.value - target) < tolerance &&
    Math.abs(state.velocity) < tolerance * 10
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Springs from `from` to `target` when first shown, then from wherever it is
 * to each new target. Returns the target directly when motion is reduced.
 */
export function useSpringNumber(target: number, from = 0) {
  const [value, setValue] = useState(from),
    state = useRef<SpringState>({ value: from, velocity: 0 }),
    frame = useRef<number | null>(null);
  useEffect(() => {
    if (prefersReducedMotion()) {
      state.current = { value: target, velocity: 0 };
      setValue(target);
      return;
    }
    const scale = Math.abs(target - state.current.value) || 1;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      state.current = stepSpring(state.current, target, dt);
      if (isSettled(state.current, target, scale)) {
        state.current = { value: target, velocity: 0 };
        setValue(target);
        frame.current = null;
        return;
      }
      setValue(state.current.value);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target]);
  return value;
}
