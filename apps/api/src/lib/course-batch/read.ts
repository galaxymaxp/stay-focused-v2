import type { CourseBatchQueue } from '@stay-focused/shared';
import type { PreparationClient } from '@/lib/canvas-preparation/repository';
import { ExperienceFailure } from '@/lib/experience/errors';

/** Bounded complete owner read, separate from generation/provider imports. */
export async function readCourseBatchQueue(client: PreparationClient, userId: string): Promise<CourseBatchQueue> {
  const requests = [];
  for (let offset = 0; offset < 10000; offset += 200) {
    const result = await client.from('course_reviewer_requests').select('*').eq('user_id', userId)
      .order('id').range(offset, offset + 199);
    if (result.error || !result.data) throw new ExperienceFailure(503, 'unavailable');
    requests.push(...result.data.filter(row => row.user_id === userId));
    if (result.data.length < 200) break;
    if (offset === 9800) throw new ExperienceFailure(503, 'unavailable');
  }
  const done = new Set<string>();
  const ids = requests.flatMap(row => row.job_id ? [row.job_id] : []);
  for (let offset = 0; offset < ids.length; offset += 100) {
    const jobs = await client.from('processing_jobs').select('id,status').eq('user_id', userId).in('id', ids.slice(offset, offset + 100));
    if (jobs.error || !jobs.data) throw new ExperienceFailure(503, 'unavailable');
    jobs.data.filter(job => job.status === 'succeeded').forEach(job => done.add(job.id));
  }
  const groups = new Map<string, { batchKey: string; done: number; total: number }>();
  for (const row of requests) {
    for (const key of new Set([row.batch_key, ...row.batch_keys])) {
      const group = groups.get(key) ?? { batchKey: key, done: 0, total: 0 };
      group.total++;
      if (row.state === 'skipped' || (row.job_id && done.has(row.job_id))) group.done++;
      groups.set(key, group);
    }
  }
  return { requests: requests.map(row => ({ id: row.id, batchKey: row.batch_key, courseId: row.course_id, materialId: row.material_id,
    title: row.title, state: row.state, jobId: row.job_id, nextAvailableAt: row.next_available_at })), summaries: [...groups.values()] };
}
