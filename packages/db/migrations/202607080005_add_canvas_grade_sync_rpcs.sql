create or replace function public.begin_canvas_course_grade_sync(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_course_id uuid,
  p_started_at timestamptz default now(),
  p_stale_after_seconds integer default 1800
)
returns setof public.canvas_course_grade_sync_states
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_started_at timestamptz := coalesce(p_started_at, now());
  v_stale_before timestamptz;
  v_state public.canvas_course_grade_sync_states%rowtype;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_course_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_owner_missing';
  end if;

  if p_stale_after_seconds is null
    or p_stale_after_seconds < 60
    or p_stale_after_seconds > 86400 then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_stale_window_invalid';
  end if;

  v_stale_before := v_started_at - make_interval(secs => p_stale_after_seconds);

  perform 1
  from public.canvas_connections connection
  where connection.id = p_canvas_connection_id
    and connection.user_id = p_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_connection_missing';
  end if;

  perform 1
  from public.canvas_courses course
  join public.canvas_course_sync_preferences preference
    on preference.course_id = course.id
   and preference.user_id = p_user_id
   and preference.canvas_connection_id = p_canvas_connection_id
   and preference.selected = true
  where course.id = p_course_id
    and course.user_id = p_user_id
    and course.canvas_connection_id = p_canvas_connection_id
  for update of course;

  if not found then
    perform 1
    from public.canvas_courses course
    where course.id = p_course_id
      and course.user_id = p_user_id
      and course.canvas_connection_id = p_canvas_connection_id;

    if found then
      raise exception using errcode = 'P0001', message = 'canvas_course_not_selected';
    end if;

    raise exception using errcode = 'P0001', message = 'canvas_course_missing';
  end if;

  update public.canvas_course_grade_sync_states state
  set
    sync_status = 'failed',
    last_checked_at = v_started_at,
    last_completed_at = v_started_at,
    last_completed_snapshot_authoritative = false,
    consecutive_failure_count = state.consecutive_failure_count + 1,
    last_failure_code = 'stale_sync_recovered',
    last_failure_category = 'partial_sync',
    assignment_family_state = 'failed',
    submission_family_state = 'failed',
    course_grade_summary_family_state = 'failed'
  where state.user_id = p_user_id
    and state.canvas_connection_id = p_canvas_connection_id
    and state.course_id = p_course_id
    and state.sync_status = 'running'
    and coalesce(state.last_checked_at, state.created_at) < v_stale_before;

  select *
  into v_state
  from public.canvas_course_grade_sync_states state
  where state.user_id = p_user_id
    and state.canvas_connection_id = p_canvas_connection_id
    and state.course_id = p_course_id
  for update;

  if found and v_state.sync_status = 'running' then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_in_progress';
  end if;

  insert into public.canvas_course_grade_sync_states (
    user_id,
    canvas_connection_id,
    course_id,
    sync_status,
    last_checked_at,
    last_completed_at,
    last_completed_snapshot_authoritative,
    last_failure_code,
    last_failure_category,
    assignment_family_state,
    submission_family_state,
    course_grade_summary_family_state
  )
  values (
    p_user_id,
    p_canvas_connection_id,
    p_course_id,
    'running',
    v_started_at,
    null,
    false,
    null,
    null,
    'not_started',
    'not_started',
    'not_started'
  )
  on conflict on constraint canvas_course_grade_sync_states_identity_unique
  do update set
    sync_status = 'running',
    last_checked_at = excluded.last_checked_at,
    last_completed_at = null,
    last_completed_snapshot_authoritative = false,
    last_failure_code = null,
    last_failure_category = null,
    assignment_family_state = 'not_started',
    submission_family_state = 'not_started',
    course_grade_summary_family_state = 'not_started'
  returning *
  into v_state;

  return next v_state;
end;
$$;

