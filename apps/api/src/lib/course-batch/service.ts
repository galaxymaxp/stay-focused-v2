import { randomUUID } from 'node:crypto';
import type { CourseReviewerRequestRow } from '@stay-focused/db';
import type { CourseBatchPreview, CourseBatchResult } from '@stay-focused/shared';
import { listCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { admitMaterialPreparation, lookupMaterialPreparation, materialEvidence } from '@/lib/canvas-preparation/admission';
import { readPreparedResult, revisionFingerprint, sourceDigest, type PreparationClient } from '@/lib/canvas-preparation/repository';
import { dispatchAcceptedProcessingJob } from '@/lib/processing-jobs/workflow-dispatch';
import { startReviewerGeneration } from '@/lib/experience/generation';
import { experienceRepository } from '@/lib/experience/repository';
import { readReviewerSourceStatus } from '@/lib/reviewer-source-status';
import { ExperienceFailure } from '@/lib/experience/errors';
import { record } from '@/lib/experience/mappers';

async function reviewerMatchesMaterial(client: PreparationClient, userId: string, courseId: string, materialId: string, artifactId: string) {
  const artifact = await client.from('generated_artifacts').select('latest_version_id').eq('id', artifactId).eq('user_id', userId).eq('artifact_type', 'reviewer').is('deleted_at', null).maybeSingle();
  if (artifact.error) throw new ExperienceFailure(503, 'unavailable');
  if (!artifact.data?.latest_version_id) return false;
  const version = await client.from('generated_artifact_versions').select('source_version_id').eq('id', artifact.data.latest_version_id).eq('artifact_id', artifactId).eq('user_id', userId).maybeSingle();
  if (version.error) throw new ExperienceFailure(503, 'unavailable');
  if (!version.data) return false;
  const source = await client.from('source_versions').select('metadata').eq('id', version.data.source_version_id).eq('user_id', userId).maybeSingle();
  if (source.error) throw new ExperienceFailure(503, 'unavailable');
  const snapshotId = record(source.data?.metadata).reviewerSourceSnapshotId;
  if (typeof snapshotId !== 'string') return false;
  const snapshot = await client.from('reviewer_source_snapshots').select('id').eq('id', snapshotId).eq('user_id', userId).eq('course_id', courseId).maybeSingle();
  const items = await client.from('reviewer_source_snapshot_items').select('source_type,source_row_id').eq('source_snapshot_id', snapshotId).eq('user_id', userId).eq('course_id', courseId).order('ordinal').limit(41);
  if (snapshot.error || items.error) throw new ExperienceFailure(503, 'unavailable');
  if (!snapshot.data || !items.data || items.data.length >= 41) return false;
  try {
    const evidence = await materialEvidence(client, { userId, courseId, materialId });
    const expected = evidence.evidence.map(item => `${item.type}:${item.id}`).sort();
    const accepted = items.data.map(item => `${item.source_type}:${item.source_row_id}`).sort();
    return JSON.stringify(expected) === JSON.stringify(accepted);
  } catch { return false; }
}

export async function previewCourseBatch(client: PreparationClient, userId: string, courseId: string): Promise<CourseBatchPreview> {
  const inventory = await listCanvasReviewerSources({ client, userId, courseId, completeInventory: true });
  if (!inventory.ok) throw new ExperienceFailure(inventory.status === 404 ? 404 : 503, inventory.status === 404 ? 'not_found' : 'unavailable');
  if (inventory.value.pagination.hasMore) throw new ExperienceFailure(503, 'unavailable');
  const reviewers = await experienceRepository(client).materialReviewers!(userId, courseId, inventory.value.sources.map(row => row.id));
  const items = [];
  for (const source of inventory.value.sources) {
    const artifact = reviewers.get(source.id);
    const status = artifact ? await readReviewerSourceStatus({ client, userId, reviewerArtifactId: artifact.replace(/^artifact:/, '') }) : null;
    const done = !!artifact && status?.ok === true && status.value.overallStatus === 'current' &&
      await reviewerMatchesMaterial(client, userId, courseId, source.id, artifact.replace(/^artifact:/, ''));
    const eligible = source.type === 'page' || (source.type === 'file' && !!source.file && source.file.kind !== 'unsupported' &&
      (source.file.canPrepare || source.file.preparationStatus === 'ready'));
    items.push({ id: source.id, title: source.title, done, selectable: eligible && !done });
  }
  return { items };
}

export async function createCourseBatch(client: PreparationClient, userId: string, courseId: string, selected: 'all' | readonly string[]): Promise<CourseBatchResult> {
  const preview = await previewCourseBatch(client, userId, courseId);
  const ids = selected === 'all' ? preview.items.map(row => row.id) : [...new Set(selected)].sort();
  if (ids.some(id => !preview.items.some(row => row.id === id))) throw new ExperienceFailure(404, 'not_found');
  const course = await client.from('canvas_courses').select('id,canvas_connection_id').eq('user_id', userId).eq('id', courseId).maybeSingle();
  if (course.error) throw new ExperienceFailure(503, 'unavailable');
  if (!course.data) throw new ExperienceFailure(404, 'not_found');
  const batchKey = sourceDigest(JSON.stringify([userId, courseId, [...ids].sort()]));
  let skippedUpToDate = 0, failed = 0;
  const requests: string[] = [];
  for (const item of preview.items.filter(row => ids.includes(row.id))) {
    if (item.done) { skippedUpToDate++; continue; }
    if (!item.selectable) continue;
    const identity = { userId, courseId, materialId: item.id };
    let revision: string;
    try { revision = revisionFingerprint((await materialEvidence(client, identity, { resolveAttachments: true })).evidence); }
    catch { failed++; continue; }
    const saved = await client.from('course_reviewer_requests').upsert({ user_id: userId, course_id: courseId,
      canvas_connection_id: course.data.canvas_connection_id, material_id: item.id, revision, batch_key: batchKey, title: item.title.slice(0, 500) },
    { onConflict: 'user_id,material_id,revision', ignoreDuplicates: true });
    if (saved.error) throw new ExperienceFailure(503, 'unavailable');
    const row = await client.from('course_reviewer_requests').select('*').eq('user_id', userId).eq('material_id', item.id).eq('revision', revision).single();
    if (row.error || !row.data) throw new ExperienceFailure(503, 'unavailable');
    const linked = await client.rpc('link_course_reviewer_batch_v1', { p_user_id: userId, p_request_id: row.data.id, p_batch_key: batchKey });
    if (linked.error || !linked.data) throw new ExperienceFailure(503, 'unavailable');
    requests.push(row.data.id);
    await advanceCourseRequest(client, row.data);
  }
  const values: CourseReviewerRequestRow[] = [];
  for (let start = 0; start < requests.length; start += 100) {
    const rows = await client.from('course_reviewer_requests').select('*').eq('user_id', userId).in('id', requests.slice(start, start + 100));
    if (rows.error || !rows.data) throw new ExperienceFailure(503, 'unavailable');
    values.push(...rows.data);
  }
  const next = values.flatMap(row => row.next_available_at ? [row.next_available_at] : []).sort()[0];
  return { batchKey, created: values.filter(row => row.state === 'admitted').length, skippedUpToDate,
    waitingForPrepared: values.filter(row => row.state === 'waiting').length, overLimit: values.filter(row => row.state === 'quota').length,
    failed: failed + values.filter(row => row.state === 'failed').length, ...(next ? { nextAvailableAt: next } : {}) };
}

export async function advanceCourseRequest(client: PreparationClient, row: CourseReviewerRequestRow): Promise<void> {
  if (!['waiting', 'quota'].includes(row.state)) return;
  const identity = { userId: row.user_id, courseId: row.course_id, materialId: row.material_id };
  const update = async (patch: Partial<CourseReviewerRequestRow>) => {
    const result = await client.from('course_reviewer_requests').update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', row.id).eq('user_id', row.user_id).in('state', ['waiting', 'quota']);
    if (result.error) throw new ExperienceFailure(503, 'unavailable');
  };
  try {
    const currentRevision = revisionFingerprint((await materialEvidence(client, identity)).evidence);
    if (currentRevision !== row.revision) { await update({ state: 'failed' }); return; }
    const preparation = await lookupMaterialPreparation(client, identity);
    if (preparation && ['failed', 'cancelled'].includes(preparation.state)) { await update({ state: 'failed' }); return; }
    if (!preparation || !await readPreparedResult(client, preparation)) {
      // manual: is the explicit past-course permission; no Auto preference read.
      const job = await admitMaterialPreparation(client, { ...identity, cycleKey: `manual:batch:${row.id}`, explicitFilePermission: true });
      if (!job || ['failed', 'cancelled'].includes(job.state)) await update({ state: 'failed' });
      await update({ state: 'waiting' });
      return;
    }
    const job = await startReviewerGeneration(client, row.user_id, identity, `course-batch:${row.id}`, {
      schedule: () => {}, expectedPreparationRevision: row.revision, batchRequestId: row.id,
    });
    // The database trigger commits the receipt with the job, before dispatch.
    await dispatchAcceptedProcessingJob(job, { client });
  } catch (error) {
    if (error instanceof ExperienceFailure && error.status === 429) {
      const next = await client.rpc('course_reviewer_next_available_v1', { p_user_id: row.user_id });
      if (next.error) throw new ExperienceFailure(503, 'unavailable');
      await update({ state: 'quota', next_available_at: next.data });
    } else if (error instanceof ExperienceFailure && error.status === 409 && error.code === 'not_ready') {
      await update({ state: 'waiting' });
    } else {
      // Safe terminal failure; retries are always an explicit student action.
      await update({ state: 'failed' });
    }
  }
}

/** Global recovery includes explicitly requested past courses, independent of Canvas polling eligibility. */
export async function resumeCourseRequests(client: PreparationClient, filter: { userId?: string; courseId?: string; materialId?: string } = {}, deadline = Date.now() + 20000) {
  let query = client.from('course_reviewer_requests').select('*').in('state', ['waiting', 'quota']).order('updated_at').order('id').limit(20);
  if (filter.userId) query = query.eq('user_id', filter.userId);
  if (filter.courseId) query = query.eq('course_id', filter.courseId);
  if (filter.materialId) query = query.eq('material_id', filter.materialId);
  const result = await query;
  if (result.error || !result.data) throw new ExperienceFailure(503, 'unavailable');
  for (const row of result.data) {
    if (Date.now() >= deadline) break;
    await advanceCourseRequest(client, row);
  }
}

export async function mutateCourseRequest(client: PreparationClient, userId: string, id: string, action: 'cancel' | 'retry') {
  const row = await client.from('course_reviewer_requests').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (row.error) throw new ExperienceFailure(503, 'unavailable');
  if (!row.data) throw new ExperienceFailure(404, 'not_found');
  if (action === 'retry' && row.data.state === 'failed') {
    const identity = { userId, courseId: row.data.course_id, materialId: row.data.material_id };
    await admitMaterialPreparation(client, { ...identity, cycleKey: `manual:batch-retry:${id}:${randomUUID()}`, manualRetry: true, explicitFilePermission: true });
  }
  const result = await client.from('course_reviewer_requests').update({ state: action === 'cancel' ? 'cancelled' : 'waiting', updated_at: new Date().toISOString() })
    .eq('user_id', userId).eq('id', id).in('state', action === 'cancel' ? ['waiting', 'quota', 'failed'] : ['failed']).select('id');
  if (result.error) throw new ExperienceFailure(503, 'unavailable');
  if (!result.data?.length) throw new ExperienceFailure(409, 'conflict');
  if (action === 'retry') await resumeCourseRequests(client, { userId, courseId: row.data.course_id, materialId: row.data.material_id });
  return { accepted: true };
}
