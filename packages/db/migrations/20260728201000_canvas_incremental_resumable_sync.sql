alter table public.canvas_sync_jobs
  add column if not exists progress_total_known boolean not null default false,
  add column if not exists checkpoint_version text,
  add column if not exists deadline_at timestamptz,
  add column if not exists result_outcome text;

update public.canvas_sync_jobs
set
  progress_total_known = total_units is not null,
  deadline_at = coalesce(deadline_at, accepted_at + interval '30 minutes'),
  result_outcome = case
    when status = 'succeeded' then case
      when result_summary ->> 'outcome' = 'unchanged' then 'unchanged'
      when result_summary ->> 'outcome' = 'partial' then 'partial'
      else 'success'
    end
    when status = 'failed' then 'failed'
    when status = 'cancelled' then 'cancelled'
    else null
  end;

alter table public.canvas_sync_jobs
  alter column deadline_at set default (now() + interval '30 minutes');

alter table public.canvas_sync_jobs
  drop constraint if exists canvas_sync_jobs_stage_matches_type,
  drop constraint if exists canvas_sync_jobs_stage_allowed,
  drop constraint if exists canvas_sync_jobs_progress_consistent;

alter table public.canvas_sync_jobs
  add constraint canvas_sync_jobs_stage_allowed
  check (
    stage in (
      'waiting_to_start',
      'preparing_course',
      'planning_sync',
      'fetching_pages',
      'reading_item_details',
      'checking_changes',
      'promoting_scopes',
      'synchronizing_content',
      'synchronizing_grades',
      'storing_result',
      'complete'
    )
  ),
  add constraint canvas_sync_jobs_stage_matches_type
  check (
    stage in (
      'waiting_to_start',
      'preparing_course',
      'planning_sync',
      'fetching_pages',
      'reading_item_details',
      'checking_changes',
      'promoting_scopes',
      'storing_result',
      'complete'
    )
    or (job_type = 'course_content' and stage = 'synchronizing_content')
    or (job_type = 'course_grades' and stage = 'synchronizing_grades')
  ),
  add constraint canvas_sync_jobs_progress_consistent
  check (
    (
      completed_units is null
      and total_units is null
      and unit_label is null
      and not progress_total_known
    )
    or (
      completed_units is not null
      and completed_units >= 0
      and unit_label = 'operations'
      and (
        (
          total_units is null
          and not progress_total_known
        )
        or (
          total_units is not null
          and total_units >= completed_units
          and progress_total_known
        )
      )
    )
  ),
  add constraint canvas_sync_jobs_checkpoint_version_safe
  check (
    checkpoint_version is null
    or (
      checkpoint_version ~ '^[a-z0-9._-]+$'
      and char_length(checkpoint_version) between 3 and 80
    )
  ),
  add constraint canvas_sync_jobs_deadline_valid
  check (deadline_at is null or deadline_at >= accepted_at),
  add constraint canvas_sync_jobs_result_outcome_allowed
  check (
    result_outcome is null
    or result_outcome in (
      'success',
      'unchanged',
      'partial',
      'failed',
      'cancelled'
    )
  );

create table public.canvas_sync_job_units (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  unit_key text not null,
  unit_kind text not null,
  scope text not null,
  status text not null default 'queued',
  page_index integer not null default 0,
  is_discovery boolean not null default false,
  checkpoint jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  max_attempts integer not null default 4,
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  safe_error_code text,
  safe_error_message text,
  retryable boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_sync_job_units_job_owner_fkey
    foreign key (job_id, user_id)
    references public.canvas_sync_jobs (id, user_id)
    on delete cascade,
  constraint canvas_sync_job_units_connection_owner_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_sync_job_units_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_sync_job_units_job_key_unique unique (job_id, unit_key),
  constraint canvas_sync_job_units_key_safe
    check (unit_key ~ '^[a-f0-9]{64}$'),
  constraint canvas_sync_job_units_kind_allowed
    check (
      unit_kind in (
        'modules_page',
        'module_items_page',
        'pages_page',
        'page_detail',
        'page_detail_reuse',
        'assignment_groups_page',
        'assignments_page',
        'announcements_page',
        'files_page',
        'grade_assignments_page',
        'submissions_page',
        'grade_summary_page'
      )
    ),
  constraint canvas_sync_job_units_scope_allowed
    check (scope in ('content', 'announcements', 'files', 'grades')),
  constraint canvas_sync_job_units_status_allowed
    check (
      status in (
        'queued',
        'running',
        'retry_wait',
        'succeeded',
        'failed',
        'cancelled',
        'skipped'
      )
    ),
  constraint canvas_sync_job_units_page_index_valid check (page_index >= 0),
  constraint canvas_sync_job_units_attempts_valid
    check (attempt_count >= 0 and max_attempts between 1 and 10),
  constraint canvas_sync_job_units_checkpoint_object
    check (jsonb_typeof(checkpoint) = 'object'),
  constraint canvas_sync_job_units_lease_consistent
    check (
      (status = 'running' and lease_owner is not null and lease_expires_at is not null)
      or (status <> 'running' and lease_owner is null and lease_expires_at is null)
    ),
  constraint canvas_sync_job_units_error_code_safe
    check (
      safe_error_code is null
      or (
        safe_error_code ~ '^[a-z0-9_]+$'
        and char_length(safe_error_code) <= 80
      )
    ),
  constraint canvas_sync_job_units_error_message_safe
    check (
      safe_error_message is null
      or char_length(safe_error_message) <= 300
    )
);

