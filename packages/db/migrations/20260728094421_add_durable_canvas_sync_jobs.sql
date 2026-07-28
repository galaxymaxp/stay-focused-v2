create table public.canvas_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  job_type text not null,
  status text not null default 'queued',
  stage text not null default 'waiting_to_start',
  status_message text not null default 'Waiting to start',
  completed_units integer,
  total_units integer,
  unit_label text,
  source_metadata jsonb not null default '{}'::jsonb,
  result_summary jsonb,
  idempotency_key text not null,
  request_fingerprint text not null,
  idempotency_expires_at timestamptz not null default (now() + interval '30 days'),
  workflow_run_id text,
  workflow_dispatched_at timestamptz,
  worker_id text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  cancellation_requested_at timestamptz,
  error_code text,
  safe_error_message text,
  retryable boolean not null default false,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  retry_of_job_id uuid,
  constraint canvas_sync_jobs_owner_unique unique (id, user_id),
  constraint canvas_sync_jobs_idempotency_unique unique (user_id, idempotency_key),
  constraint canvas_sync_jobs_connection_owner_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_sync_jobs_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_sync_jobs_retry_parent_fkey
    foreign key (retry_of_job_id)
    references public.canvas_sync_jobs (id)
    on delete set null,
  constraint canvas_sync_jobs_type_allowed
    check (job_type in ('course_content', 'course_grades')),
  constraint canvas_sync_jobs_status_allowed
    check (
      status in (
        'queued',
        'running',
        'succeeded',
        'failed',
        'cancellation_requested',
        'cancelled',
        'expired'
      )
    ),
  constraint canvas_sync_jobs_stage_allowed
    check (
      stage in (
        'waiting_to_start',
        'preparing_course',
        'synchronizing_content',
        'synchronizing_grades',
        'storing_result',
        'complete'
      )
    ),
  constraint canvas_sync_jobs_stage_matches_type
    check (
      stage in ('waiting_to_start', 'preparing_course', 'storing_result', 'complete')
      or (job_type = 'course_content' and stage = 'synchronizing_content')
      or (job_type = 'course_grades' and stage = 'synchronizing_grades')
    ),
  constraint canvas_sync_jobs_status_message_safe
    check (char_length(btrim(status_message)) between 1 and 240),
  constraint canvas_sync_jobs_progress_consistent
    check (
      (completed_units is null and total_units is null and unit_label is null)
      or (
        completed_units is not null
        and total_units is not null
        and unit_label = 'operations'
        and completed_units >= 0
        and total_units >= 0
        and completed_units <= total_units
      )
    ),
  constraint canvas_sync_jobs_source_metadata_object
    check (jsonb_typeof(source_metadata) = 'object'),
  constraint canvas_sync_jobs_result_summary_object
    check (result_summary is null or jsonb_typeof(result_summary) = 'object'),
  constraint canvas_sync_jobs_idempotency_key_safe
    check (char_length(idempotency_key) between 8 and 200),
  constraint canvas_sync_jobs_request_fingerprint_safe
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint canvas_sync_jobs_workflow_run_safe
    check (
      workflow_run_id is null
      or char_length(btrim(workflow_run_id)) between 8 and 240
    ),
  constraint canvas_sync_jobs_attempts_valid
    check (attempt_count >= 0 and max_attempts between 1 and 10),
  constraint canvas_sync_jobs_error_code_safe
    check (
      error_code is null
      or (
        error_code ~ '^[a-z0-9_]+$'
        and char_length(error_code) <= 80
      )
    ),
  constraint canvas_sync_jobs_error_message_safe
    check (
      safe_error_message is null
      or char_length(safe_error_message) <= 300
    ),
  constraint canvas_sync_jobs_terminal_consistency
    check (
      (
        status in ('queued', 'running', 'cancellation_requested')
        and completed_at is null
      )
      or (
        status in ('succeeded', 'failed', 'cancelled', 'expired')
        and completed_at is not null
      )
    ),
  constraint canvas_sync_jobs_result_consistency
    check (
      (status = 'succeeded' and result_summary is not null)
      or (status <> 'succeeded' and result_summary is null)
    )
);

