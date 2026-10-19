import { cancelOrbSpin, createOrbInteraction } from '@stay-focused/shared';
import type { OrbInteractionHandle } from '../generation-core/orbInteraction';
import { createOrbInteractionSampler } from '../generation-core/orbInteractionFrame';
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Image, View } from "react-native";
import * as THREE from "three";

import { coreLevelsExtra, createCoreLevels, stepCoreLevels, type CoreLevels, type CoreState } from "../generation-core/coreModel";
import { orbShimmerLevel, SHIMMER_SPEED } from "../generation-core/orbAura";
import { createOrbBody } from "../generation-core/orbBody";
import { threeContext } from "../generation-core/threeContext";
import { dayOrbTones, type DayOrbTones } from "./dayClock";

const CAMERA_DISTANCE = 4.55;
const CAMERA_FOV = 36;
/** Share of the canvas the ball's diameter fills at this camera. */
export const DAY_ORB_FILL = (0.95 * 2) / (2 * CAMERA_DISTANCE * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)));
const SPIN_AXIS = new THREE.Vector3(0.18, 1, -0.12).normalize();
/**
 * The Today orb moves slowly, so ~12 fps reads as smooth. Every frame costs
 * JS-thread time, and touches on the ring are claimed from the JS thread, so
 * fewer frames means handles grab faster.
 */
const FRAME_MS = 80;
/**
 * The glass is soft, so it renders at a reduced resolution and is scaled up.
 * The shader's cost grows with pixels, and on modest GPUs a full-resolution
 * frame kept the JS thread waiting long enough for the page to steal touches.
 */
const RENDER_SCALE = 0.6;

/**
 * Set while a finger is on Today. Plain page touches pause idle rendering.
 * Ring input and active interaction animation keep the existing scene running.
 */
export const dayOrbTouch = { active: false };

interface Runtime {
  tones: DayOrbTones;
  mode: "light" | "dark";
  reducedMotion: boolean;
  running: boolean;
  state?: CoreState;
}


/**
 * The Today clock's body: the same glass ball and luminous liquid as the
 * Knowledge Core, carrying the day instead of the work. The liquid takes the
 * sky of the moment and the inner light is the sun or moon, moving along its
 * path through the day. It turns slowly, never pulses, and stops rendering
 * whenever Today is off screen or the app is in the background. With a
 * generation `state` it shows the work by behaviour: livelier while running,
 * still and dimmed on failure, a brief brighten on completion.
 */
export const DayOrb = memo(function DayOrb({
  minutes,
  size,
  mode,
  reducedMotion,
  live,
  state,
  interaction: suppliedInteraction,
}: {
  minutes: number;
  /** Canvas size in points; the ball fills DAY_ORB_FILL of it. */
  size: number;
  mode: "light" | "dark";
  reducedMotion: boolean;
  live: boolean;
  state?: CoreState;
  interaction?: OrbInteractionHandle;
}) {
  const localState = useRef(createOrbInteraction());
  const localWake = useRef<(() => void) | null>(null);
  const interaction = useMemo(() => suppliedInteraction ?? { state: localState, wake: localWake }, [suppliedInteraction]);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [renderingFailed, setRenderingFailed] = useState(false);
  const tones = useMemo(() => dayOrbTones(minutes), [minutes]);
  const runtime = useRef<Runtime>({ tones, mode, reducedMotion, running: live && foreground, state });
  runtime.current = { tones, mode, reducedMotion, running: live && foreground, state };
  const controller = useRef<{ wake: () => void; dispose: () => void } | null>(null);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!live || !foreground) interaction.state.current = cancelOrbSpin(interaction.state.current);
  }, [live, foreground, interaction]);
  useEffect(() => controller.current?.wake(), [minutes, mode, reducedMotion, live, foreground, state]);
  useEffect(() => {
    if (context.current && !controller.current) {
      try { controller.current = buildScene(context.current, runtime, interaction); }
      catch { context.current = null; setRenderingFailed(true); }
    }
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, [interaction]);
  const create = useCallback((gl: ExpoWebGLRenderingContext) => {
    context.current = gl;
    controller.current?.dispose();
    try { controller.current = buildScene(gl, runtime, interaction); }
    catch { context.current = null; setRenderingFailed(true); }
  }, [interaction]);
  const inner = size * RENDER_SCALE;
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* OR3b: no external halo; native gradient stops require React updates. */}
      {renderingFailed
        ? <Image source={require("../../../assets/branding/orb-adaptive-foreground.png")} style={{ width: size, height: size }} resizeMode="contain" />
        : <GLView onContextCreate={create} style={{ width: inner, height: inner, transform: [{ scale: 1 / RENDER_SCALE }] }} />}
    </View>
  );
});

