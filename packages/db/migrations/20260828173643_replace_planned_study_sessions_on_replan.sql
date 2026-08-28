alter table public.study_sessions
  add column status text not null default 'planned',
  add constraint study_sessions_status_allowed
    check (status in ('planned', 'completed', 'skipped'));

create index study_sessions_user_planned_starts_idx
  on public.study_sessions (user_id, starts_at, id)
  where status = 'planned';

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

  if exists (
    with parsed_sessions as (
      select
        row_number() over () as ordinal,
        session.starts_at,
        session.ends_at
      from jsonb_to_recordset(p_sessions) as session(
        task_id uuid,
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

  -- Replanning is one owner-scoped critical section. A hash collision only
  -- serializes unrelated owners; it cannot weaken isolation or correctness.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- Terminal rows are history. Only active planned rows that intersect this
  -- planning range are replaced, including rows that straddle a boundary.
  delete from public.study_sessions session
  where session.user_id = p_user_id
    and session.status = 'planned'
    and session.starts_at < p_planning_ends_at
    and session.ends_at > p_planning_starts_at;

  -- A planned row outside the replacement set must never collide with a new
  -- proposal. This also protects the invariant if an older client inserted a
  -- boundary-straddling row before the migration was deployed.
  if exists (
    select 1
    from jsonb_to_recordset(p_sessions) as proposed(
      task_id uuid,
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
    ends_at,
    status
  )
  select
    p_user_id,
    v_plan_id,
    session.task_id,
    session.starts_at,
    session.ends_at,
    'planned'
  from jsonb_to_recordset(p_sessions) as session(
    task_id uuid,
    starts_at timestamptz,
    ends_at timestamptz
  );

  get diagnostics v_session_count = row_count;
  return query select v_plan_id, v_session_count;
end;
$$;

revoke all on function public.apply_study_plan_v1(
  uuid, timestamptz, timestamptz, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_study_plan_v1(
  uuid, timestamptz, timestamptz, text, text, jsonb
) to service_role;