create unique index canvas_sync_jobs_workflow_run_unique
  on public.canvas_sync_jobs (workflow_run_id)
  where workflow_run_id is not null;

create unique index canvas_sync_jobs_one_active_per_course_type
  on public.canvas_sync_jobs (user_id, course_id, job_type)
  where status in ('queued', 'running', 'cancellation_requested');

create index canvas_sync_jobs_user_updated_idx
  on public.canvas_sync_jobs (user_id, updated_at desc);

create index canvas_sync_jobs_status_updated_idx
  on public.canvas_sync_jobs (status, updated_at);

create or replace function public.set_canvas_sync_jobs_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger canvas_sync_jobs_set_updated_at
before update on public.canvas_sync_jobs
for each row
execute function public.set_canvas_sync_jobs_updated_at();

alter table public.canvas_sync_jobs enable row level security;

revoke all on table public.canvas_sync_jobs from public;
revoke all on table public.canvas_sync_jobs from anon;
revoke all on table public.canvas_sync_jobs from authenticated;
grant select on table public.canvas_sync_jobs to authenticated;
grant select, insert, update, delete on table public.canvas_sync_jobs to service_role;

create policy canvas_sync_jobs_select_own
on public.canvas_sync_jobs
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.create_canvas_sync_job_v1(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_course_id uuid,
  p_job_type text,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_source_metadata jsonb
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.canvas_sync_jobs%rowtype;
  v_job public.canvas_sync_jobs%rowtype;
begin
  p_job_type := nullif(btrim(p_job_type), '');
  p_idempotency_key := nullif(btrim(p_idempotency_key), '');
  p_request_fingerprint := nullif(btrim(p_request_fingerprint), '');

  if p_user_id is null
    or p_canvas_connection_id is null
    or p_course_id is null
    or p_job_type not in ('course_content', 'course_grades')
    or p_idempotency_key is null
    or char_length(p_idempotency_key) not between 8 and 200
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_source_metadata) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'canvas_sync_job_invalid';
  end if;

  select *
  into v_existing
  from public.canvas_sync_jobs job
  where job.user_id = p_user_id
    and job.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.canvas_connection_id is distinct from p_canvas_connection_id
      or v_existing.course_id is distinct from p_course_id
      or v_existing.job_type is distinct from p_job_type
      or v_existing.request_fingerprint is distinct from p_request_fingerprint then
      raise exception using errcode = 'P0001', message = 'canvas_sync_job_idempotency_conflict';
    end if;
    return next v_existing;
    return;
  end if;

  perform 1
  from public.canvas_courses course
  join public.canvas_connections connection
    on connection.id = course.canvas_connection_id
    and connection.user_id = course.user_id
  join public.canvas_course_sync_preferences preference
    on preference.course_id = course.id
    and preference.canvas_connection_id = course.canvas_connection_id
    and preference.user_id = course.user_id
    and preference.selected
  where course.id = p_course_id
    and course.canvas_connection_id = p_canvas_connection_id
    and course.user_id = p_user_id
    and connection.status = 'active';

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_sync_job_course_not_selected';
  end if;

  begin
    insert into public.canvas_sync_jobs (
      user_id,
      canvas_connection_id,
      course_id,
      job_type,
      status,
      stage,
      status_message,
      completed_units,
      total_units,
      unit_label,
      source_metadata,
      idempotency_key,
      request_fingerprint
    )
    values (
      p_user_id,
      p_canvas_connection_id,
      p_course_id,
      p_job_type,
      'queued',
      'waiting_to_start',
      'Waiting to start',
      0,
      1,
      'operations',
      p_source_metadata,
      p_idempotency_key,
      p_request_fingerprint
    )
    returning *
    into v_job;
  exception
    when unique_violation then
      select *
      into v_existing
      from public.canvas_sync_jobs job
      where job.user_id = p_user_id
        and job.idempotency_key = p_idempotency_key;
      if found
        and v_existing.canvas_connection_id = p_canvas_connection_id
        and v_existing.course_id = p_course_id
        and v_existing.job_type = p_job_type
        and v_existing.request_fingerprint = p_request_fingerprint then
        return next v_existing;
        return;
      end if;
      raise exception using errcode = 'P0001', message = 'canvas_sync_job_in_progress';
  end;

  return next v_job;
