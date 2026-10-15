import type { Database, Json } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReviewerShareLink, SharedQuiz, SharedVisual } from '@stay-focused/shared';
import { randomBytes } from 'node:crypto';
import { readCanonicalReviewerRecord } from '../canonical-reviewers';
import { ExperienceFailure } from '../experience/errors';
import { record, reviewerReader } from '../experience/mappers';
import { experienceRepository } from '../experience/repository';
import { learnerQuestion } from '../quiz/read-model';
import type { QuizQuestion } from '@stay-focused/shared';
import { buildShareSnapshot } from './snapshot';

type Client = SupabaseClient<Database>;
function unavailable(): never { throw new ExperienceFailure(503, 'unavailable'); }
const link = (row: Database['public']['Tables']['reviewer_shares']['Row'] | null): ReviewerShareLink | null =>
  row && row.revoked_at === null ? { token: row.token, updatedAt: row.updated_at } : null;

async function ownedReviewer(client: Client, owner: string, artifactId: string) {
  const saved = await readCanonicalReviewerRecord(client, owner, artifactId);
  if (!saved.ok) unavailable();
  if (!saved.value) throw new ExperienceFailure(404, 'not_found');
  return saved.value;
}
export async function getOwnerShare(client: Client, owner: string, artifactId: string): Promise<ReviewerShareLink | null> {
  await ownedReviewer(client, owner, artifactId);
  const result = await client.from('reviewer_shares').select('*').eq('user_id', owner).eq('artifact_id', artifactId).maybeSingle();
  if (result.error) unavailable();
  return result.data?.user_id === owner && result.data.artifact_id === artifactId ? link(result.data) : null;
}
export async function mutateOwnerShare(client: Client, owner: string, artifactId: string,
  action: 'create' | 'update' | 'revoke', assists: unknown = []): Promise<ReviewerShareLink | null> {
  const saved = await ownedReviewer(client, owner, artifactId);
  let snapshot: Json = {};
  if (action !== 'revoke') {
    if (action === 'create') {
      const existing = await getOwnerShare(client, owner, artifactId);
      if (existing) return existing; // Never rebuild an existing snapshot implicitly.
    }
    const summary = await experienceRepository(client).librarySummary!(owner, `artifact:${artifactId}`);
    if (!summary) throw new ExperienceFailure(404, 'not_found');
    const reviewer = reviewerReader(saved.version.payload, summary);
    const root = record(saved.version.payload), payload = record(root.reviewer ?? root);
    const sourceBlocks = record(saved.source.metadata).reviewerSourceBlocks;
    const blocks = (Array.isArray(sourceBlocks) ? sourceBlocks : []).map(record);
    const byId = new Map(blocks.map(b => [b.id, b]));
    const rawSections = (Array.isArray(payload.sections) ? payload.sections : []).map(record);
    const citations = reviewer.sections.map(section => {
      const raw = rawSections.find(s => s.id === section.id), ids = raw?.sourceBlockIds;
      if (!Array.isArray(ids) || byId.size !== blocks.length || ids.some(id => !byId.has(id))) return [];
      return [...new Set(ids.flatMap(id => {
        const page = byId.get(id)?.pageNumber;
        return typeof page === 'number' && Number.isSafeInteger(page) && page >= 1 && page <= 100 ? [`From page ${page}`] : [];
      }))];
    });
    const quizRows: Database['public']['Tables']['quizzes']['Row'][] = [];
    for (let offset = 0; ; offset += 100) {
      if (offset >= 10000) unavailable();
      const result = await client.from('quizzes').select('*').eq('user_id', owner).eq('reviewer_artifact_id', artifactId)
        .order('id').range(offset, offset + 99);
      if (result.error || !result.data) unavailable();
      quizRows.push(...result.data.filter(q => q.user_id === owner && q.reviewer_artifact_id === artifactId));
      if (result.data.length < 100) break;
    }
    const quizzes: SharedQuiz[] = await Promise.all(quizRows.map(async q => {
      const keys = await client.from('quiz_keys').select('questions,user_id').eq('user_id', owner).eq('quiz_id', q.id).maybeSingle();
      if (keys.error || !keys.data || keys.data.user_id !== owner || !Array.isArray(keys.data.questions)) unavailable();
      return { title: q.title, questions: (q.questions as unknown as QuizQuestion[]).map(learnerQuestion),
        keys: keys.data.questions.map(value => {
          const k = record(value);
          return { id: k.id as string, correctOptionIds: k.correctOptionIds as string[], explanation: k.explanation as string,
            ...(k.acceptedAnswers === undefined ? {} : { acceptedAnswers: k.acceptedAnswers as string[] }) };
        }) };
    }));
    const images = await client.from('section_external_visuals').select('user_id,artifact_id,version_id,section_id,status,image_url,title,credit,license,license_url,source_url')
      .eq('user_id', owner).eq('artifact_id', artifactId).eq('version_id', saved.version.id);
    if (images.error || !images.data) unavailable();
    const visuals: SharedVisual[] = images.data.flatMap(v => {
      const section = reviewer.sections.findIndex(s => s.id === v.section_id);
      if (v.user_id !== owner || v.artifact_id !== artifactId || v.version_id !== saved.version.id || v.status !== 'found' || section < 0) return [];
      if (!v.image_url || !v.title || !v.credit || !v.license || !v.license_url || !v.source_url) return [];
      return [{ section, image: v.image_url, title: v.title, credit: v.credit, license: v.license, licenseUrl: v.license_url, sourceUrl: v.source_url }];
    });
    const projected = buildShareSnapshot({ reviewer, citations, quizzes, visuals, assists });
    const serialized = JSON.stringify(projected);
    if (Buffer.byteLength(serialized) > 2_000_000) throw new ExperienceFailure(400, 'invalid_request');
    snapshot = JSON.parse(serialized) as Json;
  }
  const result = await client.rpc('mutate_reviewer_share_v1', { p_user_id: owner, p_artifact_id: artifactId, p_action: action,
    p_token: randomBytes(32).toString('hex'), p_version_id: saved.version.id, p_snapshot: snapshot });
  if (result.error) throw new ExperienceFailure(result.error.message === 'not_found' ? 404 : 503,
    result.error.message === 'not_found' ? 'not_found' : 'unavailable');
  const row = result.data?.[0];
  if (!row || row.user_id !== owner || row.artifact_id !== artifactId) {
    if (action === 'revoke' && !row) return null;
    unavailable();
  }
  return link(row);
}
