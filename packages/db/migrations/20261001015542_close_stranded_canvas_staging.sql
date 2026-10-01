-- Close only pre-repair Canvas placeholders that never reached a worker.
with stranded as (
  update public.processing_jobs job
  set status = 'failed',
      status_message = 'Needs attention',
      failed_at = now(),
      updated_at = now(),
      error_code = 'processing_canvas_source_stage_failed',
      safe_error_message = 'The Canvas source could not be prepared. Try again.',
      retryable = false
  where job.job_type = 'reviewer_generation'
    and job.status = 'queued'
    and job.stage = 'preparing_source'
    and job.attempt_count = 0
    and job.workflow_dispatched_at is null
    and job.lease_owner is null
    and job.result_id is null
    and job.created_at < '2026-10-01T01:40:00Z'::timestamptz
    and exists (
      select 1 from public.processing_job_sources source
      where source.id = job.source_snapshot_id
        and source.user_id = job.user_id
        and source.source_kind = 'text'
        and source.metadata ->> 'canvasDeferredResolutionVersion' = 'canvas-reviewer-source-v1'
    )
  returning job.id, job.user_id
)
insert into public.processing_job_events(job_id, user_id, event_type, payload)
select id, user_id, 'job_failed',
  jsonb_build_object('errorCode', 'processing_canvas_source_stage_failed', 'retryable', false)
from stranded;
