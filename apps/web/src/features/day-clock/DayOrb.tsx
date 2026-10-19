"use client";
import { cancelOrbSpin } from '@stay-focused/shared';
import { useOrbInteraction, type OrbInteractionHandle } from '../knowledge-core/orbInteraction';
import { createOrbInteractionSampler } from '../knowledge-core/orbInteractionFrame';
import { memo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createClockGlass } from '@stay-focused/shared/clock-glass-renderer';
import type { ClockGlassReadout } from '@stay-focused/shared';
import clockMetrics from '../../../public/clock/clock-atlas.json';
import { createOrbBody } from "../knowledge-core/orbBody";
import { orbShimmerLevel, SHIMMER_SPEED } from "../knowledge-core/orbAura";
import {
  coreLevelsExtra,
  createCoreLevels,
  stepCoreLevels,
  type CoreLevels,
  type CoreState,
} from "../knowledge-core/coreModel";
import { dayOrbTones, type DayOrbTones } from "./dayClock";
export { DAY_ORB_FILL } from './orb-footprint';

// Web port of apps/mobile/src/features/redesign/DayOrb.tsx. Same scene,
// camera, frame rate and tones; expo-gl becomes a canvas, and AppState/screen
// focus become page visibility.

const CAMERA_DISTANCE = 4.55;
const CAMERA_FOV = 36;
/** Share of the canvas the ball's diameter fills at this camera. */
const SPIN_AXIS = new THREE.Vector3(0.18, 1, -0.12).normalize();
/** The Today orb moves slowly, so ~12 fps reads as smooth and stays cheap. */
const FRAME_MS = 80;

type Mode = "light" | "dark";
interface Runtime {
  tones: DayOrbTones;
  mode: Mode;
  reducedMotion: boolean;
  running: boolean;
  state?: CoreState;
  clock?: ClockGlassReadout;
  onGlassReady?: (ready: boolean) => void;
}

/**
 * The Today clock's body: the generation orb's glass ball and liquid, carrying
 * the day instead of the work. The liquid takes the sky of the moment and the
 * inner light is the sun or moon on its path. It turns slowly, never pulses,
 * and stops rendering when the tab is hidden. With a generation `state` it
 * shows the work by behaviour: livelier while running, still and dimmed on
 * failure, a brief brighten on completion.
 */
export const DayOrb = memo(function DayOrb({
  minutes,
  size,
  state,
  clock,
  onGlassReady,
  interaction: suppliedInteraction,
}: {
  minutes: number;
  /** Canvas size in CSS pixels; the ball fills DAY_ORB_FILL of it. Omit to fill the parent. */
  size?: number;
  state?: CoreState;
  clock?: ClockGlassReadout;
  onGlassReady?: (ready: boolean) => void;
  interaction?: OrbInteractionHandle;
}) {
  const interaction = useOrbInteraction(suppliedInteraction);
  const frameRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime>({
    tones: dayOrbTones(minutes),
    mode: "light",
    reducedMotion: false,
    running: true,
    state,
    clock,
    onGlassReady,
  });
  const controller = useRef<{ wake: () => void; dispose: () => void } | null>(
    null,
  );
  const [unsupported, setUnsupported] = useState(false);
  runtime.current.tones = dayOrbTones(minutes);
  runtime.current.state = state;
  runtime.current.clock = clock;
  runtime.current.onGlassReady = onGlassReady;
  useEffect(() => controller.current?.wake(), [minutes, state, clock?.text, clock?.fontSize]);

  useEffect(() => {
    const currentRuntime = runtime.current;
    const frame = frameRef.current;
    if (!frame) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    frame.prepend(canvas);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      runtime.current.mode =
        document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      runtime.current.reducedMotion = motion.matches;
      runtime.current.running = document.visibilityState === "visible";
      if (!runtime.current.running) interaction.state.current = cancelOrbSpin(interaction.state.current);
      controller.current?.wake();
    };
    sync();
    const lost = (event: Event) => {
      event.preventDefault();
      controller.current?.dispose(); controller.current = null;
      canvas.remove();
      currentRuntime.onGlassReady?.(false);
      setUnsupported(true);
    };
    canvas.addEventListener?.('webglcontextlost', lost);
    try {
      controller.current = buildScene(canvas, runtime, interaction);
    } catch {
      canvas.remove();
      currentRuntime.onGlassReady?.(false);
      canvas.removeEventListener?.('webglcontextlost', lost);
      setUnsupported(true);
      return;
    }
    const theme = new MutationObserver(sync);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      theme.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      controller.current?.dispose();
      controller.current = null;
      canvas.remove();
      canvas.removeEventListener?.('webglcontextlost', lost);
      currentRuntime.onGlassReady?.(false);
    };
  }, [interaction]);

  return (
    <div
      ref={frameRef}
      className="day-orb"
      style={{ width: size ?? "100%", height: size ?? "100%" }}
      aria-hidden="true"
      data-state={state}
    >
      {unsupported && <div className="day-orb-fallback" />}
    </div>
  );
});

