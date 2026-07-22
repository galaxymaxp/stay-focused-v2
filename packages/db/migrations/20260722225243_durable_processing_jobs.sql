create extension if not exists pgcrypto;

create table public.processing_job_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null,
  display_name text not null,
  mime_type text not null,
  storage_bucket text,
  storage_object_path text,
  source_text text,
  byte_size bigint,
  source_character_count integer,
  page_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint processing_job_sources_owner_unique unique (id, user_id),
  constraint processing_job_sources_kind_check
    check (source_kind in ('pdf', 'image', 'text')),
  constraint processing_job_sources_display_name_check
    check (char_length(btrim(display_name)) between 1 and 180),
  constraint processing_job_sources_mime_type_check
    check (char_length(btrim(mime_type)) between 1 and 120),
  constraint processing_job_sources_location_check check (
    (
      source_kind = 'text'
      and source_text is not null
      and storage_bucket is null
      and storage_object_path is null
    )
    or (
      source_kind in ('pdf', 'image')
      and source_text is null
      and storage_bucket is not null
      and storage_object_path is not null
    )
  ),
  constraint processing_job_sources_byte_size_check
    check (byte_size is null or byte_size > 0),
  constraint processing_job_sources_character_count_check
    check (source_character_count is null or source_character_count >= 0),
  constraint processing_job_sources_page_count_check
    check (page_count is null or page_count > 0),
  constraint processing_job_sources_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  stage text not null,
  status_message text not null default 'Waiting to start',
  completed_units integer,
  total_units integer,
  unit_label text,
  source_metadata jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  source_snapshot_id uuid not null,
  result_id uuid,
  idempotency_key text not null,
  request_fingerprint text not null,
  idempotency_expires_at timestamptz not null default (now() + interval '30 days'),
  retry_of_job_id uuid,
  created_at timestamptz not null default now(),
  accepted_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  cancellation_requested_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  error_code text,
  safe_error_message text,
  retryable boolean not null default false,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  constraint processing_jobs_owner_unique unique (id, user_id),
  constraint processing_jobs_idempotency_unique unique (user_id, idempotency_key),
  constraint processing_jobs_source_owner_fkey
    foreign key (source_snapshot_id, user_id)
    references public.processing_job_sources(id, user_id)
    on delete restrict,
  constraint processing_jobs_retry_parent_fkey
    foreign key (retry_of_job_id)
    references public.processing_jobs(id)
    on delete set null,
  constraint processing_jobs_type_check
    check (job_type in ('document_extraction', 'reviewer_generation')),
  constraint processing_jobs_status_check check (
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
  constraint processing_jobs_stage_check check (
    stage in (
      'accepting_upload',
      'inspecting_document',
      'extracting_native_text',
      'preparing_ocr_chunks',
      'extracting_ocr',
      'verifying_pages',
      'assembling_text',
      'storing_result',
      'preparing_source',
      'normalizing_source',
      'detecting_outline',
      'planning_sections',
      'generating_sections',
      'verifying_coverage',
      'retrying_sections',
      'assembling_reviewer',
      'storing_reviewer'
    )
  ),
  constraint processing_jobs_stage_matches_type_check check (
    (
      job_type = 'document_extraction'
      and stage in (
        'accepting_upload',
        'inspecting_document',
        'extracting_native_text',
        'preparing_ocr_chunks',
        'extracting_ocr',
        'verifying_pages',
        'assembling_text',
        'storing_result'
      )
    )
    or (
      job_type = 'reviewer_generation'
      and stage in (
        'preparing_source',
        'normalizing_source',
        'detecting_outline',
        'planning_sections',
        'generating_sections',
        'verifying_coverage',
        'retrying_sections',
        'assembling_reviewer',
        'storing_reviewer'
      )
    )
  ),
  constraint processing_jobs_status_message_check
    check (char_length(btrim(status_message)) between 1 and 240),
  constraint processing_jobs_progress_check check (
    (completed_units is null and total_units is null and unit_label is null)
    or (
      completed_units is not null
      and total_units is not null
      and unit_label in ('pages', 'sections')
      and completed_units >= 0
      and total_units >= 0
      and completed_units <= total_units
    )
  ),
  constraint processing_jobs_source_metadata_object_check
    check (jsonb_typeof(source_metadata) = 'object'),
  constraint processing_jobs_metrics_object_check
    check (jsonb_typeof(metrics) = 'object'),
  constraint processing_jobs_idempotency_key_check
    check (char_length(idempotency_key) between 8 and 200),
  constraint processing_jobs_request_fingerprint_check
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint processing_jobs_attempts_check
    check (attempt_count >= 0 and max_attempts between 1 and 10),
  constraint processing_jobs_error_code_check
    check (
      error_code is null
      or (
        error_code ~ '^[a-z0-9_]+$'
        and char_length(error_code) <= 80
      )
    ),
  constraint processing_jobs_safe_error_message_check
    check (safe_error_message is null or char_length(safe_error_message) <= 300),
  constraint processing_jobs_lease_pair_check check (
    (lease_owner is null and lease_expires_at is null)
    or (lease_owner is not null and lease_expires_at is not null)
  ),
  constraint processing_jobs_result_status_check
    check (result_id is null or status = 'succeeded')
);

