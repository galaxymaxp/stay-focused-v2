import * as THREE from "three";

// A periodic surface, not a scaled image. Both passes evaluate the same shape;
// the second widens only its edge falloff to suggest light spilling off the ribbon.
const VERTEX = `
uniform float uTime;
uniform float uIndex;
uniform float uHalo;
varying vec2 vRibbonUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
vec3 center(float t) {
  float phase = uIndex * 2.07;
  float slow = uTime * 0.23;
  float radius = 0.60 + sin(t * 3.0 + phase + slow) * 0.045;
  return vec3(
    cos(t) * radius,
    sin(t) * (0.44 + 0.045 * sin(slow * 0.73 + phase)),
    sin(t * 2.0 + phase + slow * 0.61) * 0.21 + sin(t * 3.0 - slow) * 0.025
  );
}
vec3 surface(float t, float across) {
  vec3 c = center(t);
  vec3 tangent = normalize(center(t + 0.005) - center(t - 0.005));
  vec3 radial = normalize(c);
  vec3 side = normalize(cross(tangent, radial));
  vec3 up = normalize(cross(side, tangent));
  float twist = sin(t * 2.0 + uTime * 0.19 + uIndex * 1.7) * 0.40;
  vec3 widthAxis = side * cos(twist) + up * sin(twist);
  float width = 0.135 * (1.0 + 0.13 * sin(t * 2.0 - uTime * 0.27 + uIndex * 2.1));
  width *= 1.0 + uHalo * 0.32;
  float crown = (1.0 - across * across) * 0.035;
  return c + widthAxis * across * width + up * (crown + uHalo * 0.003);
}
void main() {
  float t = uv.x * 6.28318530718;
  float across = uv.y * 2.0 - 1.0;
  vec3 p = surface(t, across);
  vec3 along = surface(t + 0.003, across) - p;
  vec3 widthward = surface(t, across + 0.003) - p;
  vNormal = normalize(normalMatrix * normalize(cross(along, widthward)));
  vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
  vViewPosition = -viewPosition.xyz;
  vRibbonUv = vec2(t, across);
  gl_Position = projectionMatrix * viewPosition;
}`;

const FRAGMENT = `
uniform float uTime;
uniform float uIndex;
uniform float uHalo;
uniform float uGlow;
uniform float uError;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uCoreView;
uniform vec3 uCoreColor;
uniform float uCoreLight;
uniform float uShimmerTime;
uniform float uShimmer;
uniform float uShimmerLevel;
varying vec2 vRibbonUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  float phase = vRibbonUv.x + uTime * 0.13 + uIndex * 2.094;
  vec3 weights = exp(2.0 * cos(vec3(phase, phase - 2.094, phase - 4.189)));
  weights /= weights.x + weights.y + weights.z;
  vec3 palette = uColorA * weights.x + uColorB * weights.y + uColorC * weights.z;
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 viewDir = normalize(vViewPosition);
  vec3 lightDir = normalize(vec3(-0.45, 0.8, 1.0));
  float diffuse = max(dot(n, lightDir), 0.0);
  float fresnel = pow(1.0 - abs(dot(n, viewDir)), 2.0);
  float specular = pow(max(dot(n, normalize(lightDir + viewDir)), 0.0), 38.0);
  // The body reflects light but does not emit a bright stripe from inside.
  vec3 color = palette * (0.17 + diffuse * 0.48 + fresnel * 0.09);
  color += vec3(1.0) * specular * 0.32;
  // The central star lights the ribbons from inside, strongest on its nearest faces.
  vec3 toCore = uCoreView + vViewPosition;
  float coreDistance = length(toCore);
  // Only faces turned toward the star catch it; outer faces keep their silver shading.
  float coreFacing = max(dot(n, toCore / coreDistance), 0.0) * 0.9 + 0.06;
  // The orb's light wavers: patches of it drift across the ribbons in different directions.
  vec3 outward = -toCore / coreDistance;
  float waver = sin(outward.x * 3.1 + outward.y * 1.7 + uShimmerTime * 1.9)
    * sin(outward.y * 2.6 - outward.z * 2.2 - uShimmerTime * 1.3);
  float shimmerLight = 1.0 + (waver * 0.7 + uShimmerLevel * 0.45) * uShimmer;
  color += uCoreColor * coreFacing * uCoreLight * shimmerLight / (1.0 + coreDistance * coreDistance * 14.0);
  color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))) * 0.26, uError);
  float alpha = 1.0;
  if (uHalo > 0.5) {
    // Expanded width is 1.32x: the real edge lies at 1/1.32 ~= .758.
    // Discard the interior so this pass cannot paint a stripe over the body.
    float outside = abs(vRibbonUv.y);
    if (outside < 0.758) discard;
    float fade = 1.0 - smoothstep(0.758, 1.0, outside);
    color = vec3(1.0);
    alpha = fade * fade * uGlow * 0.36 * (1.0 - uError) * (1.0 + waver * 0.45 * uShimmer);
  }
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createLivingRibbon(index: number) {
  const uniforms = {
    uTime: { value: 0 }, uIndex: { value: index }, uHalo: { value: 0 },
    uGlow: { value: 0 }, uError: { value: 0 },
    uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() },
    uColorC: { value: new THREE.Color() },
    uCoreView: { value: new THREE.Vector3() }, uCoreColor: { value: new THREE.Color() },
    uCoreLight: { value: 0 }, uShimmerTime: { value: 0 }, uShimmer: { value: 0 }, uShimmerLevel: { value: 0 },
  };
  const geometry = new THREE.PlaneGeometry(1, 1, 128, 10);
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT,
    side: THREE.DoubleSide, depthWrite: true,
  });
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uHalo: { value: 1 } },
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const body = new THREE.Mesh(geometry, material);
  const halo = new THREE.Mesh(geometry, glowMaterial);
  // The shader displaces beyond the placeholder plane's CPU bounds.
  body.frustumCulled = false;
  halo.frustumCulled = false;
  halo.renderOrder = 3;
  const mesh = new THREE.Group();
  mesh.add(body, halo);
  mesh.scale.setScalar(1.24 - index * 0.09);
  mesh.rotation.set(index * 0.74 - 0.32, index * 0.61, index * 0.78 + 0.18);
  return { mesh, uniforms, dispose: () => { geometry.dispose(); material.dispose(); glowMaterial.dispose(); } };
}