create index canvas_sync_job_units_claim_idx
  on public.canvas_sync_job_units (
    canvas_connection_id,
    status,
    available_at,
    created_at
  );
create index canvas_sync_job_units_job_status_idx
  on public.canvas_sync_job_units (job_id, status, created_at);
create index canvas_sync_job_units_expired_lease_idx
  on public.canvas_sync_job_units (lease_expires_at)
  where status = 'running';

create table public.canvas_sync_job_staging (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  unit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  payload_kind text not null,
  payload jsonb not null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_sync_job_staging_job_owner_fkey
    foreign key (job_id, user_id)
    references public.canvas_sync_jobs (id, user_id)
    on delete cascade,
  constraint canvas_sync_job_staging_unit_fkey
    foreign key (unit_id)
    references public.canvas_sync_job_units (id)
    on delete cascade,
  constraint canvas_sync_job_staging_unit_unique unique (unit_id),
  constraint canvas_sync_job_staging_scope_allowed
    check (scope in ('content', 'announcements', 'files', 'grades')),
  constraint canvas_sync_job_staging_payload_kind_safe
    check (
      payload_kind ~ '^[a-z0-9_]+$'
      and char_length(payload_kind) between 3 and 80
    ),
  constraint canvas_sync_job_staging_payload_valid
    check (jsonb_typeof(payload) in ('object', 'array'))
);

create index canvas_sync_job_staging_job_scope_idx
  on public.canvas_sync_job_staging (job_id, scope, created_at);
create index canvas_sync_job_staging_expiry_idx
  on public.canvas_sync_job_staging (expires_at);

create table public.canvas_course_sync_scope_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  scope text not null,
  health_status text not null default 'not_synced',
  last_job_id uuid,
  last_checked_at timestamptz,
  last_successful_at timestamptz,
  synced_count integer not null default 0,
  metadata_only_count integer not null default 0,
  temporarily_failed_count integer not null default 0,
  stale_count integer not null default 0,
  deleted_count integer not null default 0,
  safe_message text,
  safe_error_code text,
  retryable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_course_sync_scope_states_connection_owner_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_course_sync_scope_states_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_course_sync_scope_states_job_fkey
    foreign key (last_job_id)
    references public.canvas_sync_jobs (id)
    on delete set null,
  constraint canvas_course_sync_scope_states_identity_unique
    unique (user_id, canvas_connection_id, course_id, scope),
  constraint canvas_course_sync_scope_states_scope_allowed
    check (scope in ('content', 'announcements', 'files', 'grades')),
  constraint canvas_course_sync_scope_states_health_allowed
    check (
      health_status in (
        'not_synced',
        'syncing',
        'healthy',
        'partial',
        'stale',
        'failed'
      )
    ),
  constraint canvas_course_sync_scope_states_counts_valid
    check (
      synced_count >= 0
      and metadata_only_count >= 0
      and temporarily_failed_count >= 0
      and stale_count >= 0
      and deleted_count >= 0
    ),
  constraint canvas_course_sync_scope_states_message_safe
    check (safe_message is null or char_length(safe_message) <= 240),
  constraint canvas_course_sync_scope_states_error_code_safe
    check (
      safe_error_code is null
      or (
        safe_error_code ~ '^[a-z0-9_]+$'
        and char_length(safe_error_code) <= 80
      )
    )
);

create index canvas_course_sync_scope_states_user_course_idx
  on public.canvas_course_sync_scope_states (user_id, course_id, scope);

create table public.canvas_course_item_sync_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  scope text not null,
  item_kind text not null,
  item_key_hash text not null,
  item_state text not null default 'discovered',
  source_updated_at timestamptz,
  source_fingerprint text,
  last_seen_job_id uuid,
  last_seen_at timestamptz not null default now(),
  last_successful_at timestamptz,
  safe_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_course_item_sync_states_connection_owner_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_course_item_sync_states_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_course_item_sync_states_job_fkey
    foreign key (last_seen_job_id)
    references public.canvas_sync_jobs (id)
    on delete set null,
  constraint canvas_course_item_sync_states_identity_unique
    unique (
      user_id,
      canvas_connection_id,
      course_id,
      scope,
      item_kind,
      item_key_hash
    ),
  constraint canvas_course_item_sync_states_scope_allowed
    check (scope in ('content', 'announcements', 'files', 'grades')),
  constraint canvas_course_item_sync_states_kind_safe
    check (
      item_kind ~ '^[a-z0-9_]+$'
      and char_length(item_kind) between 3 and 80
    ),
  constraint canvas_course_item_sync_states_key_safe
    check (item_key_hash ~ '^[a-f0-9]{64}$'),
  constraint canvas_course_item_sync_states_state_allowed
    check (
      item_state in (
        'discovered',
        'synced',
        'metadata_only',
        'locked',
        'unpublished',
        'permission_denied',
        'external',
        'unsupported_format',
        'download_failed',
        'parse_failed',
        'ocr_failed',
        'stale',
        'deleted_from_canvas',
        'temporarily_failed'
      )
    ),
  constraint canvas_course_item_sync_states_fingerprint_safe
    check (
      source_fingerprint is null
      or source_fingerprint ~ '^[a-f0-9]{64}$'
    ),
  constraint canvas_course_item_sync_states_error_code_safe
    check (
      safe_error_code is null
      or (
        safe_error_code ~ '^[a-z0-9_]+$'
        and char_length(safe_error_code) <= 80
      )
    )
);

