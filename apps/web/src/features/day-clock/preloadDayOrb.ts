"use client";
let chunk: Promise<typeof import('./DayOrb')> | undefined;
let atlas: HTMLImageElement | undefined;

/** Begins independent requests early; Three stays behind a dynamic import. */
export function preloadDayOrb(withClock: boolean) {
  if (withClock && !atlas && typeof Image !== 'undefined') {
    atlas = new Image(); atlas.src = '/clock/clock-atlas.png';
  }
  return chunk ??= import('./DayOrb');
}
