-- FILE ONLY: owner applies during the next FULLSEND, after profile_preferences.
-- TP1: Today plans may hold saved-reviewer blocks, reviewer opens are recorded
-- for candidate selection, and the "Plan with" choice syncs per user.
-- Forward-only; apply_study_plan_v1 and every existing row keep working.

-- Typed study blocks. Existing rows (block_kind null) remain task blocks.
alter table public.study_sessions
  alter column task_id drop not null,
  add column block_kind text null,
  add column reviewer_artifact_id uuid null,
  add constraint study_sessions_block_kind_allowed
    check (block_kind is null or block_kind in ('task', 'reviewer')),
  add constraint study_sessions_block_target
    check (
      (coalesce(block_kind, 'task') = 'task' and task_id is not null and reviewer_artifact_id is null)
      or (coalesce(block_kind, 'task') = 'reviewer' and task_id is null and reviewer_artifact_id is not null)
    ),
  add constraint study_sessions_reviewer_owner_fkey
    foreign key (reviewer_artifact_id, user_id)
    references public.generated_artifacts (id, user_id)
    on delete cascade;

create index study_sessions_reviewer_idx
  on public.study_sessions (reviewer_artifact_id, starts_at)
  where reviewer_artifact_id is not null;

-- When the owner last opened each saved reviewer. Service-only.
create table public.reviewer_opens (
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid not null,
  last_opened_at timestamptz not null default now(),
  primary key (user_id, artifact_id),
  constraint reviewer_opens_artifact_owner_fkey
    foreign key (artifact_id, user_id)
    references public.generated_artifacts (id, user_id)
    on delete cascade
);
create index reviewer_opens_artifact_idx on public.reviewer_opens (artifact_id);
alter table public.reviewer_opens enable row level security;
revoke all on table public.reviewer_opens from public, anon, authenticated;
grant select, insert, update, delete on table public.reviewer_opens to service_role;

create or replace function public.record_reviewer_open_v1(p_user_id uuid, p_artifact_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.generated_artifacts artifact
    where artifact.id = p_artifact_id
      and artifact.user_id = p_user_id
      and artifact.artifact_type = 'reviewer'
      and artifact.deleted_at is null
  ) then
    return false;
  end if;
  insert into public.reviewer_opens (user_id, artifact_id, last_opened_at)
  values (p_user_id, p_artifact_id, clock_timestamp())
  on conflict (user_id, artifact_id)
  do update set last_opened_at = excluded.last_opened_at;
  return true;
end;
$$;

revoke all on function public.record_reviewer_open_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_reviewer_open_v1(uuid, uuid) to service_role;

-- The "Plan with" choice. Null means never chosen (clients use reviewers_tasks).
alter table public.user_profiles
  add column plan_mode text null,
  add constraint user_profiles_plan_mode_key
    check (plan_mode in ('reviewers', 'tasks', 'reviewers_tasks'));

-- Applies a typed plan atomically with the v1 replacement semantics: one
-- owner-scoped critical section replaces only planned rows that intersect the
-- planning range. Each proposal targets exactly one owned pending task or one
-- owned saved reviewer; a reviewer appears at most once per plan and never
-- beside a kept (completed/skipped) block for it in the same range.
create or replace function public.apply_study_plan_v2(
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
      kind text,
      task_id uuid,
      reviewer_artifact_id uuid,
      starts_at timestamptz,
      ends_at timestamptz
    )
    left join public.tasks task
      on session.kind = 'task'
      and task.id = session.task_id
      and task.user_id = p_user_id
      and task.status = 'pending'
    left join public.generated_artifacts reviewer
      on session.kind = 'reviewer'
      and reviewer.id = session.reviewer_artifact_id
      and reviewer.user_id = p_user_id
      and reviewer.artifact_type = 'reviewer'
      and reviewer.deleted_at is null
      and reviewer.latest_version_id is not null
    where session.kind is null
      or session.kind not in ('task', 'reviewer')
      or (session.kind = 'task' and (task.id is null or session.reviewer_artifact_id is not null))
      or (session.kind = 'reviewer' and (reviewer.id is null or session.task_id is not null))
      or session.starts_at is null
      or session.ends_at is null
      or session.starts_at >= session.ends_at
      or session.starts_at < p_planning_starts_at
      or session.ends_at > p_planning_ends_at
  ) then
    raise exception using errcode = 'P0001', message = 'study_plan_session_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_sessions) as session(kind text, reviewer_artifact_id uuid)
    where session.kind = 'reviewer'
    group by session.reviewer_artifact_id
    having count(*) > 1
  ) then
    raise exception using errcode = 'P0001', message = 'study_plan_reviewer_duplicate';
  end if;

  if exists (
    with parsed_sessions as (
      select
        row_number() over () as ordinal,
        session.starts_at,
        session.ends_at
      from jsonb_to_recordset(p_sessions) as session(
        starts_at timestamptz,
        ends_at timestamptz
      )
    )
    select 1
    from parsed_sessions earlier
    join parsed_sessions later
      on earlier.ordinal < later.ordinal
      and earlier.starts_at < later.ends_at
      and earlier.ends_at > later.starts_at
  ) then
    raise exception using errcode = 'P0001', message = 'study_plan_session_overlap';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  delete from public.study_sessions session
  where session.user_id = p_user_id
    and session.status = 'planned'
    and session.starts_at < p_planning_ends_at
    and session.ends_at > p_planning_starts_at;

  if exists (
    select 1
    from jsonb_to_recordset(p_sessions) as proposed(
      starts_at timestamptz,
      ends_at timestamptz
    )
    join public.study_sessions existing
      on existing.user_id = p_user_id
      and existing.status = 'planned'
      and existing.starts_at < proposed.ends_at
      and existing.ends_at > proposed.starts_at
  ) then
    raise exception using errcode = 'P0001', message = 'study_plan_session_conflict';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_sessions) as proposed(kind text, reviewer_artifact_id uuid)
    join public.study_sessions existing
      on existing.user_id = p_user_id
      and existing.reviewer_artifact_id = proposed.reviewer_artifact_id
      and existing.starts_at < p_planning_ends_at
      and existing.ends_at > p_planning_starts_at
    where proposed.kind = 'reviewer'
  ) then
    raise exception using errcode = 'P0001', message = 'study_plan_reviewer_duplicate';
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
    block_kind,
    reviewer_artifact_id,
    starts_at,
    ends_at,
    status
  )
  select
    p_user_id,
    v_plan_id,
    case when session.kind = 'task' then session.task_id end,
    session.kind,
    case when session.kind = 'reviewer' then session.reviewer_artifact_id end,
    session.starts_at,
    session.ends_at,
    'planned'
  from jsonb_to_recordset(p_sessions) as session(
    kind text,
    task_id uuid,
    reviewer_artifact_id uuid,
    starts_at timestamptz,
    ends_at timestamptz
  );

  get diagnostics v_session_count = row_count;
  return query select v_plan_id, v_session_count;
end;
$$;

revoke all on function public.apply_study_plan_v2(
  uuid, timestamptz, timestamptz, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_study_plan_v2(
  uuid, timestamptz, timestamptz, text, text, jsonb
) to service_role;
