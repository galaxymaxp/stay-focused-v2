begin;

create temp table _phase5d2_checks (
  check_name text primary key,
  passed boolean not null,
  notes text not null default ''
) on commit drop;

insert into _phase5d2_checks (check_name, passed, notes)
with expected_tables(table_name) as (
  values
    ('canvas_source_structure_sessions'),
    ('reviewer_source_snapshot_blocks')
), expected_columns(table_name, column_name) as (
  values
    ('canvas_source_preview_sessions', 'selected_block_manifest'),
    ('canvas_source_structure_sessions', 'source_manifest'),
    ('canvas_source_structure_sessions', 'block_manifest'),
    ('canvas_source_structure_sessions', 'structure_version'),
    ('canvas_source_structure_sessions', 'expires_at'),
    ('reviewer_source_snapshot_blocks', 'source_snapshot_item_id'),
    ('reviewer_source_snapshot_blocks', 'block_kind'),
    ('reviewer_source_snapshot_blocks', 'block_text'),
    ('reviewer_source_snapshot_blocks', 'block_sha256'),
    ('reviewer_source_snapshot_blocks', 'table_structure'),
    ('reviewer_source_snapshot_blocks', 'page_number'),
    ('reviewer_source_snapshot_blocks', 'parser_version'),
    ('reviewer_source_snapshot_blocks', 'ocr_version')
), expected_indexes(index_name) as (
  values
    ('canvas_source_structure_sessions_user_created_idx'),
    ('canvas_source_structure_sessions_expires_idx'),
    ('reviewer_source_snapshot_blocks_snapshot_idx'),
    ('reviewer_source_snapshot_blocks_item_idx'),
    ('reviewer_source_snapshot_blocks_user_idx')
), expected_constraints(conname) as (
  values
    ('canvas_source_preview_sessions_selected_block_manifest_array'),
    ('canvas_source_structure_sessions_id_user_unique'),
    ('canvas_source_structure_sessions_id_owner_course_unique'),
    ('canvas_source_structure_sessions_source_count_limit'),
    ('canvas_source_structure_sessions_source_manifest_array'),
    ('canvas_source_structure_sessions_block_count_limit'),
    ('canvas_source_structure_sessions_block_manifest_array'),
    ('canvas_source_structure_sessions_expiry_window'),
    ('reviewer_source_snapshot_items_id_snapshot_owner_unique'),
    ('reviewer_source_snapshot_blocks_snapshot_owner_fkey'),
    ('reviewer_source_snapshot_blocks_item_context_fkey'),
    ('reviewer_source_snapshot_blocks_snapshot_ordinal_unique'),
    ('reviewer_source_snapshot_blocks_kind_allowed'),
    ('reviewer_source_snapshot_blocks_sha256_format'),
    ('reviewer_source_snapshot_blocks_text_length')
), expected_functions(signature) as (
  values
    ('public.cleanup_expired_canvas_source_structure_sessions(timestamp with time zone)'::regprocedure)
)
select 'new_tables_exist', count(*) = 2, 'private structure and selected-block tables exist'
from information_schema.tables t
join expected_tables e on e.table_name = t.table_name
where t.table_schema = 'public'
union all
select 'expected_columns_exist', count(*) = 13, 'selective import columns exist'
from information_schema.columns c
join expected_columns e
  on e.table_name = c.table_name
  and e.column_name = c.column_name
