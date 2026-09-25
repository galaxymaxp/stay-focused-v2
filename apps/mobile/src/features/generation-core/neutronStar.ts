import * as THREE from "three";

export const STAR_RADIUS = 0.19;
/** Radians per second at full spin (generating). */
export const STAR_MAX_SPIN = 2.6;
// A pulsar's magnetic axis is misaligned with its spin axis, so hot spots and
// beams sweep around as it turns. That sweep is what makes the spin legible.
const MAGNETIC_TILT = 0.62;

const STAR_VERTEX = `
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

const STAR_FRAGMENT = `
uniform float uHeat;
uniform float uError;
uniform vec3 uTint;
uniform vec3 uMagnetic;
varying vec3 vObject;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vec3 p = vObject;
  float facing = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
  float polar = dot(p, uMagnetic);
  float spots = pow(max(polar, 0.0), 9.0) + pow(max(-polar, 0.0), 9.0);
  // Surface currents live in object space, so they turn with the star.
  float current = sin(p.x * 9.0 + sin(p.y * 6.0) * 1.6) * sin(p.z * 8.0 - p.y * 3.0) * 0.5 + 0.5;
  // Body stays below white so the hot spots and currents that show the spin remain readable.
  vec3 color = mix(uTint, vec3(1.0), pow(facing, 0.9) * 0.62);
  color *= (0.8 + current * 0.34) * (0.5 + uHeat * 0.62);
  color += vec3(1.0) * spots * (0.9 + uHeat * 1.9);
  color = mix(color, vec3(0.09 + facing * 0.07), uError);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const BEAM_VERTEX = `
varying float vAlong;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vAlong = uv.y;
  vNormal = normalize(normalMatrix * normal);
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}`;

const BEAM_FRAGMENT = `
uniform float uStrength;
uniform vec3 uColor;
varying float vAlong;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  // Brightest through the beam's middle, soft at its sides and far end.
  float facing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
  float fade = pow(1.0 - vAlong, 1.7);
  gl_FragColor = vec4(uColor, facing * facing * fade * uStrength);
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
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float radius = length(vUv - 0.5) * 2.0;
  float glow = exp(-radius * radius * uSpread) * (1.0 - smoothstep(0.72, 1.0, radius));
  gl_FragColor = vec4(uColor, glow * uStrength);
}`;

const TINTS = {
  dark: { limb: "#A9C2FF", corona: "#DCE6FF", halo: "#9DB5F5", beam: "#CFDDFF" },
  // Additive light composites as a cool tint over pale backgrounds and still brightens the darker ribbons.
  light: { limb: "#5F84D6", corona: "#C4D5FF", halo: "#9FB7EE", beam: "#B3C8FA" },
} as const;

export interface NeutronStarFrame {
  readonly delta: number;
  /** Eased share of STAR_MAX_SPIN. */
  readonly spin: number;
  readonly heat: number;
  readonly beam: number;
  readonly glow: number;
  readonly error: number;
  readonly mode: "light" | "dark";
  readonly camera: THREE.Camera;
}

function glowSprite(size: number, spread: number) {
  const uniforms = { uStrength: { value: 0 }, uSpread: { value: spread }, uColor: { value: new THREE.Color() } };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return { mesh: new THREE.Mesh(new THREE.PlaneGeometry(size, size), material), uniforms, material };
}

/**
 * The luminous centre of the Knowledge Core. `star` belongs inside the moving
 * body; `glows` are camera-facing and belong to the scene root.
 */
export function createNeutronStar() {
  const magnetic = new THREE.Vector3(-Math.sin(MAGNETIC_TILT), Math.cos(MAGNETIC_TILT), 0);
  const starUniforms = {
    uHeat: { value: 0 }, uError: { value: 0 }, uTint: { value: new THREE.Color() }, uMagnetic: { value: magnetic },
  };
  const sphereGeometry = new THREE.IcosahedronGeometry(STAR_RADIUS, 5);
  const starMaterial = new THREE.ShaderMaterial({ uniforms: starUniforms, vertexShader: STAR_VERTEX, fragmentShader: STAR_FRAGMENT });
  const sphere = new THREE.Mesh(sphereGeometry, starMaterial);

  const beamUniforms = { uStrength: { value: 0 }, uColor: { value: new THREE.Color() } };
  const beamGeometry = new THREE.CylinderGeometry(0.15, 0.035, 0.84, 28, 1, true);
  beamGeometry.translate(0, 0.42, 0);
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: beamUniforms, vertexShader: BEAM_VERTEX, fragmentShader: BEAM_FRAGMENT,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const north = new THREE.Mesh(beamGeometry, beamMaterial);
  const south = new THREE.Mesh(beamGeometry, beamMaterial);
  south.rotation.z = Math.PI;
  north.renderOrder = 2;
  south.renderOrder = 2;
  const magnetosphere = new THREE.Group();
  magnetosphere.rotation.z = MAGNETIC_TILT;
  magnetosphere.add(north, south);

  const spinner = new THREE.Group();
  spinner.add(sphere, magnetosphere);
  const star = new THREE.Group();
  star.rotation.set(0.24, 0, -0.2);
  star.add(spinner);

  // Corona hides behind ribbons in front of the star; the faint halo scatters over everything.
  const corona = glowSprite(0.95, 8);
  corona.mesh.renderOrder = 2;
  const halo = glowSprite(2.3, 4.2);
  halo.material.depthTest = false;
  halo.mesh.renderOrder = 6;

  const center = new THREE.Vector3();
  let mode: "light" | "dark" | null = null;

  return {
    star,
    glows: [corona.mesh, halo.mesh] as const,
    /** World-space centre, valid after update(). */
    center,
    update(frame: NeutronStarFrame) {
      spinner.rotation.y = (spinner.rotation.y + frame.spin * STAR_MAX_SPIN * frame.delta) % (Math.PI * 2);
      if (mode !== frame.mode) {
        mode = frame.mode;
        const tints = TINTS[mode];
        starUniforms.uTint.value.set(tints.limb);
        corona.uniforms.uColor.value.set(tints.corona);
        halo.uniforms.uColor.value.set(tints.halo);
        beamUniforms.uColor.value.set(tints.beam);
      }
      const dark = frame.mode === "dark";
      const live = 1 - frame.error;
      starUniforms.uHeat.value = frame.heat;
      starUniforms.uError.value = frame.error;
      beamUniforms.uStrength.value = frame.beam * (dark ? 0.55 : 0.5) * live;
      corona.uniforms.uStrength.value = frame.glow * (dark ? 0.95 : 0.85) * live;
      halo.uniforms.uStrength.value = frame.glow * (dark ? 0.12 : 0.16) * live;
      star.getWorldPosition(center);
      for (const glow of [corona.mesh, halo.mesh]) {
        glow.position.copy(center);
        glow.quaternion.copy(frame.camera.quaternion);
      }
    },
    dispose() {
      sphereGeometry.dispose(); starMaterial.dispose();
      beamGeometry.dispose(); beamMaterial.dispose();
      for (const glow of [corona, halo]) { glow.mesh.geometry.dispose(); glow.material.dispose(); }
    },
  };
}
