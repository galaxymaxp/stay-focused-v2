import { ORB_AMBIENT_PROFILES, type OrbVariant, type ClockGlassReadout, cancelOrbSpin, createOrbInteraction,
  createOrbLoadGate, ORB_REVEAL_MS, type OrbLoadStatus } from '@stay-focused/shared';
import type { OrbInteractionHandle } from '../generation-core/orbInteraction';
import { createOrbInteractionSampler } from '../generation-core/orbInteractionFrame';
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, View } from "react-native";
import { OrbPoster } from '../generation-core/OrbPoster';
import * as THREE from "three";
import { createClockGlass } from '@stay-focused/shared/clock-glass-renderer';
import clockMetrics from '../../../assets/clock/clock-atlas.json';

import { coreLevelsExtra, createCoreLevels, stepCoreLevels, type CoreLevels, type CoreState } from "../generation-core/coreModel";
import { createOrbAura, orbShimmerLevel, SHIMMER_SPEED } from "../generation-core/orbAura";
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
  variant: OrbVariant;
  tones: DayOrbTones;
  mode: "light" | "dark";
  reducedMotion: boolean;
  running: boolean;
  state?: CoreState;
  clock?: ClockGlassReadout;
  canvasSize: number;
  onGlassReady?: (ready: boolean) => void;
  onFrameReady: () => void;
  onFailure: () => void;
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
  variant = 'clock',
  minutes,
  size,
  mode,
  reducedMotion,
  live,
  state,
  clock,
  onGlassReady,
  interaction: suppliedInteraction,
}: {
  variant?: OrbVariant;
  minutes: number;
  /** Canvas size in points; the ball fills DAY_ORB_FILL of it. */
  size: number;
  mode: "light" | "dark";
  reducedMotion: boolean;
  live: boolean;
  state?: CoreState;
  clock?: ClockGlassReadout;
  onGlassReady?: (ready: boolean) => void;
  interaction?: OrbInteractionHandle;
}) {
  const localState = useRef(createOrbInteraction());
  const localWake = useRef<(() => void) | null>(null);
  const interaction = useMemo(() => suppliedInteraction ?? { state: localState, wake: localWake }, [suppliedInteraction]);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [loadStatus, setLoadStatus] = useState<OrbLoadStatus>('loading');
  const gate = useRef<ReturnType<typeof createOrbLoadGate> | null>(null);
  const opacity = useRef<Animated.Value | null>(null);
  if (!opacity.current) opacity.current = new Animated.Value(0);
  const sceneWake = useRef<(() => void) | null>(null);
  const posterWake = useRef<(() => void) | null>(null);
  const sceneInteraction = useMemo(() => ({ ...interaction, wake: sceneWake }), [interaction]);
  const posterInteraction = useMemo(() => ({ ...interaction, wake: posterWake }), [interaction]);
  const frameReady = useCallback(() => gate.current?.ready(), []);
  const failure = useCallback(() => { opacity.current?.setValue(0); gate.current?.fail(); }, []);
  const tones = useMemo(() => dayOrbTones(minutes), [minutes]);
  const runtime = useRef<Runtime>({ variant, tones, mode, reducedMotion, running: live && foreground, state, clock, canvasSize: size, onGlassReady, onFrameReady: frameReady, onFailure: failure });
  runtime.current = { variant, tones, mode, reducedMotion, running: live && foreground, state, clock, canvasSize: size, onGlassReady, onFrameReady: frameReady, onFailure: failure };
  const controller = useRef<{ wake: () => void; dispose: () => void } | null>(null);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  useEffect(() => {
    const current = createOrbLoadGate(setLoadStatus, () => console.warn('Orb unavailable; keeping static poster.'));
    gate.current = current;
    return () => { current.dispose(); gate.current = null; };
  }, []);
  useEffect(() => {
    gate.current?.setActive(live && foreground);
  }, [live, foreground]);
  useEffect(() => {
    const wake = () => { posterWake.current?.(); sceneWake.current?.(); };
    interaction.wake.current = wake;
    return () => { if (interaction.wake.current === wake) interaction.wake.current = null; };
  }, [interaction]);
  useEffect(() => {
    const value = opacity.current!;
    value.stopAnimation();
    const shown = () => { if (runtime.current.clock) runtime.current.onGlassReady?.(true); };
    if (loadStatus !== 'ready' || reducedMotion) {
      value.setValue(loadStatus === 'ready' ? 1 : 0);
      if (loadStatus === 'ready') shown();
    }
    else {
      const animation = Animated.timing(value, { toValue: 1, duration: ORB_REVEAL_MS, useNativeDriver: true });
      animation.start(({ finished }) => { if (finished) shown(); }); return () => animation.stop();
    }
  }, [loadStatus, reducedMotion]);
  useEffect(() => {
    if (loadStatus === 'failed') { controller.current?.dispose(); controller.current = null; context.current = null; }
  }, [loadStatus]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!live || !foreground) interaction.state.current = cancelOrbSpin(interaction.state.current);
  }, [live, foreground, interaction]);
  useEffect(() => controller.current?.wake(), [minutes, mode, reducedMotion, live, foreground, state, size, clock?.text, clock?.fontSize]);
  useEffect(() => {
    if (context.current && !controller.current) {
      try { controller.current = buildScene(context.current, runtime, sceneInteraction); }
      catch { context.current = null; failure(); }
    }
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, [sceneInteraction, variant, failure]);
  const create = useCallback((gl: ExpoWebGLRenderingContext) => {
    // Expo can recreate a destroyed surface without remounting this component.
    // Treat that context loss as a final fallback, never as an already-ready canvas.
    if (context.current) { if (context.current !== gl) failure(); return; }
    context.current = gl;
    controller.current?.dispose();
    try { controller.current = buildScene(gl, runtime, sceneInteraction); }
    catch { context.current = null; failure(); }
  }, [sceneInteraction, failure]);
  const inner = size * RENDER_SCALE * ORB_AMBIENT_PROFILES[variant].canvasScale;
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Ambient spill renders inside the same transparent GL view. */}
      <Animated.View pointerEvents="none" accessibilityElementsHidden testID="orb-poster-layer" style={{ position: 'absolute', opacity: opacity.current.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
        <OrbPoster variant={variant} size={size * DAY_ORB_FILL} mode={mode} interaction={posterInteraction} />
      </Animated.View>
      {loadStatus !== 'failed' && <Animated.View pointerEvents="none" accessibilityElementsHidden testID="orb-live-layer" style={{ position: 'absolute', opacity: opacity.current }}>
        <GLView onContextCreate={create} style={{ width: inner, height: inner, transform: [{ scale: 1 / RENDER_SCALE }] }} />
      </Animated.View>}
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
  if (renderer.debug) renderer.debug.onShaderError = () => { throw new Error('orb_shader_unavailable'); };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  camera.zoom = 1 / ORB_AMBIENT_PROFILES[runtime.current.variant].canvasScale;
  camera.updateProjectionMatrix();
  camera.position.set(0, 0.02, CAMERA_DISTANCE);
  const root = new THREE.Group();
  scene.add(root);
  const body = createOrbBody();
  root.add(body.mesh);
  const aura = createOrbAura(runtime.current.variant);
  scene.add(aura.mesh);

  let glass: ReturnType<typeof createClockGlass> | null = null;
  let atlas: THREE.Texture | null = null;
  let glassReady = false;
  const report = (ready: boolean) => {
    if (glassReady !== ready) {
      glassReady = ready;
      // Plain accessible text stays visible until the complete canvas finishes fading.
      if (!ready) runtime.current.onGlassReady?.(false);
    }
  };
  if (runtime.current.clock) {
    void loadClockAtlas().then(texture => {
      if (disposed) { texture.dispose(); return; }
      atlas = texture;
      try { glass = createClockGlass(renderer, atlas, clockMetrics); }
      catch { runtime.current.onFailure(); return; }
      wake();
    }).catch(() => { if (!disposed) runtime.current.onFailure(); });
  }

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
  let dirty = true;
  const spinMatrix = new THREE.Matrix3();
  const spinRotation = new THREE.Matrix4();

  const draw = () => {
    requestId = null;
    if (disposed || !runtime.current.running) return;
    const now = Date.now();
    const current = runtime.current;
    const settled = levels ? coreLevelsExtra(levels, current.reducedMotion) : null;
    // A failed orb winds down and then stays still, as the Knowledge Core does.
    const moving = current.running && !current.reducedMotion && !(current.state === "error" && settled && !settled.lively);
    // Plain page touches pause idle work; ring motion and its coast remain visible.
    if (!dirty && dayOrbTouch.active && moving && !interaction.ringDragging?.current && !interaction.state.current.gesture?.rotating
      && interaction.state.current.spin.velocityX === 0 && interaction.state.current.spin.velocityY === 0 && !interacting) {
      lastFrame = now;
      requestId = requestAnimationFrame(draw);
      return;
    }
    if (dirty || now - lastRender >= (interacting || interaction.ringDragging?.current || interaction.state.current.gesture?.rotating || settled?.lively ? 16 : FRAME_MS) || !moving) {
      dirty = false;
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
        waves: interactionFrame.waves,
        time,
        life: 0.22 + (extra?.life ?? 0),
        stir: 0,
        glow: 0.35 + tones.strength * 0.75 + (extra?.glow ?? 0),
        level: extra ? orbShimmerLevel(shimmerTime) * extra.shimmerAmount : 0,
        error: extra?.error ?? 0,
        spin: spinMatrix,
        mode: current.mode,
        light: tones.position,
      });
      aura.update({ delta, shimmer: 0, shimmerAmount: 0, glow: body.uniforms.uGlow.value,
        error: extra?.error ?? 0, mode: current.mode, camera, center: root.position,
        source: body.uniforms, reducedMotion: current.reducedMotion });
      if (current.clock && !glass) return;
      try {
        if (gl.isContextLost?.()) throw new Error('orb_context_unavailable');
        aura.capture(renderer, scene, camera);
        if (glass && current.clock) {
          glass.render(scene, camera, current.clock, current.canvasSize, [tones.position.x, tones.position.y], current.mode === 'dark');
        } else renderer.render(scene, camera);
        gl.endFrameEXP();
        if (glass && current.clock) report(true);
        current.onFrameReady();
      } catch { report(false); current.onFailure(); return; }
    }
    if (!disposed && current.running && !current.reducedMotion && (moving || interacting || now < settleUntil)) requestId = requestAnimationFrame(draw);
  };

  const wake = () => {
    if (disposed || !runtime.current.running) {
      if (requestId !== null) cancelAnimationFrame(requestId);
      requestId = null;
      return;
    }
    dirty = true;
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
      aura.dispose();
      glass?.dispose(); atlas?.dispose(); report(false);
      renderer.dispose();
    },
  };
}

async function loadClockAtlas(): Promise<THREE.Texture> {
  const { Asset } = await import('expo-asset');
  const { Platform } = await import('react-native');
  const asset = Asset.fromModule(require('../../../assets/clock/clock-atlas.png'));
  await asset.downloadAsync();
  let texture: THREE.Texture;
  if (Platform.OS === 'web') {
    texture = await new THREE.TextureLoader().loadAsync(asset.uri);
  } else {
    if (!asset.localUri) throw new Error('clock_atlas_unavailable');
    texture = new THREE.Texture();
    // Expo GL's tex(Sub)Image2D explicitly accepts {localUri} in the pixels slot.
    // This uses native PNG decoding, not runtime atlas generation or another GL view.
    Object.assign(texture, { isDataTexture: true, unpackAlignment: 1,
      image: { data: { localUri: asset.localUri }, width: clockMetrics.width, height: clockMetrics.height } });
  }
  texture.flipY = false; texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace; texture.needsUpdate = true;
  return texture;
}
