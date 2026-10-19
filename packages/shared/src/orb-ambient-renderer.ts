import * as THREE from 'three';
import { orbAmbientEase } from './orb-ambient';

/** The final body uniforms, after palette, day tones and state are resolved. */
export interface OrbAmbientSource {
  uTime: { value: number }; uLife: { value: number }; uStir: { value: number };
  uGlow: { value: number }; uError: { value: number };
  uSpin: { value: THREE.Matrix3 }; uLight: { value: THREE.Vector3 };
  uBase: { value: THREE.Color }; uDeep: { value: THREE.Color };
  uGlowColor: { value: THREE.Color };
}

const SIZE = 2.92; // Inside the existing camera bounds; no layout or backing-size change.
const VERTEX = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAGMENT = `
uniform float uTime, uLife, uStir, uStrength, uPaper;
uniform mat3 uSpin;
uniform vec3 uLight, uBase, uDeep, uGlowColor;
varying vec2 vUv;
// Same folded liquid field as the body. Four wide directional samples approximate
// the emitted colors; there is no independent ambient clock or brightness pulse.
float liquid(vec3 q) {
  float t = uTime;
  float turbulence = 0.3 + 0.45 * uLife + uStir * 0.35;
  q *= 1.45;
  q += turbulence * sin(q.yzx * 1.7 + vec3(t * 0.61, t * 0.47, t * 0.53));
  q += turbulence * 0.55 * sin(q.zxy * 3.1 - vec3(t * 0.37, t * 0.71, t * 0.43));
  return sin(dot(q, vec3(1.25, 0.92, 1.08)));
}
vec3 spill(vec2 p, vec2 direction) {
  vec3 x = vec3(direction * 0.62, 0.32);
  float sheet = smoothstep(0.3, 0.9, liquid(uSpin * x));
  vec3 toLight = x - uLight;
  float lit = exp(-dot(toLight, toLight) * 1.8);
  vec3 color = mix(uDeep, uBase, 0.35 + sheet * 0.65) * 0.65 + uGlowColor * lit * 0.35;
  vec2 d = p - direction * (0.64 + sheet * 0.12);
  return color * exp(-dot(d, d) * 1.65);
}
void main() {
  vec2 p = (vUv - 0.5) * 2.92;
  float r = length(p);
  // Keep the glass unchanged and finish the smooth fade before the canvas edge.
  float mask = smoothstep(0.975, 1.24, r) * (1.0 - smoothstep(1.02, 1.45, r));
  vec3 color = spill(p, vec2(-0.8, 0.6)) + spill(p, vec2(0.8, 0.6))
    + spill(p, vec2(-0.8, -0.6)) + spill(p, vec2(0.8, -0.6));
  float alpha = mask * uStrength;
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // On paper, retain the source hue as a pale tint rather than a gray shadow.
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), uPaper * 0.88);
  gl_FragColor.rgb *= gl_FragColor.a;
}`;

/** One cheap plane in the existing scene. No readback, render target or scheduler. */
export function createOrbAmbient() {
  const uniforms = {
    uTime: { value: 0 }, uLife: { value: 0 }, uStir: { value: 0 },
    uSpin: { value: new THREE.Matrix3() }, uLight: { value: new THREE.Vector3() },
    uBase: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() },
    uGlowColor: { value: new THREE.Color() }, uStrength: { value: 0 }, uPaper: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX,
    fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    premultipliedAlpha: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), material);
  mesh.renderOrder = 0;
  let initialized = false, disposed = false;
  return {
    mesh,
    update(source: OrbAmbientSource, delta: number, mode: 'light' | 'dark', reducedMotion: boolean) {
      if (disposed) return;
      const ease = initialized ? orbAmbientEase(delta, reducedMotion) : 1;
      initialized = true;
      uniforms.uPaper.value = mode === 'light' ? 1 : 0;
      uniforms.uTime.value = source.uTime.value;
      uniforms.uLife.value = source.uLife.value;
      uniforms.uStir.value = source.uStir.value;
      uniforms.uSpin.value.copy(source.uSpin.value);
      uniforms.uLight.value.copy(source.uLight.value);
      if (ease === 1) {
        uniforms.uBase.value.copy(source.uBase.value);
        uniforms.uDeep.value.copy(source.uDeep.value);
        uniforms.uGlowColor.value.copy(source.uGlowColor.value);
      } else {
        uniforms.uBase.value.lerp(source.uBase.value, ease);
        uniforms.uDeep.value.lerp(source.uDeep.value, ease);
        uniforms.uGlowColor.value.lerp(source.uGlowColor.value, ease);
      }
      const strength = Math.min(1.4, source.uGlow.value) * (mode === 'dark' ? 0.44 : 0.18) * (1 - source.uError.value);
      uniforms.uStrength.value += (strength - uniforms.uStrength.value) * ease;
      // Failure is allowed to settle without leaving an autonomous ambient tail.
      if (source.uError.value === 1) uniforms.uStrength.value = 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true; mesh.geometry.dispose(); material.dispose();
    },
  };
}
