import {
  getStepMetadata,
  RetryableError,
  sleep,
} from "workflow";

export interface CanvasRuntimeFixtureResult {
  readonly units: readonly {
    readonly attempt: number;
    readonly stepId: string;
    readonly unitId: string;
  }[];
}

export async function canvasSyncRuntimeFixtureWorkflow(
  unitIds: readonly string[],
  rateLimitedUnitId: string | null,
): Promise<CanvasRuntimeFixtureResult> {
  "use workflow";

  const firstBatch = await Promise.all(
    unitIds.slice(0, 3).map((unitId) =>
      executeCanvasRuntimeFixtureUnit(unitId, rateLimitedUnitId)
    ),
  );

  // Models a durable provider Retry-After or connection-capacity wait. The
  // workflow is suspended; no Vercel function remains active.
  await sleep("5m");

  const remaining = await Promise.all(
    unitIds.slice(3).map((unitId) =>
      executeCanvasRuntimeFixtureUnit(unitId, rateLimitedUnitId)
    ),
  );
  return { units: [...firstBatch, ...remaining] };
}

async function executeCanvasRuntimeFixtureUnit(
  unitId: string,
  rateLimitedUnitId: string | null,
): Promise<{
  readonly attempt: number;
  readonly stepId: string;
  readonly unitId: string;
}> {
  "use step";
  const metadata = getStepMetadata();
  if (unitId === rateLimitedUnitId && metadata.attempt === 0) {
    throw new RetryableError("canvas_rate_limited", { retryAfter: 25 });
  }
  return {
    attempt: metadata.attempt,
    stepId: metadata.stepId,
    unitId,
  };
}
executeCanvasRuntimeFixtureUnit.maxRetries = 3;
