import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import * as THREE from "three";

import { createOrbAura } from "../generation-core/orbAura";
import { createOrbBody } from "../generation-core/orbBody";
import { dayOrbTones, type DayOrbTones } from "./dayClock";

const CAMERA_DISTANCE = 4.55;
const CAMERA_FOV = 36;
/** Share of the canvas the ball's diameter fills at this camera. */
export const DAY_ORB_FILL = (0.95 * 2) / (2 * CAMERA_DISTANCE * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)));
const SPIN_AXIS = new THREE.Vector3(0.18, 1, -0.12).normalize();
/** The Today orb moves slowly; half the display rate is plenty and saves battery. */
const FRAME_MS = 33;

interface Runtime {
  tones: DayOrbTones;
  mode: "light" | "dark";
  reducedMotion: boolean;
  running: boolean;
}

/** Offset (−1…1) the clock writes while the ring is dragged; the camera leans with it. */
export type OrbTilt = { x: number; y: number };

/**
 * The Today clock's body: the same glass ball and luminous liquid as the
 * Knowledge Core, carrying the day instead of the work. The liquid takes the
 * sky of the moment and the inner light is the sun or moon, moving along its
 * path through the day. It turns slowly, never pulses, and stops rendering
 * whenever Today is off screen or the app is in the background.
 */
export const DayOrb = memo(function DayOrb({
  minutes,
  size,
  mode,
  reducedMotion,
  live,
  tilt,
}: {
  minutes: number;
  /** Canvas size in points; the ball fills DAY_ORB_FILL of it. */
  size: number;
  mode: "light" | "dark";
  reducedMotion: boolean;
  live: boolean;
  tilt: { current: OrbTilt };
}) {
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const runtime = useRef<Runtime>({ tones: dayOrbTones(minutes), mode, reducedMotion, running: live && foreground });
  runtime.current = { tones: dayOrbTones(minutes), mode, reducedMotion, running: live && foreground };
  const controller = useRef<{ wake: () => void; dispose: () => void } | null>(null);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => controller.current?.wake(), [minutes, mode, reducedMotion, live, foreground]);
  useEffect(() => {
    if (context.current && !controller.current) controller.current = buildScene(context.current, runtime, tilt);
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, [tilt]);
  const create = useCallback((gl: ExpoWebGLRenderingContext) => {
    context.current = gl;
    controller.current?.dispose();
    controller.current = buildScene(gl, runtime, tilt);
  }, [tilt]);
  return (
    <View pointerEvents="none" style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GLView onContextCreate={create} style={StyleSheet.absoluteFill} />
    </View>
  );
});

function buildScene(gl: ExpoWebGLRenderingContext, runtime: { current: Runtime }, tilt: { current: OrbTilt }) {
  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    clientHeight: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGLRenderingContext, alpha: true, antialias: true });
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
  // A little smaller than the Knowledge Core's, so it fades before the canvas edge.
  aura.mesh.scale.setScalar(0.86);
  scene.add(aura.mesh);

  let disposed = false;
  let requestId: number | null = null;
  let lastFrame = Date.now();
  let lastRender = 0;
  let time = 8.4;
  let spinAngle = 0;
  let settleUntil = 0;
  const spinMatrix = new THREE.Matrix3();
  const spinRotation = new THREE.Matrix4();

  const draw = () => {
    requestId = null;
    if (disposed) return;
    const now = Date.now();
    const current = runtime.current;
    const moving = current.running && !current.reducedMotion;
    if (now - lastRender >= FRAME_MS || !moving) {
      const delta = Math.min((now - lastFrame) / 1000, 0.08);
      lastFrame = now;
      lastRender = now;
      const rate = current.reducedMotion ? 0.08 : 0.35;
      if (current.running) {
        time += delta * rate;
        spinAngle = (spinAngle + delta * (current.reducedMotion ? 0.03 : 0.12)) % (Math.PI * 2);
      }
      spinMatrix.setFromMatrix4(spinRotation.makeRotationAxis(SPIN_AXIS, spinAngle));
      const lean = tilt.current;
      camera.position.x += (lean.x * 0.14 - camera.position.x) * Math.min(1, delta * 6);
      camera.position.y += (0.02 - lean.y * 0.1 - camera.position.y) * Math.min(1, delta * 6);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const tones = current.tones;
      aura.update({
        delta: current.running ? delta : 0,
        shimmer: current.reducedMotion ? 0 : 0.25,
        shimmerAmount: current.reducedMotion ? 0 : 0.28,
        glow: 0.45 + tones.strength * 0.5,
        error: 0,
        mode: current.mode,
        camera,
        center: root.position,
        color: tones.aura,
      });
      body.update({
        time,
        life: 0.22,
        stir: 0,
        glow: 0.35 + tones.strength * 0.75,
        level: aura.shimmer.level,
        error: 0,
        spin: spinMatrix,
        mode: current.mode,
        tones: { base: tones.base, deep: tones.deep, glow: tones.light },
        light: tones.position,
      });
      renderer.render(scene, camera);
      gl.endFrameEXP();
    }
    const leaning = Math.abs(camera.position.x - tilt.current.x * 0.14) > 0.002 || Math.abs(tilt.current.x) + Math.abs(tilt.current.y) > 0;
    if (!disposed && (moving || now < settleUntil || leaning)) requestId = requestAnimationFrame(draw);
  };

  const wake = () => {
    settleUntil = Date.now() + 400;
    if (requestId === null) {
      lastFrame = Date.now();
      requestId = requestAnimationFrame(draw);
    }
  };
  wake();
  return {
    wake,
    dispose: () => {
      disposed = true;
      if (requestId !== null) cancelAnimationFrame(requestId);
      body.dispose();
      aura.dispose();
      renderer.dispose();
    },
  };
}
