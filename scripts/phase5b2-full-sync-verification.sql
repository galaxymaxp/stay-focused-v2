begin;

do $$
declare
  v_user_a uuid := '00000000-0000-0000-0000-000000005b2a';
  v_user_b uuid := '00000000-0000-0000-0000-000000005b2b';
  v_conn_a uuid := '10000000-0000-0000-0000-000000005b2a';
  v_conn_b uuid := '10000000-0000-0000-0000-000000005b2b';
  v_run_a uuid;
  v_run_b uuid;
  v_rpc_connection_id uuid;
  v_stable_course_id uuid;
  v_stable_module_id uuid;
  v_stable_item_id uuid;
  v_stable_page_id uuid;
  v_stable_group_id uuid;
  v_stable_assignment_id uuid;
  v_first_synced_at timestamptz;
  v_last_synced_at timestamptz;
  v_count_before integer;
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
      'phase5b2-a@example.invalid',
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
      'phase5b2-b@example.invalid',
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
      'Phase 5B2 User A',
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
      'Phase 5B2 User B',
      'fake-ciphertext-b',
      'fake-iv-b',
      'fake-tag-b',
      'aes-256-gcm:v1',
      now()
    );

  select rpc_result.id into v_rpc_connection_id
  from public.replace_canvas_connection_with_capabilities(
    v_user_a,
    'https://canvas-a.example.invalid',
    'canvas-user-a',
    'Phase 5B2 User A',
    null,
    'fake-ciphertext-a-updated',
    'fake-iv-a-updated',
    'fake-tag-a-updated',
    'aes-256-gcm:v1',
    now(),
    '[{
      "capability":"profile",
      "status":"available",
      "tested_at":"2026-07-05T00:00:00Z",
      "safe_error_code":null,
      "course_id":null,
      "integration_version":"phase5a"
    }]'::jsonb
  ) as rpc_result;

  if v_rpc_connection_id <> v_conn_a then
    raise exception 'connection replacement RPC did not preserve the connection id';
  end if;

  select id into v_run_a
  from public.begin_canvas_sync_run(v_user_a, v_conn_a, '2026-07-05T01:00:00Z');

  begin
    perform public.begin_canvas_sync_run(
      v_user_a,
      v_conn_a,
      '2026-07-05T01:01:00Z'
    );
    raise exception 'active synchronization overlap was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'canvas_sync_in_progress' then
        raise;
      end if;
  end;

  insert into public.canvas_sync_runs (
    user_id,
    canvas_connection_id,
    sync_mode,
    status,
    started_at,
    heartbeat_at
  )
  values (
    v_user_b,
    v_conn_b,
    'full',
    'running',
    '2026-07-05T01:00:00Z',
    '2026-07-05T01:00:00Z'
  );

  select id into v_run_b
  from public.begin_canvas_sync_run(v_user_b, v_conn_b, '2026-07-05T01:31:01Z');

  if (
    select count(*)
    from public.canvas_sync_runs
    where canvas_connection_id = v_conn_b
      and status = 'running'
  ) <> 1 then
    raise exception 'stale run recovery did not leave one active run';
  end if;

  perform public.replace_canvas_course_academic_snapshot(
    v_user_a,
    v_conn_a,
    v_run_a,
    '2026-07-05T02:00:00Z',
    '{
      "canvas_course_id":"course-101",
      "name":"Fictional Verification Course",
      "course_code":"FIC101",
      "workflow_state":"available",
      "enrollment_term_id":null,
      "account_id":"account-1",
      "start_at":null,
      "end_at":null,
      "time_zone":"Asia/Manila",
      "public_syllabus":false,
      "syllabus_body":"<p>Fictional syllabus.</p>",
      "canvas_updated_at":"2026-07-04T00:00:00Z"
    }'::jsonb,
    '[
      {
        "canvas_module_id":"module-201",
        "name":"Fictional Module",
        "position":1,
        "unlock_at":null,
        "item_count":1,
        "require_sequential_progress":false,
        "published":true,
        "prerequisite_module_ids":[],
        "canvas_state":"active"
      }
    ]'::jsonb,
    '[
      {
        "canvas_module_id":"module-201",
        "canvas_module_item_id":"item-301",
        "title":"Fictional Module Item",
        "position":1,
        "indent":0,
        "item_type":"Page",
        "canvas_content_id":"401",
        "page_url":"fictional-page",
        "external_url":null,
        "html_url":"https://canvas.example.invalid/courses/101/modules/items/301",
        "new_tab":false,
        "published":true,
        "completion_requirement":{"type":"must_view"},
        "content_details":{"points_possible":0}
      }
    ]'::jsonb,
    '[
      {
        "canvas_page_id":"401",
        "canvas_page_url":"fictional-page",
        "title":"Fictional Page",
        "body_html":"<p>Fictional Page body.</p>",
        "published":true,
        "front_page":false,
        "editing_roles":"teachers",
        "lock_info":{"locked":false},
        "unlock_at":null,
        "lock_at":null,
        "canvas_created_at":"2026-07-01T00:00:00Z",
        "canvas_updated_at":"2026-07-04T00:00:00Z"
      }
    ]'::jsonb,
    '[
      {
        "canvas_assignment_group_id":"group-501",
        "name":"Fictional Group",
        "position":1,
        "group_weight":25,
        "rules":{"drop_lowest":0},
        "integration_data":{"source":"verification"}
      }
    ]'::jsonb,
    '[
      {
        "canvas_assignment_id":"assignment-601",
        "canvas_assignment_group_id":"group-501",
        "name":"Fictional Assignment",
        "description_html":"<p>Fictional assignment body.</p>",
        "position":1,
        "points_possible":10,
        "grading_type":"points",
        "submission_types":["online_upload","online_quiz"],
        "due_at":null,
        "unlock_at":null,
        "lock_at":null,
        "published":true,
        "muted":false,
        "omit_from_final_grade":false,
        "anonymous_grading":false,
        "html_url":"https://canvas.example.invalid/courses/101/assignments/601",
        "quiz_id":"701",
        "discussion_topic_id":null,
        "canvas_created_at":"2026-07-01T00:00:00Z",
        "canvas_updated_at":"2026-07-04T00:00:00Z"
      }
    ]'::jsonb
  );

  select id, first_synced_at, last_synced_at
  into v_stable_course_id, v_first_synced_at, v_last_synced_at
  from public.canvas_courses
  where user_id = v_user_a
    and canvas_connection_id = v_conn_a
    and canvas_course_id = 'course-101';

  select id into v_stable_module_id
  from public.canvas_modules
  where course_id = v_stable_course_id
    and canvas_module_id = 'module-201';

  select id into v_stable_item_id
  from public.canvas_module_items
  where course_id = v_stable_course_id
    and canvas_module_item_id = 'item-301';

  select id into v_stable_page_id
  from public.canvas_pages
  where course_id = v_stable_course_id
    and canvas_page_url = 'fictional-page';

  select id into v_stable_group_id
  from public.canvas_assignment_groups
  where course_id = v_stable_course_id
    and canvas_assignment_group_id = 'group-501';

  select id into v_stable_assignment_id
  from public.canvas_assignments
  where course_id = v_stable_course_id
    and canvas_assignment_id = 'assignment-601';

  perform public.replace_canvas_course_academic_snapshot(
    v_user_a,
    v_conn_a,
    v_run_a,
    '2026-07-05T02:05:00Z',
    '{
      "canvas_course_id":"course-101",
      "name":"Fictional Verification Course Updated"
    }'::jsonb,
    '[
      {
        "canvas_module_id":"module-201",
        "name":"Fictional Module Updated",
        "position":1,
        "prerequisite_module_ids":[]
      }
    ]'::jsonb,
    '[
      {
        "canvas_module_id":"module-201",
        "canvas_module_item_id":"item-301",
        "title":"Fictional Module Item Updated",
        "item_type":"Page"
      }
    ]'::jsonb,
    '[
      {
        "canvas_page_id":"401",
        "canvas_page_url":"fictional-page",
        "title":"Fictional Page Updated",
        "body_html":"<p>Fictional Page body updated.</p>"
      }
    ]'::jsonb,
    '[
      {
        "canvas_assignment_group_id":"group-501",
        "name":"Fictional Group Updated"
      }
    ]'::jsonb,
    '[
      {
        "canvas_assignment_id":"assignment-601",
        "canvas_assignment_group_id":"group-501",
        "name":"Fictional Assignment Updated",
        "submission_types":["online_quiz"]
      }
    ]'::jsonb
  );

  if exists (
    select 1
    from public.canvas_courses
    where id = v_stable_course_id
      and first_synced_at <> v_first_synced_at
  ) then
    raise exception 'course first_synced_at changed during upsert';
  end if;

  if not exists (
    select 1
    from public.canvas_courses
    where id = v_stable_course_id
      and last_synced_at > v_last_synced_at
  ) then
    raise exception 'course last_synced_at did not advance';
  end if;

  if not exists (select 1 from public.canvas_modules where id = v_stable_module_id)
    or not exists (select 1 from public.canvas_module_items where id = v_stable_item_id)
    or not exists (select 1 from public.canvas_pages where id = v_stable_page_id)
    or not exists (
      select 1 from public.canvas_assignment_groups where id = v_stable_group_id
    )
    or not exists (
      select 1 from public.canvas_assignments where id = v_stable_assignment_id
    ) then
    raise exception 'stable internal IDs were not preserved';
  end if;

  if (
    select count(*)
    from public.canvas_modules
    where course_id = v_stable_course_id
  ) <> 1 then
    raise exception 'duplicate module rows were created';
  end if;

  select count(*) into v_count_before
  from public.canvas_module_items
  where course_id = v_stable_course_id;

  begin
    perform public.replace_canvas_course_academic_snapshot(
      v_user_a,
      v_conn_a,
      v_run_a,
      '2026-07-05T02:10:00Z',
      '{"canvas_course_id":"course-101","name":"Fictional Verification Course"}'::jsonb,
      '[]'::jsonb,
      '[{
        "canvas_module_id":"missing-module",
        "canvas_module_item_id":"item-bad",
        "title":"Malformed Item",
        "item_type":"Page"
      }]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb
    );
    raise exception 'malformed module relationship was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'missing_snapshot_module' then
        raise;
      end if;
  end;

  if (
    select count(*)
    from public.canvas_module_items
    where course_id = v_stable_course_id
  ) <> v_count_before then
    raise exception 'failed module relationship pruned existing data';
  end if;

  begin
    perform public.replace_canvas_course_academic_snapshot(
      v_user_a,
      v_conn_a,
      v_run_a,
      '2026-07-05T02:15:00Z',
      '{"canvas_course_id":"course-101","name":"Fictional Verification Course"}'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[{
        "canvas_assignment_id":"assignment-bad",
        "canvas_assignment_group_id":"missing-group",
        "name":"Malformed Assignment"
      }]'::jsonb
    );
    raise exception 'malformed assignment-group relationship was accepted';
  exception
    when raise_exception then
      if sqlerrm <> 'missing_snapshot_assignment_group' then
        raise;
      end if;
  end;

  if not exists (
    select 1
    from public.canvas_assignments
    where id = v_stable_assignment_id
  ) then
    raise exception 'failed assignment relationship pruned existing data';
  end if;

  begin
    perform public.replace_canvas_course_academic_snapshot(
      v_user_b,
      v_conn_a,
      v_run_a,
      '2026-07-05T02:20:00Z',
      '{"canvas_course_id":"course-101","name":"Cross User Course"}'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb
    );
    raise exception 'User B was allowed to mutate User A graph';
  exception
    when raise_exception then
      if sqlerrm <> 'canvas_connection_missing' then
        raise;
      end if;
  end;

  perform public.replace_canvas_course_academic_snapshot(
    v_user_a,
    v_conn_a,
    v_run_a,
    '2026-07-05T02:25:00Z',
    '{"canvas_course_id":"course-202","name":"Other Fictional Course"}'::jsonb,
    '[{"canvas_module_id":"module-other","name":"Other Module"}]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  perform public.replace_canvas_course_academic_snapshot(
    v_user_a,
    v_conn_a,
    v_run_a,
    '2026-07-05T02:30:00Z',
    '{"canvas_course_id":"course-101","name":"Fictional Verification Course"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  if exists (
    select 1
    from public.canvas_modules
    where course_id = v_stable_course_id
  ) then
    raise exception 'empty valid snapshot did not remove stale modules';
  end if;

  if not exists (
    select 1
    from public.canvas_modules module
    join public.canvas_courses course
      on course.id = module.course_id
    where course.canvas_course_id = 'course-202'
      and course.user_id = v_user_a
  ) then
    raise exception 'stale cleanup affected another course';
  end if;

  if exists (
    select 1
    from public.canvas_courses
    where user_id = v_user_b
      and canvas_connection_id = v_conn_a
  ) then
    raise exception 'cross-user graph mutation occurred';
  end if;

  perform public.update_canvas_sync_run_progress(
    v_user_a,
    v_conn_a,
    v_run_a,
    2,
    2,
    0,
    '{"modules":1,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0}'::jsonb,
    '2026-07-05T02:31:00Z'
  );

  perform public.finish_canvas_sync_run(
    v_user_a,
    v_conn_a,
    v_run_a,
    'succeeded',
    2,
    2,
    0,
    '{"modules":1,"moduleItems":0,"pages":0,"assignmentGroups":0,"assignments":0}'::jsonb,
    null,
    null,
    '2026-07-05T02:32:00Z'
  );

  if exists (
    select 1
    from public.canvas_sync_runs
    where id = v_run_a
      and status = 'running'
  ) then
    raise exception 'finished run remained running';
  end if;

  foreach v_table in array array[
    'canvas_connections',
    'canvas_capabilities',
    'canvas_courses',
    'canvas_modules',
    'canvas_module_items',
    'canvas_pages',
    'canvas_assignment_groups',
    'canvas_assignments',
    'canvas_sync_runs'
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
    'canvas_sync_runs_connection_user_fkey',
    'canvas_sync_runs_one_running_per_connection_idx',
    'canvas_sync_runs_user_started_idx',
    'canvas_sync_runs_connection_started_idx',
    'canvas_courses_connection_user_fkey',
    'canvas_modules_course_owner_fkey',
    'canvas_module_items_module_owner_fkey',
    'canvas_pages_course_owner_fkey',
    'canvas_assignment_groups_course_owner_fkey',
    'canvas_assignments_course_owner_fkey',
    'canvas_assignments_assignment_group_owner_fkey'
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
    'replace_canvas_connection_with_capabilities(uuid,text,text,text,text,text,text,text,text,timestamp with time zone,jsonb)',
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

select 'phase5b2_full_sync_verification_passed' as result;
