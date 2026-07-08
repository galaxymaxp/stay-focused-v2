begin;

create temp table _phase5e1_checks (
  check_name text primary key,
  passed boolean not null,
  notes text not null default ''
) on commit drop;

insert into _phase5e1_checks (check_name, passed, notes)
with expected_tables(table_name) as (
  values
    ('canvas_assignment_submissions'),
    ('canvas_course_grade_summaries'),
    ('canvas_course_grade_sync_states')
), expected_columns(table_name, column_name, data_type, is_nullable) as (
  values
    ('canvas_assignment_submissions', 'id', 'uuid', 'NO'),
    ('canvas_assignment_submissions', 'user_id', 'uuid', 'NO'),
    ('canvas_assignment_submissions', 'canvas_connection_id', 'uuid', 'NO'),
    ('canvas_assignment_submissions', 'course_id', 'uuid', 'NO'),
    ('canvas_assignment_submissions', 'assignment_id', 'uuid', 'NO'),
    ('canvas_assignment_submissions', 'workflow_state', 'text', 'YES'),
    ('canvas_assignment_submissions', 'normalized_status', 'text', 'NO'),
    ('canvas_assignment_submissions', 'submitted_at', 'timestamp with time zone', 'YES'),
    ('canvas_assignment_submissions', 'graded_at', 'timestamp with time zone', 'YES'),
    ('canvas_assignment_submissions', 'posted_at', 'timestamp with time zone', 'YES'),
    ('canvas_assignment_submissions', 'attempt', 'integer', 'YES'),
    ('canvas_assignment_submissions', 'submission_type', 'text', 'YES'),
    ('canvas_assignment_submissions', 'grade_matches_current_submission', 'boolean', 'YES'),
    ('canvas_assignment_submissions', 'late', 'boolean', 'YES'),
    ('canvas_assignment_submissions', 'missing', 'boolean', 'YES'),
    ('canvas_assignment_submissions', 'excused', 'boolean', 'YES'),
    ('canvas_assignment_submissions', 'assignment_visible', 'boolean', 'YES'),
    ('canvas_assignment_submissions', 'late_policy_status', 'text', 'YES'),
    ('canvas_assignment_submissions', 'seconds_late', 'integer', 'YES'),
    ('canvas_assignment_submissions', 'score', 'numeric', 'YES'),
    ('canvas_assignment_submissions', 'grade', 'text', 'YES'),
    ('canvas_assignment_submissions', 'score_visibility_state', 'text', 'NO'),
    ('canvas_assignment_submissions', 'grade_visibility_state', 'text', 'NO'),
    ('canvas_assignment_submissions', 'points_possible_at_sync', 'numeric', 'YES'),
    ('canvas_assignment_submissions', 'first_synced_at', 'timestamp with time zone', 'NO'),
    ('canvas_assignment_submissions', 'last_synced_at', 'timestamp with time zone', 'NO'),
    ('canvas_assignment_submissions', 'last_seen_at', 'timestamp with time zone', 'NO'),
    ('canvas_assignment_submissions', 'absent_after_sync_at', 'timestamp with time zone', 'YES'),
    ('canvas_assignment_submissions', 'source_fingerprint', 'text', 'NO'),
    ('canvas_assignment_submissions', 'created_at', 'timestamp with time zone', 'NO'),
    ('canvas_assignment_submissions', 'updated_at', 'timestamp with time zone', 'NO'),
    ('canvas_course_grade_summaries', 'id', 'uuid', 'NO'),
    ('canvas_course_grade_summaries', 'user_id', 'uuid', 'NO'),
    ('canvas_course_grade_summaries', 'canvas_connection_id', 'uuid', 'NO'),
    ('canvas_course_grade_summaries', 'course_id', 'uuid', 'NO'),
    ('canvas_course_grade_summaries', 'current_score', 'numeric', 'YES'),
    ('canvas_course_grade_summaries', 'current_score_visibility_state', 'text', 'NO'),
    ('canvas_course_grade_summaries', 'current_grade', 'text', 'YES'),
    ('canvas_course_grade_summaries', 'current_grade_visibility_state', 'text', 'NO'),
    ('canvas_course_grade_summaries', 'final_score', 'numeric', 'YES'),
    ('canvas_course_grade_summaries', 'final_score_visibility_state', 'text', 'NO'),
    ('canvas_course_grade_summaries', 'final_grade', 'text', 'YES'),
    ('canvas_course_grade_summaries', 'final_grade_visibility_state', 'text', 'NO'),
    ('canvas_course_grade_summaries', 'first_synced_at', 'timestamp with time zone', 'NO'),
    ('canvas_course_grade_summaries', 'last_synced_at', 'timestamp with time zone', 'NO'),
    ('canvas_course_grade_summaries', 'last_seen_at', 'timestamp with time zone', 'NO'),
    ('canvas_course_grade_summaries', 'source_fingerprint', 'text', 'NO'),
    ('canvas_course_grade_summaries', 'created_at', 'timestamp with time zone', 'NO'),
    ('canvas_course_grade_summaries', 'updated_at', 'timestamp with time zone', 'NO'),
    ('canvas_course_grade_sync_states', 'id', 'uuid', 'NO'),
    ('canvas_course_grade_sync_states', 'user_id', 'uuid', 'NO'),
    ('canvas_course_grade_sync_states', 'canvas_connection_id', 'uuid', 'NO'),
    ('canvas_course_grade_sync_states', 'course_id', 'uuid', 'NO'),
    ('canvas_course_grade_sync_states', 'sync_status', 'text', 'NO'),
    ('canvas_course_grade_sync_states', 'last_checked_at', 'timestamp with time zone', 'YES'),
    ('canvas_course_grade_sync_states', 'last_completed_at', 'timestamp with time zone', 'YES'),
    ('canvas_course_grade_sync_states', 'last_successful_sync_at', 'timestamp with time zone', 'YES'),
    ('canvas_course_grade_sync_states', 'last_completed_snapshot_authoritative', 'boolean', 'NO'),
    ('canvas_course_grade_sync_states', 'consecutive_failure_count', 'integer', 'NO'),
    ('canvas_course_grade_sync_states', 'last_failure_code', 'text', 'YES'),
    ('canvas_course_grade_sync_states', 'last_failure_category', 'text', 'YES'),
    ('canvas_course_grade_sync_states', 'synced_assignment_count', 'integer', 'NO'),
    ('canvas_course_grade_sync_states', 'synced_submission_count', 'integer', 'NO'),
    ('canvas_course_grade_sync_states', 'synced_course_grade_summary_count', 'integer', 'NO'),
    ('canvas_course_grade_sync_states', 'assignment_family_state', 'text', 'NO'),
    ('canvas_course_grade_sync_states', 'submission_family_state', 'text', 'NO'),
    ('canvas_course_grade_sync_states', 'course_grade_summary_family_state', 'text', 'NO'),
    ('canvas_course_grade_sync_states', 'source_fingerprint', 'text', 'YES'),
    ('canvas_course_grade_sync_states', 'fingerprint_version', 'text', 'YES'),
    ('canvas_course_grade_sync_states', 'created_at', 'timestamp with time zone', 'NO'),
    ('canvas_course_grade_sync_states', 'updated_at', 'timestamp with time zone', 'NO')
), expected_indexes(index_name) as (
  values
    ('canvas_assignment_submissions_user_status_idx'),
    ('canvas_assignment_submissions_course_status_idx'),
    ('canvas_assignment_submissions_assignment_idx'),
    ('canvas_assignment_submissions_connection_seen_idx'),
    ('canvas_course_grade_summaries_user_synced_idx'),
    ('canvas_course_grade_summaries_connection_synced_idx'),
    ('canvas_course_grade_summaries_course_idx'),
    ('canvas_course_grade_sync_states_user_checked_idx'),
    ('canvas_course_grade_sync_states_connection_checked_idx'),
    ('canvas_course_grade_sync_states_course_idx'),
    ('canvas_course_grade_sync_states_status_idx')
), expected_constraints(conname) as (
  values
    ('canvas_assignments_id_user_connection_course_unique'),
    ('canvas_assignment_submissions_connection_user_fkey'),
    ('canvas_assignment_submissions_course_owner_fkey'),
    ('canvas_assignment_submissions_assignment_owner_fkey'),
    ('canvas_assignment_submissions_identity_unique'),
    ('canvas_assignment_submissions_workflow_state_allowed'),
    ('canvas_assignment_submissions_normalized_status_allowed'),
    ('canvas_assignment_submissions_late_policy_status_allowed'),
    ('canvas_assignment_submissions_attempt_non_negative'),
    ('canvas_assignment_submissions_seconds_late_non_negative'),
    ('canvas_assignment_submissions_points_possible_safe'),
    ('canvas_assignment_submissions_score_safe'),
    ('canvas_assignment_submissions_visibility_states_allowed'),
    ('canvas_assignment_submissions_score_visibility_consistency'),
    ('canvas_assignment_submissions_grade_visibility_consistency'),
    ('canvas_course_grade_summaries_connection_user_fkey'),
    ('canvas_course_grade_summaries_course_owner_fkey'),
    ('canvas_course_grade_summaries_identity_unique'),
    ('canvas_course_grade_summaries_visibility_states_allowed'),
    ('canvas_course_grade_summaries_current_score_safe'),
    ('canvas_course_grade_summaries_final_score_safe'),
    ('canvas_course_grade_summaries_value_visibility_consistency'),
    ('canvas_course_grade_sync_states_connection_user_fkey'),
    ('canvas_course_grade_sync_states_course_owner_fkey'),
    ('canvas_course_grade_sync_states_identity_unique'),
    ('canvas_course_grade_sync_states_status_allowed'),
    ('canvas_course_grade_sync_states_family_state_allowed'),
    ('canvas_course_grade_sync_states_failure_category_allowed'),
    ('canvas_course_grade_sync_states_failure_code_safe'),
    ('canvas_course_grade_sync_states_failure_consistency'),
    ('canvas_course_grade_sync_states_authoritative_consistency'),
    ('canvas_course_grade_sync_states_counts_non_negative'),
    ('canvas_course_grade_sync_states_fingerprint_consistency')
), expected_policies(policy_name) as (
  values
    ('canvas_assignment_submissions_select_own'),
    ('canvas_assignment_submissions_insert_own'),
    ('canvas_assignment_submissions_update_own'),
    ('canvas_assignment_submissions_delete_own'),
    ('canvas_course_grade_summaries_select_own'),
    ('canvas_course_grade_summaries_insert_own'),
    ('canvas_course_grade_summaries_update_own'),
    ('canvas_course_grade_summaries_delete_own'),
    ('canvas_course_grade_sync_states_select_own'),
    ('canvas_course_grade_sync_states_insert_own'),
    ('canvas_course_grade_sync_states_update_own'),
    ('canvas_course_grade_sync_states_delete_own')
), expected_functions(function_name) as (
  values
    ('set_canvas_assignment_submissions_updated_at'),
    ('set_canvas_course_grade_summaries_updated_at'),
    ('set_canvas_course_grade_sync_states_updated_at')
)
select 'expected_tables_exist', count(*) = 3, 'three Phase 5E.1 tables exist'
from information_schema.tables t
join expected_tables e on e.table_name = t.table_name
where t.table_schema = 'public'
union all
select
  'expected_columns_types_nullability',
  count(*) = (select count(*) from expected_columns),
  'all expected columns, data types, and nullability match'
