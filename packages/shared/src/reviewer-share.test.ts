import { expect, it } from 'vitest';
import { isReviewerShareToken, reviewerSharePath, reviewerShareSignIn, sharedReturnPath } from './reviewer-share';
it('accepts only 256-bit opaque link tokens', () => {
  const token = 'a'.repeat(64);
  expect(isReviewerShareToken(token)).toBe(true);
  for (const bad of ['', '../private', 'a'.repeat(63), 'z'.repeat(64), 'a'.repeat(65)]) expect(isReviewerShareToken(bad)).toBe(false);
  expect(reviewerSharePath(token)).toBe(`/s/${token}`); expect(reviewerShareSignIn(token)).toBe(`/sign-in?next=%2Fs%2F${token}`);
});
it('allows only the exact shared local route after sign-in, excluding open redirects and private routes', () => {
  expect(sharedReturnPath(`/s/${'a'.repeat(64)}`)).toBe(`/s/${'a'.repeat(64)}`);
  for (const value of [null, 'https://evil.test', '//evil.test', '/today', '/s/bad', `/s/${'a'.repeat(64)}?next=evil`, '/\\evil.test']) expect(sharedReturnPath(value)).toBe('/today');
});
