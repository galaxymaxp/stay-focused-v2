create table if not exists public.canvas_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_connection_id uuid not null,
  sync_mode text not null default 'full',
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  heartbeat_at timestamptz not null default now(),
  discovered_course_count integer not null default 0,
  successful_course_count integer not null default 0,
  failed_course_count integer not null default 0,
  resource_counts jsonb not null default
    '{"modules":0,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0}'::jsonb,
  failure_code text,
  failure_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canvas_sync_runs_connection_user_fkey
    foreign key (canvas_connection_id, user_id)
    references public.canvas_connections (id, user_id)
    on delete cascade,
  constraint canvas_sync_runs_mode_allowed
    check (sync_mode in ('full')),
  constraint canvas_sync_runs_status_allowed
    check (status in ('running', 'succeeded', 'partial', 'failed')),
  constraint canvas_sync_runs_completion_status_consistency
    check (
      (status = 'running' and completed_at is null)
      or (status <> 'running' and completed_at is not null)
    ),
  constraint canvas_sync_runs_course_counts_non_negative
    check (
      discovered_course_count >= 0
      and successful_course_count >= 0
      and failed_course_count >= 0
    ),
  constraint canvas_sync_runs_resource_counts_object
    check (jsonb_typeof(resource_counts) = 'object'),
  constraint canvas_sync_runs_failure_code_not_blank
    check (failure_code is null or char_length(btrim(failure_code)) > 0),
  constraint canvas_sync_runs_failure_summary_safe_length
    check (
      failure_summary is null
      or (
        char_length(btrim(failure_summary)) > 0
        and char_length(failure_summary) <= 300
      )
    )
);

create index if not exists canvas_sync_runs_user_started_idx
  on public.canvas_sync_runs (user_id, started_at desc);
create index if not exists canvas_sync_runs_connection_started_idx
  on public.canvas_sync_runs (canvas_connection_id, started_at desc);
create index if not exists canvas_sync_runs_status_heartbeat_idx
  on public.canvas_sync_runs (status, heartbeat_at);

create unique index if not exists canvas_sync_runs_one_running_per_connection_idx
  on public.canvas_sync_runs (canvas_connection_id)
  where status = 'running';

create or replace function public.set_canvas_sync_runs_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists canvas_sync_runs_set_updated_at
  on public.canvas_sync_runs;
create trigger canvas_sync_runs_set_updated_at
before update on public.canvas_sync_runs
for each row
execute function public.set_canvas_sync_runs_updated_at();

alter table public.canvas_sync_runs enable row level security;

revoke all on table public.canvas_sync_runs from anon;
revoke all on table public.canvas_sync_runs from authenticated;
grant select, insert, update, delete on table public.canvas_sync_runs to service_role;

