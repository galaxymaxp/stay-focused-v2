import { describe, expect, it } from 'vitest';
import { fixtureArtifact } from './experience.fixtures';
import { groupLibraryByCourse, sortLibraryGroups, sortCourseLibrary } from './library-sort';
const a = { id: 'a', code: 'Z1', name: 'Alpha' }, b = { id: 'b', code: 'A1', name: 'Zulu' };
const items = [
  { ...fixtureArtifact, id: 'z', course: a, title: 'beta', createdAt: '2026-01-01', updatedAt: '2027-01-01', sourcePosition: { moduleIndex: 2, itemIndex: 1 } },
  { ...fixtureArtifact, id: 'a', course: a, title: 'Alpha', createdAt: '2026-01-02', sourcePosition: { moduleIndex: 1, itemIndex: 9 } },
  { ...fixtureArtifact, id: 'b', course: b, title: 'alpha', createdAt: '2026-01-03', sourcePosition: { moduleIndex: 1, itemIndex: 2 } },
  { ...fixtureArtifact, id: 'p', course: null, title: 'Zoo', createdAt: '2026-01-04', sourcePosition: null },
  { ...fixtureArtifact, id: 'u', course: null, title: 'Zoo', createdAt: '2026-01-05' },
];
describe('Library sorts', () => {
  it.each([['recent', ['personal','b','a']], ['course', ['b','a','personal']], ['title', ['a','b','personal']], ['opened', ['a','personal','b']]] as const)('orders groups by %s', (sort, expected) => {
    const groups = groupLibraryByCourse(items, { z: '2026-02-02', p: '2026-02-01' });
    expect(sortLibraryGroups(groups, sort).map(group => group.key)).toEqual(expected);
    expect(sortLibraryGroups([...groups].reverse(), sort).map(group => group.key)).toEqual(expected);
  });
  it.each([['canvas', ['b','a','z','p','u']], ['recent', ['u','p','b','a','z']], ['title', ['a','b','z','p','u']]] as const)('orders items by %s without mutation', (sort, expected) => {
    expect(sortCourseLibrary(items, sort).map(item => item.id)).toEqual(expected);
    expect(sortCourseLibrary([...items].reverse(), sort).map(item => item.id)).toEqual(expected);
    expect(items.map(item => item.id)).toEqual(['z','a','b','p','u']);
  });
  it('uses server open time as well as local and puts never-opened last with stable ties', () => {
    const groups = groupLibraryByCourse(items.map(item => item.id === 'b' ? { ...item, lastOpenedAt: '2026-03-01' } : item));
    expect(sortLibraryGroups(groups,'opened').map(group => group.key)).toEqual(['b','a','personal']);
  });
});