create index canvas_course_item_sync_states_lookup_idx
  on public.canvas_course_item_sync_states (
    user_id,
    course_id,
    scope,
    item_kind,
    item_key_hash
  );
create index canvas_course_item_sync_states_last_seen_idx
  on public.canvas_course_item_sync_states (last_seen_job_id, item_state);

create or replace function public.set_canvas_sync_checkpoint_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger canvas_sync_job_units_set_updated_at
before update on public.canvas_sync_job_units
for each row execute function public.set_canvas_sync_checkpoint_updated_at();

create trigger canvas_sync_job_staging_set_updated_at
before update on public.canvas_sync_job_staging
for each row execute function public.set_canvas_sync_checkpoint_updated_at();

create trigger canvas_course_sync_scope_states_set_updated_at
before update on public.canvas_course_sync_scope_states
for each row execute function public.set_canvas_sync_checkpoint_updated_at();

create trigger canvas_course_item_sync_states_set_updated_at
before update on public.canvas_course_item_sync_states
for each row execute function public.set_canvas_sync_checkpoint_updated_at();

alter table public.canvas_sync_job_units enable row level security;
alter table public.canvas_sync_job_staging enable row level security;
alter table public.canvas_course_sync_scope_states enable row level security;
alter table public.canvas_course_item_sync_states enable row level security;

revoke all on table public.canvas_sync_job_units from public, anon, authenticated;
revoke all on table public.canvas_sync_job_staging from public, anon, authenticated;
revoke all on table public.canvas_course_sync_scope_states from public, anon, authenticated;
revoke all on table public.canvas_course_item_sync_states from public, anon, authenticated;

grant select, insert, update, delete on table public.canvas_sync_job_units
  to service_role;
grant select, insert, update, delete on table public.canvas_sync_job_staging
  to service_role;
grant select, insert, update, delete on table public.canvas_course_sync_scope_states
  to service_role;
grant select, insert, update, delete on table public.canvas_course_item_sync_states
  to service_role;

