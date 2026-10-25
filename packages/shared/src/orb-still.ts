import { ORB_IDLE_PALETTE } from './orb-interaction';
import type { OrbTheme } from './orb-appearance';

// Bump when the scene/frame changes: persistent assets must never reuse old optics.
export const ORB_STILL_VERSION = 'ql1-v1';
export interface OrbStillRequest { readonly color: string; readonly mode: OrbTheme; readonly pixels: number }
export function orbStillKey(request: OrbStillRequest): string {
  if (!/^#[\da-f]{6}$/i.test(request.color) || !['light', 'dark'].includes(request.mode)
    || !Number.isInteger(request.pixels) || request.pixels < 8 || request.pixels > 512) {
    throw new Error('invalid_orb_still');
  }
  return `${ORB_STILL_VERSION}-${request.color.slice(1).toLowerCase()}-${request.mode}-${request.pixels}`;
}
export function orbStillPaletteColor(index: number): string {
  return (ORB_IDLE_PALETTE[index] ?? ORB_IDLE_PALETTE[0]).hex;
}

/** Bounded promise cache: concurrent consumers share one draw; failures can retry. */
export function createOrbStillCache<T>(render: (request: OrbStillRequest) => Promise<T>, capacity = 32) {
  const entries = new Map<string, Promise<T>>();
  let generation = 0;
  return {
    get(request: OrbStillRequest): Promise<T> {
      const key = orbStillKey(request), cached = entries.get(key);
      if (cached) { entries.delete(key); entries.set(key, cached); return cached; }
      const before = generation;
      const pending = Promise.resolve().then(() => render({ ...request })).catch((error: unknown) => {
        if (generation === before && entries.get(key) === pending) entries.delete(key);
        throw error;
      });
      entries.set(key, pending);
      if (entries.size > capacity) entries.delete(entries.keys().next().value!);
      return pending;
    },
    clear() { generation++; entries.clear(); },
  };
}
