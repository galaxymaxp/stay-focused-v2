import { describe, expect, it } from 'vitest';
import { offlineLibraryCaption } from './libraryPresentation';

describe('offline caption wording twin (web has no offline mode)', () => {
  it.each([
    [{ total: 72, current: 41 }, true, 'Saving for offline use… 41 of 72'],
    [{ total: 72, current: 72 }, false, '72 saved for offline use'],
    [{ total: 72, current: 40 }, false, "40 of 72 saved for offline use · the rest saves when you're online"],
    [{ total: 72, current: 70, failedPermanent: 2 }, false, '70 saved for offline use · 2 need a connection to open'],
  ] as const)('formats %j', (stats, saving, expected) => {
    expect(offlineLibraryCaption(stats, saving)).toBe(expected);
  });
});
