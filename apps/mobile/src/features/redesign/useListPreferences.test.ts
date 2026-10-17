import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useListPreferences } from './useListPreferences';
const mocks=vi.hoisted(()=>({owner:'',get:vi.fn(),set:vi.fn()}));
vi.mock('../../auth',()=>({useAuth:()=>({session:mocks.owner?{user:{id:mocks.owner}}:null})}));
vi.mock('../../auth/sessionStore',()=>({sessionStore:{getItem:mocks.get,setItem:mocks.set}}));
let tree:ReactTestRenderer|undefined,view:ReturnType<typeof useListPreferences>,sequence=0;
function Probe(){view=useListPreferences();return null;}
async function flush(){await act(async()=>{for(let i=0;i<40;i++)await Promise.resolve();});}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();mocks.owner='ls1-mobile-'+sequence++;mocks.get.mockResolvedValue(null);mocks.set.mockResolvedValue(undefined);});
afterEach(async()=>{await act(async()=>tree?.unmount());tree=undefined;});
it('waits for saved preferences before persisting an early sort choice',async()=>{
  let resolve!:(raw:string)=>void;mocks.get.mockReturnValue(new Promise<string>(done=>{resolve=done;}));
  await act(async()=>{tree=create(createElement(Probe));});
  await act(async()=>view.sortLibrary('course','title_desc'));
  expect(mocks.set).not.toHaveBeenCalled();
  await act(async()=>resolve(JSON.stringify({pinned:{course:['c']},libraryOrder:{course:['b','a']}})));await flush();
  expect(view.prefs.pinned.course).toEqual(['c']);expect(view.prefs.libraryOrder.course).toEqual(['b','a']);
  expect(JSON.parse(mocks.set.mock.lastCall![1]).librarySort.course).toBe('title_desc');
});
it('survives denied storage and isolates owners and courses',async()=>{
  mocks.get.mockRejectedValue(Error('unavailable'));mocks.set.mockRejectedValue(Error('unavailable'));
  await act(async()=>{tree=create(createElement(Probe));});await flush();
  await act(async()=>view.sortLibrary('course','updated_asc'));await flush();
  expect(view.prefs.librarySort?.course).toBe('updated_asc');expect(view.prefs.librarySort?.other).toBeUndefined();
  mocks.owner='different-owner-'+sequence;await act(async()=>tree!.update(createElement(Probe)));await flush();
  expect(view.prefs.librarySort?.course).toBeUndefined();
});
