import { describe, expect, it, vi } from "vitest";

import { createCanvasSyncJob } from "./repository";

const courseId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const connectionId = "33333333-3333-4333-8333-333333333333";

function admissionClient(jobType: "course_content" | "course_grades") {
  const active = {
    id: "44444444-4444-4444-8444-444444444444",
    course_id: courseId,
    user_id: userId,
    job_type: jobType,
    status: "queued",
    google_dispatch_id: "55555555-5555-4555-8555-555555555555",
    google_dispatched_at: new Date().toISOString(),
  };
  let accepted = false;
  const rpc = vi.fn(async () => {
    if (!accepted) {
      accepted = true;
      return { data: [active], error: null };
    }
    return { data: null, error: { message: "canvas_sync_job_in_progress" } };
  });
  const from = vi.fn((table: string) => {
    const query = {
      select: () => query,
      eq: () => query,
      in: () => query,
      maybeSingle: async () => table === "canvas_courses"
        ? { data: { id: courseId, canvas_connection_id: connectionId, name: "Course", course_code: "C" }, error: null }
        : { data: active, error: null },
    };
    return query;
  });
  return { client: { from, rpc }, active, rpc, from };
}

describe.each(["course_content", "course_grades"] as const)("%s admission", (jobType) => {
  it("returns one active job to simultaneous requests with different keys", async () => {
    const { client, active, rpc, from } = admissionClient(jobType);
    const jobs = await Promise.all(["first-key", "second-key"].map((idempotencyKey) =>
      createCanvasSyncJob(client as never, { courseId, userId, jobType, idempotencyKey })));
    expect(jobs.map((job) => job.id)).toEqual([active.id, active.id]);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(from).toHaveBeenCalledWith("canvas_sync_jobs");
  });
});
