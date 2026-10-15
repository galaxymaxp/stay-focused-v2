import { randomUUID } from 'node:crypto';
import { isPastOwnedCourse } from '@/lib/course-state';
import type { CanvasPreparationBackfillCourseRow } from '@stay-focused/db';
import { listCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { admitMaterialPreparation, materialEvidence } from './admission';
import { dispatchPreparation } from './dispatch';
import { advancePreparationSync, reconcilePreparationCourse } from './orchestration';
import { revisionFingerprint, type PreparationClient } from './repository';

export const BACKFILL_COURSES_PER_RUN = 20;
export const BACKFILL_PER_COURSE_BUDGET = 25;
export const BACKFILL_GLOBAL_BUDGET = 50;
export const BACKFILL_ROUND_ROBIN_QUANTUM = 5;
export const BACKFILL_POLL_RESERVE_MS = 30_000;
const PAGE_SIZE = 200;
const MAX_PAGES = 50;

/** Read the complete priority work set before allowing any background backfill. */
async function recoverLiveWork(client: PreparationClient) {
  const courses = new Map<string, { userId: string; courseId: string }>();
  for (const table of ['canvas_preparation_syncs', 'canvas_preparation_discoveries'] as const) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const query = table === 'canvas_preparation_syncs'
        ? client.from(table).select('*').in('guard_state', ['running', 'deferred']).order('id')
        : client.from(table).select('*').eq('state', 'pending').order('material_id');
      const result = await query.not('cycle_key', 'like', 'backfill:%').order('course_id').order('user_id')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (result.error || !result.data) throw new Error('preparation_priority_inventory_unavailable');
      for (const row of result.data) courses.set(`${row.user_id}:${row.course_id}`, { userId: row.user_id, courseId: row.course_id });
      if (result.data.length < PAGE_SIZE) break;
      if (page === MAX_PAGES - 1) throw new Error('preparation_priority_inventory_incomplete');
    }
  }
  // Explicit Retry already dispatches directly. Recover interrupted acceptance
  // before automatic work as well, using the exact same dispatch receipt.
  const retries = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await client.from('canvas_material_preparations').select('*').eq('state', 'pending')
      .like('cycle_key', 'manual:%').order('id').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (result.error || !result.data) throw new Error('preparation_priority_inventory_unavailable');
    retries.push(...result.data);
    if (result.data.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) throw new Error('preparation_priority_inventory_incomplete');
  }
  for (const job of retries) await dispatchPreparation(client, job);
  for (const identity of courses.values()) await reconcilePreparationCourse(client, { ...identity, drainDeferred: true });
}

