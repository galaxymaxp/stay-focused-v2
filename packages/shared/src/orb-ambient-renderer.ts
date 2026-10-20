import * as THREE from 'three';
import { orbAmbientEase } from './orb-ambient';

/** The final body uniforms, after palette, day tones and state are resolved. */
export interface OrbAmbientSource {
  uGlow: { value: number }; uError: { value: number };
}

const SIZE = 2.92; // Inside the existing camera bounds; no layout or backing-size change.
const VERTEX = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAGMENT = `
uniform sampler2D uSource;
uniform float uStrength;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * 2.92;
  float r = length(p);
  float mask = smoothstep(0.975, 1.20, r) * (1.0 - smoothstep(1.06, 1.44, r));
  // Expand the visible inner body into the margin, with a small spatial blur.
  // Averaging samples (rather than adding lights) retains dim source sectors.
  vec2 uv = 0.5 + p * 0.18;
  vec4 source = texture2D(uSource, uv) * 0.20;
  for (int i = 0; i < 8; i++) {
    float angle = float(i) * 0.785398163;
    source += texture2D(uSource, uv + vec2(cos(angle), sin(angle)) * 0.025) * 0.10;
  }
  gl_FragColor = vec4(source.rgb / max(source.a, 0.001), mask * uStrength * source.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}`;

/** Bounded 64px capture of the existing body; no CPU readback or separate loop. */
export function createOrbAmbient() {
  const target = new THREE.WebGLRenderTarget(64, 64, { depthBuffer: false, stencilBuffer: false });
  target.texture.name = 'orb-ambient-source';
  const uniforms = {
    uSource: { value: target.texture },
    uStrength: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX,
    fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    premultipliedAlpha: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), material);
  mesh.renderOrder = 0;
  let initialized = false, disposed = false;
  return {
    mesh,
    capture(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
      if (disposed) return;
      const previous = renderer.getRenderTarget();
      const visible = mesh.visible;
      // Same body/material/camera and final uniforms; never capture this plane.
      mesh.visible = false;
      try { renderer.setRenderTarget(target); renderer.render(scene, camera); }
      finally { mesh.visible = visible; renderer.setRenderTarget(previous); }
    },
    update(source: OrbAmbientSource, delta: number, mode: 'light' | 'dark', reducedMotion: boolean) {
      if (disposed) return;
      const ease = initialized ? orbAmbientEase(delta, reducedMotion) : 1;
      initialized = true;
      const strength = Math.min(1.4, source.uGlow.value) * (mode === 'dark' ? 0.9 : 0.5) * (1 - source.uError.value);
      uniforms.uStrength.value += (strength - uniforms.uStrength.value) * ease;
      // Failure is allowed to settle without leaving an autonomous ambient tail.
      if (source.uError.value === 1) uniforms.uStrength.value = 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true; mesh.geometry.dispose(); material.dispose(); target.dispose();
    },
  };
}
