alter table public.canvas_sync_runs
  drop constraint if exists canvas_sync_runs_mode_allowed;

alter table public.canvas_sync_runs
  add constraint canvas_sync_runs_mode_allowed
  check (sync_mode in ('full', 'incremental', 'course'));

alter table public.canvas_sync_runs
  add column if not exists scope_course_id uuid;

drop index if exists public.canvas_sync_runs_one_running_per_connection_idx;

create unique index if not exists canvas_sync_runs_one_running_account_sync_per_connection_idx
  on public.canvas_sync_runs (canvas_connection_id)
  where status = 'running'
    and sync_mode in ('full', 'incremental');

create unique index if not exists canvas_sync_runs_one_running_course_sync_idx
  on public.canvas_sync_runs (canvas_connection_id, scope_course_id)
  where status = 'running'
    and sync_mode = 'course'
    and scope_course_id is not null;

create table if not exists public.canvas_course_sync_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  selected boolean not null default true,
  display_order integer,
  selected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_course_sync_preferences_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_course_sync_preferences_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id)
    references public.canvas_courses (id, user_id, canvas_connection_id)
    on delete cascade,
  constraint canvas_course_sync_preferences_identity_unique
    unique (user_id, canvas_connection_id, course_id),
  constraint canvas_course_sync_preferences_display_order_non_negative
    check (display_order is null or display_order >= 0),
  constraint canvas_course_sync_preferences_selected_at_consistency
    check (
      (selected = true and selected_at is not null)
      or (selected = false)
    )
);

create index if not exists canvas_course_sync_preferences_connection_selected_idx
  on public.canvas_course_sync_preferences (
    canvas_connection_id,
    selected,
    display_order,
    updated_at desc
  );

create index if not exists canvas_course_sync_preferences_course_idx
  on public.canvas_course_sync_preferences (course_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_sync_runs_scope_course_owner_fkey'
      and conrelid = 'public.canvas_sync_runs'::regclass
  ) then
    alter table public.canvas_sync_runs
      add constraint canvas_sync_runs_scope_course_owner_fkey
      foreign key (scope_course_id, user_id, canvas_connection_id)
      references public.canvas_courses (id, user_id, canvas_connection_id)
      on delete cascade;
  end if;
end;
$$;

alter table public.canvas_sync_runs
  drop constraint if exists canvas_sync_runs_scope_course_consistency;

alter table public.canvas_sync_runs
  add constraint canvas_sync_runs_scope_course_consistency
  check (
    (sync_mode = 'course' and scope_course_id is not null)
    or (sync_mode in ('full', 'incremental') and scope_course_id is null)
  );

create index if not exists canvas_sync_runs_scope_course_started_idx
  on public.canvas_sync_runs (scope_course_id, started_at desc)
  where scope_course_id is not null;

create or replace function public.set_canvas_course_sync_preferences_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_course_sync_preferences_set_updated_at
  on public.canvas_course_sync_preferences;
create trigger canvas_course_sync_preferences_set_updated_at
before update on public.canvas_course_sync_preferences
for each row
execute function public.set_canvas_course_sync_preferences_updated_at();

alter table public.canvas_course_sync_preferences enable row level security;

revoke all on table public.canvas_course_sync_preferences from public;
revoke all on table public.canvas_course_sync_preferences from anon;
revoke all on table public.canvas_course_sync_preferences from authenticated;
grant select, insert, update, delete on table public.canvas_course_sync_preferences
  to service_role;

drop policy if exists canvas_course_sync_preferences_select_own
  on public.canvas_course_sync_preferences;
create policy canvas_course_sync_preferences_select_own
on public.canvas_course_sync_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_course_sync_preferences_insert_own
  on public.canvas_course_sync_preferences;
create policy canvas_course_sync_preferences_insert_own
on public.canvas_course_sync_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_course_sync_preferences_update_own
  on public.canvas_course_sync_preferences;
create policy canvas_course_sync_preferences_update_own
on public.canvas_course_sync_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_course_sync_preferences_delete_own
  on public.canvas_course_sync_preferences;
