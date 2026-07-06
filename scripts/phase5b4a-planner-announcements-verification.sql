begin;

create temp table _phase5b4a_checks (
  check_name text primary key,
  passed boolean not null,
  notes text not null default ''
) on commit drop;

insert into _phase5b4a_checks (check_name, passed, notes)
with new_tables(table_name) as (
  values
    ('canvas_planner_items'),
    ('canvas_announcements')
), expected_indexes(index_name) as (
  values
    ('canvas_planner_items_user_date_idx'),
    ('canvas_planner_items_connection_date_idx'),
    ('canvas_planner_items_course_date_idx'),
    ('canvas_planner_items_plannable_idx'),
    ('canvas_announcements_user_posted_idx'),
    ('canvas_announcements_connection_posted_idx'),
    ('canvas_announcements_course_posted_idx')
), expected_constraints(conname) as (
  values
    ('canvas_planner_items_connection_user_fkey'),
    ('canvas_planner_items_course_owner_fkey'),
    ('canvas_planner_items_identity_unique'),
    ('canvas_announcements_connection_user_fkey'),
    ('canvas_announcements_course_owner_fkey'),
    ('canvas_announcements_identity_unique')
), snapshot_functions(signature) as (
  values
    ('public.replace_canvas_planner_items_snapshot(uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,timestamp with time zone,text[],jsonb)'::regprocedure),
    ('public.replace_canvas_course_announcements_snapshot(uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,timestamp with time zone,text,jsonb)'::regprocedure)
), expected_old_tables(table_name) as (
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
    ('canvas_course_sync_states')
)
select 'tables_exist', count(*) = 2, 'planner and announcement tables'
from information_schema.tables t
join new_tables n on n.table_name = t.table_name
where t.table_schema = 'public'
union all
select 'indexes_exist', count(*) = 7, 'planner and announcement lookup indexes'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_indexes e on e.index_name = c.relname
where n.nspname = 'public'
union all
select 'ownership_constraints_exist', count(*) = 6, 'composite ownership and identity constraints'
from pg_constraint c
join expected_constraints e on e.conname = c.conname
union all
select 'rls_enabled', bool_and(c.relrowsecurity), 'new tables'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join new_tables t on t.table_name = c.relname
where n.nspname = 'public'
union all
select 'direct_client_grants_revoked', not exists (
  select 1
  from information_schema.table_privileges p
  join new_tables t on t.table_name = p.table_name
  where p.table_schema = 'public'
    and p.grantee in ('anon', 'authenticated')
    and p.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
), 'anon/authenticated have no direct table CRUD grants'
union all
select 'public_rpc_execution_revoked', not exists (
  select 1
  from snapshot_functions f
  where has_function_privilege('public', f.signature, 'execute')
     or has_function_privilege('anon', f.signature, 'execute')
     or has_function_privilege('authenticated', f.signature, 'execute')
), 'snapshot RPCs not public'
union all
select 'service_role_rpc_execution_granted', not exists (
  select 1
  from snapshot_functions f
  where not has_function_privilege('service_role', f.signature, 'execute')
), 'service role can execute snapshot RPCs'
union all
select 'controlled_function_search_path', count(*) = 2, 'search_path pinned'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'replace_canvas_planner_items_snapshot',
    'replace_canvas_course_announcements_snapshot'
  )
  and exists (
    select 1
    from unnest(coalesce(p.proconfig, '{}'::text[])) as config(value)
    where config.value = 'search_path=public, pg_temp'
  )
union all
select 'earlier_rls_still_enabled', bool_and(c.relrowsecurity), 'Phase 5A/5B tables'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_old_tables t on t.table_name = c.relname
where n.nspname = 'public'
union all
select 'earlier_direct_grants_still_revoked', not exists (
  select 1
  from information_schema.table_privileges p
  join expected_old_tables t on t.table_name = p.table_name
  where p.table_schema = 'public'
    and p.grantee in ('anon', 'authenticated')
    and p.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
), 'Phase 5A/5B direct table grants';

