import { describe, expect, it, vi } from "vitest";
import type { Database, ProcessingJobDatabaseRow } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listOwnedActiveProcessingJobs, listOwnedProcessingJobs, findOwnedProcessingJob, toProcessingJobStatusView, withOwnedJobOrigins } from "./repository";

const job = { id: "job", user_id: "owner", source_metadata: {}, status: "queued" } as ProcessingJobDatabaseRow;
function setup(rows = [{ user_id: "owner", processing_job_id: "job" }], error: object | null = null) {
  const eq = vi.fn(); const ids = vi.fn().mockResolvedValue({ data: rows, error });
  const candidates = { select: () => candidates, eq, in: ids }; eq.mockReturnValue(candidates);
  const query = { select: () => query, eq: () => query, in: () => query, order: () => query,
    limit: async () => ({ data: [job], error: null }), maybeSingle: async () => ({ data: job, error: null }) };
  const client = { from: (table: string) => table === "canvas_auto_reviewer_candidates" ? candidates : query } as unknown as SupabaseClient<Database>;
  return { client, eq, ids };
}
describe("owned automatic job status labels", () => {
  it("derives origin from candidate receipts for lists and individual status", async () => {
    const s = setup();
    const rows = await withOwnedJobOrigins(s.client, "owner", [job]);
    expect(toProcessingJobStatusView(rows[0]!)).toMatchObject({ id: "job", origin: "automatic" });
    expect(s.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(s.ids).toHaveBeenCalledWith("processing_job_id", ["job"]);
    expect((await listOwnedActiveProcessingJobs(s.client, "owner"))[0]?.origin).toBe("automatic");
    expect((await listOwnedProcessingJobs(s.client, "owner", { scope: "all", limit: 20 }))[0]?.origin).toBe("automatic");
    expect((await findOwnedProcessingJob(s.client, "owner", "job"))?.origin).toBe("automatic");
  });
  it("ignores foreign candidates and does not infer automation from metadata", async () => {
    const s = setup([{ user_id: "other", processing_job_id: "job" }]);
    const result = await withOwnedJobOrigins(s.client, "owner", [{ ...job, source_metadata: { origin: "automatic" } }]);
    expect(result[0]?.origin).toBe("manual");
  });
  it("omits the optional origin if receipt lookup fails", async () => {
    const s = setup([], { message: "private" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await withOwnedJobOrigins(s.client, "owner", [job]))[0]?.origin).toBeUndefined();
  });
});
