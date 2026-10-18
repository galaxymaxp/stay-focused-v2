import { ExperienceFailure } from '../experience/errors';
import { describe, expect, it } from "vitest";

import { mapWorkerFailure } from "./processor";
import { WorkerRepositoryError } from "./worker-repository";

describe("processing worker failure classification", () => {
  it('permits manual validation retry without automatic retry', () => {
    expect(mapWorkerFailure(new ExperienceFailure(422, 'quiz_generation_failed'))).toMatchObject({code:'quiz_generation_failed',retryable:true,automaticRetryable:false});
    expect(mapWorkerFailure(new ExperienceFailure(422, 'generation_failed'))).toMatchObject({code:'generation_failed',retryable:true,automaticRetryable:false});
    expect(mapWorkerFailure(new ExperienceFailure(422, 'quiz_source_capacity_exceeded'))).toMatchObject({retryable:false,automaticRetryable:false});
    expect(mapWorkerFailure(new ExperienceFailure(503, 'quiz_generation_failed'))).toMatchObject({retryable:true});
  });
  it("stops automatic retries for deterministic database contract failures", () => {
    const failure = mapWorkerFailure(
      new WorkerRepositoryError("processing_job_completion_rejected", "42883"),
    );

    expect(failure).toMatchObject({
      automaticRetryable: false,
      code: "processing_result_storage_configuration_error",
      retryable: true,
      safeMessage:
        "Processing could not store its result. Retry after the service is updated.",
    });
  });

  it("keeps transient repository failures eligible for automatic recovery", () => {
    const failure = mapWorkerFailure(
      new WorkerRepositoryError("processing_job_read_failed", "08006"),
    );

    expect(failure).toMatchObject({
      automaticRetryable: true,
      code: "processing_job_read_failed",
      retryable: true,
    });
  });
});
