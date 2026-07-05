alter table public.canvas_sync_runs
  drop constraint if exists canvas_sync_runs_mode_allowed;

alter table public.canvas_sync_runs
  add constraint canvas_sync_runs_mode_allowed
  check (sync_mode in ('full', 'incremental'));

alter table public.canvas_sync_course_results
  drop constraint if exists canvas_sync_course_results_status_failure_consistency;

alter table public.canvas_sync_course_results
  drop constraint if exists canvas_sync_course_results_status_allowed;

alter table public.canvas_sync_course_results
  add constraint canvas_sync_course_results_status_allowed
  check (status in ('succeeded', 'unchanged', 'failed'));

alter table public.canvas_sync_course_results
  add constraint canvas_sync_course_results_status_failure_consistency
  check (
    (
      status in ('succeeded', 'unchanged')
      and failure_code is null
      and failed_operation is null
      and failure_category is null
      and http_status_class is null
      and retryable is null
    )
    or (
      status = 'failed'
      and failure_code is not null
      and failed_operation is not null
      and failure_category is not null
      and http_status_class is not null
      and retryable is not null
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_courses_id_user_connection_canvas_identity_unique'
      and conrelid = 'public.canvas_courses'::regclass
  ) then
    alter table public.canvas_courses
      add constraint canvas_courses_id_user_connection_canvas_identity_unique
      unique (id, user_id, canvas_connection_id, canvas_course_id);
  end if;
end;
$$;

create table if not exists public.canvas_course_sync_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  canvas_course_id text not null,
  course_id uuid,
  snapshot_fingerprint text,
  fingerprint_version text,
  last_checked_at timestamptz not null default now(),
  last_changed_at timestamptz,
  last_successful_sync_at timestamptz,
  consecutive_failure_count integer not null default 0,
  last_failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_course_sync_states_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_course_sync_states_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id, canvas_course_id)
    references public.canvas_courses (
      id,
      user_id,
      canvas_connection_id,
      canvas_course_id
    )
    on delete set null (course_id),
  constraint canvas_course_sync_states_identity_unique
    unique (user_id, canvas_connection_id, canvas_course_id),
  constraint canvas_course_sync_states_canvas_course_id_not_blank
    check (char_length(btrim(canvas_course_id)) > 0),
  constraint canvas_course_sync_states_fingerprint_consistency
    check (
      (snapshot_fingerprint is null and fingerprint_version is null)
      or (
        snapshot_fingerprint is not null
        and fingerprint_version is not null
        and char_length(btrim(snapshot_fingerprint)) > 0
        and char_length(snapshot_fingerprint) <= 128
        and char_length(btrim(fingerprint_version)) > 0
        and char_length(fingerprint_version) <= 80
        and last_successful_sync_at is not null
      )
    ),
  constraint canvas_course_sync_states_failure_count_non_negative
    check (consecutive_failure_count >= 0),
  constraint canvas_course_sync_states_failure_code_allowed
    check (
      last_failure_code is null
      or last_failure_code in (
        'canvas_course_fetch_failed',
        'canvas_course_modules_failed',
        'canvas_course_module_items_failed',
        'canvas_course_pages_failed',
        'canvas_course_page_detail_failed',
        'canvas_course_assignment_groups_failed',
        'canvas_course_assignments_failed',
        'canvas_course_response_invalid',
        'canvas_course_persistence_failed',
        'canvas_course_persist_failed',
        'canvas_sync_normalization_failed'
      )
    )
);

create index if not exists canvas_course_sync_states_connection_checked_idx
  on public.canvas_course_sync_states (canvas_connection_id, last_checked_at desc);

create index if not exists canvas_course_sync_states_user_checked_idx
  on public.canvas_course_sync_states (user_id, last_checked_at desc);

create index if not exists canvas_course_sync_states_course_id_idx
  on public.canvas_course_sync_states (course_id)
  where course_id is not null;

create or replace function public.set_canvas_course_sync_states_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_course_sync_states_set_updated_at
  on public.canvas_course_sync_states;
create trigger canvas_course_sync_states_set_updated_at
before update on public.canvas_course_sync_states
for each row
execute function public.set_canvas_course_sync_states_updated_at();

alter table public.canvas_course_sync_states enable row level security;

revoke all on table public.canvas_course_sync_states from public;
revoke all on table public.canvas_course_sync_states from anon;
revoke all on table public.canvas_course_sync_states from authenticated;
grant select, insert, update, delete on table public.canvas_course_sync_states
  to service_role;

