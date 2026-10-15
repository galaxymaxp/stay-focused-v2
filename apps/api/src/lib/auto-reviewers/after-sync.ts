import { isPastOwnedCourse } from '@/lib/course-state';
import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runAutomaticReviewerAdmission } from "./admission";

/** Never throws: the sync is already terminal and must stay that way. */
export async function runAutomaticReviewersAfterSync(
  client: SupabaseClient<Database>,
  input: { readonly userId: string; readonly courseId: string; readonly brokeredCanvasToken?: string },
  run: typeof runAutomaticReviewerAdmission = runAutomaticReviewerAdmission,
): Promise<void> {
  try {
    if (await isPastOwnedCourse(client, input.userId, input.courseId)) return;
    const result = await run(client, input);
    console.info("auto_reviewers.run", {
      status: result.status,
      admitted: result.admitted,
      skipped: result.skipped,
      deferred: result.deferred,
      failed: result.failed,
    });
  } catch {
    console.error("auto_reviewers.run_failed", { code: "auto_reviewer_run_failed" });
  }
}
