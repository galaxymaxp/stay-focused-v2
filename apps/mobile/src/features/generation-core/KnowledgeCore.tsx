import { useIsFocused } from "@react-navigation/native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import * as THREE from "three";

import type { ThemeColors } from "../../design/theme";
import { CORE_MOTION_PROFILES, coreAccessibilityLabel, coreMotionRate, coreRibbonPalette, type CoreState } from "./coreModel";
import { createLivingRibbon } from "./livingRibbon";

const DEFAULT_SIZE = 320;

const SHELL_VERTEX = `
uniform float uTime;
uniform float uActivity;
uniform float uOrder;
uniform float uTouch;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vWave;
void main() {
  vec3 p = position;
  float waveA = sin(p.y * 4.2 + uTime * 0.72) * cos(p.z * 3.4 - uTime * 0.46);
  float waveB = sin(p.x * 5.1 - uTime * 0.58 + p.y * 2.3);
  float movement = (0.018 + uActivity * 0.028) * (1.0 - uOrder * 0.62);
  p += normal * ((waveA * 0.68 + waveB * 0.32) * movement + uTouch * 0.018);
  p.x += p.y * p.y * 0.055 - 0.025;
  p.y *= 1.08;
  p.z *= 0.9;
  vWave = waveA * 0.5 + 0.5;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(p, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`;

const SHELL_FRAGMENT = `
uniform vec3 uAccent;
uniform vec3 uSecondary;
uniform float uCompletion;
uniform float uError;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vWave;
void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float facing = max(dot(normalize(vNormal), viewDirection), 0.0);
  float fresnel = pow(1.0 - facing, 2.35);
  float edge = pow(1.0 - facing, 5.0);
  float highlight = pow(max(dot(normalize(vNormal), normalize(vec3(-0.45, 0.72, 0.8))), 0.0), 26.0);
  vec3 color = mix(vec3(0.34, 0.46, 0.68), uSecondary, 0.12 + vWave * 0.08);
  color += uAccent * fresnel * 0.22 + vec3(1.0, 0.96, 0.9) * highlight * 0.82;
  color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))), uError * 0.74);
  color += vec3(0.92, 0.94, 1.0) * uCompletion * edge * 0.22;
  gl_FragColor = vec4(color, min(fresnel * 0.12 + edge * 0.08 + highlight * 0.08, 0.2));
}`;

const CORE_VERTEX = `
uniform float uTime;
uniform float uActivity;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vPulse;
void main() {
  vec3 p = position;
  float pulse = sin(uTime * (1.15 + uActivity * 0.8) + p.y * 4.0) * 0.5 + 0.5;
  p += normal * pulse * (0.018 + uActivity * 0.026);
  p.x *= 0.94;
  p.y *= 1.08;
  vPulse = pulse;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(p, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`;

const CORE_FRAGMENT = `
uniform vec3 uAccent;
uniform vec3 uSecondary;
uniform float uActivity;
uniform float uError;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vPulse;
void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.0);
  vec3 color = mix(vec3(0.018, 0.028, 0.08), uSecondary, 0.22 + vPulse * 0.17);
  color += uAccent * (fresnel * 0.42 + vPulse * uActivity * 0.16);
  color = mix(color, vec3(0.12, 0.13, 0.15), uError * 0.82);
  gl_FragColor = vec4(color, 0.18 + fresnel * 0.1);
}`;

interface SceneController { renderForChange: () => void; dispose: () => void }
interface RuntimeProps { state: CoreState; colors: ThemeColors; mode: "light" | "dark"; reducedMotion: boolean; active: boolean; focused: boolean }

export interface KnowledgeCoreProps {
  readonly state: CoreState;
  readonly colors: ThemeColors;
  readonly mode: "light" | "dark";
  readonly reducedMotion?: boolean;
  readonly active?: boolean;
  readonly size?: number;
}

export function KnowledgeCore({ state, colors, mode, reducedMotion = false, active = true, size = DEFAULT_SIZE }: KnowledgeCoreProps) {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const runtime = useRef<RuntimeProps>({ state, colors, mode, reducedMotion, active: active && foreground, focused });
  const controller = useRef<SceneController | null>(null);
  const touch = useRef({ strength: 0, x: 0, y: 0 });
  runtime.current = { state, colors, mode, reducedMotion, active: active && foreground, focused };
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => controller.current?.renderForChange(), [active, colors, focused, foreground, mode, reducedMotion, state]);
  useEffect(() => () => controller.current?.dispose(), []);
  const createScene = useCallback((gl: ExpoWebGLRenderingContext) => {
    controller.current?.dispose();
    controller.current = buildScene(gl, runtime, touch);
    controller.current.renderForChange();
  }, []);
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <GLView onContextCreate={createScene} style={styles.canvas} />
      <Pressable
        accessibilityLabel={coreAccessibilityLabel(state)}
        accessibilityRole="imagebutton"
        accessibilityState={{ busy: ["reading", "generating", "finalizing"].includes(state) }}
        hitSlop={8}
        onPressIn={(event) => {
          touch.current = { strength: reducedMotion ? 0.25 : 1, x: event.nativeEvent.locationX / size - 0.5, y: event.nativeEvent.locationY / size - 0.5 };
          controller.current?.renderForChange();
        }}
        onPressOut={() => {
          touch.current.strength = reducedMotion ? 0 : 0.72;
          controller.current?.renderForChange();
        }}
        style={styles.touchTarget}
        testID="knowledge-core"
      />
    </View>
  );
}

