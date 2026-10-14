import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PREPARATION_REFRESH_LIMIT, PREPARATION_REFRESH_MS, usePreparationRefresh } from './usePreparationRefresh';
import { useExperience } from '../redesign/useExperience';
const mocks = vi.hoisted(() => ({ focused: true, active: true, request: vi.fn(), refresh: vi.fn() }));
vi.mock('expo-router/react-navigation', () => ({useIsFocused:()=>mocks.focused}));
vi.mock('../../design/theme', () => ({useTheme:()=>({active:mocks.active})}));
vi.mock('../../auth', () => ({useAuth:()=>({session:{user:{id:'owner'},accessToken:'token'}})}));
vi.mock('../../config/apiBaseUrl', () => ({getApiBaseUrl:()=> 'https://local.test'}));
vi.mock('../sync/CanvasSyncProvider', () => ({useCanvasSync:()=>({dataVersion:0})}));
vi.mock('../../services/experienceApi', async load => ({
  ...await load<typeof import('../../services/experienceApi')>(), experienceRequest:mocks.request,
}));
let renderer:ReactTestRenderer|undefined;
function Legacy({preparing=true}:{preparing?:boolean}) {usePreparationRefresh('course',preparing,mocks.refresh);return null;}
function Experience() {useExperience<{preparing:boolean}>('/materials',PREPARATION_REFRESH_MS,data=>data.preparing,undefined,PREPARATION_REFRESH_LIMIT);return null;}
async function mount(component:typeof Legacy|typeof Experience) { await act(async()=>{renderer=create(createElement(component));}); }
async function tick() {await act(async()=>{await vi.advanceTimersByTimeAsync(PREPARATION_REFRESH_MS);});}
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.useFakeTimers();vi.clearAllMocks();
  mocks.focused=true;mocks.active=true;mocks.refresh.mockResolvedValue(true);mocks.request.mockResolvedValue({preparing:true});
});
afterEach(async()=>{if(renderer)await act(async()=>renderer!.unmount());renderer=undefined;vi.useRealTimers();});
describe('bounded preparation status reconciliation',()=>{
  it('legacy polling is serial, modest and stops at the bound',async()=>{
    await mount(Legacy);expect(mocks.refresh).not.toHaveBeenCalled();
    for(let index=0;index<PREPARATION_REFRESH_LIMIT+2;index++)await tick();
    expect(mocks.refresh).toHaveBeenCalledTimes(PREPARATION_REFRESH_LIMIT);
  });
  it('legacy polling stops on Ready/failed and aborts an in-flight read on blur',async()=>{
    mocks.refresh.mockResolvedValueOnce(false);await mount(Legacy);await tick();await tick();expect(mocks.refresh).toHaveBeenCalledOnce();
    await act(async()=>renderer!.unmount());renderer=undefined;mocks.refresh.mockClear();
    let finish!:(pending:boolean)=>void;
    mocks.refresh.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    await mount(Legacy);await tick();await tick();expect(mocks.refresh).toHaveBeenCalledOnce();
    const signal=mocks.refresh.mock.calls[0]![0] as AbortSignal;
    mocks.focused=false;await act(async()=>renderer!.update(createElement(Legacy)));
    expect(signal.aborted).toBe(true);await act(async()=>finish(true));await tick();expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it('experience refreshes on focus, caps polling and stops while blurred',async()=>{
    await mount(Experience);expect(mocks.request).toHaveBeenCalledOnce();
    for(let index=0;index<PREPARATION_REFRESH_LIMIT+2;index++)await tick();
    expect(mocks.request).toHaveBeenCalledTimes(PREPARATION_REFRESH_LIMIT);
    mocks.focused=false;await act(async()=>renderer!.update(createElement(Experience)));await tick();
    expect(mocks.request).toHaveBeenCalledTimes(PREPARATION_REFRESH_LIMIT);
    mocks.focused=true;mocks.request.mockResolvedValue({preparing:false});await act(async()=>renderer!.update(createElement(Experience)));
    expect(mocks.request).toHaveBeenCalledTimes(PREPARATION_REFRESH_LIMIT+1);await tick();
    expect(mocks.request).toHaveBeenCalledTimes(PREPARATION_REFRESH_LIMIT+1);
  });
  it('experience stops preparation polling on offline evidence without queuing work',async()=>{
    const {ExperienceApiError}=await import('../../services/experienceApi');
    mocks.request.mockRejectedValue(new ExperienceApiError('connection','Offline'));await mount(Experience);await tick();
    expect(mocks.request).toHaveBeenCalledOnce();
  });
});
