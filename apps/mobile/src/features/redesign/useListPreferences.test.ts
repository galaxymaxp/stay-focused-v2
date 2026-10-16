import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useListPreferences } from './useListPreferences';
import { useLibraryOpened } from './useLibraryOpened';
const mocks=vi.hoisted(()=>({owner:'',get:vi.fn(),set:vi.fn()}));
vi.mock('../../auth',()=>({useAuth:()=>({session:mocks.owner?{user:{id:mocks.owner}}:null})}));
vi.mock('../../auth/sessionStore',()=>({sessionStore:{getItem:mocks.get,setItem:mocks.set}}));
let tree:ReactTestRenderer|undefined,view:ReturnType<typeof useListPreferences>,sequence=0;
function Probe({id}:{id:string|null}){view=useListPreferences();useLibraryOpened(id);return null;}
async function flush(){await act(async()=>{for(let i=0;i<40;i++)await Promise.resolve();});}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();mocks.owner='ls1-mobile-'+sequence++;mocks.get.mockResolvedValue(null);mocks.set.mockResolvedValue(undefined);});
afterEach(async()=>{await act(async()=>tree?.unmount());tree=undefined;});
it('merges an initial open after saved preferences load, then persists chosen sorts and timestamps',async()=>{
  let resolve!:(raw:string)=>void;mocks.get.mockReturnValue(new Promise<string>(done=>{resolve=done;}));
  await act(async()=>{tree=create(createElement(Probe,{id:'artifact:r'}));});
  expect(mocks.set).not.toHaveBeenCalled();
  await act(async()=>resolve(JSON.stringify({pinned:{course:['c']},sort:{library:'course',libraryCourse:'title'}})));await flush();
  expect(view.prefs.sort).toEqual({library:'course',libraryCourse:'title'});expect(view.prefs.pinned.course).toEqual(['c']);expect(view.prefs.opened['artifact:r']).toBeDefined();
  await act(async()=>view.setSort('library','opened'));await flush();
  const stored=JSON.parse(mocks.set.mock.lastCall![1]);expect(stored.sort.library).toBe('opened');expect(stored.pinned.course).toEqual(['c']);expect(stored.opened['artifact:r']).toBeDefined();
  await act(async()=>tree!.update(createElement(Probe,{id:'artifact:r'})));await flush();expect(mocks.set).toHaveBeenCalledTimes(2);
  await act(async()=>tree!.update(createElement(Probe,{id:'quiz:q'})));await flush();expect(view.prefs.opened['quiz:q']).toBeDefined();
});
it('starts with defaults when storage rejects, keeps choices in memory and isolates owners',async()=>{
  mocks.get.mockRejectedValue(Error('unavailable'));mocks.set.mockRejectedValue(Error('unavailable'));
  await act(async()=>{tree=create(createElement(Probe,{id:null}));});await flush();expect(view.prefs.sort.libraryCourse).toBe('canvas');
  await act(async()=>view.setSort('libraryCourse','recent'));await flush();expect(view.prefs.sort.libraryCourse).toBe('recent');
  mocks.owner='different-owner-'+sequence;await act(async()=>tree!.update(createElement(Probe,{id:'activity:d'})));await flush();
  expect(view.prefs.sort.libraryCourse).toBe('canvas');expect(view.prefs.opened['activity:d']).toBeDefined();expect(view.prefs.opened['artifact:r']).toBeUndefined();
});