create policy canvas_course_sync_preferences_delete_own
on public.canvas_course_sync_preferences
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.replace_canvas_course_sync_preferences(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_selected_course_ids uuid[],
  p_selected_at timestamptz default now()
)
returns table (
  selected_count integer,
  deselected_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_selected_at timestamptz := coalesce(p_selected_at, now());
  v_course_count integer;
  v_distinct_count integer;
begin
  if p_user_id is null or p_canvas_connection_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_connection_missing';
  end if;

  if p_selected_course_ids is null then
    raise exception using errcode = 'P0001', message = 'canvas_course_selection_invalid';
  end if;

  perform 1
  from public.canvas_connections connection
  where connection.id = p_canvas_connection_id
    and connection.user_id = p_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_connection_missing';
  end if;

  select count(*), count(distinct course_id)
  into v_course_count, v_distinct_count
  from unnest(p_selected_course_ids) as selected(course_id);

  if v_course_count is distinct from v_distinct_count then
    raise exception using errcode = 'P0001', message = 'canvas_course_selection_duplicate';
  end if;

  if exists (
    select 1
    from unnest(p_selected_course_ids) as selected(course_id)
    left join public.canvas_courses course
      on course.id = selected.course_id
      and course.user_id = p_user_id
      and course.canvas_connection_id = p_canvas_connection_id
    where selected.course_id is null
      or course.id is null
  ) then
    raise exception using errcode = 'P0001', message = 'canvas_course_selection_invalid';
  end if;

  update public.canvas_course_sync_preferences preference
  set
    selected = false,
    display_order = null,
    selected_at = null
  where preference.user_id = p_user_id
    and preference.canvas_connection_id = p_canvas_connection_id
    and preference.selected = true
    and not (
      preference.course_id = any(p_selected_course_ids)
    );

  get diagnostics deselected_count = row_count;

  insert into public.canvas_course_sync_preferences (
    user_id,
    canvas_connection_id,
    course_id,
    selected,
    display_order,
    selected_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    selected.course_id,
    true,
    selected.ordinality::integer - 1,
    v_selected_at
  from unnest(p_selected_course_ids) with ordinality as selected(course_id, ordinality)
  on conflict on constraint canvas_course_sync_preferences_identity_unique
  do update set
    selected = true,
    display_order = excluded.display_order,
    selected_at = excluded.selected_at;

  selected_count := coalesce(array_length(p_selected_course_ids, 1), 0);
  deselected_count := coalesce(deselected_count, 0);

  return next;
end;
$$;

create or replace function public.begin_canvas_course_sync_run(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_scope_course_id uuid,
  p_started_at timestamptz default now()
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
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_scope_course_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_course_missing';
  end if;

  perform 1
  from public.canvas_courses course
  where course.id = p_scope_course_id
    and course.user_id = p_user_id
    and course.canvas_connection_id = p_canvas_connection_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_course_missing';
  end if;

  update public.canvas_sync_runs run
  set
    status = 'failed',
    completed_at = v_started_at,
    heartbeat_at = v_started_at,
    failure_code = 'stale_sync_recovered',
    failure_summary = 'Previous course synchronization run expired before completion.'
  where run.user_id = p_user_id
    and run.canvas_connection_id = p_canvas_connection_id
    and run.scope_course_id = p_scope_course_id
    and run.status = 'running'
    and run.heartbeat_at < v_stale_before;

  begin
    insert into public.canvas_sync_runs (
      user_id,
      canvas_connection_id,
      scope_course_id,
      sync_mode,
      status,
      started_at,
      heartbeat_at
    )
    values (
      p_user_id,
      p_canvas_connection_id,
      p_scope_course_id,
      'course',
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

revoke all on function public.set_canvas_course_sync_preferences_updated_at()
  from public;
revoke all on function public.set_canvas_course_sync_preferences_updated_at()
  from anon;
revoke all on function public.set_canvas_course_sync_preferences_updated_at()
  from authenticated;
grant execute on function public.set_canvas_course_sync_preferences_updated_at()
  to service_role;

revoke all on function public.replace_canvas_course_sync_preferences(
  uuid,
  uuid,
  uuid[],
  timestamptz
) from public;
revoke all on function public.replace_canvas_course_sync_preferences(
  uuid,
  uuid,
  uuid[],
  timestamptz
) from anon;
revoke all on function public.replace_canvas_course_sync_preferences(
  uuid,
  uuid,
  uuid[],
  timestamptz
) from authenticated;
grant execute on function public.replace_canvas_course_sync_preferences(
  uuid,
  uuid,
  uuid[],
  timestamptz
) to service_role;

revoke all on function public.begin_canvas_course_sync_run(
  uuid,
  uuid,
  uuid,
  timestamptz
) from public;
revoke all on function public.begin_canvas_course_sync_run(
  uuid,
  uuid,
  uuid,
  timestamptz
) from anon;
revoke all on function public.begin_canvas_course_sync_run(
  uuid,
  uuid,
  uuid,
  timestamptz
) from authenticated;
grant execute on function public.begin_canvas_course_sync_run(
  uuid,
  uuid,
  uuid,
  timestamptz
) to service_role;
