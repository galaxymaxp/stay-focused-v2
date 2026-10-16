import { describe, expect, it } from 'vitest';
import { moveLibraryItems, orderedLibrary } from './libraryOrder';
import { EMPTY_LIST_PREFERENCES, parseListPreferences, setLibraryOrder } from './listPreferences';

describe('course saved-work order', () => {
  it('keeps legacy preferences and isolates each course order', () => {
    const old = parseListPreferences(JSON.stringify({ pinned: { artifact: ['a'] } }));
    const prefs = setLibraryOrder(setLibraryOrder(old, 'course-a', ['b', 'a', 'a']), 'course-b', ['d', 'c']);
    expect(parseListPreferences(JSON.stringify(prefs))).toEqual(prefs);
    expect(prefs.libraryOrder).toEqual({ 'course-a': ['b', 'a'], 'course-b': ['d', 'c'] });
    expect(prefs.pinned.artifact).toEqual(['a']);
    expect(EMPTY_LIST_PREFERENCES.libraryOrder).toEqual({});
  });
  it('ignores damaged order data', () => {
    expect(parseListPreferences('{"libraryOrder":{"course":[3,"a",null]}}').libraryOrder).toEqual({ course: ['a'] });
    expect(parseListPreferences('{"libraryOrder":[]}').libraryOrder).toEqual({});
  });
  it('retains new items and ignores deleted IDs without changing the source list', () => {
    const items = [{ id: 'new' }, { id: 'a' }, { id: 'b' }];
    expect(orderedLibrary(items, ['b', 'deleted', 'a']).map(item => item.id)).toEqual(['b', 'a', 'new']);
    expect(orderedLibrary(items, undefined)).toBe(items);
    expect(items[0].id).toBe('new');
  });
  it('moves up and down, preserving selected block order', () => {
    const all = ['a', 'b', 'c', 'd'];
    expect(moveLibraryItems(all, all, new Set(['a']), 'c', true)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveLibraryItems(all, all, new Set(['c', 'd']), 'a', false)).toEqual(['c', 'd', 'a', 'b']);
    expect(moveLibraryItems(all, all, new Set(['a', 'c']), 'd', true)).toEqual(['b', 'd', 'a', 'c']);
  });
  it('preserves filtered-out slots and does not lose unrendered items', () => {
    const all = ['a', 'quiz', 'b', 'draft', 'c'];
    expect(moveLibraryItems(all, ['a', 'b', 'c'], new Set(['c']), 'a', false)).toEqual(['c', 'quiz', 'a', 'draft', 'b']);
  });
  it('does nothing for invalid targets or drops on the selected block', () => {
    const all = ['a', 'b'];
    expect(moveLibraryItems(all, all, new Set(['a']), 'a', true)).toBe(all);
    expect(moveLibraryItems(all, all, new Set(['a']), 'missing', false)).toBe(all);
    expect(moveLibraryItems(all, all, new Set(), 'b', false)).toBe(all);
  });
});