drop policy if exists canvas_sync_runs_select_own on public.canvas_sync_runs;
create policy canvas_sync_runs_select_own
on public.canvas_sync_runs
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists canvas_sync_runs_insert_own on public.canvas_sync_runs;
create policy canvas_sync_runs_insert_own
on public.canvas_sync_runs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_sync_runs_update_own on public.canvas_sync_runs;
create policy canvas_sync_runs_update_own
on public.canvas_sync_runs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists canvas_sync_runs_delete_own on public.canvas_sync_runs;
create policy canvas_sync_runs_delete_own
on public.canvas_sync_runs
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.begin_canvas_sync_run(
  p_user_id uuid,
  p_canvas_connection_id uuid,
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
begin
  if p_user_id is null or p_canvas_connection_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_connection_missing';
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
      'full',
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

create or replace function public.update_canvas_sync_run_progress(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_discovered_course_count integer,
  p_successful_course_count integer,
  p_failed_course_count integer,
  p_resource_counts jsonb,
  p_heartbeat_at timestamptz
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
  v_resource_counts jsonb := coalesce(
    p_resource_counts,
    '{"modules":0,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0}'::jsonb
  );
begin
  if jsonb_typeof(v_resource_counts) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'invalid_resource_counts';
  end if;

  update public.canvas_sync_runs run
  set
    discovered_course_count = p_discovered_course_count,
    successful_course_count = p_successful_course_count,
    failed_course_count = p_failed_course_count,
    resource_counts = v_resource_counts,
    heartbeat_at = coalesce(p_heartbeat_at, now())
  where run.id = p_sync_run_id
    and run.user_id = p_user_id
    and run.canvas_connection_id = p_canvas_connection_id
    and run.status = 'running'
  returning *
  into v_run;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_sync_run_missing';
  end if;

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

create or replace function public.finish_canvas_sync_run(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_status text,
  p_discovered_course_count integer,
  p_successful_course_count integer,
  p_failed_course_count integer,
  p_resource_counts jsonb,
  p_failure_code text,
  p_failure_summary text,
  p_completed_at timestamptz
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
  v_completed_at timestamptz := coalesce(p_completed_at, now());
  v_resource_counts jsonb := coalesce(
    p_resource_counts,
    '{"modules":0,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0}'::jsonb
  );
  v_run public.canvas_sync_runs%rowtype;
begin
  if p_status not in ('succeeded', 'partial', 'failed') then
    raise exception using errcode = 'P0001', message = 'invalid_sync_status';
  end if;

  if jsonb_typeof(v_resource_counts) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'invalid_resource_counts';
  end if;

  update public.canvas_sync_runs run
  set
    status = p_status,
    completed_at = v_completed_at,
    heartbeat_at = v_completed_at,
    discovered_course_count = p_discovered_course_count,
    successful_course_count = p_successful_course_count,
    failed_course_count = p_failed_course_count,
    resource_counts = v_resource_counts,
    failure_code = nullif(btrim(p_failure_code), ''),
    failure_summary = nullif(left(btrim(p_failure_summary), 300), '')
  where run.id = p_sync_run_id
    and run.user_id = p_user_id
    and run.canvas_connection_id = p_canvas_connection_id
    and run.status = 'running'
  returning *
  into v_run;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_sync_run_missing';
  end if;

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

create or replace function public.replace_canvas_course_academic_snapshot(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_sync_run_id uuid,
  p_synced_at timestamptz,
  p_course jsonb,
  p_modules jsonb,
  p_module_items jsonb,
  p_pages jsonb,
  p_assignment_groups jsonb,
  p_assignments jsonb
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
  assignments_deleted integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_course_id uuid;
  v_course_canvas_id text;
  v_course_existed boolean;
  v_synced_at timestamptz := coalesce(p_synced_at, now());
  v_modules_incoming integer;
  v_modules_existing integer;
  v_module_items_incoming integer;
  v_module_items_existing integer;
  v_pages_incoming integer;
  v_pages_existing integer;
  v_assignment_groups_incoming integer;
  v_assignment_groups_existing integer;
  v_assignments_incoming integer;
  v_assignments_existing integer;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_sync_run_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_snapshot_owner_missing';
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

  if jsonb_typeof(p_course) is distinct from 'object'
    or jsonb_typeof(p_modules) is distinct from 'array'
    or jsonb_typeof(p_module_items) is distinct from 'array'
    or jsonb_typeof(p_pages) is distinct from 'array'
    or jsonb_typeof(p_assignment_groups) is distinct from 'array'
    or jsonb_typeof(p_assignments) is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_snapshot_payload';
  end if;

  drop table if exists pg_temp._canvas_sync_course;
  create temp table _canvas_sync_course on commit drop as
  select
    nullif(btrim(course.canvas_course_id), '') as canvas_course_id,
    nullif(btrim(course.name), '') as name,
    nullif(btrim(course.course_code), '') as course_code,
    nullif(btrim(course.workflow_state), '') as workflow_state,
    nullif(btrim(course.enrollment_term_id), '') as enrollment_term_id,
    nullif(btrim(course.account_id), '') as account_id,
    course.start_at,
    course.end_at,
    nullif(btrim(course.time_zone), '') as time_zone,
    course.public_syllabus,
    course.syllabus_body,
    course.canvas_updated_at
  from jsonb_to_record(p_course) as course(
    canvas_course_id text,
    name text,
    course_code text,
    workflow_state text,
    enrollment_term_id text,
    account_id text,
    start_at timestamptz,
    end_at timestamptz,
    time_zone text,
    public_syllabus boolean,
    syllabus_body text,
    canvas_updated_at timestamptz
  );

  if exists (
    select 1 from pg_temp._canvas_sync_course
    where canvas_course_id is null or name is null
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_course';
  end if;

  select canvas_course_id into v_course_canvas_id
  from pg_temp._canvas_sync_course;

  drop table if exists pg_temp._canvas_sync_modules;
  create temp table _canvas_sync_modules on commit drop as
  select
    nullif(btrim(module.canvas_module_id), '') as canvas_module_id,
    nullif(btrim(module.name), '') as name,
    module.position,
    module.unlock_at,
    module.item_count,
    module.require_sequential_progress,
    module.published,
    coalesce(module.prerequisite_module_ids, '{}'::text[]) as prerequisite_module_ids,
    nullif(btrim(module.canvas_state), '') as canvas_state
  from jsonb_to_recordset(p_modules) as module(
    canvas_module_id text,
    name text,
    position integer,
    unlock_at timestamptz,
    item_count integer,
    require_sequential_progress boolean,
    published boolean,
    prerequisite_module_ids text[],
    canvas_state text
  );

  if exists (
    select 1 from pg_temp._canvas_sync_modules
    where canvas_module_id is null or name is null
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_module';
  end if;

  if (
    select count(*) <> count(distinct canvas_module_id)
    from pg_temp._canvas_sync_modules
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_module';
  end if;

  drop table if exists pg_temp._canvas_sync_module_items;
  create temp table _canvas_sync_module_items on commit drop as
  select
    nullif(btrim(item.canvas_module_id), '') as canvas_module_id,
    nullif(btrim(item.canvas_module_item_id), '') as canvas_module_item_id,
    nullif(btrim(item.title), '') as title,
    item.position,
    item.indent,
    nullif(btrim(item.item_type), '') as item_type,
    nullif(btrim(item.canvas_content_id), '') as canvas_content_id,
    nullif(btrim(item.page_url), '') as page_url,
    nullif(btrim(item.external_url), '') as external_url,
    nullif(btrim(item.html_url), '') as html_url,
    item.new_tab,
    item.published,
    item.completion_requirement,
    item.content_details
  from jsonb_to_recordset(p_module_items) as item(
    canvas_module_id text,
    canvas_module_item_id text,
    title text,
    position integer,
    indent integer,
    item_type text,
    canvas_content_id text,
    page_url text,
    external_url text,
    html_url text,
    new_tab boolean,
    published boolean,
    completion_requirement jsonb,
    content_details jsonb
  );

  if exists (
    select 1 from pg_temp._canvas_sync_module_items
    where canvas_module_id is null
      or canvas_module_item_id is null
      or title is null
      or item_type is null
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_module_item';
  end if;

  if exists (
    select 1
    from pg_temp._canvas_sync_module_items item
    where not exists (
      select 1
      from pg_temp._canvas_sync_modules module
      where module.canvas_module_id = item.canvas_module_id
    )
  ) then
    raise exception using errcode = 'P0001', message = 'missing_snapshot_module';
  end if;

  if (
    select count(*) <> count(distinct (canvas_module_id, canvas_module_item_id))
    from pg_temp._canvas_sync_module_items
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_module_item';
  end if;

  if exists (
    select 1
    from pg_temp._canvas_sync_module_items
    where (
      completion_requirement is not null
      and jsonb_typeof(completion_requirement) <> 'object'
    ) or (
      content_details is not null
      and jsonb_typeof(content_details) <> 'object'
    )
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_module_item_json';
  end if;

  drop table if exists pg_temp._canvas_sync_pages;
  create temp table _canvas_sync_pages on commit drop as
  select
    nullif(btrim(page.canvas_page_id), '') as canvas_page_id,
    nullif(btrim(page.canvas_page_url), '') as canvas_page_url,
    nullif(btrim(page.title), '') as title,
    page.body_html,
    page.published,
    page.front_page,
    nullif(btrim(page.editing_roles), '') as editing_roles,
    page.lock_info,
    page.unlock_at,
    page.lock_at,
    page.canvas_created_at,
    page.canvas_updated_at
  from jsonb_to_recordset(p_pages) as page(
    canvas_page_id text,
    canvas_page_url text,
    title text,
    body_html text,
    published boolean,
    front_page boolean,
    editing_roles text,
    lock_info jsonb,
    unlock_at timestamptz,
    lock_at timestamptz,
    canvas_created_at timestamptz,
    canvas_updated_at timestamptz
  );

  if exists (
    select 1 from pg_temp._canvas_sync_pages
    where canvas_page_url is null or title is null
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_page';
  end if;

  if (
    select count(*) <> count(distinct canvas_page_url)
    from pg_temp._canvas_sync_pages
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_page';
  end if;

  if exists (
    select 1
    from pg_temp._canvas_sync_pages
    where lock_info is not null
      and jsonb_typeof(lock_info) <> 'object'
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_page_json';
  end if;

  drop table if exists pg_temp._canvas_sync_assignment_groups;
  create temp table _canvas_sync_assignment_groups on commit drop as
  select
    nullif(btrim(assignment_group.canvas_assignment_group_id), '') as canvas_assignment_group_id,
    nullif(btrim(assignment_group.name), '') as name,
    assignment_group.position,
    assignment_group.group_weight,
    assignment_group.rules,
    assignment_group.integration_data
  from jsonb_to_recordset(p_assignment_groups) as assignment_group(
    canvas_assignment_group_id text,
    name text,
    position integer,
    group_weight numeric,
    rules jsonb,
    integration_data jsonb
  );

  if exists (
    select 1 from pg_temp._canvas_sync_assignment_groups
    where canvas_assignment_group_id is null or name is null
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_assignment_group';
  end if;

  if (
    select count(*) <> count(distinct canvas_assignment_group_id)
    from pg_temp._canvas_sync_assignment_groups
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_assignment_group';
  end if;

  if exists (
    select 1
    from pg_temp._canvas_sync_assignment_groups
    where (
      rules is not null
      and jsonb_typeof(rules) <> 'object'
    ) or (
      integration_data is not null
      and jsonb_typeof(integration_data) <> 'object'
    )
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_assignment_group_json';
  end if;

  drop table if exists pg_temp._canvas_sync_assignments;
  create temp table _canvas_sync_assignments on commit drop as
  select
    nullif(btrim(assignment.canvas_assignment_id), '') as canvas_assignment_id,
    nullif(btrim(assignment.canvas_assignment_group_id), '') as canvas_assignment_group_id,
    nullif(btrim(assignment.name), '') as name,
    assignment.description_html,
    assignment.position,
    assignment.points_possible,
    nullif(btrim(assignment.grading_type), '') as grading_type,
    coalesce(assignment.submission_types, '{}'::text[]) as submission_types,
    assignment.due_at,
    assignment.unlock_at,
    assignment.lock_at,
    assignment.published,
    assignment.muted,
    assignment.omit_from_final_grade,
    assignment.anonymous_grading,
    nullif(btrim(assignment.html_url), '') as html_url,
    nullif(btrim(assignment.quiz_id), '') as quiz_id,
    nullif(btrim(assignment.discussion_topic_id), '') as discussion_topic_id,
    assignment.canvas_created_at,
    assignment.canvas_updated_at
  from jsonb_to_recordset(p_assignments) as assignment(
    canvas_assignment_id text,
    canvas_assignment_group_id text,
    name text,
    description_html text,
    position integer,
    points_possible numeric,
    grading_type text,
    submission_types text[],
    due_at timestamptz,
    unlock_at timestamptz,
    lock_at timestamptz,
    published boolean,
    muted boolean,
    omit_from_final_grade boolean,
    anonymous_grading boolean,
    html_url text,
    quiz_id text,
    discussion_topic_id text,
    canvas_created_at timestamptz,
    canvas_updated_at timestamptz
  );

  if exists (
    select 1 from pg_temp._canvas_sync_assignments
    where canvas_assignment_id is null or name is null
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_assignment';
  end if;

  if (
    select count(*) <> count(distinct canvas_assignment_id)
    from pg_temp._canvas_sync_assignments
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_assignment';
  end if;

  if exists (
    select 1
    from pg_temp._canvas_sync_assignments assignment
    where assignment.canvas_assignment_group_id is not null
      and not exists (
        select 1
        from pg_temp._canvas_sync_assignment_groups assignment_group
        where assignment_group.canvas_assignment_group_id =
          assignment.canvas_assignment_group_id
      )
  ) then
    raise exception using errcode = 'P0001', message = 'missing_snapshot_assignment_group';
  end if;

  select exists (
    select 1
    from public.canvas_courses
    where user_id = p_user_id
      and canvas_connection_id = p_canvas_connection_id
      and canvas_course_id = v_course_canvas_id
  )
  into v_course_existed;

  insert into public.canvas_courses (
    user_id,
    canvas_connection_id,
    canvas_course_id,
    name,
    course_code,
    workflow_state,
    enrollment_term_id,
    account_id,
    start_at,
    end_at,
    time_zone,
    public_syllabus,
    syllabus_body,
    canvas_updated_at,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    canvas_course_id,
    name,
    course_code,
    workflow_state,
    enrollment_term_id,
    account_id,
    start_at,
    end_at,
    time_zone,
    public_syllabus,
    syllabus_body,
    canvas_updated_at,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_course
  on conflict (user_id, canvas_connection_id, canvas_course_id) do update set
    name = excluded.name,
    course_code = excluded.course_code,
    workflow_state = excluded.workflow_state,
    enrollment_term_id = excluded.enrollment_term_id,
    account_id = excluded.account_id,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    time_zone = excluded.time_zone,
    public_syllabus = excluded.public_syllabus,
    syllabus_body = excluded.syllabus_body,
    canvas_updated_at = excluded.canvas_updated_at,
    last_synced_at = excluded.last_synced_at
  returning id
  into v_course_id;

  course_inserted := case when v_course_existed then 0 else 1 end;
  course_updated := case when v_course_existed then 1 else 0 end;

  select count(*) into v_modules_incoming
  from pg_temp._canvas_sync_modules;
  select count(*) into v_modules_existing
  from public.canvas_modules module
  join pg_temp._canvas_sync_modules incoming
    on incoming.canvas_module_id = module.canvas_module_id
  where module.course_id = v_course_id;

  insert into public.canvas_modules (
    user_id,
    canvas_connection_id,
    course_id,
    canvas_module_id,
    name,
    position,
    unlock_at,
    item_count,
    require_sequential_progress,
    published,
    prerequisite_module_ids,
    canvas_state,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    canvas_module_id,
    name,
    position,
    unlock_at,
    item_count,
    require_sequential_progress,
    published,
    prerequisite_module_ids,
    canvas_state,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_modules
  on conflict (course_id, canvas_module_id) do update set
    name = excluded.name,
    position = excluded.position,
    unlock_at = excluded.unlock_at,
    item_count = excluded.item_count,
    require_sequential_progress = excluded.require_sequential_progress,
    published = excluded.published,
    prerequisite_module_ids = excluded.prerequisite_module_ids,
    canvas_state = excluded.canvas_state,
    last_synced_at = excluded.last_synced_at;

  modules_inserted := v_modules_incoming - v_modules_existing;
  modules_updated := v_modules_existing;

  drop table if exists pg_temp._canvas_sync_module_ids;
  create temp table _canvas_sync_module_ids on commit drop as
  select module.canvas_module_id, module.id as module_id
  from public.canvas_modules module
  join pg_temp._canvas_sync_modules incoming
    on incoming.canvas_module_id = module.canvas_module_id
  where module.course_id = v_course_id;

  drop table if exists pg_temp._canvas_sync_module_items_resolved;
  create temp table _canvas_sync_module_items_resolved on commit drop as
  select
    module_ids.module_id,
    item.canvas_module_item_id,
    item.title,
    item.position,
    item.indent,
    item.item_type,
    item.canvas_content_id,
    item.page_url,
    item.external_url,
    item.html_url,
    item.new_tab,
    item.published,
    item.completion_requirement,
    item.content_details
  from pg_temp._canvas_sync_module_items item
  join pg_temp._canvas_sync_module_ids module_ids
    on module_ids.canvas_module_id = item.canvas_module_id;

  select count(*) into v_module_items_incoming
  from pg_temp._canvas_sync_module_items_resolved;
  select count(*) into v_module_items_existing
  from public.canvas_module_items item
  join pg_temp._canvas_sync_module_items_resolved incoming
    on incoming.module_id = item.module_id
   and incoming.canvas_module_item_id = item.canvas_module_item_id
  where item.course_id = v_course_id;

  select count(*) into module_items_deleted
  from public.canvas_module_items item
  where item.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_module_items_resolved incoming
      where incoming.module_id = item.module_id
        and incoming.canvas_module_item_id = item.canvas_module_item_id
    );

  delete from public.canvas_module_items item
  where item.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_module_items_resolved incoming
      where incoming.module_id = item.module_id
        and incoming.canvas_module_item_id = item.canvas_module_item_id
    );

  insert into public.canvas_module_items (
    user_id,
    canvas_connection_id,
    course_id,
    module_id,
    canvas_module_item_id,
    title,
    position,
    indent,
    item_type,
    canvas_content_id,
    page_url,
    external_url,
    html_url,
    new_tab,
    published,
    completion_requirement,
    content_details,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    module_id,
    canvas_module_item_id,
    title,
    position,
    indent,
    item_type,
    canvas_content_id,
    page_url,
    external_url,
    html_url,
    new_tab,
    published,
    completion_requirement,
    content_details,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_module_items_resolved
  on conflict (module_id, canvas_module_item_id) do update set
    title = excluded.title,
    position = excluded.position,
    indent = excluded.indent,
    item_type = excluded.item_type,
    canvas_content_id = excluded.canvas_content_id,
    page_url = excluded.page_url,
    external_url = excluded.external_url,
    html_url = excluded.html_url,
    new_tab = excluded.new_tab,
    published = excluded.published,
    completion_requirement = excluded.completion_requirement,
    content_details = excluded.content_details,
    last_synced_at = excluded.last_synced_at;

  module_items_inserted := v_module_items_incoming - v_module_items_existing;
  module_items_updated := v_module_items_existing;

  select count(*) into modules_deleted
  from public.canvas_modules module
  where module.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_modules incoming
      where incoming.canvas_module_id = module.canvas_module_id
    );

  delete from public.canvas_modules module
  where module.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_modules incoming
      where incoming.canvas_module_id = module.canvas_module_id
    );

  select count(*) into v_pages_incoming
  from pg_temp._canvas_sync_pages;
  select count(*) into v_pages_existing
  from public.canvas_pages page
  join pg_temp._canvas_sync_pages incoming
    on incoming.canvas_page_url = page.canvas_page_url
  where page.course_id = v_course_id;

  select count(*) into pages_deleted
  from public.canvas_pages page
  where page.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_pages incoming
      where incoming.canvas_page_url = page.canvas_page_url
    );

  delete from public.canvas_pages page
  where page.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_pages incoming
      where incoming.canvas_page_url = page.canvas_page_url
    );

  insert into public.canvas_pages (
    user_id,
    canvas_connection_id,
    course_id,
    canvas_page_id,
    canvas_page_url,
    title,
    body_html,
    published,
    front_page,
    editing_roles,
    lock_info,
    unlock_at,
    lock_at,
    canvas_created_at,
    canvas_updated_at,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    canvas_page_id,
    canvas_page_url,
    title,
    body_html,
    published,
    front_page,
    editing_roles,
    lock_info,
    unlock_at,
    lock_at,
    canvas_created_at,
    canvas_updated_at,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_pages
  on conflict (course_id, canvas_page_url) do update set
    canvas_page_id = excluded.canvas_page_id,
    title = excluded.title,
    body_html = excluded.body_html,
    published = excluded.published,
    front_page = excluded.front_page,
    editing_roles = excluded.editing_roles,
    lock_info = excluded.lock_info,
    unlock_at = excluded.unlock_at,
    lock_at = excluded.lock_at,
    canvas_created_at = excluded.canvas_created_at,
    canvas_updated_at = excluded.canvas_updated_at,
    last_synced_at = excluded.last_synced_at;

  pages_inserted := v_pages_incoming - v_pages_existing;
  pages_updated := v_pages_existing;

  select count(*) into v_assignment_groups_incoming
  from pg_temp._canvas_sync_assignment_groups;
  select count(*) into v_assignment_groups_existing
  from public.canvas_assignment_groups assignment_group
  join pg_temp._canvas_sync_assignment_groups incoming
    on incoming.canvas_assignment_group_id =
      assignment_group.canvas_assignment_group_id
  where assignment_group.course_id = v_course_id;

  insert into public.canvas_assignment_groups (
    user_id,
    canvas_connection_id,
    course_id,
    canvas_assignment_group_id,
    name,
    position,
    group_weight,
    rules,
    integration_data,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    canvas_assignment_group_id,
    name,
    position,
    group_weight,
    rules,
    integration_data,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_assignment_groups
  on conflict (course_id, canvas_assignment_group_id) do update set
    name = excluded.name,
    position = excluded.position,
    group_weight = excluded.group_weight,
    rules = excluded.rules,
    integration_data = excluded.integration_data,
    last_synced_at = excluded.last_synced_at;

  assignment_groups_inserted :=
    v_assignment_groups_incoming - v_assignment_groups_existing;
  assignment_groups_updated := v_assignment_groups_existing;

  drop table if exists pg_temp._canvas_sync_assignment_group_ids;
  create temp table _canvas_sync_assignment_group_ids on commit drop as
  select
    assignment_group.canvas_assignment_group_id,
    assignment_group.id as assignment_group_id
  from public.canvas_assignment_groups assignment_group
  join pg_temp._canvas_sync_assignment_groups incoming
    on incoming.canvas_assignment_group_id =
      assignment_group.canvas_assignment_group_id
  where assignment_group.course_id = v_course_id;

  drop table if exists pg_temp._canvas_sync_assignments_resolved;
  create temp table _canvas_sync_assignments_resolved on commit drop as
  select
    assignment_group_ids.assignment_group_id,
    assignment.canvas_assignment_id,
    assignment.canvas_assignment_group_id,
    assignment.name,
    assignment.description_html,
    assignment.position,
    assignment.points_possible,
    assignment.grading_type,
    assignment.submission_types,
    assignment.due_at,
    assignment.unlock_at,
    assignment.lock_at,
    assignment.published,
    assignment.muted,
    assignment.omit_from_final_grade,
    assignment.anonymous_grading,
    assignment.html_url,
    assignment.quiz_id,
    assignment.discussion_topic_id,
    assignment.canvas_created_at,
    assignment.canvas_updated_at
  from pg_temp._canvas_sync_assignments assignment
  left join pg_temp._canvas_sync_assignment_group_ids assignment_group_ids
    on assignment_group_ids.canvas_assignment_group_id =
      assignment.canvas_assignment_group_id;

  select count(*) into v_assignments_incoming
  from pg_temp._canvas_sync_assignments_resolved;
  select count(*) into v_assignments_existing
  from public.canvas_assignments assignment
  join pg_temp._canvas_sync_assignments_resolved incoming
    on incoming.canvas_assignment_id = assignment.canvas_assignment_id
  where assignment.course_id = v_course_id;

  select count(*) into assignments_deleted
  from public.canvas_assignments assignment
  where assignment.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_assignments_resolved incoming
      where incoming.canvas_assignment_id = assignment.canvas_assignment_id
    );

  delete from public.canvas_assignments assignment
  where assignment.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_assignments_resolved incoming
      where incoming.canvas_assignment_id = assignment.canvas_assignment_id
    );

  insert into public.canvas_assignments (
    user_id,
    canvas_connection_id,
    course_id,
    assignment_group_id,
    canvas_assignment_id,
    canvas_assignment_group_id,
    name,
    description_html,
    position,
    points_possible,
    grading_type,
    submission_types,
    due_at,
    unlock_at,
    lock_at,
    published,
    muted,
    omit_from_final_grade,
    anonymous_grading,
    html_url,
    quiz_id,
    discussion_topic_id,
    canvas_created_at,
    canvas_updated_at,
    first_synced_at,
    last_synced_at
  )
  select
    p_user_id,
    p_canvas_connection_id,
    v_course_id,
    assignment_group_id,
    canvas_assignment_id,
    canvas_assignment_group_id,
    name,
    description_html,
    position,
    points_possible,
    grading_type,
    submission_types,
    due_at,
    unlock_at,
    lock_at,
    published,
    muted,
    omit_from_final_grade,
    anonymous_grading,
    html_url,
    quiz_id,
    discussion_topic_id,
    canvas_created_at,
    canvas_updated_at,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_sync_assignments_resolved
  on conflict (course_id, canvas_assignment_id) do update set
    assignment_group_id = excluded.assignment_group_id,
    canvas_assignment_group_id = excluded.canvas_assignment_group_id,
    name = excluded.name,
    description_html = excluded.description_html,
    position = excluded.position,
    points_possible = excluded.points_possible,
    grading_type = excluded.grading_type,
    submission_types = excluded.submission_types,
    due_at = excluded.due_at,
    unlock_at = excluded.unlock_at,
    lock_at = excluded.lock_at,
    published = excluded.published,
    muted = excluded.muted,
    omit_from_final_grade = excluded.omit_from_final_grade,
    anonymous_grading = excluded.anonymous_grading,
    html_url = excluded.html_url,
    quiz_id = excluded.quiz_id,
    discussion_topic_id = excluded.discussion_topic_id,
    canvas_created_at = excluded.canvas_created_at,
    canvas_updated_at = excluded.canvas_updated_at,
    last_synced_at = excluded.last_synced_at;

  assignments_inserted := v_assignments_incoming - v_assignments_existing;
  assignments_updated := v_assignments_existing;

  select count(*) into assignment_groups_deleted
  from public.canvas_assignment_groups assignment_group
  where assignment_group.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_assignment_groups incoming
      where incoming.canvas_assignment_group_id =
        assignment_group.canvas_assignment_group_id
    );

  delete from public.canvas_assignment_groups assignment_group
  where assignment_group.course_id = v_course_id
    and not exists (
      select 1
      from pg_temp._canvas_sync_assignment_groups incoming
      where incoming.canvas_assignment_group_id =
        assignment_group.canvas_assignment_group_id
    );

  return next;
end;
$$;

revoke all on function public.begin_canvas_sync_run(
  uuid,
  uuid,
  timestamptz
) from public;
revoke all on function public.begin_canvas_sync_run(
  uuid,
  uuid,
  timestamptz
) from anon;
revoke all on function public.begin_canvas_sync_run(
  uuid,
  uuid,
  timestamptz
) from authenticated;
grant execute on function public.begin_canvas_sync_run(
  uuid,
  uuid,
  timestamptz
) to service_role;

revoke all on function public.update_canvas_sync_run_progress(
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  integer,
  jsonb,
  timestamptz
) from public;
revoke all on function public.update_canvas_sync_run_progress(
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  integer,
  jsonb,
  timestamptz
) from anon;
revoke all on function public.update_canvas_sync_run_progress(
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  integer,
  jsonb,
  timestamptz
) from authenticated;
grant execute on function public.update_canvas_sync_run_progress(
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  integer,
  jsonb,
  timestamptz
) to service_role;

revoke all on function public.finish_canvas_sync_run(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  integer,
  integer,
  jsonb,
  text,
  text,
  timestamptz
) from public;
revoke all on function public.finish_canvas_sync_run(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  integer,
  integer,
  jsonb,
  text,
  text,
  timestamptz
) from anon;
revoke all on function public.finish_canvas_sync_run(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  integer,
  integer,
  jsonb,
  text,
  text,
  timestamptz
) from authenticated;
grant execute on function public.finish_canvas_sync_run(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  integer,
  integer,
  jsonb,
  text,
  text,
  timestamptz
) to service_role;

revoke all on function public.replace_canvas_course_academic_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) from public;
revoke all on function public.replace_canvas_course_academic_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) from anon;
revoke all on function public.replace_canvas_course_academic_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) from authenticated;
grant execute on function public.replace_canvas_course_academic_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) to service_role;
