-- A workflow can be accepted while its queue is unavailable. Its database job
-- must still become terminal after the existing 30-minute deadline, even when
-- the mobile app is closed and no workflow step ever runs.
create or replace function public.expire_overdue_canvas_sync_jobs_v1(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_expiry_limit_invalid';
  end if;

  with overdue as (
    select job.id
    from public.canvas_sync_jobs job
    where job.status in ('queued', 'running', 'cancellation_requested')
      and coalesce(job.deadline_at, job.accepted_at + interval '30 minutes') <= now()
    order by job.deadline_at nulls last, job.accepted_at
    limit p_limit
    for update skip locked
  ), expired as (
    update public.canvas_sync_jobs job
    set status = case when job.status = 'cancellation_requested' then 'cancelled' else 'expired' end,
        stage = 'complete',
        status_message = case when job.status = 'cancellation_requested' then 'Cancelled' else 'Synchronization timed out' end,
        completed_at = now(),
        failed_at = case when job.status = 'cancellation_requested' then null else now() end,
        updated_at = now(),
        worker_id = null,
        error_code = case when job.status = 'cancellation_requested' then null else 'canvas_sync_deadline_exceeded' end,
        safe_error_message = case when job.status = 'cancellation_requested' then null else 'Canvas synchronization took too long. Please try again later.' end,
        retryable = job.status <> 'cancellation_requested'
    from overdue
    where job.id = overdue.id
    returning job.id
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$;

revoke all on function public.expire_overdue_canvas_sync_jobs_v1(integer) from public, anon, authenticated;
grant execute on function public.expire_overdue_canvas_sync_jobs_v1(integer) to service_role;

create extension if not exists pg_cron;
select cron.schedule(
  'stay-focused-expire-canvas-sync-jobs',
  '* * * * *',
  $cron$select public.expire_overdue_canvas_sync_jobs_v1(100);$cron$
);
