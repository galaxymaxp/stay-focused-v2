import { waitForSleep } from "@workflow/vitest";
import { getRun, start } from "workflow/api";
import { describe, expect, it } from "vitest";

import { canvasSyncRuntimeFixtureWorkflow } from "./canvas-sync-runtime-fixture";

describe("Canvas Vercel Workflow runtime", () => {
  it("durably resumes after a bounded batch and retries a rate-limited unit", async () => {
    const run = await start(canvasSyncRuntimeFixtureWorkflow, [
      ["modules:1", "pages:1", "assignments:1", "announcements:1"],
      "pages:1",
    ]);

    const sleepId = await waitForSleep(run);
    await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });
    const result = await run.returnValue;

    expect(result.units.map((unit) => unit.unitId)).toEqual([
      "modules:1",
      "pages:1",
      "assignments:1",
      "announcements:1",
    ]);
    expect(
      result.units.find((unit) => unit.unitId === "pages:1")?.attempt,
    ).toBe(1);
    expect(new Set(result.units.map((unit) => unit.stepId)).size).toBe(4);
    await expect(run.status).resolves.toBe("completed");
  });
});
