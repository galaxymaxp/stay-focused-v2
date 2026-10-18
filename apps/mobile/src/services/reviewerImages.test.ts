import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { useReviewerImages } from './reviewerImages';
import type { ExperienceClient } from './experienceApi';
const mocks=vi.hoisted(()=>({request:vi.fn(),state:{currentState:'active',addEventListener:vi.fn(()=>({remove:vi.fn()}))}}));
vi.mock('react-native',()=>({AppState:mocks.state}));
vi.mock('./experienceApi',()=>({experienceRequest:mocks.request}));
const client={baseUrl:'https://api.example.test',accessToken:'owner-jwt'};
const data={sections:[{sectionId:'s',hasFigures:true,figures:[{id:'f',url:'https://image.test/short',width:300,height:200,page:1}],snapshot:{available:false,reason:'no_page_source'}}],external:{checked:1,total:1,running:false}};
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});let tree:ReactTestRenderer|undefined;
function Reader({offline=false,activeClient=client}:{offline?:boolean;activeClient?:ExperienceClient}){const images=useReviewerImages(activeClient,'artifact',offline);return createElement('Reader',{data:images.data,refresh:images.refreshOnce});}
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;mocks.request.mockReset();vi.clearAllMocks();mocks.state.currentState='active';});
it('loads one combined response, shares one signed URL refresh and hides URLs for offline copies or token changes',async()=>{
  mocks.request.mockResolvedValue(data);await act(async()=>{tree=create(createElement(Reader));});expect(mocks.request).toHaveBeenCalledOnce();
  expect(mocks.request.mock.calls[0]!.slice(0,2)).toEqual([client,'/api/reviewers/artifact/figures']);
  const reader=()=>tree!.root.findByType('Reader' as never);
  expect(reader().props.data).toEqual(data);
  await act(async()=>{await Promise.all([reader().props.refresh(),reader().props.refresh()]);});expect(mocks.request).toHaveBeenCalledTimes(2);
  await act(async()=>tree!.update(createElement(Reader,{offline:true})));expect(reader().props.data).toBeNull();
  expect(mocks.request.mock.calls[0]![2].signal.aborted).toBe(true);
  let resolve!:(value:typeof data)=>void;mocks.request.mockReturnValue(new Promise(r=>{resolve=r;}));
  await act(async()=>tree!.update(createElement(Reader,{activeClient:{...client,accessToken:'another-owner'}})));expect(reader().props.data).toBeNull();
  await act(async()=>resolve(data));expect(reader().props.data).toEqual(data);
});
it('discards URLs in the background and reads once when active again',async()=>{
  mocks.request.mockResolvedValue(data);await act(async()=>{tree=create(createElement(Reader));});
  const change=mocks.state.addEventListener.mock.calls[0] as unknown as [string,()=>void];
  await act(async()=>{mocks.state.currentState='background';change[1]();});expect(tree!.root.findByType('Reader' as never).props.data).toBeNull();
  await act(async()=>{mocks.state.currentState='active';change[1]();});expect(mocks.request).toHaveBeenCalledTimes(2);
});
it('keeps the reachability guard with one lightweight health check, hides offline images and reloads once on reconnect',async()=>{
  vi.useFakeTimers();const fetchImpl=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(new Response('{}'));
  const activeClient={...client,fetchImpl};mocks.request.mockResolvedValue(data);
  await act(async()=>{tree=create(createElement(Reader,{activeClient}));});
  await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});expect(tree!.root.findByType('Reader' as never).props.data).toBeNull();
  expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.example.test/api/health');
  await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(tree!.root.findByType('Reader' as never).props.data).toEqual(data);
  vi.useRealTimers();
});
it('ignores a stale health failure after a background/foreground reload',async()=>{
  vi.useFakeTimers();let reject!:(error:Error)=>void;
  const fetchImpl=vi.fn<typeof fetch>(()=>new Promise<Response>((_resolve,fail)=>{reject=fail;}));
  mocks.request.mockResolvedValue(data);await act(async()=>{tree=create(createElement(Reader,{activeClient:{...client,fetchImpl}}));});
  await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
  const change=mocks.state.addEventListener.mock.calls[0] as unknown as [string,()=>void];
  await act(async()=>{mocks.state.currentState='background';change[1]();mocks.state.currentState='active';change[1]();});
  expect(fetchImpl.mock.calls[0]![1]?.signal?.aborted).toBe(true);
  await act(async()=>reject(new Error('old offline probe')));
  expect(tree!.root.findByType('Reader' as never).props.data).toEqual(data);expect(mocks.request).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});
