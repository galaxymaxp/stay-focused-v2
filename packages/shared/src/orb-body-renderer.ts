import * as THREE from "three";

import { orbAppearance, ORB_GLASS_MATERIAL } from './orb-appearance';
import { ORB_MAX_IMPULSES, ORB_RIPPLE_MS, ORB_WAVE_AMPLITUDE, ORB_WAVE_CAP, orbWaveGain, type OrbWave } from './orb-interaction';

export const ORB_RADIUS = 0.95;

const VERTEX = `
uniform int uWaveCount;
uniform float uWaveGain;
uniform vec4 uWaves[${ORB_MAX_IMPULSES}];
varying vec3 vNormal;
varying vec3 vWorldPosition;
float rippleHeight(vec3 n) {
  float height = 0.0;
  for (int i = 0; i < ${ORB_MAX_IMPULSES}; i++) {
    if (i >= uWaveCount) break;
    float t = uWaves[i].w;
    if (t > 0.0 && t < ${ORB_RIPPLE_MS / 1000}) {
      float phase = t / ${ORB_RIPPLE_MS / 1000};
      float d = acos(clamp(dot(n, uWaves[i].xyz), -1.0, 1.0));
      float packet = 1.0 - smoothstep(0.15, 0.8, abs(d - 3.14159265 * phase));
      float envelope = pow(sin(3.14159265 * phase), 2.0) * exp(-1.5 * t);
      height += ${ORB_WAVE_AMPLITUDE} * envelope * pow(sin(6.0 * d - 6.0 * 3.14159265 * phase), 2.0) * packet;
    }
  }
  // Smooth signed saturation, including the differentiated normal.
  float e = exp(2.0 * height * uWaveGain / ${ORB_WAVE_CAP});
  return ${ORB_WAVE_CAP} * (e - 1.0) / (e + 1.0);
}
void main() {
  float height = rippleHeight(normal);
  vec3 displaced = position + normal * height;
  vec3 surfaceNormal = normal;
  if (uWaveCount > 0) {
    vec3 tangent = normalize(cross(normal, abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 bitangent = cross(normal, tangent);
    float dx = (rippleHeight(normalize(normal + tangent * 0.002)) - rippleHeight(normalize(normal - tangent * 0.002))) / 0.004;
    float dy = (rippleHeight(normalize(normal + bitangent * 0.002)) - rippleHeight(normalize(normal - bitangent * 0.002))) / 0.004;
    surfaceNormal -= (tangent * dx + bitangent * dy) / (length(position) + height);
  }
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * surfaceNormal);
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
uniform vec4 uGlass;
uniform float uLightMode;
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
    float density = sheet * uGlass.x;
    vec3 toLight = x - uLight;
    float centre = exp(-dot(toLight, toLight) * 3.2);
    vec3 emit = mix(uDeep, uBase, sheet) * (uGlass.y + centre * light * uGlass.z);
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
  // The studio reflection defines clear glass on paper, separately from the
  // rotating liquid. No opaque base or additional render pass is needed.
  float specular = pow(max(dot(reflect(-v, n), normalize(vec3(-0.55, 0.72, 0.42))), 0.0), 48.0) * uLightMode;
  color += vec3(0.22) * specular;
  float alpha = clamp(cover + fresnel * uGlass.w + caustic * 0.08 + specular * 0.18, 0.0, 1.0);
  color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))) * 0.45, uError);
  // Accumulated light is already weighted by coverage; un-weight it for tone mapping, then re-apply.
  gl_FragColor = vec4(color / max(alpha, 0.001), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}`;