from information_schema.columns c
join expected_columns e
  on e.table_name = c.table_name
  and e.column_name = c.column_name
  and e.data_type = c.data_type
  and e.is_nullable = c.is_nullable
where c.table_schema = 'public'
union all
select 'expected_indexes_exist', count(*) = 11, 'Phase 5E.1 lookup indexes exist'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_indexes e on e.index_name = c.relname
where n.nspname = 'public'
union all
select 'expected_constraints_exist', count(*) = 33, 'ownership, uniqueness, and value constraints exist'
from pg_constraint c
join expected_constraints e on e.conname = c.conname
union all
select 'expected_policies_exist', count(*) = 12, 'owner-scoped defense-in-depth policies exist'
from pg_policies p
join expected_policies e on e.policy_name = p.policyname
where p.schemaname = 'public'
union all
select 'controlled_grade_trigger_function_search_path', count(*) = 3, 'new trigger functions pin search_path'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join expected_functions e on e.function_name = p.proname
where n.nspname = 'public'
  and exists (
    select 1
    from unnest(coalesce(p.proconfig, '{}'::text[])) as config(value)
    where config.value = 'search_path=public, pg_temp'
  )
union all
select 'rls_enabled', bool_and(c.relrowsecurity), 'RLS enabled on all new tables'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_tables e on e.table_name = c.relname
where n.nspname = 'public'
union all
select 'anon_authenticated_public_grants_revoked', not exists (
  select 1
  from information_schema.table_privileges p
  join expected_tables e on e.table_name = p.table_name
  where p.table_schema = 'public'
    and p.grantee in ('PUBLIC', 'public', 'anon', 'authenticated')
    and p.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
), 'anon/authenticated/public have no direct table DML grants'
union all
select 'service_role_grants_exact', not exists (
  select 1
  from expected_tables e
  where not has_table_privilege('service_role', format('public.%I', e.table_name), 'select')
     or not has_table_privilege('service_role', format('public.%I', e.table_name), 'insert')
     or not has_table_privilege('service_role', format('public.%I', e.table_name), 'update')
     or not has_table_privilege('service_role', format('public.%I', e.table_name), 'delete')
     or has_table_privilege('service_role', format('public.%I', e.table_name), 'truncate')
     or has_table_privilege('service_role', format('public.%I', e.table_name), 'references')
     or has_table_privilege('service_role', format('public.%I', e.table_name), 'trigger')
), 'service_role has only select/insert/update/delete table grants'
union all
select 'privacy_columns_absent', not exists (
  select 1
  from information_schema.columns c
  join expected_tables e on e.table_name = c.table_name
  where c.table_schema = 'public'
    and (
      c.column_name like '%body%'
      or c.column_name like '%comment%'
      or c.column_name like '%attachment%'
      or c.column_name like '%rubric%'
      or c.column_name like '%grader%'
      or c.column_name in (
        'preview_url',
        'raw_canvas_json',
        'raw_json',
        'raw_payload',
        'canvas_payload',
        'unposted_grade',
        'unposted_score',
        'unposted_current_score',
        'unposted_final_score'
      )
    )
), 'no submission bodies, comments, attachments, rubrics, graders, preview URLs, raw payloads, or unposted values';

