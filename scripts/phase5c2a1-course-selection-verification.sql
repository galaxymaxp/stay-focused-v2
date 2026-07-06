begin;

create temp table _phase5c2a1_checks (
  check_name text primary key,
  passed boolean not null,
  notes text not null default ''
) on commit drop;

insert into _phase5c2a1_checks (check_name, passed, notes)
with expected_tables(table_name) as (
  values ('canvas_course_sync_preferences')
), expected_columns(table_name, column_name) as (
  values
    ('canvas_sync_runs', 'scope_course_id'),
    ('canvas_course_sync_preferences', 'id'),
    ('canvas_course_sync_preferences', 'user_id'),
    ('canvas_course_sync_preferences', 'canvas_connection_id'),
    ('canvas_course_sync_preferences', 'course_id'),
    ('canvas_course_sync_preferences', 'selected'),
    ('canvas_course_sync_preferences', 'display_order'),
    ('canvas_course_sync_preferences', 'selected_at')
), expected_indexes(index_name) as (
  values
    ('canvas_course_sync_preferences_connection_selected_idx'),
    ('canvas_course_sync_preferences_course_idx'),
    ('canvas_sync_runs_one_running_account_sync_per_connection_idx'),
    ('canvas_sync_runs_one_running_course_sync_idx'),
    ('canvas_sync_runs_scope_course_started_idx')
), expected_constraints(conname) as (
  values
    ('canvas_course_sync_preferences_connection_user_fkey'),
    ('canvas_course_sync_preferences_course_owner_fkey'),
    ('canvas_course_sync_preferences_identity_unique'),
    ('canvas_course_sync_preferences_display_order_non_negative'),
    ('canvas_course_sync_preferences_selected_at_consistency'),
    ('canvas_sync_runs_scope_course_owner_fkey'),
    ('canvas_sync_runs_scope_course_consistency'),
    ('canvas_sync_runs_mode_allowed')
), expected_functions(signature) as (
  values
    ('public.replace_canvas_course_sync_preferences(uuid,uuid,uuid[],timestamp with time zone)'::regprocedure),
    ('public.begin_canvas_course_sync_run(uuid,uuid,uuid,timestamp with time zone)'::regprocedure)
), expected_existing_tables(table_name) as (
  values
    ('canvas_connections'),
    ('canvas_capabilities'),
    ('canvas_courses'),
    ('canvas_modules'),
    ('canvas_module_items'),
    ('canvas_pages'),
    ('canvas_assignment_groups'),
    ('canvas_assignments'),
    ('canvas_sync_runs'),
    ('canvas_sync_course_results'),
    ('canvas_course_sync_states'),
    ('canvas_planner_items'),
    ('canvas_announcements'),
    ('canvas_files'),
    ('canvas_file_references'),
    ('canvas_file_ingestion_results')
)
select 'preference_table_exists', count(*) = 1, 'course preference table exists'
from information_schema.tables t
join expected_tables e on e.table_name = t.table_name
where t.table_schema = 'public'
union all
select 'expected_columns_exist', count(*) = 8, 'preference and scoped-run columns exist'
from information_schema.columns c
join expected_columns e
  on e.table_name = c.table_name
  and e.column_name = c.column_name
where c.table_schema = 'public'
union all
select 'expected_indexes_exist', count(*) = 5, 'preference and scoped-run lookup indexes'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_indexes e on e.index_name = c.relname
where n.nspname = 'public'
union all
select 'expected_constraints_exist', count(*) = 8, 'ownership, uniqueness, and sync-mode constraints'
from pg_constraint c
join expected_constraints e on e.conname = c.conname
union all
select 'preference_rls_enabled', bool_and(c.relrowsecurity), 'RLS enabled on preference table'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_tables e on e.table_name = c.relname
where n.nspname = 'public'
union all
select 'direct_client_grants_revoked', not exists (
  select 1
  from information_schema.table_privileges p
  where p.table_schema = 'public'
    and p.table_name = 'canvas_course_sync_preferences'
    and p.grantee in ('anon', 'authenticated')
    and p.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
), 'anon/authenticated have no direct preference table CRUD grants'
union all
select 'public_rpc_execution_revoked', not exists (
  select 1
  from expected_functions f
  where has_function_privilege('public', f.signature, 'execute')
     or has_function_privilege('anon', f.signature, 'execute')
     or has_function_privilege('authenticated', f.signature, 'execute')
), 'course preference and scoped-run RPCs are not public'
union all
select 'service_role_rpc_execution_granted', not exists (
  select 1
  from expected_functions f
  where not has_function_privilege('service_role', f.signature, 'execute')
), 'service role can execute new RPCs'
union all
select 'controlled_function_search_path', count(*) = 2, 'new SECURITY DEFINER functions pin search_path'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'replace_canvas_course_sync_preferences',
    'begin_canvas_course_sync_run'
  )
  and exists (
    select 1
    from unnest(coalesce(p.proconfig, '{}'::text[])) as config(value)
    where config.value = 'search_path=public, pg_temp'
  )