create or replace function public.purge_expired_canvas_sync_staging_v2(
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage_ids uuid[];
  v_job_ids uuid[];
begin
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_purge_limit_invalid';
  end if;

  select
    array_agg(expired.id),
    array_agg(distinct expired.job_id)
  into v_stage_ids, v_job_ids
  from (
    select stage.id, stage.job_id
    from public.canvas_sync_job_staging stage
    where stage.expires_at <= now()
    order by stage.expires_at, stage.id
    for update skip locked
    limit p_limit
  ) expired;

  if coalesce(cardinality(v_stage_ids), 0) = 0 then
    return 0;
  end if;

  update public.canvas_sync_jobs job
  set checkpoint_version = 'expired'
  where job.id = any(v_job_ids)
    and job.status = 'failed';

  update public.canvas_sync_job_units unit
  set checkpoint = '{}'::jsonb
  where unit.job_id = any(v_job_ids);

  delete from public.canvas_sync_job_staging stage
  where stage.id = any(v_stage_ids);
  return cardinality(v_stage_ids);
end;
$$;

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
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
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

create or replace function public.initialize_canvas_sync_job_plan_v2(
  p_job_id uuid,
  p_worker_id text,
  p_checkpoint_version text,
  p_units jsonb
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
  v_unit jsonb;
begin
  if jsonb_typeof(p_units) is distinct from 'array'
    or p_checkpoint_version !~ '^[a-z0-9._-]+$'
    or char_length(p_checkpoint_version) not between 3 and 80 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_plan_invalid';
  end if;

  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.worker_id = p_worker_id
    and job.status in ('running', 'cancellation_requested')
  for update;

  if not found then
    return;
  end if;

  perform public.purge_expired_canvas_sync_staging_v2(500);

  if v_job.checkpoint_version is not null
    and v_job.checkpoint_version <> p_checkpoint_version then
    delete from public.canvas_sync_job_staging stage where stage.job_id = p_job_id;
    delete from public.canvas_sync_job_units unit where unit.job_id = p_job_id;
  end if;

  for v_unit in select value from jsonb_array_elements(p_units)
  loop
    insert into public.canvas_sync_job_units (
      job_id,
      user_id,
      canvas_connection_id,
      course_id,
      unit_key,
      unit_kind,
      scope,
      page_index,
      is_discovery,
      checkpoint
    )
    values (
      v_job.id,
      v_job.user_id,
      v_job.canvas_connection_id,
      v_job.course_id,
      v_unit ->> 'unitKey',
      v_unit ->> 'unitKind',
      v_unit ->> 'scope',
      coalesce((v_unit ->> 'pageIndex')::integer, 0),
      coalesce((v_unit ->> 'isDiscovery')::boolean, false),
      coalesce(v_unit -> 'checkpoint', '{}'::jsonb)
    )
    on conflict (job_id, unit_key) do nothing;
  end loop;

  update public.canvas_course_sync_scope_states state
  set
    health_status = 'syncing',
    last_job_id = v_job.id,
    last_checked_at = now(),
    safe_message = null,
    safe_error_code = null,
    retryable = false
  where state.user_id = v_job.user_id
    and state.canvas_connection_id = v_job.canvas_connection_id
    and state.course_id = v_job.course_id
    and (
      (v_job.job_type = 'course_content' and state.scope in ('content', 'announcements', 'files'))
      or (v_job.job_type = 'course_grades' and state.scope = 'grades')
    );

  insert into public.canvas_course_sync_scope_states (
    user_id,
    canvas_connection_id,
    course_id,
    scope,
    health_status,
    last_job_id,
    last_checked_at
  )
  select
    v_job.user_id,
    v_job.canvas_connection_id,
    v_job.course_id,
    scope_name,
    'syncing',
    v_job.id,
    now()
  from unnest(
    case
      when v_job.job_type = 'course_content'
        then array['content', 'announcements', 'files']::text[]
      else array['grades']::text[]
    end
  ) as scope_name
  on conflict (user_id, canvas_connection_id, course_id, scope)
  do update set
    health_status = 'syncing',
    last_job_id = excluded.last_job_id,
    last_checked_at = excluded.last_checked_at,
    safe_message = null,
    safe_error_code = null,
    retryable = false;

  update public.canvas_sync_jobs job
  set
    checkpoint_version = p_checkpoint_version,
    stage = 'planning_sync',
    status_message = 'Planning Canvas synchronization',
    completed_units = (
      select count(*)::integer
      from public.canvas_sync_job_units unit
      where unit.job_id = p_job_id
        and unit.status in ('succeeded', 'failed', 'cancelled', 'skipped')
    ),
    total_units = null,
    progress_total_known = false,
    unit_label = 'operations',
    deadline_at = coalesce(job.deadline_at, now() + interval '30 minutes')
  where job.id = p_job_id
  returning * into v_job;

  return next v_job;
end;
$$;

create or replace function public.claim_canvas_sync_job_units_v2(
  p_job_id uuid,
  p_worker_id text,
  p_limit integer default 3,
  p_lease_seconds integer default 90
)
returns setof public.canvas_sync_job_units
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_id uuid;
  v_job_type text;
  v_active integer;
  v_capacity integer;
begin
  if p_limit is null or p_limit < 1 or p_limit > 3
    or p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 300 then
    raise exception using errcode = 'P0001', message = 'canvas_sync_claim_invalid';
  end if;

  select job.canvas_connection_id, job.job_type
  into v_connection_id, v_job_type
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.worker_id = p_worker_id
    and job.status = 'running';

  if not found then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_connection_id::text, 0));

  update public.canvas_sync_job_units unit
  set
    status = 'queued',
    lease_owner = null,
    lease_expires_at = null,
    available_at = now()
  where unit.canvas_connection_id = v_connection_id
    and unit.status = 'running'
    and unit.lease_expires_at <= now();

  update public.canvas_sync_job_units unit
  set status = 'queued'
  where unit.canvas_connection_id = v_connection_id
    and unit.status = 'retry_wait'
    and unit.available_at <= now();

  select count(*)::integer
  into v_active
  from public.canvas_sync_job_units unit
  where unit.canvas_connection_id = v_connection_id
    and unit.status = 'running'
    and unit.lease_expires_at > now();

  v_capacity := greatest(
    0,
    least(
      p_limit,
      case when v_job_type = 'course_grades' then 2 else 3 end,
      3 - v_active
    )
  );

  if v_capacity = 0 then
    return;
  end if;

  return query
  with candidates as (
    select unit.id
    from public.canvas_sync_job_units unit
    where unit.job_id = p_job_id
      and unit.status = 'queued'
      and unit.available_at <= now()
    order by unit.is_discovery desc, unit.page_index, unit.created_at
    for update skip locked
    limit v_capacity
  )
  update public.canvas_sync_job_units unit
  set
    status = 'running',
    lease_owner = p_worker_id,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    started_at = coalesce(unit.started_at, now())
  from candidates
  where unit.id = candidates.id
  returning unit.*;
end;
$$;

create or replace function public.begin_canvas_sync_job_unit_attempt_v2(
  p_unit_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 90
)
returns setof public.canvas_sync_job_units
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit public.canvas_sync_job_units%rowtype;
begin
  update public.canvas_sync_job_units unit
  set
    status = 'running',
    attempt_count = unit.attempt_count + 1,
    lease_owner = p_worker_id,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    started_at = coalesce(unit.started_at, now()),
    safe_error_code = null,
    safe_error_message = null,
    retryable = false
  from public.canvas_sync_jobs job
  where unit.id = p_unit_id
    and job.id = unit.job_id
    and job.status = 'running'
    and job.worker_id = p_worker_id
    and (
      (
        unit.status = 'running'
        and unit.lease_owner = p_worker_id
      )
      or (
        unit.status = 'retry_wait'
        and unit.available_at <= now()
      )
    )
    and unit.attempt_count < unit.max_attempts
  returning unit.* into v_unit;

  if found then
    return next v_unit;
  end if;
end;
$$;

create or replace function public.complete_canvas_sync_job_unit_v2(
  p_unit_id uuid,
  p_worker_id text,
  p_payload_kind text,
  p_payload jsonb,
  p_discovered_units jsonb default '[]'::jsonb
)
returns setof public.canvas_sync_job_units
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit public.canvas_sync_job_units%rowtype;
  v_job public.canvas_sync_jobs%rowtype;
  v_discovered jsonb;
  v_total_known boolean;
