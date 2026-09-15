import { createHash } from 'node:crypto';
import { GenerationContractError, type GenerationProvider, type GenerationRequest } from '@stay-focused/engine';
import type { Json } from '@stay-focused/db';
import { createServerOpenAIProvider } from '@/providers';
import { ExperienceFailure } from '../experience/errors';
import { readProcessingJobCheckpoint, writeProcessingJobCheckpoint } from './workflow-repository';
import type { ProcessingJobServiceClient } from './repository';
import { readProcessingJobState } from './worker-repository';

/** Reserve before sending: interruption may consume a call, never reset its budget.
 * No rejected output or provider payload is added to durable storage.
 */
export function durableGenerationProvider(client: ProcessingJobServiceClient, jobId: string, workerId: string): GenerationProvider {
  const provider = createServerOpenAIProvider();
  return { async generate<T>(request: GenerationRequest<T>): Promise<T> {
    const job = await readProcessingJobState(client, jobId);
    if (job.status !== 'running' || job.lease_owner !== workerId) throw new ExperienceFailure(409, 'generation_failed');
    const condensation = request.schema.name === 'source_context_notes';
    const suffix = condensation ? createHash('sha256').update(request.prompt).digest('hex') : request.schema.name;
    const key = `ai-first:calls:${suffix}`;
    const prior = await readProcessingJobCheckpoint(client, jobId, key);
    const payload = prior?.payload as { count?: number } | undefined;
    const count = payload?.count ?? 0;
    if (!Number.isInteger(count) || count >= (condensation ? 1 : 2)) throw new GenerationContractError(['durable_provider_budget_exhausted']);
    await writeProcessingJobCheckpoint(client, { jobId, checkpointKey: key, payload: { count: count + 1 } as Json });
    console.info('ai_generation.request', { jobId, schema: request.schema.name, attempt: count + 1, sourceBytes: Buffer.byteLength(request.prompt), model: request.model });
    const started = Date.now();
    try { return await provider.generate<T>(request); }
    catch { throw new ExperienceFailure(503, 'generation_failed'); }
    finally { console.info('ai_generation.request_finished', { jobId, schema: request.schema.name, durationMs: Date.now() - started }); }
  } };
}