export async function seedPreparationBackfill(client: PreparationClient, input: { userId: string; courseId: string; cycleKey: string; deadline?: number }) {
  if (await isPastOwnedCourse(client, input.userId, input.courseId)) return { complete: true, seeded: 0 };
  const inventory = await listCanvasReviewerSources({ client, userId: input.userId, courseId: input.courseId,
    completeInventory: true, includePreparationStatus: false });
  if (!inventory.ok || inventory.value.pagination.hasMore) {
    console.warn('canvas_preparation.backfill_skipped_incomplete', { courseId: input.courseId });
    return { complete: false, seeded: 0 };
  }
  const controls = [];
  const jobs = [];
  const files = [];
  // Stable, complete receipt/control/revision reads. A read error/bound never
  // converts a missing receipt into permission to seed a prepared revision.
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await client.from('canvas_material_preparation_controls').select('*').eq('user_id', input.userId)
      .eq('course_id', input.courseId).order('material_id').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (result.error || !result.data) throw new Error('preparation_backfill_inventory_unavailable');
    controls.push(...result.data);
    if (result.data.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) throw new Error('preparation_backfill_inventory_incomplete');
  }
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await client.from('canvas_material_preparations').select('*').eq('user_id', input.userId)
      .eq('course_id', input.courseId).order('id').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (result.error || !result.data) throw new Error('preparation_backfill_inventory_unavailable');
    jobs.push(...result.data);
    if (result.data.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) throw new Error('preparation_backfill_inventory_incomplete');
  }
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await client.from('canvas_files').select('id,content_version_fingerprint').eq('user_id', input.userId)
      .eq('course_id', input.courseId).order('id').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (result.error || !result.data) throw new Error('preparation_backfill_inventory_unavailable');
    files.push(...result.data);
    if (result.data.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) throw new Error('preparation_backfill_inventory_incomplete');
  }
  const controlsByMaterial = new Map(controls.map(row => [row.material_id, row]));
  const filesById = new Map(files.map(row => [row.id, row]));
  const seeds = [];
  for (const source of [...inventory.value.sources].sort((a, b) => a.id.localeCompare(b.id))) {
    if (input.deadline && Date.now() + 5_000 >= input.deadline) return { complete: false, seeded: 0 };
    if (source.type !== 'page' && (source.type !== 'file' || !source.file || source.file.kind === 'unsupported' ||
      (!source.file.canPrepare && source.file.preparationStatus !== 'ready'))) continue;
    const control = controlsByMaterial.get(source.id);
    if (control && (control.suppressed || control.automatic_attempts >= 3)) continue;
    const materialJobs = jobs.filter(row => row.material_id === source.id);
    let revision: string | null = null;
    if (materialJobs.length) {
      if (source.type === 'file') {
        const file = filesById.get(source.id.slice(5));
        if (!file || !/^[a-f0-9]{64}$/.test(file.content_version_fingerprint)) throw new Error('preparation_backfill_inventory_unavailable');
        revision = revisionFingerprint([{ type: 'file', id: file.id, revision: file.content_version_fingerprint }]);
      } else {
        // Page identity includes current HTML plus ordered attachment revisions.
        // Unresolved attachment evidence cannot seed a plausible partial source.
        const identity = await materialEvidence(client, { ...input, materialId: source.id });
        revision = revisionFingerprint(identity.evidence);
      }
    }
    const job = materialJobs.find(row => row.revision_fingerprint === revision);
    if (job?.state === 'prepared' || (job && ['pending', 'running'].includes(job.state) && !job.cycle_key.startsWith('backfill:'))) continue;
    seeds.push({ user_id: input.userId, course_id: input.courseId, material_id: source.id, cycle_key: input.cycleKey });
  }
  // All evidence is read before mutation. A partial/crashed upsert is safely
  // completed on the next visit; conflicts preserve cooldown/failure records.
  let seeded = 0;
  for (let offset = 0; offset < seeds.length; offset += PAGE_SIZE) {
    const result = await client.from('canvas_preparation_discoveries').upsert(seeds.slice(offset, offset + PAGE_SIZE),
      { onConflict: 'user_id,course_id,material_id', ignoreDuplicates: true }).select('material_id');
    if (result.error) throw new Error('preparation_backfill_seed_unavailable');
    seeded += result.data?.length ?? 0;
  }
  const viable = new Set(seeds.map(row => row.material_id));
  const retired = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await client.from('canvas_preparation_discoveries').select('material_id').eq('user_id', input.userId)
      .eq('course_id', input.courseId).eq('state', 'pending').like('cycle_key', 'backfill:%')
      .order('material_id').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (result.error || !result.data) throw new Error('preparation_backfill_inventory_unavailable');
    retired.push(...result.data.filter(row => !viable.has(row.material_id)).map(row => row.material_id));
    if (result.data.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) throw new Error('preparation_backfill_inventory_incomplete');
  }
  // Complete eligibility/revision/control evidence can retire stale discovery
  // wakeups. Jobs/results are retained; failed discoveries and live origins are
  // untouched. A later eligible revision can be seeded again.
  for (let offset = 0; offset < retired.length; offset += PAGE_SIZE) {
    const result = await client.from('canvas_preparation_discoveries').delete().eq('user_id', input.userId)
      .eq('course_id', input.courseId).eq('state', 'pending').like('cycle_key', 'backfill:%').in('material_id', retired.slice(offset, offset + PAGE_SIZE));
    if (result.error) throw new Error('preparation_backfill_seed_unavailable');
  }
  return { complete: true, seeded };
}

