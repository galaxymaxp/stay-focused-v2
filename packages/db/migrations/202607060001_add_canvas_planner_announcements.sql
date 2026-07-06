alter table public.canvas_sync_runs
  alter column resource_counts set default
    '{"modules":0,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0,"plannerItems":0,"announcements":0}'::jsonb;

create table if not exists public.canvas_planner_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid,
  canvas_course_id text,
  canvas_planner_item_id text not null,
  context_code text,
  plannable_type text not null,
  plannable_id text not null,
  title text,
  planner_date timestamptz,
  due_at timestamptz,
  todo_date timestamptz,
  html_url text,
  workflow_state text,
  marked_complete boolean,
  dismissed boolean,
  submission_excused boolean,
  submission_graded boolean,
  submission_late boolean,
  submission_missing boolean,
  submission_needs_grading boolean,
  submission_with_feedback boolean,
  source_fingerprint text not null,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_planner_items_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_planner_items_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id, canvas_course_id)
    references public.canvas_courses (
      id,
      user_id,
      canvas_connection_id,
      canvas_course_id
    )
    on delete set null (course_id, canvas_course_id),
  constraint canvas_planner_items_identity_unique
    unique (user_id, canvas_connection_id, canvas_planner_item_id),
  constraint canvas_planner_items_canvas_id_not_blank
    check (char_length(btrim(canvas_planner_item_id)) > 0),
  constraint canvas_planner_items_course_id_not_blank
    check (canvas_course_id is null or char_length(btrim(canvas_course_id)) > 0),
  constraint canvas_planner_items_context_code_allowed
    check (context_code is null or context_code ~ '^course_[^[:space:]_]+$'),
  constraint canvas_planner_items_plannable_type_not_blank
    check (char_length(btrim(plannable_type)) > 0),
  constraint canvas_planner_items_plannable_id_not_blank
    check (char_length(btrim(plannable_id)) > 0),
  constraint canvas_planner_items_fingerprint_not_blank
    check (
      char_length(btrim(source_fingerprint)) > 0
      and char_length(source_fingerprint) <= 128
    )
);

create table if not exists public.canvas_announcements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  course_id uuid not null,
  canvas_course_id text not null,
  canvas_announcement_id text not null,
  title text not null,
  message_html text,
  posted_at timestamptz,
  delayed_post_at timestamptz,
  lock_at timestamptz,
  todo_date timestamptz,
  workflow_state text,
  published boolean,
  locked boolean,
  html_url text,
  source_fingerprint text not null,
  first_synced_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_announcements_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_announcements_course_owner_fkey
    foreign key (course_id, user_id, canvas_connection_id, canvas_course_id)
    references public.canvas_courses (
      id,
      user_id,
      canvas_connection_id,
      canvas_course_id
    )
    on delete cascade,
  constraint canvas_announcements_identity_unique
    unique (course_id, canvas_announcement_id),
  constraint canvas_announcements_canvas_id_not_blank
    check (char_length(btrim(canvas_announcement_id)) > 0),
  constraint canvas_announcements_course_id_not_blank
    check (char_length(btrim(canvas_course_id)) > 0),
  constraint canvas_announcements_title_not_blank
    check (char_length(btrim(title)) > 0),
  constraint canvas_announcements_fingerprint_not_blank
    check (
      char_length(btrim(source_fingerprint)) > 0
      and char_length(source_fingerprint) <= 128
    )
);

create index if not exists canvas_planner_items_user_date_idx
  on public.canvas_planner_items (user_id, planner_date)
  where planner_date is not null;
create index if not exists canvas_planner_items_connection_date_idx
  on public.canvas_planner_items (canvas_connection_id, planner_date)
  where planner_date is not null;
create index if not exists canvas_planner_items_course_date_idx
  on public.canvas_planner_items (course_id, planner_date)
  where course_id is not null and planner_date is not null;
create index if not exists canvas_planner_items_plannable_idx
  on public.canvas_planner_items (
    user_id,
    canvas_connection_id,
    plannable_type,
    plannable_id
  );

create index if not exists canvas_announcements_user_posted_idx
  on public.canvas_announcements (user_id, posted_at desc)
  where posted_at is not null;