function buildScene(
  gl: ExpoWebGLRenderingContext,
  runtime: React.MutableRefObject<RuntimeProps>,
  touch: React.MutableRefObject<{ strength: number; x: number; y: number }>,
): SceneController {
  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    clientHeight: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl as unknown as WebGLRenderingContext,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.02, 4.55);
  const root = new THREE.Group();
  root.rotation.set(-0.13, -0.26, -0.12);
  scene.add(root);

  const shellUniforms = {
    uTime: { value: 0 }, uActivity: { value: 0 }, uOrder: { value: 0 }, uTouch: { value: 0 },
    uAccent: { value: new THREE.Color() }, uSecondary: { value: new THREE.Color() },
    uCompletion: { value: 0 }, uError: { value: 0 },
  };
  const shellMaterial = new THREE.ShaderMaterial({ vertexShader: SHELL_VERTEX, fragmentShader: SHELL_FRAGMENT, uniforms: shellUniforms, transparent: true, depthWrite: false, side: THREE.FrontSide });
  const shellGeometry = new THREE.IcosahedronGeometry(1.03, 5);
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  shell.renderOrder = 4;
  root.add(shell);

  const coreUniforms = {
    uTime: { value: 0 }, uActivity: { value: 0 }, uAccent: { value: new THREE.Color() },
    uSecondary: { value: new THREE.Color() }, uError: { value: 0 },
  };
  const coreMaterial = new THREE.ShaderMaterial({ vertexShader: CORE_VERTEX, fragmentShader: CORE_FRAGMENT, uniforms: coreUniforms, transparent: true, depthWrite: false });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 4), coreMaterial);
  core.renderOrder = 1;
  root.add(core);

  const inner = new THREE.Group();
  root.add(inner);
  const ribbons = [0, 1, 2].map(createLivingRibbon);
  ribbons.forEach((ribbon) => inner.add(ribbon.mesh));

  const particlePositions = new Float32Array(270);
  let seed = 19;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let index = 0; index < particlePositions.length; index += 3) {
    const radius = 0.15 + random() * 0.77;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    particlePositions[index] = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[index + 1] = radius * Math.cos(phi) * 0.92;
    particlePositions[index + 2] = radius * Math.sin(phi) * Math.sin(theta) * 0.75;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({ color: 0x9fbaff, size: 0.025, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  inner.add(particles);

  const shardGeometry = new THREE.TetrahedronGeometry(0.105, 0);
  const shardStarts = [new THREE.Vector3(-1.42, 0.62, 0.18), new THREE.Vector3(1.37, 0.22, -0.12), new THREE.Vector3(-1.18, -0.7, 0.38)];
  const shards = shardStarts.map((position, index) => {
    const material = new THREE.MeshPhysicalMaterial({ color: 0x8ba7ff, emissive: 0x2b377d, emissiveIntensity: 0.8, transparent: true, opacity: 0, roughness: 0.22, metalness: 0.22 });
    const shard = new THREE.Mesh(shardGeometry, material);
    shard.position.copy(position);
    shard.scale.set(1.25, 0.55, 0.44);
    shard.rotation.set(index * 0.8, index * 1.4, index * 0.47);
    root.add(shard);
    return shard;
  });

  scene.add(new THREE.HemisphereLight(0xb9ccff, 0x090b18, 1.25));
  const key = new THREE.DirectionalLight(0xfff1df, 4.2);
  key.position.set(-3.2, 4.1, 4.8);
  scene.add(key);
  const accentLight = new THREE.PointLight(0x6d7dff, 4.5, 7);
  accentLight.position.set(2.2, -0.4, 2.1);
  scene.add(accentLight);

  let requestId: number | null = null;
  let disposed = false;
  let lastFrame = Date.now();
  let animatedTime = 8.4;
  let activity = 0, intake = 0, order = 0, completion = 0, error = 0, settleUntil = 0;
  const white = new THREE.Color(0xffffff);
  const accent = new THREE.Color();
  const secondary = new THREE.Color();
  let paletteAccent = runtime.current.colors.accent;
  let paletteMode = runtime.current.mode;
  const palette = coreRibbonPalette(paletteAccent, paletteMode).map((color) => new THREE.Color(color));
  ribbons.forEach(({ uniforms }) => {
    uniforms.uColorA.value.copy(palette[0]!);
    uniforms.uColorB.value.copy(palette[1]!);
    uniforms.uColorC.value.copy(palette[2]!);
  });

  const draw = () => {
    if (disposed) return;
    if (!runtime.current.active || !runtime.current.focused) {
      requestId = null;
      return;
    }
    const now = Date.now();
    const delta = Math.min((now - lastFrame) / 1000, 0.04);
    lastFrame = now;
    const current = runtime.current;
    const profile = CORE_MOTION_PROFILES[current.state];
    const ease = 1 - Math.pow(0.002, delta);
    activity += (profile.activity - activity) * ease;
    intake += (profile.intake - intake) * ease;
    order += (profile.order - order) * ease;
    completion += (profile.completion - completion) * ease;
    error += (profile.error - error) * ease;
    const motionRate = coreMotionRate(current.state, current.reducedMotion, completion);
    const moving = motionRate > 0;
    // Completion settles into a slow living state without resetting phase or pose.
    const motionDelta = delta * motionRate;
    animatedTime += motionDelta;
    touch.current.strength *= Math.pow(0.08, delta);

    accent.set(current.colors.accent);
    secondary.set(current.colors.violet);
    if (paletteAccent !== current.colors.accent || paletteMode !== current.mode) {
      paletteAccent = current.colors.accent;
      paletteMode = current.mode;
      coreRibbonPalette(paletteAccent, paletteMode).forEach((color, index) => palette[index]!.set(color));
    }
    shellUniforms.uTime.value = animatedTime;
    shellUniforms.uActivity.value = activity;
    shellUniforms.uOrder.value = order;
    shellUniforms.uTouch.value = touch.current.strength;
    shellUniforms.uAccent.value.copy(accent);
    shellUniforms.uSecondary.value.copy(secondary);
    shellUniforms.uCompletion.value = completion;
    shellUniforms.uError.value = error;
    coreUniforms.uTime.value = animatedTime;
    coreUniforms.uActivity.value = activity;
    coreUniforms.uAccent.value.copy(accent);
    coreUniforms.uSecondary.value.copy(secondary);
    coreUniforms.uError.value = error;

    const breathe = Math.sin(animatedTime * (0.68 + activity * 0.24));
    root.position.y = breathe * (0.025 + activity * 0.018);
    root.rotation.y += motionDelta * (0.06 + activity * 0.14);
    root.rotation.x = -0.13 + Math.sin(animatedTime * 0.31) * 0.045;
    root.scale.setScalar(1 + completion * 0.025);
    inner.rotation.y -= motionDelta * (0.24 + activity * 0.72);
    inner.rotation.z += motionDelta * (0.1 + activity * 0.28);
    ribbons.forEach(({ mesh: ribbon, uniforms }, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      ribbon.rotation.x += motionDelta * (0.08 + activity * 0.35) * direction;
      ribbon.rotation.z += motionDelta * (0.06 + activity * 0.22) * -direction;
      uniforms.uTime.value = animatedTime;
      uniforms.uGlow.value = (current.mode === "dark" ? 0.9 : 0.55) + activity * 0.38 + completion * 0.10;
      uniforms.uError.value = error;
      uniforms.uColorA.value.lerp(palette[0]!, ease);
      uniforms.uColorB.value.lerp(palette[1]!, ease);
      uniforms.uColorC.value.lerp(palette[2]!, ease);
    });
    particles.rotation.y += motionDelta * (0.18 + activity * 0.65);
    particleMaterial.color.copy(accent).lerp(white, 0.42);
    particleMaterial.opacity = (0.22 + activity * 0.62) * (1 - error * 0.8);
    shards.forEach((shard, index) => {
      const phase = (animatedTime * (0.34 + index * 0.035) + index * 0.27) % 1;
      shard.position.copy(shardStarts[index]!).multiplyScalar(1 - phase * 0.7);
      shard.position.y += Math.sin(phase * Math.PI) * 0.18;
      shard.rotation.x += motionDelta * 0.8;
      shard.rotation.y += motionDelta * 1.2;
      (shard.material as THREE.MeshPhysicalMaterial).opacity = intake * (1 - phase) * (current.reducedMotion ? 0.28 : 1);
    });
    camera.position.x += (touch.current.x * 0.24 * touch.current.strength - camera.position.x) * Math.min(1, delta * 5);
    camera.position.y += (-touch.current.y * 0.18 * touch.current.strength + 0.02 - camera.position.y) * Math.min(1, delta * 5);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    gl.endFrameEXP();
    const settling = now < settleUntil || Math.abs(activity - profile.activity) > 0.006 || touch.current.strength > 0.01;
    requestId = moving || settling ? requestAnimationFrame(draw) : null;
  };

  return {
    renderForChange: () => {
      settleUntil = Date.now() + (runtime.current.reducedMotion ? 360 : 1100);
      if (requestId === null) { lastFrame = Date.now(); requestId = requestAnimationFrame(draw); }
    },
    dispose: () => {
      disposed = true;
      if (requestId !== null) cancelAnimationFrame(requestId);
      shellGeometry.dispose(); shellMaterial.dispose(); core.geometry.dispose(); coreMaterial.dispose();
      ribbons.forEach((ribbon) => ribbon.dispose());
      particleGeometry.dispose(); particleMaterial.dispose(); shardGeometry.dispose();
      shards.forEach((shard) => (shard.material as THREE.Material).dispose());
      renderer.dispose();
    },
  };
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center" },
  canvas: { ...StyleSheet.absoluteFillObject },
  touchTarget: { ...StyleSheet.absoluteFillObject },
});