create or replace function public.replace_canvas_course_assignment_submission_snapshot(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_course_id uuid,
  p_synced_at timestamptz,
  p_assignments jsonb,
  p_snapshot_fingerprint text,
  p_fingerprint_version text
)
returns table (
  assignments_inserted integer,
  assignments_updated integer,
  assignments_unchanged integer,
  assignments_marked_absent integer,
  persisted_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_synced_at timestamptz := coalesce(p_synced_at, now());
  v_snapshot_fingerprint text := nullif(btrim(p_snapshot_fingerprint), '');
  v_fingerprint_version text := nullif(btrim(p_fingerprint_version), '');
  v_incoming_count integer;
  v_existing_same integer;
  v_existing_changed integer;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_course_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_owner_missing';
  end if;

  if v_snapshot_fingerprint is null
    or v_fingerprint_version is null
    or char_length(v_snapshot_fingerprint) > 128
    or char_length(v_fingerprint_version) > 80 then
    raise exception using errcode = 'P0001', message = 'canvas_grade_snapshot_fingerprint_invalid';
  end if;

  if jsonb_typeof(p_assignments) is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_grade_snapshot_payload';
  end if;

  perform 1
  from public.canvas_course_grade_sync_states state
  where state.user_id = p_user_id
    and state.canvas_connection_id = p_canvas_connection_id
    and state.course_id = p_course_id
    and state.sync_status = 'running'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_not_running';
  end if;

  perform 1
  from public.canvas_courses course
  join public.canvas_course_sync_preferences preference
    on preference.course_id = course.id
   and preference.user_id = p_user_id
   and preference.canvas_connection_id = p_canvas_connection_id
   and preference.selected = true
  where course.id = p_course_id
    and course.user_id = p_user_id
    and course.canvas_connection_id = p_canvas_connection_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_course_not_selected';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_assignments) as item(value)
    where jsonb_typeof(item.value) is distinct from 'object'
       or exists (
         select 1
         from jsonb_object_keys(item.value) as key(name)
         where key.name not in (
           'canvas_assignment_id',
           'canvas_assignment_group_id',
           'name',
           'points_possible',
           'grading_type',
           'submission_types',
           'due_at',
           'unlock_at',
           'lock_at',
           'published',
           'muted',
           'omit_from_final_grade',
           'quiz_id',
           'discussion_topic_id',
           'workflow_state',
           'normalized_status',
           'submitted_at',
           'graded_at',
           'posted_at',
           'attempt',
           'submission_type',
           'grade_matches_current_submission',
           'late',
           'missing',
           'excused',
           'assignment_visible',
           'late_policy_status',
           'seconds_late',
           'score',
           'grade',
           'score_visibility_state',
           'grade_visibility_state',
           'points_possible_at_sync',
           'has_submission_evidence',
           'source_fingerprint'
         )
       )
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_grade_snapshot_payload';
  end if;

  drop table if exists pg_temp._canvas_grade_assignments;
  create temp table _canvas_grade_assignments on commit drop as
  select
    nullif(btrim(item.canvas_assignment_id), '') as canvas_assignment_id,
    nullif(btrim(item.canvas_assignment_group_id), '') as canvas_assignment_group_id,
    nullif(btrim(item.name), '') as name,
    item.points_possible,
    nullif(btrim(item.grading_type), '') as grading_type,
    coalesce(item.submission_types, '{}'::text[]) as submission_types,
    item.due_at,
    item.unlock_at,
    item.lock_at,
    item.published,
    item.muted,
    item.omit_from_final_grade,
    nullif(btrim(item.quiz_id), '') as quiz_id,
    nullif(btrim(item.discussion_topic_id), '') as discussion_topic_id,
    nullif(btrim(item.workflow_state), '') as workflow_state,
    nullif(btrim(item.normalized_status), '') as normalized_status,
    item.submitted_at,
    item.graded_at,
    item.posted_at,
    item.attempt,
    nullif(btrim(item.submission_type), '') as submission_type,
    item.grade_matches_current_submission,
    item.late,
    item.missing,
    item.excused,
    item.assignment_visible,
    nullif(btrim(item.late_policy_status), '') as late_policy_status,
    item.seconds_late,
    item.score,
    item.grade,
    nullif(btrim(item.score_visibility_state), '') as score_visibility_state,
    nullif(btrim(item.grade_visibility_state), '') as grade_visibility_state,
    item.points_possible_at_sync,
    item.has_submission_evidence,
    nullif(btrim(item.source_fingerprint), '') as source_fingerprint
  from jsonb_to_recordset(p_assignments) as item(
    canvas_assignment_id text,
    canvas_assignment_group_id text,
    name text,
    points_possible numeric,
    grading_type text,
    submission_types text[],
    due_at timestamptz,
    unlock_at timestamptz,
    lock_at timestamptz,
    published boolean,
    muted boolean,
    omit_from_final_grade boolean,
    quiz_id text,
    discussion_topic_id text,
    workflow_state text,
    normalized_status text,
    submitted_at timestamptz,
    graded_at timestamptz,
    posted_at timestamptz,
    attempt integer,
    submission_type text,
    grade_matches_current_submission boolean,
    late boolean,
    missing boolean,
    excused boolean,
    assignment_visible boolean,
    late_policy_status text,
    seconds_late integer,
    score numeric,
    grade text,
    score_visibility_state text,
    grade_visibility_state text,
    points_possible_at_sync numeric,
    has_submission_evidence boolean,
    source_fingerprint text
  );

  if exists (
    select 1
    from pg_temp._canvas_grade_assignments assignment
    where assignment.canvas_assignment_id is null
       or assignment.name is null
       or assignment.normalized_status is null
       or assignment.score_visibility_state is null
       or assignment.grade_visibility_state is null
       or assignment.source_fingerprint is null
       or assignment.has_submission_evidence is null
       or char_length(assignment.source_fingerprint) > 128
       or assignment.normalized_status not in (
         'unknown',
         'excused',
         'unavailable',
         'locked',
         'missing',
         'graded_hidden',
         'graded',
         'submitted_late',
         'submitted',
         'late_unsubmitted',
         'available',
         'upcoming',
         'no_due_date'
       )
       or (
         assignment.workflow_state is not null
         and assignment.workflow_state not in (
           'submitted',
           'unsubmitted',
           'graded',
           'pending_review'
         )
       )
       or (
         assignment.late_policy_status is not null
         and assignment.late_policy_status not in (
           'late',
           'missing',
           'extended',
           'none'
         )
       )
       or assignment.score_visibility_state not in (
         'unknown',
         'visible',
         'hidden',
         'unavailable',
         'not_applicable'
       )
       or assignment.grade_visibility_state not in (
         'unknown',
         'visible',
         'hidden',
         'unavailable',
         'not_applicable'
       )
       or (assignment.score is not null and assignment.score_visibility_state <> 'visible')
       or (assignment.grade is not null and assignment.grade_visibility_state <> 'visible')
       or (assignment.attempt is not null and assignment.attempt < 0)
       or (assignment.seconds_late is not null and assignment.seconds_late < 0)
       or (
         assignment.submission_type is not null
         and char_length(assignment.submission_type) > 80
       )
       or (
         assignment.grade is not null
         and char_length(assignment.grade) > 120
       )
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_grade_snapshot_payload';
  end if;

  if exists (
    select 1
    from pg_temp._canvas_grade_assignments assignment,
      unnest(assignment.submission_types) as submission_type(value)
    where submission_type.value is null
       or nullif(btrim(submission_type.value), '') is null
       or char_length(submission_type.value) > 80
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_grade_snapshot_payload';
  end if;

  if (
    select count(*) <> count(distinct canvas_assignment_id)
    from pg_temp._canvas_grade_assignments
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_canvas_assignment';
  end if;

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
    p_course_id,
    assignment_group.id,
    assignment.canvas_assignment_id,
    assignment.canvas_assignment_group_id,
    assignment.name,
    null,
    null,
    assignment.points_possible,
    assignment.grading_type,
    assignment.submission_types,
    assignment.due_at,
    assignment.unlock_at,
    assignment.lock_at,
    assignment.published,
    assignment.muted,
    assignment.omit_from_final_grade,
    null,
    null,
    assignment.quiz_id,
    assignment.discussion_topic_id,
    null,
    null,
    v_synced_at,
    v_synced_at
  from pg_temp._canvas_grade_assignments assignment
  left join public.canvas_assignment_groups assignment_group
    on assignment_group.user_id = p_user_id
   and assignment_group.canvas_connection_id = p_canvas_connection_id
   and assignment_group.course_id = p_course_id
   and assignment_group.canvas_assignment_group_id =
      assignment.canvas_assignment_group_id
  on conflict (course_id, canvas_assignment_id) do update set
    assignment_group_id = excluded.assignment_group_id,
    canvas_assignment_group_id = excluded.canvas_assignment_group_id,
    name = excluded.name,
    points_possible = excluded.points_possible,
    grading_type = excluded.grading_type,
    submission_types = excluded.submission_types,
    due_at = excluded.due_at,
    unlock_at = excluded.unlock_at,
    lock_at = excluded.lock_at,
    published = excluded.published,
    muted = excluded.muted,
    omit_from_final_grade = excluded.omit_from_final_grade,
    quiz_id = excluded.quiz_id,
    discussion_topic_id = excluded.discussion_topic_id,
    last_synced_at = excluded.last_synced_at;

  drop table if exists pg_temp._canvas_grade_rows_resolved;
  create temp table _canvas_grade_rows_resolved on commit drop as
  select
    canvas_assignment.id as assignment_id,
    assignment.*
  from pg_temp._canvas_grade_assignments assignment
  join public.canvas_assignments canvas_assignment
    on canvas_assignment.user_id = p_user_id
   and canvas_assignment.canvas_connection_id = p_canvas_connection_id
   and canvas_assignment.course_id = p_course_id
   and canvas_assignment.canvas_assignment_id = assignment.canvas_assignment_id;

  select count(*) into v_incoming_count
  from pg_temp._canvas_grade_rows_resolved;

  select count(*) into v_existing_same
  from public.canvas_assignment_submissions existing
  join pg_temp._canvas_grade_rows_resolved incoming
    on incoming.assignment_id = existing.assignment_id
  where existing.user_id = p_user_id
    and existing.canvas_connection_id = p_canvas_connection_id
    and existing.course_id = p_course_id
    and existing.source_fingerprint = incoming.source_fingerprint
    and existing.absent_after_sync_at is null;

  select count(*) into v_existing_changed
  from public.canvas_assignment_submissions existing
  join pg_temp._canvas_grade_rows_resolved incoming
    on incoming.assignment_id = existing.assignment_id
  where existing.user_id = p_user_id
    and existing.canvas_connection_id = p_canvas_connection_id
    and existing.course_id = p_course_id
    and (
      existing.source_fingerprint is distinct from incoming.source_fingerprint
      or existing.absent_after_sync_at is not null
    );

  update public.canvas_assignment_submissions existing
  set
    normalized_status = 'unavailable',
    score = null,
    grade = null,
    score_visibility_state = 'unavailable',
    grade_visibility_state = 'unavailable',
    last_synced_at = v_synced_at,
    absent_after_sync_at = v_synced_at,
    source_fingerprint = encode(
      digest(
        'canvas-grade-assignment-submission-absent-v1:' ||
          existing.assignment_id::text,
        'sha256'
      ),
      'hex'
    )
  where existing.user_id = p_user_id
    and existing.canvas_connection_id = p_canvas_connection_id
    and existing.course_id = p_course_id
    and not exists (
      select 1
      from pg_temp._canvas_grade_rows_resolved incoming
      where incoming.assignment_id = existing.assignment_id
    )
    and (
      existing.absent_after_sync_at is null
      or existing.normalized_status <> 'unavailable'
    );

  get diagnostics assignments_marked_absent = row_count;

  insert into public.canvas_assignment_submissions (
    user_id,
    canvas_connection_id,
    course_id,
    assignment_id,
    workflow_state,
    normalized_status,
    submitted_at,
    graded_at,
    posted_at,
    attempt,
    submission_type,
    grade_matches_current_submission,
    late,
    missing,
    excused,
    assignment_visible,
    late_policy_status,
    seconds_late,
    score,
    grade,
    score_visibility_state,
    grade_visibility_state,
    points_possible_at_sync,
    first_synced_at,
    last_synced_at,
    last_seen_at,
    absent_after_sync_at,
    source_fingerprint
  )
  select
    p_user_id,
    p_canvas_connection_id,
    p_course_id,
    incoming.assignment_id,
    incoming.workflow_state,
    incoming.normalized_status,
    incoming.submitted_at,
    incoming.graded_at,
    incoming.posted_at,
    incoming.attempt,
    incoming.submission_type,
    incoming.grade_matches_current_submission,
    incoming.late,
    incoming.missing,
    incoming.excused,
    incoming.assignment_visible,
    incoming.late_policy_status,
    incoming.seconds_late,
    incoming.score,
    incoming.grade,
    incoming.score_visibility_state,
    incoming.grade_visibility_state,
    incoming.points_possible_at_sync,
    v_synced_at,
    v_synced_at,
    v_synced_at,
    null,
    incoming.source_fingerprint
  from pg_temp._canvas_grade_rows_resolved incoming
  on conflict on constraint canvas_assignment_submissions_identity_unique
  do update set
    workflow_state = excluded.workflow_state,
    normalized_status = excluded.normalized_status,
    submitted_at = excluded.submitted_at,
    graded_at = excluded.graded_at,
    posted_at = excluded.posted_at,
    attempt = excluded.attempt,
    submission_type = excluded.submission_type,
    grade_matches_current_submission = excluded.grade_matches_current_submission,
    late = excluded.late,
    missing = excluded.missing,
    excused = excluded.excused,
    assignment_visible = excluded.assignment_visible,
    late_policy_status = excluded.late_policy_status,
    seconds_late = excluded.seconds_late,
    score = excluded.score,
    grade = excluded.grade,
    score_visibility_state = excluded.score_visibility_state,
    grade_visibility_state = excluded.grade_visibility_state,
    points_possible_at_sync = excluded.points_possible_at_sync,
    last_synced_at = excluded.last_synced_at,
    last_seen_at = excluded.last_seen_at,
    absent_after_sync_at = null,
    source_fingerprint = excluded.source_fingerprint;

  assignments_inserted :=
    greatest(v_incoming_count - v_existing_same - v_existing_changed, 0);
  assignments_updated := coalesce(v_existing_changed, 0);
  assignments_unchanged := coalesce(v_existing_same, 0);
  persisted_count := coalesce(v_incoming_count, 0);

  return next;
end;
$$;

create or replace function public.upsert_canvas_course_grade_summary(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_course_id uuid,
  p_synced_at timestamptz,
  p_summary jsonb
)
returns table (
  summaries_inserted integer,
  summaries_updated integer,
  summaries_unchanged integer,
  visible_field_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_summary record;
  v_synced_at timestamptz := coalesce(p_synced_at, now());
  v_existing public.canvas_course_grade_summaries%rowtype;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_course_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_owner_missing';
  end if;

  if jsonb_typeof(p_summary) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_course_grade_summary';
  end if;

  perform 1
  from public.canvas_course_grade_sync_states state
  where state.user_id = p_user_id
    and state.canvas_connection_id = p_canvas_connection_id
    and state.course_id = p_course_id
    and state.sync_status = 'running'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_not_running';
  end if;

  perform 1
  from public.canvas_courses course
  join public.canvas_course_sync_preferences preference
    on preference.course_id = course.id
   and preference.user_id = p_user_id
   and preference.canvas_connection_id = p_canvas_connection_id
   and preference.selected = true
  where course.id = p_course_id
    and course.user_id = p_user_id
    and course.canvas_connection_id = p_canvas_connection_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_course_not_selected';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_summary) as key(name)
    where key.name not in (
      'current_score',
      'current_score_visibility_state',
      'current_grade',
      'current_grade_visibility_state',
      'final_score',
      'final_score_visibility_state',
      'final_grade',
      'final_grade_visibility_state',
      'source_fingerprint',
      'fingerprintVersion',
      'visibleFieldCount',
      'notApplicable'
    )
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_course_grade_summary';
  end if;

  select *
  into v_summary
  from jsonb_to_record(p_summary) as summary(
    current_score numeric,
    current_score_visibility_state text,
    current_grade text,
    current_grade_visibility_state text,
    final_score numeric,
    final_score_visibility_state text,
    final_grade text,
    final_grade_visibility_state text,
    source_fingerprint text
  );

  v_summary.source_fingerprint := nullif(btrim(v_summary.source_fingerprint), '');

  if v_summary.source_fingerprint is null
    or char_length(v_summary.source_fingerprint) > 128
    or v_summary.current_score_visibility_state not in (
      'unknown',
      'visible',
      'hidden',
      'unavailable',
      'not_applicable'
    )
    or v_summary.current_grade_visibility_state not in (
      'unknown',
      'visible',
      'hidden',
      'unavailable',
      'not_applicable'
    )
    or v_summary.final_score_visibility_state not in (
      'unknown',
      'visible',
      'hidden',
      'unavailable',
      'not_applicable'
    )
    or v_summary.final_grade_visibility_state not in (
      'unknown',
      'visible',
      'hidden',
      'unavailable',
      'not_applicable'
    )
    or (
      v_summary.current_score is not null
      and v_summary.current_score_visibility_state <> 'visible'
    )
    or (
      v_summary.current_grade is not null
      and v_summary.current_grade_visibility_state <> 'visible'
    )
    or (
      v_summary.final_score is not null
      and v_summary.final_score_visibility_state <> 'visible'
    )
    or (
      v_summary.final_grade is not null
      and v_summary.final_grade_visibility_state <> 'visible'
    )
    or (
      v_summary.current_grade is not null
      and char_length(v_summary.current_grade) > 120
    )
    or (
      v_summary.final_grade is not null
      and char_length(v_summary.final_grade) > 120
    ) then
    raise exception using errcode = 'P0001', message = 'invalid_canvas_course_grade_summary';
  end if;

  visible_field_count :=
    case when v_summary.current_score_visibility_state = 'visible' then 1 else 0 end +
    case when v_summary.current_grade_visibility_state = 'visible' then 1 else 0 end +
    case when v_summary.final_score_visibility_state = 'visible' then 1 else 0 end +
    case when v_summary.final_grade_visibility_state = 'visible' then 1 else 0 end;

  select *
  into v_existing
  from public.canvas_course_grade_summaries summary
  where summary.user_id = p_user_id
    and summary.canvas_connection_id = p_canvas_connection_id
    and summary.course_id = p_course_id;

  summaries_inserted := case when found then 0 else 1 end;
  summaries_updated :=
    case
      when found and v_existing.source_fingerprint is distinct from v_summary.source_fingerprint then 1
      else 0
    end;
  summaries_unchanged :=
    case
      when found and v_existing.source_fingerprint = v_summary.source_fingerprint then 1
      else 0
    end;

  insert into public.canvas_course_grade_summaries (
    user_id,
    canvas_connection_id,
    course_id,
    current_score,
    current_score_visibility_state,
    current_grade,
    current_grade_visibility_state,
    final_score,
    final_score_visibility_state,
    final_grade,
    final_grade_visibility_state,
    first_synced_at,
    last_synced_at,
    last_seen_at,
    source_fingerprint
  )
  values (
    p_user_id,
    p_canvas_connection_id,
    p_course_id,
    v_summary.current_score,
    v_summary.current_score_visibility_state,
    v_summary.current_grade,
    v_summary.current_grade_visibility_state,
    v_summary.final_score,
    v_summary.final_score_visibility_state,
    v_summary.final_grade,
    v_summary.final_grade_visibility_state,
    v_synced_at,
    v_synced_at,
    v_synced_at,
    v_summary.source_fingerprint
  )
  on conflict on constraint canvas_course_grade_summaries_identity_unique
  do update set
    current_score = excluded.current_score,
    current_score_visibility_state = excluded.current_score_visibility_state,
    current_grade = excluded.current_grade,
    current_grade_visibility_state = excluded.current_grade_visibility_state,
    final_score = excluded.final_score,
    final_score_visibility_state = excluded.final_score_visibility_state,
    final_grade = excluded.final_grade,
    final_grade_visibility_state = excluded.final_grade_visibility_state,
    last_synced_at = excluded.last_synced_at,
    last_seen_at = excluded.last_seen_at,
    source_fingerprint = excluded.source_fingerprint;

  return next;
end;
$$;

create or replace function public.finish_canvas_course_grade_sync(
  p_user_id uuid,
  p_canvas_connection_id uuid,
  p_course_id uuid,
  p_completed_at timestamptz,
  p_status text,
  p_assignment_family_state text,
  p_submission_family_state text,
  p_course_grade_summary_family_state text,
  p_assignment_count integer,
  p_submission_count integer,
  p_course_grade_summary_count integer,
  p_failure_code text,
  p_failure_category text,
  p_source_fingerprint text,
  p_fingerprint_version text
)
returns setof public.canvas_course_grade_sync_states
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_completed_at timestamptz := coalesce(p_completed_at, now());
  v_status text := nullif(btrim(p_status), '');
  v_assignment_family_state text := nullif(btrim(p_assignment_family_state), '');
  v_submission_family_state text := nullif(btrim(p_submission_family_state), '');
  v_course_grade_summary_family_state text :=
    nullif(btrim(p_course_grade_summary_family_state), '');
  v_failure_code text := nullif(btrim(p_failure_code), '');
  v_failure_category text := nullif(btrim(p_failure_category), '');
  v_source_fingerprint text := nullif(btrim(p_source_fingerprint), '');
  v_fingerprint_version text := nullif(btrim(p_fingerprint_version), '');
  v_required_family_succeeded boolean;
  v_state public.canvas_course_grade_sync_states%rowtype;
begin
  if p_user_id is null
    or p_canvas_connection_id is null
    or p_course_id is null then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_owner_missing';
  end if;

  if v_status not in ('succeeded', 'partial', 'failed')
    or v_assignment_family_state not in ('succeeded', 'failed')
    or v_submission_family_state not in ('succeeded', 'failed')
    or v_course_grade_summary_family_state not in ('succeeded', 'failed') then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_state_invalid';
  end if;

  if p_assignment_count is null
    or p_submission_count is null
    or p_course_grade_summary_count is null
    or p_assignment_count < 0
    or p_submission_count < 0
    or p_course_grade_summary_count < 0 then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_counts_invalid';
  end if;

  if v_status = 'succeeded'
    and (v_failure_code is not null or v_failure_category is not null) then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_failure_invalid';
  end if;

  if v_status <> 'succeeded' then
    v_failure_code := coalesce(v_failure_code, 'canvas_grade_sync_failed');
    v_failure_category := coalesce(v_failure_category, 'unknown');
  end if;

  if (v_failure_code is null) is distinct from (v_failure_category is null) then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_failure_invalid';
  end if;

  if v_failure_category is not null
    and v_failure_category not in (
      'authentication_failure',
      'permission_denied',
      'resource_not_found',
      'rate_limited',
      'server_error',
      'network_error',
      'timeout',
      'malformed_response',
      'pagination_rejected',
      'redirect_rejected',
      'persistence_failure',
      'normalization_failure',
      'partial_sync',
      'unknown'
    ) then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_failure_invalid';
  end if;

  if v_failure_code is not null
    and (
      v_failure_code !~ '^[a-z0-9_]+$'
      or char_length(v_failure_code) > 80
    ) then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_failure_invalid';
  end if;

  if (v_source_fingerprint is null) is distinct from (v_fingerprint_version is null)
    or (
      v_source_fingerprint is not null
      and (
        char_length(v_source_fingerprint) > 128
        or char_length(v_fingerprint_version) > 80
      )
    ) then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_fingerprint_invalid';
  end if;

  v_required_family_succeeded :=
    v_assignment_family_state = 'succeeded'
    and v_submission_family_state = 'succeeded';

  update public.canvas_course_grade_sync_states state
  set
    sync_status = v_status,
    last_checked_at = v_completed_at,
    last_completed_at = v_completed_at,
    last_successful_sync_at =
      case
        when v_required_family_succeeded then v_completed_at
        else state.last_successful_sync_at
      end,
    last_completed_snapshot_authoritative = (v_status = 'succeeded'),
    consecutive_failure_count =
      case
        when v_required_family_succeeded then 0
        else state.consecutive_failure_count + 1
      end,
    last_failure_code = v_failure_code,
    last_failure_category = v_failure_category,
    synced_assignment_count = p_assignment_count,
    synced_submission_count = p_submission_count,
    synced_course_grade_summary_count = p_course_grade_summary_count,
    assignment_family_state = v_assignment_family_state,
    submission_family_state = v_submission_family_state,
    course_grade_summary_family_state = v_course_grade_summary_family_state,
    source_fingerprint = v_source_fingerprint,
    fingerprint_version = v_fingerprint_version
  where state.user_id = p_user_id
    and state.canvas_connection_id = p_canvas_connection_id
    and state.course_id = p_course_id
    and state.sync_status = 'running'
  returning *
  into v_state;

  if not found then
    raise exception using errcode = 'P0001', message = 'canvas_grade_sync_not_running';
  end if;

  return next v_state;
end;
$$;

revoke all on function public.begin_canvas_course_grade_sync(
  uuid,
  uuid,
  uuid,
  timestamptz,
  integer
) from public;
revoke all on function public.begin_canvas_course_grade_sync(
  uuid,
  uuid,
  uuid,
  timestamptz,
  integer
) from anon;
revoke all on function public.begin_canvas_course_grade_sync(
  uuid,
  uuid,
  uuid,
  timestamptz,
  integer
) from authenticated;
grant execute on function public.begin_canvas_course_grade_sync(
  uuid,
  uuid,
  uuid,
  timestamptz,
  integer
) to service_role;

revoke all on function public.replace_canvas_course_assignment_submission_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  text,
  text
) from public;
revoke all on function public.replace_canvas_course_assignment_submission_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  text,
  text
) from anon;
revoke all on function public.replace_canvas_course_assignment_submission_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  text,
  text
) from authenticated;
grant execute on function public.replace_canvas_course_assignment_submission_snapshot(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb,
  text,
  text
) to service_role;

revoke all on function public.upsert_canvas_course_grade_summary(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb
) from public;
revoke all on function public.upsert_canvas_course_grade_summary(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb
) from anon;
revoke all on function public.upsert_canvas_course_grade_summary(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb
) from authenticated;
grant execute on function public.upsert_canvas_course_grade_summary(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb
) to service_role;

revoke all on function public.finish_canvas_course_grade_sync(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text
) from public;
revoke all on function public.finish_canvas_course_grade_sync(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text
) from anon;
revoke all on function public.finish_canvas_course_grade_sync(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text
) from authenticated;
grant execute on function public.finish_canvas_course_grade_sync(
  uuid,
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text
) to service_role;
