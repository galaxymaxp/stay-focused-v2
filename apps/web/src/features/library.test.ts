import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LibraryArtifactSummary } from '@stay-focused/shared';
import { LibraryScreen, LibraryCourseScreen } from './library';
import { LIBRARY_SORT_OPTIONS } from '../app-model/librarySortOptions';
import { LIBRARY_GRID_SORT_KEY } from '../app-model/librarySorting';
const mocks=vi.hoisted(()=>({owner:'',items:[] as LibraryArtifactSummary[],api:vi.fn(),refresh:vi.fn(),get:vi.fn(),set:vi.fn(),focus:vi.fn(),firstFocus:vi.fn()}));
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
let listeners: Map<string, (event: unknown) => void>;
const inside = {};
const card=(id:string,course:LibraryArtifactSummary['course'],createdAt:string):LibraryArtifactSummary=>({id,type:'reviewer',title:id,course,sourceId:null,sourceTitle:null,activityId:null,createdAt,updatedAt:createdAt,lastOpenedAt:null,status:'completed',relatedArtifactIds:[]});
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mocks.owner='sort-web-'+sequence++;vi.clearAllMocks();
  listeners = new Map();
  vi.stubGlobal('document', { addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener), removeEventListener: (type: string) => listeners.delete(type) });
  vi.stubGlobal('window',new EventTarget());vi.stubGlobal('localStorage',{getItem:mocks.get,setItem:mocks.set});mocks.get.mockReturnValue(null);
  mocks.items=[card('Zulu',{id:'z',code:'Z1',name:'Alpha'},'2026-02-01'),card('Alpha',{id:'a',code:'A1',name:'Zulu'},'2026-01-01')];
});
afterEach(async()=>{await act(async()=>tree?.unmount());tree=undefined;vi.unstubAllGlobals();});
async function mount(courseKey?: string) {
  await act(async () => {
    tree = create(courseKey ? createElement(LibraryCourseScreen, { courseKey }) : createElement(LibraryScreen), {
      createNodeMock: element => {
        const props = element.props as Record<string, unknown>;
        if (element.type === 'button' && String(props['aria-label']).startsWith('Sort Library:')) return { focus: mocks.focus };
        if (props.role === 'menu') return { querySelector: () => ({ focus: mocks.firstFocus }) };
        if (props.className === 'library-sort') return { contains: (target: unknown) => target === inside };
        return null;
      },
    });
  });
}
const trigger = () => tree!.root.findAllByType('button').find(node => String(node.props['aria-label']).startsWith('Sort Library:'))!;
const menu = () => tree!.root.findAllByType('div').find(node => node.props.role === 'menu');
const options = () => tree!.root.findAllByType('button').filter(node => node.props.role === 'menuitemradio');
const labels = () => options().map(node => node.findByType('span').props.children);
const open = async () => act(async () => trigger().props.onClick());
async function choose(value: string) {
  await open();
  const label = LIBRARY_SORT_OPTIONS.find(option => option.value === value)!.label;
  await act(async () => options().find(node => node.findByType('span').props.children === label)!.props.onClick());
}
const courses=()=>tree!.root.findAllByType('a').filter(node=>String(node.props.href).startsWith('/library/course/')).map(node=>decodeURIComponent(node.props.href.split('/').pop()));
const titles=()=>tree!.root.findAllByType('a').filter(node=>node.props.className==='library-card-open').map(node=>node.props['aria-label']);
it.each([null, 'Covers cells and their energy needs.'])('shows a manual source description beneath the existing filename only when present: %s', async sourceDescription => {
  mocks.items = [{ ...card('Notes reviewer', null, '2026-10-18'), sourceType: 'local_file', sourceTitle: 'Notes.pdf', sourceDescription }];
  await mount('personal');
  const descriptions = tree!.root.findAllByType('span').filter(node => node.props.children === sourceDescription);
  expect(descriptions).toHaveLength(sourceDescription ? 1 : 0);
  if (sourceDescription) expect(descriptions[0]!.props.className).toBe('meta');
  expect(titles()).toEqual(['Reviewer: Notes reviewer']);
});
it('persists each PR #12 top-level option without refetching',async()=>{
  await mount();expect(trigger().props['aria-label']).toBe('Sort Library: Updated: newest first');expect(courses()).toEqual(['z','a']);
  for (const [value, expected] of [['updated_asc', ['a', 'z']], ['title_desc', ['a', 'z']], ['updated_desc', ['z', 'a']], ['title_asc', ['z', 'a']]] as const) {
    await choose(value); expect(courses()).toEqual(expected);
    const saved = JSON.parse(mocks.set.mock.lastCall![1]);
    expect(saved.librarySort).toEqual({ [LIBRARY_GRID_SORT_KEY]: value });
    expect(menu()).toBeUndefined();
  }
  expect(mocks.set.mock.lastCall![0]).toBe(`sf.list-preferences.v1.${mocks.owner}`);
  expect(mocks.api).not.toHaveBeenCalled();
  const persisted = mocks.set.mock.lastCall![1];
  await act(async()=>tree!.unmount());mocks.owner += '-reload';mocks.get.mockReturnValue(persisted);
  await mount();expect(trigger().props['aria-label']).toBe('Sort Library: Alphabetical: A to Z');
});
it('defaults LS1 storage while preserving pins',async()=>{
  mocks.get.mockReturnValue(JSON.stringify({sort:{library:'opened'},opened:{Alpha:'2026-03-01'}}));
  await mount();expect(trigger().props['aria-label']).toBe('Sort Library: Updated: newest first');expect(courses()).toEqual(['z','a']);
});
it('keeps course pin inside its independent menu, retains navigation, and closes on owner change', async () => {
  await mount();
  const courseOptions = () => tree!.root.findAllByType('button').filter(node => String(node.props['aria-label']).startsWith('Course options for '));
  const routes = courses();
  await act(async () => courseOptions()[0]!.props.onClick());
  expect(mocks.set).not.toHaveBeenCalled(); expect(mocks.api).not.toHaveBeenCalled();
  const pin = tree!.root.findByProps({ role: 'menuitemcheckbox' });
  expect(pin.props.children).toBe('Pin');
  await act(async () => pin.props.onClick());
  expect(JSON.parse(mocks.set.mock.lastCall![1]).pinned.course).toEqual([routes[0]]);
  expect(mocks.set.mock.lastCall![0]).toBe(`sf.list-preferences.v1.${mocks.owner}`);
  expect(courses()).toContain(routes[0]); expect(mocks.api).not.toHaveBeenCalled();
  await act(async () => courseOptions()[0]!.props.onClick());
  mocks.owner += '-other'; await act(async () => tree!.update(createElement(LibraryScreen)));
  expect(tree!.root.findAllByProps({ role: 'menuitemcheckbox' })).toHaveLength(0);
  expect(courses().sort()).toEqual(routes.sort());
});
it('supports My order, dates, alphabetic directions and complete Canvas order',async()=>{
  mocks.items=[{...mocks.items[0]!,id:'artifact:Zulu'}, {...mocks.items[1]!,id:'artifact:Alpha',course:mocks.items[0]!.course},card('Pinned',mocks.items[0]!.course,'2025-01-01')];
  mocks.get.mockReturnValue(JSON.stringify({pinned:{artifact:['Pinned']},libraryOrder:{z:['artifact:Zulu','artifact:Alpha','Pinned']}}));
  await mount('z');
  expect(trigger().props['aria-label']).toBe('Sort Library: My order');expect(titles()).toEqual(['Reviewer: Zulu','Reviewer: Alpha','Reviewer: Pinned, pinned']);
  await choose('course');expect(titles()).toEqual(['Reviewer: Alpha','Reviewer: Zulu','Reviewer: Pinned, pinned']);
  expect(JSON.parse(mocks.set.mock.lastCall![1]).librarySort).toEqual({ z: 'course' });
  await choose('title_desc');expect(titles()).toEqual(['Reviewer: Zulu','Reviewer: Pinned, pinned','Reviewer: Alpha']);
  expect(JSON.parse(mocks.set.mock.lastCall![1]).librarySort).toEqual({ z: 'title_desc' });expect(mocks.api).not.toHaveBeenCalled();
  const persisted = mocks.set.mock.lastCall![1];
  await act(async()=>tree!.unmount());mocks.owner += '-reload';mocks.get.mockReturnValue(persisted);
  await mount('z');expect(trigger().props['aria-label']).toBe('Sort Library: Alphabetical: Z to A');
});
it('storage failure leaves defaults and in-memory choices usable',async()=>{
  mocks.get.mockImplementation(()=>{throw Error('disabled');});mocks.set.mockImplementation(()=>{throw Error('disabled');});
  await mount();expect(trigger().props['aria-label']).toBe('Sort Library: Updated: newest first');
  await choose('title_desc');expect(courses()).toEqual(['a','z']);expect(mocks.api).not.toHaveBeenCalled();
});

