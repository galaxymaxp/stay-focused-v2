begin;

create temp table _phase5d1_checks (
  check_name text primary key,
  passed boolean not null,
  notes text not null default ''
) on commit drop;

insert into _phase5d1_checks (check_name, passed, notes)
with expected_tables(table_name) as (
  values
    ('canvas_source_preview_sessions'),
    ('reviewer_source_snapshots'),
    ('reviewer_source_snapshot_items')
), expected_columns(table_name, column_name) as (
  values
    ('canvas_source_preview_sessions', 'id'),
    ('canvas_source_preview_sessions', 'user_id'),
    ('canvas_source_preview_sessions', 'original_preview_text'),
    ('canvas_source_preview_sessions', 'original_preview_sha256'),
    ('canvas_source_preview_sessions', 'source_manifest'),
    ('canvas_source_preview_sessions', 'expires_at'),
    ('reviewer_source_snapshots', 'preview_session_id'),
    ('reviewer_source_snapshots', 'exact_source_text'),
    ('reviewer_source_snapshots', 'exact_source_sha256'),
    ('reviewer_source_snapshots', 'was_edited'),
    ('reviewer_source_snapshot_items', 'source_snapshot_id'),
    ('reviewer_source_snapshot_items', 'ordinal'),
    ('reviewer_source_snapshot_items', 'normalized_content_sha256'),
    ('reviewer_source_snapshot_items', 'parser_version'),
    ('reviewer_source_snapshot_items', 'ocr_version'),
    ('reviewers', 'source_snapshot_id')
), expected_indexes(index_name) as (
  values
    ('canvas_source_preview_sessions_user_created_idx'),
    ('canvas_source_preview_sessions_expires_idx'),
    ('reviewer_source_snapshots_user_created_idx'),
    ('reviewer_source_snapshots_preview_idx'),
    ('reviewer_source_snapshot_items_snapshot_idx'),
    ('reviewer_source_snapshot_items_snapshot_context_idx'),
    ('reviewer_source_snapshot_items_user_idx'),
    ('reviewers_source_snapshot_idx')
), expected_constraints(conname) as (
  values
    ('canvas_source_preview_sessions_sha256_format'),
    ('canvas_source_preview_sessions_source_count_limit'),
    ('canvas_source_preview_sessions_expiry_window'),
    ('reviewer_source_snapshots_preview_owner_fkey'),
    ('reviewer_source_snapshots_id_owner_course_unique'),
    ('reviewer_source_snapshots_dedupe_unique'),
    ('reviewer_source_snapshots_exact_sha256_format'),
    ('reviewer_source_snapshot_items_snapshot_owner_fkey'),
    ('reviewer_source_snapshot_items_snapshot_context_fkey'),
    ('reviewer_source_snapshot_items_snapshot_ordinal_unique'),
    ('reviewer_source_snapshot_items_normalized_hash_format'),
    ('reviewers_source_snapshot_owner_fkey')
), expected_functions(signature) as (
  values
    ('public.create_reviewer_source_snapshot(uuid,uuid,text,text,text,boolean)'::regprocedure),
    ('public.cleanup_expired_canvas_source_preview_sessions(timestamp with time zone)'::regprocedure),
    ('public.validate_canvas_source_preview_session_owner()'::regprocedure)
)
select 'new_tables_exist', count(*) = 3, 'private provenance tables exist'
from information_schema.tables t
join expected_tables e on e.table_name = t.table_name
where t.table_schema = 'public'
union all
select 'expected_columns_exist', count(*) = 16, 'new provenance and reviewer link columns exist'
from information_schema.columns c
join expected_columns e
  on e.table_name = c.table_name
  and e.column_name = c.column_name