begin
  if jsonb_typeof(p_discovered_units) is distinct from 'array'
    or (
      p_payload is not null
      and jsonb_typeof(p_payload) not in ('object', 'array')
    ) then
    raise exception using errcode = 'P0001', message = 'canvas_sync_unit_result_invalid';
  end if;

  select job.*
  into v_job
  from public.canvas_sync_jobs job
  join public.canvas_sync_job_units unit on unit.job_id = job.id
  where unit.id = p_unit_id
    and job.worker_id = p_worker_id
  for update of job;

  if not found then
    return;
  end if;

  select *
  into v_unit
  from public.canvas_sync_job_units unit
  where unit.id = p_unit_id
    and unit.status = 'running'
    and unit.lease_owner = p_worker_id
  for update;

  if not found then
    return;
  end if;

  if v_job.status = 'cancellation_requested' then
    update public.canvas_sync_job_units unit
    set
      status = 'cancelled',
      lease_owner = null,
      lease_expires_at = null,
      completed_at = now(),
      retryable = false
    where unit.id = p_unit_id
    returning * into v_unit;
    return next v_unit;
    return;
  end if;

  if p_payload is not null then
    insert into public.canvas_sync_job_staging (
      job_id,
      unit_id,
      user_id,
      scope,
      payload_kind,
      payload
    )
    values (
      v_unit.job_id,
      v_unit.id,
      v_unit.user_id,
      v_unit.scope,
      p_payload_kind,
      p_payload
    )
    on conflict (unit_id) do update set
      payload_kind = excluded.payload_kind,
      payload = excluded.payload,
      expires_at = now() + interval '24 hours';
  end if;

  for v_discovered in select value from jsonb_array_elements(p_discovered_units)
  loop
    insert into public.canvas_sync_job_units (
      job_id,
      user_id,
      canvas_connection_id,
      course_id,
      unit_key,
      unit_kind,
      scope,
      page_index,
      is_discovery,
      checkpoint
    )
    values (
      v_unit.job_id,
      v_unit.user_id,
      v_unit.canvas_connection_id,
      v_unit.course_id,
      v_discovered ->> 'unitKey',
      v_discovered ->> 'unitKind',
      v_discovered ->> 'scope',
      coalesce((v_discovered ->> 'pageIndex')::integer, 0),
      coalesce((v_discovered ->> 'isDiscovery')::boolean, false),
      coalesce(v_discovered -> 'checkpoint', '{}'::jsonb)
    )
    on conflict (job_id, unit_key) do nothing;
  end loop;

  update public.canvas_sync_job_units unit
  set
    status = 'succeeded',
    lease_owner = null,
    lease_expires_at = null,
    completed_at = now(),
    retryable = false
  where unit.id = p_unit_id
  returning * into v_unit;

  select not exists (
    select 1
    from public.canvas_sync_job_units unit
    where unit.job_id = v_unit.job_id
      and unit.is_discovery
      and unit.status not in ('succeeded', 'skipped')
  )
  into v_total_known;

  update public.canvas_sync_jobs job
  set
    completed_units = (
      select count(*)::integer
      from public.canvas_sync_job_units unit
      where unit.job_id = v_unit.job_id
        and unit.status in ('succeeded', 'failed', 'cancelled', 'skipped')
    ),
    total_units = case when v_total_known then (
      select count(*)::integer
      from public.canvas_sync_job_units unit
      where unit.job_id = v_unit.job_id
    ) else null end,
    progress_total_known = v_total_known,
    unit_label = 'operations',
    stage = case
      when v_unit.unit_kind in ('page_detail', 'page_detail_reuse')
        then 'reading_item_details'
      else 'fetching_pages'
    end,
    status_message = case
      when v_unit.unit_kind in ('page_detail', 'page_detail_reuse')
        then 'Reading Canvas item details'
      else 'Reading Canvas pages'
    end
  where job.id = v_unit.job_id
    and job.status = 'running'
    and job.worker_id = p_worker_id;

  return next v_unit;
end;
$$;

create or replace function public.defer_canvas_sync_job_unit_v2(
  p_unit_id uuid,
  p_worker_id text,
  p_error_code text,
  p_safe_error_message text,
  p_available_at timestamptz
)
returns setof public.canvas_sync_job_units
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit public.canvas_sync_job_units%rowtype;
begin
  update public.canvas_sync_job_units unit
  set
    status = 'retry_wait',
    lease_owner = null,
    lease_expires_at = null,
    available_at = greatest(p_available_at, now() + interval '1 second'),
    safe_error_code = left(btrim(p_error_code), 80),
    safe_error_message = left(btrim(p_safe_error_message), 300),
    retryable = true
  from public.canvas_sync_jobs job
  where unit.id = p_unit_id
    and unit.job_id = job.id
    and unit.status = 'running'
    and unit.lease_owner = p_worker_id
    and job.status = 'running'
    and job.worker_id = p_worker_id
    and unit.attempt_count < unit.max_attempts
  returning unit.* into v_unit;

  if found then
    return next v_unit;
  end if;
end;
$$;

