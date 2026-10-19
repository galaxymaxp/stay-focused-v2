/** Device-only decorative interaction. Clocks/timers belong to the renderer. */
export const ORB_HOLD_MS = 250;
export const ORB_COLOR_KEY = 'sf.orb.colorKey';
export const ORB_LEGACY_COLOR_KEY = 'sf.orb.color';
export const ORB_SPIN_FRICTION_SECONDS = 0.4;
export const RING_SPIN_GAIN = 3;
export const ORB_RIPPLE_MS = 900;
// Pearl is the existing Knowledge Core light body, not a new theme color.
export const ORB_IDLE_PALETTE = [
  { key: 'pearl', token: 'knowledgeCore.light.base', hex: '#E6EAF1' },
  { key: 'gold', token: 'light.findActive', hex: '#F4C542' },
  { key: 'green', token: 'dark.green', hex: '#91D5B1' },
  { key: 'violet', token: 'dark.violet', hex: '#CFBAF2' },
  { key: 'orange', token: 'dark.orange', hex: '#F2B679' },
] as const;
export type OrbColorKey = typeof ORB_IDLE_PALETTE[number]['key'];
export function parseOrbColorKey(value: string | null): OrbColorKey {
  return ORB_IDLE_PALETTE.find(color => color.key === value)?.key ?? 'pearl';
}
export function legacyOrbIndexToKey(value: string | null): OrbColorKey {
  const oldKeys = ['gold', 'green', 'violet', 'orange'] as const;
  return oldKeys.find((_, index) => String(index) === value) ?? 'pearl';
}
export function orbColorIndex(key: OrbColorKey): number { return ORB_IDLE_PALETTE.findIndex(color => color.key === key); }
function validIndex(index: number): number { return Number.isInteger(index) && index >= 0 && index < ORB_IDLE_PALETTE.length ? index : 0; }
export function nextOrbColor(index: number): number { return (validIndex(index) + 1) % ORB_IDLE_PALETTE.length; }
export function ringOrbRadians(deltaMinutes: number): number { return deltaMinutes / 1440 * Math.PI * 2 * RING_SPIN_GAIN; }
export function classifyOrbGesture({ heldMs, dx, dy }: { heldMs: number; dx: number; dy: number }): 'tap' | 'rotate' | 'scroll' {
  const moved = Math.hypot(dx, dy) > 6;
  if (heldMs >= ORB_HOLD_MS) return 'rotate';
  return moved ? 'scroll' : 'tap';
}
export interface OrbVector { readonly x: number; readonly y: number; readonly z: number }
export function projectTapToSphere(x: number, y: number, size: number): OrbVector | null {
  if (![x, y, size].every(Number.isFinite) || size <= 0) return null;
  const nx = x * 2 / size - 1, ny = 1 - y * 2 / size;
  const r2 = nx * nx + ny * ny;
  return r2 > 1 ? null : { x: nx, y: ny, z: Math.sqrt(1 - r2) };
}
export interface OrbSpin {
  readonly x: number; readonly y: number;
  readonly velocityX: number; readonly velocityY: number;
}
/** Excess velocity over the renderer's existing idle spin, in radians/second. */
export function stepOrbSpin(state: OrbSpin, dtMs: number, reducedMotion: boolean): OrbSpin {
  if (reducedMotion) return { ...state, velocityX: 0, velocityY: 0 };
  const dt = Math.max(0, Number.isFinite(dtMs) ? dtMs : 0) / 1000;
  const decay = Math.exp(-dt / ORB_SPIN_FRICTION_SECONDS), travel = (1 - decay) * ORB_SPIN_FRICTION_SECONDS;
  const vx = state.velocityX * decay, vy = state.velocityY * decay;
  return { x: state.x + state.velocityX * travel, y: state.y + state.velocityY * travel,
    velocityX: Math.abs(vx) < 0.01 ? 0 : vx, velocityY: Math.abs(vy) < 0.01 ? 0 : vy };
}
export function orbRippleTime(tMs: number, reducedMotion: boolean): number {
  return reducedMotion || !Number.isFinite(tMs) || tMs < 0 || tMs >= ORB_RIPPLE_MS ? -1 : tMs / 1000;
}
export function orbCrossFade(tMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const t = Math.max(0, Math.min(1, tMs / 600));
  return t * t * (3 - 2 * t);
}
export function mixOrbColor(from: string, to: string, t: number): string {
  const a = Number.parseInt(from.slice(1), 16), b = Number.parseInt(to.slice(1), 16);
  const channels = [16, 8, 0].map(shift => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t));
  return '#' + channels.map(c => c.toString(16).padStart(2, '0')).join('');
}
interface OrbGesture {
  readonly x: number; readonly y: number; readonly started: number;
  readonly lastX: number; readonly lastY: number; readonly lastAt: number;
  readonly rotating: boolean; readonly scroll: boolean;
}
export interface OrbInteraction {
  readonly spin: OrbSpin; readonly gesture: OrbGesture | null;
  readonly colorIndex: number; readonly colorFrom: string; readonly colorAt: number;
  readonly tapAt: number; readonly rippleDir: OrbVector;
  readonly spinAt: number; readonly inputAt: number;
}
export function createOrbInteraction(index = 0): OrbInteraction {
  const colorIndex = validIndex(index);
  return { spin: { x: 0, y: 0, velocityX: 0, velocityY: 0 }, gesture: null,
    colorIndex, colorFrom: ORB_IDLE_PALETTE[colorIndex]!.hex, colorAt: -Infinity,
    spinAt: -Infinity, inputAt: -Infinity, tapAt: -Infinity, rippleDir: { x: 0, y: 0, z: 1 } };
}
export function orbIdleColor(state: OrbInteraction, now: number, reducedMotion: boolean): string {
  return mixOrbColor(state.colorFrom, ORB_IDLE_PALETTE[state.colorIndex]!.hex, orbCrossFade(now - state.colorAt, reducedMotion));
}
/** Decay exactly once when input and renderer samples interleave. A held ball keeps its pose. */
function advanceSpin(state: OrbInteraction, now: number, fallbackMs = 0, reducedMotion = false): OrbInteraction {
  const elapsed = Number.isFinite(state.spinAt) ? Math.max(0, now - state.spinAt) : fallbackMs;
  const spin = stepOrbSpin(state.spin, elapsed, reducedMotion);
  return { ...state, spinAt: now, spin: state.gesture?.rotating ? { ...spin, x: state.spin.x, y: state.spin.y } : spin };
}
function spinSample(state: OrbInteraction, dx: number, dy: number, now: number, reducedMotion: boolean): OrbInteraction {
  const dt = Math.max(16, Number.isFinite(state.inputAt) ? now - state.inputAt : 16) / 1000;
  const current = advanceSpin(state, now, 0, reducedMotion);
  const alpha = 1 - Math.exp(-dt / 0.1);
  const speed = (previous: number, angle: number) => reducedMotion ? 0
    : angle === 0 ? previous : Math.max(-10, Math.min(10, previous + alpha * (Math.max(-10, Math.min(10, angle / dt)) - previous)));
  return { ...current, inputAt: now, spin: { x: current.spin.x + dx, y: current.spin.y + dy,
    velocityX: speed(current.spin.velocityX, dx), velocityY: speed(current.spin.velocityY, dy) } };
}
/** Clockwise ring motion moves the front of the ball right. Only physical input calls this. */
export function pushOrbSpin(state: OrbInteraction, deltaRadians: number, now: number, reducedMotion = false): OrbInteraction {
  return Number.isFinite(deltaRadians) ? spinSample(state, 0, deltaRadians, now, reducedMotion) : state;
}
export function cancelOrbSpin(state: OrbInteraction): OrbInteraction {
  return { ...state, gesture: null, spin: { ...state.spin, velocityX: 0, velocityY: 0 } };
}
export function beginOrbGesture(state: OrbInteraction, x: number, y: number, now: number): OrbInteraction {
  return { ...advanceSpin(state, now), inputAt: now,
    gesture: { x, y, started: now, lastX: x, lastY: y, lastAt: now, rotating: false, scroll: false } };
}
export function moveOrbGesture(state: OrbInteraction, x: number, y: number, size: number, now: number, reducedMotion: boolean): OrbInteraction {
  const g = state.gesture;
  if (!g || g.scroll) return state;
  const kind = classifyOrbGesture({ heldMs: now - g.started, dx: x - g.x, dy: y - g.y });
  if (!g.rotating && kind !== 'rotate') return kind === 'scroll' ? { ...cancelOrbSpin(state), gesture: { ...g, scroll: true } } : state;
  const scale = Math.PI / Math.max(1, size);
  const held = { ...state, gesture: { ...g, rotating: true } };
  return { ...spinSample(held, (y - g.lastY) * scale, (x - g.lastX) * scale, now, reducedMotion),
    gesture: { ...g, rotating: true, lastX: x, lastY: y, lastAt: now } };
}
export function endOrbGesture(state: OrbInteraction, x: number, y: number, size: number, now: number, reducedMotion: boolean, cancelled = false): OrbInteraction {
  const g = state.gesture;
  if (!g) return state;
  const direction = projectTapToSphere(x, y, size);
  const tap = !cancelled && !g.scroll && !g.rotating && direction && classifyOrbGesture({ heldMs: now - g.started, dx: x - g.x, dy: y - g.y }) === 'tap';
  const current = advanceSpin(state, now, 0, reducedMotion);
  return { ...(cancelled || reducedMotion || g.scroll ? cancelOrbSpin(current) : current), gesture: null,
    ...(tap ? { colorFrom: orbIdleColor(state, now, reducedMotion), colorIndex: nextOrbColor(state.colorIndex), colorAt: now, tapAt: now, rippleDir: direction } : {}) };
}
export function sampleOrbInteraction(state: OrbInteraction, now: number, dtMs: number, reducedMotion: boolean) {
  const next = advanceSpin(state, now, dtMs, reducedMotion);
  const rippleTime = orbRippleTime(now - state.tapAt, reducedMotion);
  const animating = !reducedMotion && (rippleTime >= 0 || now - state.colorAt < 600 || next.spin.velocityX !== 0 || next.spin.velocityY !== 0);
  return { state: next, rippleTime, idleColor: orbIdleColor(state, now, reducedMotion), animating };
}