where c.table_schema = 'public'
union all
select 'expected_indexes_exist', count(*) = 8, 'lookup and ownership indexes exist'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_indexes e on e.index_name = c.relname
where n.nspname = 'public'
union all
select 'expected_constraints_exist', count(*) = 12, 'hash, count, ordinal, dedupe, and owner constraints exist'
from pg_constraint c
join expected_constraints e on e.conname = c.conname
union all
select 'rls_enabled', bool_and(c.relrowsecurity), 'RLS enabled on private provenance tables'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_tables e on e.table_name = c.relname
where n.nspname = 'public'
union all
select 'direct_client_grants_revoked', not exists (
  select 1
  from information_schema.table_privileges p
  join expected_tables e on e.table_name = p.table_name
  where p.table_schema = 'public'
    and p.grantee in ('anon', 'authenticated')
    and p.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
), 'anon/authenticated have no direct private provenance table access'
union all
select 'service_role_table_grants', not exists (
  select 1
  from expected_tables e
  where not has_table_privilege('service_role', format('public.%I', e.table_name), 'select')
     or not has_table_privilege('service_role', format('public.%I', e.table_name), 'insert')
), 'service role can read and insert private provenance tables'
union all
select 'public_rpc_execution_revoked', not exists (
  select 1
  from expected_functions f
  where has_function_privilege('public', f.signature, 'execute')
     or has_function_privilege('anon', f.signature, 'execute')
     or has_function_privilege('authenticated', f.signature, 'execute')
), 'provenance RPCs are not public'
union all
select 'service_role_rpc_execution_granted', not exists (
  select 1
  from expected_functions f
  where not has_function_privilege('service_role', f.signature, 'execute')
), 'service role can execute provenance RPCs';

