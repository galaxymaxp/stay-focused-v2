import * as THREE from 'three';
import { createOrbAmbient, type OrbAmbientSource } from '@stay-focused/shared/orb-ambient-renderer';

/** Existing body shimmer stays unchanged; ambient uses body motion, never a pulse. */
export const SHIMMER_SPEED = 2.2;
export interface OrbShimmer { time: number; amount: number; level: number }
export function orbShimmerLevel(time: number): number {
  return Math.sin(time * 2.1) * 0.5 + Math.sin(time * 3.7 + 1.3) * 0.3 + Math.sin(time * 5.9 + 0.4) * 0.2;
}
export interface OrbAuraFrame {
  readonly delta: number;
  readonly shimmer: number;
  readonly shimmerAmount: number;
  readonly glow: number;
  readonly error: number;
  readonly mode: 'light' | 'dark';
  readonly center: THREE.Vector3;
  readonly camera: THREE.Camera;
  readonly source: OrbAmbientSource;
  readonly reducedMotion: boolean;
}

/** Thin platform adapter; both scenes use the same shared shader and easing. */
export function createOrbAura() {
  const ambient = createOrbAmbient();
  const shimmer: OrbShimmer = { time: 0, amount: 0, level: 0 };
  return {
    mesh: ambient.mesh,
    capture: ambient.capture,
    shimmer,
    stepShimmer(delta: number, speed: number, amount: number, error: number) {
      shimmer.time = (shimmer.time + speed * SHIMMER_SPEED * delta) % 10000;
      shimmer.amount = amount * (1 - error);
      shimmer.level = orbShimmerLevel(shimmer.time) * shimmer.amount;
    },
    update(frame: OrbAuraFrame) {
      ambient.update(frame.source, frame.delta, frame.mode, frame.reducedMotion);
      ambient.mesh.position.copy(frame.center);
      ambient.mesh.quaternion.copy(frame.camera.quaternion);
    },
    dispose: ambient.dispose,
  };
}
