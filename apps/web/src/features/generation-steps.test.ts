import {
  EXTRACTION_JOB_STAGES,
  REVIEWER_JOB_STAGES,
} from "@stay-focused/shared";
import { describe, expect, it } from "vitest";
import { generationSteps } from "./generation-steps";

describe("generation steps from the reported job stage", () => {
  it("uses the shared reviewer order and marks only the reported stage current", () => {
    const steps = generationSteps(
      "generating_sections",
      "running",
      "reviewer_generation",
    );
    expect(steps.map((step) => step.stage)).toEqual(REVIEWER_JOB_STAGES);
    expect(steps.map((step) => step.state)).toEqual([
      "done",
      "done",
      "done",
      "done",
      "current",
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
  });
  it.each(["failed", "expired"] as const)(
    "names the stopped stage for %s",
    (status) => {
      const steps = generationSteps(
        "verifying_coverage",
        status,
        "reviewer_generation",
      );
      expect(steps.find((step) => step.state === "failed")).toMatchObject({
        stage: "verifying_coverage",
        label: "Checking reviewer",
      });
      expect(steps.at(-1)?.state).toBe("pending");
    },
  );
  it("marks the shared extraction stages done only on server success", () => {
    const steps = generationSteps(
      "storing_result",
      "succeeded",
      "document_extraction",
    );
    expect(steps.map((step) => step.stage)).toEqual(EXTRACTION_JOB_STAGES);
    expect(steps.every((step) => step.state === "done")).toBe(true);
  });
  it.each(["quiz_generation", "activity_generation"] as const)(
    "uses only stages emitted by the %s worker",
    (jobType) => {
      expect(generationSteps("storing_result", "running", jobType)).toEqual([
        {
          stage: "preparing_source",
          label: "Preparing material",
          state: "done",
        },
        {
          stage: "generating_sections",
          label: "Building study material",
          state: "done",
        },
        { stage: "storing_result", label: "Saving result", state: "current" },
      ]);
    },
  );
  it("does not report work complete while queued or guess progress for a mismatched stage", () => {
    expect(
      generationSteps(
        "generating_sections",
        "queued",
        "reviewer_generation",
      ).every((step) => step.state === "pending"),
    ).toBe(true);
    expect(
      generationSteps("storing_result", "running", "reviewer_generation").every(
        (step) => step.state === "pending",
      ),
    ).toBe(true);
  });
  it("keeps cancellation requested current and never marks cancelled work failed or successful", () => {
    expect(
      generationSteps(
        "generating_sections",
        "cancellation_requested",
        "reviewer_generation",
      )[4]?.state,
    ).toBe("current");
    expect(
      generationSteps(
        "generating_sections",
        "cancelled",
        "reviewer_generation",
      )[4]?.state,
    ).toBe("pending");
  });
});
