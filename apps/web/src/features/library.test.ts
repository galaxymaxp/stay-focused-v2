import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LibraryArtifactSummary } from '@stay-focused/shared';
import { LibraryScreen, LibraryCourseScreen } from './library';
const mocks=vi.hoisted(()=>({owner:'',items:[] as LibraryArtifactSummary[],api:vi.fn(),refresh:vi.fn(),get:vi.fn(),set:vi.fn()}));
vi.mock('../components/providers',()=>({useAuth:()=>({session:{user:{id:mocks.owner}},api:mocks.api})}));
vi.mock('../lib/use-saved-library',()=>({useSavedLibrary:()=>({items:mocks.items,data:{},categories:{},refresh:mocks.refresh})}));
vi.mock('../lib/use-library-course-sequence',()=>({useLibraryCourseSequence:()=>({data:{materials:[{id:'file:a',reviewerArtifactId:'Alpha'},{id:'file:z',reviewerArtifactId:'Zulu'}]},error:false})}));
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
it('persists each PR #12 top-level option without refetching',async()=>{
  await act(async()=>{tree=create(createElement(LibraryScreen));});expect(select().props.value).toBe('updated_desc');expect(courses()).toEqual(['z','a']);
  expect(select().findAllByType('option').map(node=>node.props.value)).toEqual(['updated_desc','updated_asc','title_asc','title_desc']);
  await act(async()=>select().props.onChange({target:{value:'title_asc'}}));expect(courses()).toEqual(['z','a']);
  expect(JSON.parse(mocks.set.mock.lastCall![1]).librarySort.__courses__).toBe('title_asc');expect(mocks.api).not.toHaveBeenCalled();
  await act(async()=>tree!.unmount());await act(async()=>{tree=create(createElement(LibraryScreen));});expect(select().props.value).toBe('title_asc');
});
it('defaults LS1 storage while preserving pins',async()=>{
  mocks.get.mockReturnValue(JSON.stringify({sort:{library:'opened'},opened:{Alpha:'2026-03-01'}}));
  await act(async()=>{tree=create(createElement(LibraryScreen));});expect(select().props.value).toBe('updated_desc');expect(courses()).toEqual(['z','a']);
});
it('supports My order, dates, alphabetic directions and complete Canvas order',async()=>{
  mocks.items=[{...mocks.items[0]!,id:'artifact:Zulu'}, {...mocks.items[1]!,id:'artifact:Alpha',course:mocks.items[0]!.course},card('Pinned',mocks.items[0]!.course,'2025-01-01')];
  mocks.get.mockReturnValue(JSON.stringify({pinned:{artifact:['Pinned']},libraryOrder:{z:['artifact:Zulu','artifact:Alpha','Pinned']}}));
  await act(async()=>{tree=create(createElement(LibraryCourseScreen,{courseKey:'z'}));});
  expect(select().props.value).toBe('custom');expect(titles()).toEqual(['Reviewer: Zulu','Reviewer: Alpha','Reviewer: Pinned, pinned']);
  expect(select().findAllByType('option').map(node=>node.props.value)).toEqual(['custom','updated_desc','updated_asc','course','title_asc','title_desc']);
  await act(async()=>select().props.onChange({target:{value:'course'}}));expect(titles()).toEqual(['Reviewer: Alpha','Reviewer: Zulu','Reviewer: Pinned, pinned']);
  await act(async()=>select().props.onChange({target:{value:'title_desc'}}));expect(titles()).toEqual(['Reviewer: Zulu','Reviewer: Pinned, pinned','Reviewer: Alpha']);
  expect(JSON.parse(mocks.set.mock.lastCall![1]).librarySort.z).toBe('title_desc');expect(mocks.api).not.toHaveBeenCalled();
});
it('storage failure leaves defaults and in-memory choices usable',async()=>{
  mocks.get.mockImplementation(()=>{throw Error('disabled');});mocks.set.mockImplementation(()=>{throw Error('disabled');});
  await act(async()=>{tree=create(createElement(LibraryScreen));});expect(select().props.value).toBe('updated_desc');
  await act(async()=>select().props.onChange({target:{value:'title_desc'}}));expect(courses()).toEqual(['a','z']);expect(mocks.api).not.toHaveBeenCalled();
});
