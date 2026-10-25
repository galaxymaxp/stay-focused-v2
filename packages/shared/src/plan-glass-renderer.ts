// Lazy GPU-only entry. Both platforms own only context, atlas upload and focus.
import * as THREE from 'three';
import { createOrbBody } from './orb-body-renderer';
import { createOrbStage, configureOrbRenderer } from './orb-scene';
import { createOrbAmbient } from './orb-ambient-renderer';
import { createClockGlass } from './clock-glass-renderer';
import type { ClockGlyphMetrics } from './clock-glyphs';

export const PLAN_SLOSH_MS = 600;
export const PLAN_ACCENT = '#d7aa38';

/** A bounded damped surface tilt; the shell and light never move. */
export function planSlosh(elapsed: number, side: number, reducedMotion: boolean) {
  if (reducedMotion || elapsed < 0 || elapsed >= PLAN_SLOSH_MS) return 0;
  const t = elapsed / PLAN_SLOSH_MS;
  const direction = !Number.isFinite(side) || Math.abs(side) < 0.05 ? 0.35 : Math.max(-1, Math.min(1, side));
  return direction * 0.42 * Math.sin(t * Math.PI * 3) * Math.exp(-3 * t) * (1 - t);
}

/** The bevel is included in the token radius and the requested outer bounds. */
export function createPlanShell(width: number, height: number, radius: number) {
  const aspect = width / height;
  const bevel = 0.075, depth = 0.12;
  const w = aspect - 2 * bevel, h = 1 - 2 * bevel;
  const r = Math.max(0.001, Math.min(radius / height - bevel, h / 2, w / 2));
  const x = -w / 2, y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y); shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, steps: 1, curveSegments: 16 });
  geometry.translate(0, 0, -depth / 2);
  return { geometry, halfSize: new THREE.Vector3(aspect / 2, 0.5, depth / 2 + bevel), cornerRadius: radius / height };
}

export interface PlanGlassFrame {
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly accent: string;
  readonly mode: 'light' | 'dark';
  readonly running: boolean;
  readonly reducedMotion: boolean;
  readonly pressAt: number;
  readonly pressSide: number;
}

/** Same body, ambient capture and clock composite; only the volume is a slab. */
export function createPlanGlass(renderer: THREE.WebGLRenderer, atlas: THREE.Texture, metrics: ClockGlyphMetrics) {
  configureOrbRenderer(renderer);
  const { scene, camera, root } = createOrbStage();
  const ambient = createOrbAmbient();
  const glass = (() => {
    try { return createClockGlass(renderer, atlas, metrics, true); }
    catch (error) { ambient.dispose(); throw error; }
  })();
  scene.add(ambient.mesh);
  let body: ReturnType<typeof createOrbBody> | null = null;
  let dimensions = '';
  const spin = new THREE.Matrix3();
  return {
    render(frame: PlanGlassFrame, time: number, now: number, delta: number) {
      const key = `${frame.width}/${frame.height}/${frame.radius}`;
      if (dimensions !== key) {
        dimensions = key;
        if (body) { root.remove(body.mesh); body.dispose(); }
        const shell = createPlanShell(frame.width, frame.height, frame.radius);
        body = createOrbBody(shell.geometry, shell);
        root.add(body.mesh);
        camera.aspect = frame.width / frame.height;
        camera.zoom = 2 * (camera.position.z - shell.halfSize.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        camera.position.y = 0;
        camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
        ambient.mesh.scale.set(frame.width / frame.height / 2, 0.25, 1);
      }
      if (!body) return;
      body.update({ time, life: 0.22, stir: 0, glow: 0.65, level: 0, error: 0,
        spin, mode: frame.mode, idleColor: frame.accent, light: { x: -0.3, y: -0.15, z: 0.3 } });
      // Theme changes the studio, never the hue of the liquid itself.
      body.uniforms.uDeep.value.set(frame.accent).multiplyScalar(0.25);
      body.uniforms.uSlosh.value = planSlosh(now - frame.pressAt, frame.pressSide, frame.reducedMotion);
      ambient.update(body.uniforms, delta, frame.mode, frame.reducedMotion);
      ambient.capture(renderer, scene, camera);
      glass.render(scene, camera, { text: 'Plan', fontSize: 24 }, frame.width, [-0.55, 0.72], frame.mode === 'dark', frame.height);
    },
    dispose() { body?.dispose(); ambient.dispose(); glass.dispose(); },
  };
}

/** One throttled loop, shared lifecycle semantics, no React updates per frame. */
export function createPlanGlassLoop(renderer: THREE.WebGLRenderer, atlas: THREE.Texture, metrics: ClockGlyphMetrics,
  current: () => PlanGlassFrame, ready: () => void, failure: () => void, present: () => void = () => {}) {
  const scene = createPlanGlass(renderer, atlas, metrics);
  let disposed = false, pending: number | null = null, dirty = true;
  let last = Date.now(), lastRender = 0, time = 8.4;
  const draw = () => {
    pending = null;
    const frame = current();
    if (disposed || !frame.running) return;
    const now = Date.now(), elapsed = now - frame.pressAt;
    const sloshing = !frame.reducedMotion && elapsed >= 0 && elapsed < PLAN_SLOSH_MS;
    if (frame.width > 0 && frame.height > 0 && (dirty || now - lastRender >= (sloshing ? 16 : 80))) {
      const delta = Math.min((now - last) / 1000, 0.08);
      last = now; lastRender = now; dirty = false;
      if (!frame.reducedMotion) time += delta * 0.25;
      try { scene.render(frame, time, now, delta); present(); ready(); }
      catch { failure(); return; }
    }
    if (!disposed && !frame.reducedMotion) pending = requestAnimationFrame(draw);
  };
  return {
    wake() {
      if (disposed) return;
      if (!current().running) {
        if (pending !== null) cancelAnimationFrame(pending);
        pending = null;
        return;
      }
      dirty = true; last = Date.now();
      if (pending === null) pending = requestAnimationFrame(draw);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (pending !== null) cancelAnimationFrame(pending);
      pending = null; scene.dispose();
    },
  };
}