where c.table_schema = 'public'
union all
select 'expected_indexes_exist', count(*) = 5, 'structure and block lookup indexes exist'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_indexes e on e.index_name = c.relname
where n.nspname = 'public'
union all
select 'expected_constraints_exist', count(*) = 15, 'count, expiry, ownership, kind, hash, and text constraints exist'
from pg_constraint c
join expected_constraints e on e.conname = c.conname
union all
select 'rls_enabled', bool_and(c.relrowsecurity), 'RLS enabled on new private tables'
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
), 'anon/authenticated have no direct structure or block table access'
union all
select 'service_role_table_grants', not exists (
  select 1
  from expected_tables e
  where not has_table_privilege('service_role', format('public.%I', e.table_name), 'select')
     or not has_table_privilege('service_role', format('public.%I', e.table_name), 'insert')
     or not has_table_privilege('service_role', format('public.%I', e.table_name), 'delete')
), 'service role can read, insert, and clean up private structure/block rows'
union all
select 'cleanup_rpc_not_public', not exists (
  select 1
  from expected_functions f
  where has_function_privilege('public', f.signature, 'execute')
     or has_function_privilege('anon', f.signature, 'execute')
     or has_function_privilege('authenticated', f.signature, 'execute')
), 'structure cleanup RPC is not public'
union all
select 'cleanup_rpc_service_role', not exists (
  select 1
  from expected_functions f
  where not has_function_privilege('service_role', f.signature, 'execute')
), 'service role can execute structure cleanup RPC';

