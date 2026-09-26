import * as THREE from "three";

import { ORB_RADIUS } from "./orbBody";

const AURA_SIZE = 3.3;

/** Shimmer clock units per second at full shimmer (generating). */
export const SHIMMER_SPEED = 2.2;

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = `
uniform float uStrength;
uniform float uSpread;
uniform float uTime;
uniform float uShimmer;
uniform float uLevel;
uniform float uInner;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float angle = atan(p.y, p.x);
  // The aura's edge wavers around the orb like a flame instead of holding a perfect circle.
  float wobble = sin(angle * 3.0 + uTime * 1.7) * 0.5 + sin(angle * 5.0 - uTime * 2.3) * 0.3 + sin(angle * 2.0 + uTime * 0.9) * 0.2;
  float radius = length(p) * 2.0;
  float warped = radius * (1.0 - wobble * 0.06 * uShimmer);
  float glow = exp(-warped * warped * uSpread) * (1.0 + uLevel * 0.55);
  // Only outside the glass: light behind a clear ball would fog it.
  float outside = smoothstep(uInner * 0.97, uInner * 1.06, warped);
  gl_FragColor = vec4(uColor, glow * outside * (1.0 - smoothstep(0.72, 1.0, radius)) * uStrength);
}`;

// Additive light composites as a cool tint over pale backgrounds.
const AURA_COLOR = { dark: "#B9CCFF", light: "#8EA9E6" } as const;

/** The orb's wavering light; shared with every surface it lights. */
export interface OrbShimmer {
  /** Shimmer clock, advancing with the state's shimmer speed. */
  time: number;
  /** How strongly the light wavers, 0 for a steady glow. */
  amount: number;
  /** Current overall brightness offset, within ±amount. */
  level: number;
}

export interface OrbAuraFrame {
  readonly delta: number;
  /** Eased share of SHIMMER_SPEED. */
  readonly shimmer: number;
  /** Shimmer strength, 0–1. */
  readonly shimmerAmount: number;
  readonly glow: number;
  readonly error: number;
  readonly mode: "light" | "dark";
  readonly center: THREE.Vector3;
  readonly camera: THREE.Camera;
  /** Optional light color (the Today day orb); defaults follow the theme. */
  readonly color?: string;
}

/** Overlapping rhythms that never line up, so the light wavers without a regular beat. Range ±1. */
export function orbShimmerLevel(time: number): number {
  return Math.sin(time * 2.1) * 0.5 + Math.sin(time * 3.7 + 1.3) * 0.3 + Math.sin(time * 5.9 + 0.4) * 0.2;
}

/** A camera-facing glow around the orb, and the shimmer clock the orb's own light shares. */
export function createOrbAura() {
  const uniforms = {
    uStrength: { value: 0 }, uSpread: { value: 2.6 }, uTime: { value: 0 }, uShimmer: { value: 0 },
    uLevel: { value: 0 }, uInner: { value: (ORB_RADIUS * 2) / AURA_SIZE }, uColor: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(AURA_SIZE, AURA_SIZE), material);
  mesh.renderOrder = 0;
  const shimmer: OrbShimmer = { time: 0, amount: 0, level: 0 };
  let mode: "light" | "dark" | null = null;

  return {
    mesh,
    shimmer,
    update(frame: OrbAuraFrame) {
      // Wrapping keeps shader float precision; the one discontinuity is hours apart.
      shimmer.time = (shimmer.time + frame.shimmer * SHIMMER_SPEED * frame.delta) % 10000;
      shimmer.amount = frame.shimmerAmount * (1 - frame.error);
      shimmer.level = orbShimmerLevel(shimmer.time) * shimmer.amount;
      if (frame.color) uniforms.uColor.value.set(frame.color);
      else if (mode !== frame.mode) {
        mode = frame.mode;
        uniforms.uColor.value.set(AURA_COLOR[mode]);
      }
      uniforms.uStrength.value = frame.glow * (frame.mode === "dark" ? 0.32 : 0.28) * (1 - frame.error);
      uniforms.uTime.value = shimmer.time;
      uniforms.uShimmer.value = shimmer.amount;
      uniforms.uLevel.value = shimmer.level;
      mesh.position.copy(frame.center);
      mesh.quaternion.copy(frame.camera.quaternion);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
