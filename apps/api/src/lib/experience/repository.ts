import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ExperienceFailure } from './errors';

// Allow-list deliberately excludes credentials, prompts and private storage tables.
export type ExperienceTable = 'quizzes' | 'quiz_attempts' | 'activity_drafts' | 'tasks' | 'canvas_courses' | 'canvas_assignments' | 'canvas_assignment_submissions' | 'study_sessions' | 'study_plans' | 'reviewers' | 'reviewer_source_snapshots' | 'generated_artifacts' | 'generated_artifact_versions' | 'processing_jobs' | 'processing_job_results';
export type ExperienceRow<T extends ExperienceTable> = Database['public']['Tables'][T]['Row'];
export interface ExperienceRepository {
  rows<T extends ExperienceTable>(table: T, userId: string): Promise<readonly ExperienceRow<T>[]>;
}
export function experienceRepository(client: SupabaseClient<Database>): ExperienceRepository {
  return {
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
