// Import only from the lazy orb renderer, never the shared barrel.
// Both platforms execute this exact shader; native only adapts PNG loading.
import * as THREE from 'three';
import { layoutClockGlyphs, type ClockGlassReadout, type ClockGlyphMetrics } from './clock-glyphs';

const vertex = `
varying vec2 vUv;
varying vec2 vScreen;
void main() {
  vUv = uv;
  vScreen = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const baseFragment = `
uniform sampler2D uOrb;
uniform float uScrim;
varying vec2 vUv;
void main() {
  vec4 orb = texture2D(uOrb, vUv);
  float shade = (1.0 - smoothstep(0.02, 0.26, distance(vUv, vec2(0.5)))) * uScrim;
  gl_FragColor = vec4(orb.rgb / max(orb.a, 0.001) * (1.0 - shade), orb.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}`;
export const CLOCK_GLASS_FRAGMENT = `
uniform sampler2D uOrb;
uniform sampler2D uAtlas;
uniform vec2 uAtlasTexel;
uniform vec2 uPixel;
uniform vec2 uLight;
varying vec2 vUv;
varying vec2 vScreen;
float field(vec2 uv) {
  vec3 s = texture2D(uAtlas, uv).rgb;
  return max(min(s.r, s.g), min(max(s.r, s.g), s.b)) - 0.5;
}
void main() {
  float d = field(vUv);
  float aa = max(fwidth(d), 0.001);
  float coverage = smoothstep(-aa, aa, d);
  if (coverage < 0.001) discard;
  vec2 grad = vec2(field(vUv + vec2(uAtlasTexel.x, 0.0)) - field(vUv - vec2(uAtlasTexel.x, 0.0)),
    field(vUv - vec2(0.0, uAtlasTexel.y)) - field(vUv + vec2(0.0, uAtlasTexel.y)));
  vec2 normal = grad / max(length(grad), 0.00001);
  float edge = 1.0 - smoothstep(0.02, 0.32, d);
  vec2 refracted = clamp(vScreen + normal * mix(0.015, 0.028, edge), 0.0, 1.0);
  vec3 glass = texture2D(uOrb, refracted).rgb * 0.4;
  glass += texture2D(uOrb, refracted + uPixel * vec2(1.5, 0.0)).rgb * 0.15;
  glass += texture2D(uOrb, refracted - uPixel * vec2(1.5, 0.0)).rgb * 0.15;
  glass += texture2D(uOrb, refracted + uPixel * vec2(0.0, 1.5)).rgb * 0.15;
  glass += texture2D(uOrb, refracted - uPixel * vec2(0.0, 1.5)).rgb * 0.15;
  // White tint, dark inner rim and directional fresnel preserve bright-sky legibility.
  glass = mix(glass, vec3(1.0), 0.48);
  glass *= 1.0 - edge * 0.72;
  float facing = max(dot(-normal, normalize(uLight + vec2(0.0001))), 0.0);
  glass += vec3(1.0) * pow(edge, 3.0) * (0.12 + 0.8 * facing);
  gl_FragColor = vec4(glass, coverage);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Orb target then base + glyph quads in one composite render pass.
 * Text changes only the preallocated vertex buffer, never the atlas texture.
 */
export function createClockGlass(renderer: THREE.WebGLRenderer, atlas: THREE.Texture, metrics: ClockGlyphMetrics) {
  if (!renderer.extensions.has('EXT_color_buffer_float')) throw new Error('clock_float_target_unavailable');
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false });
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const base = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: baseFragment,
    depthTest: false, depthWrite: false, uniforms: { uOrb: { value: target.texture }, uScrim: { value: 0.35 } } });
  const plane = new THREE.PlaneGeometry(2, 2);
  const background = new THREE.Mesh(plane, base);
  background.renderOrder = 0;
  scene.add(background);
  const uniforms = { uOrb: { value: target.texture }, uAtlas: { value: atlas },
    uAtlasTexel: { value: new THREE.Vector2(1 / metrics.width, 1 / metrics.height) },
    uPixel: { value: new THREE.Vector2() }, uLight: { value: new THREE.Vector2() } };
  const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: CLOCK_GLASS_FRAGMENT,
    transparent: true, depthTest: false, depthWrite: false, uniforms });
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(16 * 6 * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const uv = new THREE.BufferAttribute(new Float32Array(16 * 6 * 2), 2).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position); geometry.setAttribute('uv', uv);
  const glyphs = new THREE.Mesh(geometry, material);
  glyphs.frustumCulled = false; glyphs.renderOrder = 1;
  scene.add(glyphs);
  const bufferSize = new THREE.Vector2();
  let previous = '';
  return {
    render(orb: THREE.Scene, orbCamera: THREE.Camera, readout: ClockGlassReadout, size: number, light: readonly number[], dark: boolean) {
      renderer.getDrawingBufferSize(bufferSize);
      if (target.width !== bufferSize.x || target.height !== bufferSize.y) target.setSize(bufferSize.x, bufferSize.y);
      uniforms.uPixel.value.set(1 / bufferSize.x, 1 / bufferSize.y);
      uniforms.uLight.value.set(light[0] ?? 0, light[1] ?? 1);
      base.uniforms.uScrim!.value = dark ? 0.25 : 0.5;
      const key = `${readout.text}/${readout.fontSize}/${size}`;
      if (key !== previous) {
        previous = key;
        const layout = layoutClockGlyphs(readout.text, metrics);
        const unit = readout.fontSize * 2 / size;
        const centerY = (layout.minY + layout.maxY) / 2;
        let i = 0;
        for (const q of layout.quads.slice(0, 16)) {
          const x0 = (q.x - layout.width / 2) * unit, x1 = x0 + q.width * unit;
          const y0 = -(q.y - centerY) * unit, y1 = y0 - q.height * unit;
          for (const [x, y, u, v] of [[x0,y0,q.uv[0]!,q.uv[1]!], [x0,y1,q.uv[0]!,q.uv[3]!], [x1,y0,q.uv[2]!,q.uv[1]!],
            [x1,y0,q.uv[2]!,q.uv[1]!], [x0,y1,q.uv[0]!,q.uv[3]!], [x1,y1,q.uv[2]!,q.uv[3]!]]) {
            position.setXYZ(i, x!, y!, 0); uv.setXY(i, u!, v!); i++;
          }
        }
        position.needsUpdate = true; uv.needsUpdate = true; geometry.setDrawRange(0, i);
      }
      renderer.setRenderTarget(target); renderer.render(orb, orbCamera);
      renderer.setRenderTarget(null); renderer.render(scene, camera);
    },
    dispose() { target.dispose(); plane.dispose(); geometry.dispose(); base.dispose(); material.dispose(); },
  };
}
