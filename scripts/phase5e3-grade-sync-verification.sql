begin;

create temp table _phase5e3_checks (
  check_name text primary key,
  passed boolean not null,
  notes text not null default ''
) on commit drop;

insert into _phase5e3_checks (check_name, passed, notes)
with expected_functions(signature) as (
  values
    ('public.begin_canvas_course_grade_sync(uuid,uuid,uuid,timestamp with time zone,integer)'::regprocedure),
    ('public.replace_canvas_course_assignment_submission_snapshot(uuid,uuid,uuid,timestamp with time zone,jsonb,text,text)'::regprocedure),
    ('public.upsert_canvas_course_grade_summary(uuid,uuid,uuid,timestamp with time zone,jsonb)'::regprocedure),
    ('public.finish_canvas_course_grade_sync(uuid,uuid,uuid,timestamp with time zone,text,text,text,text,integer,integer,integer,text,text,text,text)'::regprocedure)
)
select
  'phase5e3_rpc_existence',
  count(*) = 4,
  'four Phase 5E.3 service-role RPCs exist'
from expected_functions expected
join pg_proc proc on proc.oid = expected.signature
union all
select
  'phase5e3_rpc_owner_security_search_path',
  count(*) = 4,
  'RPCs are security definer, postgres-owned, and pin search_path'
from expected_functions expected
join pg_proc proc on proc.oid = expected.signature
where proc.prosecdef
  and pg_get_userbyid(proc.proowner) = 'postgres'
  and exists (
    select 1
    from unnest(coalesce(proc.proconfig, '{}'::text[])) as config(value)
    where config.value = 'search_path=public, pg_temp'
  )
union all
select
  'phase5e3_rpc_public_anon_authenticated_revoked',
  not exists (
    select 1
    from expected_functions expected
    where has_function_privilege('public', expected.signature, 'execute')
       or has_function_privilege('anon', expected.signature, 'execute')
       or has_function_privilege('authenticated', expected.signature, 'execute')
  ),
  'public, anon, and authenticated cannot execute Phase 5E.3 RPCs'
union all
select
  'phase5e3_rpc_service_role_granted',
  not exists (
    select 1
    from expected_functions expected
    where not has_function_privilege('service_role', expected.signature, 'execute')
  ),
  'service_role can execute Phase 5E.3 RPCs';