// Keep the orb program byte-for-byte unchanged. A slab changes only the ray's
// exit intersection and containment/fill; studio(), liquid(), Fresnel,
// refraction, caustics, accumulation and output transforms are the same optics.
const SLAB_FRAGMENT = FRAGMENT
  .replace('uniform vec3 uCenter;', 'uniform vec3 uCenter;\nuniform vec3 uHalfSize;\nuniform float uCornerRadius;\nuniform float uSlosh;')
  .replace('float travel = max(-b + sqrt(max(b * b - dot(oc, oc) + uRadius * uRadius, 0.0)), 0.0);', `
  vec3 exits = (sign(rd) * uHalfSize - oc) / (sign(rd) * max(abs(rd), vec3(0.00001)));
  float travel = max(0.0, min(exits.x, min(exits.y, exits.z)));`)
  .replace('(oc + rd * travel * ((float(i) + 0.5) / 5.0)) / uRadius', '(oc + rd * travel * ((float(i) + 0.5) / 5.0)) / uHalfSize')
  .replace('float held = 1.0 - smoothstep(0.5, 0.7, r2);', `
    vec2 p = x.xy * uHalfSize.xy;
    float edge = length(max(abs(p) - (uHalfSize.xy - uCornerRadius), 0.0)) - uCornerRadius;
    float held = (1.0 - smoothstep(-0.035, 0.0, edge)) * (1.0 - smoothstep(0.85, 1.0, abs(x.z)));`)
  .replace('float sheet = smoothstep(0.3, 0.9, liquid(uSpin * x)) * held;', `
    float flow = liquid(uSpin * x);
    float surface = -0.10 + uSlosh * x.x + 0.045 * flow;
    float filled = 1.0 - smoothstep(surface - 0.035, surface + 0.035, x.y);
    float sheet = (0.35 + 0.65 * smoothstep(0.3, 0.9, flow)) * held * filled;`)
  // The slab's shallow bevel needs a wider key reflection to read at 48px.
  .replace('48.0) * uLightMode', '24.0)');

export interface OrbSlabVolume {
  readonly halfSize: THREE.Vector3;
  readonly cornerRadius: number;
}

export interface OrbBodyFrame {
  readonly waves?: readonly OrbWave[];
  /** Pass only for idle: generation states retain their authoritative appearance. */
  readonly idleColor?: string;
  readonly time: number;
  readonly life: number;
  readonly stir: number;
  readonly glow: number;
  readonly level: number;
  readonly error: number;
  readonly spin: THREE.Matrix3;
  readonly mode: "light" | "dark";
  /** Optional inner light position in ball radii; defaults to the centre. */
  readonly light?: { readonly x: number; readonly y: number; readonly z: number };
}

/** A clear glass ball holding luminous liquid, lit from its centre. */
export function createOrbBody(geometry: THREE.BufferGeometry = new THREE.SphereGeometry(ORB_RADIUS, 96, 64), slab?: OrbSlabVolume) {
  const uniforms = {
    uTime: { value: 0 }, uLife: { value: 0 }, uStir: { value: 0 }, uRadius: { value: ORB_RADIUS },
    uSpin: { value: new THREE.Matrix3() }, uCenter: { value: new THREE.Vector3() },
    uGlow: { value: 0 }, uLevel: { value: 0 }, uError: { value: 0 },
    uBase: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uGlowColor: { value: new THREE.Color() },
    uEnvFloor: { value: new THREE.Color() }, uEnvSky: { value: new THREE.Color() },
    uGlass: { value: new THREE.Vector4() }, uLightMode: { value: 0 },
    uLight: { value: new THREE.Vector3() },
    uWaveCount: { value: 0 }, uWaveGain: { value: 1 },
    uWaves: { value: Array.from({ length: ORB_MAX_IMPULSES }, () => new THREE.Vector4(0, 0, 1, -1)) },
    uHalfSize: { value: slab?.halfSize.clone() ?? new THREE.Vector3(1, 1, 1) },
    uCornerRadius: { value: slab?.cornerRadius ?? 0 }, uSlosh: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader: slab ? SLAB_FRAGMENT : FRAGMENT,
    transparent: true, depthWrite: false, premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;

  return {
    mesh,
    uniforms,
    update(frame: OrbBodyFrame) {
      const tones = orbAppearance(frame.mode, frame.idleColor);
      uniforms.uBase.value.set(tones.base);
      uniforms.uDeep.value.set(tones.deep);
      uniforms.uGlowColor.value.set(tones.glow);
      const glass = ORB_GLASS_MATERIAL[frame.mode];
      uniforms.uEnvFloor.value.set(glass.floor);
      uniforms.uEnvSky.value.set(glass.sky);
      uniforms.uGlass.value.set(glass.density, glass.ambient, glass.emission, glass.rimOpacity);
      uniforms.uLightMode.value = frame.mode === 'light' ? 1 : 0;
      uniforms.uWaveGain.value = orbWaveGain(frame.waves ?? []);
      uniforms.uWaveCount.value = Math.min(ORB_MAX_IMPULSES, frame.waves?.length ?? 0);
      for (let i = 0; i < ORB_MAX_IMPULSES; i++) {
        const wave = frame.waves?.[i];
        uniforms.uWaves.value[i]!.set(wave?.direction.x ?? 0, wave?.direction.y ?? 0, wave?.direction.z ?? 1, wave?.time ?? -1);
      }
      uniforms.uLight.value.set(frame.light?.x ?? 0, frame.light?.y ?? 0, frame.light?.z ?? 0);
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
