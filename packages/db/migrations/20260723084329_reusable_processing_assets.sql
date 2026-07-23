create table public.processing_policy_config (
  id text primary key,
  max_active_jobs_per_user integer not null,
  max_queued_extraction_jobs_per_user integer not null,
  max_queued_generation_jobs_per_user integer not null,
  max_jobs_created_per_hour integer not null,
  max_daily_extraction_jobs integer not null,
  max_daily_generation_jobs integer not null,
  max_running_jobs_per_user integer not null,
  max_source_versions_per_document integer not null,
  failed_job_retention_days integer not null,
  completed_job_retention_days integer not null,
  event_retention_days integer not null,
  idempotency_retention_days integer not null,
  updated_at timestamptz not null default now(),
  constraint processing_policy_config_default_id_check check (id = 'default'),
  constraint processing_policy_config_positive_values_check check (
    max_active_jobs_per_user between 1 and 100
    and max_queued_extraction_jobs_per_user between 1 and 100
    and max_queued_generation_jobs_per_user between 1 and 100
    and max_jobs_created_per_hour between 1 and 1000
    and max_daily_extraction_jobs between 1 and 1000
    and max_daily_generation_jobs between 1 and 1000
    and max_running_jobs_per_user between 1 and 10
    and max_source_versions_per_document between 2 and 100
    and failed_job_retention_days between 1 and 3650
    and completed_job_retention_days between 1 and 3650
    and event_retention_days between 1 and 3650
    and idempotency_retention_days between 1 and 3650
  )
);

insert into public.processing_policy_config (
  id,
  max_active_jobs_per_user,
  max_queued_extraction_jobs_per_user,
  max_queued_generation_jobs_per_user,
  max_jobs_created_per_hour,
  max_daily_extraction_jobs,
  max_daily_generation_jobs,
  max_running_jobs_per_user,
  max_source_versions_per_document,
  failed_job_retention_days,
  completed_job_retention_days,
  event_retention_days,
  idempotency_retention_days
) values (
  'default',
  6,
  3,
  4,
  20,
  20,
  25,
  1,
  20,
  30,
  90,
  30,
  30
);

create table public.document_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_file_name text not null,
  safe_display_name text not null,
  mime_type text not null,
  byte_size bigint not null,
  content_sha256 text,
  storage_bucket text not null,
  storage_object_path text not null,
  upload_status text not null default 'available',
  latest_extraction_result_id uuid,
  selected_source_version_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint document_assets_owner_unique unique (id, user_id),
  constraint document_assets_display_name_check
    check (char_length(btrim(safe_display_name)) between 1 and 180),
  constraint document_assets_original_file_name_check
    check (char_length(btrim(original_file_name)) between 1 and 500),
  constraint document_assets_mime_type_check
    check (mime_type in ('application/pdf', 'image/png', 'image/jpeg')),
  constraint document_assets_byte_size_check check (byte_size > 0),
  constraint document_assets_content_sha256_check
    check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint document_assets_upload_status_check
    check (upload_status in ('available', 'deleted', 'cleanup_pending')),
  constraint document_assets_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.extraction_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_asset_id uuid not null,
  extraction_job_id uuid,
  parser_policy_version text not null,
  ocr_policy_version text not null,
  normalization_version text not null,
  status text not null,
  raw_character_count integer not null,
  normalized_character_count integer not null,
  page_count integer not null,
  diagnostics jsonb not null default '{}'::jsonb,
  raw_source_version_id uuid,
  normalized_source_version_id uuid,
  created_at timestamptz not null default now(),
  constraint extraction_results_owner_unique unique (id, user_id),
  constraint extraction_results_job_unique unique (extraction_job_id),
  constraint extraction_results_document_owner_fkey
    foreign key (document_asset_id, user_id)
    references public.document_assets(id, user_id)
    on delete restrict,
  constraint extraction_results_job_fkey
    foreign key (extraction_job_id)
    references public.processing_jobs(id)
    on delete set null,
  constraint extraction_results_status_check
    check (status in ('succeeded', 'failed', 'cancelled')),
  constraint extraction_results_counts_check check (
    raw_character_count >= 0
    and normalized_character_count >= 0
    and page_count > 0
  ),
  constraint extraction_results_diagnostics_object_check
    check (jsonb_typeof(diagnostics) = 'object')
);

