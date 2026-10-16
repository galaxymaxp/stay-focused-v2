import { libraryPositions } from './library-positions';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ExperienceFailure } from './errors';
import type { LibraryArtifactSummary, LibraryArtifactType } from '@stay-focused/shared';

export interface LibraryFilters { readonly type?: LibraryArtifactType; readonly courseId?: string; readonly offset?: number; readonly limit?: number }
export interface LibraryPage { readonly items: readonly LibraryArtifactSummary[]; readonly nextOffset: number | null; readonly supersededReviewerIds: readonly string[] }

// Allow-list deliberately excludes credentials, prompts and private storage tables.
export type ExperienceTable = 'canvas_course_sync_preferences' | 'canvas_auto_reviewer_candidates' | 'quizzes' | 'quiz_attempts' | 'activity_drafts' | 'tasks' | 'canvas_courses' | 'canvas_assignments' | 'canvas_assignment_submissions' | 'canvas_announcements' | 'canvas_files' | 'canvas_file_references' | 'study_sessions' | 'study_plans' | 'reviewer_source_snapshots' | 'reviewer_source_snapshot_items' | 'source_versions' | 'generated_artifacts' | 'generated_artifact_versions' | 'processing_jobs' | 'processing_job_results';
export type ExperienceRow<T extends ExperienceTable> = Database['public']['Tables'][T]['Row'];
export interface ExperienceRepository {
  rows<T extends ExperienceTable>(table: T, userId: string): Promise<readonly ExperienceRow<T>[]>;
  /** Production read contracts; optional for legacy in-memory adapters. */
  libraryPage?(userId: string, filters: LibraryFilters): Promise<LibraryPage>;
  librarySummary?(userId: string, id: string): Promise<LibraryArtifactSummary | null>;
  reviewerDetail?(userId: string, id: string): Promise<{ summary: LibraryArtifactSummary; payload: unknown; artifactId: string } | null>;
  materialReviewers?(userId: string, courseId: string, materialIds: readonly string[]): Promise<ReadonlyMap<string, string>>;
  exactRows?<T extends ExperienceTable>(table: T, userId: string, key: keyof ExperienceRow<T> & string, value: string): Promise<readonly ExperienceRow<T>[]>;
}

/**
 * Binds trusted server reads to the identity established by verifyBearerToken.
 * Callers cannot substitute a route, query, or body user ID at this boundary.
 */
export function trustedExperienceReadRepository(
  client: SupabaseClient<Database>,
  authenticatedUserId: string,
): ExperienceRepository {
  if (!authenticatedUserId) throw new Error('Authenticated experience owner is required.');
  const repository = experienceRepository(client);
  return {
    libraryPage: (_userId, filters) => repository.libraryPage!(authenticatedUserId, filters),
    librarySummary: (_userId, id) => repository.librarySummary!(authenticatedUserId, id),
    reviewerDetail: (_userId, id) => repository.reviewerDetail!(authenticatedUserId, id),
    materialReviewers: (_userId, courseId, materialIds) => repository.materialReviewers!(authenticatedUserId, courseId, materialIds),
    exactRows: (table, _userId, key, value) => repository.exactRows!(table, authenticatedUserId, key, value),
    rows<T extends ExperienceTable>(table: T): Promise<readonly ExperienceRow<T>[]> {
      return repository.rows(table, authenticatedUserId);
    },
  };
}

