create or replace function public.enforce_processing_daily_page_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.processing_policy_config%rowtype;
  v_requested_pages integer;
  v_used_pages bigint;
begin
  -- Serialize final admission for one account. The creation RPC performs the
  -- same checks early for fast errors; this trigger closes concurrent-request
  -- races immediately before insertion.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 927)
  );

  select * into strict v_policy
  from public.processing_policy_config as policy
  where policy.id = 'default';

  if (
    select count(*)
    from public.processing_jobs as job
    where job.user_id = new.user_id
      and job.status in ('queued', 'running', 'cancellation_requested')
  ) >= v_policy.max_active_jobs_per_user then
    raise exception using
      errcode = 'P0001',
      message = 'processing_job_active_limit_reached';
  end if;

  if (
    select count(*)
    from public.processing_jobs as job
    where job.user_id = new.user_id
      and job.created_at >= new.created_at - interval '1 hour'
  ) >= v_policy.max_jobs_created_per_hour then
    raise exception using
      errcode = 'P0001',
      message = 'processing_job_rate_limit_reached';
  end if;

  if new.job_type = 'document_extraction' and (
    select count(*)
    from public.processing_jobs as job
    where job.user_id = new.user_id
      and job.job_type = 'document_extraction'
      and job.status = 'queued'
  ) >= v_policy.max_queued_extraction_jobs_per_user then
    raise exception using
      errcode = 'P0001',
      message = 'processing_job_extraction_queue_limit_reached';
  end if;

  if new.job_type = 'reviewer_generation' and (
    select count(*)
    from public.processing_jobs as job
    where job.user_id = new.user_id
      and job.job_type = 'reviewer_generation'
      and job.status = 'queued'
  ) >= v_policy.max_queued_generation_jobs_per_user then
    raise exception using
      errcode = 'P0001',
      message = 'processing_job_generation_queue_limit_reached';
  end if;

  if new.job_type = 'document_extraction' and (
    select count(*)
    from public.processing_jobs as job
    where job.user_id = new.user_id
      and job.job_type = 'document_extraction'
      and job.created_at >= date_trunc('day', new.created_at)
  ) >= v_policy.max_daily_extraction_jobs then
    raise exception using
      errcode = 'P0001',
      message = 'processing_job_daily_extraction_limit_reached';
  end if;

  if new.job_type = 'reviewer_generation' and (
    select count(*)
    from public.processing_jobs as job
    where job.user_id = new.user_id
      and job.job_type = 'reviewer_generation'
      and job.created_at >= date_trunc('day', new.created_at)
  ) >= v_policy.max_daily_generation_jobs then
    raise exception using
      errcode = 'P0001',
      message = 'processing_job_daily_generation_limit_reached';
  end if;

  if new.job_type = 'document_extraction' then
    select greatest(1, coalesce(source.page_count, 1))
    into strict v_requested_pages
    from public.processing_job_sources as source
    where source.id = new.source_snapshot_id
      and source.user_id = new.user_id;

    select coalesce(sum(greatest(1, coalesce(source.page_count, 1))), 0)
    into v_used_pages
    from public.processing_jobs as job
    join public.processing_job_sources as source
      on source.id = job.source_snapshot_id
      and source.user_id = job.user_id
    where job.user_id = new.user_id
      and job.job_type = 'document_extraction'
      and job.created_at >= date_trunc('day', new.created_at);

    if v_used_pages + v_requested_pages >
      v_policy.max_daily_ocr_pages_per_user then
      raise exception using
        errcode = 'P0001',
        message = 'processing_job_daily_ocr_page_limit_reached';
    end if;
  end if;

  return new;
end;
$$;
