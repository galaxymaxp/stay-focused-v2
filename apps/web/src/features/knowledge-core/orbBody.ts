import * as THREE from "three";

export const ORB_RADIUS = 0.95;

const VERTEX = `
varying vec3 vNormal;
varying vec3 vWorldPosition;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = `
uniform vec3 uCenter;
uniform float uRadius;
uniform mat3 uSpin;
uniform float uTime;
uniform float uLife;
uniform float uStir;
uniform float uGlow;
uniform float uLevel;
uniform float uError;
uniform vec3 uBase;
uniform vec3 uDeep;
uniform vec3 uGlowColor;
uniform vec3 uEnvFloor;
uniform vec3 uEnvSky;
// Where the inner light sits, in ball radii from the centre (zero: the centre).
uniform vec3 uLight;
varying vec3 vNormal;
varying vec3 vWorldPosition;

// A dim studio for the glass to reflect: a floor, a sky and a cool rim light. No spotlight.
vec3 studio(vec3 r) {
  float sky = smoothstep(-0.2, 0.8, r.y);
  float rim = smoothstep(0.82, 0.97, dot(r, normalize(vec3(0.9, -0.2, -0.38))));
  return mix(uEnvFloor, uEnvSky, sky) + uGlowColor * rim * 0.5;
}

// Sheets of liquid folded by two layers of flow. The state sets the turbulence; a touch stirs it.
float liquid(vec3 q) {
  float t = uTime;
  float turbulence = 0.3 + 0.45 * uLife + uStir * 0.35;
  q *= 1.45;
  q += turbulence * sin(q.yzx * 1.7 + vec3(t * 0.61, t * 0.47, t * 0.53));
  q += turbulence * 0.55 * sin(q.zxy * 3.1 - vec3(t * 0.37, t * 0.71, t * 0.43));
  return sin(dot(q, vec3(1.25, 0.92, 1.08)));
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorldPosition);
  float facing = max(dot(n, v), 0.0);
  float fresnel = 0.03 + 0.97 * pow(1.0 - facing, 5.0);

  // Follow the refracted view ray through the ball to where it leaves the glass.
  vec3 rd = refract(-v, n, 1.0 / 1.45);
  vec3 oc = vWorldPosition - uCenter;
  float b = dot(oc, rd);
  float travel = max(-b + sqrt(max(b * b - dot(oc, oc) + uRadius * uRadius, 0.0)), 0.0);
  float light = uGlow * (1.0 + uLevel * 0.6);
  vec3 glow = vec3(0.0);
  float cover = 0.0;
  for (int i = 0; i < 5; i++) {
    vec3 x = (oc + rd * travel * ((float(i) + 0.5) / 5.0)) / uRadius;
    float r2 = dot(x, x);
    // The liquid stays inside a smaller volume, leaving a clear band of glass at the edge.
    float held = 1.0 - smoothstep(0.5, 0.7, r2);
    float sheet = smoothstep(0.3, 0.9, liquid(uSpin * x)) * held;
    float density = sheet * 0.38;
    vec3 toLight = x - uLight;
    float centre = exp(-dot(toLight, toLight) * 3.2);
    vec3 emit = mix(uDeep, uBase, sheet) * (0.06 + centre * light * 2.1);
    glow += (1.0 - cover) * emit * density;
    cover += (1.0 - cover) * density;
  }
  // The light at the centre, seen through whatever liquid lies in front of it.
  vec3 ol = oc - uLight * uRadius;
  float closest = length(ol - rd * dot(ol, rd)) / uRadius;
  glow += (1.0 - cover * 0.55) * uGlowColor * exp(-closest * closest * 22.0) * light * 0.8;
  // Glass focuses the key light into a soft caustic on the far lower side.
  float caustic = smoothstep(0.55, 0.95, dot(n, normalize(vec3(0.42, -0.6, 0.68)))) * (1.0 - fresnel);
  glow += uGlowColor * caustic * (0.08 + light * 0.1);

  vec3 color = glow + studio(reflect(-v, n)) * fresnel;
  float alpha = clamp(cover + fresnel * 0.9 + caustic * 0.08, 0.0, 1.0);
  color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))) * 0.45, uError);
  // Accumulated light is already weighted by coverage; un-weight it for tone mapping, then re-apply.
  gl_FragColor = vec4(color / max(alpha, 0.001), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}`;

const TONES = {
  dark: {
    base: "#DDE3EE",
    deep: "#161B26",
    glow: "#CFDDFF",
    envFloor: "#010102",
    envSky: "#1C2028",
  },
  light: {
    base: "#E6EAF1",
    deep: "#4F5868",
    glow: "#9FB8F0",
    envFloor: "#2E333C",
    envSky: "#9AA2AF",
  },
} as const;

export interface OrbBodyFrame {
  readonly time: number;
  readonly life: number;
  readonly stir: number;
  readonly glow: number;
  readonly level: number;
  readonly error: number;
  readonly spin: THREE.Matrix3;
  readonly mode: "light" | "dark";
  /** Optional per-frame liquid and light colors (the Today day orb); defaults follow the theme. */
  readonly tones?: {
    readonly base: string;
    readonly deep: string;
    readonly glow: string;
  };
  /** Optional inner light position in ball radii; defaults to the centre. */
  readonly light?: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

/** A clear glass ball holding luminous liquid, lit from its centre. */
export function createOrbBody() {
  const uniforms = {
    uTime: { value: 0 },
    uLife: { value: 0 },
    uStir: { value: 0 },
    uRadius: { value: ORB_RADIUS },
    uSpin: { value: new THREE.Matrix3() },
    uCenter: { value: new THREE.Vector3() },
    uGlow: { value: 0 },
    uLevel: { value: 0 },
    uError: { value: 0 },
    uBase: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color() },
    uGlowColor: { value: new THREE.Color() },
    uEnvFloor: { value: new THREE.Color() },
    uEnvSky: { value: new THREE.Color() },
    uLight: { value: new THREE.Vector3() },
  };
  const geometry = new THREE.SphereGeometry(ORB_RADIUS, 96, 64);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  let mode: "light" | "dark" | null = null;

  return {
    mesh,
    uniforms,
    update(frame: OrbBodyFrame) {
      if (mode !== frame.mode) {
        mode = frame.mode;
        const tones = TONES[mode];
        uniforms.uBase.value.set(tones.base);
        uniforms.uDeep.value.set(tones.deep);
        uniforms.uGlowColor.value.set(tones.glow);
        uniforms.uEnvFloor.value.set(tones.envFloor);
        uniforms.uEnvSky.value.set(tones.envSky);
      }
      if (frame.tones) {
        uniforms.uBase.value.set(frame.tones.base);
        uniforms.uDeep.value.set(frame.tones.deep);
        uniforms.uGlowColor.value.set(frame.tones.glow);
      }
      if (frame.light)
        uniforms.uLight.value.set(frame.light.x, frame.light.y, frame.light.z);
      uniforms.uTime.value = frame.time;
      uniforms.uLife.value = frame.life;
      uniforms.uStir.value = frame.stir;
      uniforms.uGlow.value = frame.glow * (1 - frame.error);
      uniforms.uLevel.value = frame.level;
      uniforms.uError.value = frame.error;
      uniforms.uSpin.value.copy(frame.spin);
      mesh.getWorldPosition(uniforms.uCenter.value);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
