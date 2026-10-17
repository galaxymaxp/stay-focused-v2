import { expect, it } from 'vitest';
import { EMPTY_LIST_PREFERENCES, parseListPreferences, setLibrarySort, setLibraryOrder } from './listPreferences';
it('reads PR #12 preferences and safely defaults LS1 and unknown values', () => {
  const old = { sort: { library: 'opened', libraryCourse: 'canvas' }, opened: { r: '2026-01-01' }, pinned: { course: ['c'] } };
  expect(parseListPreferences(JSON.stringify(old))).toEqual({ ...EMPTY_LIST_PREFERENCES, pinned: { ...EMPTY_LIST_PREFERENCES.pinned, course: ['c'] } });
  const prefs = setLibrarySort(setLibraryOrder(EMPTY_LIST_PREFERENCES, 'c', ['b','a']), 'c', 'title_desc');
  expect(parseListPreferences(JSON.stringify(prefs))).toEqual(prefs);
  expect(parseListPreferences('{"librarySort":{"c":"opened","d":"course","e":7}}').librarySort).toEqual({ d: 'course' });
  expect(parseListPreferences('null')).toEqual(EMPTY_LIST_PREFERENCES);
});