do $$
declare
  v_user_a uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_user_b uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  v_connection_a uuid := 'bbbbbbbb-0000-4000-8000-000000000001';
  v_connection_b uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  v_course_a uuid := 'cccccccc-0000-4000-8000-000000000001';
  v_course_b uuid := 'cccccccc-0000-4000-8000-000000000002';
  v_preview uuid := 'dddddddd-0000-4000-8000-000000000001';
  v_snapshot uuid;
  v_reviewer uuid := 'eeeeeeee-0000-4000-8000-000000000001';
  v_now timestamptz := now();
  v_denied boolean;
  v_hash text := repeat('a', 64);
  v_hash_b text := repeat('b', 64);
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
      'phase5d1-user-a@example.invalid',
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
      'phase5d1-user-b@example.invalid',
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
    last_verified_at
  )
  values
    (
      v_connection_a,
      v_user_a,
      'https://canvas.example.invalid',
      'fictional-a',
      'Fictional A',
      'ciphertext',
      'iv',
      'tag',
      'test-v1',
      v_now
    ),
    (
      v_connection_b,
      v_user_b,
      'https://canvas.example.invalid',
      'fictional-b',
      'Fictional B',
      'ciphertext',
      'iv',
      'tag',
      'test-v1',
      v_now
    );

  insert into public.canvas_courses (
    id,
    user_id,
    canvas_connection_id,
    canvas_course_id,
    name
  )
  values
    (v_course_a, v_user_a, v_connection_a, '101', 'Fictional Course A'),
    (v_course_b, v_user_b, v_connection_b, '202', 'Fictional Course B');

  insert into public.canvas_source_preview_sessions (
    id,
    user_id,
    canvas_connection_id,
    course_id,
    original_preview_text,
    original_preview_sha256,
    suggested_title,
    source_count,
    source_manifest,
    normalization_version,
    created_at,
    expires_at
  )
  values (
    v_preview,
    v_user_a,
    v_connection_a,
    v_course_a,
    'Fictional preview text',
    v_hash,
    'Fictional Canvas Reviewer',
    2,
    jsonb_build_array(
      jsonb_build_object(
        'ordinal', 1,
        'source_type', 'page',
        'source_title', 'Fictional Page',
        'source_row_id', null,
        'canvas_connection_id', v_connection_a,
        'course_id', v_course_a,
        'canvas_course_id', '101',
        'canvas_source_object_id', 'page-1',
        'module_id', null,
        'module_item_id', null,
        'file_id', null,
        'file_kind', null,
        'mime_type', null,
        'page_count', null,
        'canvas_updated_at', v_now,
        'local_synced_at', v_now,
        'normalized_content_sha256', v_hash,
        'stored_content_sha256', null,
        'parser_version', 'canvas-html-visible-text-v1',
        'ocr_version', null
      ),
      jsonb_build_object(
        'ordinal', 2,
        'source_type', 'file',
        'source_title', 'Fictional Image',
        'source_row_id', null,
        'canvas_connection_id', v_connection_a,
        'course_id', v_course_a,
        'canvas_course_id', '101',
        'canvas_source_object_id', 'file-1',
        'module_id', null,
        'module_item_id', null,
        'file_id', 'file-1',
        'file_kind', 'image',
        'mime_type', 'image/png',
        'page_count', null,
        'canvas_updated_at', v_now,
        'local_synced_at', v_now,
        'normalized_content_sha256', v_hash_b,
        'stored_content_sha256', v_hash_b,
        'parser_version', 'canvas-stored-file-extraction-v1',
        'ocr_version', 'canvas-stored-image-ocr-v1'
      )
    ),
    'canvas-source-preview-v1',
    v_now,
    v_now + interval '1 hour'
  );

  select snapshot.id
  into v_snapshot
  from public.create_reviewer_source_snapshot(
    v_user_a,
    v_preview,
    'Fictional Canvas Reviewer',
    'Fictional edited source text',
    v_hash_b,
    true
  ) snapshot;

  insert into public.reviewers (
    id,
    user_id,
    title,
    source_metadata,
    reviewer_output,
    source_snapshot_id,
    section_count
  )
  values (
    v_reviewer,
    v_user_a,
    'Fictional Saved Reviewer',
    '{"sourceMode":"canvas","sourceCharacterCount":28}'::jsonb,
    '{"id":"fictional-reviewer","title":"Fictional","sections":[],"metadata":{}}'::jsonb,
    v_snapshot,
    0
  );

  insert into _phase5d1_checks
  values (
    'same_user_reviewer_snapshot_link',
    exists (
      select 1
      from public.reviewers reviewer
      where reviewer.id = v_reviewer
        and reviewer.user_id = v_user_a
        and reviewer.source_snapshot_id = v_snapshot
    ),
    'same-user reviewer-to-snapshot link succeeds'
  );

  v_denied := false;
  begin
    insert into public.reviewers (
      user_id,
      title,
      source_metadata,
      reviewer_output,
      source_snapshot_id,
      section_count
    )
    values (
      v_user_b,
      'Cross User Link',
      '{}'::jsonb,
      '{}'::jsonb,
      v_snapshot,
      0
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d1_checks
  values (
    'cross_user_reviewer_snapshot_link_denied',
    v_denied,
    'composite reviewer/snapshot ownership FK rejects cross-user link'
  );

  v_denied := false;
  begin
    insert into public.reviewer_source_snapshot_items (
      user_id,
      source_snapshot_id,
      ordinal,
      source_type,
      source_title,
      canvas_connection_id,
      course_id,
      canvas_course_id,
      normalized_content_sha256
    )
    values (
      v_user_a,
      v_snapshot,
      1,
      'page',
      'Duplicate Ordinal',
      v_connection_a,
      v_course_a,
      '101',
      v_hash
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d1_checks
  values (
    'duplicate_ordinal_rejected',
    v_denied,
    'snapshot item order is unique per snapshot'
  );

  v_denied := false;
  begin
    insert into public.reviewer_source_snapshot_items (
      user_id,
      source_snapshot_id,
      ordinal,
      source_type,
      source_title,
      canvas_connection_id,
      course_id,
      canvas_course_id,
      normalized_content_sha256
    )
    values (
      v_user_a,
      v_snapshot,
      8,
      'page',
      'Wrong Course Context',
      v_connection_b,
      v_course_b,
      '202',
      v_hash
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d1_checks
  values (
    'snapshot_item_context_mismatch_rejected',
    v_denied,
    'snapshot item context must match the owning snapshot'
  );

  v_denied := false;
  begin
    update public.reviewer_source_snapshots
    set source_title = 'Mutated'
    where id = v_snapshot;
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d1_checks
  values (
    'snapshot_update_rejected',
    v_denied,
    'immutable snapshot update trigger fires'
  );

  delete from public.reviewers where id = v_reviewer;

  insert into _phase5d1_checks
  values (
    'reviewer_delete_leaves_snapshot',
    exists (
      select 1
      from public.reviewer_source_snapshots
      where id = v_snapshot
    ),
    'deleting reviewer does not delete reusable snapshot'
  );

  delete from public.canvas_connections where id = v_connection_a;

  insert into _phase5d1_checks
  values (
    'canvas_disconnect_leaves_snapshot',
    exists (
      select 1
      from public.reviewer_source_snapshots
      where id = v_snapshot
    ),
    'Canvas disconnect does not delete historical source snapshot'
  );
end $$;

select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  notes
from _phase5d1_checks
order by check_name;

rollback;
