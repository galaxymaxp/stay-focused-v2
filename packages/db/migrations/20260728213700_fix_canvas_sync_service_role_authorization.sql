-- Forward repair for databases that already applied the first Phase 5F.2
-- migration. API routes verify the bearer token and then use a server-only
-- Supabase service client, so authorization must use Supabase's JWT role
-- helper rather than the legacy per-claim GUC.

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
set search_path = ''
as $$
declare
  v_existing public.canvas_sync_jobs%rowtype;
  v_job public.canvas_sync_jobs%rowtype;
begin
  if auth.uid() is distinct from p_user_id
    and coalesce(auth.role(), '') <> 'service_role' then
    return;
  end if;

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
      progress_total_known,
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
      null,
      false,
      'operations',
      p_source_metadata,
      p_idempotency_key,
      p_request_fingerprint
    )
    returning * into v_job;
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

create or replace function public.request_canvas_sync_job_cancellation_v1(
  p_user_id uuid,
  p_job_id uuid
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  if auth.uid() is distinct from p_user_id
    and coalesce(auth.role(), '') <> 'service_role' then
    return;
  end if;

  update public.canvas_sync_jobs job
  set
    status = case
      when job.status = 'queued' then 'cancelled'
      else 'cancellation_requested'
    end,
    stage = case when job.status = 'queued' then 'complete' else job.stage end,
    status_message = case
      when job.status = 'queued' then 'Cancelled'
      else 'Cancellation requested'
    end,
    cancellation_requested_at = coalesce(job.cancellation_requested_at, now()),
    completed_at = case
      when job.status = 'queued' then now()
      else job.completed_at
    end,
    retryable = false
  where job.id = p_job_id
    and job.user_id = p_user_id
    and (
      job.status = 'queued'
      or (
        job.status = 'running'
        and job.stage not in ('promoting_scopes', 'storing_result', 'complete')
      )
    )
  returning * into v_job;

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

create or replace function public.retry_canvas_sync_job_v2(
  p_user_id uuid,
  p_job_id uuid,
  p_idempotency_key text
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
  v_key text := nullif(btrim(p_idempotency_key), '');
  v_staging_expired boolean;
begin
  if auth.uid() is distinct from p_user_id
    and coalesce(auth.role(), '') <> 'service_role' then
    return;
  end if;

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

  select exists (
    select 1
    from public.canvas_sync_job_staging stage
    where stage.job_id = p_job_id
      and stage.expires_at <= now()
  ) or exists (
    select 1
    from public.canvas_sync_job_units unit
    where unit.job_id = p_job_id
      and unit.status = 'succeeded'
      and not exists (
        select 1
        from public.canvas_sync_job_staging stage
        where stage.unit_id = unit.id
          and stage.expires_at > now()
      )
  )
  into v_staging_expired;

  if v_staging_expired or v_job.checkpoint_version = 'expired' then
    delete from public.canvas_sync_job_staging stage where stage.job_id = p_job_id;
    delete from public.canvas_sync_job_units unit where unit.job_id = p_job_id;
  else
    update public.canvas_sync_job_units unit
    set
      status = 'queued',
      attempt_count = 0,
      available_at = now(),
      lease_owner = null,
      lease_expires_at = null,
      safe_error_code = null,
      safe_error_message = null,
      retryable = false,
      completed_at = null
    where unit.job_id = p_job_id
      and unit.status in ('failed', 'cancelled', 'retry_wait', 'running');
  end if;

  update public.canvas_sync_jobs job
  set
    status = 'queued',
    stage = 'waiting_to_start',
    status_message = 'Waiting to retry',
    completed_units = (
      select count(*)::integer
      from public.canvas_sync_job_units unit
      where unit.job_id = p_job_id
        and unit.status in ('succeeded', 'skipped')
    ),
    total_units = null,
    progress_total_known = false,
    unit_label = 'operations',
    result_summary = null,
    result_outcome = null,
    retry_idempotency_key = v_key,
    workflow_run_id = null,
    workflow_dispatched_at = null,
    worker_id = null,
    accepted_at = now(),
    started_at = null,
    deadline_at = now() + interval '30 minutes',
    completed_at = null,
    failed_at = null,
    cancellation_requested_at = null,
    error_code = null,
    safe_error_message = null,
    retryable = false
  where job.id = p_job_id
  returning * into v_job;

  return next v_job;
end;
$$;

revoke all on function public.create_canvas_sync_job_v1(
  uuid, uuid, uuid, text, text, text, jsonb
) from public, anon;
grant execute on function public.create_canvas_sync_job_v1(
  uuid, uuid, uuid, text, text, text, jsonb
) to authenticated, service_role;

revoke all on function public.request_canvas_sync_job_cancellation_v1(
  uuid, uuid
) from public, anon;
grant execute on function public.request_canvas_sync_job_cancellation_v1(
  uuid, uuid
) to authenticated, service_role;

revoke all on function public.retry_canvas_sync_job_v2(
  uuid, uuid, text
) from public, anon;
grant execute on function public.retry_canvas_sync_job_v2(
  uuid, uuid, text
) to authenticated, service_role;
