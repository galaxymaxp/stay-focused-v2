-- Reuse the existing private Cloud Tasks / Cloud Run delivery path for Canvas.
-- The logical job, checkpoint units, and expiry timer remain in Supabase.
alter table public.canvas_sync_jobs
  add column if not exists google_dispatch_id uuid,
  add column if not exists google_dispatch_key text,
  add column if not exists google_dispatched_at timestamptz,
  add column if not exists google_worker_lease_expires_at timestamptz;

create unique index if not exists canvas_sync_jobs_google_dispatch_unique
  on public.canvas_sync_jobs (google_dispatch_id)
  where google_dispatch_id is not null;

create or replace function public.prepare_canvas_sync_job_google_dispatch_v1(p_job_id uuid)
returns setof public.canvas_sync_jobs
language plpgsql security definer set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
  v_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then return; end if;
  select * into v_job from public.canvas_sync_jobs job where job.id = p_job_id for update;
  if not found then return; end if;
  if v_job.status = 'queued' then
    v_key := coalesce(v_job.retry_idempotency_key, v_job.idempotency_key);
    if v_job.google_dispatch_id is null or v_job.google_dispatch_key is distinct from v_key then
      update public.canvas_sync_jobs job
      set google_dispatch_id = gen_random_uuid(),
          google_dispatch_key = v_key,
          google_dispatched_at = null
      where job.id = p_job_id
      returning * into v_job;
    end if;
  end if;
  return next v_job;
end;
$$;

create or replace function public.mark_canvas_sync_job_google_dispatched_v1(
  p_job_id uuid, p_dispatch_id uuid
)
returns setof public.canvas_sync_jobs
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then return; end if;
  return query
  update public.canvas_sync_jobs job
  set google_dispatched_at = coalesce(job.google_dispatched_at, now())
  where job.id = p_job_id and job.google_dispatch_id = p_dispatch_id
  returning job.*;
end;
$$;

create or replace function public.mark_canvas_sync_job_google_dispatch_failed_v1(
  p_job_id uuid, p_dispatch_id uuid
)
returns setof public.canvas_sync_jobs
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then return; end if;
  return query
  update public.canvas_sync_jobs job
  set status = 'failed', stage = 'complete',
      status_message = 'Synchronization could not be started',
      completed_at = now(), failed_at = now(),
      error_code = 'canvas_sync_google_dispatch_failed',
      safe_error_message = 'Synchronization could not be started. Try again.',
      retryable = true
  where job.id = p_job_id and job.google_dispatch_id = p_dispatch_id
    and job.status = 'queued' and job.worker_id is null
  returning job.*;
end;
$$;

create or replace function public.claim_canvas_sync_job_google_v1(
  p_job_id uuid, p_dispatch_id uuid, p_worker_id text
)
returns setof public.canvas_sync_jobs
language plpgsql security definer set search_path = ''
as $$
declare
  v_worker_id text := nullif(btrim(p_worker_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then return; end if;
  if v_worker_id is null or char_length(v_worker_id) > 240 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_worker_invalid';
  end if;
  return query
  update public.canvas_sync_jobs job
  set status = 'running', stage = 'preparing_course',
      status_message = 'Preparing Canvas course',
      started_at = coalesce(job.started_at, now()),
      worker_id = v_worker_id,
      google_worker_lease_expires_at = now() + interval '90 seconds',
      attempt_count = job.attempt_count + 1,
      retryable = false, error_code = null, safe_error_message = null
  where job.id = p_job_id and job.google_dispatch_id = p_dispatch_id
    and job.deadline_at > now() and job.attempt_count < job.max_attempts
    and (job.status = 'queued' or
      (job.status = 'running' and job.google_worker_lease_expires_at <= now()))
  returning job.*;
end;
$$;

create or replace function public.heartbeat_canvas_sync_job_google_v1(
  p_job_id uuid, p_dispatch_id uuid, p_worker_id text
)
returns setof public.canvas_sync_jobs
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then return; end if;
  return query
  update public.canvas_sync_jobs job
  set google_worker_lease_expires_at = now() + interval '90 seconds'
  where job.id = p_job_id and job.google_dispatch_id = p_dispatch_id
    and job.worker_id = p_worker_id
    and job.status in ('running', 'cancellation_requested')
    and job.google_worker_lease_expires_at > now()
    and job.deadline_at > now()
  returning job.*;
end;
$$;

revoke all on function public.prepare_canvas_sync_job_google_dispatch_v1(uuid) from public, anon, authenticated;
revoke all on function public.mark_canvas_sync_job_google_dispatched_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_canvas_sync_job_google_dispatch_failed_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_canvas_sync_job_google_v1(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.heartbeat_canvas_sync_job_google_v1(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_canvas_sync_job_google_dispatch_v1(uuid) to service_role;
grant execute on function public.mark_canvas_sync_job_google_dispatched_v1(uuid, uuid) to service_role;
grant execute on function public.mark_canvas_sync_job_google_dispatch_failed_v1(uuid, uuid) to service_role;
grant execute on function public.claim_canvas_sync_job_google_v1(uuid, uuid, text) to service_role;
grant execute on function public.heartbeat_canvas_sync_job_google_v1(uuid, uuid, text) to service_role;
