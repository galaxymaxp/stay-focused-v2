begin;

do $$
declare
  v_user_a uuid := '00000000-0000-0000-0000-000000005b3a';
  v_user_b uuid := '00000000-0000-0000-0000-000000005b3b';
  v_conn_a uuid := '10000000-0000-0000-0000-000000005b3a';
  v_conn_b uuid := '10000000-0000-0000-0000-000000005b3b';
  v_run_a uuid;
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
      'phase5b3a-a@example.invalid',
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
      'phase5b3a-b@example.invalid',
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
      'Phase 5B3A User A',
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
      'Phase 5B3A User B',
      'fake-ciphertext-b',
      'fake-iv-b',
      'fake-tag-b',
      'aes-256-gcm:v1',
      now()
    );

  select id
  into v_run_a
  from public.begin_canvas_sync_run(v_user_a, v_conn_a, now());

  perform public.record_canvas_sync_course_result(
    v_user_a,
    v_conn_a,
    v_run_a,
    'fictional-course-fingerprint-1',
    'succeeded',
    null,
    null,
    null,
    null,
    null,
    2,
    1500
  );

  perform public.record_canvas_sync_course_result(
    v_user_a,
    v_conn_a,
    v_run_a,
    'fictional-course-fingerprint-2',
    'failed',
    'canvas_course_page_detail_failed',
    'page_detail',
    'server_error',
    '5xx',
    true,
    2,
    2200
  );

  perform public.record_canvas_sync_course_result(
    v_user_a,
    v_conn_a,
    v_run_a,
    'fictional-course-fingerprint-2',
    'failed',
    'canvas_course_assignments_failed',
    'assignments',
    'timeout',
    'none',
    true,
    1,
    2100
  );

  if (
    select count(*)
    from public.canvas_sync_course_results
    where sync_run_id = v_run_a
  ) <> 2 then
    raise exception 'course-result upsert did not prevent duplicates';
  end if;

  if not exists (
    select 1
    from public.canvas_sync_course_results
    where sync_run_id = v_run_a
      and course_fingerprint = 'fictional-course-fingerprint-2'
      and failure_code = 'canvas_course_assignments_failed'
      and failed_operation = 'assignments'
      and retry_count = 1
  ) then
    raise exception 'course-result upsert did not update sanitized diagnostics';
  end if;

  begin
    perform public.record_canvas_sync_course_result(
      v_user_b,
      v_conn_b,
      v_run_a,
      'fictional-cross-user-fingerprint',
      'failed',
      'canvas_course_pages_failed',
      'pages',
      'permission_denied',
      '4xx',
      false,
      0,
      10
    );
    raise exception 'cross-user course-result write was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'canvas_sync_run_missing' then
        raise;
      end if;
  end;

  begin
    perform public.record_canvas_sync_course_result(
      v_user_a,
      v_conn_a,
      v_run_a,
      'fictional-invalid-code-fingerprint',
      'failed',
      'raw_canvas_error',
      'pages',
      'server_error',
      '5xx',
      true,
      0,
      10
    );
    raise exception 'invalid failure code was accepted';
  exception
    when check_violation then
      null;
  end;

  begin
    perform public.record_canvas_sync_course_result(
      v_user_a,
      v_conn_a,
      v_run_a,
      'fictional-invalid-success-fingerprint',
      'succeeded',
      'canvas_course_pages_failed',
      'pages',
      'server_error',
      '5xx',
      true,
      0,
      10
    );
    raise exception 'successful course result with failure fields was accepted';
  exception
    when check_violation then
      null;
  end;

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
    'canvas_sync_course_results'
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
    'canvas_sync_course_results_connection_user_fkey',
    'canvas_sync_course_results_run_fingerprint_key',
    'canvas_sync_course_results_run_idx',
    'canvas_sync_course_results_user_run_idx',
    'canvas_sync_course_results_connection_run_idx',
    'canvas_sync_course_results_status_code_idx',
    'canvas_sync_runs_one_running_per_connection_idx',
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
    ) and not exists (
      select 1
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = v_name
    ) then
      raise exception 'expected constraint or index missing: %', v_name;
    end if;
  end loop;

  foreach v_name in array array[
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

select 'phase5b3a_recovery_verification_passed' as result;
