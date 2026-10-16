import { describe, expect, it, vi } from 'vitest';
import { GenerationContractError, GenerationOutputLimitError } from './generation-context.js';
import { runAIReviewer } from './ai-first-reviewer.js';
import type { GenerationRequest } from './provider.js';
const blocks = Array.from({ length: 3 }, (_, i) => ({ id: `block-${i}`, text: 'Synthetic lesson. '.repeat(300), kind: 'paragraph' as const }));
function response(request: GenerationRequest<unknown>) {
  const sources = JSON.parse(request.prompt.split('\n')[1]!) as { id: string }[];
  return { title: 'Synthetic reviewer', sections: [{ title: 'Lesson', explanation: 'Synthetic lesson.', keyPoints: ['Synthetic lesson.'], sourceRefs: sources.map(source => source.id), emphasis: [] }] };
}
describe('reviewer structural split contracts', () => {
  it('recovers the synchronous provider safe error contract without a durable wrapper', async () => {
    const generate = vi.fn().mockRejectedValueOnce({ kind: 'incomplete', details: { incompleteReason: 'max_output_tokens' } })
      .mockImplementation(async (request: GenerationRequest<unknown>) => response(request));
    const result = await runAIReviewer({ input: { blocks }, provider: { generate } });
    expect(result.metadata.generationStatus).toBe('complete');
    expect(generate).toHaveBeenCalledTimes(4);
  });
  it('reports omitted source references as a failed part after two attempts', async () => {
    const generate = vi.fn(async (request: GenerationRequest<unknown>) => {
      if (!request.metadata?.reviewerCallIdentity) throw new GenerationOutputLimitError();
      const result = response(request);
      if (String(request.metadata.reviewerCallIdentity).startsWith('reviewer:part:1:')) result.sections[0]!.sourceRefs = ['block-0'];
      return result;
    });
    const output = await runAIReviewer({ input: { blocks }, provider: { generate: generate as import('./provider.js').GenerationProvider['generate'] } });
    expect(output.metadata.generationStatus).toBe('partial');
    expect(output.metadata.generationFailures?.[0]?.sourceBlockIds).toEqual(['block-1']);
    expect(output.sections.flatMap(section => section.sourceBlockIds)).toEqual(['block-0','block-2']);
    expect(generate).toHaveBeenCalledTimes(5);
  });
  it('propagates cancellation between parts without publishing completed work', async () => {
    let cancelled = false;
    const generate = vi.fn(async (request: GenerationRequest<unknown>) => {
      if (!request.metadata?.reviewerCallIdentity) throw new GenerationOutputLimitError();
      cancelled = true;
      return response(request);
    });
    await expect(runAIReviewer({ input: { blocks }, shouldCancel: () => cancelled, provider: { generate: generate as import('./provider.js').GenerationProvider['generate'] } })).rejects.toThrow('cancelled');
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it('propagates durable budget denial rather than treating it as a source gap', async () => {
    const generate = vi.fn().mockRejectedValueOnce(new GenerationOutputLimitError()).mockRejectedValue(new GenerationContractError(['durable_provider_budget_exhausted']));
    await expect(runAIReviewer({ input: { blocks }, provider: { generate } })).rejects.toMatchObject({ findings: ['durable_provider_budget_exhausted'] });
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
