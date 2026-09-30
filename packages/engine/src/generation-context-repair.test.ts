import { describe, expect, it } from 'vitest';
import { GenerationContractError, generateContract } from './generation-context.js';

describe('bounded generation repair', () => {
  it('uses the one allowed repair after a large rejected Reviewer response', async () => {
    const prompts: string[] = [];
    const provider = {
      async generate<T>(request: { prompt: string }): Promise<T> {
        prompts.push(request.prompt);
        return (prompts.length === 1 ? { rejected: 'x'.repeat(34_000) } : { accepted: true }) as T;
      },
    };
    const result = await generateContract({
      provider,
      model: 'test',
      schema: { name: 'reviewer_document', schema: { type: 'object', additionalProperties: false, required: [], properties: {} }, description: 'test' },
      context: '[{"id":"page-1","text":"Substantive source material"}]',
      instructions: 'Use the source.',
      validate: (raw) => {
        if ((raw as { accepted?: boolean }).accepted) return raw;
        throw new GenerationContractError(['reviewer:emphasis_text']);
      },
    });
    expect(result).toEqual({ accepted: true });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain('reviewer:emphasis_text');
    expect(prompts[1]).toContain('Substantive source material');
    expect(prompts[1]).not.toContain('x'.repeat(100));
    expect(new TextEncoder().encode(prompts[1]).length).toBeLessThan(24_500);
  });
});