it.each([undefined, 'z', 'personal'])('offers mirrored options and checked state for scope %s with no native select', async courseKey => {
  await mount(courseKey);
  expect(trigger().props.children[1]).toBe('Sort');
  expect(trigger().find(node => String(node.type) === 'Icon').props.name).toBe('arrow-up-down');
  expect(trigger().props['aria-haspopup']).toBe('menu');
  expect(trigger().props['aria-expanded']).toBe(false);
  expect(trigger().props['aria-controls']).toBeUndefined();
  expect(options()).toHaveLength(0);
  expect(tree!.root.findAllByType('select')).toHaveLength(0);
  await open();
  expect(trigger().props['aria-expanded']).toBe(true);
  expect(trigger().props['aria-controls']).toBe(menu()!.props.id);
  expect(menu()!.props['aria-label']).toBe('Sort Library');
  const expected = LIBRARY_SORT_OPTIONS.filter(option => (option.value !== 'course' || courseKey === 'z') && (option.value !== 'custom' || courseKey !== undefined));
  expect(labels()).toEqual(expected.map(option => option.label));
  expect(options().map(option => option.props['aria-checked'])).toEqual(expected.map(option => option.value === (courseKey ? 'custom' : 'updated_desc')));
  const checked = options().filter(option => option.props['aria-checked']);
  expect(checked).toHaveLength(1);
  expect(checked[0]!.find(node => String(node.type) === 'Icon').props.name).toBe('check');
  expect(menu()!.findAll(node => String(node.type) === 'Icon')).toHaveLength(1);
  expect(mocks.firstFocus).toHaveBeenCalledOnce();
  await act(async () => options().at(-1)!.props.onClick());
  expect(menu()).toBeUndefined();expect(mocks.focus).toHaveBeenCalledOnce();
  await open();
  expect(options().at(-1)!.props['aria-checked']).toBe(true);
  expect(options().filter(option => option.props['aria-checked'])).toHaveLength(1);
});

