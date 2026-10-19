import { cancelOrbSpin } from '@stay-focused/shared';
import { OrbTouchLayer, useOrbInteraction, type OrbInteractionHandle } from './orbInteraction';
import { createOrbInteractionSampler } from './orbInteractionFrame';
import { useIsFocused } from "expo-router/react-navigation";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, StyleSheet, View } from "react-native";
import { OrbImageSpill } from './OrbImageSpill';
import * as THREE from "three";

import type { ThemeColors } from "../../design/theme";
import {
  CORE_MOTION_PROFILES, coreMotionRate, coreShimmerTarget, coreSpinTarget, type CoreState,
} from "./coreModel";
import { createOrbAura } from "./orbAura";
import { createOrbBody } from "./orbBody";
import { threeContext } from "./threeContext";

const DEFAULT_SIZE = 320;
/** Radians per second at full spin (generating): about one turn every seven seconds. */
const ORB_MAX_SPIN = 0.9;
const SPIN_AXIS = new THREE.Vector3(0.18, 1, -0.12).normalize();
const CAMERA_DISTANCE = 4.55;
const CAMERA_FOV = 36;
const ORB_FILL = (0.95 * 2) / (2 * CAMERA_DISTANCE * Math.tan(CAMERA_FOV * Math.PI / 360));

interface SceneController { renderForChange: () => void; dispose: () => void }
interface RuntimeProps {
  state: CoreState; colors: ThemeColors; mode: "light" | "dark";
  reducedMotion: boolean; active: boolean; focused: boolean;
}

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
  const [renderingFailed, setRenderingFailed] = useState(false);
  const runtime = useRef<RuntimeProps>({ state, colors, mode, reducedMotion, active: active && foreground, focused });
  const controller = useRef<SceneController | null>(null);
  const interaction = useOrbInteraction();
  runtime.current = { state, colors, mode, reducedMotion, active: active && foreground, focused };
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!active || !foreground || !focused) interaction.state.current = cancelOrbSpin(interaction.state.current);
  }, [active, foreground, focused, interaction]);
  useEffect(() => controller.current?.renderForChange(), [active, colors, focused, foreground, mode, reducedMotion, state]);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  // Effects can re-run on a live GL context (Fast Refresh, StrictMode), so rebuild rather than stay disposed.
  useEffect(() => {
    if (context.current && !controller.current) {
      try {
        controller.current = buildScene(context.current, runtime, interaction);
        controller.current.renderForChange();
      } catch { context.current = null; setRenderingFailed(true); }
    }
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, [interaction]);
  const createScene = useCallback((gl: ExpoWebGLRenderingContext) => {
    context.current = gl;
    controller.current?.dispose();
    try {
      controller.current = buildScene(gl, runtime, interaction);
      controller.current.renderForChange();
    } catch { context.current = null; setRenderingFailed(true); }
  }, [interaction]);
  return (
    <View style={[styles.frame, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="knowledge-core">
      {renderingFailed
        ? <><OrbImageSpill source={require("../../../assets/branding/orb-adaptive-foreground.png")} size={size} mode={mode} /><Image source={require("../../../assets/branding/orb-adaptive-foreground.png")} style={{ width: size, height: size }} resizeMode="contain" /></>
        : <GLView onContextCreate={createScene} style={styles.canvas} />}
      <OrbTouchLayer interaction={interaction} size={size * ORB_FILL} left={size * (1 - ORB_FILL) / 2} top={size * (1 - ORB_FILL) / 2} reducedMotion={reducedMotion} />
    </View>
  );
}

function buildScene(
  gl: ExpoWebGLRenderingContext,
  runtime: React.MutableRefObject<RuntimeProps>,
  interaction: OrbInteractionHandle,
): SceneController {
  const sampleInteraction = createOrbInteractionSampler(interaction);
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
    context: threeContext(gl),
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
    const ease = current.reducedMotion ? 1 : 1 - Math.pow(0.002, delta);
    activity += (profile.activity - activity) * ease;
    completion += (profile.completion - completion) * ease;
    error += (profile.error - error) * ease;
    // Spin, shimmer and liveliness carry momentum between states; failure winds them down rather than cutting them.
    const momentum = current.reducedMotion ? 1 : 1 - Math.pow(0.12, delta);
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
    const interactionFrame = sampleInteraction(now, delta * 1000, current.reducedMotion, spinMatrix);
    root.position.y = Math.sin(animatedTime * 0.5) * 0.02;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const glow = 0.55 + activity * 0.5 + completion * 0.15;
    aura.stepShimmer(current.reducedMotion ? 0 : delta, shimmer, current.reducedMotion ? 0 : 0.4 + activity * 0.6, error);
    body.update({
      time: animatedTime, life, glow, error, spin: spinMatrix, mode: current.mode,
      level: aura.shimmer.level,
      stir: 0,
      idleColor: current.state === 'idle' ? interactionFrame.idleColor : undefined,
      rippleDir: interactionFrame.rippleDir, rippleTime: interactionFrame.rippleTime,
    });
    aura.update({ delta, shimmer, glow, error, mode: current.mode, camera, center: root.position,
      shimmerAmount: aura.shimmer.amount, source: body.uniforms, reducedMotion: current.reducedMotion });
    renderer.render(scene, camera);
    gl.endFrameEXP();
    const settling = now < settleUntil || Math.abs(activity - profile.activity) > 0.006
      || Math.abs(spin - spinTarget) > 0.004 || Math.abs(shimmer - shimmerTarget) > 0.004 || Math.abs(life - lifeTarget) > 0.004
      || interactionFrame.animating;
    requestId = !current.reducedMotion && (motionRate > 0 || settling) ? requestAnimationFrame(draw) : null;
  };

  const renderForChange = () => {
      if (disposed || !runtime.current.active || !runtime.current.focused) {
        if (requestId !== null) cancelAnimationFrame(requestId);
        requestId = null;
        return;
      }
      settleUntil = Date.now() + (runtime.current.reducedMotion ? 360 : 1100);
      if (requestId === null) { lastFrame = Date.now(); requestId = requestAnimationFrame(draw); }
    };
  interaction.wake.current = renderForChange;
  return { renderForChange,
    dispose: () => {
      disposed = true;
      interaction.state.current = cancelOrbSpin(interaction.state.current);
      if (interaction.wake.current === renderForChange) interaction.wake.current = null;
      if (requestId !== null) cancelAnimationFrame(requestId);
      body.dispose();
      aura.dispose();
      renderer.dispose();
    },
  };
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center" },
  canvas: { ...StyleSheet.absoluteFill },
});