create or replace function public.fail_canvas_sync_job_unit_v2(
  p_unit_id uuid,
  p_worker_id text,
  p_error_code text,
  p_safe_error_message text,
  p_retryable boolean
)
returns setof public.canvas_sync_job_units
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit public.canvas_sync_job_units%rowtype;
begin
  update public.canvas_sync_job_units unit
  set
    status = case
      when job.status = 'cancellation_requested' then 'cancelled'
      else 'failed'
    end,
    lease_owner = null,
    lease_expires_at = null,
    completed_at = now(),
    safe_error_code = case
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
    end
  from public.canvas_sync_jobs job
  where unit.id = p_unit_id
    and unit.job_id = job.id
    and unit.status = 'running'
    and unit.lease_owner = p_worker_id
    and job.status in ('running', 'cancellation_requested')
    and job.worker_id = p_worker_id
  returning unit.* into v_unit;

  if found then
    update public.canvas_sync_jobs job
    set
      completed_units = (
        select count(*)::integer
        from public.canvas_sync_job_units counted
        where counted.job_id = v_unit.job_id
          and counted.status in ('succeeded', 'failed', 'cancelled', 'skipped')
      ),
      total_units = null,
      progress_total_known = false,
      unit_label = 'operations'
    where job.id = v_unit.job_id;
    return next v_unit;
  end if;
end;
$$;

