"use client";
import { memo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createOrbAura } from "../knowledge-core/orbAura";
import { createOrbBody } from "../knowledge-core/orbBody";
import { dayOrbTones, type DayOrbTones } from "./dayClock";

// Web port of apps/mobile/src/features/redesign/DayOrb.tsx. Same scene,
// camera, frame rate and tones; expo-gl becomes a canvas, and AppState/screen
// focus become page visibility.

const CAMERA_DISTANCE = 4.55;
const CAMERA_FOV = 36;
/** Share of the canvas the ball's diameter fills at this camera. */
export const DAY_ORB_FILL =
  (0.95 * 2) /
  (2 * CAMERA_DISTANCE * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)));
const SPIN_AXIS = new THREE.Vector3(0.18, 1, -0.12).normalize();
/** The Today orb moves slowly, so ~12 fps reads as smooth and stays cheap. */
const FRAME_MS = 80;

type Mode = "light" | "dark";
interface Runtime {
  tones: DayOrbTones;
  mode: Mode;
  reducedMotion: boolean;
  running: boolean;
}

/**
 * The Today clock's body: the generation orb's glass ball and liquid, carrying
 * the day instead of the work. The liquid takes the sky of the moment and the
 * inner light is the sun or moon on its path. It turns slowly, never pulses,
 * and stops rendering when the tab is hidden.
 */
export const DayOrb = memo(function DayOrb({
  minutes,
  size,
}: {
  minutes: number;
  /** Canvas size in CSS pixels; the ball fills DAY_ORB_FILL of it. */
  size: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime>({
    tones: dayOrbTones(minutes),
    mode: "light",
    reducedMotion: false,
    running: true,
  });
  const controller = useRef<{ wake: () => void; dispose: () => void } | null>(
    null,
  );
  const [unsupported, setUnsupported] = useState(false);
  runtime.current.tones = dayOrbTones(minutes);
  useEffect(() => controller.current?.wake(), [minutes]);

  useEffect(() => {
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
      controller.current?.wake();
    };
    sync();
    try {
      controller.current = buildScene(canvas, runtime);
    } catch {
      canvas.remove();
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
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="day-orb"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {unsupported && <div className="day-orb-fallback" />}
    </div>
  );
});

function buildScene(
  canvas: HTMLCanvasElement,
  runtime: React.MutableRefObject<Runtime>,
) {
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
  const aura = createOrbAura();
  // A little smaller than the Knowledge Core's, so it fades before the canvas edge.
  aura.mesh.scale.setScalar(0.86);
  scene.add(aura.mesh);

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
  let lastFrame = performance.now();
  let lastRender = 0;
  let time = 8.4;
  let spinAngle = 0;
  let settleUntil = 0;
  const spinMatrix = new THREE.Matrix3();
  const spinRotation = new THREE.Matrix4();

  const draw = () => {
    requestId = null;
    if (disposed) return;
    const now = performance.now();
    const current = runtime.current;
    const moving = current.running && !current.reducedMotion;
    if (now - lastRender >= FRAME_MS || !moving) {
      const delta = Math.min((now - lastFrame) / 1000, 0.08);
      lastFrame = now;
      lastRender = now;
      const rate = current.reducedMotion ? 0.08 : 0.35;
      if (current.running) {
        time += delta * rate;
        spinAngle =
          (spinAngle + delta * (current.reducedMotion ? 0.03 : 0.12)) %
          (Math.PI * 2);
      }
      spinMatrix.setFromMatrix4(
        spinRotation.makeRotationAxis(SPIN_AXIS, spinAngle),
      );
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
        offset: current.reducedMotion
          ? { x: tones.position.x * 0.16, y: tones.position.y * 0.16 }
          : {
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
    }
    if (!disposed && (moving || now < settleUntil))
      requestId = requestAnimationFrame(draw);
  };

  const wake = () => {
    settleUntil = performance.now() + 400;
    if (requestId === null) {
      lastFrame = performance.now();
      requestId = requestAnimationFrame(draw);
    }
  };
  wake();
  return {
    wake,
    dispose: () => {
      disposed = true;
      if (requestId !== null) cancelAnimationFrame(requestId);
      observer.disconnect();
      body.dispose();
      aura.dispose();
      renderer.dispose();
    },
  };
}