create table public.processing_job_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_snapshot_id uuid not null,
  result_type text not null,
  payload jsonb not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint processing_job_results_job_unique unique (job_id),
  constraint processing_job_results_owner_unique unique (id, user_id),
  constraint processing_job_results_job_owner_fkey
    foreign key (job_id, user_id)
    references public.processing_jobs(id, user_id)
    on delete cascade,
  constraint processing_job_results_source_owner_fkey
    foreign key (source_snapshot_id, user_id)
    references public.processing_job_sources(id, user_id)
    on delete restrict,
  constraint processing_job_results_type_check
    check (result_type in ('document_extraction', 'reviewer_generation')),
  constraint processing_job_results_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  constraint processing_job_results_metrics_object_check
    check (jsonb_typeof(metrics) = 'object')
);

alter table public.processing_jobs
  add constraint processing_jobs_result_owner_fkey
  foreign key (result_id, user_id)
  references public.processing_job_results(id, user_id)
  on delete restrict;

create table public.processing_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  constraint processing_job_events_job_owner_fkey
    foreign key (job_id, user_id)
    references public.processing_jobs(id, user_id)
    on delete cascade,
  constraint processing_job_events_type_check check (
    event_type in (
      'job_succeeded',
      'job_failed',
      'job_cancelled',
      'job_expired'
    )
  ),
  constraint processing_job_events_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

create index processing_jobs_queue_claim_idx
  on public.processing_jobs (next_attempt_at, created_at)
  where status = 'queued';

create index processing_jobs_active_owner_idx
  on public.processing_jobs (user_id, updated_at desc)
  where status in ('queued', 'running', 'cancellation_requested');

create index processing_jobs_stale_lease_idx
  on public.processing_jobs (lease_expires_at)
  where status in ('running', 'cancellation_requested');

create index processing_jobs_expiry_idx
  on public.processing_jobs (expires_at)
  where status in ('queued', 'running', 'cancellation_requested');

create index processing_job_events_delivery_idx
  on public.processing_job_events (created_at)
  where delivered_at is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'processing-job-sources',
  'processing-job-sources',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.processing_job_sources enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.processing_job_results enable row level security;
alter table public.processing_job_events enable row level security;

revoke all on table public.processing_job_sources from anon, authenticated;
revoke all on table public.processing_jobs from anon, authenticated;
revoke all on table public.processing_job_results from anon, authenticated;
revoke all on table public.processing_job_events from anon, authenticated;

grant select on table public.processing_jobs to authenticated;

create policy processing_jobs_select_own
on public.processing_jobs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy processing_job_sources_select_own
on public.processing_job_sources
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy processing_job_results_select_own
on public.processing_job_results
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy processing_job_events_select_own
on public.processing_job_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_processing_job_updated_at()
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

create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute function public.set_processing_job_updated_at();