function buildScene(
  canvas: HTMLCanvasElement,
  runtime: React.MutableRefObject<Runtime>,
  interaction: OrbInteractionHandle,
) {
  const sampleInteraction = createOrbInteractionSampler(interaction);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  // The glass is soft; a modest pixel ratio keeps the shader cheap.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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

  let glass: ReturnType<typeof createClockGlass> | null = null;
  let atlas: THREE.Texture | null = null;
  let glassReady = false;
  const report = (ready: boolean) => {
    if (glassReady !== ready) { glassReady = ready; runtime.current.onGlassReady?.(ready); }
  };
  // Generation uses DayOrb too; only Today requests the atlas/composite.
  if (runtime.current.clock) {
    new THREE.TextureLoader().load('/clock/clock-atlas.png', texture => {
      if (disposed) { texture.dispose(); return; }
      atlas = texture; atlas.flipY = false; atlas.generateMipmaps = false;
      atlas.minFilter = THREE.LinearFilter; atlas.magFilter = THREE.LinearFilter;
      atlas.colorSpace = THREE.NoColorSpace; atlas.needsUpdate = true;
      try { glass = createClockGlass(renderer, atlas, clockMetrics); }
      catch { report(false); }
      wake();
    }, undefined, () => report(false));
  }

  const resize = () => {
    const size = canvas.clientWidth;
    if (size > 0) renderer.setSize(size, size, false);
  };
  resize();
  const observer = new ResizeObserver(() => {
    resize();
    wake();
  });
  observer.observe(canvas);

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
    if (disposed) return;
    const now = Date.now();
    const current = runtime.current;
    const settled = levels ? coreLevelsExtra(levels, current.reducedMotion) : null;
    // A failed orb winds down and then stays still, as the Knowledge Core does.
    const moving = current.running && !current.reducedMotion && !(current.state === "error" && settled && !settled.lively);
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
        spinAngle =
          (spinAngle + delta * (extra ? Math.max(0, turn + extra.spin) : turn)) %
          (Math.PI * 2);
        if (levels) shimmerTime = (shimmerTime + levels.shimmer * SHIMMER_SPEED * delta) % 10000;
      }
      spinMatrix.setFromMatrix4(
        spinRotation.makeRotationAxis(SPIN_AXIS, spinAngle),
      );
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
      if (glass && current.clock) {
        try {
          glass.render(scene, camera, current.clock, canvas.clientWidth, [tones.position.x, tones.position.y], current.mode === 'dark');
          report(true);
        } catch {
          glass.dispose(); glass = null; renderer.setRenderTarget(null);
          report(false); renderer.render(scene, camera);
        }
      } else renderer.render(scene, camera);
    }
    if (!disposed && current.running && !current.reducedMotion && (moving || interacting || now < settleUntil))
      requestId = requestAnimationFrame(draw);
  };

  const wake = () => {
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
      observer.disconnect();
      body.dispose();
      glass?.dispose(); atlas?.dispose(); report(false);
      renderer.dispose();
    },
  };
}
