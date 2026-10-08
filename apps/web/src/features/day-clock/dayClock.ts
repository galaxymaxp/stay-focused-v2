// Mirrors apps/mobile/src/features/redesign/dayClock.ts so the web and app clocks behave identically.
/**
 * Pure model for the Today glass clock: ring geometry, touch hit-testing,
 * continuous drag math with snap-on-release, and the day state painted inside
 * the glass. Kept free of React so it can be tested and reused.
 *
 * Orientation reads like a wall clock (and iOS Bedtime): midnight at the top,
 * 6 AM on the right, noon at the bottom, 6 PM on the left, running clockwise.
 */

export const DAY_MINUTES = 1440;
export const SNAP_MINUTES = 15;
export const MIN_RANGE_MINUTES = SNAP_MINUTES;

/** Design-space geometry; the component scales it to the available width. */
export const CLOCK = {
  size: 340,
  center: 170,
  ring: 136,
  track: 16,
  lane: 116,
  glass: 102,
  /** Generous invisible bands around the visible ring. */
  touchInner: 92,
  touchOuter: 168,
  /** Arc length, in design points, within which a handle wins the touch. */
  handleReach: 40,
} as const;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Minutes → point on a circle of the given radius around the clock center. */
export function ringPoint(minutes: number, radius: number = CLOCK.ring, center: number = CLOCK.center) {
  const angle = (minutes / DAY_MINUTES) * Math.PI * 2 - Math.PI / 2;
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}

/** Offset from the center → minutes of the day (0 ≤ m < 1440). */
export function angleMinutes(dx: number, dy: number) {
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return (((degrees % 360) + 360) % 360) * 4;
}

/**
 * Follows the finger continuously: picks the angular reading nearest the
 * previous value (so midnight never wraps a range inside out) and clamps to
 * the day. No snapping happens here.
 */
export function followMinutes(previous: number, angle: number) {
  const nearest = [angle - DAY_MINUTES, angle, angle + DAY_MINUTES].reduce((best, value) =>
    Math.abs(value - previous) < Math.abs(best - previous) ? value : best,
  );
  return clamp(nearest, 0, DAY_MINUTES);
}

/** Shortest signed angular change between two readings, in minutes. */
export function angularDelta(from: number, to: number) {
  let delta = to - from;
  if (delta > DAY_MINUTES / 2) delta -= DAY_MINUTES;
  if (delta < -DAY_MINUTES / 2) delta += DAY_MINUTES;
  return delta;
}

export function snapTo(minutes: number, step: number = SNAP_MINUTES) {
  return clamp(Math.round(minutes / step) * step, 0, DAY_MINUTES);
}

/** Moves a whole block, preserving its duration inside the day. */
export function moveRange(start: number, end: number, delta: number) {
  const duration = end - start;
  const nextStart = clamp(start + delta, 0, DAY_MINUTES - duration);
  return { start: nextStart, end: nextStart + duration };
}

/** Keeps one edge from crossing the other while it is dragged. */
export function dragEdge(edge: "start" | "end", value: number, start: number, end: number) {
  return edge === "start"
    ? { start: clamp(value, 0, end - MIN_RANGE_MINUTES), end }
    : { start, end: clamp(value, start + MIN_RANGE_MINUTES, DAY_MINUTES) };
}

/**
 * Snap applied once, on release. A moved block keeps its duration (both edges
 * shift together); a resized edge snaps on its own.
 */
export function snapRange(start: number, end: number, mode: "start" | "end" | "move") {
  if (mode === "move") {
    const duration = snapTo(end - start) || MIN_RANGE_MINUTES;
    const snappedStart = clamp(snapTo(start), 0, DAY_MINUTES - duration);
    return { start: snappedStart, end: snappedStart + duration };
  }
  const snapped = { start: snapTo(start), end: snapTo(end) };
  if (snapped.end - snapped.start < MIN_RANGE_MINUTES) {
    return mode === "start"
      ? { start: snapped.end - MIN_RANGE_MINUTES, end: snapped.end }
      : { start: snapped.start, end: snapped.start + MIN_RANGE_MINUTES };
  }
  return snapped;
}

function withinRange(minutes: number, start: number, end: number) {
  return minutes >= start && minutes <= end;
}

/**
 * Decides what a touch at (x, y) (design points, relative to the clock's
 * top-left) should drag. Handles win within a generous arc around them; the
 * rest of the free-time arc moves the whole block. Touches elsewhere are left
 * alone so the page can scroll.
 */
