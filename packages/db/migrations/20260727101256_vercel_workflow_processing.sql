alter table public.processing_jobs
  add column execution_backend text not null default 'database_worker',
  add column workflow_run_id text,
  add column workflow_dispatched_at timestamptz,
  add constraint processing_jobs_execution_backend_check
    check (execution_backend in ('database_worker', 'vercel_workflow')),
  add constraint processing_jobs_workflow_dispatch_check check (
    (
      execution_backend = 'database_worker'
      and workflow_run_id is null
      and workflow_dispatched_at is null
    )
    or (
      execution_backend = 'vercel_workflow'
      and (
        (workflow_run_id is null and workflow_dispatched_at is null)
        or
        (
          workflow_run_id is not null
          and workflow_dispatched_at is not null
          and char_length(workflow_run_id) between 8 and 200
        )
      )
    )
  );

create unique index processing_jobs_workflow_run_unique
  on public.processing_jobs (workflow_run_id)
  where workflow_run_id is not null;

create index processing_jobs_execution_backend_status_idx
  on public.processing_jobs (execution_backend, status, next_attempt_at, created_at);

create table public.processing_job_checkpoints (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.processing_jobs(id) on delete cascade,
  checkpoint_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint processing_job_checkpoints_job_key_unique
    unique (job_id, checkpoint_key),
  constraint processing_job_checkpoints_key_check
    check (char_length(btrim(checkpoint_key)) between 1 and 240),
  constraint processing_job_checkpoints_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

create index processing_job_checkpoints_job_updated_idx
  on public.processing_job_checkpoints (job_id, updated_at desc);

alter table public.processing_job_checkpoints enable row level security;

revoke all on table public.processing_job_checkpoints from anon, authenticated;
grant select, insert, update, delete on table public.processing_job_checkpoints
  to service_role;

create or replace function public.attach_processing_job_workflow_v1(
  p_job_id uuid,
  p_workflow_run_id text,
  p_dispatched_at timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.processing_jobs%rowtype;
begin
  p_workflow_run_id := nullif(btrim(p_workflow_run_id), '');
  if p_workflow_run_id is null
    or char_length(p_workflow_run_id) < 8
    or char_length(p_workflow_run_id) > 200
  then
    raise exception using
      errcode = 'P0001',
      message = 'processing_workflow_run_id_invalid';
  end if;

  update public.processing_jobs job
  set
    execution_backend = 'vercel_workflow',
    workflow_run_id = coalesce(job.workflow_run_id, p_workflow_run_id),
    workflow_dispatched_at = coalesce(job.workflow_dispatched_at, p_dispatched_at),
    updated_at = p_dispatched_at
  where job.id = p_job_id
    and (
      job.workflow_run_id is null
      or job.workflow_run_id = p_workflow_run_id
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

create or replace function public.claim_processing_job_by_id_v1(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 300,
  p_now timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.processing_jobs%rowtype;
begin
  if nullif(btrim(p_worker_id), '') is null then
    raise exception using
      errcode = 'P0001',
      message = 'processing_worker_id_invalid';
  end if;
  if p_lease_seconds < 30 or p_lease_seconds > 900 then
    raise exception using
      errcode = 'P0001',
      message = 'processing_worker_lease_invalid';
  end if;

  update public.processing_jobs job
  set
    status = 'running',
    status_message = case
      when job.job_type = 'document_extraction' then 'Inspecting document'
      else 'Preparing source'
    end,
    accepted_at = coalesce(job.accepted_at, p_now),
    started_at = coalesce(job.started_at, p_now),
    updated_at = p_now,
    attempt_count = job.attempt_count + 1,
    lease_owner = p_worker_id,
    lease_expires_at = p_now + make_interval(secs => p_lease_seconds),
    heartbeat_at = p_now,
    error_code = null,
    safe_error_message = null,
    retryable = false
  where job.id = p_job_id
    and job.execution_backend = 'vercel_workflow'
    and job.status = 'queued'
    and job.next_attempt_at <= p_now
    and job.attempt_count < job.max_attempts
  returning * into v_job;

  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.mark_processing_job_dispatch_failed_v1(
  p_job_id uuid,
  p_failed_at timestamptz default now()
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
    status = 'failed',
    status_message = 'Needs attention',
    failed_at = p_failed_at,
    updated_at = p_failed_at,
    error_code = 'processing_workflow_dispatch_failed',
    safe_error_message = 'Processing could not be started. Try again.',
    retryable = true,
    lease_owner = null,
    lease_expires_at = null,
    heartbeat_at = null
  where job.id = p_job_id
    and job.status = 'queued'
    and job.workflow_run_id is null
  returning * into v_job;

  if found then
    return next v_job;
  end if;
end;
$$;

-- The polling worker remains available for local development and Railway, but
-- it must never race a Vercel Workflow for ownership of the same queued job.
create or replace function public.claim_processing_jobs_v2(
  p_worker_id text,
  p_job_types text[],
  p_limit integer default 1,
  p_lease_seconds integer default 90,
  p_now timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_per_user_limit integer;
begin
  if nullif(btrim(p_worker_id), '') is null
    or char_length(p_worker_id) > 160
    or p_limit not between 1 and 20
    or p_lease_seconds not between 30 and 900
    or p_job_types is null
    or cardinality(p_job_types) = 0 then
    raise exception using errcode = 'P0001', message = 'processing_job_claim_invalid';
  end if;

  select max_running_jobs_per_user into strict v_per_user_limit
  from public.processing_policy_config
  where id = 'default';

  return query
  with running_by_user as (
    select job.user_id, count(*)::integer as running_count
    from public.processing_jobs job
    where job.status in ('running', 'cancellation_requested')
      and job.lease_expires_at > p_now
    group by job.user_id
  ),
  ranked as (
    select
      job.id,
      job.user_id,
      job.next_attempt_at,
      job.priority_class,
      job.created_at,
      row_number() over (
        partition by job.user_id
        order by job.next_attempt_at, job.priority_class, job.created_at, job.id
      ) as user_rank,
      row_number() over (
        partition by job.job_type
        order by job.next_attempt_at, job.priority_class, job.created_at, job.id
      ) as type_rank,
      coalesce(running.running_count, 0) as running_count
    from public.processing_jobs job
    left join running_by_user running on running.user_id = job.user_id
    where job.execution_backend = 'database_worker'
      and job.status = 'queued'
      and job.job_type = any(p_job_types)
      and job.scheduled_for <= p_now
      and job.next_attempt_at <= p_now
      and job.expires_at > p_now
      and job.attempt_count < job.max_attempts
  ),
  candidates as (
    select job.id
    from public.processing_jobs job
    join ranked on ranked.id = job.id
    where ranked.user_rank <= greatest(0, v_per_user_limit - ranked.running_count)
    order by
      ranked.type_rank,
      ranked.next_attempt_at,
      ranked.priority_class,
      ranked.created_at,
      job.id
    for update of job skip locked
    limit p_limit
  )
  update public.processing_jobs job
  set
    status = 'running',
    started_at = coalesce(job.started_at, p_now),
    attempt_count = job.attempt_count + 1,
    lease_owner = p_worker_id,
    lease_expires_at = p_now + make_interval(secs => p_lease_seconds),
    heartbeat_at = p_now,
    error_code = null,
    safe_error_message = null,
    retryable = false
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

-- Stale polling-worker recovery is intentionally scoped to its own backend.
-- Vercel Workflow owns retries and replay for workflow-backed jobs.
create or replace function public.recover_stale_processing_jobs(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_changed integer := 0;
begin
  with cancelled as (
    update public.processing_jobs job
    set
      status = 'cancelled',
      status_message = 'Cancelled',
      lease_owner = null,
      lease_expires_at = null,
      retryable = false
    where job.execution_backend = 'database_worker'
      and job.status = 'cancellation_requested'
      and job.lease_expires_at <= p_now
    returning job.id, job.user_id
  )
  insert into public.processing_job_events (job_id, user_id, event_type)
  select id, user_id, 'job_cancelled' from cancelled;
  get diagnostics v_changed = row_count;
  v_count := v_count + v_changed;

  with exhausted as (
    update public.processing_jobs job
    set
      status = 'failed',
      status_message = 'Needs attention',
      failed_at = p_now,
      error_code = 'worker_lease_exhausted',
      safe_error_message = 'Processing stopped after repeated worker interruptions.',
      retryable = true,
      lease_owner = null,
      lease_expires_at = null
    where job.execution_backend = 'database_worker'
      and job.status = 'running'
      and job.lease_expires_at <= p_now
      and job.attempt_count >= job.max_attempts
    returning job.id, job.user_id
  )
  insert into public.processing_job_events (job_id, user_id, event_type, payload)
  select
    id,
    user_id,
    'job_failed',
    jsonb_build_object('errorCode', 'worker_lease_exhausted', 'retryable', true)
  from exhausted;
  get diagnostics v_changed = row_count;
  v_count := v_count + v_changed;

  update public.processing_jobs job
  set
    status = 'queued',
    status_message = 'Waiting to retry',
    next_attempt_at = p_now + interval '5 seconds',
    error_code = 'worker_lease_lost',
    safe_error_message = 'Processing is recovering from an interrupted worker.',
    retryable = true,
    lease_owner = null,
    lease_expires_at = null
  where job.execution_backend = 'database_worker'
    and job.status = 'running'
    and job.lease_expires_at <= p_now
    and job.attempt_count < job.max_attempts;
  get diagnostics v_changed = row_count;
  v_count := v_count + v_changed;

  with expired as (
    update public.processing_jobs job
    set
      status = 'expired',
      status_message = 'Needs attention',
      failed_at = p_now,
      error_code = 'job_deadline_exceeded',
      safe_error_message = 'Processing did not finish before its deadline.',
      retryable = true,
      lease_owner = null,
      lease_expires_at = null
    where job.execution_backend = 'database_worker'
      and job.status in ('queued', 'running')
      and job.expires_at <= p_now
    returning job.id, job.user_id
  )
  insert into public.processing_job_events (job_id, user_id, event_type, payload)
  select
    id,
    user_id,
    'job_expired',
    jsonb_build_object('errorCode', 'job_deadline_exceeded')
  from expired;
  get diagnostics v_changed = row_count;
  v_count := v_count + v_changed;

  return v_count;
end;
$$;

revoke all on function public.attach_processing_job_workflow_v1(
  uuid, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.attach_processing_job_workflow_v1(
  uuid, text, timestamptz
) to service_role;

revoke all on function public.prepare_processing_job_workflow_dispatch_v1(
  uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.prepare_processing_job_workflow_dispatch_v1(
  uuid, timestamptz
) to service_role;

revoke all on function public.claim_processing_job_by_id_v1(
  uuid, text, integer, timestamptz
) from public, anon, authenticated;
grant execute on function public.claim_processing_job_by_id_v1(
  uuid, text, integer, timestamptz
) to service_role;

revoke all on function public.mark_processing_job_dispatch_failed_v1(
  uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.mark_processing_job_dispatch_failed_v1(
  uuid, timestamptz
) to service_role;
