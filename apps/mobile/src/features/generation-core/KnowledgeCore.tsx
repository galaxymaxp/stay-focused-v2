import { useIsFocused } from "@react-navigation/native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import * as THREE from "three";

import type { ThemeColors } from "../../design/theme";
import {
  CORE_MOTION_PROFILES, coreAccessibilityLabel, coreMotionRate, coreShimmerTarget, coreSpinTarget, type CoreState,
} from "./coreModel";
import { createOrbAura } from "./orbAura";
import { createOrbBody } from "./orbBody";

const DEFAULT_SIZE = 320;
/** Radians per second at full spin (generating): about one turn every seven seconds. */
const ORB_MAX_SPIN = 0.9;
const SPIN_AXIS = new THREE.Vector3(0.18, 1, -0.12).normalize();
const CAMERA_DISTANCE = 4.55;
const CAMERA_FOV = 36;

interface SceneController { renderForChange: () => void; dispose: () => void }
interface RuntimeProps {
  state: CoreState; colors: ThemeColors; mode: "light" | "dark";
  reducedMotion: boolean; active: boolean; focused: boolean;
}
interface TouchState { strength: number; x: number; y: number; age: number }

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
  const touch = useRef<TouchState>({ strength: 0, x: 0, y: 0, age: 10 });
  runtime.current = { state, colors, mode, reducedMotion, active: active && foreground, focused };
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => controller.current?.renderForChange(), [active, colors, focused, foreground, mode, reducedMotion, state]);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  // Effects can re-run on a live GL context (Fast Refresh, StrictMode), so rebuild rather than stay disposed.
  useEffect(() => {
    if (context.current && !controller.current) {
      controller.current = buildScene(context.current, runtime, touch);
      controller.current.renderForChange();
    }
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  const createScene = useCallback((gl: ExpoWebGLRenderingContext) => {
    context.current = gl;
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
          touch.current = {
            strength: reducedMotion ? 0.25 : 1, age: 0,
            x: event.nativeEvent.locationX / size - 0.5, y: event.nativeEvent.locationY / size - 0.5,
          };
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
  touch: React.MutableRefObject<TouchState>,
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
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  camera.position.set(0, 0.02, CAMERA_DISTANCE);
  const root = new THREE.Group();
  scene.add(root);

  const body = createOrbBody();
  root.add(body.mesh);
  const aura = createOrbAura();
  scene.add(aura.mesh);

  let requestId: number | null = null;
  let disposed = false;
  let lastFrame = Date.now();
  let animatedTime = 8.4;
  let spinAngle = 0;
  let activity = 0, completion = 0, error = 0, spin = 0, shimmer = 0, life = 0, settleUntil = 0;
  const spinMatrix = new THREE.Matrix3();
  const spinRotation = new THREE.Matrix4();

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
    completion += (profile.completion - completion) * ease;
    error += (profile.error - error) * ease;
    // Spin, shimmer and liveliness carry momentum between states; failure winds them down rather than cutting them.
    const momentum = 1 - Math.pow(0.12, delta);
    const spinTarget = coreSpinTarget(current.state, current.reducedMotion);
    const shimmerTarget = coreShimmerTarget(current.state, current.reducedMotion);
    const lifeTarget = current.reducedMotion ? 0.15 : 0.35 + activity * 0.65;
    spin += (spinTarget - spin) * momentum;
    shimmer += (shimmerTarget - shimmer) * momentum;
    life += (lifeTarget - life) * momentum;
    const motionRate = coreMotionRate(current.state, current.reducedMotion, completion);
    // Completion settles into a slow living state without resetting phase or pose.
    const motionDelta = delta * motionRate;
    animatedTime += motionDelta;
    spinAngle = (spinAngle + spin * ORB_MAX_SPIN * delta) % (Math.PI * 2);
    spinMatrix.setFromMatrix4(spinRotation.makeRotationAxis(SPIN_AXIS, spinAngle));
    touch.current.strength *= Math.pow(0.2, delta);
    touch.current.age += delta;

    root.position.y = Math.sin(animatedTime * 0.5) * 0.02;
    const parallax = touch.current.strength * Math.min(1, touch.current.age * 3);
    camera.position.x += (touch.current.x * 0.12 * parallax - camera.position.x) * Math.min(1, delta * 5);
    camera.position.y += (-touch.current.y * 0.09 * parallax + 0.02 - camera.position.y) * Math.min(1, delta * 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const glow = 0.55 + activity * 0.5 + completion * 0.15;
    aura.update({
      delta, shimmer, glow, error, mode: current.mode, camera, center: root.position,
      // Reduced Motion keeps a steady glow.
      shimmerAmount: current.reducedMotion ? 0 : 0.4 + activity * 0.6,
    });
    body.update({
      time: animatedTime, life, glow, error, spin: spinMatrix, mode: current.mode,
      level: aura.shimmer.level,
      // A touch stirs the liquid briefly.
      stir: touch.current.strength,
    });
    renderer.render(scene, camera);
    gl.endFrameEXP();
    const settling = now < settleUntil || Math.abs(activity - profile.activity) > 0.006
      || Math.abs(spin - spinTarget) > 0.004 || Math.abs(shimmer - shimmerTarget) > 0.004 || Math.abs(life - lifeTarget) > 0.004
      || touch.current.strength > 0.01;
    requestId = motionRate > 0 || settling ? requestAnimationFrame(draw) : null;
  };

  return {
    renderForChange: () => {
      settleUntil = Date.now() + (runtime.current.reducedMotion ? 360 : 1100);
      if (requestId === null) { lastFrame = Date.now(); requestId = requestAnimationFrame(draw); }
    },
    dispose: () => {
      disposed = true;
      if (requestId !== null) cancelAnimationFrame(requestId);
      body.dispose();
      aura.dispose();
      renderer.dispose();
    },
  };
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center" },
  canvas: { ...StyleSheet.absoluteFillObject },
  touchTarget: { ...StyleSheet.absoluteFillObject },
});