export function hitTest(x: number, y: number, start: number, end: number): "start" | "end" | "move" | null {
  const dx = x - CLOCK.center;
  const dy = y - CLOCK.center;
  const distance = Math.hypot(dx, dy);
  if (distance < CLOCK.touchInner || distance > CLOCK.touchOuter) return null;
  const minutes = angleMinutes(dx, dy);
  const reach = (CLOCK.handleReach / (2 * Math.PI * CLOCK.ring)) * DAY_MINUTES;
  const startGap = Math.abs(angularDelta(minutes, start));
  const endGap = Math.abs(angularDelta(minutes, end));
  const nearest = startGap <= endGap ? "start" : "end";
  if (withinRange(minutes, start, end)) {
    // Inside the block the ends share it with the middle: a short block keeps
    // its central third for moving the whole thing.
    const inside = Math.min(reach, (end - start) / 3);
    return Math.min(startGap, endGap) <= inside ? nearest : "move";
  }
  return Math.min(startGap, endGap) <= reach ? nearest : null;
}

/**
 * The scheduled block on the inner lane under a touch, if any. Touches within
 * reach of a handle stay with the handle.
 */
export function segmentAt<T extends { readonly id: string; readonly from: number; readonly to: number }>(
  x: number,
  y: number,
  segments: readonly T[],
  handles: readonly number[],
): T | null {
  const dx = x - CLOCK.center;
  const dy = y - CLOCK.center;
  const distance = Math.hypot(dx, dy);
  if (distance < CLOCK.lane - 20 || distance > CLOCK.ring - CLOCK.track / 2 + 2) return null;
  for (const handle of handles) {
    const p = ringPoint(handle);
    if (Math.hypot(x - p.x, y - p.y) < 30) return null;
  }
  const minutes = angleMinutes(dx, dy);
  const slack = 10;
  return segments.find((segment) => minutes >= segment.from - slack && minutes <= segment.to + slack) ?? null;
}

/* ------------------------------------------------------------------------ */
/* Day state inside the glass                                               */
/* ------------------------------------------------------------------------ */

type Rgb = readonly [number, number, number];

interface SkyStop {
  readonly at: number;
  readonly top: Rgb;
  readonly mid: Rgb;
  readonly horizon: Rgb;
  /** Light the glass spills onto the page around it. */
  readonly glow: Rgb;
}

const hex = (value: string): Rgb => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
];

/**
 * Keyframes across the day. Colors blend continuously between neighbours, so
 * there is never a hard switch between pre-dawn, sunrise, noon, sunset and
 * night. Daylight blues are kept deep enough for white time text.
 */
const SKY: readonly SkyStop[] = [
  { at: 0, top: hex("#04060F"), mid: hex("#0A1128"), horizon: hex("#16213F"), glow: hex("#3C5A9E") },
  { at: 270, top: hex("#060A1C"), mid: hex("#111A3C"), horizon: hex("#262E5C"), glow: hex("#44579A") },
  { at: 330, top: hex("#141F45"), mid: hex("#3A3A6E"), horizon: hex("#9A6A86"), glow: hex("#8A6C9C") },
  { at: 375, top: hex("#27427A"), mid: hex("#7A6690"), horizon: hex("#F0A070"), glow: hex("#F2A474") },
  { at: 440, top: hex("#3570B4"), mid: hex("#6090BF"), horizon: hex("#F2CFA6"), glow: hex("#F1C99A") },
  { at: 560, top: hex("#2C6CBC"), mid: hex("#5089C6"), horizon: hex("#B9D8EF"), glow: hex("#A9CDEE") },
  { at: 720, top: hex("#2466B8"), mid: hex("#4A88C8"), horizon: hex("#C4E0F4"), glow: hex("#B6D9F5") },
  { at: 900, top: hex("#2D66AE"), mid: hex("#5588BC"), horizon: hex("#E6D6B6"), glow: hex("#EBD2A0") },
  { at: 1030, top: hex("#34508C"), mid: hex("#9B6A8C"), horizon: hex("#F29458"), glow: hex("#F29A66") },
  { at: 1095, top: hex("#1D2653"), mid: hex("#4B3C70"), horizon: hex("#B45E78"), glow: hex("#A26AA2") },
  { at: 1170, top: hex("#0C1433"), mid: hex("#18234A"), horizon: hex("#2E3868"), glow: hex("#4763A8") },
  { at: 1440, top: hex("#04060F"), mid: hex("#0A1128"), horizon: hex("#16213F"), glow: hex("#3C5A9E") },
];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const rgb = (value: Rgb, alpha = 1) =>
  alpha >= 1
    ? `rgb(${Math.round(value[0])},${Math.round(value[1])},${Math.round(value[2])})`
    : `rgba(${Math.round(value[0])},${Math.round(value[1])},${Math.round(value[2])},${alpha})`;

/** Relative luminance (0–1) of an sRGB color. */
export function luminance(value: Rgb) {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(value[0]) + 0.7152 * channel(value[1]) + 0.0722 * channel(value[2]);
}

export interface DayState {
  readonly top: string;
  readonly mid: string;
  readonly horizon: string;
  /** Darker water/ground tone below the horizon line. */
  readonly ground: string;
  readonly glow: string;
  /** 0 at full daylight, 1 in deep night: drives stars and moonlight. */
  readonly night: number;
  /** Warmth near the horizon (sunrise/sunset): drives the horizon bloom. */
  readonly warmth: number;
  /** Sun (day) or moon (night) position, as fractions of the glass radius. */
  readonly body: { readonly kind: "sun" | "moon"; readonly x: number; readonly y: number; readonly altitude: number };
  /** Scrim strength behind the time text so it stays readable on bright skies. */
  readonly scrim: number;
}

