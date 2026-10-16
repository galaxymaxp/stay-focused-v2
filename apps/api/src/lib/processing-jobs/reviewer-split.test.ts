import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationContractError, GenerationOutputLimitError, runAIReviewer, reviewerOutputTokenBudget, reviewerProviderCallBudget, splitReviewerSource, normalizeSource, type GenerationRequest, type SourceNormalizationInput } from '@stay-focused/engine';
import { ProviderCallError } from '@/providers/openai-provider';
import type { ProcessingJobServiceClient } from './repository';
import { durableGenerationProvider } from './ai-generation';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), state: vi.fn(), checkpoints: new Map<string, unknown>() }));
vi.mock('@/providers', () => ({ createServerOpenAIProvider: () => ({ generate: mocks.generate }) }));
vi.mock('./worker-repository', () => ({ readProcessingJobState: mocks.state }));
vi.mock('./workflow-repository', () => ({
  readProcessingJobCheckpoint: async (_client: unknown, _job: string, key: string) => mocks.checkpoints.has(key) ? { payload: mocks.checkpoints.get(key) } : null,
  writeProcessingJobCheckpoint: async (_client: unknown, input: { checkpointKey: string; payload: unknown }) => { mocks.checkpoints.set(input.checkpointKey, input.payload); },
}));
const input: SourceNormalizationInput = { id: 'synthetic', title: 'Synthetic material', blocks: Array.from({ length: 12 }, (_, i) => ({ id: `block-${i + 1}`, text: (`Topic ${i + 1}. ` + 'Synthetic educational material. '.repeat(100)).slice(0, i === 11 ? 2202 : 2193), kind: 'paragraph' })) };
const partSources = (request: GenerationRequest<unknown>) => JSON.parse(request.prompt.split('\n')[1]!) as { id: string; text: string }[];
const answer = (request: GenerationRequest<unknown>) => ({ title: 'Reviewer', sections: partSources(request).map(source => ({ title: source.id, explanation: source.text.slice(0, 100), keyPoints: ['Synthetic educational material.'], emphasis: [], sourceRefs: [source.id] })) });
const truncated = () => new ProviderCallError('incomplete', { model: 'test', incompleteReason: 'max_output_tokens' });
async function run(source = input) {
  return runAIReviewer({ input: source, model: 'test', provider: durableGenerationProvider({} as ProcessingJobServiceClient, 'job', 'worker', { maxCalls: await reviewerProviderCallBudget(source) }) });
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.checkpoints.clear();
  mocks.state.mockResolvedValue({ status: 'running', lease_owner: 'worker', execution_backend: 'google_cloud' });
  mocks.generate.mockImplementation(async (request: GenerationRequest<unknown>) => {
    if (!request.metadata?.reviewerCallIdentity) throw truncated();
    return answer(request);
  });
});
describe('MR1 ordered reviewer recovery', () => {
  it('assembles a 26,325-character source after truncation, preserving all blocks in order and unique IDs', async () => {
    expect(input.blocks!.reduce((n, block) => n + block.text.length, 0)).toBe(26325);
    const output = await run();
    expect(output.metadata.generationStatus).toBe('complete');
    expect(output.sections.flatMap(section => section.sourceBlockIds)).toEqual(input.blocks!.map(block => block.id));
    expect(new Set(output.sections.map(section => section.id)).size).toBe(12);
    expect(new Set(output.sections.flatMap(section => section.items.map(item => item.id))).size).toBe(12);
    expect(output.sections.map(section => section.order)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(mocks.generate).toHaveBeenCalledTimes(5);
    expect(mocks.generate.mock.calls[0]![0].maxOutputTokens).toBe(23744);
    expect(mocks.checkpoints.get('ai-first:calls:reviewer_document')).toEqual({ count: 5 });
    const instructions = mocks.generate.mock.calls.map(([request]) => (request as GenerationRequest<unknown>).instructions);
    expect(new Set(instructions).size).toBe(1);
    expect(instructions[0]).toContain('do not invent enrichment');
  });
  it('retries once, quarantines a failed part, and keeps both preceding and following parts as typed partial', async () => {
    mocks.generate.mockImplementation(async (request: GenerationRequest<unknown>) => {
      if (!request.metadata?.reviewerCallIdentity) throw truncated();
      if (String(request.metadata.reviewerCallIdentity).startsWith('reviewer:part:1:')) throw new ProviderCallError('http_error', { model: 'test', httpStatus: 500 });
      return answer(request);
    });
    const output = await run();
    expect(output.metadata.generationStatus).toBe('partial');
    expect(output.metadata.reviewerQualityStatus).toBe('limited');
    expect(output.sections.flatMap(section => section.sourceBlockIds)).toEqual(['block-1','block-2','block-3','block-7','block-8','block-9','block-10','block-11','block-12']);
    expect(output.metadata.generationFailures).toEqual([{ partId: 'part-2', sourceBlockIds: ['block-4','block-5','block-6'], attempts: 2, reason: 'generation_failed' }]);
    expect(output.metadata.coverageStatus).toBe('failed');
    expect(output.metadata.coverage.sourceSectionsCovered).toBe(9);
    expect(output.metadata.coverage.issues).toHaveLength(3);
    expect(mocks.generate).toHaveBeenCalledTimes(6);
    await run(); // Even quarantined attempts are not re-billed on redelivery.
    expect(mocks.generate).toHaveBeenCalledTimes(6);
  });
  it('makes exactly one call for short sources and reuses success', async () => {
    mocks.generate.mockImplementation(async (request: GenerationRequest<unknown>) => answer(request));
    const short = { id: 'short', blocks: [{ id: 'short-1', text: 'Synthetic short lesson.', kind: 'paragraph' as const }] };
    const output = await run(short);
    await run(short);
    expect(output.metadata.generationStatus).toBe('complete');
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.generate.mock.calls[0]![0].maxOutputTokens).toBe(12000);
  });
  it.each(['google_cloud', 'vercel_workflow', 'database_worker'])('resumes a crash on %s between split parts without repeating completed transfers', async execution_backend => {
    let reads = 0;
    mocks.state.mockImplementation(async () => {
      if (++reads === 3) throw new Error('simulated_worker_crash');
      return { status: 'running', lease_owner: 'worker', execution_backend };
    });
    await expect(run()).rejects.toThrow('simulated_worker_crash');
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    const result = await run();
    expect(result.metadata.generationStatus).toBe('complete');
    expect(mocks.generate).toHaveBeenCalledTimes(5);
    expect(mocks.checkpoints.get('ai-first:calls:reviewer_document')).toEqual({ count: 5 });
  });
  it('keeps content_filter terminal, including redelivery, without splitting', async () => {
    mocks.generate.mockRejectedValue(new ProviderCallError('incomplete', { model: 'test', incompleteReason: 'content_filter' }));
    await expect(run()).rejects.toThrow('generation_failed');
    await expect(run()).rejects.toMatchObject({ findings: ['provider_output_incomplete'] });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect([...mocks.checkpoints.values()]).toContainEqual({ state: 'failed', kind: 'incomplete', incompleteReason: 'content_filter' });
  });
  it('does not infer truncation from legacy incomplete checkpoints without a reason', async () => {
    mocks.generate.mockRejectedValue(new ProviderCallError('incomplete', { model: 'test' }));
    await expect(run()).rejects.toThrow('generation_failed');
    await expect(run()).rejects.toBeInstanceOf(GenerationContractError);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it('preserves uncertain outcomes and finished parts without a duplicate transfer or a false partial success', async () => {
    mocks.generate.mockImplementation(async (request: GenerationRequest<unknown>) => {
      if (!request.metadata?.reviewerCallIdentity) throw truncated();
      if (String(request.metadata.reviewerCallIdentity).startsWith('reviewer:part:1:')) throw new ProviderCallError('timeout', { model: 'test' });
      return answer(request);
    });
    await expect(run()).rejects.toThrow('generation_failed');
    await expect(run()).rejects.toMatchObject({ findings: ['provider_outcome_uncertain'] });
    expect(mocks.generate).toHaveBeenCalledTimes(3);
    expect([...mocks.checkpoints.values()].filter(value => (value as { state?: string }).state === 'completed')).toHaveLength(1);
  });
  it('quarantines a part with invalid references after exactly two attempts', async () => {
    mocks.generate.mockImplementation(async (request: GenerationRequest<unknown>) => {
      if (!request.metadata?.reviewerCallIdentity) throw truncated();
      const result = answer(request);
      if (String(request.metadata.reviewerCallIdentity).startsWith('reviewer:part:1:')) result.sections[0]!.sourceRefs = ['invented'];
      return result;
    });
    expect((await run()).metadata.generationStatus).toBe('partial');
    expect(mocks.generate).toHaveBeenCalledTimes(6);
  });
  it('bounds budgets and preserves page/heading/block boundaries, including oversized indivisible blocks', async () => {
    expect([reviewerOutputTokenBudget(0),reviewerOutputTokenBudget(26325),reviewerOutputTokenBudget(1_000_000)]).toEqual([12000,23744,24000]);
    const source = await normalizeSource({ blocks: [
      { id: 'a', text: 'a'.repeat(5000), kind: 'paragraph', pageNumber: 1 },
      { id: 'b', text: 'b'.repeat(1000), kind: 'heading', pageNumber: 1 },
      { id: 'c', text: 'c'.repeat(9000), kind: 'paragraph', pageNumber: 2 },
    ] });
    expect(splitReviewerSource(source.blocks).map(part => part.map(block => block.id))).toEqual([['a'],['b'],['c']]);
    expect(splitReviewerSource(source.blocks).flat()).toEqual(source.blocks);
  });
  it('does not publish an empty reviewer if every part fails', async () => {
    mocks.generate.mockRejectedValue(new GenerationOutputLimitError());
    await expect(run()).rejects.toMatchObject({ findings: ['reviewer:no_completed_parts'] });
    expect(mocks.generate).toHaveBeenCalledTimes(9);
  });
  it('splits sources beyond one context without first sending an oversized request or condensing', async () => {
    mocks.generate.mockImplementation(async (request: GenerationRequest<unknown>) => answer(request));
    const long = { blocks: Array.from({ length: 15 }, (_, i) => ({ id: `long-${i}`, text: 'Synthetic content. '.repeat(400), kind: 'paragraph' as const })) };
    const output = await run(long);
    expect(output.metadata.generationStatus).toBe('complete');
    expect(mocks.generate).toHaveBeenCalledTimes(15);
    for (const [request] of mocks.generate.mock.calls) {
      expect((request as GenerationRequest<unknown>).schema.name).toBe('reviewer_document');
      expect(new TextEncoder().encode((request as GenerationRequest<unknown>).prompt).length).toBeLessThan(80000);
    }
  });
});
