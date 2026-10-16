import { expect, it } from 'vitest';
import { sortCourseLibrary, type LibraryArtifactSummary } from '@stay-focused/shared';
const fixtureArtifact: LibraryArtifactSummary = { id:'r',type:'reviewer',title:'R',course:null,sourceId:null,sourceTitle:null,activityId:null,createdAt:'2026-01-01',updatedAt:'2026-01-01',lastOpenedAt:null,status:'completed',relatedArtifactIds:[] };
import { EMPTY_LIST_PREFERENCES, parseListPreferences, setLibrarySort, setLibraryOpened, arrangeList } from './listPreferences';
it('defaults old and invalid sort choices, round-trips known choices', () => {
  expect(parseListPreferences('{}').sort).toEqual({library:'recent',libraryCourse:'canvas'});
  expect(parseListPreferences('{"sort":{"library":"unknown","libraryCourse":"opened"}}').sort).toEqual(EMPTY_LIST_PREFERENCES.sort);
  const prefs = setLibrarySort(setLibrarySort(EMPTY_LIST_PREFERENCES,'library','opened'),'libraryCourse','title');
  expect(parseListPreferences(JSON.stringify(prefs))).toEqual(prefs);
  expect(parseListPreferences('null')).toEqual(EMPTY_LIST_PREFERENCES);
});
it('caps valid per-device open history and preserves latest opens through storage', () => {
  let prefs=EMPTY_LIST_PREFERENCES;
  for(let i=0;i<310;i++) prefs=setLibraryOpened(prefs,'item'+i,'2026-01-01');
  expect(Object.keys(prefs.opened)).toHaveLength(300);
  expect(prefs.opened.item0).toBeUndefined();
  prefs=setLibraryOpened(prefs,'item309','2026-02-01');
  expect(parseListPreferences(JSON.stringify(prefs)).opened.item309).toBe('2026-02-01');
  expect(parseListPreferences('{"opened":{"bad":4,"invalid":"date"}}').opened).toEqual({});
});
it('keeps pins ahead and applies title order within pinned and rest', () => {
  const items=['d','b','c','a'].map(id=>({...fixtureArtifact,id,title:id}));
  const arranged=arrangeList(items,item=>item.id,['d','b'],[]);
  expect([...sortCourseLibrary(arranged.pinned,'title'),...sortCourseLibrary(arranged.rest,'title')].map(item=>item.id)).toEqual(['b','d','a','c']);
});
