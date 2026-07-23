create table public.processing_worker_heartbeats (
  worker_id text primary key,
  status text not null,
  capacity integer not null,
  active_job_count integer not null,
  build_revision text,
  started_at timestamptz not null,
  last_seen_at timestamptz not null,
  stopped_at timestamptz,
  constraint processing_worker_heartbeats_worker_id_check
    check (char_length(btrim(worker_id)) between 1 and 200),
  constraint processing_worker_heartbeats_status_check
    check (status in ('running', 'stopped', 'error')),
  constraint processing_worker_heartbeats_capacity_check
    check (capacity between 1 and 32),
  constraint processing_worker_heartbeats_active_jobs_check
    check (active_job_count between 0 and capacity),
  constraint processing_worker_heartbeats_build_revision_check
    check (build_revision is null or char_length(build_revision) <= 200)
);

create index processing_worker_heartbeats_last_seen_idx
  on public.processing_worker_heartbeats (last_seen_at desc);

alter table public.processing_worker_heartbeats enable row level security;
revoke all on table public.processing_worker_heartbeats from anon, authenticated;

create or replace function public.record_processing_worker_heartbeat(
  p_worker_id text,
  p_status text,
  p_capacity integer,
  p_active_job_count integer,
  p_build_revision text default null,
  p_seen_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null
    or char_length(btrim(p_worker_id)) not between 1 and 200
    or p_status not in ('running', 'stopped', 'error')
    or p_capacity not between 1 and 32
    or p_active_job_count not between 0 and p_capacity
    or (p_build_revision is not null and char_length(p_build_revision) > 200)
  then
    raise exception 'processing_worker_heartbeat_invalid';
  end if;

  insert into public.processing_worker_heartbeats (
    worker_id,
    status,
    capacity,
    active_job_count,
    build_revision,
    started_at,
    last_seen_at,
    stopped_at
  )
  values (
    p_worker_id,
    p_status,
    p_capacity,
    p_active_job_count,
    nullif(btrim(p_build_revision), ''),
    p_seen_at,
    p_seen_at,
    case when p_status in ('stopped', 'error') then p_seen_at else null end
  )
  on conflict (worker_id) do update
  set status = excluded.status,
      capacity = excluded.capacity,
      active_job_count = excluded.active_job_count,
      build_revision = excluded.build_revision,
      last_seen_at = excluded.last_seen_at,
      stopped_at = case
        when excluded.status in ('stopped', 'error') then excluded.last_seen_at
        else null
      end;

  delete from public.processing_worker_heartbeats
  where worker_id in (
    select heartbeat.worker_id
    from public.processing_worker_heartbeats as heartbeat
    where heartbeat.last_seen_at < p_seen_at - interval '30 days'
    order by heartbeat.last_seen_at
    limit 50
  );
end;
$$;

revoke all on function public.record_processing_worker_heartbeat(
  text,
  text,
  integer,
  integer,
  text,
  timestamptz
) from public, anon, authenticated;
grant execute on function public.record_processing_worker_heartbeat(
  text,
  text,
  integer,
  integer,
  text,
  timestamptz
) to service_role;

-- Cover every R2 foreign-key access path called out by the database advisor.
-- Multi-column owner constraints keep cross-user references impossible and these
-- indexes also serve the bounded owner-history and cleanup queries.
create index document_assets_latest_extraction_owner_idx
  on public.document_assets (latest_extraction_result_id, user_id);
create index document_assets_selected_source_owner_idx
  on public.document_assets (selected_source_version_id, user_id);
create index extraction_results_document_owner_idx
  on public.extraction_results (document_asset_id, user_id);
create index extraction_results_raw_source_owner_idx
  on public.extraction_results (raw_source_version_id, user_id);
create index extraction_results_normalized_source_owner_idx
  on public.extraction_results (normalized_source_version_id, user_id);
create index extraction_results_user_idx
  on public.extraction_results (user_id);
create index source_versions_document_owner_idx
  on public.source_versions (document_asset_id, user_id);
create index source_versions_extraction_owner_idx
  on public.source_versions (extraction_result_id, user_id);
create index source_versions_parent_owner_idx
  on public.source_versions (parent_source_version_id, user_id);
create index generated_artifacts_source_owner_idx
  on public.generated_artifacts (source_version_id, user_id);
create index generated_artifacts_latest_version_owner_idx
  on public.generated_artifacts (latest_version_id, user_id);
create index generated_artifact_versions_artifact_owner_idx
  on public.generated_artifact_versions (artifact_id, user_id);
create index generated_artifact_versions_source_owner_idx
  on public.generated_artifact_versions (source_version_id, user_id);
create index processing_job_sources_user_idx
  on public.processing_job_sources (user_id);
create index processing_job_sources_document_owner_idx
  on public.processing_job_sources (document_asset_id, user_id);
create index processing_job_sources_source_version_owner_idx
  on public.processing_job_sources (source_version_id, user_id);
create index processing_jobs_source_snapshot_owner_idx
  on public.processing_jobs (source_snapshot_id, user_id);
create index processing_jobs_result_owner_idx
  on public.processing_jobs (result_id, user_id);
create index processing_jobs_retry_parent_idx
  on public.processing_jobs (retry_of_job_id);
create index processing_jobs_source_version_owner_idx
  on public.processing_jobs (source_version_id, user_id);
create index processing_jobs_reuse_parent_idx
  on public.processing_jobs (reuse_of_job_id);
create index processing_jobs_reuse_candidate_owner_idx
  on public.processing_jobs (reuse_candidate_artifact_version_id, user_id);
create index processing_job_results_user_idx
  on public.processing_job_results (user_id);
create index processing_job_results_job_owner_idx
  on public.processing_job_results (job_id, user_id);
create index processing_job_results_source_owner_idx
  on public.processing_job_results (source_snapshot_id, user_id);
create index processing_job_results_extraction_owner_idx
  on public.processing_job_results (extraction_result_id, user_id);
create index processing_job_results_artifact_version_owner_idx
  on public.processing_job_results (artifact_version_id, user_id);
create index processing_job_events_user_idx
  on public.processing_job_events (user_id);
create index processing_job_events_job_owner_idx
  on public.processing_job_events (job_id, user_id);
create index processing_job_events_artifact_version_owner_idx
  on public.processing_job_events (artifact_version_id, user_id);
