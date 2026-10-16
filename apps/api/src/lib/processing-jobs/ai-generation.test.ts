import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerationRequest } from '@stay-focused/engine';
import type { Json } from '@stay-focused/db';
import { ProviderCallError } from '@/providers/openai-provider';
import type { ProcessingJobServiceClient } from './repository';
import { durableGenerationProvider } from './ai-generation';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), state: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock('@/providers', () => ({ createServerOpenAIProvider: () => ({ generate: mocks.generate }) }));
vi.mock('./worker-repository', () => ({ readProcessingJobState: mocks.state }));
vi.mock('./workflow-repository', () => ({ readProcessingJobCheckpoint: mocks.read, writeProcessingJobCheckpoint: mocks.write }));
const client = {} as ProcessingJobServiceClient;
const request: GenerationRequest<unknown> = { model: 'test', prompt: 'private learning material', schema: { name: 'quiz_set', schema: { type: 'object', additionalProperties: false, required: [], properties: {} }, description: 'test' } };
const checkpoints = new Map<string, { count?: number; state?: string; kind?: string; value?: Json }>();
beforeEach(() => {
  vi.resetAllMocks(); checkpoints.clear();
  mocks.state.mockResolvedValue({ status: 'running', lease_owner: 'worker' });
  mocks.read.mockImplementation(async (_client, _job, key: string) => checkpoints.has(key) ? { payload: checkpoints.get(key) } : null);
  mocks.write.mockImplementation(async (_client, input: { checkpointKey: string; payload: { count?: number; state?: string; kind?: string; value?: Json } }) => { checkpoints.set(input.checkpointKey, input.payload); });
  mocks.generate.mockResolvedValue({ valid: true });
});
describe('AI generation durable call budget', () => {
  it.each([['rate_limited', 429], ['http_error', 500]] as const)('retries a definite %s response once across deliveries and reuses success', async (kind, httpStatus) => {
    mocks.state.mockResolvedValue({ status: 'running', lease_owner: 'worker', execution_backend: 'google_cloud' });
    mocks.generate.mockRejectedValueOnce(new ProviderCallError(kind, { model: 'test', httpStatus })).mockResolvedValueOnce({ valid: true });
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toThrow('generation_failed');
      expect([...checkpoints.values()]).toContainEqual({ state: 'failed', kind });
      expect(await durableGenerationProvider(client, 'job', 'worker').generate(request)).toEqual({ valid: true });
      expect(await durableGenerationProvider(client, 'job', 'worker').generate(request)).toEqual({ valid: true });
      expect(mocks.generate).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalledWith('ai_generation.request_failed', { jobId: 'job', schema: 'quiz_set', kind, httpStatus, durationMs: expect.any(Number) });
      expect(log).toHaveBeenCalledWith('ai_generation.retrying_after_definite_failure', expect.objectContaining({ kind }));
      expect(JSON.stringify(log.mock.calls)).not.toContain(request.prompt);
    } finally { log.mockRestore(); }
  });
  it.each(['timeout', 'network'] as const)('keeps %s outcomes pending and refuses redelivery without a second call', async kind => {
    mocks.state.mockResolvedValue({ status: 'running', lease_owner: 'worker', execution_backend: 'google_cloud' });
    mocks.generate.mockRejectedValue(new ProviderCallError(kind, { model: 'test' }));
    await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toThrow('generation_failed');
    expect([...checkpoints.values()]).toContainEqual({ state: 'pending' });
    await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toMatchObject({ findings: ['provider_outcome_uncertain'] });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it('records incomplete output and blocks another call while logging only safe failure fields', async () => {
    mocks.state.mockResolvedValue({ status: 'running', lease_owner: 'worker', execution_backend: 'google_cloud' });
    mocks.generate.mockRejectedValue(new ProviderCallError('incomplete', { model: 'test', incompleteReason: 'max_output_tokens' }));
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toThrow('generation_failed');
      expect([...checkpoints.values()]).toContainEqual({ state: 'failed', kind: 'incomplete', incompleteReason: 'max_output_tokens' });
      await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toMatchObject({ findings: ['provider_output_incomplete'] });
      expect(mocks.generate).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith('ai_generation.request_failed', { jobId: 'job', schema: 'quiz_set', kind: 'incomplete', incompleteReason: 'max_output_tokens', durationMs: expect.any(Number) });
      expect(JSON.stringify(log.mock.calls)).not.toContain(request.prompt);
    } finally { log.mockRestore(); }
  });
  it('stops a third paid call after two definite failures on Google', async () => {
    mocks.state.mockResolvedValue({ status: 'running', lease_owner: 'worker', execution_backend: 'google_cloud' });
    mocks.generate.mockRejectedValue(new ProviderCallError('http_error', { model: 'test', httpStatus: 500 }));
    for (let delivery = 0; delivery < 2; delivery++) await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toThrow('generation_failed');
    await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toMatchObject({ findings: ['durable_provider_budget_exhausted'] });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(checkpoints.get('ai-first:calls:quiz_set')).toEqual({ count: 2 });
  });
  it('reserves before transfer and keeps the two-call limit across provider instances', async () => {
    mocks.generate.mockImplementation(async () => { expect(checkpoints.get('ai-first:calls:quiz_set')?.count).toBeGreaterThan(0); return {}; });
    await durableGenerationProvider(client, 'job', 'worker').generate(request);
    await durableGenerationProvider(client, 'job', 'worker').generate(request);
    await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toMatchObject({ findings: ['durable_provider_budget_exhausted'] });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect([...checkpoints.values()]).toEqual([{ count: 2 }]);
  });
  it('does not reset the budget after transport failure or persist the raw error', async () => {
    mocks.generate.mockRejectedValue(new Error('secret provider payload'));
    await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toThrow('generation_failed');
    expect(checkpoints.get('ai-first:calls:quiz_set')).toEqual({ count: 1 });
    expect(JSON.stringify([...checkpoints])).not.toContain('secret');
  });
  it.each(['cancelled', 'cancellation_requested', 'succeeded'])('stops %s jobs before provider transfer', async status => {
    mocks.state.mockResolvedValue({ status, lease_owner: 'worker' });
    await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toThrow();
    expect(mocks.generate).not.toHaveBeenCalled(); expect(mocks.write).not.toHaveBeenCalled();
  });
  it('rejects a stale worker lease', async () => {
    mocks.state.mockResolvedValue({ status: 'running', lease_owner: 'other' });
    await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toThrow();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('fails closed when reserving the call cannot be persisted', async () => {
    mocks.write.mockRejectedValue(new Error('storage unavailable'));
    await expect(durableGenerationProvider(client, 'job', 'worker').generate(request)).rejects.toThrow();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('scales the job budget to a batched Quiz and still refuses the call after the cap', async () => {
    for (let call = 0; call < 10; call++) await durableGenerationProvider(client, 'job', 'worker', { maxCalls: 10 }).generate({ ...request, prompt: `batch call ${call}` });
    await expect(durableGenerationProvider(client, 'job', 'worker', { maxCalls: 10 }).generate({ ...request, prompt: 'eleventh' })).rejects.toMatchObject({ findings: ['durable_provider_budget_exhausted'] });
    expect(mocks.generate).toHaveBeenCalledTimes(10);
    expect(checkpoints.get('ai-first:calls:quiz_set')).toEqual({ count: 10 });
  });
  it('gives a repair a fresh provider response even when its prompt matches a saved call', async () => {
    mocks.state.mockResolvedValue({ status: 'running', lease_owner: 'worker', execution_backend: 'google_cloud' });
    mocks.generate.mockResolvedValueOnce({ attempt: 'first' }).mockResolvedValueOnce({ attempt: 'repair' });
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const initial = await durableGenerationProvider(client, 'job', 'worker', { maxCalls: 4, callIdentity: 'quiz:batch:20:initial' }).generate(request);
    const repair = await durableGenerationProvider(client, 'job', 'worker', { maxCalls: 4, callIdentity: 'quiz:batch:20:repair' }).generate(request);
    expect([initial, repair]).toEqual([{ attempt: 'first' }, { attempt: 'repair' }]);
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    // Redelivery of the same logical call still reuses its saved response without billing again.
    expect(await durableGenerationProvider(client, 'job', 'worker', { maxCalls: 4, callIdentity: 'quiz:batch:20:repair' }).generate(request)).toEqual({ attempt: 'repair' });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith('ai_generation.saved_response_reused', expect.objectContaining({ callIdentity: 'quiz:batch:20:repair' }));
    log.mockRestore();
  });
  it('allows one condensation call per distinct source group', async () => {
    const notes = { ...request, schema: { ...request.schema, name: 'source_context_notes' } };
    const provider = durableGenerationProvider(client, 'job', 'worker');
    await provider.generate(notes);
    await expect(provider.generate(notes)).rejects.toMatchObject({ findings: ['durable_provider_budget_exhausted'] });
    await provider.generate({ ...notes, prompt: 'different source group' });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });
});