union all
select 'earlier_rls_still_enabled', bool_and(c.relrowsecurity), 'earlier Canvas tables retain RLS'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_existing_tables e on e.table_name = c.relname
where n.nspname = 'public'
union all
select 'earlier_direct_grants_still_revoked', not exists (
  select 1
  from information_schema.table_privileges p
  join expected_existing_tables e on e.table_name = p.table_name
  where p.table_schema = 'public'
    and p.grantee in ('anon', 'authenticated')
    and p.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
), 'earlier Canvas direct grants remain revoked';

do $$
declare
  v_user_a uuid := '00000000-0000-0000-0000-00000005c2a1';
  v_user_b uuid := '00000000-0000-0000-0000-00000005c2b2';
  v_connection_a uuid := '10000000-0000-0000-0000-00000005c2a1';
  v_connection_b uuid := '10000000-0000-0000-0000-00000005c2b2';
  v_course_a1 uuid := '20000000-0000-0000-0000-00000005c2a1';
  v_course_a2 uuid := '20000000-0000-0000-0000-00000005c2a2';
  v_course_b1 uuid := '20000000-0000-0000-0000-00000005c2b1';
  v_now timestamptz := '2026-07-06T00:00:00Z';
  v_pref_a1 uuid;
  v_pref_a2 uuid;
  v_run record;
  v_result record;
  v_denied boolean;
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
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
      'authenticated',
      'authenticated',
      'phase5c2a1-user-a@example.invalid',
      'not-a-real-password',
      v_now,
      v_now,
      v_now,
      '',
      '',
      '',
      ''
    ),
    (
      v_user_b,
      'authenticated',
      'authenticated',
      'phase5c2a1-user-b@example.invalid',
      'not-a-real-password',
      v_now,
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
      'canvas-user-a',
      'Fictional User A',
      'ciphertext',
      'iv',
      'auth-tag',
      'aes-256-gcm:v1',
      'active',
      v_now
    ),
    (
      v_connection_b,
      v_user_b,
      'https://canvas.example.invalid',
      'canvas-user-b',
      'Fictional User B',
      'ciphertext',
      'iv',
      'auth-tag',
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
    (v_course_a1, v_user_a, v_connection_a, 'course-a-1', 'Fictional Course A1', v_now, v_now),
    (v_course_a2, v_user_a, v_connection_a, 'course-a-2', 'Fictional Course A2', v_now, v_now),
    (v_course_b1, v_user_b, v_connection_b, 'course-b-1', 'Fictional Course B1', v_now, v_now);

  select *
  into v_result
  from public.replace_canvas_course_sync_preferences(
    v_user_a,
    v_connection_a,
    array[v_course_a1, v_course_a2],
    v_now
  );

  select id into v_pref_a1
  from public.canvas_course_sync_preferences
  where user_id = v_user_a and course_id = v_course_a1;

  select id into v_pref_a2
  from public.canvas_course_sync_preferences
  where user_id = v_user_a and course_id = v_course_a2;

  insert into _phase5c2a1_checks
  values (
    'preference_initial_insert',
    v_result.selected_count = 2
      and v_result.deselected_count = 0
      and (
        select count(*)
        from public.canvas_course_sync_preferences
        where user_id = v_user_a
          and canvas_connection_id = v_connection_a
          and selected
      ) = 2
      and exists (
        select 1
        from public.canvas_course_sync_preferences
        where id = v_pref_a1
          and display_order = 0
          and selected_at = v_now
      )
      and exists (
        select 1
        from public.canvas_course_sync_preferences
        where id = v_pref_a2
          and display_order = 1
          and selected_at = v_now
      ),
    'two selected courses inserted with stable ordering'
  );

  select *
  into v_result
  from public.replace_canvas_course_sync_preferences(
    v_user_a,
    v_connection_a,
    array[v_course_a2],
    v_now + interval '1 minute'
  );

  insert into _phase5c2a1_checks
  values (
    'deselect_preserves_data_and_preference',
    v_result.selected_count = 1
      and v_result.deselected_count = 1
      and exists (
        select 1
        from public.canvas_course_sync_preferences
        where id = v_pref_a1
          and selected = false
          and display_order is null
          and selected_at is null
      )
      and exists (
        select 1
        from public.canvas_courses
        where id = v_course_a1
          and user_id = v_user_a
          and canvas_connection_id = v_connection_a
      ),
    'deselection does not delete course inventory or preference identity'
  );

  select *
  into v_result
  from public.replace_canvas_course_sync_preferences(
    v_user_a,
    v_connection_a,
    array[v_course_a1, v_course_a2],
    v_now + interval '2 minutes'
  );

  insert into _phase5c2a1_checks
  values (
    'reselect_reuses_preference_identity',
    v_result.selected_count = 2
      and exists (
        select 1
        from public.canvas_course_sync_preferences
        where id = v_pref_a1
          and selected = true
          and display_order = 0
      )
      and exists (
        select 1
        from public.canvas_course_sync_preferences
        where id = v_pref_a2
          and selected = true
          and display_order = 1
      )
      and (
        select count(*)
        from public.canvas_course_sync_preferences
        where user_id = v_user_a
          and canvas_connection_id = v_connection_a
      ) = 2,
    'reselection updates existing rows without duplicates'
  );

  v_denied := false;
  begin
    perform *
    from public.replace_canvas_course_sync_preferences(
      v_user_a,
      v_connection_a,
      array[v_course_a1, v_course_a1],
      v_now
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5c2a1_checks
  values (
    'duplicate_selection_rejected',
    v_denied,
    'duplicate internal course ids rejected atomically'
  );

  v_denied := false;
  begin
    perform *
    from public.replace_canvas_course_sync_preferences(
      v_user_a,
      v_connection_a,
      array[v_course_b1],
      v_now
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5c2a1_checks
  values (
    'cross_user_selection_rejected',
    v_denied
      and not exists (
        select 1
        from public.canvas_course_sync_preferences
        where user_id = v_user_a
          and course_id = v_course_b1
      ),
    'cross-user/internal course mismatch rejected'
  );

  v_denied := false;
  begin
    perform *
    from public.replace_canvas_course_sync_preferences(
      v_user_b,
      v_connection_a,
      array[v_course_a1],
      v_now
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5c2a1_checks
  values (
    'connection_owner_mismatch_rejected',
    v_denied,
    'preference RPC verifies connection ownership'
  );

  select *
  into v_run
  from public.begin_canvas_course_sync_run(
    v_user_a,
    v_connection_a,
    v_course_a1,
    v_now
  );

  insert into _phase5c2a1_checks
  values (
    'course_sync_run_started',
    v_run.sync_mode = 'course'
      and v_run.status = 'running'
      and exists (
        select 1
        from public.canvas_sync_runs
        where id = v_run.id
          and scope_course_id = v_course_a1
          and sync_mode = 'course'
          and status = 'running'
      ),
    'course-scoped run records internal course scope'
  );

  v_denied := false;
  begin
    perform *
    from public.begin_canvas_course_sync_run(
      v_user_a,
      v_connection_a,
      v_course_a1,
      v_now + interval '1 minute'
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5c2a1_checks
  values (
    'same_course_overlap_rejected',
    v_denied,
    'non-stale running run blocks only the same course'
  );

  select *
  into v_run
  from public.begin_canvas_course_sync_run(
    v_user_a,
    v_connection_a,
    v_course_a2,
    v_now + interval '2 minutes'
  );

  insert into _phase5c2a1_checks
  values (
    'different_course_run_allowed',
    v_run.id is not null
      and exists (
        select 1
        from public.canvas_sync_runs
        where id = v_run.id
          and scope_course_id = v_course_a2
          and sync_mode = 'course'
          and status = 'running'
      ),
    'independent course requests can run concurrently per connection'
  );

  update public.canvas_sync_runs
  set heartbeat_at = v_now - interval '1 hour'
  where user_id = v_user_a
    and canvas_connection_id = v_connection_a
    and scope_course_id = v_course_a1
    and status = 'running';

  select *
  into v_run
  from public.begin_canvas_course_sync_run(
    v_user_a,
    v_connection_a,
    v_course_a1,
    v_now + interval '31 minutes'
  );

  insert into _phase5c2a1_checks
  values (
    'stale_course_run_recovered',
    exists (
      select 1
      from public.canvas_sync_runs
      where user_id = v_user_a
        and canvas_connection_id = v_connection_a
        and scope_course_id = v_course_a1
        and status = 'failed'
        and failure_code = 'stale_sync_recovered'
    )
    and exists (
      select 1
      from public.canvas_sync_runs
      where id = v_run.id
        and scope_course_id = v_course_a1
        and status = 'running'
    ),
    'stale course-scoped run is terminal before a replacement run starts'
  );

  v_denied := false;
  begin
    insert into public.canvas_sync_runs (
      user_id,
      canvas_connection_id,
      sync_mode,
      scope_course_id,
      status,
      started_at,
      heartbeat_at
    )
    values (
      v_user_a,
      v_connection_a,
      'full',
      v_course_a1,
      'running',
      v_now,
      v_now
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5c2a1_checks
  values (
    'full_sync_scope_rejected',
    v_denied,
    'account-wide modes cannot carry a course scope'
  );

  v_denied := false;
  begin
    perform *
    from public.begin_canvas_course_sync_run(
      v_user_a,
      v_connection_a,
      v_course_b1,
      v_now
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5c2a1_checks
  values (
    'cross_user_course_sync_rejected',
    v_denied,
    'course-scoped run RPC verifies course ownership and connection'
  );
end $$;

select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  notes
from _phase5c2a1_checks
order by check_name;

rollback;
