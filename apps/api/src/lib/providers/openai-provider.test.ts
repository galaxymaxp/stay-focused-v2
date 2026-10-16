import { afterEach, describe, expect, it, vi } from 'vitest';
import { APIConnectionError, APIConnectionTimeoutError, APIUserAbortError, APIError } from 'openai';
import type { GenerationRequest } from '@stay-focused/engine';
import { createServerOpenAIProvider, OpenAIProvider, ProviderCallError, type OpenAIResponsesCreateResponse } from '../../providers/openai-provider';

const request: GenerationRequest<unknown> = {
  model: 'test-model', prompt: 'PRIVATE_PROMPT',
  schema: { name: 'test', description: 'test', schema: { type: 'object', properties: {}, required: [], additionalProperties: false } },
};
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('provider failure classification', () => {
  it('signals reviewer token exhaustion without interpreting or leaking truncated JSON', async () => {
    const create = vi.fn().mockResolvedValue({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: 'PRIVATE_TRUNCATED_JSON' });
    const provider = new OpenAIProvider({ client: { responses: { create } } });
    await expect(provider.generate({ ...request, schema: { ...request.schema, name: 'reviewer_document' } })).rejects.toMatchObject({ kind: 'incomplete', details: { incompleteReason: 'max_output_tokens' } });
  });
  it('keeps content-filter reviewer incompleteness on the existing failure boundary', async () => {
    const create = vi.fn().mockResolvedValue({ status: 'incomplete', incomplete_details: { reason: 'content_filter' } });
    const provider = new OpenAIProvider({ client: { responses: { create } } });
    await expect(provider.generate({ ...request, schema: { ...request.schema, name: 'reviewer_document' } })).rejects.toMatchObject({ kind: 'incomplete', details: { incompleteReason: 'content_filter' } });
  });
  it.each([
    ['timeout', new APIConnectionTimeoutError({ message: 'PRIVATE_ERROR' }), undefined],
    ['timeout', new APIUserAbortError({ message: 'PRIVATE_ERROR' }), undefined],
    ['timeout', new DOMException('PRIVATE_ERROR', 'AbortError'), undefined],
    ['network', new APIConnectionError({ message: 'PRIVATE_ERROR' }), undefined],
    ['network', new Error('PRIVATE_ERROR'), undefined],
    ['rate_limited', new APIError(429, { message: 'PRIVATE_ERROR' }, 'PRIVATE_ERROR', new Headers()), 429],
    ['http_error', new APIError(500, { message: 'PRIVATE_ERROR' }, 'PRIVATE_ERROR', new Headers()), 500],
    ['http_error', { status: 400, message: 'PRIVATE_ERROR' }, 400],
  ])('classifies %s without retaining provider content', async (kind, error, httpStatus) => {
    const provider = new OpenAIProvider({ client: { responses: { create: vi.fn().mockRejectedValue(error) } } });
    const failure: unknown = await provider.generate(request).catch((value: unknown) => value);
    expect(failure).toBeInstanceOf(ProviderCallError);
    expect(failure).toMatchObject({ kind, message: `provider_${kind}`, details: { model: 'test-model', ...(httpStatus ? { httpStatus } : {}) } });
    expect(JSON.stringify(failure)).not.toMatch(/PRIVATE_/);
  });

  it.each<[string, OpenAIResponsesCreateResponse]>([
    ['incomplete', { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: 'PRIVATE_TRUNCATED_JSON' }],
    ['empty', { status: 'completed', output_text: ' ' }],
    ['invalid_json', { status: 'completed', output_text: 'PRIVATE_INVALID_JSON' }],
    ['not_object', { status: 'completed', output_text: '["PRIVATE_OUTPUT"]' }],
  ])('classifies %s output without retaining it', async (kind, response) => {
    const provider = new OpenAIProvider({ client: { responses: { create: vi.fn().mockResolvedValue(response) } } });
    const failure: unknown = await provider.generate(request).catch((value: unknown) => value);
    expect(failure).toBeInstanceOf(ProviderCallError);
    expect(failure).toMatchObject({ kind, details: { model: 'test-model', ...(kind === 'incomplete' ? { incompleteReason: 'max_output_tokens' } : {}) } });
    expect(JSON.stringify(failure)).not.toMatch(/PRIVATE_/);
  });

  it('preserves incomplete details through the real SDK bridge before JSON parsing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'test-response', status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' },
      output: [{ type: 'message', content: [{ type: 'output_text', text: '{"truncated":' }] }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const provider = createServerOpenAIProvider({ environment: { OPENAI_API_KEY: 'PRIVATE_KEY' }, maxRetries: 0 });
    await expect(provider.generate(request)).rejects.toMatchObject({ kind: 'incomplete', details: { incompleteReason: 'max_output_tokens' } });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
