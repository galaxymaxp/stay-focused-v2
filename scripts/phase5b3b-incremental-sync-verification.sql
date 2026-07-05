begin;

do $$
declare
  v_user_a uuid := '00000000-0000-0000-0000-000000005c3a';
  v_user_b uuid := '00000000-0000-0000-0000-000000005c3b';
  v_conn_a uuid := '10000000-0000-0000-0000-000000005c3a';
  v_conn_b uuid := '10000000-0000-0000-0000-000000005c3b';
  v_run_a uuid;
  v_run_b uuid;
  v_course_a uuid;
  v_course_b uuid;
  v_first_synced_at timestamptz;
  v_last_synced_at timestamptz;
  v_last_successful_sync_at timestamptz;
  v_checked_at timestamptz;
  v_fingerprint text;
  v_name text;
  v_table text;
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
    updated_at
  )
  values
    (
      v_user_a,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'phase5b3b-a@example.invalid',
      'fake-verification-password',
      now(),
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      v_user_b,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'phase5b3b-b@example.invalid',
      'fake-verification-password',
      now(),
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
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
    last_verified_at
  )
  values
    (
      v_conn_a,
      v_user_a,
      'https://canvas-a.example.invalid',
      'canvas-user-a',
      'Phase 5B3B User A',
      'fake-ciphertext-a',
      'fake-iv-a',
      'fake-tag-a',
      'aes-256-gcm:v1',
      now()
    ),
    (
      v_conn_b,
      v_user_b,
      'https://canvas-b.example.invalid',
      'canvas-user-b',
      'Phase 5B3B User B',
      'fake-ciphertext-b',
      'fake-iv-b',
      'fake-tag-b',
      'aes-256-gcm:v1',
      now()
    );

  select id
  into v_run_a
  from public.begin_canvas_sync_run_with_mode(
    v_user_a,
    v_conn_a,
    'full',
    '2026-07-06T00:00:00Z'
  );

  select id
  into v_run_b
  from public.begin_canvas_sync_run_with_mode(
    v_user_b,
    v_conn_b,
    'incremental',
    '2026-07-06T00:00:00Z'
  );

  if not exists (
    select 1
    from public.canvas_sync_runs
    where id = v_run_b
      and sync_mode = 'incremental'
  ) then
    raise exception 'incremental sync mode was not recorded';
  end if;

  perform public.replace_canvas_course_academic_snapshot_with_sync_state(
    v_user_a,
    v_conn_a,
    v_run_a,
    '2026-07-06T00:01:00Z',
    '{
      "canvas_course_id":"course-101",
      "name":"Fictional Verification Course",
      "course_code":"FIC101"
    }'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'fictional-snapshot-fingerprint-a1',
    'canvas-course-snapshot-v1'
  );

  perform public.replace_canvas_course_academic_snapshot_with_sync_state(
    v_user_b,
    v_conn_b,
    v_run_b,
    '2026-07-06T00:01:00Z',
    '{
      "canvas_course_id":"course-101",
      "name":"Other Fictional Verification Course",
      "course_code":"FIC101-B"
    }'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'fictional-snapshot-fingerprint-b1',
    'canvas-course-snapshot-v1'
  );

  select id, first_synced_at, last_synced_at
  into v_course_a, v_first_synced_at, v_last_synced_at
  from public.canvas_courses
  where user_id = v_user_a
    and canvas_connection_id = v_conn_a
    and canvas_course_id = 'course-101';

  select id
  into v_course_b
  from public.canvas_courses
  where user_id = v_user_b
    and canvas_connection_id = v_conn_b
    and canvas_course_id = 'course-101';

  if (
    select count(*)
    from public.canvas_course_sync_states
    where canvas_course_id = 'course-101'
  ) <> 2 then
    raise exception 'same Canvas course ID was not isolated per user/connection';
  end if;

  if not exists (
    select 1
    from public.canvas_course_sync_states
    where user_id = v_user_a
      and canvas_connection_id = v_conn_a
      and canvas_course_id = 'course-101'
      and course_id = v_course_a
      and snapshot_fingerprint = 'fictional-snapshot-fingerprint-a1'
      and fingerprint_version = 'canvas-course-snapshot-v1'
      and consecutive_failure_count = 0
      and last_failure_code is null
  ) then
    raise exception 'full persistence did not create synchronization state';
  end if;

  begin
    insert into public.canvas_course_sync_states (
      user_id,
      canvas_connection_id,
      canvas_course_id,
      course_id
    )
    values (v_user_b, v_conn_b, 'course-cross-user', v_course_a);
    raise exception 'cross-user course reference was accepted';
  exception
    when foreign_key_violation then
      null;
  end;

  begin
    insert into public.canvas_course_sync_states (
      user_id,
      canvas_connection_id,
      canvas_course_id,
      course_id
    )
    values (v_user_a, v_conn_a, 'course-cross-connection', v_course_b);
    raise exception 'cross-connection course reference was accepted';
  exception
    when foreign_key_violation then
      null;
  end;

  perform public.replace_canvas_course_academic_snapshot_with_sync_state(
    v_user_a,
    v_conn_a,
    v_run_a,
    '2026-07-06T00:02:00Z',
    '{
      "canvas_course_id":"course-101",
      "name":"Fictional Verification Course Changed",
      "course_code":"FIC101"
    }'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'fictional-snapshot-fingerprint-a2',
    'canvas-course-snapshot-v1'
  );

  select first_synced_at, last_synced_at
  into v_first_synced_at, v_last_synced_at
  from public.canvas_courses
  where id = v_course_a;

  if not exists (
    select 1
    from public.canvas_course_sync_states
    where user_id = v_user_a
      and canvas_connection_id = v_conn_a
      and canvas_course_id = 'course-101'
      and snapshot_fingerprint = 'fictional-snapshot-fingerprint-a2'
      and last_changed_at = '2026-07-06T00:02:00Z'
      and last_successful_sync_at = '2026-07-06T00:02:00Z'
  ) then
    raise exception 'changed incremental persistence did not update state';
  end if;

  select snapshot_fingerprint, last_successful_sync_at
  into v_fingerprint, v_last_successful_sync_at
  from public.canvas_course_sync_states
  where user_id = v_user_a
    and canvas_connection_id = v_conn_a
    and canvas_course_id = 'course-101';

  perform public.record_canvas_course_snapshot_unchanged(
    v_user_a,
    v_conn_a,
    v_run_a,
    'course-101',
    '2026-07-06T00:03:00Z',
    v_fingerprint,
    'canvas-course-snapshot-v1'
  );

  if not exists (
    select 1
    from public.canvas_courses
    where id = v_course_a
      and first_synced_at = v_first_synced_at
      and last_synced_at = v_last_synced_at
  ) then
    raise exception 'unchanged recording modified academic graph timestamps';
  end if;

  select last_checked_at
  into v_checked_at
  from public.canvas_course_sync_states
  where user_id = v_user_a
    and canvas_connection_id = v_conn_a
    and canvas_course_id = 'course-101';

  if v_checked_at <> '2026-07-06T00:03:00Z' then
    raise exception 'unchanged recording did not advance last_checked_at';
  end if;

  perform public.record_canvas_course_snapshot_failed(
    v_user_a,
    v_conn_a,
    v_run_a,
    'course-101',
    '2026-07-06T00:04:00Z',
    'canvas_course_pages_failed'
  );

  if not exists (
    select 1
    from public.canvas_course_sync_states
    where user_id = v_user_a
      and canvas_connection_id = v_conn_a
      and canvas_course_id = 'course-101'
      and snapshot_fingerprint = v_fingerprint
      and last_successful_sync_at = v_last_successful_sync_at
      and consecutive_failure_count = 1
      and last_failure_code = 'canvas_course_pages_failed'
  ) then
    raise exception 'failed recording advanced successful fingerprint metadata';
  end if;

  begin
    perform public.replace_canvas_course_academic_snapshot_with_sync_state(
      v_user_a,
      v_conn_a,
      v_run_a,
      '2026-07-06T00:05:00Z',
      '{"canvas_course_id":"course-rollback","name":"Rollback Course"}'::jsonb,
      '[]'::jsonb,
      '[{
        "canvas_module_id":"missing-module",
        "canvas_module_item_id":"item-bad",
        "title":"Bad Item",
        "item_type":"Page"
      }]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      'fictional-snapshot-fingerprint-rollback',
      'canvas-course-snapshot-v1'
    );
    raise exception 'invalid snapshot relationship was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'missing_snapshot_module' then
        raise;
      end if;
  end;

  if exists (
    select 1
    from public.canvas_courses
    where user_id = v_user_a
      and canvas_connection_id = v_conn_a
      and canvas_course_id = 'course-rollback'
  ) or exists (
    select 1
    from public.canvas_course_sync_states
    where user_id = v_user_a
      and canvas_connection_id = v_conn_a
      and canvas_course_id = 'course-rollback'
  ) then
    raise exception 'failed persistence left graph or state rows behind';
  end if;

  perform public.record_canvas_sync_course_result(
    v_user_a,
    v_conn_a,
    v_run_a,
    'fictional-course-result-fingerprint-unchanged',
    'unchanged',
    null,
    null,
    null,
    null,
    null,
    0,
    10
  );

  if not exists (
    select 1
    from public.canvas_sync_course_results
    where sync_run_id = v_run_a
      and status = 'unchanged'
  ) then
    raise exception 'unchanged course-result status was not accepted';
  end if;

  perform public.finish_canvas_sync_run(
    v_user_a,
    v_conn_a,
    v_run_a,
    'partial',
    1,
    1,
    1,
    '{"modules":0,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0}'::jsonb,
    'canvas_course_pages_failed',
    'One or more courses could not be synchronized.',
    '2026-07-06T00:06:00Z'
  );

  perform public.finish_canvas_sync_run(
    v_user_b,
    v_conn_b,
    v_run_b,
    'succeeded',
    1,
    1,
    0,
    '{"modules":0,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0}'::jsonb,
    null,
    null,
    '2026-07-06T00:06:00Z'
  );

  foreach v_table in array array[
    'canvas_connections',
    'canvas_capabilities',
    'canvas_courses',
    'canvas_modules',
    'canvas_module_items',
    'canvas_pages',
    'canvas_assignment_groups',
    'canvas_assignments',
    'canvas_sync_runs',
    'canvas_sync_course_results',
    'canvas_course_sync_states'
  ]
  loop
    if not exists (
      select 1
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = v_table
        and relation.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on %', v_table;
    end if;

    if exists (
      select 1
      from information_schema.table_privileges privilege
      where privilege.table_schema = 'public'
        and privilege.table_name = v_table
        and privilege.grantee in ('anon', 'authenticated')
        and privilege.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    ) then
      raise exception 'direct client grant exists on %', v_table;
    end if;
  end loop;

  foreach v_name in array array[
    'canvas_sync_runs_mode_allowed',
    'canvas_sync_course_results_status_allowed',
    'canvas_course_sync_states_connection_user_fkey',
    'canvas_course_sync_states_course_owner_fkey',
    'canvas_course_sync_states_identity_unique',
    'canvas_courses_id_user_connection_canvas_identity_unique',
    'canvas_courses_connection_user_fkey',
    'canvas_modules_course_owner_fkey',
    'canvas_module_items_module_owner_fkey',
    'canvas_pages_course_owner_fkey',
    'canvas_assignment_groups_course_owner_fkey',
    'canvas_assignments_course_owner_fkey'
  ]
  loop
    if not exists (
      select 1
      from pg_constraint
      where conname = v_name
    ) then
      raise exception 'expected constraint missing: %', v_name;
    end if;
  end loop;

  foreach v_name in array array[
    'begin_canvas_sync_run_with_mode(uuid,uuid,text,timestamp with time zone)',
    'replace_canvas_course_academic_snapshot_with_sync_state(uuid,uuid,uuid,timestamp with time zone,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text,text)',
    'record_canvas_course_snapshot_unchanged(uuid,uuid,uuid,text,timestamp with time zone,text,text)',
    'record_canvas_course_snapshot_failed(uuid,uuid,uuid,text,timestamp with time zone,text)',
    'record_canvas_sync_course_result(uuid,uuid,uuid,text,text,text,text,text,text,boolean,integer,integer)',
    'begin_canvas_sync_run(uuid,uuid,timestamp with time zone)',
    'update_canvas_sync_run_progress(uuid,uuid,uuid,integer,integer,integer,jsonb,timestamp with time zone)',
    'finish_canvas_sync_run(uuid,uuid,uuid,text,integer,integer,integer,jsonb,text,text,timestamp with time zone)',
    'replace_canvas_course_academic_snapshot(uuid,uuid,uuid,timestamp with time zone,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)'
  ]
  loop
    if has_function_privilege('public', ('public.' || v_name)::regprocedure, 'execute')
      or has_function_privilege('anon', ('public.' || v_name)::regprocedure, 'execute')
      or has_function_privilege('authenticated', ('public.' || v_name)::regprocedure, 'execute') then
      raise exception 'public RPC execution was not revoked for %', v_name;
    end if;

    if not has_function_privilege(
      'service_role',
      ('public.' || v_name)::regprocedure,
      'execute'
    ) then
      raise exception 'service_role cannot execute %', v_name;
    end if;
  end loop;
end;
$$;

rollback;

select 'phase5b3b_incremental_sync_verification_passed' as result;