create or replace function public.cancel_canvas_sync_job_plan_v2(
  p_job_id uuid,
  p_worker_id text
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.status = 'cancellation_requested'
    and job.worker_id = p_worker_id
  for update;

  if not found then
    return;
  end if;

  update public.canvas_sync_job_units unit
  set
    status = 'cancelled',
    lease_owner = null,
    lease_expires_at = null,
    completed_at = coalesce(unit.completed_at, now()),
    retryable = false
  where unit.job_id = p_job_id
    and unit.status in ('queued', 'running', 'retry_wait');

  delete from public.canvas_sync_job_staging stage where stage.job_id = p_job_id;
  update public.canvas_sync_job_units unit
  set checkpoint = '{}'::jsonb
  where unit.job_id = p_job_id;

  update public.canvas_course_sync_scope_states state
  set
    health_status = case
      when state.last_successful_at is null then 'not_synced'
      else 'stale'
    end,
    last_checked_at = now(),
    safe_message = 'Synchronization was cancelled.',
    safe_error_code = null,
    retryable = false
  where state.last_job_id = p_job_id;

  update public.canvas_sync_jobs job
  set
    status = 'cancelled',
    stage = 'complete',
    status_message = 'Cancelled',
    completed_at = now(),
    failed_at = null,
    result_summary = null,
    result_outcome = 'cancelled',
    retryable = false,
    worker_id = null,
    total_units = (
      select count(*)::integer from public.canvas_sync_job_units unit
      where unit.job_id = p_job_id
    ),
    completed_units = (
      select count(*)::integer from public.canvas_sync_job_units unit
      where unit.job_id = p_job_id
        and unit.status in ('succeeded', 'failed', 'cancelled', 'skipped')
    ),
    progress_total_known = true,
    unit_label = 'operations'
  where job.id = p_job_id
    and job.status = 'cancellation_requested'
    and job.worker_id = p_worker_id
  returning * into v_job;

  if found then
    return next v_job;
  end if;
end;
$$;

-- Promotion is a short, server-owned commit boundary. Once entered, a new
-- cancellation request is rejected by returning the unchanged job. Requests
-- accepted before this boundary remain observable and prevent promotion.
create or replace function public.begin_canvas_sync_promotion_v2(
  p_job_id uuid,
  p_worker_id text
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  update public.canvas_sync_jobs job
  set
    stage = 'promoting_scopes',
    status_message = 'Saving Canvas updates'
  where job.id = p_job_id
    and job.status = 'running'
    and job.worker_id = p_worker_id
    and job.stage not in ('promoting_scopes', 'storing_result', 'complete')
  returning * into v_job;

  if found then
    return next v_job;
    return;
  end if;

  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.status = 'running'
    and job.worker_id = p_worker_id
    and job.stage in ('promoting_scopes', 'storing_result');
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
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  if auth.uid() is distinct from p_user_id
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
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

create or replace function public.record_canvas_course_sync_health_v2(
  p_job_id uuid,
  p_scopes jsonb,
  p_items jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
  v_scope jsonb;
  v_item jsonb;
  v_scope_name text;
  v_affected_count integer;
begin
  if jsonb_typeof(p_scopes) is distinct from 'array'
    or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'canvas_sync_health_invalid';
  end if;

  select *
  into v_job
  from public.canvas_sync_jobs job
  where job.id = p_job_id
    and job.status = 'running'
  for update;

  if not found then
    return false;
  end if;

  -- Record every item observed by this job before inferring absence. This
  -- ordering is what makes authoritative deletion safe: current items carry
  -- this job id and therefore cannot be marked deleted below.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.canvas_course_item_sync_states (
      user_id,
      canvas_connection_id,
      course_id,
      scope,
      item_kind,
      item_key_hash,
      item_state,
      source_updated_at,
      source_fingerprint,
      last_seen_job_id,
      last_seen_at,
      last_successful_at,
      safe_error_code
    )
    values (
      v_job.user_id,
      v_job.canvas_connection_id,
      v_job.course_id,
      v_item ->> 'scope',
      v_item ->> 'itemKind',
      v_item ->> 'itemKeyHash',
      v_item ->> 'itemState',
      nullif(v_item ->> 'sourceUpdatedAt', '')::timestamptz,
      nullif(v_item ->> 'sourceFingerprint', ''),
      v_job.id,
      now(),
      case
        when v_item ->> 'itemState' in (
          'synced',
          'metadata_only',
          'locked',
          'unpublished',
          'external',
          'unsupported_format'
        ) then now()
        else null
      end,
      nullif(v_item ->> 'safeErrorCode', '')
    )
    on conflict (
      user_id,
      canvas_connection_id,
      course_id,
      scope,
      item_kind,
      item_key_hash
    )
    do update set
      item_state = excluded.item_state,
      source_updated_at = excluded.source_updated_at,
      source_fingerprint = excluded.source_fingerprint,
      last_seen_job_id = excluded.last_seen_job_id,
      last_seen_at = excluded.last_seen_at,
      last_successful_at = coalesce(
        excluded.last_successful_at,
        public.canvas_course_item_sync_states.last_successful_at
      ),
      safe_error_code = excluded.safe_error_code;
  end loop;

  for v_scope in select value from jsonb_array_elements(p_scopes)
  loop
    v_scope_name := v_scope ->> 'scope';
    insert into public.canvas_course_sync_scope_states (
      user_id,
      canvas_connection_id,
      course_id,
      scope,
      health_status,
      last_job_id,
      last_checked_at,
      last_successful_at,
      synced_count,
      metadata_only_count,
      temporarily_failed_count,
      stale_count,
      deleted_count,
      safe_message,
      safe_error_code,
      retryable
    )
    values (
      v_job.user_id,
      v_job.canvas_connection_id,
      v_job.course_id,
      v_scope_name,
      v_scope ->> 'healthStatus',
      v_job.id,
      now(),
      case
        when (v_scope ->> 'authoritative')::boolean then now()
        else null
      end,
      coalesce((v_scope ->> 'syncedCount')::integer, 0),
      coalesce((v_scope ->> 'metadataOnlyCount')::integer, 0),
      coalesce((v_scope ->> 'temporarilyFailedCount')::integer, 0),
      coalesce((v_scope ->> 'staleCount')::integer, 0),
      coalesce((v_scope ->> 'deletedCount')::integer, 0),
      nullif(v_scope ->> 'safeMessage', ''),
      nullif(v_scope ->> 'safeErrorCode', ''),
      coalesce((v_scope ->> 'retryable')::boolean, false)
    )
    on conflict (user_id, canvas_connection_id, course_id, scope)
    do update set
      health_status = excluded.health_status,
      last_job_id = excluded.last_job_id,
      last_checked_at = excluded.last_checked_at,
      last_successful_at = case
        when (v_scope ->> 'authoritative')::boolean then excluded.last_successful_at
        else public.canvas_course_sync_scope_states.last_successful_at
      end,
      synced_count = excluded.synced_count,
      metadata_only_count = excluded.metadata_only_count,
      temporarily_failed_count = excluded.temporarily_failed_count,
      stale_count = excluded.stale_count,
      deleted_count = excluded.deleted_count,
      safe_message = excluded.safe_message,
      safe_error_code = excluded.safe_error_code,
      retryable = excluded.retryable;

    if coalesce((v_scope ->> 'authoritative')::boolean, false) then
      update public.canvas_course_item_sync_states state
      set
        item_state = 'deleted_from_canvas',
        last_seen_at = now(),
        safe_error_code = null
      where state.user_id = v_job.user_id
        and state.canvas_connection_id = v_job.canvas_connection_id
        and state.course_id = v_job.course_id
        and state.scope = v_scope_name
        and state.item_state <> 'deleted_from_canvas'
        and state.last_seen_job_id is distinct from v_job.id;
      get diagnostics v_affected_count = row_count;

      update public.canvas_course_sync_scope_states health
      set deleted_count = v_affected_count
      where health.user_id = v_job.user_id
        and health.canvas_connection_id = v_job.canvas_connection_id
        and health.course_id = v_job.course_id
        and health.scope = v_scope_name;
    else
      update public.canvas_course_item_sync_states state
      set
        item_state = case
          when state.last_successful_at is null then 'temporarily_failed'
          else 'stale'
        end,
        safe_error_code = coalesce(
          nullif(v_scope ->> 'safeErrorCode', ''),
          state.safe_error_code
        )
      where state.user_id = v_job.user_id
        and state.canvas_connection_id = v_job.canvas_connection_id
        and state.course_id = v_job.course_id
        and state.scope = v_scope_name
        and state.last_seen_job_id is distinct from v_job.id
        and state.item_state <> 'deleted_from_canvas';
      get diagnostics v_affected_count = row_count;

      update public.canvas_course_sync_scope_states health
      set stale_count = greatest(health.stale_count, v_affected_count)
      where health.user_id = v_job.user_id
        and health.canvas_connection_id = v_job.canvas_connection_id
        and health.course_id = v_job.course_id
        and health.scope = v_scope_name;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.complete_canvas_sync_job_v2(
  p_job_id uuid,
  p_worker_id text,
  p_outcome text,
  p_result_summary jsonb
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  if p_outcome not in ('success', 'unchanged', 'partial')
    or jsonb_typeof(p_result_summary) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'canvas_sync_result_invalid';
  end if;

  update public.canvas_sync_jobs job
  set
    status = 'succeeded',
    stage = 'complete',
    status_message = case
      when p_outcome = 'partial' then 'Complete with warnings'
      when p_outcome = 'unchanged' then 'Already up to date'
      else 'Complete'
    end,
    completed_units = (
      select count(*)::integer from public.canvas_sync_job_units unit
      where unit.job_id = p_job_id
        and unit.status in ('succeeded', 'failed', 'cancelled', 'skipped')
    ),
    total_units = (
      select count(*)::integer from public.canvas_sync_job_units unit
      where unit.job_id = p_job_id
    ),
    progress_total_known = true,
    unit_label = 'operations',
    completed_at = now(),
    failed_at = null,
    result_summary = p_result_summary,
    result_outcome = p_outcome,
    retryable = false,
    error_code = null,
    safe_error_message = null,
    worker_id = null
  where job.id = p_job_id
    and job.status = 'running'
    and job.worker_id = p_worker_id
    and not exists (
      select 1 from public.canvas_sync_job_units unit
      where unit.job_id = p_job_id
        and unit.status in ('queued', 'running', 'retry_wait')
    )
  returning * into v_job;

  if found then
    update public.canvas_sync_job_units unit
    set checkpoint = '{}'::jsonb
    where unit.job_id = p_job_id;
    delete from public.canvas_sync_job_staging stage where stage.job_id = p_job_id;
    return next v_job;
  end if;
end;
$$;

create or replace function public.fail_canvas_sync_job_v2(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_safe_error_message text,
  p_retryable boolean
)
returns setof public.canvas_sync_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.canvas_sync_jobs%rowtype;
begin
  update public.canvas_sync_job_staging stage
  set expires_at = least(stage.expires_at, now() + interval '24 hours')
  where stage.job_id = p_job_id;

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
    result_summary = null,
    result_outcome = case
      when job.status = 'cancellation_requested' then 'cancelled'
      else 'failed'
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
        and job.attempt_count < job.max_attempts
    end,
    worker_id = null
  where job.id = p_job_id
    and job.status in ('running', 'cancellation_requested')
    and job.worker_id = p_worker_id
  returning * into v_job;

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
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
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

revoke all on function public.set_canvas_sync_checkpoint_updated_at()
  from public, anon, authenticated;
grant execute on function public.set_canvas_sync_checkpoint_updated_at()
  to service_role;

revoke all on function public.purge_expired_canvas_sync_staging_v2(integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_canvas_sync_staging_v2(integer)
  to service_role;

revoke all on function public.create_canvas_sync_job_v1(
  uuid, uuid, uuid, text, text, text, jsonb
) from public, anon;
grant execute on function public.create_canvas_sync_job_v1(
  uuid, uuid, uuid, text, text, text, jsonb
) to authenticated, service_role;

revoke all on function public.initialize_canvas_sync_job_plan_v2(
  uuid, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.initialize_canvas_sync_job_plan_v2(
  uuid, text, text, jsonb
) to service_role;

revoke all on function public.claim_canvas_sync_job_units_v2(
  uuid, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.claim_canvas_sync_job_units_v2(
  uuid, text, integer, integer
) to service_role;

revoke all on function public.begin_canvas_sync_job_unit_attempt_v2(
  uuid, text, integer
) from public, anon, authenticated;
grant execute on function public.begin_canvas_sync_job_unit_attempt_v2(
  uuid, text, integer
) to service_role;

revoke all on function public.complete_canvas_sync_job_unit_v2(
  uuid, text, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.complete_canvas_sync_job_unit_v2(
  uuid, text, text, jsonb, jsonb
) to service_role;

revoke all on function public.defer_canvas_sync_job_unit_v2(
  uuid, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.defer_canvas_sync_job_unit_v2(
  uuid, text, text, text, timestamptz
) to service_role;

revoke all on function public.fail_canvas_sync_job_unit_v2(
  uuid, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.fail_canvas_sync_job_unit_v2(
  uuid, text, text, text, boolean
) to service_role;

revoke all on function public.cancel_canvas_sync_job_plan_v2(uuid, text)
  from public, anon, authenticated;
grant execute on function public.cancel_canvas_sync_job_plan_v2(uuid, text)
  to service_role;

revoke all on function public.begin_canvas_sync_promotion_v2(uuid, text)
  from public, anon, authenticated;
grant execute on function public.begin_canvas_sync_promotion_v2(uuid, text)
  to service_role;

revoke all on function public.request_canvas_sync_job_cancellation_v1(uuid, uuid)
  from public, anon;
grant execute on function public.request_canvas_sync_job_cancellation_v1(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.record_canvas_course_sync_health_v2(
  uuid, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.record_canvas_course_sync_health_v2(
  uuid, jsonb, jsonb
) to service_role;

revoke all on function public.complete_canvas_sync_job_v2(
  uuid, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.complete_canvas_sync_job_v2(
  uuid, text, text, jsonb
) to service_role;

revoke all on function public.fail_canvas_sync_job_v2(
  uuid, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.fail_canvas_sync_job_v2(
  uuid, text, text, text, boolean
) to service_role;

revoke all on function public.retry_canvas_sync_job_v2(uuid, uuid, text)
  from public, anon;
grant execute on function public.retry_canvas_sync_job_v2(uuid, uuid, text)
  to authenticated, service_role;