do $$
declare
  v_user_a uuid := 'a5d20000-0000-4000-8000-000000000001';
  v_user_b uuid := 'a5d20000-0000-4000-8000-000000000002';
  v_connection_a uuid := 'b5d20000-0000-4000-8000-000000000001';
  v_connection_b uuid := 'b5d20000-0000-4000-8000-000000000002';
  v_course_a uuid := 'c5d20000-0000-4000-8000-000000000001';
  v_course_b uuid := 'c5d20000-0000-4000-8000-000000000002';
  v_structure uuid := 'd5d20000-0000-4000-8000-000000000001';
  v_expired_structure uuid := 'd5d20000-0000-4000-8000-000000000002';
  v_preview uuid := 'e5d20000-0000-4000-8000-000000000001';
  v_historical_preview uuid := 'e5d20000-0000-4000-8000-000000000002';
  v_snapshot uuid;
  v_historical_snapshot uuid;
  v_now timestamptz := now();
  v_hash_a text := repeat('a', 64);
  v_hash_b text := repeat('b', 64);
  v_hash_c text := repeat('c', 64);
  v_denied boolean;
  v_count integer;
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
      'phase5d2-user-a@example.invalid',
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
      'phase5d2-user-b@example.invalid',
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

  insert into public.canvas_source_structure_sessions (
    id,
    user_id,
    canvas_connection_id,
    course_id,
    source_count,
    source_manifest,
    block_count,
    block_manifest,
    structure_version,
    created_at,
    expires_at
  )
  values (
    v_structure,
    v_user_a,
    v_connection_a,
    v_course_a,
    1,
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
        'normalized_content_sha256', v_hash_a,
        'stored_content_sha256', null,
        'parser_version', 'canvas-html-structured-blocks-v1',
        'ocr_version', null
      )
    ),
    2,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'f5d20000-0000-4000-8000-000000000001',
        'source_ordinal', 1,
        'block_ordinal', 1,
        'block_kind', 'heading',
        'block_text', 'Fictional Heading',
        'block_sha256', v_hash_b,
        'heading_level', 1,
        'list_depth', null,
        'list_style', null,
        'table_structure', null,
        'page_number', null,
        'slide_number', null,
        'module_position', null,
        'parser_version', 'canvas-html-structured-blocks-v1',
        'ocr_version', null,
        'selectable', true,
        'selected_by_default', true
      ),
      jsonb_build_object(
        'id', 'f5d20000-0000-4000-8000-000000000002',
        'source_ordinal', 1,
        'block_ordinal', 2,
        'block_kind', 'table',
        'block_text', 'Term | Meaning',
        'block_sha256', v_hash_c,
        'heading_level', null,
        'list_depth', null,
        'list_style', null,
        'table_structure', '{"rows":[{"cells":[{"text":"Term","header":true},{"text":"Meaning","header":true}]}]}'::jsonb,
        'page_number', null,
        'slide_number', null,
        'module_position', null,
        'parser_version', 'canvas-html-structured-blocks-v1',
        'ocr_version', null,
        'selectable', true,
        'selected_by_default', true
      )
    ),
    'canvas-structured-blocks-v1',
    v_now,
    v_now + interval '1 hour'
  );

  insert into _phase5d2_checks
  values (
    'structure_session_inserted',
    exists (
      select 1
      from public.canvas_source_structure_sessions
      where id = v_structure
        and user_id = v_user_a
        and block_count = 2
    ),
    'owned private structure session accepts bounded manifests'
  );

  v_denied := false;
  begin
    update public.canvas_source_structure_sessions
    set structure_version = 'mutated'
    where id = v_structure;
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d2_checks
  values (
    'structure_session_update_rejected',
    v_denied,
    'immutable structure session update trigger fires'
  );

  v_denied := false;
  begin
    insert into public.canvas_source_structure_sessions (
      user_id,
      canvas_connection_id,
      course_id,
      source_count,
      source_manifest,
      block_count,
      block_manifest,
      structure_version,
      created_at,
      expires_at
    )
    values (
      v_user_a,
      v_connection_b,
      v_course_b,
      1,
      jsonb_build_array(jsonb_build_object('ordinal', 1)),
      1,
      jsonb_build_array(jsonb_build_object('id', 'cross-owner')),
      'canvas-structured-blocks-v1',
      v_now,
      v_now + interval '1 hour'
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d2_checks
  values (
    'cross_owner_structure_session_denied',
    v_denied,
    'owner validation rejects mismatched connection/course context'
  );

  insert into public.canvas_source_structure_sessions (
    id,
    user_id,
    canvas_connection_id,
    course_id,
    source_count,
    source_manifest,
    block_count,
    block_manifest,
    structure_version,
    created_at,
    expires_at
  )
  values (
    v_expired_structure,
    v_user_a,
    v_connection_a,
    v_course_a,
    1,
    jsonb_build_array(jsonb_build_object('ordinal', 1)),
    1,
    jsonb_build_array(jsonb_build_object('id', 'expired')),
    'canvas-structured-blocks-v1',
    v_now - interval '2 hours',
    v_now - interval '1 hour'
  );

  perform public.cleanup_expired_canvas_source_structure_sessions(v_now);

  insert into _phase5d2_checks
  values (
    'expired_structure_cleanup',
    not exists (
      select 1
      from public.canvas_source_structure_sessions
      where id = v_expired_structure
    ),
    'service cleanup helper deletes expired private structure sessions'
  );

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
    selected_block_manifest,
    normalization_version,
    created_at,
    expires_at
  )
  values (
    v_preview,
    v_user_a,
    v_connection_a,
    v_course_a,
    'Fictional selected preview text',
    v_hash_a,
    'Fictional Selective Reviewer',
    1,
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
        'normalized_content_sha256', v_hash_a,
        'stored_content_sha256', null,
        'parser_version', 'canvas-html-structured-blocks-v1',
        'ocr_version', null
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'ordinal', 1,
        'source_ordinal', 1,
        'block_ordinal', 1,
        'block_kind', 'heading',
        'block_text', 'Fictional Heading',
        'block_sha256', v_hash_b,
        'heading_level', 1,
        'list_depth', null,
        'list_style', null,
        'table_structure', null,
        'page_number', null,
        'slide_number', null,
        'module_position', null,
        'parser_version', 'canvas-html-structured-blocks-v1',
        'ocr_version', null
      ),
      jsonb_build_object(
        'ordinal', 2,
        'source_ordinal', 1,
        'block_ordinal', 2,
        'block_kind', 'table',
        'block_text', 'Term | Meaning',
        'block_sha256', v_hash_c,
        'heading_level', null,
        'list_depth', null,
        'list_style', null,
        'table_structure', '{"rows":[{"cells":[{"text":"Term","header":true},{"text":"Meaning","header":true}]}]}'::jsonb,
        'page_number', 1,
        'slide_number', null,
        'module_position', null,
        'parser_version', 'canvas-html-structured-blocks-v1',
        'ocr_version', null
      )
    ),
    'canvas-selective-preview-v1',
    v_now,
    v_now + interval '1 hour'
  );

  select snapshot.id
  into v_snapshot
  from public.create_reviewer_source_snapshot(
    v_user_a,
    v_preview,
    'Fictional Selective Reviewer',
    'Fictional selected preview text plus edit',
    v_hash_a,
    true
  ) snapshot;

  insert into _phase5d2_checks
  values (
    'selected_blocks_copied_to_snapshot',
    (
      select count(*) = 2
      from public.reviewer_source_snapshot_blocks
      where source_snapshot_id = v_snapshot
        and user_id = v_user_a
    ),
    'snapshot RPC copies selected block manifest into immutable block rows'
  );

  insert into _phase5d2_checks
  values (
    'snapshot_block_context_correct',
    exists (
      select 1
      from public.reviewer_source_snapshot_blocks block
      join public.reviewer_source_snapshot_items item
        on item.id = block.source_snapshot_item_id
       and item.source_snapshot_id = block.source_snapshot_id
       and item.user_id = block.user_id
      where block.source_snapshot_id = v_snapshot
        and block.ordinal = 2
        and block.block_kind = 'table'
        and block.block_sha256 = v_hash_c
        and block.page_number = 1
        and block.table_structure is not null
        and item.ordinal = block.source_ordinal
    ),
    'block rows keep source relationship, hash, page, and private table structure'
  );

  v_denied := false;
  begin
    update public.reviewer_source_snapshot_blocks
    set block_text = 'mutated'
    where source_snapshot_id = v_snapshot;
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d2_checks
  values (
    'snapshot_block_update_rejected',
    v_denied,
    'immutable selected-block update trigger fires'
  );

  select count(*)
  into v_count
  from public.reviewer_source_snapshot_blocks
  where source_snapshot_id = v_snapshot;

  perform public.create_reviewer_source_snapshot(
    v_user_a,
    v_preview,
    'Fictional Selective Reviewer',
    'Fictional selected preview text plus edit',
    v_hash_a,
    true
  );

  insert into _phase5d2_checks
  values (
    'snapshot_reuse_does_not_duplicate_blocks',
    (
      select count(*) = v_count
      from public.reviewer_source_snapshot_blocks
      where source_snapshot_id = v_snapshot
    ),
    'reused exact snapshot does not duplicate selected-block rows'
  );

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
    selected_block_manifest,
    normalization_version,
    created_at,
    expires_at
  )
  values (
    v_historical_preview,
    v_user_a,
    v_connection_a,
    v_course_a,
    'Historical fictional preview text',
    v_hash_b,
    'Historical Fictional Reviewer',
    1,
    jsonb_build_array(
      jsonb_build_object(
        'ordinal', 1,
        'source_type', 'page',
        'source_title', 'Historical Fictional Page',
        'source_row_id', null,
        'canvas_connection_id', v_connection_a,
        'course_id', v_course_a,
        'canvas_course_id', '101',
        'canvas_source_object_id', 'page-legacy',
        'module_id', null,
        'module_item_id', null,
        'file_id', null,
        'file_kind', null,
        'mime_type', null,
        'page_count', null,
        'canvas_updated_at', v_now,
        'local_synced_at', v_now,
        'normalized_content_sha256', v_hash_b,
        'stored_content_sha256', null,
        'parser_version', 'canvas-html-visible-text-v1',
        'ocr_version', null
      )
    ),
    '[]'::jsonb,
    'canvas-source-preview-v1',
    v_now,
    v_now + interval '1 hour'
  );

  select snapshot.id
  into v_historical_snapshot
  from public.create_reviewer_source_snapshot(
    v_user_a,
    v_historical_preview,
    'Historical Fictional Reviewer',
    'Historical fictional edited text',
    v_hash_b,
    true
  ) snapshot;

  insert into _phase5d2_checks
  values (
    'historical_preview_without_blocks_supported',
    (
      exists (
        select 1
        from public.reviewer_source_snapshot_items
        where source_snapshot_id = v_historical_snapshot
      )
      and not exists (
        select 1
        from public.reviewer_source_snapshot_blocks
        where source_snapshot_id = v_historical_snapshot
      )
    ),
    'Phase 5D.1 style previews with empty selected-block manifests remain readable'
  );
end $$;

select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  notes
from _phase5d2_checks
order by check_name;

rollback;
