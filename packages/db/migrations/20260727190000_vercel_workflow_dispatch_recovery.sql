-- A client may safely replay the same idempotent creation request after a
-- workflow-start outage. Requeue only the narrowly identified dispatch
-- failure; no provider or processing failure is retried through this boundary.
create or replace function public.prepare_processing_job_workflow_dispatch_v1(
  p_job_id uuid,
  p_prepared_at timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.processing_jobs%rowtype;
begin
  update public.processing_jobs job
  set
    execution_backend = 'vercel_workflow',
    status = 'queued',
    status_message = 'Waiting to start',
    failed_at = null,
    error_code = null,
    safe_error_message = null,
    retryable = false,
    updated_at = p_prepared_at
  where job.id = p_job_id
    and job.workflow_run_id is null
    and (
      job.status = 'queued'
      or (
        job.status = 'failed'
        and job.execution_backend = 'vercel_workflow'
        and job.error_code = 'processing_workflow_dispatch_failed'
        and job.retryable
      )
    )
  returning * into v_job;

  if not found then
    select * into v_job
    from public.processing_jobs job
    where job.id = p_job_id;
  end if;

  if found then
    return next v_job;
  end if;
end;
$$;

revoke all on function public.prepare_processing_job_workflow_dispatch_v1(
  uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.prepare_processing_job_workflow_dispatch_v1(
  uuid, timestamptz
) to service_role;