export function experienceRepository(client: SupabaseClient<Database>): ExperienceRepository {
  function fail(error: unknown): never {
    // Provider details can contain private query values. Never surface them.
    void error;
    throw new ExperienceFailure(503, 'unavailable');
  }
  function scopedLibrary(userId: string, filters: LibraryFilters) {
    let query = client.from('experience_library_v1').select('id,user_id,summary').eq('user_id', userId);
    if (filters.type) query = query.eq('artifact_type', filters.type);
    if (filters.courseId) query = query.eq('course_id', filters.courseId);
    return query;
  }
  return {
    async libraryPage(userId, filters) {
      const offset = filters.offset ?? 0, limit = filters.limit ?? 50;
      if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new ExperienceFailure(400, 'invalid_request');
      const [visible, hidden] = await Promise.all([
        scopedLibrary(userId, filters).eq('superseded', false).order('updated_at', { ascending: false }).order('id').range(offset, offset + limit),
        (async () => {
          const ids: string[] = [];
          for (let start = 0; start < 10_000; start += 200) {
            let query = client.from('experience_library_v1').select('id,user_id').eq('user_id', userId).eq('superseded', true);
            if (filters.type) query = query.eq('artifact_type', filters.type);
            if (filters.courseId) query = query.eq('course_id', filters.courseId);
            const result = await query.order('updated_at', { ascending: false }).order('id').range(start, start + 199);
            if (result.error || !result.data) fail(result.error);
            ids.push(...result.data.filter(row => row.user_id === userId).map(row => row.id));
            if (result.data.length < 200) return ids;
          }
          return fail(null);
        })(),
      ]);
      if (visible.error || !visible.data) fail(visible.error);
      const rows = visible.data.filter(row => row.user_id === userId);
      return { items: await libraryPositions(client, userId, rows.slice(0, limit).map(row => row.summary as unknown as LibraryArtifactSummary)), nextOffset: rows.length > limit ? offset + limit : null, supersededReviewerIds: hidden };
    },
    async librarySummary(userId, id) {
      const result = await client.from('experience_library_v1').select('summary,user_id').eq('user_id', userId).eq('id', id).maybeSingle();
      if (result.error) fail(result.error);
      return result.data?.user_id === userId ? (await libraryPositions(client, userId, [result.data.summary as unknown as LibraryArtifactSummary]))[0]! : null;
    },
    async reviewerDetail(userId, id) {
      let query = client.from('experience_reviewer_summaries_v1').select('summary,artifact_id,version_id,user_id').eq('user_id', userId);
      if (id.startsWith('artifact:')) query = query.eq('id', id);
      else if (id.startsWith('generation:')) query = query.eq('generation_job_id', id.slice('generation:'.length));
      else return null;
      const result = await query.maybeSingle();
      if (result.error) fail(result.error);
      const row = result.data;
      if (!row || row.user_id !== userId) return null;
      const version = await client.from('generated_artifact_versions').select('payload,user_id,artifact_id').eq('user_id', userId)
        .eq('id', row.version_id).eq('artifact_id', row.artifact_id).eq('artifact_type', 'reviewer').maybeSingle();
      if (version.error) fail(version.error);
      if (!version.data || version.data.user_id !== userId || version.data.artifact_id !== row.artifact_id) return null;
      return { summary: (await libraryPositions(client, userId, [row.summary as unknown as LibraryArtifactSummary]))[0]!, payload: version.data.payload, artifactId: row.artifact_id };
    },
    async materialReviewers(userId, courseId, materialIds) {
      const reviewers = new Map<string, string>();
      const ids = [...new Set(materialIds)];
      for (let start = 0; start < ids.length; start += 100) {
        const result = await client.from('experience_material_reviewers_v1').select('user_id,material_id,artifact_id').eq('user_id', userId)
          .eq('course_id', courseId).in('material_id', ids.slice(start, start + 100)).order('material_id').range(0, 100);
        if (result.error || !result.data || result.data.length > 100) fail(result.error);
        for (const row of result.data) if (row.user_id === userId) reviewers.set(row.material_id, row.artifact_id);
      }
      return reviewers;
    },
    async exactRows<T extends ExperienceTable>(table: T, userId: string, key: keyof ExperienceRow<T> & string, value: string): Promise<readonly ExperienceRow<T>[]> {
      const rows: ExperienceRow<T>[] = [];
      for (let offset = 0; offset < 10_000; offset += 200) {
        const result = await client.from(table as ExperienceTable).select('*').eq('user_id', userId).filter(key, 'eq', value).order('id').range(offset, offset + 199);
        if (result.error || !result.data) fail(result.error);
        const page = result.data as unknown as ExperienceRow<T>[];
        rows.push(...page.filter(row => row.user_id === userId));
        if (page.length < 200) return rows;
      }
      return fail(null);
    },
    async rows<T extends ExperienceTable>(table: T, userId: string): Promise<readonly ExperienceRow<T>[]> {
      const result: ExperienceRow<T>[] = [];
      // Complete local pagination; fail explicitly at the safety bound rather than
      // returning a plausible but silently incomplete Today or Library overview.
      for (let offset = 0; offset < 10_000; offset += 200) {
        const { data, error } = await client.from(table as ExperienceTable).select('*').eq('user_id', userId).order('id').range(offset, offset + 199);
        if (error || !data) {
          console.error('experience.read.failed', { table, code: error?.code ?? 'no_data' });
          throw new ExperienceFailure(503, 'unavailable');
        }
        const page = data as unknown as ExperienceRow<T>[];
        result.push(...page.filter(row => row.user_id === userId));
        if (page.length < 200) return result;
      }
      throw new ExperienceFailure(503, 'unavailable');
    },
  };
}