create index if not exists canvas_announcements_connection_posted_idx
  on public.canvas_announcements (canvas_connection_id, posted_at desc)
  where posted_at is not null;
create index if not exists canvas_announcements_course_posted_idx
  on public.canvas_announcements (course_id, posted_at desc);

create or replace function public.set_canvas_planner_items_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_canvas_announcements_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_planner_items_set_updated_at
  on public.canvas_planner_items;
create trigger canvas_planner_items_set_updated_at
before update on public.canvas_planner_items
for each row
execute function public.set_canvas_planner_items_updated_at();

drop trigger if exists canvas_announcements_set_updated_at
  on public.canvas_announcements;
create trigger canvas_announcements_set_updated_at
before update on public.canvas_announcements
for each row
execute function public.set_canvas_announcements_updated_at();

alter table public.canvas_planner_items enable row level security;
alter table public.canvas_announcements enable row level security;

revoke all on table public.canvas_planner_items from public;
revoke all on table public.canvas_planner_items from anon;
revoke all on table public.canvas_planner_items from authenticated;
revoke all on table public.canvas_announcements from public;
revoke all on table public.canvas_announcements from anon;
revoke all on table public.canvas_announcements from authenticated;

grant select, insert, update, delete on table public.canvas_planner_items
  to service_role;
grant select, insert, update, delete on table public.canvas_announcements
  to service_role;

drop policy if exists canvas_planner_items_select_own
  on public.canvas_planner_items;
create policy canvas_planner_items_select_own
on public.canvas_planner_items
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_planner_items_insert_own
  on public.canvas_planner_items;
create policy canvas_planner_items_insert_own
on public.canvas_planner_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_planner_items_update_own
  on public.canvas_planner_items;
create policy canvas_planner_items_update_own
on public.canvas_planner_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_planner_items_delete_own
  on public.canvas_planner_items;
create policy canvas_planner_items_delete_own
on public.canvas_planner_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_announcements_select_own
  on public.canvas_announcements;
create policy canvas_announcements_select_own
on public.canvas_announcements
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_announcements_insert_own
  on public.canvas_announcements;
create policy canvas_announcements_insert_own
on public.canvas_announcements
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_announcements_update_own
  on public.canvas_announcements;
create policy canvas_announcements_update_own
on public.canvas_announcements
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_announcements_delete_own
  on public.canvas_announcements;