end;
$$;

create or replace function public.prepare_canvas_sync_job_workflow_dispatch_v1(
  p_job_id uuid
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
  for update;

  if not found then
    return;
  end if;

  if v_job.status = 'failed'
    and v_job.error_code = 'canvas_sync_workflow_dispatch_failed'
    and v_job.retryable
    and v_job.workflow_run_id is null
    and v_job.attempt_count < v_job.max_attempts then
    update public.canvas_sync_jobs job
    set
      status = 'queued',
      stage = 'waiting_to_start',
      status_message = 'Waiting to start',
      completed_at = null,
      failed_at = null,
      error_code = null,
      safe_error_message = null,
      retryable = false
    where job.id = p_job_id
    returning *
    into v_job;
  end if;

  return next v_job;
end;
$$;

create or replace function public.attach_canvas_sync_job_workflow_v1(
  p_job_id uuid,
  p_workflow_run_id text
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
  v_run_id text := nullif(btrim(p_workflow_run_id), '');
begin
  if v_run_id is null or char_length(v_run_id) > 240 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_workflow_run_invalid';
  end if;

  update public.canvas_sync_jobs job
  set
    workflow_run_id = coalesce(job.workflow_run_id, v_run_id),
    workflow_dispatched_at = coalesce(job.workflow_dispatched_at, now())
  where job.id = p_job_id
    and job.status in ('queued', 'running', 'cancellation_requested')
    and (job.workflow_run_id is null or job.workflow_run_id = v_run_id)
  returning *
  into v_job;

  if found then
    return next v_job;
  end if;

  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.workflow_run_id = v_run_id;
  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.mark_canvas_sync_job_dispatch_failed_v1(
  p_job_id uuid
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  update public.canvas_sync_jobs job
  set
    status = 'failed',
    stage = 'complete',
    status_message = 'Synchronization could not be started',
    completed_at = now(),
    failed_at = now(),
    error_code = 'canvas_sync_workflow_dispatch_failed',
    safe_error_message = 'Synchronization could not be started. Try again.',
    retryable = true
  where job.id = p_job_id
    and job.status = 'queued'
    and job.workflow_run_id is null
  returning *
  into v_job;

  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.claim_canvas_sync_job_v1(
  p_job_id uuid,
  p_worker_id text
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
  v_worker_id text := nullif(btrim(p_worker_id), '');
begin
  if v_worker_id is null or char_length(v_worker_id) > 240 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_worker_invalid';
  end if;

  update public.canvas_sync_jobs job
  set
    status = 'running',
    stage = 'preparing_course',
    status_message = 'Preparing Canvas course',
    started_at = coalesce(job.started_at, now()),
    worker_id = v_worker_id,
    attempt_count = job.attempt_count + 1,
    retryable = false,
    error_code = null,
    safe_error_message = null
  where job.id = p_job_id
    and job.status = 'queued'
    and job.workflow_run_id is not null
    and job.attempt_count < job.max_attempts
  returning *
  into v_job;

  if found then
    return next v_job;
    return;
  end if;

  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.status in ('running', 'cancellation_requested')
    and job.worker_id = v_worker_id;
  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.update_canvas_sync_job_progress_v1(
  p_job_id uuid,
  p_worker_id text,
  p_stage text,
  p_status_message text,
  p_completed_units integer,
  p_total_units integer
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  update public.canvas_sync_jobs job
  set
    stage = p_stage,
    status_message = left(btrim(p_status_message), 240),
    completed_units = p_completed_units,
    total_units = p_total_units,
    unit_label = 'operations'
  where job.id = p_job_id
    and job.status = 'running'
    and job.worker_id = p_worker_id
  returning *
  into v_job;
  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.complete_canvas_sync_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_result_summary jsonb
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  if jsonb_typeof(p_result_summary) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'canvas_sync_result_invalid';
  end if;

  update public.canvas_sync_jobs job
  set
    status = case
      when job.status = 'cancellation_requested' then 'cancelled'
      else 'succeeded'
    end,
    stage = 'complete',
    status_message = case
      when job.status = 'cancellation_requested' then 'Cancelled'
      when p_result_summary ->> 'outcome' = 'partial' then 'Complete with warnings'
      else 'Complete'
    end,
    completed_units = case
      when job.status = 'cancellation_requested' then job.completed_units
      else 1
    end,
    completed_at = now(),
    result_summary = case
      when job.status = 'cancellation_requested' then null
      else p_result_summary
    end,
    retryable = false,
    error_code = null,
    safe_error_message = null,
    worker_id = null
  where job.id = p_job_id
    and job.status in ('running', 'cancellation_requested')
    and job.worker_id = p_worker_id
  returning *
  into v_job;

  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.fail_canvas_sync_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_safe_error_message text,
  p_retryable boolean
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  update public.canvas_sync_jobs job
  set
    status = case
      when job.status = 'cancellation_requested' then 'cancelled'
      else 'failed'
    end,
    stage = 'complete',
    status_message = case
      when job.status = 'cancellation_requested' then 'Cancelled'
      else 'Synchronization needs attention'
    end,
    completed_at = now(),
    failed_at = case
      when job.status = 'cancellation_requested' then null
      else now()
    end,
    error_code = case
      when job.status = 'cancellation_requested' then null
      else left(btrim(p_error_code), 80)
    end,
    safe_error_message = case
      when job.status = 'cancellation_requested' then null
      else left(btrim(p_safe_error_message), 300)
    end,
    retryable = case
      when job.status = 'cancellation_requested' then false
      else coalesce(p_retryable, false)
    end,
    worker_id = null
  where job.id = p_job_id
    and job.status in ('running', 'cancellation_requested')
    and job.worker_id = p_worker_id
  returning *
  into v_job;

  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.request_canvas_sync_job_cancellation_v1(
  p_user_id uuid,
  p_job_id uuid
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  update public.canvas_sync_jobs job
  set
    status = case when job.status = 'queued' then 'cancelled'
      else 'cancellation_requested' end,
    stage = case when job.status = 'queued' then 'complete' else job.stage end,
    status_message = case when job.status = 'queued' then 'Cancelled'
      else 'Cancellation requested' end,
    cancellation_requested_at = coalesce(job.cancellation_requested_at, now()),
    completed_at = case when job.status = 'queued' then now()
      else job.completed_at end,
    retryable = false
  where job.id = p_job_id
    and job.user_id = p_user_id
    and job.status in ('queued', 'running')
  returning *
  into v_job;

  if found then
    return next v_job;
    return;
  end if;

  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.user_id = p_user_id;
  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.retry_canvas_sync_job_v1(
  p_user_id uuid,
  p_job_id uuid
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  update public.canvas_sync_jobs job
  set
    status = 'queued',
    stage = 'waiting_to_start',
    status_message = 'Waiting to retry',
    completed_units = 0,
    total_units = 1,
    unit_label = 'operations',
    result_summary = null,
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
    and job.user_id = p_user_id
    and job.status = 'failed'
    and job.retryable
    and job.attempt_count < job.max_attempts
  returning *
  into v_job;

  if found then
    return next v_job;
  end if;
end;
$$;

create or replace function public.recover_stale_canvas_sync_operation_v1(
  p_job_id uuid,
  p_worker_id text,
  p_stale_after_seconds integer default 300
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
  v_recovered integer := 0;
  v_updated integer := 0;
  v_stale_before timestamptz;
begin
  if p_stale_after_seconds is null
    or p_stale_after_seconds < 60
    or p_stale_after_seconds > 1800 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_stale_window_invalid';
  end if;

  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.status in ('running', 'cancellation_requested')
    and job.worker_id = p_worker_id;

  if not found then
    return 0;
  end if;

  v_stale_before := now() - make_interval(secs => p_stale_after_seconds);

  if v_job.job_type = 'course_content' then
    update public.canvas_sync_runs run
    set
      status = 'failed',
      completed_at = now(),
      heartbeat_at = now(),
      failure_code = 'stale_sync_recovered',
      failure_summary = 'Previous course synchronization run expired before completion.'
    where run.user_id = v_job.user_id
      and run.canvas_connection_id = v_job.canvas_connection_id
      and run.scope_course_id = v_job.course_id
      and run.status = 'running'
      and run.heartbeat_at < v_stale_before;
    get diagnostics v_recovered = row_count;
  else
    update public.canvas_course_grade_sync_states state
    set
      sync_status = 'failed',
      last_checked_at = now(),
      last_completed_at = now(),
      last_completed_snapshot_authoritative = false,
      consecutive_failure_count = state.consecutive_failure_count + 1,
      last_failure_code = 'stale_sync_recovered',
      last_failure_category = 'partial_sync',
      assignment_family_state = 'failed',
      submission_family_state = 'failed',
      course_grade_summary_family_state = 'failed'
    where state.user_id = v_job.user_id
      and state.canvas_connection_id = v_job.canvas_connection_id
      and state.course_id = v_job.course_id
      and state.sync_status = 'running'
      and coalesce(state.last_checked_at, state.created_at) < v_stale_before;
    get diagnostics v_updated = row_count;
    v_recovered := v_updated;
  end if;

  return v_recovered;
end;
$$;

revoke all on function public.set_canvas_sync_jobs_updated_at() from public, anon, authenticated;
grant execute on function public.set_canvas_sync_jobs_updated_at() to service_role;

revoke all on function public.create_canvas_sync_job_v1(
  uuid, uuid, uuid, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.create_canvas_sync_job_v1(
  uuid, uuid, uuid, text, text, text, jsonb
) to service_role;

revoke all on function public.prepare_canvas_sync_job_workflow_dispatch_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_canvas_sync_job_workflow_dispatch_v1(uuid)
  to service_role;

revoke all on function public.attach_canvas_sync_job_workflow_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.attach_canvas_sync_job_workflow_v1(uuid, text)
  to service_role;

revoke all on function public.mark_canvas_sync_job_dispatch_failed_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.mark_canvas_sync_job_dispatch_failed_v1(uuid)
  to service_role;

revoke all on function public.claim_canvas_sync_job_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_canvas_sync_job_v1(uuid, text)
  to service_role;

revoke all on function public.update_canvas_sync_job_progress_v1(
  uuid, text, text, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.update_canvas_sync_job_progress_v1(
  uuid, text, text, text, integer, integer
) to service_role;

revoke all on function public.complete_canvas_sync_job_v1(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_canvas_sync_job_v1(uuid, text, jsonb)
  to service_role;

revoke all on function public.fail_canvas_sync_job_v1(
  uuid, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.fail_canvas_sync_job_v1(
  uuid, text, text, text, boolean
) to service_role;

revoke all on function public.request_canvas_sync_job_cancellation_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.request_canvas_sync_job_cancellation_v1(uuid, uuid)
  to service_role;

revoke all on function public.retry_canvas_sync_job_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.retry_canvas_sync_job_v1(uuid, uuid)
  to service_role;

revoke all on function public.recover_stale_canvas_sync_operation_v1(
  uuid, text, integer
) from public, anon, authenticated;
grant execute on function public.recover_stale_canvas_sync_operation_v1(
  uuid, text, integer
) to service_role;