const SUNRISE = 360;
const SUNSET = 1080;

/**
 * Where the sun or moon sits inside the glass. Not astronomy: the sun rises on
 * the left at 6 AM, peaks at noon and sets on the right at 6 PM, matching the
 * ring outside; the moon takes the same path overnight. x and y are fractions
 * of the glass radius from its center (y grows downward); the horizon is at
 * `HORIZON_Y`.
 */
export const HORIZON_Y = 0.42;
export function celestialBody(minutes: number) {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const day = m >= SUNRISE && m < SUNSET;
  const progress = day ? (m - SUNRISE) / (SUNSET - SUNRISE) : (((m - SUNSET) + DAY_MINUTES) % DAY_MINUTES) / (DAY_MINUTES - (SUNSET - SUNRISE));
  const theta = Math.PI * (1 - progress);
  const altitude = Math.sin(theta);
  return {
    kind: day ? ("sun" as const) : ("moon" as const),
    x: 0.8 * Math.cos(theta),
    y: HORIZON_Y - (HORIZON_Y + 0.68) * altitude,
    altitude,
  };
}

export function dayStateAt(minutes: number): DayState {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const index = Math.max(0, SKY.findIndex((stop, i) => i < SKY.length - 1 && m >= stop.at && m < SKY[i + 1]!.at));
  const a = SKY[index]!;
  const b = SKY[index + 1] ?? SKY[0]!;
  const span = b.at - a.at || 1;
  // Smoothstep so each phase eases into the next instead of changing linearly.
  const raw = clamp((m - a.at) / span, 0, 1);
  const t = raw * raw * (3 - 2 * raw);
  const top = mix(a.top, b.top, t);
  const mid = mix(a.mid, b.mid, t);
  const horizon = mix(a.horizon, b.horizon, t);
  const glow = mix(a.glow, b.glow, t);
  const body = celestialBody(m);
  const sunAltitude = body.kind === "sun" ? body.altitude : -body.altitude;
  const night = clamp(0.5 - sunAltitude * 2.2, 0, 1);
  // Warm when the sun is low (either side of the horizon), none at noon.
  const warmth = clamp(1 - Math.abs(sunAltitude) * 3.2, 0, 1) * (horizon[0] > horizon[2] ? 1 : 0.35);
  const midLight = luminance(mid);
  return {
    top: rgb(top),
    mid: rgb(mid),
    horizon: rgb(horizon),
    ground: rgb(mix(mix(horizon, top, 0.8), [0, 0, 0], 0.18)),
    // Spilled light is softer and less saturated than the sky it comes from.
    glow: rgb(mix(glow, [luminance(glow) * 255, luminance(glow) * 255, luminance(glow) * 255], 0.35)),
    night,
    warmth,
    body,
    scrim: clamp((midLight - 0.1) * 1.6, 0, 0.34),
  };
}

const hexOf = (value: Rgb) => `#${value.map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
const parseRgb = (value: string): Rgb => {
  const [r, g, b] = value.match(/\d+(\.\d+)?/g)!.map(Number);
  return [r!, g!, b!];
};

export interface DayOrbTones {
  /** Lit liquid. */
  readonly base: string;
  /** Liquid in shadow. */
  readonly deep: string;
  /** The inner light: warm sun by day, cool moon by night. */
  readonly light: string;
  /** Light spilled around the ball. */
  readonly aura: string;
  /** Inner light position in ball radii (y up, z toward the viewer). */
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  /** Inner light strength, 0–1. */
  readonly strength: number;
}

/**
 * The Today orb's liquid carries the sky of the moment, and its inner light
 * is the sun or moon on the same path as the flat sky model: rising on the
 * left, highest at noon (or midnight for the moon), setting on the right.
 */
export function dayOrbTones(minutes: number): DayOrbTones {
  const state = dayStateAt(minutes);
  const top = parseRgb(state.top);
  const mid = parseRgb(state.mid);
  const horizon = parseRgb(state.horizon);
  const { body } = state;
  const low = 1 - body.altitude;
  const sunLight = mix(hex("#FFF1D2"), hex("#FFB46E"), clamp((low - 0.35) / 0.65, 0, 1));
  const light = body.kind === "sun" ? sunLight : hex("#C8D6FF");
  return {
    base: hexOf(mix(mix(mid, horizon, 0.45), [255, 255, 255], 0.28)),
    deep: hexOf(mix(top, [0, 0, 0], 0.25)),
    light: hexOf(light),
    aura: hexOf(parseRgb(state.glow)),
    position: { x: body.x * 0.6, y: -body.y * 0.55, z: 0.28 },
    strength: body.kind === "sun" ? 0.45 + 0.4 * body.altitude : 0.32 + 0.1 * body.altitude,
  };
}
