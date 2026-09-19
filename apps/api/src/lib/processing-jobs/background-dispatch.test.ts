import type { ProcessingJobDatabaseRow } from "@stay-focused/db";
import { describe, expect, it, vi } from "vitest";

import { scheduleAcceptedProcessingJobDispatch } from "./background-dispatch";

describe("processing job background dispatch", () => {
  it("returns after registering bounded post-response work", async () => {
    let task: (() => Promise<void>) | undefined;
    const schedule = vi.fn((value: () => Promise<void>) => {
      task = value;
    });
    const dispatch = vi.fn(async () => undefined);
    const job = { id: "job-1", status: "queued" } as ProcessingJobDatabaseRow;

    scheduleAcceptedProcessingJobDispatch(job, { dispatch, schedule });

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
    await task?.();
    expect(dispatch).toHaveBeenCalledWith(job);
  });

  it("does not retain source text or source bytes in the scheduled value", () => {
    let task: (() => Promise<void>) | undefined;
    const job = { id: "job-2", status: "queued" } as ProcessingJobDatabaseRow;

    scheduleAcceptedProcessingJobDispatch(job, {
      dispatch: vi.fn(async () => undefined),
      schedule: (value) => {
        task = value;
      },
    });

    expect(JSON.stringify(job)).not.toMatch(/sourceText|sourceBytes|source_text/);
    expect(task).toBeTypeOf("function");
  });
});
