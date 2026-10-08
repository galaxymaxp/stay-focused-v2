-- CLI scaffold moved to this repository's established migrations directory.
-- Additive backend isolation; existing mobile states and completion RPCs stay intact.
alter table public.processing_jobs
  add column google_dispatch_id uuid,
  drop constraint processing_jobs_execution_backend_check,
  drop constraint processing_jobs_workflow_dispatch_check,
  add constraint processing_jobs_execution_backend_check
    check (execution_backend in ('database_worker', 'vercel_workflow', 'google_cloud')),
  add constraint processing_jobs_workflow_dispatch_check check (
    (execution_backend in ('database_worker', 'google_cloud') and workflow_run_id is null and workflow_dispatched_at is null)
    or (execution_backend = 'vercel_workflow' and (
      (workflow_run_id is null and workflow_dispatched_at is null)
      or (workflow_run_id is not null and workflow_dispatched_at is not null and char_length(workflow_run_id) between 8 and 200)
    ))
  ),
  add constraint processing_jobs_google_dispatch_check check (
    (execution_backend = 'google_cloud' and google_dispatch_id is not null)
    or (execution_backend <> 'google_cloud' and google_dispatch_id is null)
  );

create function public.prepare_google_processing_job_v1(p_job_id uuid)
returns setof public.processing_jobs
language plpgsql security invoker set search_path = '' as $$
declare v_job public.processing_jobs%rowtype;
begin
  select * into v_job from public.processing_jobs where id = p_job_id for update;
  if not found then return; end if;
  if (v_job.execution_backend = 'database_worker' and v_job.status = 'queued' and v_job.attempt_count = 0)
    or (v_job.execution_backend = 'google_cloud' and v_job.status = 'failed' and v_job.error_code = 'google_generation_dispatch_failed') then
    update public.processing_jobs set execution_backend = 'google_cloud',
      google_dispatch_id = coalesce(google_dispatch_id, gen_random_uuid()),
      status = 'queued', status_message = 'Waiting to start', failed_at = null,
      error_code = null, safe_error_message = null, retryable = false, updated_at = now()
    where id = p_job_id returning * into v_job;
  end if;
  return next v_job;
end;
$$;

create function public.claim_google_processing_job_v1(
  p_job_id uuid, p_dispatch_id uuid, p_worker_id text, p_now timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql security invoker set search_path = '' as $$
declare v_job public.processing_jobs%rowtype;
begin
  if p_worker_id is null or p_worker_id !~ '^google-cloud:[0-9a-f-]{36}$' then
    raise exception 'google_worker_id_invalid';
  end if;
  select * into v_job from public.processing_jobs
    where id = p_job_id and execution_backend = 'google_cloud'
      and google_dispatch_id = p_dispatch_id for update;
  if not found then return; end if;
  if v_job.status in ('succeeded', 'cancelled', 'expired')
    or (v_job.status = 'failed' and v_job.error_code is distinct from 'google_generation_dispatch_failed') then
    return next v_job; return;
  end if;
  -- A retried delivery must never steal an unexpired lease, even on the same instance.
  if v_job.status in ('running', 'cancellation_requested') and v_job.lease_expires_at > p_now then
    return next v_job; return;
  end if;
  if v_job.status = 'queued' and v_job.next_attempt_at > p_now then
    return next v_job; return;
  end if;
  if v_job.status = 'cancellation_requested' or v_job.expires_at <= p_now or v_job.attempt_count >= v_job.max_attempts then
    update public.processing_jobs set
      status = case when status = 'cancellation_requested' then status else 'running' end,
      lease_owner = p_worker_id, lease_expires_at = p_now + interval '300 seconds'
    where id = p_job_id;
    return query select * from public.fail_processing_job_v2(p_job_id, p_worker_id,
      'google_generation_attempts_exhausted', 'Processing was interrupted. Try again.', true, false, p_now);
    return;
  end if;
  update public.processing_jobs set status = 'running',
    status_message = 'Preparing source', started_at = coalesce(started_at, p_now),
    updated_at = p_now, attempt_count = attempt_count + 1,
    lease_owner = p_worker_id, lease_expires_at = p_now + interval '300 seconds',
    heartbeat_at = p_now, failed_at = null, error_code = null, safe_error_message = null, retryable = false
  where id = p_job_id returning * into v_job;
  return next v_job;
end;
$$;

revoke all on function public.prepare_google_processing_job_v1(uuid) from public, anon, authenticated;
revoke all on function public.claim_google_processing_job_v1(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.prepare_google_processing_job_v1(uuid) to service_role;
grant execute on function public.claim_google_processing_job_v1(uuid, uuid, text, timestamptz) to service_role;
