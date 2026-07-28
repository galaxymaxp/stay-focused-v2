alter table public.canvas_sync_jobs
  add column retry_idempotency_key text;

alter table public.canvas_sync_jobs
  add constraint canvas_sync_jobs_retry_idempotency_key_safe
  check (
    retry_idempotency_key is null
    or char_length(retry_idempotency_key) between 8 and 200
  );

create or replace function public.retry_canvas_sync_job_v2(
  p_user_id uuid,
  p_job_id uuid,
  p_idempotency_key text
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
  v_key text := nullif(btrim(p_idempotency_key), '');
begin
  if v_key is null or char_length(v_key) not between 8 and 200 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_retry_key_invalid';
  end if;

  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if v_job.retry_idempotency_key = v_key then
    return next v_job;
    return;
  end if;

  if v_job.status <> 'failed'
    or not v_job.retryable
    or v_job.attempt_count >= v_job.max_attempts then
    return;
  end if;

  update public.canvas_sync_jobs job
  set
    status = 'queued',
    stage = 'waiting_to_start',
    status_message = 'Waiting to retry',
    completed_units = 0,
    total_units = 1,
    unit_label = 'operations',
    result_summary = null,
    retry_idempotency_key = v_key,
    workflow_run_id = null,
    workflow_dispatched_at = null,
    worker_id = null,
    accepted_at = now(),
    started_at = null,
    completed_at = null,
    failed_at = null,
    cancellation_requested_at = null,
    error_code = null,
    safe_error_message = null,
    retryable = false
  where job.id = p_job_id
  returning *
  into v_job;

  return next v_job;
end;
$$;

revoke all on function public.retry_canvas_sync_job_v2(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.retry_canvas_sync_job_v2(uuid, uuid, text)
  to service_role;
