import { upsertActiveProcessingJob } from "./activeProcessingJobStore";
import {
  readProcessingDraft,
  removeProcessingDraft,
} from "./processingDraftStore";
import { createReviewerJob } from "./processingJobsApi";
import {
  flushOfflineProcessingIntents,
  type OfflineProcessingIntent,
} from "./processingOutboxStore";

const reconciliationByOwner = new Map<
  string,
  ReturnType<typeof flushOfflineProcessingIntents>
>();

export function reconcileReviewerProcessingOutbox(input: {
  readonly ownerUserId: string;
  readonly accessToken: string;
  readonly apiBaseUrl: string;
}): ReturnType<typeof flushOfflineProcessingIntents> {
  const current = reconciliationByOwner.get(input.ownerUserId);
  if (current) return current;

  const reconciliation = flushOfflineProcessingIntents({
    ownerUserId: input.ownerUserId,
    sourceExists: async (intent) =>
      intent.operation === "artifact_generation" &&
      (await readProcessingDraft(
        input.ownerUserId,
        intent.sourceLocalReference,
      )) !== null,
    submit: async (intent) => submitReviewerIntent(input, intent),
  }).finally(() => {
    reconciliationByOwner.delete(input.ownerUserId);
  });
  reconciliationByOwner.set(input.ownerUserId, reconciliation);
  return reconciliation;
}

async function submitReviewerIntent(
  context: {
    readonly ownerUserId: string;
    readonly accessToken: string;
    readonly apiBaseUrl: string;
  },
  intent: OfflineProcessingIntent,
) {
  if (intent.operation !== "artifact_generation") {
    return {
      status: "blocked" as const,
      errorCode: "unsupported_offline_operation",
    };
  }
  const draft = await readProcessingDraft(
    context.ownerUserId,
    intent.sourceLocalReference,
  );
  if (!draft) {
    return { status: "blocked" as const, errorCode: "local_source_missing" };
  }
  const created = await createReviewerJob({
    apiBaseUrl: context.apiBaseUrl,
    accessToken: context.accessToken,
    idempotencyKey: intent.idempotencyKey,
    sourceText: draft.sourceText,
    ...(draft.sourceTitle ? { sourceTitle: draft.sourceTitle } : {}),
    ...(draft.sourceKind ? { sourceKind: draft.sourceKind } : {}),
    ...(draft.sourceBlocks && draft.sourceBlocks.length > 0
      ? { sourceBlocks: draft.sourceBlocks }
      : {}),
    language:
      typeof intent.settings.language === "string"
        ? intent.settings.language
        : "auto",
    outputMode:
      typeof intent.settings.outputMode === "string"
        ? intent.settings.outputMode
        : "standard",
  });
  if (created.ok) {
    await upsertActiveProcessingJob(context.ownerUserId, created.data);
    await removeProcessingDraft(
      context.ownerUserId,
      intent.sourceLocalReference,
    );
    return { status: "accepted" as const, serverJobId: created.data.id };
  }
  return created.error.retryable
    ? { status: "retryable" as const, errorCode: created.error.code }
    : { status: "blocked" as const, errorCode: created.error.code };
}
