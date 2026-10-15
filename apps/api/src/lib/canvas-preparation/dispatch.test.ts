import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasMaterialPreparationRow } from '@stay-focused/db';
const mocks=vi.hoisted(()=>({config:vi.fn(),client:vi.fn()}));
vi.mock('@/lib/processing-jobs/google-cloud',()=>({googleTaskConfig:mocks.config,googleDispatcherClient:mocks.client}));
import { dispatchPreparation, enqueuePreparation } from './dispatch';
const job={id:'job',state:'pending',dispatch_id:'dispatch',dispatched_at:null,available_at:new Date(Date.now()+600_000).toISOString()} as CanvasMaterialPreparationRow;
beforeEach(()=>{vi.resetAllMocks();mocks.config.mockReturnValue({parent:'projects/synthetic/locations/test/queues/test',workerUrl:'https://synthetic.invalid',serviceAccountEmail:'synthetic@example.invalid'});});
describe('awaited preparation dispatch',()=>{
  it('queues an opaque idempotent task with the provider delay and ADC',async()=>{
    const request=vi.fn<(input:unknown)=>Promise<unknown>>().mockResolvedValue({});mocks.client.mockResolvedValue({request});
    await enqueuePreparation({jobId:job.id,dispatchId:job.dispatch_id},job.available_at);
    const task=request.mock.calls[0]![0] as unknown as {data:{task:{name:string;scheduleTime:string;httpRequest:{body:string;url:string}}}};
    expect(task.data.task.name).toContain('preparation-job-dispatch');
    expect(task.data.task.scheduleTime).toBe(job.available_at);
    expect(task.data.task.httpRequest.url).toBe('https://synthetic.invalid/tasks/canvas-preparation');
    expect(JSON.parse(Buffer.from(task.data.task.httpRequest.body,'base64').toString())).toEqual({jobId:'job',dispatchId:'dispatch'});
    expect(mocks.client).toHaveBeenCalledOnce();
  });
  it('accepts an existing task receipt but hides raw dispatch errors',async()=>{
    await expect(enqueuePreparation({jobId:'job',dispatchId:'dispatch'},job.available_at,{client:{request:vi.fn().mockRejectedValue({response:{status:409}})}})).resolves.toBeUndefined();
    await expect(enqueuePreparation({jobId:'job',dispatchId:'dispatch'},job.available_at,{client:{request:vi.fn().mockRejectedValue(new Error('private provider message'))}})).rejects.toThrow('preparation_dispatch_unavailable');
  });
  it('persists acceptance only after enqueue and reconnects a failed enqueue',async()=>{
    const update=vi.fn();const query={eq:()=>query,select:()=>query,maybeSingle:async()=>({data:job,error:null})};update.mockReturnValue(query);
    const client={rpc:vi.fn(async()=>({data:[job],error:null})),from:()=>({update})};
    const enqueue=vi.fn(async()=>{expect(update).not.toHaveBeenCalled();});
    await dispatchPreparation(client as never,job,enqueue);expect(update).toHaveBeenCalledOnce();
    update.mockClear();enqueue.mockRejectedValueOnce(new Error('unavailable'));
    await expect(dispatchPreparation(client as never,job,enqueue)).rejects.toThrow('unavailable');
    expect(update).not.toHaveBeenCalled();
    await dispatchPreparation(client as never,job,enqueue);expect(update).toHaveBeenCalledOnce();
  });
});