do $$
declare
  v_user_a uuid := '00000000-0000-0000-0000-00000000b4a1';
  v_user_b uuid := '00000000-0000-0000-0000-00000000b4a2';
  v_connection_a uuid := '10000000-0000-0000-0000-00000000b4a1';
  v_connection_b uuid := '10000000-0000-0000-0000-00000000b4a2';
  v_course_a uuid := '20000000-0000-0000-0000-00000000b4a1';
  v_course_b uuid := '20000000-0000-0000-0000-00000000b4a2';
  v_run_a uuid := '30000000-0000-0000-0000-00000000b4a1';
  v_run_b uuid := '30000000-0000-0000-0000-00000000b4a2';
  v_now timestamptz := '2026-07-06T00:00:00Z';
  v_window_start timestamptz := '2026-06-06T00:00:00Z';
  v_window_end timestamptz := '2026-11-03T00:00:00Z';
  v_result record;
  v_denied boolean := false;
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
      'phase5b4a-user-a@example.invalid',
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
      'phase5b4a-user-b@example.invalid',
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
    (v_course_a, v_user_a, v_connection_a, 'course-1', 'Fictional Course A', v_now, v_now),
    (v_course_b, v_user_b, v_connection_b, 'course-2', 'Fictional Course B', v_now, v_now);

  insert into public.canvas_sync_runs (
    id,
    user_id,
    canvas_connection_id,
    sync_mode,
    status,
    started_at,
    heartbeat_at
  )
  values
    (v_run_a, v_user_a, v_connection_a, 'full', 'running', v_now, v_now),
    (v_run_b, v_user_b, v_connection_b, 'full', 'running', v_now, v_now);

  select *
  into v_result
  from public.replace_canvas_planner_items_snapshot(
    v_user_a,
    v_connection_a,
    v_run_a,
    v_now,
    v_window_start,
    v_window_end,
    array['course_course-1'],
    jsonb_build_array(
      jsonb_build_object(
        'canvas_planner_item_id', 'course_course-1:assignment:assignment-1',
        'context_code', 'course_course-1',
        'canvas_course_id', 'course-1',
        'plannable_type', 'assignment',
        'plannable_id', 'assignment-1',
        'title', 'Fictional Planner A',
        'planner_date', '2026-07-10T00:00:00Z',
        'due_at', '2026-07-10T00:00:00Z',
        'todo_date', null,
        'html_url', 'https://canvas.example.invalid/planner-a',
        'workflow_state', 'published',
        'marked_complete', false,
        'dismissed', false,
        'submission_excused', null,
        'submission_graded', null,
        'submission_late', null,
        'submission_missing', null,
        'submission_needs_grading', null,
        'submission_with_feedback', null,
        'source_fingerprint', 'planner-fingerprint-a'
      ),
      jsonb_build_object(
        'canvas_planner_item_id', 'course_course-1:wiki_page:page-1',
        'context_code', 'course_course-1',
        'canvas_course_id', 'course-1',
        'plannable_type', 'wiki_page',
        'plannable_id', 'page-1',
        'title', 'Fictional Planner B',
        'planner_date', '2026-07-11T00:00:00Z',
        'due_at', null,
        'todo_date', '2026-07-11T00:00:00Z',
        'html_url', 'https://canvas.example.invalid/planner-b',
        'workflow_state', 'published',
        'source_fingerprint', 'planner-fingerprint-b'
      )
    )
  );

  insert into _phase5b4a_checks
  values (
    'planner_first_insert_counts',
    v_result.planner_items_inserted = 2
      and v_result.planner_items_updated = 0
      and v_result.planner_items_unchanged = 0
      and v_result.planner_items_pruned = 0,
    'two planner rows inserted'
  );

  insert into public.canvas_planner_items (
    user_id,
    canvas_connection_id,
    canvas_planner_item_id,
    context_code,
    canvas_course_id,
    plannable_type,
    plannable_id,
    planner_date,
    source_fingerprint
  )
  values (
    v_user_a,
    v_connection_a,
    'course_course-1:assignment:historical',
    'course_course-1',
    'course-1',
    'assignment',
    'historical',
    '2026-01-01T00:00:00Z',
    'historical-fingerprint'
  );

  select *
  into v_result
  from public.replace_canvas_planner_items_snapshot(
    v_user_a,
    v_connection_a,
    v_run_a,
    v_now + interval '1 minute',
    v_window_start,
    v_window_end,
    array['course_course-1'],
    jsonb_build_array(
      jsonb_build_object(
        'canvas_planner_item_id', 'course_course-1:assignment:assignment-1',
        'context_code', 'course_course-1',
        'canvas_course_id', 'course-1',
        'plannable_type', 'assignment',
        'plannable_id', 'assignment-1',
        'title', 'Fictional Planner A changed',
        'planner_date', '2026-07-10T00:00:00Z',
        'due_at', '2026-07-10T00:00:00Z',
        'html_url', 'https://canvas.example.invalid/planner-a',
        'workflow_state', 'published',
        'source_fingerprint', 'planner-fingerprint-a2'
      )
    )
  );

  insert into _phase5b4a_checks
  values (
    'planner_incremental_update_prune',
    v_result.planner_items_inserted = 0
      and v_result.planner_items_updated = 1
      and v_result.planner_items_unchanged = 0
      and v_result.planner_items_pruned = 1
      and exists (
        select 1
        from public.canvas_planner_items
        where user_id = v_user_a
          and canvas_connection_id = v_connection_a
          and canvas_planner_item_id = 'course_course-1:assignment:historical'
      ),
    'changed row updated, missing in-window row pruned, historical row preserved'
  );

  select *
  into v_result
  from public.replace_canvas_course_announcements_snapshot(
    v_user_a,
    v_connection_a,
    v_run_a,
    v_now,
    v_window_start,
    v_window_end,
    'course-1',
    jsonb_build_array(
      jsonb_build_object(
        'canvas_announcement_id', 'announcement-1',
        'canvas_course_id', 'course-1',
        'title', 'Fictional Announcement A',
        'message_html', '<p>Fictional announcement A.</p>',
        'posted_at', '2026-07-10T00:00:00Z',
        'delayed_post_at', null,
        'lock_at', null,
        'todo_date', null,
        'workflow_state', 'active',
        'published', true,
        'locked', false,
        'html_url', 'https://canvas.example.invalid/announcement-a',
        'source_fingerprint', 'announcement-fingerprint-a'
      ),
      jsonb_build_object(
        'canvas_announcement_id', 'announcement-2',
        'canvas_course_id', 'course-1',
        'title', 'Fictional Announcement B',
        'message_html', '<p>Fictional announcement B.</p>',
        'posted_at', '2026-07-11T00:00:00Z',
        'delayed_post_at', null,
        'lock_at', null,
        'todo_date', null,
        'workflow_state', 'active',
        'published', true,
        'locked', false,
        'html_url', 'https://canvas.example.invalid/announcement-b',
        'source_fingerprint', 'announcement-fingerprint-b'
      )
    )
  );

  insert into _phase5b4a_checks
  values (
    'announcement_first_insert_counts',
    v_result.announcements_inserted = 2
      and v_result.announcements_updated = 0
      and v_result.announcements_unchanged = 0
      and v_result.announcements_pruned = 0,
    'two announcements inserted'
  );

  select *
  into v_result
  from public.replace_canvas_course_announcements_snapshot(
    v_user_a,
    v_connection_a,
    v_run_a,
    v_now + interval '1 minute',
    v_window_start,
    v_window_end,
    'course-1',
    jsonb_build_array(
      jsonb_build_object(
        'canvas_announcement_id', 'announcement-1',
        'canvas_course_id', 'course-1',
        'title', 'Fictional Announcement A changed',
        'message_html', '<p>Fictional announcement A.</p>',
        'posted_at', '2026-07-10T00:00:00Z',
        'workflow_state', 'active',
        'published', true,
        'locked', false,
        'html_url', 'https://canvas.example.invalid/announcement-a',
        'source_fingerprint', 'announcement-fingerprint-a2'
      )
    )
  );

  insert into _phase5b4a_checks
  values (
    'announcement_incremental_update_prune',
    v_result.announcements_inserted = 0
      and v_result.announcements_updated = 1
      and v_result.announcements_unchanged = 0
      and v_result.announcements_pruned = 1,
    'changed announcement updated and missing in-window row pruned'
  );

  begin
    perform *
    from public.replace_canvas_course_announcements_snapshot(
      v_user_a,
      v_connection_a,
      v_run_a,
      v_now,
      v_window_start,
      v_window_end,
      'missing-course',
      '[]'::jsonb
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5b4a_checks
  values (
    'failed_announcement_course_preserves_rows',
    v_denied
      and exists (
        select 1
        from public.canvas_announcements
        where user_id = v_user_a
          and canvas_connection_id = v_connection_a
          and canvas_course_id = 'course-1'
          and canvas_announcement_id = 'announcement-1'
      ),
    'missing course snapshot rejected without deleting existing course announcements'
  );

  v_denied := false;
  begin
    perform *
    from public.replace_canvas_planner_items_snapshot(
      v_user_b,
      v_connection_a,
      v_run_a,
      v_now,
      v_window_start,
      v_window_end,
      array['course_course-1'],
      '[]'::jsonb
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5b4a_checks
  values (
    'cross_user_ownership_denied',
    v_denied,
    'mismatched user/connection/run rejected by RPC'
  );

  insert into _phase5b4a_checks
  values (
    'duplicate_external_id_absent',
    not exists (
      select 1
      from (
        select canvas_planner_item_id
        from public.canvas_planner_items
        where user_id = v_user_a
          and canvas_connection_id = v_connection_a
        group by canvas_planner_item_id
        having count(*) > 1
      ) duplicates
    )
    and not exists (
      select 1
      from (
        select course_id, canvas_announcement_id
        from public.canvas_announcements
        where user_id = v_user_a
          and canvas_connection_id = v_connection_a
        group by course_id, canvas_announcement_id
        having count(*) > 1
      ) duplicates
    ),
    'unique external identities remain unique'
  );
end $$;

select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  notes
from _phase5b4a_checks
order by check_name;

rollback;
