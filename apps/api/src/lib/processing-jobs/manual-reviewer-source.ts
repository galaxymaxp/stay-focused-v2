import type { Json, ProcessingJobDatabaseRow } from "@stay-focused/db";
import { PipelineCancellationError, type SourceNormalizationBlockInput } from "@stay-focused/engine";
import { UNREADABLE_MANUAL_FILE_MESSAGE } from "@stay-focused/shared";
import { extractOfficeStructure } from "../activity-maker/office-extraction";
import { record } from "../experience/mappers";
import { findProcessingJobSource, type ProcessingJobServiceClient } from "./repository";
import { WorkerJobError } from "./processor";
import { readProcessingJobState, updateProcessingJobProgress } from "./worker-repository";

export async function attachManualReviewerSource(client: ProcessingJobServiceClient, job: ProcessingJobDatabaseRow,
  workerId: string, text: string, blocks: readonly SourceNormalizationBlockInput[]): Promise<void> {
  if (!text.trim()) throw new WorkerJobError("no_text_detected", UNREADABLE_MANUAL_FILE_MESSAGE, false);
  if (text.length > 100_000) throw new WorkerJobError("source_too_large", "Choose a file with at most 100,000 text characters.", false);
  const { data, error } = await client.rpc("attach_manual_reviewer_source_v1", {
    p_job_id: job.id, p_worker_id: workerId, p_source_text: text,
    p_source_blocks: JSON.parse(JSON.stringify(blocks)) as Json,
  });
  if (error || !data?.[0]) throw new WorkerJobError("processing_job_source_attach_failed", "The file's text could not be saved. Try again.", true);
}

/** Every backend uses the same checkpointed PDF/image steps and Office extractor. */
export async function prepareManualReviewerSource(client: ProcessingJobServiceClient, job: ProcessingJobDatabaseRow, workerId: string): Promise<void> {
  const source = await findProcessingJobSource(client, job);
  if (record(source.metadata).manualReviewerVersion !== "manual-reviewer-v1") return;
  if (source.source_kind === "text") {
    if (source.source_version_id && source.source_version_id !== job.source_version_id) {
      await attachManualReviewerSource(client, job, workerId, source.source_text ?? "", []);
    }
    return;
  }
  if (source.user_id !== job.user_id) throw new WorkerJobError("processing_job_source_invalid", "The source is unavailable.", false);
  const state = await readProcessingJobState(client, job.id);
  if (state.status !== "running" || state.lease_owner !== workerId) throw new PipelineCancellationError();
  if (source.source_kind === "docx" || source.source_kind === "pptx") {
    await updateProcessingJobProgress(client, { jobId: job.id, workerId, stage: "preparing_source", statusMessage: "Reading your file" });
    if (!source.storage_bucket || !source.storage_object_path) throw new WorkerJobError("processing_job_source_missing", "The source is unavailable.", false);
    const downloaded = await client.storage.from(source.storage_bucket).download(source.storage_object_path);
    if (downloaded.error || !downloaded.data) throw new WorkerJobError("processing_job_source_download_failed", "The source could not be read. Try again.", true);
    let office;
    try { office = extractOfficeStructure(new Uint8Array(await downloaded.data.arrayBuffer()), source.source_kind); }
    catch { throw new WorkerJobError("no_text_detected", UNREADABLE_MANUAL_FILE_MESSAGE, false); }
    // Slide placeholders alone are not usable lesson content.
    const substantive = office.text.replace(/^# Slide \d+: \[empty title\]/gm, "").replace(/\[empty (?:title|field)\]/g, "").trim();
    if (!substantive) throw new WorkerJobError("no_text_detected", UNREADABLE_MANUAL_FILE_MESSAGE, false);
    await attachManualReviewerSource(client, job, workerId, office.text, office.drafts.map((block, order) => ({
      id: `office-${order + 1}`, kind: "paragraph", order, text: block.text, ...(block.pageNumber ? { pageNumber: block.pageNumber } : {}),
    })));
    return;
  }
  const operations = await import("./operations");
  if (source.source_kind === "pdf") {
    const pageCount = source.page_count;
    if (!pageCount) throw new WorkerJobError("invalid_pdf", "Choose a valid PDF.", false);
    for (let page = 1; page <= pageCount; page++) await operations.inspectPdfPageStep(job.id, workerId, page, pageCount);
  }
  const plan = await operations.prepareExtractionStep(job.id, workerId, source.source_kind === "pdf");
  if (plan.kind === "image") await operations.extractImageStep(job.id, workerId);
  for (const chunk of plan.chunks) await operations.extractPdfChunkStep(job.id, workerId, chunk.index, chunk.pageNumbers, true);
  await operations.finalizeExtractionStep(job.id, workerId);
}