create or replace function public.begin_canvas_sync_run_with_mode(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_mode text,
  p_started_at timestamptz
)
returns table (
  id uuid,
  user_id uuid,
  canvas_connection_id uuid,
  sync_mode text,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  heartbeat_at timestamptz,
  discovered_course_count integer,
  successful_course_count integer,
  failed_course_count integer,
  resource_counts jsonb,
  failure_code text,
  failure_summary text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.canvas_sync_runs%rowtype;
  v_started_at timestamptz := coalesce(p_started_at, now());
  v_stale_before timestamptz := coalesce(p_started_at, now()) - interval '30 minutes';
  v_sync_mode text := coalesce(nullif(btrim(p_sync_mode), ''), 'full');
begin
  if p_user_id is null or p_canvas_connection_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_connection_missing';
  end if;

  if v_sync_mode not in ('full', 'incremental') then
    raise exception using errcode = 'P0001', message = 'invalid_sync_mode';
  end if;

  perform 1
  from public.canvas_connections connection
  where connection.id = p_canvas_connection_id
    and connection.user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_connection_missing';
  end if;

  update public.canvas_sync_runs run
  set
    status = 'failed',
    completed_at = v_started_at,
    heartbeat_at = v_started_at,
    failure_code = 'stale_sync_recovered',
    failure_summary = 'Previous synchronization run expired before completion.'
  where run.user_id = p_user_id
    and run.canvas_connection_id = p_canvas_connection_id
    and run.status = 'running'
    and run.heartbeat_at < v_stale_before;

  begin
    insert into public.canvas_sync_runs (
      user_id,
      canvas_connection_id,
      sync_mode,
      status,
      started_at,
      heartbeat_at
    )
    values (
      p_user_id,
      p_canvas_connection_id,
      v_sync_mode,
      'running',
      v_started_at,
      v_started_at
    )
    returning *
    into v_run;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'canvas_sync_in_progress';
  end;

  return query
  select
    v_run.id,
    v_run.user_id,
    v_run.canvas_connection_id,
    v_run.sync_mode,
    v_run.status,
    v_run.started_at,
    v_run.completed_at,
    v_run.heartbeat_at,
    v_run.discovered_course_count,
    v_run.successful_course_count,
    v_run.failed_course_count,
    v_run.resource_counts,
    v_run.failure_code,
    v_run.failure_summary,
    v_run.created_at,
    v_run.updated_at;
end;
$$;

create or replace function public.replace_canvas_course_academic_snapshot_with_sync_state(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_synced_at timestamptz,
  p_course jsonb,
  p_modules jsonb,
  p_module_items jsonb,
  p_pages jsonb,
  p_assignment_groups jsonb,
  p_assignments jsonb,
  p_snapshot_fingerprint text,
  p_fingerprint_version text
)
returns table (
  course_inserted integer,
  course_updated integer,
  modules_inserted integer,
  modules_updated integer,
  modules_deleted integer,
  module_items_inserted integer,
  module_items_updated integer,
  module_items_deleted integer,
  pages_inserted integer,
  pages_updated integer,
  pages_deleted integer,
  assignment_groups_inserted integer,
  assignment_groups_updated integer,
  assignment_groups_deleted integer,
  assignments_inserted integer,
  assignments_updated integer,
  assignments_deleted integer,
  sync_state_id uuid,
  sync_state_last_checked_at timestamptz,
  sync_state_last_changed_at timestamptz,
  sync_state_consecutive_failure_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_canvas_course_id text;
  v_course_id uuid;
  v_state public.canvas_course_sync_states%rowtype;
  v_synced_at timestamptz := coalesce(p_synced_at, now());
  v_snapshot_fingerprint text := nullif(btrim(p_snapshot_fingerprint), '');
  v_fingerprint_version text := nullif(btrim(p_fingerprint_version), '');
begin
  if v_snapshot_fingerprint is null or v_fingerprint_version is null then
    raise exception using errcode = 'P0001', message = 'canvas_snapshot_fingerprint_missing';
  end if;

  if char_length(v_snapshot_fingerprint) > 128
    or char_length(v_fingerprint_version) > 80 then
    raise exception using errcode = 'P0001', message = 'canvas_snapshot_fingerprint_invalid';
  end if;

  if jsonb_typeof(p_course) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_snapshot_payload';
  end if;

  v_canvas_course_id := nullif(btrim(p_course ->> 'canvas_course_id'), '');
  if v_canvas_course_id is null then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_course';
  end if;

  select *
  into
    course_inserted,
    course_updated,
    modules_inserted,
    modules_updated,
    modules_deleted,
    module_items_inserted,
    module_items_updated,
    module_items_deleted,
    pages_inserted,
    pages_updated,
    pages_deleted,
    assignment_groups_inserted,
    assignment_groups_updated,
    assignment_groups_deleted,
    assignments_inserted,
    assignments_updated,
    assignments_deleted
  from public.replace_canvas_course_academic_snapshot(
    p_user_id,
    p_canvas_connection_id,
    p_sync_run_id,
    v_synced_at,
    p_course,
    p_modules,
    p_module_items,
    p_pages,
    p_assignment_groups,
    p_assignments
  );

  select course.id
  into v_course_id
  from public.canvas_courses course
  where course.user_id = p_user_id
    and course.canvas_connection_id = p_canvas_connection_id
    and course.canvas_course_id = v_canvas_course_id;

  if v_course_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_course_missing';
  end if;

  insert into public.canvas_course_sync_states (
    user_id,
    canvas_connection_id,
    canvas_course_id,
    course_id,
    snapshot_fingerprint,
    fingerprint_version,
    last_checked_at,
    last_changed_at,
    last_successful_sync_at,
    consecutive_failure_count,
    last_failure_code
  )
  values (
    p_user_id,
    p_canvas_connection_id,
    v_canvas_course_id,
    v_course_id,
    v_snapshot_fingerprint,
    v_fingerprint_version,
    v_synced_at,
    v_synced_at,
    v_synced_at,
    0,
    null
  )
  on conflict on constraint canvas_course_sync_states_identity_unique
  do update set
    course_id = excluded.course_id,
    snapshot_fingerprint = excluded.snapshot_fingerprint,
    fingerprint_version = excluded.fingerprint_version,
    last_checked_at = excluded.last_checked_at,
    last_changed_at = excluded.last_changed_at,
    last_successful_sync_at = excluded.last_successful_sync_at,
    consecutive_failure_count = 0,
    last_failure_code = null
  returning *
  into v_state;

  sync_state_id := v_state.id;
  sync_state_last_checked_at := v_state.last_checked_at;
  sync_state_last_changed_at := v_state.last_changed_at;
  sync_state_consecutive_failure_count := v_state.consecutive_failure_count;

  return next;
end;
$$;

create or replace function public.record_canvas_course_snapshot_unchanged(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_canvas_course_id text,
  p_checked_at timestamptz,
  p_snapshot_fingerprint text,
  p_fingerprint_version text
)
returns table (
  sync_state_id uuid,
  sync_state_last_checked_at timestamptz,
  sync_state_last_changed_at timestamptz,
  sync_state_consecutive_failure_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_canvas_course_id text := nullif(btrim(p_canvas_course_id), '');
  v_checked_at timestamptz := coalesce(p_checked_at, now());
  v_snapshot_fingerprint text := nullif(btrim(p_snapshot_fingerprint), '');
  v_fingerprint_version text := nullif(btrim(p_fingerprint_version), '');
  v_course_id uuid;
  v_state public.canvas_course_sync_states%rowtype;
begin
  if v_canvas_course_id is null
    or v_snapshot_fingerprint is null
    or v_fingerprint_version is null then
    raise exception using errcode = 'P0001', message = 'canvas_course_sync_state_invalid';
  end if;

  perform 1
  from public.canvas_sync_runs run
  where run.id = p_sync_run_id
    and run.user_id = p_user_id
    and run.canvas_connection_id = p_canvas_connection_id
    and run.status = 'running';

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_sync_run_missing';
  end if;

  select course.id
  into v_course_id
  from public.canvas_courses course
  where course.user_id = p_user_id
    and course.canvas_connection_id = p_canvas_connection_id
    and course.canvas_course_id = v_canvas_course_id;

  update public.canvas_course_sync_states state
  set
    course_id = coalesce(state.course_id, v_course_id),
    last_checked_at = v_checked_at,
    consecutive_failure_count = 0,
    last_failure_code = null
  where state.user_id = p_user_id
    and state.canvas_connection_id = p_canvas_connection_id
    and state.canvas_course_id = v_canvas_course_id
    and state.snapshot_fingerprint = v_snapshot_fingerprint
    and state.fingerprint_version = v_fingerprint_version
    and state.last_successful_sync_at is not null
  returning *
  into v_state;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_course_sync_state_missing';
  end if;

  sync_state_id := v_state.id;
  sync_state_last_checked_at := v_state.last_checked_at;
  sync_state_last_changed_at := v_state.last_changed_at;
  sync_state_consecutive_failure_count := v_state.consecutive_failure_count;

  return next;
end;
$$;

create or replace function public.record_canvas_course_snapshot_failed(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_canvas_course_id text,
  p_checked_at timestamptz,
  p_failure_code text
)
returns table (
  sync_state_id uuid,
  sync_state_last_checked_at timestamptz,
  sync_state_consecutive_failure_count integer,
  sync_state_last_failure_code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_canvas_course_id text := nullif(btrim(p_canvas_course_id), '');
  v_checked_at timestamptz := coalesce(p_checked_at, now());
  v_failure_code text := nullif(btrim(p_failure_code), '');
  v_course_id uuid;
  v_state public.canvas_course_sync_states%rowtype;
begin
  if v_canvas_course_id is null or v_failure_code is null then
    raise exception using errcode = 'P0001', message = 'canvas_course_sync_state_invalid';
  end if;

  perform 1
  from public.canvas_sync_runs run
  where run.id = p_sync_run_id
    and run.user_id = p_user_id
    and run.canvas_connection_id = p_canvas_connection_id
    and run.status = 'running';

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_sync_run_missing';
  end if;

  select course.id
  into v_course_id
  from public.canvas_courses course
  where course.user_id = p_user_id
    and course.canvas_connection_id = p_canvas_connection_id
    and course.canvas_course_id = v_canvas_course_id;

  insert into public.canvas_course_sync_states (
    user_id,
    canvas_connection_id,
    canvas_course_id,
    course_id,
    last_checked_at,
    consecutive_failure_count,
    last_failure_code
  )
  values (
    p_user_id,
    p_canvas_connection_id,
    v_canvas_course_id,
    v_course_id,
    v_checked_at,
    1,
    v_failure_code
  )
  on conflict on constraint canvas_course_sync_states_identity_unique
  do update set
    course_id = coalesce(canvas_course_sync_states.course_id, excluded.course_id),
    last_checked_at = excluded.last_checked_at,
    consecutive_failure_count =
      canvas_course_sync_states.consecutive_failure_count + 1,
    last_failure_code = excluded.last_failure_code
  returning *
  into v_state;

  sync_state_id := v_state.id;
  sync_state_last_checked_at := v_state.last_checked_at;
  sync_state_consecutive_failure_count := v_state.consecutive_failure_count;
  sync_state_last_failure_code := v_state.last_failure_code;

  return next;
end;
$$;

revoke all on function public.begin_canvas_sync_run_with_mode(
  uuid,
  uuid,
  text,
  timestamptz
) from public;
revoke all on function public.begin_canvas_sync_run_with_mode(
  uuid,
  uuid,
  text,
  timestamptz
) from anon;
revoke all on function public.begin_canvas_sync_run_with_mode(
  uuid,
  uuid,
  text,
  timestamptz
) from authenticated;
grant execute on function public.begin_canvas_sync_run_with_mode(
  uuid,
  uuid,
  text,
  timestamptz
) to service_role;

revoke all on function public.replace_canvas_course_academic_snapshot_with_sync_state(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
) from public;
revoke all on function public.replace_canvas_course_academic_snapshot_with_sync_state(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
) from anon;
revoke all on function public.replace_canvas_course_academic_snapshot_with_sync_state(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
) from authenticated;
grant execute on function public.replace_canvas_course_academic_snapshot_with_sync_state(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text
) to service_role;

revoke all on function public.record_canvas_course_snapshot_unchanged(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text
) from public;
revoke all on function public.record_canvas_course_snapshot_unchanged(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text
) from anon;
revoke all on function public.record_canvas_course_snapshot_unchanged(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text
) from authenticated;
grant execute on function public.record_canvas_course_snapshot_unchanged(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  text
) to service_role;

revoke all on function public.record_canvas_course_snapshot_failed(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text
) from public;
revoke all on function public.record_canvas_course_snapshot_failed(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text
) from anon;
revoke all on function public.record_canvas_course_snapshot_failed(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text
) from authenticated;
grant execute on function public.record_canvas_course_snapshot_failed(
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  text
) to service_role;