function buildScene(gl: ExpoWebGLRenderingContext, runtime: { current: Runtime }, interaction: OrbInteractionHandle) {
  const sampleInteraction = createOrbInteractionSampler(interaction);
  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    clientHeight: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, context: threeContext(gl), alpha: true, antialias: true });
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

  let disposed = false;
  let requestId: number | null = null;
  let lastFrame = Date.now();
  let lastRender = 0;
  let time = 8.4;
  let spinAngle = 0;
  let settleUntil = 0;
  let interacting = false;
  let levels: CoreLevels | null = null;
  let shimmerTime = 0;
  const spinMatrix = new THREE.Matrix3();
  const spinRotation = new THREE.Matrix4();

  const draw = () => {
    requestId = null;
    if (disposed) return;
    const now = Date.now();
    const current = runtime.current;
    const settled = levels ? coreLevelsExtra(levels, current.reducedMotion) : null;
    // A failed orb winds down and then stays still, as the Knowledge Core does.
    const moving = current.running && !current.reducedMotion && !(current.state === "error" && settled && !settled.lively);
    // Plain page touches pause idle work; ring motion and its coast remain visible.
    if (dayOrbTouch.active && moving && !interaction.ringDragging?.current && !interaction.state.current.gesture?.rotating
      && interaction.state.current.spin.velocityX === 0 && interaction.state.current.spin.velocityY === 0 && !interacting) {
      lastFrame = now;
      requestId = requestAnimationFrame(draw);
      return;
    }
    if (now - lastRender >= (interacting || interaction.state.current.gesture?.rotating || settled?.lively ? 16 : FRAME_MS) || !moving) {
      const delta = Math.min((now - lastFrame) / 1000, 0.08);
      lastFrame = now;
      lastRender = now;
      levels = current.state
        ? stepCoreLevels(levels ?? createCoreLevels(current.state, current.reducedMotion), current.state, delta, current.reducedMotion)
        : null;
      const extra = levels ? coreLevelsExtra(levels, current.reducedMotion) : null;
      const rate = current.reducedMotion ? 0.08 : 0.35;
      if (moving) {
        time += extra ? delta * (rate + extra.rate) * (1 - extra.error) : delta * rate;
        const turn = current.reducedMotion ? 0.03 : 0.12;
        spinAngle = (spinAngle + delta * (extra ? Math.max(0, turn + extra.spin) : turn)) % (Math.PI * 2);
        if (levels) shimmerTime = (shimmerTime + levels.shimmer * SHIMMER_SPEED * delta) % 10000;
      }
      spinMatrix.setFromMatrix4(spinRotation.makeRotationAxis(SPIN_AXIS, spinAngle));
      const interactionFrame = sampleInteraction(now, delta * 1000, current.reducedMotion, spinMatrix);
      interacting = interactionFrame.animating;
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const tones = current.tones;
      body.update({
        idleColor: interactionFrame.idleColor,
        rippleDir: interactionFrame.rippleDir, rippleTime: interactionFrame.rippleTime,
        time,
        life: 0.22 + (extra?.life ?? 0),
        stir: 0,
        glow: 0.35 + tones.strength * 0.75 + (extra?.glow ?? 0),
        level: extra ? orbShimmerLevel(shimmerTime) * extra.shimmerAmount : 0,
        error: extra?.error ?? 0,
        spin: spinMatrix,
        mode: current.mode,
        tones: { base: tones.base, deep: tones.deep, glow: tones.light },
        light: tones.position,
      });
      renderer.render(scene, camera);
      gl.endFrameEXP();
    }
    if (!disposed && current.running && !current.reducedMotion && (moving || interacting || now < settleUntil)) requestId = requestAnimationFrame(draw);
  };

  const wake = () => {
    settleUntil = Date.now() + 400;
    if (requestId === null) {
      lastFrame = Date.now();
      requestId = requestAnimationFrame(draw);
    }
  };
  interaction.wake.current = wake;
  wake();
  return {
    wake,
    dispose: () => {
      disposed = true;
      interaction.state.current = cancelOrbSpin(interaction.state.current);
      if (interaction.wake.current === wake) interaction.wake.current = null;
      if (requestId !== null) cancelAnimationFrame(requestId);
      body.dispose();
      renderer.dispose();
    },
  };
}
