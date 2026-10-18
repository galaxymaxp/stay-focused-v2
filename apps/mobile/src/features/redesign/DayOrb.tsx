import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AppState, Image, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import * as THREE from "three";

import { createOrbAura } from "../generation-core/orbAura";
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
 * Set while a finger is on Today. Rendering pauses entirely so touch handling
 * (ring handles, scrolling, pull-to-refresh) always gets the JS thread first.
 */
export const dayOrbTouch = { active: false };

interface Runtime {
  tones: DayOrbTones;
  mode: "light" | "dark";
  reducedMotion: boolean;
  running: boolean;
}


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
}: {
  minutes: number;
  /** Canvas size in points; the ball fills DAY_ORB_FILL of it. */
  size: number;
  mode: "light" | "dark";
  reducedMotion: boolean;
  live: boolean;
}) {
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [renderingFailed, setRenderingFailed] = useState(false);
  const tones = useMemo(() => dayOrbTones(minutes), [minutes]);
  const haloId = useId();
  const runtime = useRef<Runtime>({ tones, mode, reducedMotion, running: live && foreground });
  runtime.current = { tones, mode, reducedMotion, running: live && foreground };
  const controller = useRef<{ wake: () => void; dispose: () => void } | null>(null);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => controller.current?.wake(), [minutes, mode, reducedMotion, live, foreground]);
  useEffect(() => {
    if (context.current && !controller.current) {
      try { controller.current = buildScene(context.current, runtime); }
      catch { context.current = null; setRenderingFailed(true); }
    }
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  const create = useCallback((gl: ExpoWebGLRenderingContext) => {
    context.current = gl;
    controller.current?.dispose();
    try { controller.current = buildScene(gl, runtime); }
    catch { context.current = null; setRenderingFailed(true); }
  }, []);
  const inner = size * RENDER_SCALE;
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Static spill also survives transparent GL compositing and PNG fallback.
          Keep the glass clear and fade out before the schedule ring/handles. */}
      <Svg testID="day-orb-halo" pointerEvents="none" width={size} height={size} viewBox="0 0 1 1" style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <RadialGradient id={haloId} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={tones.aura} stopOpacity={0} />
            <Stop offset={DAY_ORB_FILL * 0.97} stopColor={tones.aura} stopOpacity={0} />
            <Stop offset={DAY_ORB_FILL * 1.04} stopColor={tones.aura} stopOpacity={mode === "dark" ? 0.35 : 0.16} />
            <Stop offset={0.76} stopColor={tones.aura} stopOpacity={mode === "dark" ? 0.1 : 0.04} />
            <Stop offset={0.84} stopColor={tones.aura} stopOpacity={0} />
            <Stop offset={1} stopColor={tones.aura} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={0.5} cy={0.5} r={0.5} fill={`url(#${haloId})`} />
      </Svg>
      {renderingFailed
        ? <Image source={require("../../../assets/branding/orb-adaptive-foreground.png")} style={{ width: size, height: size }} resizeMode="contain" />
        : <GLView onContextCreate={create} style={{ width: inner, height: inner, transform: [{ scale: 1 / RENDER_SCALE }] }} />}
    </View>
  );
});

function buildScene(gl: ExpoWebGLRenderingContext, runtime: { current: Runtime }) {
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
    // While a finger is down, skip frames entirely (the clock keeps its pose).
    if (dayOrbTouch.active && moving) {
      lastFrame = now;
      requestId = requestAnimationFrame(draw);
      return;
    }
    if (now - lastRender >= FRAME_MS || !moving) {
      const delta = Math.min((now - lastFrame) / 1000, 0.08);
      lastFrame = now;
      lastRender = now;
      const rate = current.reducedMotion ? 0.08 : 0.35;
      if (moving) {
        time += delta * rate;
        spinAngle = (spinAngle + delta * (current.reducedMotion ? 0.03 : 0.12)) % (Math.PI * 2);
      }
      spinMatrix.setFromMatrix4(spinRotation.makeRotationAxis(SPIN_AXIS, spinAngle));
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
        // The halo moves with the bright body and a slow independent current.
        // This lights the surrounding canvas without another blur pass.
        offset: current.reducedMotion ? { x: tones.position.x * 0.16, y: tones.position.y * 0.16 } : {
          x: tones.position.x * 0.2 + Math.sin(time * 0.7) * 0.05,
          y: tones.position.y * 0.2 + Math.cos(time * 0.5) * 0.04,
        },
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
    if (!disposed && !current.reducedMotion && (moving || now < settleUntil)) requestId = requestAnimationFrame(draw);
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