create table public.source_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_asset_id uuid,
  extraction_result_id uuid,
  parent_source_version_id uuid,
  revision_kind text not null,
  content_sha256 text not null,
  source_text text not null,
  character_count integer not null,
  normalization_version text,
  created_by text not null,
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint source_versions_owner_unique unique (id, user_id),
  constraint source_versions_document_owner_fkey
    foreign key (document_asset_id, user_id)
    references public.document_assets(id, user_id)
    on delete restrict,
  constraint source_versions_extraction_owner_fkey
    foreign key (extraction_result_id, user_id)
    references public.extraction_results(id, user_id)
    on delete restrict,
  constraint source_versions_parent_owner_fkey
    foreign key (parent_source_version_id, user_id)
    references public.source_versions(id, user_id)
    on delete restrict,
  constraint source_versions_revision_kind_check check (
    revision_kind in (
      'extracted_raw',
      'normalized',
      'user_edited',
      'regenerated',
      'imported_text',
      'canvas_resolved'
    )
  ),
  constraint source_versions_content_sha256_check
    check (content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint source_versions_character_count_check
    check (character_count = char_length(source_text) and character_count > 0),
  constraint source_versions_created_by_check
    check (created_by in ('system', 'user')),
  constraint source_versions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

alter table public.extraction_results
  add constraint extraction_results_raw_source_owner_fkey
  foreign key (raw_source_version_id, user_id)
  references public.source_versions(id, user_id)
  on delete restrict;

alter table public.extraction_results
  add constraint extraction_results_normalized_source_owner_fkey
  foreign key (normalized_source_version_id, user_id)
  references public.source_versions(id, user_id)
  on delete restrict;

alter table public.document_assets
  add constraint document_assets_latest_extraction_owner_fkey
  foreign key (latest_extraction_result_id, user_id)
  references public.extraction_results(id, user_id)
  on delete restrict;

alter table public.document_assets
  add constraint document_assets_selected_source_owner_fkey
  foreign key (selected_source_version_id, user_id)
  references public.source_versions(id, user_id)
  on delete restrict;

create table public.generated_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null,
  safe_title text not null,
  source_version_id uuid not null,
  latest_version_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint generated_artifacts_owner_unique unique (id, user_id),
  constraint generated_artifacts_source_owner_fkey
    foreign key (source_version_id, user_id)
    references public.source_versions(id, user_id)
    on delete restrict,
  constraint generated_artifacts_type_check check (
    artifact_type in ('reviewer', 'flashcards', 'quiz', 'summary', 'practice_test', 'study_guide')
  ),
  constraint generated_artifacts_title_check
    check (char_length(btrim(safe_title)) between 1 and 180),
  constraint generated_artifacts_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.generated_artifact_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid not null,
  version_number integer not null,
  source_version_id uuid not null,
  source_content_sha256 text not null,
  artifact_type text not null,
  payload jsonb not null,
  generation_policy_version text not null,
  engine_version text not null,
  schema_version text not null,
  provider_id text not null,
  settings_fingerprint text not null,
  generation_job_id uuid,
  created_at timestamptz not null default now(),
  constraint generated_artifact_versions_owner_unique unique (id, user_id),
  constraint generated_artifact_versions_number_unique
    unique (artifact_id, version_number),
  constraint generated_artifact_versions_job_unique unique (generation_job_id),
  constraint generated_artifact_versions_artifact_owner_fkey
    foreign key (artifact_id, user_id)
    references public.generated_artifacts(id, user_id)
    on delete cascade,
  constraint generated_artifact_versions_source_owner_fkey
    foreign key (source_version_id, user_id)
    references public.source_versions(id, user_id)
    on delete restrict,
  constraint generated_artifact_versions_generation_job_fkey
    foreign key (generation_job_id)
    references public.processing_jobs(id)
    on delete set null,
  constraint generated_artifact_versions_type_check check (
    artifact_type in ('reviewer', 'flashcards', 'quiz', 'summary', 'practice_test', 'study_guide')
  ),
  constraint generated_artifact_versions_number_check
    check (version_number > 0),
  constraint generated_artifact_versions_source_hash_check
    check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint generated_artifact_versions_settings_fingerprint_check
    check (settings_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint generated_artifact_versions_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

alter table public.generated_artifacts
  add constraint generated_artifacts_latest_version_owner_fkey
  foreign key (latest_version_id, user_id)
  references public.generated_artifact_versions(id, user_id)
  on delete restrict;

alter table public.processing_job_sources
  add column document_asset_id uuid,
  add column source_version_id uuid,
  add column content_sha256 text,
  add column parser_policy_version text,
  add column ocr_policy_version text,
  add column normalization_version text;

alter table public.processing_job_sources
  add constraint processing_job_sources_document_owner_fkey
  foreign key (document_asset_id, user_id)
  references public.document_assets(id, user_id)
  on delete restrict;

alter table public.processing_job_sources
  add constraint processing_job_sources_source_version_owner_fkey
  foreign key (source_version_id, user_id)
  references public.source_versions(id, user_id)
  on delete restrict;

alter table public.processing_job_sources
  add constraint processing_job_sources_content_sha256_check
  check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$');

alter table public.processing_jobs
  add column source_version_id uuid,
  add column artifact_type text,
  add column generation_policy_version text,
  add column engine_version text,
  add column schema_version text,
  add column provider_id text,
  add column settings_fingerprint text,
  add column language text,
  add column output_mode text,
  add column reuse_mode text not null default 'fresh',
  add column reuse_of_job_id uuid,
  add column reuse_candidate_artifact_version_id uuid,
  add column scheduled_for timestamptz not null default now(),
  add column priority_class integer not null default 100;

alter table public.processing_jobs
  add constraint processing_jobs_source_version_owner_fkey
  foreign key (source_version_id, user_id)
  references public.source_versions(id, user_id)
  on delete restrict;

alter table public.processing_jobs
  add constraint processing_jobs_reuse_parent_fkey
  foreign key (reuse_of_job_id)
  references public.processing_jobs(id)
  on delete set null;

alter table public.processing_jobs
  add constraint processing_jobs_reuse_candidate_owner_fkey
  foreign key (reuse_candidate_artifact_version_id, user_id)
  references public.generated_artifact_versions(id, user_id)
  on delete set null;

alter table public.processing_jobs
  add constraint processing_jobs_artifact_type_check
  check (
    artifact_type is null
    or artifact_type in ('reviewer', 'flashcards', 'quiz', 'summary', 'practice_test', 'study_guide')
  );

alter table public.processing_jobs
  add constraint processing_jobs_settings_fingerprint_check
  check (settings_fingerprint is null or settings_fingerprint ~ '^[a-f0-9]{64}$');

alter table public.processing_jobs
  add constraint processing_jobs_reuse_mode_check
  check (reuse_mode in ('fresh', 'reuse_existing'));

alter table public.processing_jobs
  add constraint processing_jobs_priority_class_check
  check (priority_class between 0 and 1000);

alter table public.processing_job_results
  add column extraction_result_id uuid,
  add column artifact_version_id uuid;

alter table public.processing_job_results
  add constraint processing_job_results_extraction_owner_fkey
  foreign key (extraction_result_id, user_id)
  references public.extraction_results(id, user_id)
  on delete restrict;

alter table public.processing_job_results
  add constraint processing_job_results_artifact_version_owner_fkey
  foreign key (artifact_version_id, user_id)
  references public.generated_artifact_versions(id, user_id)
  on delete restrict;

alter table public.processing_job_events
  add column artifact_version_id uuid,
  add column safe_label text,
  add column delivery_key text,
  add column delivery_eligible boolean not null default true;

alter table public.processing_job_events
  add constraint processing_job_events_artifact_version_owner_fkey
  foreign key (artifact_version_id, user_id)
  references public.generated_artifact_versions(id, user_id)
  on delete set null;

update public.processing_job_events
set delivery_key = id::text
where delivery_key is null;

alter table public.processing_job_events
  alter column delivery_key set default (gen_random_uuid()::text),
  alter column delivery_key set not null,
  add constraint processing_job_events_delivery_key_unique unique (delivery_key),
  add constraint processing_job_events_safe_label_check
    check (safe_label is null or char_length(safe_label) <= 180);

create table public.processing_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  storage_bucket text not null,
  storage_object_path text not null,
  reason text not null,
  not_before timestamptz not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint processing_cleanup_queue_object_unique
    unique (storage_bucket, storage_object_path, reason),
  constraint processing_cleanup_queue_reason_check
    check (reason in ('document_deleted', 'account_deleted', 'orphaned_staging')),
  constraint processing_cleanup_queue_status_check
    check (status in ('pending', 'running', 'completed', 'failed')),
  constraint processing_cleanup_queue_attempts_check
    check (attempt_count between 0 and 20),
  constraint processing_cleanup_queue_error_code_check
    check (
      last_error_code is null
      or (
        last_error_code ~ '^[a-z0-9_]+$'
        and char_length(last_error_code) <= 80
      )
    )
);

create index document_assets_owner_hash_idx
  on public.document_assets (user_id, content_sha256, mime_type, created_at desc)
  where deleted_at is null and upload_status = 'available';

create index extraction_results_reuse_idx
  on public.extraction_results (
    document_asset_id,
    parser_policy_version,
    ocr_policy_version,
    normalization_version,
    created_at desc
  )
  where status = 'succeeded';

create index source_versions_document_created_idx
  on public.source_versions (user_id, document_asset_id, created_at desc);

create index source_versions_parent_idx
  on public.source_versions (parent_source_version_id, created_at);

create index generated_artifacts_owner_created_idx
  on public.generated_artifacts (user_id, created_at desc)
  where deleted_at is null;

create index generated_artifact_versions_reuse_idx
  on public.generated_artifact_versions (
    user_id,
    source_version_id,
    artifact_type,
    settings_fingerprint,
    generation_policy_version,
    engine_version,
    schema_version,
    provider_id,
    created_at desc
  );

create index processing_jobs_owner_history_idx
  on public.processing_jobs (user_id, created_at desc, id desc);

create index processing_jobs_fair_claim_idx
  on public.processing_jobs (scheduled_for, next_attempt_at, priority_class, created_at, id)
  where status = 'queued';

create index processing_cleanup_queue_pending_idx
  on public.processing_cleanup_queue (not_before, created_at)
  where status in ('pending', 'failed');

alter table public.processing_policy_config enable row level security;
alter table public.document_assets enable row level security;
alter table public.extraction_results enable row level security;
alter table public.source_versions enable row level security;
alter table public.generated_artifacts enable row level security;
alter table public.generated_artifact_versions enable row level security;
alter table public.processing_cleanup_queue enable row level security;

revoke all on table public.processing_policy_config from anon, authenticated;
revoke all on table public.document_assets from anon, authenticated;
revoke all on table public.extraction_results from anon, authenticated;
revoke all on table public.source_versions from anon, authenticated;
revoke all on table public.generated_artifacts from anon, authenticated;
revoke all on table public.generated_artifact_versions from anon, authenticated;
revoke all on table public.processing_cleanup_queue from anon, authenticated;

create policy document_assets_select_own
on public.document_assets
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy extraction_results_select_own
on public.extraction_results
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy source_versions_select_own
on public.source_versions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy generated_artifacts_select_own
on public.generated_artifacts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy generated_artifact_versions_select_own
on public.generated_artifact_versions
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.reject_immutable_processing_version_update()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception using errcode = 'P0001', message = 'immutable_processing_version';
end;
$$;

create trigger source_versions_are_immutable
before update on public.source_versions
for each row execute function public.reject_immutable_processing_version_update();

create trigger generated_artifact_versions_are_immutable
before update on public.generated_artifact_versions
for each row execute function public.reject_immutable_processing_version_update();

create or replace function public.create_processing_job_v2(
  p_user_id uuid,
  p_job_type text,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_source_kind text,
  p_display_name text,
  p_mime_type text,
  p_storage_bucket text,
  p_storage_object_path text,
  p_source_text text,
  p_byte_size bigint,
  p_source_character_count integer,
  p_page_count integer,
  p_source_metadata jsonb,
  p_source_private_metadata jsonb,
  p_contract jsonb,
  p_expires_at timestamptz default null
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_policy public.processing_policy_config%rowtype;
  v_existing public.processing_jobs%rowtype;
  v_job public.processing_jobs%rowtype;
  v_source_id uuid;
  v_source_version public.source_versions%rowtype;
  v_document public.document_assets%rowtype;
  v_reusable_extraction public.extraction_results%rowtype;
  v_reusable_artifact public.generated_artifact_versions%rowtype;
  v_reused_payload jsonb;
  v_result_id uuid;
  v_stage text;
  v_content_sha256 text;
  v_parser_policy_version text;
  v_ocr_policy_version text;
  v_normalization_version text;
  v_artifact_type text;
  v_generation_policy_version text;
  v_engine_version text;
  v_schema_version text;
  v_provider_id text;
  v_settings_fingerprint text;
  v_language text;
  v_output_mode text;
  v_reuse_mode text;
begin
  if p_user_id is null then
    raise exception using errcode = 'P0001', message = 'processing_job_owner_missing';
  end if;

  p_job_type := nullif(btrim(p_job_type), '');
  p_idempotency_key := nullif(btrim(p_idempotency_key), '');
  p_request_fingerprint := lower(nullif(btrim(p_request_fingerprint), ''));
  p_source_kind := nullif(btrim(p_source_kind), '');
  p_display_name := nullif(btrim(p_display_name), '');
  p_mime_type := lower(nullif(btrim(p_mime_type), ''));
  p_contract := coalesce(p_contract, '{}'::jsonb);

  select * into v_existing
  from public.processing_jobs job
  where job.user_id = p_user_id
    and job.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.job_type is distinct from p_job_type
      or v_existing.request_fingerprint is distinct from p_request_fingerprint then
      raise exception using errcode = 'P0001', message = 'processing_job_idempotency_conflict';
    end if;
    return next v_existing;
    return;
  end if;

  if p_job_type not in ('document_extraction', 'reviewer_generation') then
    raise exception using errcode = 'P0001', message = 'processing_job_type_invalid';
  end if;

  select * into strict v_policy
  from public.processing_policy_config
  where id = 'default';

  if (
    select count(*)
    from public.processing_jobs job
    where job.user_id = p_user_id
      and job.status in ('queued', 'running', 'cancellation_requested')
  ) >= v_policy.max_active_jobs_per_user then
    raise exception using errcode = 'P0001', message = 'processing_job_active_limit_reached';
  end if;

  if (
    select count(*)
    from public.processing_jobs job
    where job.user_id = p_user_id
      and job.created_at >= now() - interval '1 hour'
  ) >= v_policy.max_jobs_created_per_hour then
    raise exception using errcode = 'P0001', message = 'processing_job_rate_limit_reached';
  end if;

  if p_job_type = 'document_extraction' and (
    select count(*)
    from public.processing_jobs job
    where job.user_id = p_user_id
      and job.job_type = 'document_extraction'
      and job.status = 'queued'
  ) >= v_policy.max_queued_extraction_jobs_per_user then
    raise exception using errcode = 'P0001', message = 'processing_job_extraction_queue_limit_reached';
  end if;

  if p_job_type = 'reviewer_generation' and (
    select count(*)
    from public.processing_jobs job
    where job.user_id = p_user_id
      and job.job_type = 'reviewer_generation'
      and job.status = 'queued'
  ) >= v_policy.max_queued_generation_jobs_per_user then
    raise exception using errcode = 'P0001', message = 'processing_job_generation_queue_limit_reached';
  end if;

  if p_job_type = 'document_extraction' and (
    select count(*)
    from public.processing_jobs job
    where job.user_id = p_user_id
      and job.job_type = 'document_extraction'
      and job.created_at >= date_trunc('day', now())
  ) >= v_policy.max_daily_extraction_jobs then
    raise exception using errcode = 'P0001', message = 'processing_job_daily_extraction_limit_reached';
  end if;

  if p_job_type = 'reviewer_generation' and (
    select count(*)
    from public.processing_jobs job
    where job.user_id = p_user_id
      and job.job_type = 'reviewer_generation'
      and job.created_at >= date_trunc('day', now())
  ) >= v_policy.max_daily_generation_jobs then
    raise exception using errcode = 'P0001', message = 'processing_job_daily_generation_limit_reached';
  end if;

  v_content_sha256 := lower(nullif(btrim(p_contract ->> 'contentSha256'), ''));
  v_parser_policy_version := coalesce(nullif(btrim(p_contract ->> 'parserPolicyVersion'), ''), 'legacy-v1');
  v_ocr_policy_version := coalesce(nullif(btrim(p_contract ->> 'ocrPolicyVersion'), ''), 'legacy-v1');
  v_normalization_version := coalesce(nullif(btrim(p_contract ->> 'normalizationVersion'), ''), 'legacy-v1');
  v_artifact_type := nullif(btrim(p_contract ->> 'artifactType'), '');
  v_generation_policy_version := nullif(btrim(p_contract ->> 'generationPolicyVersion'), '');
  v_engine_version := nullif(btrim(p_contract ->> 'engineVersion'), '');
  v_schema_version := nullif(btrim(p_contract ->> 'schemaVersion'), '');
  v_provider_id := nullif(btrim(p_contract ->> 'providerId'), '');
  v_settings_fingerprint := lower(nullif(btrim(p_contract ->> 'settingsFingerprint'), ''));
  v_language := coalesce(nullif(btrim(p_contract ->> 'language'), ''), 'auto');
  v_output_mode := coalesce(nullif(btrim(p_contract ->> 'outputMode'), ''), 'standard');
  v_reuse_mode := coalesce(nullif(btrim(p_contract ->> 'reuseMode'), ''), 'fresh');

  if v_content_sha256 is not null and v_content_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = 'P0001', message = 'processing_source_hash_invalid';
  end if;

  if p_job_type = 'document_extraction' then
    if v_content_sha256 is null
      or p_source_kind not in ('pdf', 'image')
      or p_storage_bucket is null
      or p_storage_object_path is null
      or p_byte_size is null then
      raise exception using errcode = 'P0001', message = 'processing_document_contract_invalid';
    end if;

    select * into v_document
    from public.document_assets asset
    where asset.user_id = p_user_id
      and asset.content_sha256 = v_content_sha256
      and asset.mime_type = p_mime_type
      and asset.byte_size = p_byte_size
      and asset.deleted_at is null
      and asset.upload_status = 'available'
    order by asset.created_at
    limit 1;

    if not found then
      insert into public.document_assets (
        user_id,
        original_file_name,
        safe_display_name,
        mime_type,
        byte_size,
        content_sha256,
        storage_bucket,
        storage_object_path,
        upload_status,
        metadata
      ) values (
        p_user_id,
        p_display_name,
        p_display_name,
        p_mime_type,
        p_byte_size,
        v_content_sha256,
        p_storage_bucket,
        p_storage_object_path,
        'available',
        jsonb_build_object('assetContractVersion', 'document-asset-v1')
      ) returning * into v_document;
    end if;

    select extraction.* into v_reusable_extraction
    from public.extraction_results extraction
    where extraction.user_id = p_user_id
      and extraction.document_asset_id = v_document.id
      and extraction.status = 'succeeded'
      and extraction.parser_policy_version = v_parser_policy_version
      and extraction.ocr_policy_version = v_ocr_policy_version
      and extraction.normalization_version = v_normalization_version
      and extraction.normalized_source_version_id is not null
    order by extraction.created_at desc
    limit 1;

    insert into public.processing_job_sources (
      user_id,
      source_kind,
      display_name,
      mime_type,
      storage_bucket,
      storage_object_path,
      byte_size,
      page_count,
      metadata,
      document_asset_id,
      content_sha256,
      parser_policy_version,
      ocr_policy_version,
      normalization_version
    ) values (
      p_user_id,
      p_source_kind,
      p_display_name,
      p_mime_type,
      v_document.storage_bucket,
      v_document.storage_object_path,
      p_byte_size,
      p_page_count,
      coalesce(p_source_private_metadata, '{}'::jsonb),
      v_document.id,
      v_content_sha256,
      v_parser_policy_version,
      v_ocr_policy_version,
      v_normalization_version
    ) returning id into v_source_id;
    v_stage := 'inspecting_document';
  else
    if v_artifact_type <> 'reviewer'
      or v_generation_policy_version is null
      or v_engine_version is null
      or v_schema_version is null
      or v_provider_id is null
      or v_settings_fingerprint !~ '^[a-f0-9]{64}$' then
      raise exception using errcode = 'P0001', message = 'processing_generation_contract_invalid';
    end if;

    if nullif(btrim(p_contract ->> 'sourceVersionId'), '') is not null then
      select * into v_source_version
      from public.source_versions source
      where source.id = (p_contract ->> 'sourceVersionId')::uuid
        and source.user_id = p_user_id;
      if not found then
        raise exception using errcode = 'P0001', message = 'processing_source_version_not_found';
      end if;
      p_source_text := v_source_version.source_text;
      p_source_character_count := v_source_version.character_count;
      v_content_sha256 := v_source_version.content_sha256;
    else
      p_source_text := nullif(btrim(p_source_text), '');
      if p_source_text is null then
        raise exception using errcode = 'P0001', message = 'processing_source_text_missing';
      end if;
      v_content_sha256 := encode(digest(convert_to(p_source_text, 'UTF8'), 'sha256'), 'hex');
      insert into public.source_versions (
        user_id,
        revision_kind,
        content_sha256,
        source_text,
        character_count,
        normalization_version,
        created_by,
        metadata
      ) values (
        p_user_id,
        case
          when p_source_private_metadata ? 'reviewerSourceSnapshotId' then 'canvas_resolved'
          else 'imported_text'
        end,
        v_content_sha256,
        p_source_text,
        char_length(p_source_text),
        v_normalization_version,
        'user',
        coalesce(p_source_private_metadata, '{}'::jsonb)
      ) returning * into v_source_version;
    end if;

    select version.* into v_reusable_artifact
    from public.generated_artifact_versions version
    join public.generated_artifacts artifact
      on artifact.id = version.artifact_id
      and artifact.user_id = version.user_id
    where version.user_id = p_user_id
      and version.source_version_id = v_source_version.id
      and version.source_content_sha256 = v_source_version.content_sha256
      and version.artifact_type = v_artifact_type
      and version.generation_policy_version = v_generation_policy_version
      and version.engine_version = v_engine_version
      and version.schema_version = v_schema_version
      and version.provider_id = v_provider_id
      and version.settings_fingerprint = v_settings_fingerprint
      and artifact.deleted_at is null
    order by version.created_at desc
    limit 1;

    insert into public.processing_job_sources (
      user_id,
      source_kind,
      display_name,
      mime_type,
      source_text,
      source_character_count,
      metadata,
      source_version_id,
      content_sha256,
      normalization_version
    ) values (
      p_user_id,
      'text',
      p_display_name,
      'text/plain',
      v_source_version.source_text,
      v_source_version.character_count,
      coalesce(p_source_private_metadata, '{}'::jsonb),
      v_source_version.id,
      v_source_version.content_sha256,
      v_normalization_version
    ) returning id into v_source_id;
    v_stage := 'preparing_source';
  end if;

  insert into public.processing_jobs (
    user_id,
    job_type,
    status,
    stage,
    status_message,
    source_metadata,
    source_snapshot_id,
    source_version_id,
    artifact_type,
    generation_policy_version,
    engine_version,
    schema_version,
    provider_id,
    settings_fingerprint,
    language,
    output_mode,
    reuse_mode,
    reuse_candidate_artifact_version_id,
    idempotency_key,
    request_fingerprint,
    expires_at,
    scheduled_for
  ) values (
    p_user_id,
    p_job_type,
    'queued',
    v_stage,
    'Waiting to start',
    coalesce(p_source_metadata, '{}'::jsonb),
    v_source_id,
    v_source_version.id,
    v_artifact_type,
    v_generation_policy_version,
    v_engine_version,
    v_schema_version,
    v_provider_id,
    v_settings_fingerprint,
    v_language,
    v_output_mode,
    v_reuse_mode,
    v_reusable_artifact.id,
    p_idempotency_key,
    p_request_fingerprint,
    coalesce(p_expires_at, now() + interval '24 hours'),
    now()
  ) returning * into v_job;

  if p_job_type = 'document_extraction' and v_reusable_extraction.id is not null then
    select result.payload into v_reused_payload
    from public.processing_job_results result
    where result.job_id = v_reusable_extraction.extraction_job_id
      and result.user_id = p_user_id;

    if v_reused_payload is not null then
      insert into public.processing_job_results (
        job_id,
        user_id,
        source_snapshot_id,
        result_type,
        payload,
        metrics,
        extraction_result_id
      ) values (
        v_job.id,
        v_job.user_id,
        v_job.source_snapshot_id,
        v_job.job_type,
        v_reused_payload,
        jsonb_build_object(
          'reuseHit', true,
          'reuseKind', 'compatible_extraction',
          'extractionResultId', v_reusable_extraction.id
        ),
        v_reusable_extraction.id
      ) returning id into v_result_id;

      update public.processing_job_sources source
      set source_version_id = v_reusable_extraction.normalized_source_version_id
      where source.id = v_job.source_snapshot_id;

      update public.processing_jobs job
      set
        status = 'succeeded',
        status_message = 'Complete',
        source_version_id = v_reusable_extraction.normalized_source_version_id,
        result_id = v_result_id,
        completed_at = now(),
        metrics = jsonb_build_object(
          'reuseHit', true,
          'reuseKind', 'compatible_extraction'
        ),
        reuse_of_job_id = v_reusable_extraction.extraction_job_id
      where job.id = v_job.id
      returning * into v_job;

      insert into public.processing_job_events (
        job_id,
        user_id,
        event_type,
        payload,
        safe_label,
        delivery_key
      ) values (
        v_job.id,
        v_job.user_id,
        'job_succeeded',
        jsonb_build_object('jobType', v_job.job_type, 'reuseHit', true),
        'Text extraction ready',
        v_job.id::text || ':job_succeeded'
      );
    end if;
  elsif p_job_type = 'reviewer_generation'
    and v_reuse_mode = 'reuse_existing'
    and v_reusable_artifact.id is not null then
    insert into public.processing_job_results (
      job_id,
      user_id,
      source_snapshot_id,
      result_type,
      payload,
      metrics,
      artifact_version_id
    ) values (
      v_job.id,
      v_job.user_id,
      v_job.source_snapshot_id,
      v_job.job_type,
      v_reusable_artifact.payload,
      jsonb_build_object(
        'reuseHit', true,
        'reuseKind', 'exact_artifact_fingerprint',
        'artifactVersionId', v_reusable_artifact.id
      ),
      v_reusable_artifact.id
    ) returning id into v_result_id;

    update public.processing_jobs job
    set
      status = 'succeeded',
      status_message = 'Complete',
      result_id = v_result_id,
      completed_at = now(),
      metrics = jsonb_build_object(
        'reuseHit', true,
        'reuseKind', 'exact_artifact_fingerprint'
      ),
      reuse_of_job_id = v_reusable_artifact.generation_job_id
    where job.id = v_job.id
    returning * into v_job;

    insert into public.processing_job_events (
      job_id,
      user_id,
      event_type,
      payload,
      artifact_version_id,
      safe_label,
      delivery_key
    ) values (
      v_job.id,
      v_job.user_id,
      'job_succeeded',
      jsonb_build_object('jobType', v_job.job_type, 'reuseHit', true),
      v_reusable_artifact.id,
      'Reviewer ready',
      v_job.id::text || ':job_succeeded'
    );
  end if;

  return next v_job;
exception when unique_violation then
  select * into v_existing
  from public.processing_jobs job
  where job.user_id = p_user_id
    and job.idempotency_key = p_idempotency_key;

  if not found
    or v_existing.job_type is distinct from p_job_type
    or v_existing.request_fingerprint is distinct from p_request_fingerprint then
    raise exception using errcode = 'P0001', message = 'processing_job_idempotency_conflict';
  end if;
  return next v_existing;
end;
$$;

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
    where job.status = 'queued'
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

create or replace function public.complete_processing_job_v2(
  p_job_id uuid,
  p_worker_id text,
  p_result_type text,
  p_payload jsonb,
  p_metrics jsonb default '{}'::jsonb,
  p_completed_at timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.processing_jobs%rowtype;
  v_source public.processing_job_sources%rowtype;
  v_source_version public.source_versions%rowtype;
  v_result_id uuid;
  v_extraction_result_id uuid;
  v_raw_source_version_id uuid;
  v_normalized_source_version_id uuid;
  v_artifact_id uuid;
  v_artifact_version_id uuid;
  v_raw_text text;
  v_normalized_text text;
  v_title text;
begin
  select * into v_job
  from public.processing_jobs job
  where job.id = p_job_id
  for update;

  if not found
    or v_job.status <> 'running'
    or v_job.lease_owner is distinct from p_worker_id
    or v_job.lease_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'processing_job_completion_rejected';
  end if;

  if v_job.job_type <> p_result_type then
    raise exception using errcode = 'P0001', message = 'processing_job_result_type_invalid';
  end if;

  select * into strict v_source
  from public.processing_job_sources source
  where source.id = v_job.source_snapshot_id
    and source.user_id = v_job.user_id;

  if v_job.job_type = 'document_extraction' then
    if v_source.document_asset_id is null then
      raise exception using errcode = 'P0001', message = 'processing_document_asset_missing';
    end if;

    v_normalized_text := nullif(p_payload ->> 'text', '');
    v_raw_text := nullif(p_payload ->> 'rawText', '');
    if v_normalized_text is null then
      raise exception using errcode = 'P0001', message = 'processing_extraction_text_missing';
    end if;
    v_raw_text := coalesce(v_raw_text, v_normalized_text);

    insert into public.extraction_results (
      user_id,
      document_asset_id,
      extraction_job_id,
      parser_policy_version,
      ocr_policy_version,
      normalization_version,
      status,
      raw_character_count,
      normalized_character_count,
      page_count,
      diagnostics
    ) values (
      v_job.user_id,
      v_source.document_asset_id,
      v_job.id,
      coalesce(v_source.parser_policy_version, 'legacy-v1'),
      coalesce(v_source.ocr_policy_version, 'legacy-v1'),
      coalesce(v_source.normalization_version, 'legacy-v1'),
      'succeeded',
      char_length(v_raw_text),
      char_length(v_normalized_text),
      greatest(1, coalesce((p_payload ->> 'pageCount')::integer, v_source.page_count, 1)),
      coalesce(p_payload -> 'normalization', '{}'::jsonb)
    ) returning id into v_extraction_result_id;

    insert into public.source_versions (
      user_id,
      document_asset_id,
      extraction_result_id,
      revision_kind,
      content_sha256,
      source_text,
      character_count,
      normalization_version,
      created_by
    ) values (
      v_job.user_id,
      v_source.document_asset_id,
      v_extraction_result_id,
      'extracted_raw',
      encode(digest(convert_to(v_raw_text, 'UTF8'), 'sha256'), 'hex'),
      v_raw_text,
      char_length(v_raw_text),
      null,
      'system'
    ) returning id into v_raw_source_version_id;

    insert into public.source_versions (
      user_id,
      document_asset_id,
      extraction_result_id,
      parent_source_version_id,
      revision_kind,
      content_sha256,
      source_text,
      character_count,
      normalization_version,
      created_by
    ) values (
      v_job.user_id,
      v_source.document_asset_id,
      v_extraction_result_id,
      v_raw_source_version_id,
      'normalized',
      encode(digest(convert_to(v_normalized_text, 'UTF8'), 'sha256'), 'hex'),
      v_normalized_text,
      char_length(v_normalized_text),
      coalesce(v_source.normalization_version, 'legacy-v1'),
      'system'
    ) returning id into v_normalized_source_version_id;

    update public.extraction_results extraction
    set
      raw_source_version_id = v_raw_source_version_id,
      normalized_source_version_id = v_normalized_source_version_id
    where extraction.id = v_extraction_result_id;

    update public.document_assets asset
    set
      latest_extraction_result_id = v_extraction_result_id,
      selected_source_version_id = v_normalized_source_version_id,
      updated_at = p_completed_at
    where asset.id = v_source.document_asset_id;

    update public.processing_job_sources source
    set source_version_id = v_normalized_source_version_id
    where source.id = v_source.id;

    v_job.source_version_id := v_normalized_source_version_id;
  else
    if v_job.source_version_id is null
      or v_job.artifact_type is null
      or v_job.settings_fingerprint is null then
      raise exception using errcode = 'P0001', message = 'processing_generation_provenance_missing';
    end if;

    select * into strict v_source_version
    from public.source_versions source
    where source.id = v_job.source_version_id
      and source.user_id = v_job.user_id;

    v_title := left(
      coalesce(nullif(btrim(p_payload #>> '{reviewer,title}'), ''), v_source.display_name),
      180
    );

    insert into public.generated_artifacts (
      user_id,
      artifact_type,
      safe_title,
      source_version_id,
      metadata
    ) values (
      v_job.user_id,
      v_job.artifact_type,
      v_title,
      v_job.source_version_id,
      jsonb_build_object('artifactContractVersion', 'generated-artifact-v1')
    ) returning id into v_artifact_id;

    insert into public.generated_artifact_versions (
      user_id,
      artifact_id,
      version_number,
      source_version_id,
      source_content_sha256,
      artifact_type,
      payload,
      generation_policy_version,
      engine_version,
      schema_version,
      provider_id,
      settings_fingerprint,
      generation_job_id
    ) values (
      v_job.user_id,
      v_artifact_id,
      1,
      v_job.source_version_id,
      v_source_version.content_sha256,
      v_job.artifact_type,
      p_payload,
      v_job.generation_policy_version,
      v_job.engine_version,
      v_job.schema_version,
      v_job.provider_id,
      v_job.settings_fingerprint,
      v_job.id
    ) returning id into v_artifact_version_id;

    update public.generated_artifacts artifact
    set latest_version_id = v_artifact_version_id
    where artifact.id = v_artifact_id;
  end if;

  insert into public.processing_job_results (
    job_id,
    user_id,
    source_snapshot_id,
    result_type,
    payload,
    metrics,
    extraction_result_id,
    artifact_version_id
  ) values (
    v_job.id,
    v_job.user_id,
    v_job.source_snapshot_id,
    p_result_type,
    p_payload,
    coalesce(p_metrics, '{}'::jsonb),
    v_extraction_result_id,
    v_artifact_version_id
  ) returning id into v_result_id;

  update public.processing_jobs job
  set
    status = 'succeeded',
    status_message = 'Complete',
    completed_at = p_completed_at,
    result_id = v_result_id,
    source_version_id = coalesce(v_normalized_source_version_id, job.source_version_id),
    metrics = job.metrics || coalesce(p_metrics, '{}'::jsonb),
    completed_units = coalesce(job.total_units, job.completed_units),
    lease_owner = null,
    lease_expires_at = null,
    heartbeat_at = p_completed_at,
    error_code = null,
    safe_error_message = null,
    retryable = false
  where job.id = v_job.id
  returning * into v_job;

  insert into public.processing_job_events (
    job_id,
    user_id,
    event_type,
    payload,
    artifact_version_id,
    safe_label,
    delivery_key
  ) values (
    v_job.id,
    v_job.user_id,
    'job_succeeded',
    jsonb_strip_nulls(jsonb_build_object(
      'jobType', v_job.job_type,
      'resultId', v_result_id,
      'artifactVersionId', v_artifact_version_id
    )),
    v_artifact_version_id,
    case
      when v_job.job_type = 'reviewer_generation' then 'Reviewer ready'
      else 'Text extraction ready'
    end,
    v_job.id::text || ':job_succeeded'
  );

  return next v_job;
end;
$$;

create or replace function public.fail_processing_job(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_safe_error_message text,
  p_retryable boolean,
  p_failed_at timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.processing_jobs%rowtype;
  v_should_retry boolean;
  v_retry_delay_seconds integer;
begin
  select * into v_job
  from public.processing_jobs job
  where job.id = p_job_id
  for update;

  if not found
    or v_job.lease_owner is distinct from p_worker_id
    or v_job.status not in ('running', 'cancellation_requested') then
    raise exception using errcode = 'P0001', message = 'processing_job_failure_rejected';
  end if;

  if v_job.status = 'cancellation_requested' then
    update public.processing_jobs job
    set
      status = 'cancelled',
      status_message = 'Cancelled',
      failed_at = null,
      retryable = false,
      error_code = null,
      safe_error_message = null,
      lease_owner = null,
      lease_expires_at = null,
      heartbeat_at = p_failed_at
    where job.id = v_job.id
    returning * into v_job;

    insert into public.processing_job_events (
      job_id,
      user_id,
      event_type,
      safe_label,
      delivery_key
    ) values (
      v_job.id,
      v_job.user_id,
      'job_cancelled',
      'Processing cancelled',
      v_job.id::text || ':job_cancelled'
    ) on conflict (delivery_key) do nothing;
    return next v_job;
    return;
  end if;

  v_should_retry :=
    coalesce(p_retryable, false)
    and v_job.attempt_count < v_job.max_attempts
    and v_job.expires_at > p_failed_at;
  v_retry_delay_seconds := case
    when p_error_code = 'provider_rate_limited'
      then least(1800, greatest(60, 5 * power(2, greatest(v_job.attempt_count - 1, 0))::integer))
    else least(300, 5 * power(2, greatest(v_job.attempt_count - 1, 0))::integer)
  end;

  update public.processing_jobs job
  set
    status = case when v_should_retry then 'queued' else 'failed' end,
    status_message = case
      when v_should_retry and p_error_code = 'provider_rate_limited'
        then 'Waiting for provider capacity'
      when v_should_retry then 'Waiting to retry'
      else 'Needs attention'
    end,
    next_attempt_at = case
      when v_should_retry then p_failed_at + make_interval(secs => v_retry_delay_seconds)
      else job.next_attempt_at
    end,
    failed_at = case when v_should_retry then null else p_failed_at end,
    error_code = p_error_code,
    safe_error_message = p_safe_error_message,
    retryable = coalesce(p_retryable, false),
    lease_owner = null,
    lease_expires_at = null,
    heartbeat_at = p_failed_at
  where job.id = v_job.id
  returning * into v_job;

  if not v_should_retry then
    insert into public.processing_job_events (
      job_id,
      user_id,
      event_type,
      payload,
      safe_label,
      delivery_key
    ) values (
      v_job.id,
      v_job.user_id,
      'job_failed',
      jsonb_build_object('errorCode', p_error_code, 'retryable', p_retryable),
      'Processing needs attention',
      v_job.id::text || ':job_failed'
    ) on conflict (delivery_key) do nothing;
  end if;

  return next v_job;
end;
$$;

create or replace function public.retry_processing_job(
  p_user_id uuid,
  p_job_id uuid,
  p_idempotency_key text,
  p_requested_at timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_original public.processing_jobs%rowtype;
  v_existing public.processing_jobs%rowtype;
  v_retry public.processing_jobs%rowtype;
  v_active_limit integer;
begin
  p_idempotency_key := nullif(btrim(p_idempotency_key), '');

  select * into v_existing
  from public.processing_jobs job
  where job.user_id = p_user_id
    and job.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.retry_of_job_id is distinct from p_job_id then
      raise exception using errcode = 'P0001', message = 'processing_job_idempotency_conflict';
    end if;
    return next v_existing;
    return;
  end if;

  select * into v_original
  from public.processing_jobs job
  where job.id = p_job_id
    and job.user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if v_original.status <> 'failed' or not v_original.retryable then
    raise exception using errcode = 'P0001', message = 'processing_job_not_retryable';
  end if;

  select max_active_jobs_per_user into strict v_active_limit
  from public.processing_policy_config
  where id = 'default';

  if (
    select count(*)
    from public.processing_jobs job
    where job.user_id = p_user_id
      and job.status in ('queued', 'running', 'cancellation_requested')
  ) >= v_active_limit then
    raise exception using errcode = 'P0001', message = 'processing_job_active_limit_reached';
  end if;

  insert into public.processing_jobs (
    user_id,
    job_type,
    status,
    stage,
    status_message,
    source_metadata,
    source_snapshot_id,
    source_version_id,
    artifact_type,
    generation_policy_version,
    engine_version,
    schema_version,
    provider_id,
    settings_fingerprint,
    language,
    output_mode,
    reuse_mode,
    idempotency_key,
    request_fingerprint,
    retry_of_job_id,
    created_at,
    accepted_at,
    scheduled_for,
    priority_class,
    expires_at
  ) values (
    v_original.user_id,
    v_original.job_type,
    'queued',
    case
      when v_original.job_type = 'document_extraction' then 'inspecting_document'
      else 'preparing_source'
    end,
    'Waiting to start',
    v_original.source_metadata,
    v_original.source_snapshot_id,
    v_original.source_version_id,
    v_original.artifact_type,
    v_original.generation_policy_version,
    v_original.engine_version,
    v_original.schema_version,
    v_original.provider_id,
    v_original.settings_fingerprint,
    v_original.language,
    v_original.output_mode,
    'fresh',
    p_idempotency_key,
    v_original.request_fingerprint,
    v_original.id,
    p_requested_at,
    p_requested_at,
    p_requested_at,
    150,
    p_requested_at + case
      when v_original.job_type = 'document_extraction' then interval '30 minutes'
      else interval '45 minutes'
    end
  ) returning * into v_retry;

  return next v_retry;
end;
$$;

create or replace function public.create_source_version_revision(
  p_user_id uuid,
  p_parent_source_version_id uuid,
  p_expected_parent_sha256 text,
  p_source_text text,
  p_select_as_active boolean default true,
  p_created_at timestamptz default now()
)
returns table (
  source_version_id uuid,
  content_sha256 text,
  conflict_detected boolean,
  selected_as_active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_parent public.source_versions%rowtype;
  v_document public.document_assets%rowtype;
  v_version_id uuid;
  v_content_sha256 text;
  v_conflict boolean := false;
  v_selected boolean := false;
  v_max_versions integer;
begin
  p_source_text := nullif(btrim(p_source_text), '');
  p_expected_parent_sha256 := lower(nullif(btrim(p_expected_parent_sha256), ''));

  if p_source_text is null then
    raise exception using errcode = 'P0001', message = 'source_revision_text_missing';
  end if;

  select * into v_parent
  from public.source_versions source
  where source.id = p_parent_source_version_id
    and source.user_id = p_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'source_version_not_found';
  end if;

  if v_parent.content_sha256 is distinct from p_expected_parent_sha256 then
    raise exception using errcode = 'P0001', message = 'source_version_precondition_failed';
  end if;

  if v_parent.document_asset_id is not null then
    select * into v_document
    from public.document_assets asset
    where asset.id = v_parent.document_asset_id
      and asset.user_id = p_user_id
    for update;
  end if;

  select max_source_versions_per_document into strict v_max_versions
  from public.processing_policy_config
  where id = 'default';

  if v_parent.document_asset_id is not null and (
    select count(*)
    from public.source_versions source
    where source.user_id = p_user_id
      and source.document_asset_id = v_parent.document_asset_id
  ) >= v_max_versions then
    raise exception using errcode = 'P0001', message = 'source_version_limit_reached';
  end if;

  v_content_sha256 := encode(digest(convert_to(p_source_text, 'UTF8'), 'sha256'), 'hex');

  insert into public.source_versions (
    user_id,
    document_asset_id,
    parent_source_version_id,
    revision_kind,
    content_sha256,
    source_text,
    character_count,
    normalization_version,
    created_by,
    created_at
  ) values (
    p_user_id,
    v_parent.document_asset_id,
    v_parent.id,
    'user_edited',
    v_content_sha256,
    p_source_text,
    char_length(p_source_text),
    v_parent.normalization_version,
    'user',
    p_created_at
  ) returning id into v_version_id;

  if v_parent.document_asset_id is not null and p_select_as_active then
    update public.document_assets asset
    set
      selected_source_version_id = v_version_id,
      updated_at = p_created_at
    where asset.id = v_parent.document_asset_id
      and asset.user_id = p_user_id
      and asset.selected_source_version_id = v_parent.id;
    v_selected := found;
    v_conflict := not v_selected;
  elsif exists (
    select 1
    from public.source_versions sibling
    where sibling.parent_source_version_id = v_parent.id
      and sibling.id <> v_version_id
  ) then
    v_conflict := true;
  end if;

  return query
  select v_version_id, v_content_sha256, v_conflict, v_selected;
end;
$$;

create or replace function public.soft_delete_document_asset(
  p_user_id uuid,
  p_document_asset_id uuid,
  p_dependent_artifact_policy text default 'block',
  p_deleted_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset public.document_assets%rowtype;
  v_has_dependents boolean;
begin
  select * into v_asset
  from public.document_assets asset
  where asset.id = p_document_asset_id
    and asset.user_id = p_user_id
  for update;

  if not found then
    return false;
  end if;

  if exists (
    select 1
    from public.processing_job_sources source
    join public.processing_jobs job on job.source_snapshot_id = source.id
    where source.document_asset_id = v_asset.id
      and job.status in ('queued', 'running', 'cancellation_requested')
  ) then
    raise exception using errcode = 'P0001', message = 'document_asset_has_active_jobs';
  end if;

  select exists (
    select 1
    from public.generated_artifacts artifact
    join public.source_versions source on source.id = artifact.source_version_id
    where source.document_asset_id = v_asset.id
      and artifact.deleted_at is null
  ) into v_has_dependents;

  if v_has_dependents and p_dependent_artifact_policy <> 'preserve_artifacts' then
    raise exception using errcode = 'P0001', message = 'document_asset_has_dependent_artifacts';
  end if;

  update public.document_assets asset
  set
    deleted_at = coalesce(asset.deleted_at, p_deleted_at),
    upload_status = 'cleanup_pending',
    updated_at = p_deleted_at
  where asset.id = v_asset.id;

  insert into public.processing_cleanup_queue (
    owner_user_id,
    storage_bucket,
    storage_object_path,
    reason,
    not_before
  ) values (
    v_asset.user_id,
    v_asset.storage_bucket,
    v_asset.storage_object_path,
    'document_deleted',
    p_deleted_at + interval '7 days'
  ) on conflict (storage_bucket, storage_object_path, reason) do nothing;

  return true;
end;
$$;

create or replace function public.queue_processing_content_for_account_deletion()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.processing_cleanup_queue (
    owner_user_id,
    storage_bucket,
    storage_object_path,
    reason,
    not_before
  )
  select
    old.id,
    asset.storage_bucket,
    asset.storage_object_path,
    'account_deleted',
    now()
  from public.document_assets asset
  where asset.user_id = old.id
  on conflict (storage_bucket, storage_object_path, reason) do nothing;
  return old;
end;
$$;

create trigger queue_processing_content_before_account_delete
before delete on auth.users
for each row execute function public.queue_processing_content_for_account_deletion();

create or replace function public.run_processing_lifecycle_cleanup(
  p_now timestamptz default now(),
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_policy public.processing_policy_config%rowtype;
  v_event_count integer;
  v_failed_job_count integer;
  v_completed_job_count integer;
begin
  select * into strict v_policy
  from public.processing_policy_config
  where id = 'default';

  select count(*) into v_event_count
  from public.processing_job_events event
  where event.created_at < p_now - make_interval(days => v_policy.event_retention_days)
    and (
      event.delivered_at is not null
      or event.delivery_eligible = false
      or event.created_at < p_now - make_interval(days => v_policy.event_retention_days * 2)
    );

  select count(*) into v_failed_job_count
  from public.processing_jobs job
  where job.status in ('failed', 'cancelled', 'expired')
    and job.updated_at < p_now - make_interval(days => v_policy.failed_job_retention_days)
    and job.idempotency_expires_at < p_now;

  select count(*) into v_completed_job_count
  from public.processing_jobs job
  where job.status = 'succeeded'
    and job.completed_at < p_now - make_interval(days => v_policy.completed_job_retention_days)
    and job.idempotency_expires_at < p_now;

  if not p_dry_run then
    delete from public.processing_job_events event
    where event.created_at < p_now - make_interval(days => v_policy.event_retention_days)
      and (
        event.delivered_at is not null
        or event.delivery_eligible = false
        or event.created_at < p_now - make_interval(days => v_policy.event_retention_days * 2)
      );

    delete from public.processing_jobs job
    where job.status in ('failed', 'cancelled', 'expired')
      and job.updated_at < p_now - make_interval(days => v_policy.failed_job_retention_days)
      and job.idempotency_expires_at < p_now;

    delete from public.processing_jobs job
    where job.status = 'succeeded'
      and job.completed_at < p_now - make_interval(days => v_policy.completed_job_retention_days)
      and job.idempotency_expires_at < p_now;

    delete from public.processing_job_sources source
    where not exists (
      select 1 from public.processing_jobs job
      where job.source_snapshot_id = source.id
    );
  end if;

  return jsonb_build_object(
    'dryRun', p_dry_run,
    'eventRows', v_event_count,
    'failedOrCancelledJobRows', v_failed_job_count,
    'completedJobRows', v_completed_job_count,
    'storageCleanupBacklog', (
      select count(*)
      from public.processing_cleanup_queue cleanup
      where cleanup.status in ('pending', 'failed')
        and cleanup.not_before <= p_now
    )
  );
end;
$$;

do $$
declare
  v_source record;
  v_document_id uuid;
  v_source_version_id uuid;
  v_extraction_result_id uuid;
  v_raw_source_version_id uuid;
  v_normalized_source_version_id uuid;
  v_raw_text text;
  v_normalized_text text;
  v_artifact_id uuid;
  v_artifact_version_id uuid;
begin
  for v_source in
    select source.*, job.id as job_id, job.job_type, job.status, job.result_id,
      job.request_fingerprint, job.created_at as job_created_at
    from public.processing_job_sources source
    join public.processing_jobs job on job.source_snapshot_id = source.id
    order by job.created_at
  loop
    if v_source.source_kind in ('pdf', 'image') then
      insert into public.document_assets (
        user_id,
        original_file_name,
        safe_display_name,
        mime_type,
        byte_size,
        content_sha256,
        storage_bucket,
        storage_object_path,
        upload_status,
        metadata,
        created_at
      ) values (
        v_source.user_id,
        v_source.display_name,
        v_source.display_name,
        v_source.mime_type,
        coalesce(v_source.byte_size, 1),
        null,
        v_source.storage_bucket,
        v_source.storage_object_path,
        'available',
        jsonb_build_object(
          'legacyBackfill', true,
          'reuseDisabledReason', 'legacy_content_hash_not_raw_bytes'
        ),
        v_source.created_at
      ) returning id into v_document_id;

      update public.processing_job_sources source
      set
        document_asset_id = v_document_id,
        parser_policy_version = 'document-parser-v1',
        ocr_policy_version = 'ocr-policy-v1',
        normalization_version = 'document-normalization-v1'
      where source.id = v_source.id;

      if v_source.status = 'succeeded' and v_source.result_id is not null then
        select
          coalesce(nullif(result.payload ->> 'rawText', ''), result.payload ->> 'text'),
          result.payload ->> 'text'
        into v_raw_text, v_normalized_text
        from public.processing_job_results result
        where result.id = v_source.result_id;

        if nullif(v_normalized_text, '') is not null then
          v_raw_text := coalesce(nullif(v_raw_text, ''), v_normalized_text);
          insert into public.extraction_results (
            user_id,
            document_asset_id,
            extraction_job_id,
            parser_policy_version,
            ocr_policy_version,
            normalization_version,
            status,
            raw_character_count,
            normalized_character_count,
            page_count,
            diagnostics,
            created_at
          ) values (
            v_source.user_id,
            v_document_id,
            v_source.job_id,
            'document-parser-v1',
            'ocr-policy-v1',
            'document-normalization-v1',
            'succeeded',
            char_length(v_raw_text),
            char_length(v_normalized_text),
            greatest(1, coalesce(v_source.page_count, 1)),
            jsonb_build_object('legacyBackfill', true),
            v_source.job_created_at
          ) returning id into v_extraction_result_id;

          insert into public.source_versions (
            user_id,
            document_asset_id,
            extraction_result_id,
            revision_kind,
            content_sha256,
            source_text,
            character_count,
            created_by,
            created_at
          ) values (
            v_source.user_id,
            v_document_id,
            v_extraction_result_id,
            'extracted_raw',
            encode(digest(convert_to(v_raw_text, 'UTF8'), 'sha256'), 'hex'),
            v_raw_text,
            char_length(v_raw_text),
            'system',
            v_source.job_created_at
          ) returning id into v_raw_source_version_id;

          insert into public.source_versions (
            user_id,
            document_asset_id,
            extraction_result_id,
            parent_source_version_id,
            revision_kind,
            content_sha256,
            source_text,
            character_count,
            normalization_version,
            created_by,
            created_at
          ) values (
            v_source.user_id,
            v_document_id,
            v_extraction_result_id,
            v_raw_source_version_id,
            'normalized',
            encode(digest(convert_to(v_normalized_text, 'UTF8'), 'sha256'), 'hex'),
            v_normalized_text,
            char_length(v_normalized_text),
            'document-normalization-v1',
            'system',
            v_source.job_created_at
          ) returning id into v_normalized_source_version_id;

          update public.extraction_results
          set
            raw_source_version_id = v_raw_source_version_id,
            normalized_source_version_id = v_normalized_source_version_id
          where id = v_extraction_result_id;

          update public.document_assets
          set
            latest_extraction_result_id = v_extraction_result_id,
            selected_source_version_id = v_normalized_source_version_id
          where id = v_document_id;

          update public.processing_job_sources
          set source_version_id = v_normalized_source_version_id
          where id = v_source.id;

          update public.processing_jobs
          set source_version_id = v_normalized_source_version_id
          where id = v_source.job_id;

          update public.processing_job_results
          set extraction_result_id = v_extraction_result_id
          where id = v_source.result_id;
        end if;
      end if;
    elsif v_source.source_kind = 'text' and nullif(btrim(v_source.source_text), '') is not null then
      insert into public.source_versions (
        user_id,
        revision_kind,
        content_sha256,
        source_text,
        character_count,
        normalization_version,
        created_by,
        metadata,
        created_at
      ) values (
        v_source.user_id,
        case
          when v_source.metadata ? 'reviewerSourceSnapshotId' then 'canvas_resolved'
          else 'imported_text'
        end,
        encode(digest(convert_to(v_source.source_text, 'UTF8'), 'sha256'), 'hex'),
        v_source.source_text,
        char_length(v_source.source_text),
        'engine-stage0-v1',
        'user',
        jsonb_build_object('legacyBackfill', true),
        v_source.created_at
      ) returning id into v_source_version_id;

      update public.processing_job_sources
      set
        source_version_id = v_source_version_id,
        content_sha256 = encode(digest(convert_to(v_source.source_text, 'UTF8'), 'sha256'), 'hex'),
        normalization_version = 'engine-stage0-v1'
      where id = v_source.id;

      update public.processing_jobs
      set
        source_version_id = v_source_version_id,
        artifact_type = case when job_type = 'reviewer_generation' then 'reviewer' else null end,
        generation_policy_version = case when job_type = 'reviewer_generation' then 'reviewer-policy-v1' else null end,
        engine_version = case when job_type = 'reviewer_generation' then 'engine-v1' else null end,
        schema_version = case when job_type = 'reviewer_generation' then 'reviewer-schema-v1' else null end,
        provider_id = case when job_type = 'reviewer_generation' then 'openai:gpt-4o' else null end,
        settings_fingerprint = case
          when job_type = 'reviewer_generation'
            then encode(digest(convert_to('reviewer|standard|auto|legacy', 'UTF8'), 'sha256'), 'hex')
          else null
        end,
        language = case when job_type = 'reviewer_generation' then 'auto' else null end,
        output_mode = case when job_type = 'reviewer_generation' then 'standard' else null end
      where id = v_source.job_id;

      if v_source.status = 'succeeded' and v_source.result_id is not null then
        insert into public.generated_artifacts (
          user_id,
          artifact_type,
          safe_title,
          source_version_id,
          metadata,
          created_at
        )
        select
          v_source.user_id,
          'reviewer',
          left(coalesce(nullif(btrim(result.payload #>> '{reviewer,title}'), ''), v_source.display_name), 180),
          v_source_version_id,
          jsonb_build_object('legacyBackfill', true),
          result.created_at
        from public.processing_job_results result
        where result.id = v_source.result_id
        returning id into v_artifact_id;

        insert into public.generated_artifact_versions (
          user_id,
          artifact_id,
          version_number,
          source_version_id,
          source_content_sha256,
          artifact_type,
          payload,
          generation_policy_version,
          engine_version,
          schema_version,
          provider_id,
          settings_fingerprint,
          generation_job_id,
          created_at
        )
        select
          v_source.user_id,
          v_artifact_id,
          1,
          v_source_version_id,
          encode(digest(convert_to(v_source.source_text, 'UTF8'), 'sha256'), 'hex'),
          'reviewer',
          result.payload,
          'reviewer-policy-v1',
          'engine-v1',
          'reviewer-schema-v1',
          'openai:gpt-4o',
          encode(digest(convert_to('reviewer|standard|auto|legacy', 'UTF8'), 'sha256'), 'hex'),
          v_source.job_id,
          result.created_at
        from public.processing_job_results result
        where result.id = v_source.result_id
        returning id into v_artifact_version_id;

        update public.generated_artifacts
        set latest_version_id = v_artifact_version_id
        where id = v_artifact_id;

        update public.processing_job_results
        set artifact_version_id = v_artifact_version_id
        where id = v_source.result_id;

        update public.processing_job_events
        set
          artifact_version_id = v_artifact_version_id,
          safe_label = 'Reviewer ready'
        where job_id = v_source.job_id
          and event_type = 'job_succeeded';
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.reject_immutable_processing_version_update()
  from public, anon, authenticated;
revoke all on function public.create_processing_job_v2(
  uuid, text, text, text, text, text, text, text, text, text,
  bigint, integer, integer, jsonb, jsonb, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_processing_job_v2(
  uuid, text, text, text, text, text, text, text, text, text,
  bigint, integer, integer, jsonb, jsonb, jsonb, timestamptz
) to service_role;

revoke all on function public.claim_processing_jobs_v2(text, text[], integer, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_processing_jobs_v2(text, text[], integer, integer, timestamptz)
  to service_role;

revoke all on function public.complete_processing_job_v2(
  uuid, text, text, jsonb, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.complete_processing_job_v2(
  uuid, text, text, jsonb, jsonb, timestamptz
) to service_role;

revoke all on function public.create_source_version_revision(
  uuid, uuid, text, text, boolean, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_source_version_revision(
  uuid, uuid, text, text, boolean, timestamptz
) to service_role;

revoke all on function public.soft_delete_document_asset(
  uuid, uuid, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.soft_delete_document_asset(
  uuid, uuid, text, timestamptz
) to service_role;

revoke all on function public.queue_processing_content_for_account_deletion()
  from public, anon, authenticated;

revoke all on function public.run_processing_lifecycle_cleanup(
  timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.run_processing_lifecycle_cleanup(
  timestamptz, boolean
) to service_role;