do $$
declare
  v_user_a uuid := '00000000-0000-4000-8000-00000005e3a1';
  v_user_b uuid := '00000000-0000-4000-8000-00000005e3b2';
  v_connection_a uuid := '10000000-0000-4000-8000-00000005e3a1';
  v_connection_b uuid := '10000000-0000-4000-8000-00000005e3b2';
  v_course_a uuid := '20000000-0000-4000-8000-00000005e3a1';
  v_course_a2 uuid := '20000000-0000-4000-8000-00000005e3a2';
  v_course_b uuid := '20000000-0000-4000-8000-00000005e3b2';
  v_assignment_row_1 uuid;
  v_assignment_row_2 uuid;
  v_submission_row_1 uuid;
  v_first_synced_at timestamptz;
  v_last_synced_at timestamptz;
  v_summary_id uuid;
  v_summary_first_synced_at timestamptz;
  v_now timestamptz := '2026-07-08T00:00:00Z';
  v_rejected boolean;
  v_snapshot jsonb;
  v_hidden_summary jsonb;
  v_visible_summary jsonb;
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  values
    (
      v_user_a,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'phase5e3-a@example.invalid',
      'not-a-real-password',
      v_now,
      '{}'::jsonb,
      '{}'::jsonb,
      v_now,
      v_now,
      '',
      '',
      '',
      ''
    ),
    (
      v_user_b,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'phase5e3-b@example.invalid',
      'not-a-real-password',
      v_now,
      '{}'::jsonb,
      '{}'::jsonb,
      v_now,
      v_now,
      '',
      '',
      '',
      ''
    );

  insert into public.canvas_connections (
    id,
    user_id,
    base_url,
    canvas_user_id,
    canvas_user_name,
    token_ciphertext,
    token_iv,
    token_auth_tag,
    encryption_version,
    status,
    last_verified_at
  )
  values
    (
      v_connection_a,
      v_user_a,
      'https://canvas.example.invalid',
      'fictional-user-a',
      'Fictional User A',
      'ciphertext',
      'iv',
      'tag',
      'aes-256-gcm:v1',
      'active',
      v_now
    ),
    (
      v_connection_b,
      v_user_b,
      'https://canvas.example.invalid',
      'fictional-user-b',
      'Fictional User B',
      'ciphertext',
      'iv',
      'tag',
      'aes-256-gcm:v1',
      'active',
      v_now
    );

  insert into public.canvas_courses (
    id,
    user_id,
    canvas_connection_id,
    canvas_course_id,
    name,
    course_code,
    workflow_state,
    first_synced_at,
    last_synced_at
  )
  values
    (
      v_course_a,
      v_user_a,
      v_connection_a,
      'fictional-course-a',
      'Fictional Course A',
      'FCA',
      'available',
      v_now,
      v_now
    ),
    (
      v_course_a2,
      v_user_a,
      v_connection_a,
      'fictional-course-a2',
      'Fictional Course A2',
      'FCA2',
      'available',
      v_now,
      v_now
    ),
    (
      v_course_b,
      v_user_b,
      v_connection_b,
      'fictional-course-b',
      'Fictional Course B',
      'FCB',
      'available',
      v_now,
      v_now
    );

  insert into public.canvas_course_sync_preferences (
    user_id,
    canvas_connection_id,
    course_id,
    selected,
    display_order,
    selected_at
  )
  values
    (v_user_a, v_connection_a, v_course_a, true, 0, v_now),
    (v_user_a, v_connection_a, v_course_a2, true, 1, v_now),
    (v_user_b, v_connection_b, v_course_b, true, 0, v_now);

  v_snapshot := jsonb_build_array(
    jsonb_build_object(
      'canvas_assignment_id', 'fictional-assignment-1',
      'canvas_assignment_group_id', null,
      'name', 'Fictional Assignment One',
      'points_possible', 10,
      'grading_type', 'points',
      'submission_types', jsonb_build_array('online_upload'),
      'due_at', '2026-07-09T00:00:00Z',
      'unlock_at', null,
      'lock_at', null,
      'published', true,
      'muted', false,
      'omit_from_final_grade', false,
      'quiz_id', null,
      'discussion_topic_id', null,
      'workflow_state', 'submitted',
      'normalized_status', 'graded',
      'submitted_at', '2026-07-08T01:00:00Z',
      'graded_at', null,
      'posted_at', null,
      'attempt', 1,
      'submission_type', 'online_upload',
      'grade_matches_current_submission', true,
      'late', false,
      'missing', false,
      'excused', false,
      'assignment_visible', true,
      'late_policy_status', null,
      'seconds_late', null,
      'score', 0,
      'grade', '',
      'score_visibility_state', 'visible',
      'grade_visibility_state', 'visible',
      'points_possible_at_sync', 10,
      'has_submission_evidence', true,
      'source_fingerprint', repeat('1', 64)
    ),
    jsonb_build_object(
      'canvas_assignment_id', 'fictional-assignment-2',
      'canvas_assignment_group_id', null,
      'name', 'Fictional Assignment Two',
      'points_possible', 5,
      'grading_type', 'points',
      'submission_types', jsonb_build_array('none'),
      'due_at', null,
      'unlock_at', null,
      'lock_at', null,
      'published', true,
      'muted', false,
      'omit_from_final_grade', false,
      'quiz_id', null,
      'discussion_topic_id', null,
      'workflow_state', null,
      'normalized_status', 'no_due_date',
      'submitted_at', null,
      'graded_at', null,
      'posted_at', null,
      'attempt', null,
      'submission_type', null,
      'grade_matches_current_submission', null,
      'late', null,
      'missing', null,
      'excused', null,
      'assignment_visible', true,
      'late_policy_status', null,
      'seconds_late', null,
      'score', null,
      'grade', null,
      'score_visibility_state', 'unknown',
      'grade_visibility_state', 'unknown',
      'points_possible_at_sync', 5,
      'has_submission_evidence', false,
      'source_fingerprint', repeat('2', 64)
    )
  );

  v_visible_summary := jsonb_build_object(
    'current_score', 0,
    'current_score_visibility_state', 'visible',
    'current_grade', '',
    'current_grade_visibility_state', 'visible',
    'final_score', null,
    'final_score_visibility_state', 'hidden',
    'final_grade', null,
    'final_grade_visibility_state', 'hidden',
    'source_fingerprint', repeat('3', 64),
    'fingerprintVersion', 'canvas-course-grade-summary-v1',
    'visibleFieldCount', 2,
    'notApplicable', false
  );

  v_hidden_summary := jsonb_build_object(
    'current_score', null,
    'current_score_visibility_state', 'hidden',
    'current_grade', null,
    'current_grade_visibility_state', 'hidden',
    'final_score', null,
    'final_score_visibility_state', 'unavailable',
    'final_grade', null,
    'final_grade_visibility_state', 'unavailable',
    'source_fingerprint', repeat('4', 64),
    'fingerprintVersion', 'canvas-course-grade-summary-v1',
    'visibleFieldCount', 0,
    'notApplicable', false
  );

  perform *
  from public.begin_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now,
    1800
  );

  insert into _phase5e3_checks
  select
    'begin_running_state',
    exists (
      select 1
      from public.canvas_course_grade_sync_states
      where user_id = v_user_a
        and canvas_connection_id = v_connection_a
        and course_id = v_course_a
        and sync_status = 'running'
        and assignment_family_state = 'not_started'
    ),
    'begin RPC creates a running per-course grade state';

  v_rejected := false;
  begin
    perform *
    from public.begin_canvas_course_grade_sync(
      v_user_a,
      v_connection_a,
      v_course_a,
      v_now + interval '1 minute',
      1800
    );
  exception
    when others then
      v_rejected := sqlerrm like '%canvas_grade_sync_in_progress%';
  end;

  insert into _phase5e3_checks
  values (
    'overlap_rejection',
    v_rejected,
    'active non-stale grade sync rejects overlap safely'
  );

  perform *
  from public.replace_canvas_course_assignment_submission_snapshot(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now,
    v_snapshot,
    repeat('a', 64),
    'canvas-grade-assignment-submission-snapshot-v1'
  );

  select id, first_synced_at, last_synced_at
  into v_submission_row_1, v_first_synced_at, v_last_synced_at
  from public.canvas_assignment_submissions
  where user_id = v_user_a
    and canvas_connection_id = v_connection_a
    and course_id = v_course_a
    and normalized_status = 'graded';

  perform *
  from public.replace_canvas_course_assignment_submission_snapshot(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '5 minutes',
    v_snapshot,
    repeat('a', 64),
    'canvas-grade-assignment-submission-snapshot-v1'
  );

  insert into _phase5e3_checks
  select
    'idempotent_snapshot_stable_identity',
    exists (
      select 1
      from public.canvas_assignment_submissions
      where id = v_submission_row_1
        and first_synced_at = v_first_synced_at
        and last_synced_at > v_last_synced_at
    ),
    'repeated identical snapshot preserves row id and first_synced_at while advancing last_synced_at';

  perform *
  from public.upsert_canvas_course_grade_summary(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now,
    v_visible_summary
  );

  select id, first_synced_at
  into v_summary_id, v_summary_first_synced_at
  from public.canvas_course_grade_summaries
  where user_id = v_user_a
    and canvas_connection_id = v_connection_a
    and course_id = v_course_a;

  perform *
  from public.upsert_canvas_course_grade_summary(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '10 minutes',
    v_hidden_summary
  );

  insert into _phase5e3_checks
  select
    'visible_to_hidden_replacement',
    exists (
      select 1
      from public.canvas_course_grade_summaries
      where id = v_summary_id
        and first_synced_at = v_summary_first_synced_at
        and current_score is null
        and current_grade is null
        and current_score_visibility_state = 'hidden'
        and current_grade_visibility_state = 'hidden'
    ),
    'authoritative hidden summary clears previously visible values';

  perform *
  from public.finish_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '11 minutes',
    'succeeded',
    'succeeded',
    'succeeded',
    'succeeded',
    2,
    1,
    1,
    null,
    null,
    repeat('a', 64),
    'canvas-grade-assignment-submission-snapshot-v1'
  );

  insert into _phase5e3_checks
  select
    'finish_success_state',
    exists (
      select 1
      from public.canvas_course_grade_sync_states
      where user_id = v_user_a
        and canvas_connection_id = v_connection_a
        and course_id = v_course_a
        and sync_status = 'succeeded'
        and last_successful_sync_at = v_now + interval '11 minutes'
        and last_completed_snapshot_authoritative = true
    ),
    'finish RPC records successful authoritative state';

  select id into v_assignment_row_2
  from public.canvas_assignments
  where user_id = v_user_a
    and canvas_connection_id = v_connection_a
    and course_id = v_course_a
    and canvas_assignment_id = 'fictional-assignment-2';

  perform *
  from public.begin_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '20 minutes',
    1800
  );

  perform *
  from public.replace_canvas_course_assignment_submission_snapshot(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '20 minutes',
    v_snapshot - 1,
    repeat('b', 64),
    'canvas-grade-assignment-submission-snapshot-v1'
  );

  insert into _phase5e3_checks
  select
    'authoritative_absence_marking',
    exists (
      select 1
      from public.canvas_assignment_submissions
      where user_id = v_user_a
        and canvas_connection_id = v_connection_a
        and course_id = v_course_a
        and assignment_id = v_assignment_row_2
        and normalized_status = 'unavailable'
        and absent_after_sync_at = v_now + interval '20 minutes'
        and score is null
        and grade is null
    ),
    'complete authoritative second snapshot marks missing assignment row absent';

  perform *
  from public.finish_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '21 minutes',
    'partial',
    'succeeded',
    'succeeded',
    'failed',
    1,
    1,
    0,
    'canvas_unavailable',
    'network_error',
    repeat('b', 64),
    'canvas-grade-assignment-submission-snapshot-v1'
  );

  insert into _phase5e3_checks
  select
    'partial_state_preserves_primary_success',
    exists (
      select 1
      from public.canvas_course_grade_sync_states
      where user_id = v_user_a
        and canvas_connection_id = v_connection_a
        and course_id = v_course_a
        and sync_status = 'partial'
        and last_successful_sync_at = v_now + interval '21 minutes'
        and last_completed_snapshot_authoritative = false
        and last_failure_code = 'canvas_unavailable'
    ),
    'partial summary failure preserves primary-family success timestamp';

  perform *
  from public.begin_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '30 minutes',
    1800
  );

  v_rejected := false;
  begin
    perform *
    from public.replace_canvas_course_assignment_submission_snapshot(
      v_user_a,
      v_connection_a,
      v_course_a,
      v_now + interval '30 minutes',
      jsonb_build_array(v_snapshot -> 0, v_snapshot -> 0),
      repeat('c', 64),
      'canvas-grade-assignment-submission-snapshot-v1'
    );
  exception
    when others then
      v_rejected := sqlerrm like '%duplicate_canvas_assignment%';
  end;

  insert into _phase5e3_checks
  values (
    'duplicate_input_rejection',
    v_rejected,
    'duplicate Canvas assignment identities are rejected'
  );

  perform *
  from public.finish_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '31 minutes',
    'failed',
    'failed',
    'failed',
    'failed',
    0,
    0,
    0,
    'canvas_grade_sync_failed',
    'normalization_failure',
    null,
    null
  );

  v_rejected := false;
  begin
    perform *
    from public.begin_canvas_course_grade_sync(
      v_user_b,
      v_connection_b,
      v_course_a,
      v_now,
      1800
    );
  exception
    when others then
      v_rejected := sqlerrm like '%canvas_course_missing%';
  end;

  insert into _phase5e3_checks
  values (
    'cross_user_rejection',
    v_rejected,
    'cross-user course cannot begin grade sync'
  );

  select id
  into v_assignment_row_1
  from public.canvas_assignments
  where user_id = v_user_a
    and canvas_connection_id = v_connection_a
    and course_id = v_course_a
    and canvas_assignment_id = 'fictional-assignment-1';

  v_rejected := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      normalized_status,
      score_visibility_state,
      grade_visibility_state,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a2,
      v_assignment_row_1,
      'available',
      'unknown',
      'unknown',
      repeat('5', 64)
    );
  exception
    when others then
      v_rejected := true;
  end;

  insert into _phase5e3_checks
  values (
    'cross_course_assignment_rejection',
    v_rejected,
    'submission rows cannot reference assignments from another course'
  );

  perform *
  from public.begin_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '40 minutes',
    1800
  );

  update public.canvas_course_grade_sync_states
  set last_checked_at = v_now
  where user_id = v_user_a
    and canvas_connection_id = v_connection_a
    and course_id = v_course_a;

  perform *
  from public.begin_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '2 hours',
    60
  );

  insert into _phase5e3_checks
  select
    'stale_running_recovery',
    exists (
      select 1
      from public.canvas_course_grade_sync_states
      where user_id = v_user_a
        and canvas_connection_id = v_connection_a
        and course_id = v_course_a
        and sync_status = 'running'
        and last_checked_at = v_now + interval '2 hours'
    ),
    'stale running state can be recovered by a new begin call';

  perform *
  from public.finish_canvas_course_grade_sync(
    v_user_a,
    v_connection_a,
    v_course_a,
    v_now + interval '2 hours 1 minute',
    'failed',
    'failed',
    'failed',
    'failed',
    0,
    0,
    0,
    'canvas_timeout',
    'timeout',
    null,
    null
  );

  insert into _phase5e3_checks
  select
    'failed_run_not_left_running',
    not exists (
      select 1
      from public.canvas_course_grade_sync_states
      where user_id = v_user_a
        and canvas_connection_id = v_connection_a
        and course_id = v_course_a
        and sync_status = 'running'
    ),
    'failed grade sync finish clears running state';
end;
$$;

do $$
declare
  v_failed text;
begin
  select string_agg(check_name, ', ' order by check_name)
  into v_failed
  from _phase5e3_checks
  where not passed;

  if v_failed is not null then
    raise exception 'Phase 5E.3 verifier failed checks: %', v_failed;
  end if;
end;
$$;

select check_name, passed, notes
from _phase5e3_checks
order by check_name;

rollback;

select
  'phase5e3_fictional_cleanup' as check_name,
  (
    select count(*)
    from auth.users
    where id in (
      '00000000-0000-4000-8000-00000005e3a1',
      '00000000-0000-4000-8000-00000005e3b2'
    )
  ) = 0 as passed,
  'fictional verifier users were rolled back' as notes;
