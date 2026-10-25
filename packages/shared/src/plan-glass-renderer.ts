// Lazy GPU-only entry. Both platforms own only context, atlas upload and focus.
import * as THREE from 'three';
import { createOrbBody } from './orb-body-renderer';
import { createOrbStage, configureOrbRenderer } from './orb-scene';
import { createOrbAmbient } from './orb-ambient-renderer';
import { createClockGlass } from './clock-glass-renderer';
import type { ClockGlyphMetrics } from './clock-glyphs';
import { ORB_MAX_IMPULSES, ORB_RIPPLE_MS, orbRippleTime, orbIdleColor, orbAnimationTime, type OrbImpulse, type OrbInteraction } from './orb-interaction';

/** Press coordinates are normalized across the slab; keyboard defaults to centre. */
export function planImpulse(impulses: readonly OrbImpulse[], x: number, y: number, now: number, reduced: boolean): readonly OrbImpulse[] {
  if (reduced) return [];
  const nx = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
  const ny = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
  const length = Math.hypot(nx, ny, 1);
  return [...impulses.filter(i => orbRippleTime(now - i.at, false) >= 0),
    { at: now, direction: { x: nx / length, y: ny / length, z: 1 / length } }].slice(-ORB_MAX_IMPULSES);
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
  readonly palette: () => OrbInteraction;
  readonly light: { readonly x: number; readonly y: number; readonly z: number };
  readonly glow: number;
  readonly mode: 'light' | 'dark';
  readonly running: boolean;
  readonly reducedMotion: boolean;
  readonly impulses: readonly OrbImpulse[];
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
  const spin = new THREE.Matrix3(), rotation = new THREE.Matrix4();
  const axis = new THREE.Vector3(0.18, 1, -0.12).normalize();
  let angle = 0;
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
      if (!frame.reducedMotion) angle = (angle + delta * 0.12) % (Math.PI * 2);
      spin.setFromMatrix4(rotation.makeRotationAxis(axis, angle));
      const waves = frame.reducedMotion ? [] : frame.impulses.filter(i => orbRippleTime(now - i.at, false) >= 0)
        .map(i => ({ direction: i.direction, time: (now - i.at) / 1000 }));
      body.update({ time, life: 0.22, stir: 0, glow: frame.glow, level: 0, error: 0,
        spin, waves, mode: frame.mode, idleColor: orbIdleColor(frame.palette(), now, frame.reducedMotion), light: frame.light });
      ambient.update(body.uniforms, delta, frame.mode, frame.reducedMotion);
      ambient.capture(renderer, scene, camera);
      glass.render(scene, camera, { text: 'Plan', fontSize: 24 }, frame.width, [frame.light.x, frame.light.y], frame.mode === 'dark', frame.height);
    },
    dispose() { body?.dispose(); ambient.dispose(); glass.dispose(); },
  };
}

/** One throttled loop, shared lifecycle semantics, no React updates per frame. */
export function createPlanGlassLoop(renderer: THREE.WebGLRenderer, atlas: THREE.Texture, metrics: ClockGlyphMetrics,
  current: () => PlanGlassFrame, ready: () => void, failure: () => void, present: () => void = () => {}) {
  const scene = createPlanGlass(renderer, atlas, metrics);
  let disposed = false, pending: number | null = null, dirty = true;
  let last = Date.now(), lastRender = 0, time = 8.4, interacting = false;
  const draw = (timestamp: number) => {
    pending = null;
    const frame = current();
    if (disposed || !frame.running) return;
    const now = orbAnimationTime(timestamp);
    const animating = !frame.reducedMotion && (now - frame.palette().colorAt < 600
      || frame.impulses.some(i => now - i.at >= 0 && now - i.at < ORB_RIPPLE_MS));
    if (frame.width > 0 && frame.height > 0 && (dirty || now - lastRender >= (animating || interacting ? 16 : 80))) {
      const delta = Math.max(0, Math.min((now - last) / 1000, 0.08));
      last = now; lastRender = now; dirty = false; interacting = animating;
      if (!frame.reducedMotion) time += delta * 0.35;
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
