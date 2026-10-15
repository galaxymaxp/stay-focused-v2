import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { savedSnapshot, type LibraryArtifactSummary, type LibraryOverview } from '@stay-focused/shared';
import { useSavedLibrary } from './use-saved-library';
const mocks = vi.hoisted(() => ({ owner:'a',api:vi.fn(),read:vi.fn(),write:vi.fn(),epoch:0 }));
vi.mock('../components/providers',()=>({useAuth:()=>({session:{user:{id:mocks.owner}},api:mocks.api})}));
vi.mock('./screen-snapshots',()=>({isScreenSnapshotPath:()=>true,snapshotEpoch:()=>mocks.epoch,readScreenSnapshot:mocks.read,writeScreenSnapshot:mocks.write,removeScreenSnapshot:vi.fn()}));
const card = (id: string): LibraryArtifactSummary => ({id,type:'reviewer',title:id,course:null,sourceId:id,sourceTitle:null,activityId:null,createdAt:'2026-10-15',updatedAt:'2026-10-15',lastOpenedAt:null,status:'completed',relatedArtifactIds:[]});
const page = (ids: string[], nextOffset: number|null): LibraryOverview => ({items:ids.map(card),nextOffset,categories:{reviewer:{status:'available'},quiz:{status:'available'},activity_output:{status:'available'}}});
let view: ReturnType<typeof useSavedLibrary>, tree: ReactTestRenderer | undefined;
function Probe() { view = useSavedLibrary(); return null; }
async function flush() { await act(async()=>{for(let i=0;i<30;i++) await Promise.resolve();}); }
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true}); vi.stubGlobal('window',new EventTarget());
  vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));
  mocks.owner='a'; mocks.epoch=0; mocks.api.mockReset(); mocks.read.mockReset(); mocks.write.mockReset();
  mocks.read.mockResolvedValue(null); mocks.write.mockResolvedValue(undefined);
});
afterEach(async()=>{if(tree) await act(async()=>tree!.unmount()); tree=undefined;vi.unstubAllGlobals();});
describe('progressive website Library',()=>{
  it('shows page one before page two resolves, deduplicates and saves only the complete result',async()=>{
    let resolve!: (value:LibraryOverview)=>void;
    mocks.api.mockResolvedValueOnce(page(['one'],100)).mockReturnValueOnce(new Promise(yes=>{resolve=yes;}));
    await act(async()=>{tree=create(createElement(Probe));}); await flush();
    expect(view.items.map(item=>item.id)).toEqual(['one']); expect(view.refreshing).toBe(true); expect(mocks.write).not.toHaveBeenCalled();
    await act(async()=>resolve(page(['one','two'],null)));await flush();
    expect(view.items.map(item=>item.id)).toEqual(['one','two']); expect(view.refreshing).toBe(false);expect(mocks.write).toHaveBeenCalledTimes(1);
  });
  it('retains accepted page one with the existing error UI after a later-page failure',async()=>{
    mocks.api.mockResolvedValueOnce(page(['one'],100)).mockRejectedValueOnce(new Error('Later page unavailable'));
    await act(async()=>{tree=create(createElement(Probe));});await flush();
    expect(view.items.map(item=>item.id)).toEqual(['one']); expect(view.error).toBe('Later page unavailable');
    expect(view.loading).toBe(false);expect(view.refreshing).toBe(false);expect(mocks.write).not.toHaveBeenCalled();
  });
  it('retains unseen saved cards on a partial refresh and reconciles them only after a complete walk',async()=>{
    mocks.read.mockResolvedValueOnce(savedSnapshot('a','data:/api/experience/library?complete=1',page(['saved','one'],null)));
    mocks.api.mockResolvedValueOnce(page(['one'],100)).mockRejectedValueOnce(new Error('Later page unavailable'));
    await act(async()=>{tree=create(createElement(Probe));});await flush();
    expect(view.items.map(item=>item.id)).toEqual(['saved','one']);expect(mocks.write).not.toHaveBeenCalled();
    mocks.api.mockResolvedValueOnce(page(['one'],null));
    await act(async()=>view.refresh());await flush();
    expect(view.items.map(item=>item.id)).toEqual(['one']);expect(mocks.write).toHaveBeenCalledTimes(1);
  });
  it('shows the SP1 snapshot before requests and never publishes an old owner response',async()=>{
    mocks.read.mockResolvedValueOnce(savedSnapshot('a','data:/api/experience/library?complete=1',page(['saved'],null)));
    let resolve!: (value:LibraryOverview)=>void;
    mocks.api.mockReturnValueOnce(new Promise(yes=>{resolve=yes;}));
    await act(async()=>{tree=create(createElement(Probe));});await flush(); expect(view.items[0]?.id).toBe('saved');
    mocks.owner='b';mocks.api.mockResolvedValue(page([],null));
    await act(async()=>tree!.update(createElement(Probe)));await flush();
    await act(async()=>resolve(page(['private-a'],null)));await flush();expect(view.items).toEqual([]);
  });
  it('filters superseded cards and fails a nonadvancing cursor without saving a partial snapshot',async()=>{
    mocks.api.mockResolvedValueOnce(page(['old','one'],100)).mockResolvedValueOnce({...page(['two'],100),supersededReviewerIds:['old']});
    await act(async()=>{tree=create(createElement(Probe));});await flush();
    expect(view.items.map(item=>item.id)).toEqual(['old','one']); expect(view.error).toContain('next Library page');expect(mocks.write).not.toHaveBeenCalled();
  });
});
