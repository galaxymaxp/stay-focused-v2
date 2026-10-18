/** Device-only decorative interaction. Clocks/timers belong to the renderer. */
export const ORB_HOLD_MS = 250;
export const ORB_COLOR_KEY = 'sf.orb.color';
// Existing themeTokens: light.findActive (gold), dark.green, dark.violet, dark.orange.
// The theme's current accent itself is neutral; the existing gold emphasis is findActive.
export const ORB_IDLE_PALETTE = [
  { token: 'light.findActive', hex: '#F4C542' },
  { token: 'dark.green', hex: '#91D5B1' },
  { token: 'dark.violet', hex: '#CFBAF2' },
  { token: 'dark.orange', hex: '#F2B679' },
] as const;
export function parseOrbColor(value: string | null): number {
  const index = value === null || value.trim() === '' ? 0 : Number(value);
  return Number.isInteger(index) && index >= 0 && index < ORB_IDLE_PALETTE.length ? index : 0;
}
export function nextOrbColor(index: number): number { return (parseOrbColor(String(index)) + 1) % ORB_IDLE_PALETTE.length; }
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
  const decay = Math.exp(-6 * dt), travel = (1 - decay) / 6;
  const vx = state.velocityX * decay, vy = state.velocityY * decay;
  return { x: state.x + state.velocityX * travel, y: state.y + state.velocityY * travel,
    velocityX: Math.abs(vx) < 0.002 ? 0 : vx, velocityY: Math.abs(vy) < 0.002 ? 0 : vy };
}
export function orbBulge(tMs: number, reducedMotion: boolean): number {
  if (reducedMotion || tMs < 0 || tMs >= 650) return 0;
  const t = tMs / 650;
  return Math.min(1, Math.abs(Math.sin(t * Math.PI * 2)) * Math.exp(-3 * t) * 1.9 * (1 - t));
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
  readonly tapAt: number; readonly bulgeDir: OrbVector;
}
export function createOrbInteraction(index = 0): OrbInteraction {
  const colorIndex = parseOrbColor(String(index));
  return { spin: { x: 0, y: 0, velocityX: 0, velocityY: 0 }, gesture: null,
    colorIndex, colorFrom: ORB_IDLE_PALETTE[colorIndex]!.hex, colorAt: -Infinity,
    tapAt: -Infinity, bulgeDir: { x: 0, y: 0, z: 1 } };
}
export function orbIdleColor(state: OrbInteraction, now: number, reducedMotion: boolean): string {
  return mixOrbColor(state.colorFrom, ORB_IDLE_PALETTE[state.colorIndex]!.hex, orbCrossFade(now - state.colorAt, reducedMotion));
}
export function beginOrbGesture(state: OrbInteraction, x: number, y: number, now: number): OrbInteraction {
  return { ...state, spin: { ...state.spin, velocityX: 0, velocityY: 0 },
    gesture: { x, y, started: now, lastX: x, lastY: y, lastAt: now, rotating: false, scroll: false } };
}
export function moveOrbGesture(state: OrbInteraction, x: number, y: number, size: number, now: number, reducedMotion: boolean): OrbInteraction {
  const g = state.gesture;
  if (!g || g.scroll) return state;
  const kind = classifyOrbGesture({ heldMs: now - g.started, dx: x - g.x, dy: y - g.y });
  if (!g.rotating && kind !== 'rotate') return kind === 'scroll' ? { ...state, gesture: { ...g, scroll: true } } : state;
  const scale = Math.PI / Math.max(1, size), dt = Math.max(16, now - g.lastAt) / 1000;
  const rx = (y - g.lastY) * scale, ry = (x - g.lastX) * scale;
  const speed = (angle: number) => reducedMotion ? 0 : Math.max(-8, Math.min(8, angle / dt));
  return { ...state, spin: { x: state.spin.x + rx, y: state.spin.y + ry, velocityX: speed(rx), velocityY: speed(ry) },
    gesture: { ...g, rotating: true, lastX: x, lastY: y, lastAt: now } };
}
export function endOrbGesture(state: OrbInteraction, x: number, y: number, size: number, now: number, reducedMotion: boolean, cancelled = false): OrbInteraction {
  const g = state.gesture;
  if (!g) return state;
  const direction = projectTapToSphere(x, y, size);
  const tap = !cancelled && !g.scroll && !g.rotating && direction && classifyOrbGesture({ heldMs: now - g.started, dx: x - g.x, dy: y - g.y }) === 'tap';
  return { ...state, gesture: null,
    spin: cancelled || reducedMotion || now - g.lastAt > 80 ? { ...state.spin, velocityX: 0, velocityY: 0 } : state.spin,
    ...(tap ? { colorFrom: orbIdleColor(state, now, reducedMotion), colorIndex: nextOrbColor(state.colorIndex), colorAt: now, tapAt: now, bulgeDir: direction } : {}) };
}
export function sampleOrbInteraction(state: OrbInteraction, now: number, dtMs: number, reducedMotion: boolean) {
  const next = { ...state, spin: state.gesture?.rotating ? state.spin : stepOrbSpin(state.spin, dtMs, reducedMotion) };
  const bulgeAmount = orbBulge(now - state.tapAt, reducedMotion);
  const animating = !reducedMotion && (now - state.tapAt < 650 || now - state.colorAt < 600 || next.spin.velocityX !== 0 || next.spin.velocityY !== 0);
  return { state: next, bulgeAmount, idleColor: orbIdleColor(state, now, reducedMotion), animating };
}
