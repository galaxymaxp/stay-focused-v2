"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CORE_MOTION_PROFILES,
  coreAccessibilityLabel,
  coreMotionRate,
  coreShimmerTarget,
  coreSpinTarget,
  type CoreState,
} from "./coreModel";
import { createOrbAura } from "./orbAura";
import { createOrbBody } from "./orbBody";

// Web port of the mobile Knowledge Core
// (apps/mobile/src/features/generation-core/KnowledgeCore.tsx on
// b25-3-3-ai-first). The scene, shaders, camera and per-frame model are the
// same; expo-gl becomes a canvas, and AppState/screen focus become page
// visibility.

/** Radians per second at full spin (generating): about one turn every seven seconds. */
const ORB_MAX_SPIN = 0.9;
const SPIN_AXIS = new THREE.Vector3(0.18, 1, -0.12).normalize();
const CAMERA_DISTANCE = 4.55;
const CAMERA_FOV = 36;

type Mode = "light" | "dark";
interface SceneController {
  renderForChange: () => void;
  dispose: () => void;
}
interface RuntimeProps {
  state: CoreState;
  mode: Mode;
  reducedMotion: boolean;
  active: boolean;
}
interface TouchState {
  strength: number;
  x: number;
  y: number;
  age: number;
}

const readMode = (): Mode =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export function KnowledgeCore({ state }: { state: CoreState }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  const touch = useRef<TouchState>({ strength: 0, x: 0, y: 0, age: 10 });
  const runtime = useRef<RuntimeProps>({
    state,
    mode: "light",
    reducedMotion: false,
    active: true,
  });
  const [unsupported, setUnsupported] = useState(false);
  runtime.current.state = state;

  useEffect(() => controller.current?.renderForChange(), [state]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // A fresh canvas per mount: a disposed renderer loses its context, and
    // React may remount on the same element (StrictMode, Fast Refresh).
    const canvas = document.createElement("canvas");
    frame.prepend(canvas);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      runtime.current.mode = readMode();
      runtime.current.reducedMotion = motion.matches;
      runtime.current.active = document.visibilityState === "visible";
      controller.current?.renderForChange();
    };
    sync();
    try {
      controller.current = buildScene(canvas, runtime, touch);
    } catch {
      canvas.remove();
      setUnsupported(true);
      return;
    }
    controller.current.renderForChange();
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
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="knowledge-core"
      role="img"
      aria-label={coreAccessibilityLabel(state)}
      aria-busy={["reading", "generating", "finalizing"].includes(state)}
      data-testid="knowledge-core"
      data-state={state}
      onPointerDown={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        touch.current = {
          strength: runtime.current.reducedMotion ? 0.25 : 1,
          age: 0,
          x: (event.clientX - box.left) / box.width - 0.5,
          y: (event.clientY - box.top) / box.height - 0.5,
        };
        controller.current?.renderForChange();
      }}
    >
      {unsupported && <div className="knowledge-core-fallback" />}
    </div>
  );
}

function buildScene(
  canvas: HTMLCanvasElement,
  runtime: React.MutableRefObject<RuntimeProps>,
  touch: React.MutableRefObject<TouchState>,
): SceneController {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

  const resize = () => {
    const size = canvas.clientWidth;
    if (size > 0) renderer.setSize(size, size, false);
  };
  resize();
  const observer = new ResizeObserver(() => {
    resize();
    renderForChange();
  });
  observer.observe(canvas);

  let requestId: number | null = null;
  let disposed = false;
  let lastFrame = performance.now();
  let animatedTime = 8.4;
  let spinAngle = 0;
  let activity = 0,
    completion = 0,
    error = 0,
    spin = 0,
    shimmer = 0,
    life = 0,
    settleUntil = 0;
  const spinMatrix = new THREE.Matrix3();
  const spinRotation = new THREE.Matrix4();

  const draw = () => {
    if (disposed) return;
    if (!runtime.current.active) {
      requestId = null;
      return;
    }
    const now = performance.now();
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
    const shimmerTarget = coreShimmerTarget(
      current.state,
      current.reducedMotion,
    );
    const lifeTarget = current.reducedMotion ? 0.15 : 0.35 + activity * 0.65;
    spin += (spinTarget - spin) * momentum;
    shimmer += (shimmerTarget - shimmer) * momentum;
    life += (lifeTarget - life) * momentum;
    const motionRate = coreMotionRate(
      current.state,
      current.reducedMotion,
      completion,
    );
    // Completion settles into a slow living state without resetting phase or pose.
    animatedTime += delta * motionRate;
    spinAngle = (spinAngle + spin * ORB_MAX_SPIN * delta) % (Math.PI * 2);
    spinMatrix.setFromMatrix4(
      spinRotation.makeRotationAxis(SPIN_AXIS, spinAngle),
    );
    touch.current.strength *= Math.pow(0.2, delta);
    touch.current.age += delta;

    root.position.y = Math.sin(animatedTime * 0.5) * 0.02;
    const parallax =
      touch.current.strength * Math.min(1, touch.current.age * 3);
    camera.position.x +=
      (touch.current.x * 0.12 * parallax - camera.position.x) *
      Math.min(1, delta * 5);
    camera.position.y +=
      (-touch.current.y * 0.09 * parallax + 0.02 - camera.position.y) *
      Math.min(1, delta * 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const glow = 0.55 + activity * 0.5 + completion * 0.15;
    aura.update({
      delta,
      shimmer,
      glow,
      error,
      mode: current.mode,
      camera,
      center: root.position,
      // Reduced Motion keeps a steady glow.
      shimmerAmount: current.reducedMotion ? 0 : 0.4 + activity * 0.6,
    });
    body.update({
      time: animatedTime,
      life,
      glow,
      error,
      spin: spinMatrix,
      mode: current.mode,
      level: aura.shimmer.level,
      // A touch stirs the liquid briefly.
      stir: touch.current.strength,
    });
    renderer.render(scene, camera);
    const settling =
      now < settleUntil ||
      Math.abs(activity - profile.activity) > 0.006 ||
      Math.abs(spin - spinTarget) > 0.004 ||
      Math.abs(shimmer - shimmerTarget) > 0.004 ||
      Math.abs(life - lifeTarget) > 0.004 ||
      touch.current.strength > 0.01;
    requestId = motionRate > 0 || settling ? requestAnimationFrame(draw) : null;
  };

  function renderForChange() {
    if (disposed) return;
    settleUntil =
      performance.now() + (runtime.current.reducedMotion ? 360 : 1100);
    if (requestId === null) {
      lastFrame = performance.now();
      requestId = requestAnimationFrame(draw);
    }
  }

  return {
    renderForChange,
    dispose: () => {
      disposed = true;
      if (requestId !== null) cancelAnimationFrame(requestId);
      observer.disconnect();
      body.dispose();
      aura.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
