create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'pending',
  priority text not null default 'medium',
  due_at timestamptz,
  estimated_minutes integer not null default 30,
  source_type text not null default 'manual',
  canvas_connection_id uuid,
  canvas_course_id text,
  canvas_assignment_id text,
  canvas_assignment_row_id uuid references public.canvas_assignments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint tasks_id_user_unique unique (id, user_id),
  constraint tasks_title_safe check (char_length(btrim(title)) between 1 and 200),
  constraint tasks_notes_safe check (notes is null or char_length(notes) <= 5000),
  constraint tasks_status_allowed check (status in ('pending', 'completed')),
  constraint tasks_priority_allowed check (priority in ('low', 'medium', 'high')),
  constraint tasks_estimate_valid check (estimated_minutes between 1 and 1440),
  constraint tasks_source_type_allowed check (source_type in ('manual', 'canvas')),
  constraint tasks_completion_consistent check (
    (status = 'pending' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  ),
  constraint tasks_canvas_provenance_consistent check (
    (
      source_type = 'manual'
      and canvas_connection_id is null
      and canvas_course_id is null
      and canvas_assignment_id is null
      and canvas_assignment_row_id is null
    )
    or (
      source_type = 'canvas'
      and canvas_connection_id is not null
      and canvas_course_id is not null
      and char_length(btrim(canvas_course_id)) > 0
      and canvas_assignment_id is not null
      and char_length(btrim(canvas_assignment_id)) > 0
    )
  )
);

create unique index tasks_canvas_assignment_unique
  on public.tasks (
    user_id,
    canvas_connection_id,
    canvas_course_id,
    canvas_assignment_id
  )
  where source_type = 'canvas';

create index tasks_user_status_due_idx
  on public.tasks (user_id, status, due_at, created_at, id);

create index tasks_user_updated_idx
  on public.tasks (user_id, updated_at desc, id);

create index tasks_canvas_assignment_row_idx
  on public.tasks (canvas_assignment_row_id)
  where canvas_assignment_row_id is not null;

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planning_starts_at timestamptz not null,
  planning_ends_at timestamptz not null,
  algorithm_version text not null,
  input_hash text not null,
  created_at timestamptz not null default now(),
  constraint study_plans_id_user_unique unique (id, user_id),
  constraint study_plans_range_valid check (planning_starts_at < planning_ends_at),
  constraint study_plans_algorithm_safe check (
    algorithm_version = 'deterministic-v1'
  ),
  constraint study_plans_input_hash_safe check (input_hash ~ '^[a-f0-9]{64}$')
);

create index study_plans_user_created_idx
  on public.study_plans (user_id, created_at desc, id);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_plan_id uuid,
  task_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_plan_owner_fkey
    foreign key (study_plan_id, user_id)
    references public.study_plans (id, user_id)
    on delete set null (study_plan_id),
  constraint study_sessions_task_owner_fkey
    foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    on delete cascade,
  constraint study_sessions_interval_valid check (starts_at < ends_at)
);

create index study_sessions_user_starts_idx
  on public.study_sessions (user_id, starts_at, id);

create index study_sessions_task_idx
  on public.study_sessions (task_id, starts_at);

create index study_sessions_plan_idx
  on public.study_sessions (study_plan_id)
  where study_plan_id is not null;

create or replace function public.set_r5_updated_at()
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

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_r5_updated_at();

create trigger study_sessions_set_updated_at
before update on public.study_sessions
for each row execute function public.set_r5_updated_at();

alter table public.tasks enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_sessions enable row level security;

revoke all on table public.tasks from public, anon;
revoke all on table public.study_plans from public, anon;
revoke all on table public.study_sessions from public, anon;

grant select, insert, update, delete on table public.tasks to authenticated, service_role;
grant select, insert, update, delete on table public.study_plans to authenticated, service_role;
grant select, insert, update, delete on table public.study_sessions to authenticated, service_role;

create policy tasks_select_own
on public.tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy tasks_insert_own
on public.tasks for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy tasks_update_own
on public.tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy tasks_delete_own
on public.tasks for delete to authenticated
using ((select auth.uid()) = user_id);

create policy study_plans_select_own
on public.study_plans for select to authenticated
using ((select auth.uid()) = user_id);

create policy study_plans_insert_own
on public.study_plans for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy study_plans_update_own
on public.study_plans for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy study_plans_delete_own
on public.study_plans for delete to authenticated
using ((select auth.uid()) = user_id);

create policy study_sessions_select_own
on public.study_sessions for select to authenticated
using ((select auth.uid()) = user_id);

create policy study_sessions_insert_own
on public.study_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy study_sessions_update_own
on public.study_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy study_sessions_delete_own
on public.study_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.import_canvas_assignments_as_tasks_v1(
  p_user_id uuid,
  p_assignment_ids uuid[]
)
returns setof public.tasks
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_requested_count integer;
  v_owned_count integer;
