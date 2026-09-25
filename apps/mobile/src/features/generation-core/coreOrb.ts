import * as THREE from "three";

export const ORB_RADIUS = 0.19;
/** Radians per second at full spin (generating). */
export const ORB_MAX_SPIN = 2.6;
/** Shimmer clock units per second at full shimmer (generating). */
export const SHIMMER_SPEED = 2.2;
// Broad brighter lobes on a tilted axis turn with the orb, so its spin stays readable.
const LOBE_TILT = 0.62;

const ORB_VERTEX = `
varying vec3 vObject;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vObject = normalize(position);
  vNormal = normalize(normalMatrix * vObject);
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}`;

const ORB_FRAGMENT = `
uniform float uHeat;
uniform float uLevel;
uniform float uError;
uniform vec3 uTint;
uniform vec3 uLobe;
varying vec3 vObject;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vec3 p = vObject;
  float facing = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
  float lobes = pow(abs(dot(p, uLobe)), 3.0);
  float current = sin(p.x * 5.0 + sin(p.y * 4.0) * 1.2) * sin(p.z * 4.5 - p.y * 2.0) * 0.5 + 0.5;
  vec3 color = mix(uTint, vec3(1.0), pow(facing, 0.9) * 0.66);
  color *= (0.84 + current * 0.18 + lobes * 0.4) * (0.5 + uHeat * 0.62) * (1.0 + uLevel * 0.38);
  color = mix(color, vec3(0.09 + facing * 0.07), uError);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const GLOW_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const GLOW_FRAGMENT = `
