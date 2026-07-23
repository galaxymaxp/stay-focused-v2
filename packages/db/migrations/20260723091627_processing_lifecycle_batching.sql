create or replace function public.run_processing_lifecycle_cleanup(
  p_now timestamptz default now(),
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.processing_policy_config%rowtype;
  v_eligible_events integer;
  v_eligible_failed_jobs integer;
  v_eligible_completed_jobs integer;
  v_deleted_events integer := 0;
  v_deleted_failed_jobs integer := 0;
  v_deleted_completed_jobs integer := 0;
  v_deleted_orphan_snapshots integer := 0;
begin
  select * into strict v_policy
  from public.processing_policy_config
  where id = 'default';

  select count(*) into v_eligible_events
  from public.processing_job_events as event
  where event.created_at <
      p_now - make_interval(days => v_policy.event_retention_days)
    and (
      event.delivered_at is not null
      or event.delivery_eligible = false
      or event.created_at <
        p_now - make_interval(days => v_policy.event_retention_days * 2)
    );

  select count(*) into v_eligible_failed_jobs
  from public.processing_jobs as job
  where job.status in ('failed', 'cancelled', 'expired')
    and job.updated_at <
      p_now - make_interval(days => v_policy.failed_job_retention_days)
    and job.idempotency_expires_at < p_now;

  select count(*) into v_eligible_completed_jobs
  from public.processing_jobs as job
  where job.status = 'succeeded'
    and job.completed_at <
      p_now - make_interval(days => v_policy.completed_job_retention_days)
    and job.idempotency_expires_at < p_now;

  if not p_dry_run then
    with candidates as (
      select event.id
      from public.processing_job_events as event
      where event.created_at <
          p_now - make_interval(days => v_policy.event_retention_days)
        and (
          event.delivered_at is not null
          or event.delivery_eligible = false
          or event.created_at <
            p_now - make_interval(days => v_policy.event_retention_days * 2)
        )
      order by event.created_at, event.id
      limit 500
      for update skip locked
    )
    delete from public.processing_job_events as event
    using candidates
    where event.id = candidates.id;
    get diagnostics v_deleted_events = row_count;

    with candidates as (
      select job.id
      from public.processing_jobs as job
      where job.status in ('failed', 'cancelled', 'expired')
        and job.updated_at <
          p_now - make_interval(days => v_policy.failed_job_retention_days)
        and job.idempotency_expires_at < p_now
      order by job.updated_at, job.id
      limit 100
      for update skip locked
    )
    delete from public.processing_jobs as job
    using candidates
    where job.id = candidates.id;
    get diagnostics v_deleted_failed_jobs = row_count;

    with candidates as (
      select job.id
      from public.processing_jobs as job
      where job.status = 'succeeded'
        and job.completed_at <
          p_now - make_interval(days => v_policy.completed_job_retention_days)
        and job.idempotency_expires_at < p_now
      order by job.completed_at, job.id
      limit 100
      for update skip locked
    )
    delete from public.processing_jobs as job
    using candidates
    where job.id = candidates.id;
    get diagnostics v_deleted_completed_jobs = row_count;

    with candidates as (
      select source.id
      from public.processing_job_sources as source
      where not exists (
        select 1
        from public.processing_jobs as job
        where job.source_snapshot_id = source.id
      )
      order by source.created_at, source.id
      limit 200
      for update skip locked
    )
    delete from public.processing_job_sources as source
    using candidates
    where source.id = candidates.id;
    get diagnostics v_deleted_orphan_snapshots = row_count;
  end if;

  return jsonb_build_object(
    'dryRun', p_dry_run,
    'eligibleEventRows', v_eligible_events,
    'eligibleFailedOrCancelledJobRows', v_eligible_failed_jobs,
    'eligibleCompletedJobRows', v_eligible_completed_jobs,
    'deletedEventRows', v_deleted_events,
    'deletedFailedOrCancelledJobRows', v_deleted_failed_jobs,
    'deletedCompletedJobRows', v_deleted_completed_jobs,
    'deletedOrphanSnapshotRows', v_deleted_orphan_snapshots,
    'storageCleanupBacklog', (
      select count(*)
      from public.processing_cleanup_queue as cleanup
      where cleanup.status in ('pending', 'failed')
        and cleanup.not_before <= p_now
    )
  );
end;
$$;

revoke all on function public.run_processing_lifecycle_cleanup(
  timestamptz,
  boolean
) from public, anon, authenticated;
grant execute on function public.run_processing_lifecycle_cleanup(
  timestamptz,
  boolean
) to service_role;