begin
  if p_user_id is null
    or p_assignment_ids is null
    or cardinality(p_assignment_ids) < 1
    or cardinality(p_assignment_ids) > 100 then
    raise exception using errcode = 'P0001', message = 'canvas_task_import_invalid';
  end if;

  select count(distinct assignment_id)
  into v_requested_count
  from unnest(p_assignment_ids) as assignment_id;

  if v_requested_count <> cardinality(p_assignment_ids) then
    raise exception using errcode = 'P0001', message = 'canvas_task_import_duplicate';
  end if;

  select count(*)
  into v_owned_count
  from public.canvas_assignments assignment
  join public.canvas_courses course
    on course.id = assignment.course_id
    and course.user_id = assignment.user_id
    and course.canvas_connection_id = assignment.canvas_connection_id
  where assignment.user_id = p_user_id
    and assignment.id = any(p_assignment_ids);

  if v_owned_count <> v_requested_count then
    raise exception using errcode = 'P0001', message = 'canvas_assignment_not_found';
  end if;

  insert into public.tasks (
    user_id,
    title,
    notes,
    status,
    priority,
    due_at,
    estimated_minutes,
    source_type,
    canvas_connection_id,
    canvas_course_id,
    canvas_assignment_id,
    canvas_assignment_row_id
  )
  select
    assignment.user_id,
    left(btrim(assignment.name), 200),
    null,
    'pending',
    'medium',
    assignment.due_at,
    60,
    'canvas',
    assignment.canvas_connection_id,
    course.canvas_course_id,
    assignment.canvas_assignment_id,
    assignment.id
  from public.canvas_assignments assignment
  join public.canvas_courses course
    on course.id = assignment.course_id
    and course.user_id = assignment.user_id
    and course.canvas_connection_id = assignment.canvas_connection_id
  where assignment.user_id = p_user_id
    and assignment.id = any(p_assignment_ids)
  on conflict (
    user_id,
    canvas_connection_id,
    canvas_course_id,
    canvas_assignment_id
  ) where source_type = 'canvas'
  do nothing;

  return query
  select task.*
  from public.tasks task
  join public.canvas_assignments assignment
    on assignment.user_id = task.user_id
    and assignment.canvas_connection_id = task.canvas_connection_id
    and assignment.canvas_assignment_id = task.canvas_assignment_id
  join public.canvas_courses course
    on course.id = assignment.course_id
    and course.user_id = assignment.user_id
    and course.canvas_connection_id = assignment.canvas_connection_id
    and course.canvas_course_id = task.canvas_course_id
  where task.user_id = p_user_id
    and task.source_type = 'canvas'
    and assignment.id = any(p_assignment_ids)
  order by task.created_at, task.id;
end;
$$;

create or replace function public.apply_study_plan_v1(
  p_user_id uuid,
  p_planning_starts_at timestamptz,
  p_planning_ends_at timestamptz,
  p_algorithm_version text,
  p_input_hash text,
  p_sessions jsonb
)
returns table (study_plan_id uuid, session_count integer)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_session_count integer;
begin
  if p_user_id is null
    or p_planning_starts_at is null
    or p_planning_ends_at is null
    or p_planning_starts_at >= p_planning_ends_at
    or p_algorithm_version <> 'deterministic-v1'
    or p_input_hash !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_sessions) is distinct from 'array'
    or jsonb_array_length(p_sessions) > 1000 then
    raise exception using errcode = 'P0001', message = 'study_plan_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_sessions) as session(
      task_id uuid,
      starts_at timestamptz,
      ends_at timestamptz
    )
    left join public.tasks task
      on task.id = session.task_id
      and task.user_id = p_user_id
      and task.status = 'pending'
    where task.id is null
      or session.starts_at is null
      or session.ends_at is null
      or session.starts_at >= session.ends_at
      or session.starts_at < p_planning_starts_at
      or session.ends_at > p_planning_ends_at
  ) then
    raise exception using errcode = 'P0001', message = 'study_plan_session_invalid';
  end if;

  insert into public.study_plans (
    user_id,
    planning_starts_at,
    planning_ends_at,
    algorithm_version,
    input_hash
  )
  values (
    p_user_id,
    p_planning_starts_at,
    p_planning_ends_at,
    p_algorithm_version,
    p_input_hash
  )
  returning id into v_plan_id;

  insert into public.study_sessions (
    user_id,
    study_plan_id,
    task_id,
    starts_at,
    ends_at
  )
  select
    p_user_id,
    v_plan_id,
    session.task_id,
    session.starts_at,
    session.ends_at
  from jsonb_to_recordset(p_sessions) as session(
    task_id uuid,
    starts_at timestamptz,
    ends_at timestamptz
  );

  get diagnostics v_session_count = row_count;
  return query select v_plan_id, v_session_count;
end;
$$;

revoke all on function public.set_r5_updated_at() from public, anon, authenticated;
grant execute on function public.set_r5_updated_at() to service_role;

revoke all on function public.import_canvas_assignments_as_tasks_v1(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.import_canvas_assignments_as_tasks_v1(uuid, uuid[])
  to service_role;

revoke all on function public.apply_study_plan_v1(
  uuid, timestamptz, timestamptz, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_study_plan_v1(
  uuid, timestamptz, timestamptz, text, text, jsonb
) to service_role;
