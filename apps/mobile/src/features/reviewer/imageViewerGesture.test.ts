import { describe, expect, it } from 'vitest';
import { shouldDismissImage } from './imageViewerGesture';

describe('image viewer dismiss decision (dp and dp/ms)', () => {
  it.each([
    [120, 0, 1, 0, true], [119, 0, 1, 0, false], [24, 0.9, 1, 0, true],
    [23, 2, 1, 0, false], [40, 0.89, 1, 0, false], [-140, -2, 1, 0, false],
    [180, 2, 2, 0, false], [180, 2, 1.01, 0, false], [180, 2, 1, 1, false],
    [180, 0, 1, -10, true], [NaN, 2, 1, 0, false], [130, Infinity, 1, 0, false],
  ])('dy=%s vy=%s zoom=%s scrollTop=%s => %s', (dy, vy, zoom, scrollTop, expected) => {
    expect(shouldDismissImage(dy, vy, zoom, scrollTop)).toBe(expected);
  });
});