create or replace function public.create_processing_job(
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
  p_expires_at timestamptz default null
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_existing public.processing_jobs%rowtype;
  v_job public.processing_jobs%rowtype;
  v_source_id uuid;
  v_stage text;
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

  v_stage := case
    when p_job_type = 'document_extraction' then 'inspecting_document'
    else 'preparing_source'
  end;

  begin
    insert into public.processing_job_sources (
      user_id,
      source_kind,
      display_name,
      mime_type,
      storage_bucket,
      storage_object_path,
      source_text,
      byte_size,
      source_character_count,
      page_count,
      metadata
    ) values (
      p_user_id,
      p_source_kind,
      p_display_name,
      p_mime_type,
      nullif(btrim(p_storage_bucket), ''),
      nullif(btrim(p_storage_object_path), ''),
      p_source_text,
      p_byte_size,
      p_source_character_count,
      p_page_count,
      coalesce(p_source_private_metadata, '{}'::jsonb)
    ) returning id into v_source_id;

    insert into public.processing_jobs (
      user_id,
      job_type,
      status,
      stage,
      status_message,
      source_metadata,
      source_snapshot_id,
      idempotency_key,
      request_fingerprint,
      expires_at
    ) values (
      p_user_id,
      p_job_type,
      'queued',
      v_stage,
      'Waiting to start',
      coalesce(p_source_metadata, '{}'::jsonb),
      v_source_id,
      p_idempotency_key,
      p_request_fingerprint,
      coalesce(p_expires_at, now() + interval '24 hours')
    ) returning * into v_job;
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
    v_job := v_existing;
  end;

  return next v_job;
end;
$$;

create or replace function public.claim_processing_jobs(
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
begin
  if nullif(btrim(p_worker_id), '') is null
    or char_length(p_worker_id) > 160
    or p_limit not between 1 and 20
    or p_lease_seconds not between 30 and 900
    or p_job_types is null
    or cardinality(p_job_types) = 0 then
    raise exception using errcode = 'P0001', message = 'processing_job_claim_invalid';
  end if;

  return query
  with candidates as (
    select job.id
    from public.processing_jobs job
    where job.status = 'queued'
      and job.job_type = any(p_job_types)
      and job.next_attempt_at <= p_now
      and job.expires_at > p_now
      and job.attempt_count < job.max_attempts
    order by job.next_attempt_at, job.created_at
    for update skip locked
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

create or replace function public.heartbeat_processing_job(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 90,
  p_now timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_lease_seconds not between 30 and 900 then
    raise exception using errcode = 'P0001', message = 'processing_job_heartbeat_invalid';
  end if;

  return query
  update public.processing_jobs job
  set
    heartbeat_at = p_now,
    lease_expires_at = p_now + make_interval(secs => p_lease_seconds)
  where job.id = p_job_id
    and job.lease_owner = p_worker_id
    and job.status in ('running', 'cancellation_requested')
  returning job.*;
end;
$$;

create or replace function public.update_processing_job_progress(
  p_job_id uuid,
  p_worker_id text,
  p_stage text,
  p_status_message text,
  p_completed_units integer default null,
  p_total_units integer default null,
  p_unit_label text default null,
  p_metrics jsonb default '{}'::jsonb
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  update public.processing_jobs job
  set
    stage = p_stage,
    status_message = p_status_message,
    completed_units = p_completed_units,
    total_units = p_total_units,
    unit_label = p_unit_label,
    metrics = job.metrics || coalesce(p_metrics, '{}'::jsonb)
  where job.id = p_job_id
    and job.lease_owner = p_worker_id
    and job.status = 'running'
    and job.lease_expires_at > now()
  returning job.*;
end;
$$;

create or replace function public.complete_processing_job(
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
  v_result_id uuid;
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

  insert into public.processing_job_results (
    job_id,
    user_id,
    source_snapshot_id,
    result_type,
    payload,
    metrics
  ) values (
    v_job.id,
    v_job.user_id,
    v_job.source_snapshot_id,
    p_result_type,
    p_payload,
    coalesce(p_metrics, '{}'::jsonb)
  ) returning id into v_result_id;

  update public.processing_jobs job
  set
    status = 'succeeded',
    status_message = 'Complete',
    completed_at = p_completed_at,
    result_id = v_result_id,
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

  insert into public.processing_job_events (job_id, user_id, event_type, payload)
  values (
    v_job.id,
    v_job.user_id,
    'job_succeeded',
    jsonb_build_object('jobType', v_job.job_type)
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

    insert into public.processing_job_events (job_id, user_id, event_type)
    values (v_job.id, v_job.user_id, 'job_cancelled');
    return next v_job;
    return;
  end if;

  v_should_retry :=
    coalesce(p_retryable, false)
    and v_job.attempt_count < v_job.max_attempts
    and v_job.expires_at > p_failed_at;

  update public.processing_jobs job
  set
    status = case when v_should_retry then 'queued' else 'failed' end,
    status_message = case
      when v_should_retry then 'Waiting to retry'
      else 'Needs attention'
    end,
    next_attempt_at = case
      when v_should_retry then p_failed_at + make_interval(
        secs => least(300, (5 * power(2, greatest(job.attempt_count - 1, 0)))::integer)
      )
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
    insert into public.processing_job_events (job_id, user_id, event_type, payload)
    values (
      v_job.id,
      v_job.user_id,
      'job_failed',
      jsonb_build_object('errorCode', p_error_code, 'retryable', p_retryable)
    );
  end if;

  return next v_job;
end;
$$;

create or replace function public.request_processing_job_cancellation(
  p_user_id uuid,
  p_job_id uuid,
  p_requested_at timestamptz default now()
)
returns setof public.processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.processing_jobs%rowtype;
begin
  select * into v_job
  from public.processing_jobs job
  where job.id = p_job_id
    and job.user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if v_job.status = 'queued' then
    update public.processing_jobs job
    set
      status = 'cancelled',
      status_message = 'Cancelled',
      cancellation_requested_at = coalesce(job.cancellation_requested_at, p_requested_at),
      retryable = false
    where job.id = v_job.id
    returning * into v_job;

    insert into public.processing_job_events (job_id, user_id, event_type)
    values (v_job.id, v_job.user_id, 'job_cancelled');
  elsif v_job.status = 'running' then
    update public.processing_jobs job
    set
      status = 'cancellation_requested',
      status_message = 'Stopping safely',
      cancellation_requested_at = coalesce(job.cancellation_requested_at, p_requested_at)
    where job.id = v_job.id
    returning * into v_job;
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

  insert into public.processing_jobs (
    user_id,
    job_type,
    status,
    stage,
    status_message,
    source_metadata,
    source_snapshot_id,
    idempotency_key,
    request_fingerprint,
    retry_of_job_id,
    created_at,
    accepted_at,
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
    p_idempotency_key,
    v_original.request_fingerprint,
    v_original.id,
    p_requested_at,
    p_requested_at,
    p_requested_at + interval '24 hours'
  ) returning * into v_retry;

  return next v_retry;
end;
$$;

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
    where job.status = 'cancellation_requested'
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
    where job.status = 'running'
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
  where job.status = 'running'
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
    where job.status in ('queued', 'running')
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

revoke all on function public.set_processing_job_updated_at() from public, anon, authenticated;

revoke all on function public.create_processing_job(
  uuid, text, text, text, text, text, text, text, text, text,
  bigint, integer, integer, jsonb, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_processing_job(
  uuid, text, text, text, text, text, text, text, text, text,
  bigint, integer, integer, jsonb, jsonb, timestamptz
) to service_role;

revoke all on function public.claim_processing_jobs(text, text[], integer, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_processing_jobs(text, text[], integer, integer, timestamptz)
  to service_role;

revoke all on function public.heartbeat_processing_job(uuid, text, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.heartbeat_processing_job(uuid, text, integer, timestamptz)
  to service_role;

revoke all on function public.update_processing_job_progress(
  uuid, text, text, text, integer, integer, text, jsonb
) from public, anon, authenticated;
grant execute on function public.update_processing_job_progress(
  uuid, text, text, text, integer, integer, text, jsonb
) to service_role;

revoke all on function public.complete_processing_job(
  uuid, text, text, jsonb, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.complete_processing_job(
  uuid, text, text, jsonb, jsonb, timestamptz
) to service_role;

revoke all on function public.fail_processing_job(
  uuid, text, text, text, boolean, timestamptz
) from public, anon, authenticated;
grant execute on function public.fail_processing_job(
  uuid, text, text, text, boolean, timestamptz
) to service_role;

revoke all on function public.request_processing_job_cancellation(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.request_processing_job_cancellation(uuid, uuid, timestamptz)
  to service_role;

revoke all on function public.retry_processing_job(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.retry_processing_job(uuid, uuid, text, timestamptz)
  to service_role;

revoke all on function public.recover_stale_processing_jobs(timestamptz)
  from public, anon, authenticated;
grant execute on function public.recover_stale_processing_jobs(timestamptz)
  to service_role;