/** Only the metadata-poll invocation calls this runner. No HTTP admission path. */
export async function processPreparationBackfill(client: PreparationClient, workerId: string, deadline: number) {
  await recoverLiveWork(client);
  const counts = { seeded: 0, admitted: 0, deferred: 0, skippedIncomplete: 0 };
  if (Date.now() + 5_000 >= deadline) return counts;
  const claimed = await client.rpc('claim_canvas_preparation_backfill_courses_v1', { p_worker_id: workerId, p_limit: BACKFILL_COURSES_PER_RUN });
  if (claimed.error || !claimed.data) throw new Error('preparation_backfill_claim_unavailable');
  const cycleKey = `backfill:${Math.floor(Date.now() / 300_000)}:${randomUUID()}`;
  const queues: { course: CanvasPreparationBackfillCourseRow; ids: string[]; consumed: number; ledger: string | null; jobs: string[]; recovered: boolean }[] =
    claimed.data.map(course => ({ course, ids: [], consumed: 0, ledger: null, jobs: [], recovered: false }));
  let budget = BACKFILL_GLOBAL_BUDGET;
  const dispatchWithinDeadline: typeof dispatchPreparation = async (store, job) =>
    Date.now() + 5_000 < deadline ? dispatchPreparation(store, job) : job;
  try {
    for (let round = 0; round < BACKFILL_PER_COURSE_BUDGET / BACKFILL_ROUND_ROBIN_QUANTUM && budget > 0; round++) {
      for (const queue of queues) {
        if (budget <= 0 || Date.now() + 5_000 >= deadline) break;
        const { course } = queue;
        const identity = { userId: course.user_id, courseId: course.course_id };
        if (round === 0) {
          const visit = await client.from('canvas_preparation_backfill_courses').update({ last_visited_at: new Date().toISOString() })
            .eq('course_id', course.course_id).eq('user_id', course.user_id).eq('lease_owner', workerId);
          if (visit.error) throw new Error('preparation_backfill_visit_unavailable');
          // An earlier poll's single <=25 receipt batch is recovered first.
          const open = await client.from('canvas_preparation_syncs').select('*').eq('user_id', course.user_id).eq('course_id', course.course_id)
            .like('cycle_key', 'backfill:%').in('guard_state', ['running', 'deferred']).order('created_at').order('id').limit(1);
          if (open.error) throw new Error('preparation_backfill_ledger_unavailable');
          if (open.data?.[0]) {
            if (budget < BACKFILL_PER_COURSE_BUDGET) { queue.recovered = true; continue; }
            budget -= BACKFILL_PER_COURSE_BUDGET;
            queue.consumed = BACKFILL_PER_COURSE_BUDGET;
            await advancePreparationSync(client, open.data[0].id, dispatchWithinDeadline);
            queue.recovered = true;
            continue;
          }
          const seed = await seedPreparationBackfill(client, { ...identity, cycleKey, deadline });
          counts.seeded += seed.seeded;
          if (!seed.complete) { counts.skippedIncomplete++; queue.recovered = true; continue; }
          const backlog = await client.from('canvas_preparation_discoveries').select('material_id')
            .eq('user_id', course.user_id).eq('course_id', course.course_id).eq('state', 'pending').like('cycle_key', 'backfill:%')
            .lte('available_at', new Date().toISOString()).order('material_id').limit(BACKFILL_PER_COURSE_BUDGET);
          if (backlog.error) throw new Error('preparation_backfill_backlog_unavailable');
          queue.ids = backlog.data?.map(row => row.material_id) ?? [];
        }
        if (queue.recovered) continue;
        const admitted: string[] = [];
        for (let turn = 0; turn < BACKFILL_ROUND_ROBIN_QUANTUM && queue.ids.length && budget > 0 && Date.now() + 5_000 < deadline; turn++) {
          const materialId = queue.ids.shift()!;
          budget--; queue.consumed++;
          try {
            const job = await admitMaterialPreparation(client, { ...identity, materialId, cycleKey, explicitFilePermission: true, dispatch: false });
            if (job) admitted.push(materialId);
            if (job && ['pending', 'running'].includes(job.state)) { queue.jobs.push(job.id); counts.admitted++; }
          } catch { console.warn('canvas_preparation.backfill_admission_unavailable', { courseId: course.course_id, materialId }); }
        }
        if (queue.jobs.length) {
          const registered = await client.rpc('register_canvas_preparation_sync_v1', {
            p_user_id: course.user_id, p_course_id: course.course_id, p_sync_id: null, p_cycle_key: cycleKey, p_job_ids: queue.jobs,
          });
          if (registered.error || !registered.data) throw new Error('preparation_backfill_guard_unavailable');
          queue.ledger = registered.data;
        }
        // Persist the guarded receipts before removing durable discovery work.
        if (admitted.length) {
          const removed = await client.from('canvas_preparation_discoveries').delete().eq('user_id', course.user_id)
            .eq('course_id', course.course_id).in('material_id', admitted);
          if (removed.error) throw new Error('preparation_backfill_backlog_unavailable');
        }
      }
    }
    for (const queue of queues) {
      if (queue.ledger) await advancePreparationSync(client, queue.ledger, dispatchWithinDeadline);
      const remaining = await client.from('canvas_preparation_discoveries').select('material_id', { count: 'exact', head: true })
        .eq('user_id', queue.course.user_id).eq('course_id', queue.course.course_id).eq('state', 'pending').like('cycle_key', 'backfill:%');
      if (remaining.error) throw new Error('preparation_backfill_backlog_unavailable');
      const deferred = remaining.count ?? 0;
      counts.deferred += deferred;
      if (queue.consumed) console.info('canvas_preparation.backfill_course', { courseId: queue.course.course_id, admitted: queue.jobs.length, deferred });
    }
    console.info('canvas_preparation.backfill', counts);
    return counts;
  } finally {
    const released = await client.from('canvas_preparation_backfill_courses').update({ lease_owner: null, lease_expires_at: null }).eq('lease_owner', workerId);
    if (released.error) throw new Error('preparation_backfill_release_unavailable');
  }
}
