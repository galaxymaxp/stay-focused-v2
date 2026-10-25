import { expect, it } from 'vitest';
import { planBlockMarks } from './plan-block-marks';
it.each([23.99, 24, 24.01])('linear visible-length boundary %s', length => {
  expect(planBlockMarks({ shape: 'linear', length, thickness: 16 }, 16)).toEqual({ logo: length >= 24, kind: false });
});
it.each([15.99, 16, 16.01])('thickness boundary %s', thickness => {
  expect(planBlockMarks({ shape: 'linear', length: 24, thickness }, 16).logo).toBe(thickness >= 16);
});
it.each([23.99, 24, 24.01])('ring arc at the logo radius boundary %s', length => {
  expect(planBlockMarks({ shape: 'ring', angleRadians: length / 100, logoRadius: 100, thickness: 16 }, 16).logo).toBe(length >= 24);
});
it('hides all marks on tiny rings; permits a full ring and fails closed for invalid sizes', () => {
  expect(planBlockMarks({ shape: 'ring', angleRadians: 0.01, logoRadius: 100, thickness: 30 }, 16, 12)).toEqual({ logo: false, kind: false });
  expect(planBlockMarks({ shape: 'ring', angleRadians: 2 * Math.PI, logoRadius: 100, thickness: 30 }, 16, 12)).toEqual({ logo: true, kind: true });
  for (const length of [NaN, Infinity, -1]) expect(planBlockMarks({ shape: 'linear', length, thickness: 30 }, 16, 12)).toEqual({ logo: false, kind: false });
});
it('drops kind before logo; remeasuring preview resize changes visibility immediately', () => {
  const marks = (length: number) => planBlockMarks({ shape: 'linear', length, thickness: 24 }, 16, 12);
  expect(marks(40)).toEqual({ logo: true, kind: true });
  expect(marks(39.99)).toEqual({ logo: true, kind: false });
  expect(marks(24)).toEqual({ logo: true, kind: false });
  expect(marks(23.99)).toEqual({ logo: false, kind: false });
  expect(marks(40)).toEqual({ logo: true, kind: true });
});
it('ring scaling and existing 6px lane thickness never admit a partial mark', () => {
  for (const scale of [0.5, 0.75, 1, 1.5]) expect(planBlockMarks({ shape: 'ring', angleRadians: Math.PI, logoRadius: 100 * scale, thickness: 6 * scale }, 16, 12)).toEqual({ logo: false, kind: false });
});
