import { createHash } from "node:crypto";
import { CanvasClient, CanvasClientError, type CanvasCourse, type CanvasOwnSubmission } from "@stay-focused/canvas";
import type { CanvasCourseRow, Database, Json } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptConnectionToken } from "@/lib/canvas-routes";
import { markCanvasReconnectRequired } from "@/lib/canvas-credential-lifecycle";
import { createCanvasAnnouncementsSnapshotPayload, createCanvasCourseSnapshotPayload } from "@/lib/canvas-sync-normalize";
import { canonicalSerialize } from "@/lib/canvas-sync-fingerprint";

type Client = SupabaseClient<Database>;
const hash = (value: unknown) => createHash("sha256").update(canonicalSerialize(value)).digest("hex");

/** Retries individual requests, preserving pagination. Long Retry-After pauses
 * defer to a future invocation rather than exceeding the server time budget. */
export function pollingFetch(signal: AbortSignal, fetchImpl: typeof fetch = fetch, sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)), defer: (ms: number) => void = () => undefined): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const response = await fetchImpl(input, { ...init, signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal });
      if (response.status !== 429 && response.status < 500) return response;
      const value = response.headers.get("retry-after");
      const parsed = value ? Number(value) : Number.NaN;
      const delay = value ? (Number.isFinite(parsed) ? parsed * 1000 : Date.parse(value) - Date.now()) : 500 * 2 ** attempt;
      if (delay > 5000 || attempt >= 2 || signal.aborted) { if (Number.isFinite(delay) && delay > 0) defer(delay); return response; }
      await response.body?.cancel();
      await sleep(Math.max(0, Number.isFinite(delay) ? delay : 1000));
      signal.throwIfAborted();
    }
  };
}

function courseFromRow(row: CanvasCourseRow): CanvasCourse {
  return { id: row.canvas_course_id, name: row.name, courseCode: row.course_code, workflowState: row.workflow_state, enrollmentTermId: row.enrollment_term_id, accountId: row.account_id, startAt: row.start_at, endAt: row.end_at, timeZone: row.time_zone, publicSyllabus: row.public_syllabus, syllabusBody: row.syllabus_body, updatedAt: row.canvas_updated_at };
}
function submissionPayload(submission: CanvasOwnSubmission): Json {
  const payload = { canvas_assignment_id: submission.canvasAssignmentId, workflow_state: submission.workflowState, submitted_at: submission.submittedAt, excused: submission.excused, missing: submission.missing };
  return { ...payload, source_fingerprint: hash(payload) };
}

export async function pollCanvasCourse(client: Client, row: CanvasCourseRow, workerId: string): Promise<{ failures: number }> {
  const { data: connection, error } = await client.from("canvas_connections").select("*").eq("id", row.canvas_connection_id).eq("user_id", row.user_id).eq("status", "active").maybeSingle();
  if (error || !connection) throw new Error("canvas_notification_connection_unavailable");
  let deferMs = 0;
  const canvas = new CanvasClient({ baseUrl: connection.base_url, personalAccessToken: decryptConnectionToken(connection), fetchImpl: pollingFetch(AbortSignal.timeout(40_000), fetch, undefined, ms => { deferMs = Math.max(deferMs, ms); }), maxPages: 50 });
  const course = courseFromRow(row);
  const payload: Record<string, Json> = {};
  const fingerprints: Record<string, Json> = {};
  let failures = 0;
  let authenticationFailed = false;
  const scope = async (name: string, task: () => Promise<void>) => {
    try { await task(); fingerprints[name] = hash(payload[name]); }
    catch (caught) {
      failures++;
      payload[name] = null;
      if (caught instanceof CanvasClientError) {
        authenticationFailed ||= caught.status === 401;
        deferMs = Math.max(deferMs, caught.retryAfterMs ?? 0);
      }
    }
  };
  await scope("assignments", async () => {
    const assignments = await canvas.listAssignments(course.id);
    payload.assignments = createCanvasCourseSnapshotPayload({ course, assignments, assignmentGroups: [], modules: [], moduleItemsByModule: [], pages: [] }).assignments;
  });
  await scope("submissions", async () => {
    payload.submissions = (await canvas.listOwnCourseSubmissions(course.id)).map(submissionPayload);
  });
  await scope("announcements", async () => {
    // Canvas filters by posting date, not edit time. Include retained history
    // and the current course start so edits to older imported posts are seen.
    const now = Date.now();
    const oldest = await client.from("canvas_announcements").select("posted_at").eq("course_id", row.id).eq("user_id", row.user_id).not("posted_at", "is", null).order("posted_at", { ascending: true }).limit(1).maybeSingle();
    if (oldest.error) throw new Error("canvas_announcement_history_unavailable");
    const dates = [now - 30 * 86400000, Date.parse(course.startAt ?? ""), Date.parse(oldest.data?.posted_at ?? "")].filter(Number.isFinite);
    const startDate = new Date(Math.min(...dates) - 86400000).toISOString();
    const endDate = new Date(now + 86400000).toISOString();
    const announcements = await canvas.listAnnouncements({ courseId: course.id, startDate, endDate });
    payload.announcements = createCanvasAnnouncementsSnapshotPayload({ announcements, canvasCourseId: course.id });
    payload.announcement_window_start = startDate;
    payload.announcement_window_end = endDate;
  });
  await scope("modules", async () => {
    const modules = await canvas.listModules(course.id);
    const moduleItemsByModule = [];
    // Sequential modules bound the load even for very large courses.
    for (const canvasModule of modules) moduleItemsByModule.push({ module: canvasModule, items: await canvas.listModuleItems(course.id, canvasModule.id) });
    const snapshot = createCanvasCourseSnapshotPayload({ course, modules, moduleItemsByModule, assignments: [], assignmentGroups: [], pages: [] });
    payload.modules = snapshot.modules;
    payload.moduleItems = snapshot.moduleItems;
  });
  if (authenticationFailed) { await markCanvasReconnectRequired(client, connection); return { failures }; }
  const applied = await client.rpc("apply_canvas_notification_metadata_v1", { p_course_id: row.id, p_worker_id: workerId, p_payload: { ...payload, fingerprints }, p_error: failures ? "canvas_metadata_scope_unavailable" : null });
  if (applied.error) throw new Error("canvas_notification_persistence_failed");
  if (deferMs > 300_000) {
    const deferred = await client.from("canvas_notification_poll_state").update({ next_poll_at: new Date(Date.now() + deferMs).toISOString() }).eq("course_id", row.id);
    if (deferred.error) throw new Error("canvas_notification_defer_failed");
  }
  return { failures };
}

export async function processCanvasMetadataPolls(client: Client, workerId: string, deadline: number): Promise<{ courses: number; failed: number }> {
  let courses = 0;
  let failed = 0;
  while (courses < 20 && Date.now() + 45_000 < deadline) {
    const claim = await client.rpc("claim_canvas_notification_course_v1", { p_worker_id: workerId });
    if (claim.error) throw new Error("canvas_notification_claim_failed");
    const course = claim.data?.[0];
    if (!course) break;
    courses++;
    try { const result = await pollCanvasCourse(client, course, workerId); if (result.failures) failed++; }
    catch {
      failed++;
      const release = await client.from("canvas_notification_poll_state").update({ lease_owner: null, lease_expires_at: null, last_error: "canvas_metadata_poll_failed" }).eq("course_id", course.id).eq("lease_owner", workerId);
      if (release.error) throw new Error("canvas_notification_release_failed");
    }
  }
  return { courses, failed };
}