do $$
declare
  v_user_a uuid := '00000000-0000-4000-8000-00000005e1a1';
  v_user_b uuid := '00000000-0000-4000-8000-00000005e1b2';
  v_connection_a uuid := '10000000-0000-4000-8000-00000005e1a1';
  v_connection_b uuid := '10000000-0000-4000-8000-00000005e1b2';
  v_course_a uuid := '20000000-0000-4000-8000-00000005e1a1';
  v_course_a2 uuid := '20000000-0000-4000-8000-00000005e1a2';
  v_course_b uuid := '20000000-0000-4000-8000-00000005e1b2';
  v_assignment_a uuid := '30000000-0000-4000-8000-00000005e1a1';
  v_assignment_a2 uuid := '30000000-0000-4000-8000-00000005e1a2';
  v_assignment_b uuid := '30000000-0000-4000-8000-00000005e1b2';
  v_now timestamptz := '2026-07-08T00:00:00Z';
  v_denied boolean;
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
      'phase5e1-a@example.invalid',
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
      'phase5e1-b@example.invalid',
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
    first_synced_at,
    last_synced_at
  )
  values
    (v_course_a, v_user_a, v_connection_a, 'course-a', 'Fictional Course A', v_now, v_now),
    (v_course_a2, v_user_a, v_connection_a, 'course-a2', 'Fictional Course A2', v_now, v_now),
    (v_course_b, v_user_b, v_connection_b, 'course-b', 'Fictional Course B', v_now, v_now);

  insert into public.canvas_assignments (
    id,
    user_id,
    canvas_connection_id,
    course_id,
    canvas_assignment_id,
    name,
    points_possible,
    submission_types,
    first_synced_at,
    last_synced_at
  )
  values
    (
      v_assignment_a,
      v_user_a,
      v_connection_a,
      v_course_a,
      'assignment-a',
      'Fictional Assignment A',
      10,
      array['online_upload'],
      v_now,
      v_now
    ),
    (
      v_assignment_a2,
      v_user_a,
      v_connection_a,
      v_course_a2,
      'assignment-a2',
      'Fictional Assignment A2',
      20,
      array['online_text_entry'],
      v_now,
      v_now
    ),
    (
      v_assignment_b,
      v_user_b,
      v_connection_b,
      v_course_b,
      'assignment-b',
      'Fictional Assignment B',
      15,
      array['online_upload'],
      v_now,
      v_now
    );

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
    source_fingerprint
  )
  values (
    v_user_a,
    v_connection_a,
    v_course_a,
    v_assignment_a,
    'graded',
    'graded',
    v_now - interval '2 days',
    v_now - interval '1 day',
    v_now - interval '1 day',
    1,
    'online_upload',
    true,
    false,
    false,
    false,
    true,
    'none',
    0,
    9,
    'A',
    'visible',
    'visible',
    10,
    v_now,
    v_now,
    v_now,
    'submission-fingerprint-a'
  );

  insert into public.canvas_course_grade_summaries (
    user_id,
    canvas_connection_id,
    course_id,
    current_score,
    current_score_visibility_state,
    current_grade,
    current_grade_visibility_state,
    final_score_visibility_state,
    final_grade_visibility_state,
    first_synced_at,
    last_synced_at,
    last_seen_at,
    source_fingerprint
  )
  values (
    v_user_a,
    v_connection_a,
    v_course_a,
    95.5,
    'visible',
    'A',
    'visible',
    'hidden',
    'hidden',
    v_now,
    v_now,
    v_now,
    'summary-fingerprint-a'
  );

  insert into public.canvas_course_grade_sync_states (
    user_id,
    canvas_connection_id,
    course_id,
    sync_status,
    last_checked_at,
    last_completed_at,
    last_successful_sync_at,
    last_completed_snapshot_authoritative,
    synced_assignment_count,
    synced_submission_count,
    synced_course_grade_summary_count,
    assignment_family_state,
    submission_family_state,
    course_grade_summary_family_state,
    source_fingerprint,
    fingerprint_version
  )
  values (
    v_user_a,
    v_connection_a,
    v_course_a,
    'succeeded',
    v_now,
    v_now,
    v_now,
    true,
    1,
    1,
    1,
    'succeeded',
    'succeeded',
    'succeeded',
    'grade-sync-fingerprint-a',
    'canvas-grade-sync-v1'
  );

  insert into _phase5e1_checks
  values (
    'valid_same_owner_rows_succeed',
    exists (
      select 1
      from public.canvas_assignment_submissions
      where user_id = v_user_a and assignment_id = v_assignment_a
    )
    and exists (
      select 1
      from public.canvas_course_grade_summaries
      where user_id = v_user_a and course_id = v_course_a
    )
    and exists (
      select 1
      from public.canvas_course_grade_sync_states
      where user_id = v_user_a and course_id = v_course_a
    ),
    'valid same-owner submission, summary, and sync-state rows inserted'
  );

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      normalized_status,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a2,
      v_assignment_a2,
      'invented_status',
      'bad-status-fingerprint'
    );
  exception
    when check_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'invalid_normalized_status_rejected',
    v_denied,
    'normalized assignment status check rejects unsupported values'
  );

  v_denied := false;
  begin
    insert into public.canvas_course_grade_summaries (
      user_id,
      canvas_connection_id,
      course_id,
      current_score_visibility_state,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a2,
      'opaque',
      'bad-visibility-fingerprint'
    );
  exception
    when check_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'invalid_visibility_state_rejected',
    v_denied,
    'grade and score visibility-state checks reject unsupported values'
  );

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      attempt,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a2,
      v_assignment_a2,
      -1,
      'bad-attempt-fingerprint'
    );
  exception
    when check_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values ('negative_attempt_rejected', v_denied, 'attempt must be non-negative');

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      seconds_late,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a2,
      v_assignment_a2,
      -1,
      'bad-seconds-late-fingerprint'
    );
  exception
    when check_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values ('negative_seconds_late_rejected', v_denied, 'seconds_late must be non-negative');

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      points_possible_at_sync,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a2,
      v_assignment_a2,
      -1,
      'bad-points-fingerprint'
    );
  exception
    when check_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values ('negative_points_possible_rejected', v_denied, 'points_possible_at_sync must be non-negative');

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      score,
      score_visibility_state,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a2,
      v_assignment_a2,
      5,
      'hidden',
      'hidden-score-fingerprint'
    );
  exception
    when check_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'hidden_score_value_rejected',
    v_denied,
    'hidden/unavailable score states cannot carry a stored score value'
  );

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a,
      v_assignment_a,
      'duplicate-submission-fingerprint'
    );
  exception
    when unique_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'duplicate_submission_rejected',
    v_denied,
    'one current submission-state row per owned assignment'
  );

  v_denied := false;
  begin
    insert into public.canvas_course_grade_summaries (
      user_id,
      canvas_connection_id,
      course_id,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a,
      'duplicate-summary-fingerprint'
    );
  exception
    when unique_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'duplicate_course_summary_rejected',
    v_denied,
    'one course-grade summary row per owned course'
  );

  v_denied := false;
  begin
    insert into public.canvas_course_grade_sync_states (
      user_id,
      canvas_connection_id,
      course_id
    )
    values (v_user_a, v_connection_a, v_course_a);
  exception
    when unique_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'duplicate_grade_sync_state_rejected',
    v_denied,
    'one grade sync-state row per owned course'
  );

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      source_fingerprint
    )
    values (
      v_user_b,
      v_connection_a,
      v_course_b,
      v_assignment_b,
      'cross-user-connection-fingerprint'
    );
  exception
    when foreign_key_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'cross_user_connection_rejected',
    v_denied,
    'connection owner composite FK rejects User B pointing at User A connection'
  );

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_b,
      v_assignment_b,
      'cross-user-course-fingerprint'
    );
  exception
    when foreign_key_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'cross_user_course_rejected',
    v_denied,
    'course owner composite FK rejects another user course'
  );

  v_denied := false;
  begin
    insert into public.canvas_assignment_submissions (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_id,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_a,
      v_assignment_a2,
      'cross-course-assignment-fingerprint'
    );
  exception
    when foreign_key_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'cross_course_assignment_rejected',
    v_denied,
    'assignment owner composite FK rejects assignment from another course'
  );

  v_denied := false;
  begin
    insert into public.canvas_course_grade_summaries (
      user_id,
      canvas_connection_id,
      course_id,
      source_fingerprint
    )
    values (
      v_user_a,
      v_connection_a,
      v_course_b,
      'cross-user-summary-fingerprint'
    );
  exception
    when foreign_key_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'cross_user_course_summary_rejected',
    v_denied,
    'course-grade summary cannot point to another user course'
  );

  v_denied := false;
  begin
    insert into public.canvas_course_grade_sync_states (
      user_id,
      canvas_connection_id,
      course_id
    )
    values (v_user_a, v_connection_a, v_course_b);
  exception
    when foreign_key_violation then
      v_denied := true;
  end;
  insert into _phase5e1_checks
  values (
    'cross_user_grade_sync_state_rejected',
    v_denied,
    'grade sync state cannot point to another user course'
  );

  v_denied := false;
  begin
    execute 'set local role authenticated';
    perform count(*) from public.canvas_assignment_submissions;
  exception
    when insufficient_privilege then
      v_denied := true;
  end;
  execute 'reset role';
  insert into _phase5e1_checks
  values (
    'direct_authenticated_read_denied',
    v_denied,
    'authenticated role cannot directly read service-only tables'
  );

  v_denied := false;
  begin
    execute 'set local role authenticated';
    insert into public.canvas_course_grade_sync_states (
      user_id,
      canvas_connection_id,
      course_id
    )
    values (v_user_a, v_connection_a, v_course_a2);
  exception
    when insufficient_privilege then
      v_denied := true;
  end;
  execute 'reset role';
  insert into _phase5e1_checks
  values (
    'direct_authenticated_mutation_denied',
    v_denied,
    'authenticated role cannot directly mutate service-only tables'
  );

  v_denied := false;
  begin
    execute 'set local role service_role';
    perform count(*) from public.canvas_assignment_submissions;
    perform count(*) from public.canvas_course_grade_summaries;
    perform count(*) from public.canvas_course_grade_sync_states;
    v_denied := false;
  exception
    when others then
      v_denied := true;
  end;
  execute 'reset role';
  insert into _phase5e1_checks
  values (
    'service_role_table_access_works',
    not v_denied,
    'service_role can read the new service-owned tables'
  );

  delete from public.canvas_assignments
  where id = v_assignment_a
    and user_id = v_user_a;
  insert into _phase5e1_checks
  values (
    'assignment_delete_cascades_submission',
    not exists (
      select 1
      from public.canvas_assignment_submissions
      where assignment_id = v_assignment_a
    ),
    'assignment deletion cascades its submission state row'
  );

  delete from public.canvas_courses
  where id = v_course_a
    and user_id = v_user_a;
  insert into _phase5e1_checks
  values (
    'course_delete_cascades_summary_and_sync_state',
    not exists (
      select 1
      from public.canvas_course_grade_summaries
      where course_id = v_course_a
    )
    and not exists (
      select 1
      from public.canvas_course_grade_sync_states
      where course_id = v_course_a
    ),
    'course deletion cascades grade summary and grade sync-state rows'
  );

  insert into public.canvas_assignment_submissions (
    user_id,
    canvas_connection_id,
    course_id,
    assignment_id,
    source_fingerprint
  )
  values (
    v_user_b,
    v_connection_b,
    v_course_b,
    v_assignment_b,
    'submission-fingerprint-b'
  );
  insert into public.canvas_course_grade_summaries (
    user_id,
    canvas_connection_id,
    course_id,
    source_fingerprint
  )
  values (
    v_user_b,
    v_connection_b,
    v_course_b,
    'summary-fingerprint-b'
  );
  insert into public.canvas_course_grade_sync_states (
    user_id,
    canvas_connection_id,
    course_id
  )
  values (v_user_b, v_connection_b, v_course_b);

  delete from public.canvas_connections
  where id = v_connection_b
    and user_id = v_user_b;
  insert into _phase5e1_checks
  values (
    'canvas_connection_delete_cascades_phase5e_rows',
    not exists (
      select 1
      from public.canvas_assignment_submissions
      where user_id = v_user_b
    )
    and not exists (
      select 1
      from public.canvas_course_grade_summaries
      where user_id = v_user_b
    )
    and not exists (
      select 1
      from public.canvas_course_grade_sync_states
      where user_id = v_user_b
    ),
    'Canvas connection deletion cascades all Phase 5E.1 rows'
  );

  insert into public.canvas_assignment_submissions (
    user_id,
    canvas_connection_id,
    course_id,
    assignment_id,
    source_fingerprint
  )
  values (
    v_user_a,
    v_connection_a,
    v_course_a2,
    v_assignment_a2,
    'submission-fingerprint-a2'
  );
  insert into public.canvas_course_grade_summaries (
    user_id,
    canvas_connection_id,
    course_id,
    source_fingerprint
  )
  values (
    v_user_a,
    v_connection_a,
    v_course_a2,
    'summary-fingerprint-a2'
  );
  insert into public.canvas_course_grade_sync_states (
    user_id,
    canvas_connection_id,
    course_id
  )
  values (v_user_a, v_connection_a, v_course_a2);

  delete from auth.users where id = v_user_a;
  insert into _phase5e1_checks
  values (
    'user_delete_cascades_remaining_phase5e_rows',
    not exists (
      select 1
      from public.canvas_assignment_submissions
      where user_id = v_user_a
    )
    and not exists (
      select 1
      from public.canvas_course_grade_summaries
      where user_id = v_user_a
    )
    and not exists (
      select 1
      from public.canvas_course_grade_sync_states
      where user_id = v_user_a
    ),
    'auth user deletion cascades remaining Phase 5E.1 rows'
  );
end $$;

select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  notes
from _phase5e1_checks
order by check_name;

do $$
begin
  if exists (select 1 from _phase5e1_checks where not passed) then
    raise exception 'Phase 5E.1 grades/submissions verification failed';
  end if;
end;
$$;

rollback;