uniform float uStrength;
uniform float uSpread;
uniform float uTime;
uniform float uShimmer;
uniform float uLevel;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float angle = atan(p.y, p.x);
  // The glow's edge wavers around the orb like a flame instead of holding a perfect circle.
  float wobble = sin(angle * 3.0 + uTime * 1.7) * 0.5 + sin(angle * 5.0 - uTime * 2.3) * 0.3 + sin(angle * 2.0 + uTime * 0.9) * 0.2;
  float radius = length(p) * 2.0;
  float warped = radius * (1.0 - wobble * 0.17 * uShimmer);
  float glow = exp(-warped * warped * uSpread) * (1.0 + uLevel * 0.55);
  gl_FragColor = vec4(uColor, glow * (1.0 - smoothstep(0.72, 1.0, radius)) * uStrength);
}`;

// Additive light composites as a cool tint over pale backgrounds and still brightens the darker ribbons.
const TINTS = {
  dark: { limb: "#A9C2FF", corona: "#DCE6FF", halo: "#9DB5F5" },
  light: { limb: "#5F84D6", corona: "#C4D5FF", halo: "#9FB7EE" },
} as const;

/** The orb's wavering light; shared with every surface it lights. */
export interface OrbShimmer {
  /** Shimmer clock, advancing with the state's shimmer speed. */
  time: number;
  /** How strongly the light wavers, 0 for a steady glow. */
  amount: number;
  /** Current overall brightness offset, within ±amount. */
  level: number;
}

export interface CoreOrbFrame {
  readonly delta: number;
  /** Eased share of ORB_MAX_SPIN. */
  readonly spin: number;
  /** Eased share of SHIMMER_SPEED. */
  readonly shimmer: number;
  /** Shimmer strength, 0–1. */
  readonly shimmerAmount: number;
  readonly heat: number;
  readonly glow: number;
  readonly error: number;
  readonly mode: "light" | "dark";
  readonly camera: THREE.Camera;
}

/** Overlapping rhythms that never line up, so the light wavers without a regular beat. Range ±1. */
export function orbShimmerLevel(time: number): number {
  return Math.sin(time * 2.1) * 0.5 + Math.sin(time * 3.7 + 1.3) * 0.3 + Math.sin(time * 5.9 + 0.4) * 0.2;
}

function glowSprite(size: number, spread: number) {
  const uniforms = {
    uStrength: { value: 0 }, uSpread: { value: spread }, uTime: { value: 0 }, uShimmer: { value: 0 },
    uLevel: { value: 0 }, uColor: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return { mesh: new THREE.Mesh(new THREE.PlaneGeometry(size, size), material), uniforms, material };
}

/**
 * The luminous centre of the Knowledge Core. `orb` belongs inside the moving
 * body; `glows` are camera-facing and belong to the scene root.
 */
export function createCoreOrb() {
  const orbUniforms = {
    uHeat: { value: 0 }, uLevel: { value: 0 }, uError: { value: 0 }, uTint: { value: new THREE.Color() },
    uLobe: { value: new THREE.Vector3(-Math.sin(LOBE_TILT), Math.cos(LOBE_TILT), 0) },
  };
  const sphereGeometry = new THREE.IcosahedronGeometry(ORB_RADIUS, 5);
  const orbMaterial = new THREE.ShaderMaterial({ uniforms: orbUniforms, vertexShader: ORB_VERTEX, fragmentShader: ORB_FRAGMENT });
  const spinner = new THREE.Mesh(sphereGeometry, orbMaterial);
  const orb = new THREE.Group();
  orb.rotation.set(0.24, 0, -0.2);
  orb.add(spinner);

  // Corona hides behind ribbons in front of the orb; the faint halo scatters over everything.
  const corona = glowSprite(1.1, 8);
  corona.mesh.renderOrder = 2;
  const halo = glowSprite(2.3, 4.2);
  halo.material.depthTest = false;
  halo.mesh.renderOrder = 6;

  const center = new THREE.Vector3();
  const shimmer: OrbShimmer = { time: 0, amount: 0, level: 0 };
  let mode: "light" | "dark" | null = null;

  return {
    orb,
    glows: [corona.mesh, halo.mesh] as const,
    /** World-space centre, valid after update(). */
    center,
    /** Current light waver, valid after update(). */
    shimmer,
    update(frame: CoreOrbFrame) {
      spinner.rotation.y = (spinner.rotation.y + frame.spin * ORB_MAX_SPIN * frame.delta) % (Math.PI * 2);
      // Wrapping keeps shader float precision; the one discontinuity is hours apart.
      shimmer.time = (shimmer.time + frame.shimmer * SHIMMER_SPEED * frame.delta) % 10000;
      shimmer.amount = frame.shimmerAmount * (1 - frame.error);
      shimmer.level = orbShimmerLevel(shimmer.time) * shimmer.amount;
      if (mode !== frame.mode) {
        mode = frame.mode;
        const tints = TINTS[mode];
        orbUniforms.uTint.value.set(tints.limb);
        corona.uniforms.uColor.value.set(tints.corona);
        halo.uniforms.uColor.value.set(tints.halo);
      }
      const dark = frame.mode === "dark";
      const live = 1 - frame.error;
      orbUniforms.uHeat.value = frame.heat;
      orbUniforms.uLevel.value = shimmer.level;
      orbUniforms.uError.value = frame.error;
      corona.uniforms.uStrength.value = frame.glow * (dark ? 0.95 : 0.85) * live;
      halo.uniforms.uStrength.value = frame.glow * (dark ? 0.12 : 0.16) * live;
      orb.getWorldPosition(center);
      for (const glow of [corona, halo]) {
        glow.uniforms.uTime.value = shimmer.time;
        glow.uniforms.uShimmer.value = shimmer.amount;
        glow.uniforms.uLevel.value = shimmer.level;
        glow.mesh.position.copy(center);
        glow.mesh.quaternion.copy(frame.camera.quaternion);
      }
    },
    dispose() {
      sphereGeometry.dispose(); orbMaterial.dispose();
      for (const glow of [corona, halo]) { glow.mesh.geometry.dispose(); glow.material.dispose(); }
    },
  };
}
