import { createHash } from 'node:crypto';
import { GenerationContractError, type GenerationProvider, type GenerationRequest } from '@stay-focused/engine';
import type { Json } from '@stay-focused/db';
import { createServerOpenAIProvider } from '@/providers';
import { ExperienceFailure } from '../experience/errors';
import { readProcessingJobCheckpoint, writeProcessingJobCheckpoint } from './workflow-repository';
import type { ProcessingJobServiceClient } from './repository';
import { readProcessingJobState } from './worker-repository';

export interface DurableProviderOptions {
  /** Job-wide cap for the non-condensation schema; defaults to one call plus one repair. */
  readonly maxCalls?: number;
  /** Distinguishes logical calls that may share a prompt, so a repair never resolves to an earlier saved response. */
  readonly callIdentity?: string;
}

/** Reserve before sending: interruption may consume a call, never reset its budget.
 * No rejected output or provider payload is added to durable storage.
 */
export function durableGenerationProvider(client: ProcessingJobServiceClient, jobId: string, workerId: string, options: DurableProviderOptions = {}): GenerationProvider {
  const provider = createServerOpenAIProvider();
  return { async generate<T>(request: GenerationRequest<T>): Promise<T> {
    const job = await readProcessingJobState(client, jobId);
    if (job.status !== 'running' || job.lease_owner !== workerId) throw new ExperienceFailure(409, 'generation_failed');
    // A queue redelivery can resume a validated response, but an interrupted
    // external call has an unknowable outcome. Fail safely instead of billing twice.
    const googleKey = job.execution_backend === 'google_cloud'
      ? `google:provider:${createHash('sha256').update(JSON.stringify(options.callIdentity ? [request.model, request.schema.name, request.prompt, options.callIdentity] : [request.model, request.schema.name, request.prompt])).digest('hex')}`
      : null;
    if (googleKey) {
      const saved = await readProcessingJobCheckpoint(client, jobId, googleKey);
      const response = saved?.payload as { state?: string; value?: Json } | undefined;
      if (response?.state === 'completed') {
        console.info('ai_generation.saved_response_reused', { jobId, schema: request.schema.name, ...(options.callIdentity ? { callIdentity: options.callIdentity } : {}) });
        return response.value as T;
      }
      if (response) throw new GenerationContractError(['provider_outcome_uncertain']);
    }
    const condensation = request.schema.name === 'source_context_notes';
    const suffix = condensation ? createHash('sha256').update(request.prompt).digest('hex') : request.schema.name;
    const key = `ai-first:calls:${suffix}`;
    const prior = await readProcessingJobCheckpoint(client, jobId, key);
    const payload = prior?.payload as { count?: number } | undefined;
    const count = payload?.count ?? 0;
    if (!Number.isInteger(count) || count >= (condensation ? 1 : options.maxCalls ?? 2)) throw new GenerationContractError(['durable_provider_budget_exhausted']);
    await writeProcessingJobCheckpoint(client, { jobId, checkpointKey: key, payload: { count: count + 1 } as Json });
    if (googleKey) await writeProcessingJobCheckpoint(client, { jobId, checkpointKey: googleKey, payload: { state: 'pending' } });
    console.info('ai_generation.request', { jobId, schema: request.schema.name, attempt: count + 1, ...(options.callIdentity ? { callIdentity: options.callIdentity } : {}), sourceBytes: Buffer.byteLength(request.prompt), model: request.model });
    const started = Date.now();
    try {
      const result = await provider.generate<T>(request);
      if (googleKey) await writeProcessingJobCheckpoint(client, { jobId, checkpointKey: googleKey,
        payload: { state: 'completed', value: JSON.parse(JSON.stringify(result)) as Json } });
      return result;
    }
    catch { throw new ExperienceFailure(503, 'generation_failed'); }
    finally { console.info('ai_generation.request_finished', { jobId, schema: request.schema.name, durationMs: Date.now() - started }); }
  } };
}