create policy canvas_announcements_delete_own
on public.canvas_announcements
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.replace_canvas_planner_items_snapshot(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_synced_at timestamptz,
  p_window_start_at timestamptz,
  p_window_end_at timestamptz,
  p_context_codes text[],
  p_items jsonb
)
returns table (
  planner_items_inserted integer,
  planner_items_updated integer,
  planner_items_unchanged integer,
  planner_items_pruned integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_synced_at timestamptz := coalesce(p_synced_at, now());
  v_window_start_at timestamptz := p_window_start_at;
  v_window_end_at timestamptz := p_window_end_at;
  v_context_codes text[] := coalesce(p_context_codes, '{}'::text[]);
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_sync_run_id is null
    or v_window_start_at is null
    or v_window_end_at is null
    or jsonb_typeof(p_items) is distinct from 'array'
  then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_planner_snapshot';
  end if;

  if v_window_start_at > v_window_end_at then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_planner_window';
  end if;

  if cardinality(v_context_codes) = 0
    or exists (
      select 1
      from unnest(v_context_codes) as context_code
      where context_code is null
        or context_code !~ '^course_[^[:space:]_]+$'
    )
  then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_planner_contexts';
  end if;

  perform 1
  from public.canvas_connections connection
  where connection.id = p_canvas_connection_id
    and connection.user_id = p_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_connection_missing';
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

  drop table if exists pg_temp._canvas_sync_planner_items;
  create temp table _canvas_sync_planner_items on commit drop as
  select
    nullif(btrim(item.canvas_planner_item_id), '') as canvas_planner_item_id,
    nullif(btrim(item.context_code), '') as context_code,
    nullif(btrim(item.canvas_course_id), '') as canvas_course_id,
    nullif(btrim(item.plannable_type), '') as plannable_type,
    nullif(btrim(item.plannable_id), '') as plannable_id,
    nullif(btrim(item.title), '') as title,
    item.planner_date,
    item.due_at,
    item.todo_date,
    nullif(btrim(item.html_url), '') as html_url,
    nullif(btrim(item.workflow_state), '') as workflow_state,
    item.marked_complete,
    item.dismissed,
    item.submission_excused,
    item.submission_graded,
    item.submission_late,
    item.submission_missing,
    item.submission_needs_grading,
    item.submission_with_feedback,
    nullif(btrim(item.source_fingerprint), '') as source_fingerprint
  from jsonb_to_recordset(p_items) as item(
    canvas_planner_item_id text,
    context_code text,
    canvas_course_id text,
    plannable_type text,
    plannable_id text,
    title text,
    planner_date timestamptz,
    due_at timestamptz,
    todo_date timestamptz,
    html_url text,
    workflow_state text,
    marked_complete boolean,
    dismissed boolean,
    submission_excused boolean,
    submission_graded boolean,
    submission_late boolean,
    submission_missing boolean,
    submission_needs_grading boolean,
    submission_with_feedback boolean,
    source_fingerprint text
  );

  if exists (
    select 1
    from pg_temp._canvas_sync_planner_items
    where canvas_planner_item_id is null
      or plannable_type is null
      or plannable_id is null
      or source_fingerprint is null
      or char_length(source_fingerprint) > 128
      or (context_code is not null and context_code !~ '^course_[^[:space:]_]+$')
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_planner_item';
  end if;

  if (
    select count(*) <> count(distinct canvas_planner_item_id)
    from pg_temp._canvas_sync_planner_items
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_planner_item';
  end if;

  drop table if exists pg_temp._canvas_sync_planner_items_resolved;
  create temp table _canvas_sync_planner_items_resolved on commit drop as
  select
    course.id as course_id,
    item.*
  from pg_temp._canvas_sync_planner_items item
  left join public.canvas_courses course
    on course.user_id = p_user_id
   and course.canvas_connection_id = p_canvas_connection_id
   and course.canvas_course_id = item.canvas_course_id;

  select count(*) into planner_items_inserted
  from pg_temp._canvas_sync_planner_items_resolved incoming
  where not exists (
    select 1
    from public.canvas_planner_items existing
    where existing.user_id = p_user_id
      and existing.canvas_connection_id = p_canvas_connection_id
      and existing.canvas_planner_item_id = incoming.canvas_planner_item_id
  );

  select count(*) into planner_items_updated
  from pg_temp._canvas_sync_planner_items_resolved incoming
  join public.canvas_planner_items existing
    on existing.user_id = p_user_id
   and existing.canvas_connection_id = p_canvas_connection_id
   and existing.canvas_planner_item_id = incoming.canvas_planner_item_id
  where existing.source_fingerprint is distinct from incoming.source_fingerprint;

  select count(*) into planner_items_unchanged
  from pg_temp._canvas_sync_planner_items_resolved incoming
  join public.canvas_planner_items existing
    on existing.user_id = p_user_id
   and existing.canvas_connection_id = p_canvas_connection_id
   and existing.canvas_planner_item_id = incoming.canvas_planner_item_id
  where existing.source_fingerprint = incoming.source_fingerprint;

  select count(*) into planner_items_pruned
  from public.canvas_planner_items existing
  where existing.user_id = p_user_id
    and existing.canvas_connection_id = p_canvas_connection_id
    and existing.context_code = any(v_context_codes)
    and existing.planner_date between v_window_start_at and v_window_end_at
    and not exists (
      select 1
      from pg_temp._canvas_sync_planner_items_resolved incoming
      where incoming.canvas_planner_item_id = existing.canvas_planner_item_id
    );

  delete from public.canvas_planner_items existing
  where existing.user_id = p_user_id
    and existing.canvas_connection_id = p_canvas_connection_id
    and existing.context_code = any(v_context_codes)
    and existing.planner_date between v_window_start_at and v_window_end_at
    and not exists (
      select 1
      from pg_temp._canvas_sync_planner_items_resolved incoming
      where incoming.canvas_planner_item_id = existing.canvas_planner_item_id
    );

  insert into public.canvas_planner_items (
    user_id,
    canvas_connection_id,
    course_id,
    canvas_course_id,
    canvas_planner_item_id,
    context_code,
    plannable_type,
    plannable_id,
    title,
    planner_date,
    due_at,
    todo_date,
    html_url,
    workflow_state,
    marked_complete,
    dismissed,
    submission_excused,
    submission_graded,
    submission_late,
    submission_missing,
    submission_needs_grading,
    submission_with_feedback,
    source_fingerprint,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    course_id,
    canvas_course_id,
    canvas_planner_item_id,
    context_code,
    plannable_type,
    plannable_id,
    title,
    planner_date,
    due_at,
    todo_date,
    html_url,
    workflow_state,
    marked_complete,
    dismissed,
    submission_excused,
    submission_graded,
    submission_late,
    submission_missing,
    submission_needs_grading,
    submission_with_feedback,
    source_fingerprint,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_planner_items_resolved
  on conflict on constraint canvas_planner_items_identity_unique
  do update set
    course_id = excluded.course_id,
    canvas_course_id = excluded.canvas_course_id,
    context_code = excluded.context_code,
    plannable_type = excluded.plannable_type,
    plannable_id = excluded.plannable_id,
    title = excluded.title,
    planner_date = excluded.planner_date,
    due_at = excluded.due_at,
    todo_date = excluded.todo_date,
    html_url = excluded.html_url,
    workflow_state = excluded.workflow_state,
    marked_complete = excluded.marked_complete,
    dismissed = excluded.dismissed,
    submission_excused = excluded.submission_excused,
    submission_graded = excluded.submission_graded,
    submission_late = excluded.submission_late,
    submission_missing = excluded.submission_missing,
    submission_needs_grading = excluded.submission_needs_grading,
    submission_with_feedback = excluded.submission_with_feedback,
    source_fingerprint = excluded.source_fingerprint,
    last_synced_at = excluded.last_synced_at
  where canvas_planner_items.source_fingerprint is distinct from excluded.source_fingerprint;

  return next;
end;
$$;

create or replace function public.replace_canvas_course_announcements_snapshot(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_synced_at timestamptz,
  p_window_start_at timestamptz,
  p_window_end_at timestamptz,
  p_canvas_course_id text,
  p_announcements jsonb
)
returns table (
  announcements_inserted integer,
  announcements_updated integer,
  announcements_unchanged integer,
  announcements_pruned integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_course_id uuid;
  v_canvas_course_id text := nullif(btrim(p_canvas_course_id), '');
  v_synced_at timestamptz := coalesce(p_synced_at, now());
  v_window_start_at timestamptz := p_window_start_at;
  v_window_end_at timestamptz := p_window_end_at;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_sync_run_id is null
    or v_canvas_course_id is null
    or v_window_start_at is null
    or v_window_end_at is null
    or jsonb_typeof(p_announcements) is distinct from 'array'
  then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_announcement_snapshot';
  end if;

  if v_window_start_at > v_window_end_at then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_announcement_window';
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

  if v_course_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_course_missing';
  end if;

  drop table if exists pg_temp._canvas_sync_announcements;
  create temp table _canvas_sync_announcements on commit drop as
  select
    nullif(btrim(announcement.canvas_announcement_id), '') as canvas_announcement_id,
    nullif(btrim(announcement.canvas_course_id), '') as canvas_course_id,
    nullif(btrim(announcement.title), '') as title,
    announcement.message_html,
    announcement.posted_at,
    announcement.delayed_post_at,
    announcement.lock_at,
    announcement.todo_date,
    nullif(btrim(announcement.workflow_state), '') as workflow_state,
    announcement.published,
    announcement.locked,
    nullif(btrim(announcement.html_url), '') as html_url,
    nullif(btrim(announcement.source_fingerprint), '') as source_fingerprint
  from jsonb_to_recordset(p_announcements) as announcement(
    canvas_announcement_id text,
    canvas_course_id text,
    title text,
    message_html text,
    posted_at timestamptz,
    delayed_post_at timestamptz,
    lock_at timestamptz,
    todo_date timestamptz,
    workflow_state text,
    published boolean,
    locked boolean,
    html_url text,
    source_fingerprint text
  );

  if exists (
    select 1
    from pg_temp._canvas_sync_announcements
    where canvas_announcement_id is null
      or canvas_course_id is distinct from v_canvas_course_id
      or title is null
      or source_fingerprint is null
      or char_length(source_fingerprint) > 128
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_announcement';
  end if;

  if (
    select count(*) <> count(distinct canvas_announcement_id)
    from pg_temp._canvas_sync_announcements
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_announcement';
  end if;

  select count(*) into announcements_inserted
  from pg_temp._canvas_sync_announcements incoming
  where not exists (
    select 1
    from public.canvas_announcements existing
    where existing.course_id = v_course_id
      and existing.canvas_announcement_id = incoming.canvas_announcement_id
  );

  select count(*) into announcements_updated
  from pg_temp._canvas_sync_announcements incoming
  join public.canvas_announcements existing
    on existing.course_id = v_course_id
   and existing.canvas_announcement_id = incoming.canvas_announcement_id
  where existing.source_fingerprint is distinct from incoming.source_fingerprint;

  select count(*) into announcements_unchanged
  from pg_temp._canvas_sync_announcements incoming
  join public.canvas_announcements existing
    on existing.course_id = v_course_id
   and existing.canvas_announcement_id = incoming.canvas_announcement_id
  where existing.source_fingerprint = incoming.source_fingerprint;

  select count(*) into announcements_pruned
  from public.canvas_announcements existing
  where existing.course_id = v_course_id
    and coalesce(
      existing.posted_at,
      existing.delayed_post_at,
      existing.todo_date
    ) between v_window_start_at and v_window_end_at
    and not exists (
      select 1
      from pg_temp._canvas_sync_announcements incoming
      where incoming.canvas_announcement_id = existing.canvas_announcement_id
    );

  delete from public.canvas_announcements existing
  where existing.course_id = v_course_id
    and coalesce(
      existing.posted_at,
      existing.delayed_post_at,
      existing.todo_date
    ) between v_window_start_at and v_window_end_at
    and not exists (
      select 1
      from pg_temp._canvas_sync_announcements incoming
      where incoming.canvas_announcement_id = existing.canvas_announcement_id
    );

  insert into public.canvas_announcements (
    user_id,
    canvas_connection_id,
    course_id,
    canvas_course_id,
    canvas_announcement_id,
    title,
    message_html,
    posted_at,
    delayed_post_at,
    lock_at,
    todo_date,
    workflow_state,
    published,
    locked,
    html_url,
    source_fingerprint,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    v_canvas_course_id,
    canvas_announcement_id,
    title,
    message_html,
    posted_at,
    delayed_post_at,
    lock_at,
    todo_date,
    workflow_state,
    published,
    locked,
    html_url,
    source_fingerprint,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_announcements
  on conflict on constraint canvas_announcements_identity_unique
  do update set
    title = excluded.title,
    message_html = excluded.message_html,
    posted_at = excluded.posted_at,
    delayed_post_at = excluded.delayed_post_at,
    lock_at = excluded.lock_at,
    todo_date = excluded.todo_date,
    workflow_state = excluded.workflow_state,
    published = excluded.published,
    locked = excluded.locked,
    html_url = excluded.html_url,
    source_fingerprint = excluded.source_fingerprint,
    last_synced_at = excluded.last_synced_at
  where canvas_announcements.source_fingerprint is distinct from excluded.source_fingerprint;

  return next;
end;
$$;

revoke all on function public.replace_canvas_planner_items_snapshot(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text[],
  jsonb
) from public;
revoke all on function public.replace_canvas_planner_items_snapshot(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text[],
  jsonb
) from anon;
revoke all on function public.replace_canvas_planner_items_snapshot(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text[],
  jsonb
) from authenticated;
grant execute on function public.replace_canvas_planner_items_snapshot(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text[],
  jsonb
) to service_role;

revoke all on function public.replace_canvas_course_announcements_snapshot(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  jsonb
) from public;
revoke all on function public.replace_canvas_course_announcements_snapshot(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  jsonb
) from anon;
revoke all on function public.replace_canvas_course_announcements_snapshot(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  jsonb
) from authenticated;
grant execute on function public.replace_canvas_course_announcements_snapshot(
  uuid,
  uuid,
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  jsonb
) to service_role;
