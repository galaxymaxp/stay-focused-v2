begin;

do $$
declare
  v_user_a uuid := '00000000-0000-0000-0000-000000005b1a';
  v_user_b uuid := '00000000-0000-0000-0000-000000005b1b';
  v_conn_a uuid := '10000000-0000-0000-0000-000000005b1a';
  v_conn_b uuid := '10000000-0000-0000-0000-000000005b1b';
  v_course_a uuid := '20000000-0000-0000-0000-000000005b1a';
  v_course_b uuid := '20000000-0000-0000-0000-000000005b1b';
  v_module_a uuid := '30000000-0000-0000-0000-000000005b1a';
  v_module_b uuid := '30000000-0000-0000-0000-000000005b1b';
  v_assignment_group_a uuid := '50000000-0000-0000-0000-000000005b1a';
  v_assignment_group_b uuid := '50000000-0000-0000-0000-000000005b1b';
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
      'phase5b1-a@example.invalid',
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
      'phase5b1-b@example.invalid',
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
      'Phase 5B User A',
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
      'Phase 5B User B',
      'fake-ciphertext-b',
      'fake-iv-b',
      'fake-tag-b',
      'aes-256-gcm:v1',
      now()
    );

  insert into public.canvas_courses (
    id,
    user_id,
    canvas_connection_id,
    canvas_course_id,
    name
  )
  values
    (v_course_a, v_user_a, v_conn_a, '101', 'Fictional Course A'),
    (v_course_b, v_user_b, v_conn_b, '101', 'Fictional Course B');

  begin
    insert into public.canvas_courses (
      user_id,
      canvas_connection_id,
      canvas_course_id,
      name
    )
    values (v_user_a, v_conn_a, '101', 'Duplicate Fictional Course');
    raise exception 'duplicate Canvas course identity was accepted';
  exception
    when unique_violation then
      null;
  end;

  select count(*) into v_count_before from public.canvas_modules;
  begin
    insert into public.canvas_modules (
      user_id,
      canvas_connection_id,
      course_id,
      canvas_module_id,
      name
    )
    values (
      v_user_b,
      v_conn_b,
      v_course_a,
      '201',
      'Cross-user Module'
    );
    raise exception 'cross-user module relationship was accepted';
  exception
    when foreign_key_violation then
      null;
  end;
  if (select count(*) from public.canvas_modules) <> v_count_before then
    raise exception 'failed module write left partial data';
  end if;

  insert into public.canvas_modules (
    id,
    user_id,
    canvas_connection_id,
    course_id,
    canvas_module_id,
    name
  )
  values
    (v_module_a, v_user_a, v_conn_a, v_course_a, '201', 'Fictional Module A'),
    (v_module_b, v_user_b, v_conn_b, v_course_b, '201', 'Fictional Module B');

  begin
    insert into public.canvas_modules (
      user_id,
      canvas_connection_id,
      course_id,
      canvas_module_id,
      name
    )
    values (v_user_a, v_conn_a, v_course_a, '201', 'Duplicate Module');
    raise exception 'duplicate Canvas module identity was accepted';
  exception
    when unique_violation then
      null;
  end;

  begin
    insert into public.canvas_module_items (
      user_id,
      canvas_connection_id,
      course_id,
      module_id,
      canvas_module_item_id,
      title,
      item_type
    )
    values (
      v_user_b,
      v_conn_b,
      v_course_b,
      v_module_a,
      '301',
      'Cross-course Item',
      'Page'
    );
    raise exception 'module item crossing module/course ownership was accepted';
  exception
    when foreign_key_violation then
      null;
  end;

  insert into public.canvas_module_items (
    user_id,
    canvas_connection_id,
    course_id,
    module_id,
    canvas_module_item_id,
    title,
    item_type,
    page_url,
    completion_requirement,
    content_details
  )
  values (
    v_user_a,
    v_conn_a,
    v_course_a,
    v_module_a,
    '301',
    'Fictional Module Item',
    'Page',
    'fictional-page',
    '{"type":"must_view"}'::jsonb,
    '{"points_possible":10}'::jsonb
  );

  insert into public.canvas_pages (
    user_id,
    canvas_connection_id,
    course_id,
    canvas_page_id,
    canvas_page_url,
    title
  )
  values (
    v_user_a,
    v_conn_a,
    v_course_a,
    '401',
    'fictional-page',
    'Fictional Page'
  );

  begin
    insert into public.canvas_pages (
      user_id,
      canvas_connection_id,
      course_id,
      canvas_page_url,
      title
    )
    values (v_user_a, v_conn_a, v_course_a, 'fictional-page', 'Duplicate Page');
    raise exception 'duplicate Canvas Page URL was accepted';
  exception
    when unique_violation then
      null;
  end;

  insert into public.canvas_assignment_groups (
    id,
    user_id,
    canvas_connection_id,
    course_id,
    canvas_assignment_group_id,
    name
  )
  values
    (
      v_assignment_group_a,
      v_user_a,
      v_conn_a,
      v_course_a,
      '501',
      'Fictional Group A'
    ),
    (
      v_assignment_group_b,
      v_user_b,
      v_conn_b,
      v_course_b,
      '501',
      'Fictional Group B'
    );

  begin
    insert into public.canvas_assignments (
      user_id,
      canvas_connection_id,
      course_id,
      assignment_group_id,
      canvas_assignment_id,
      canvas_assignment_group_id,
      name
    )
    values (
      v_user_b,
      v_conn_b,
      v_course_b,
      v_assignment_group_a,
      '601',
      '501',
      'Cross-course Assignment'
    );
    raise exception 'assignment group reference crossing course/user was accepted';
  exception
    when foreign_key_violation then
      null;
  end;

  insert into public.canvas_assignments (
    user_id,
    canvas_connection_id,
    course_id,
    assignment_group_id,
    canvas_assignment_id,
    canvas_assignment_group_id,
    name,
    submission_types,
    due_at
  )
  values (
    v_user_a,
    v_conn_a,
    v_course_a,
    v_assignment_group_a,
    '601',
    '501',
    'Fictional Assignment',
    array['online_upload', 'online_text_entry'],
    now()
  );

  begin
    insert into public.canvas_assignments (
      user_id,
      canvas_connection_id,
      course_id,
      canvas_assignment_id,
      name
    )
    values (v_user_a, v_conn_a, v_course_a, '601', 'Duplicate Assignment');
    raise exception 'duplicate Canvas assignment identity was accepted';
  exception
    when unique_violation then
      null;
  end;

  delete from public.canvas_connections where id = v_conn_b and user_id = v_user_b;
  if exists (select 1 from public.canvas_courses where user_id = v_user_b) then
    raise exception 'connection delete did not cascade to User B course graph';
  end if;

  foreach v_table in array array[
    'canvas_courses',
    'canvas_modules',
    'canvas_module_items',
    'canvas_pages',
    'canvas_assignment_groups',
    'canvas_assignments'
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

    if (
      select count(distinct privilege.privilege_type)
      from information_schema.table_privileges privilege
      where privilege.table_schema = 'public'
        and privilege.table_name = v_table
        and privilege.grantee = 'service_role'
        and privilege.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    ) <> 4 then
      raise exception 'service_role DML grant is incomplete on %', v_table;
    end if;
  end loop;

  foreach v_name in array array[
    'canvas_courses_connection_user_fkey',
    'canvas_courses_canvas_identity_unique',
    'canvas_modules_course_owner_fkey',
    'canvas_modules_canvas_identity_unique',
    'canvas_module_items_module_owner_fkey',
    'canvas_module_items_canvas_identity_unique',
    'canvas_pages_course_owner_fkey',
    'canvas_pages_url_unique',
    'canvas_assignment_groups_course_owner_fkey',
    'canvas_assignment_groups_canvas_identity_unique',
    'canvas_assignments_course_owner_fkey',
    'canvas_assignments_assignment_group_owner_fkey',
    'canvas_assignments_canvas_identity_unique'
  ]
  loop
    if not exists (select 1 from pg_constraint where conname = v_name) then
      raise exception 'expected constraint missing: %', v_name;
    end if;
  end loop;

  foreach v_name in array array[
    'canvas_courses_user_synced_idx',
    'canvas_courses_connection_synced_idx',
    'canvas_modules_course_position_idx',
    'canvas_module_items_module_position_idx',
    'canvas_pages_canvas_page_id_unique_idx',
    'canvas_assignment_groups_course_position_idx',
    'canvas_assignments_course_due_idx',
    'canvas_assignments_user_due_idx'
  ]
  loop
    if not exists (
      select 1
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = v_name
    ) then
      raise exception 'expected index missing: %', v_name;
    end if;
  end loop;
end;
$$;

rollback;

select 'phase5b1_academic_graph_verification_passed' as result;
