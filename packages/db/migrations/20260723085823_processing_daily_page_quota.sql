alter table public.processing_policy_config
  add column max_daily_ocr_pages_per_user integer not null default 200,
  add constraint processing_policy_config_daily_ocr_pages_check
    check (max_daily_ocr_pages_per_user between 1 and 10000);

create index processing_jobs_user_type_created_idx
  on public.processing_jobs (user_id, job_type, created_at desc);

create or replace function public.enforce_processing_daily_page_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_requested_pages integer;
  v_used_pages bigint;
begin
  if new.job_type <> 'document_extraction' then
    return new;
  end if;

  select policy.max_daily_ocr_pages_per_user into strict v_limit
  from public.processing_policy_config as policy
  where policy.id = 'default';

  select greatest(1, coalesce(source.page_count, 1)) into strict v_requested_pages
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

  if v_used_pages + v_requested_pages > v_limit then
    raise exception using
      errcode = 'P0001',
      message = 'processing_job_daily_ocr_page_limit_reached';
  end if;

  return new;
end;
$$;

create trigger processing_jobs_daily_page_quota
before insert on public.processing_jobs
for each row execute function public.enforce_processing_daily_page_quota();

revoke all on function public.enforce_processing_daily_page_quota()
from public, anon, authenticated;
