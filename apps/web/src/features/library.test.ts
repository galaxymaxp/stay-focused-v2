import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LibraryArtifactSummary } from '@stay-focused/shared';
import { LibraryScreen, LibraryCourseScreen } from './library';
const mocks=vi.hoisted(()=>({owner:'',items:[] as LibraryArtifactSummary[],api:vi.fn(),refresh:vi.fn(),get:vi.fn(),set:vi.fn()}));
vi.mock('../components/providers',()=>({useAuth:()=>({session:{user:{id:mocks.owner}},api:mocks.api})}));
vi.mock('../lib/use-saved-library',()=>({useSavedLibrary:()=>({items:mocks.items,data:{},categories:{},refresh:mocks.refresh})}));
vi.mock('../lib/hooks',()=>({useAction:()=>({run:vi.fn()}),useResource:()=>({})}));
vi.mock('../components/ui',()=>({Heading:'Heading',Icon:'Icon',ContentIcon:'ContentIcon',Empty:'Empty',State:'State',Notice:'Notice',contentTone:()=>''}));
vi.mock('../components/crumbs',()=>({PageCrumb:'Crumb'}));
vi.mock('../components/course',()=>({CourseMark:'CourseMark'}));
vi.mock('../components/snapshot-status',()=>({SnapshotStatus:'SnapshotStatus'}));
vi.mock('next/link',()=>({default:'a'}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('./reviewer/reviewer-reader',()=>({ReviewerReader:'ReviewerReader'}));
let tree:ReactTestRenderer|undefined, sequence=0;
const card=(id:string,course:LibraryArtifactSummary['course'],createdAt:string):LibraryArtifactSummary=>({id,type:'reviewer',title:id,course,sourceId:null,sourceTitle:null,activityId:null,createdAt,updatedAt:createdAt,lastOpenedAt:null,status:'completed',relatedArtifactIds:[]});
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.owner='sort-web-'+sequence++;vi.clearAllMocks();
  vi.stubGlobal('window',new EventTarget());vi.stubGlobal('localStorage',{getItem:mocks.get,setItem:mocks.set});mocks.get.mockReturnValue(null);
  mocks.items=[card('Zulu',{id:'z',code:'Z1',name:'Alpha'},'2026-02-01'),card('Alpha',{id:'a',code:'A1',name:'Zulu'},'2026-01-01')];
});
afterEach(async()=>{await act(async()=>tree?.unmount());tree=undefined;vi.unstubAllGlobals();});
const select=()=>tree!.root.findByType('select');
const courses=()=>tree!.root.findAllByType('a').filter(node=>String(node.props.href).startsWith('/library/course/')).map(node=>decodeURIComponent(node.props.href.split('/').pop()));
const titles=()=>tree!.root.findAllByType('a').filter(node=>node.props.className==='library-card-open').map(node=>node.props['aria-label']);
it('changes top-level order without a refetch, persists and reopens the chosen browser sort',async()=>{
  await act(async()=>{tree=create(createElement(LibraryScreen));}); expect(courses()).toEqual(['z','a']);expect(select().props.value).toBe('recent');
  await act(async()=>select().props.onChange({target:{value:'course'}}));expect(courses()).toEqual(['a','z']);
  expect(JSON.parse(mocks.set.mock.lastCall![1]).sort.library).toBe('course');expect(mocks.api).not.toHaveBeenCalled();expect(mocks.refresh).not.toHaveBeenCalled();
  await act(async()=>tree!.unmount());await act(async()=>{tree=create(createElement(LibraryScreen));});expect(select().props.value).toBe('course');expect(courses()).toEqual(['a','z']);
});
it('loads stored opened ordering and uses timestamps on this device',async()=>{
  mocks.get.mockReturnValue(JSON.stringify({sort:{library:'opened'},opened:{Alpha:'2026-03-01'}}));
  await act(async()=>{tree=create(createElement(LibraryScreen));});expect(courses()).toEqual(['a','z']);expect(select().props.value).toBe('opened');
});
it('defaults course contents to Canvas order, changes title/recent order and keeps pins first',async()=>{
  mocks.items=[{...mocks.items[0]!,sourcePosition:{moduleIndex:2,itemIndex:1}}, {...mocks.items[1]!,course:mocks.items[0]!.course,sourcePosition:{moduleIndex:1,itemIndex:9}},card('Pinned',mocks.items[0]!.course,'2025-01-01')];
  mocks.get.mockReturnValue(JSON.stringify({pinned:{artifact:['Pinned']}}));
  await act(async()=>{tree=create(createElement(LibraryCourseScreen,{courseKey:'z'}));});
  expect(select().props.value).toBe('canvas');expect(titles()).toEqual(['Reviewer: Pinned, pinned','Reviewer: Alpha','Reviewer: Zulu']);
  await act(async()=>select().props.onChange({target:{value:'recent'}}));expect(titles()).toEqual(['Reviewer: Pinned, pinned','Reviewer: Zulu','Reviewer: Alpha']);
  await act(async()=>select().props.onChange({target:{value:'title'}}));expect(titles()).toEqual(['Reviewer: Pinned, pinned','Reviewer: Alpha','Reviewer: Zulu']);
  expect(JSON.parse(mocks.set.mock.lastCall![1]).sort.libraryCourse).toBe('title');expect(mocks.api).not.toHaveBeenCalled();
});
it('storage reads and writes may throw: defaults render, choices still work for the visit',async()=>{
  mocks.get.mockImplementation(()=>{throw Error('disabled');});mocks.set.mockImplementation(()=>{throw Error('disabled');});
  await act(async()=>{tree=create(createElement(LibraryScreen));});expect(select().props.value).toBe('recent');
  await act(async()=>select().props.onChange({target:{value:'course'}}));expect(courses()).toEqual(['a','z']);expect(mocks.api).not.toHaveBeenCalled();
});
