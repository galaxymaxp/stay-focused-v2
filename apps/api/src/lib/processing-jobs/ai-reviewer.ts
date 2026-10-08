import { runAIReviewer, GenerationContractError, type NormalizedSourceKind } from '@stay-focused/engine';
import type { ProcessingJobDatabaseRow, Json } from '@stay-focused/db';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';
import { findProcessingJobSource, type ProcessingJobServiceClient } from './repository';
import { readStructuredSourceBlocks } from './structured-source-blocks';
import { readProcessingJobCheckpoint, writeProcessingJobCheckpoint } from './workflow-repository';
import { updateProcessingJobProgress } from './worker-repository';
import { durableGenerationProvider } from './ai-generation';

export async function processAIReviewerJob(client: ProcessingJobServiceClient, job: ProcessingJobDatabaseRow, workerId: string) {
  const source = await findProcessingJobSource(client, job);
  if (source.user_id !== job.user_id || !source.source_text?.trim()) throw new ExperienceFailure(409, 'not_ready');
  const saved = await readProcessingJobCheckpoint(client, job.id, 'reviewer:ai-first:complete');
  if (saved) return saved.payload as unknown as { payload: { reviewer: import('@stay-focused/engine').ReviewerOutput; sourceSnapshotId?: string }; metrics: Record<string, number> };
  const meta = record(source.metadata);
  const blocks = readStructuredSourceBlocks(meta.reviewerSourceBlocks) ?? [];
  await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: 'generating_sections', statusMessage: 'Creating reviewer from your material' });
  try {
    const reviewer = await runAIReviewer({ provider: durableGenerationProvider(client, job.id, workerId), input: {
      id: source.id, title: typeof meta.sourceTitle === 'string' ? meta.sourceTitle : undefined,
      ...(blocks.length ? { blocks, kind: meta.reviewerSourceKind as NormalizedSourceKind | undefined } : { text: source.source_text }),
    } });
    const output = { payload: { reviewer, ...(typeof meta.reviewerSourceSnapshotId === 'string' ? { sourceSnapshotId: meta.reviewerSourceSnapshotId } : {}) }, metrics: { providerCallCount: reviewer.metadata.generationMetrics?.providerRequestCount ?? 0, finalReviewerSectionCount: reviewer.sections.length } };
    await writeProcessingJobCheckpoint(client, { jobId: job.id, checkpointKey: 'reviewer:ai-first:complete', payload: JSON.parse(JSON.stringify(output)) as Json });
    return output;
  } catch (error) {
    if (error instanceof GenerationContractError) {
      console.info('reviewer_generation.failed', {
        jobId: job.id,
        category: 'contract',
        findings: error.findings.filter(
          (finding) => /^[a-z0-9_.-]{1,80}$/i.test(finding),
        ),
      });
      throw new ExperienceFailure(422, 'generation_failed');
    }
    console.info('reviewer_generation.failed', {
      jobId: job.id,
      category: 'provider',
    });
    throw error;
  }
}