it('closes on Escape, restores focus and cleans up listeners', async () => {
  await mount();await open();
  const preventDefault = vi.fn();
  await act(async () => listeners.get('keydown')!({ key: 'Enter', preventDefault }));
  expect(menu()).toBeDefined();expect(preventDefault).not.toHaveBeenCalled();
  await act(async () => listeners.get('keydown')!({ key: 'Escape', preventDefault }));
  expect(preventDefault).toHaveBeenCalledOnce();expect(mocks.focus).toHaveBeenCalledOnce();
  expect(menu()).toBeUndefined();expect(listeners.size).toBe(0);
});

it.each(['mousedown', 'touchstart'])('dismisses on outside %s with focus restoration and ignores inside presses', async type => {
  await mount();await open();
  const preventDefault = vi.fn();
  await act(async () => listeners.get(type)!({ target: inside, preventDefault }));
  expect(menu()).toBeDefined();expect(mocks.focus).not.toHaveBeenCalled();expect(preventDefault).not.toHaveBeenCalled();
  await act(async () => listeners.get(type)!({ target: {}, preventDefault }));
  expect(menu()).toBeUndefined();expect(mocks.focus).toHaveBeenCalledOnce();expect(preventDefault).toHaveBeenCalledOnce();
  expect(listeners.size).toBe(0);
});

it('closes when Tab leaves and toggles closed from the trigger', async () => {
  await mount();await open();
  const wrapper = tree!.root.findAllByType('div').find(node => node.props.className === 'library-sort')!;
  await act(async () => wrapper.props.onBlur({ currentTarget: { contains: () => true }, relatedTarget: inside }));
  expect(menu()).toBeDefined();
  await act(async () => wrapper.props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: {} }));
  expect(menu()).toBeUndefined();expect(mocks.focus).not.toHaveBeenCalled();
  await open();await open();expect(menu()).toBeUndefined();expect(listeners.size).toBe(0);
});

it('opens with ArrowDown and matches reviewer arrow/Home/End navigation including wrapping', async () => {
  await mount();const preventDefault = vi.fn();
  await act(async () => trigger().props.onKeyDown({ key: 'ArrowDown', preventDefault }));
  expect(mocks.firstFocus).toHaveBeenCalledOnce();
  const first = { focus: vi.fn() }, middle = { focus: vi.fn() }, last = { focus: vi.fn() };
  const currentTarget = { querySelectorAll: () => [first, middle, last] };
  for (const [key, active, target] of [
    ['ArrowDown', first, middle], ['ArrowUp', middle, first], ['End', first, last],
    ['Home', last, first], ['ArrowUp', first, last], ['ArrowDown', last, first],
  ] as const) {
    Object.assign(document, { activeElement: active });
    const before = target.focus.mock.calls.length;
    await act(async () => menu()!.props.onKeyDown({ key, currentTarget, preventDefault }));
    expect(target.focus).toHaveBeenCalledTimes(before + 1);
  }
  expect(preventDefault).toHaveBeenCalledTimes(7);
  await act(async () => tree!.unmount());tree = undefined;
  expect(listeners.size).toBe(0);
});
