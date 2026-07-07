begin;

create temp table _phase5d3_checks (
  check_name text primary key,
  passed boolean not null,
  notes text not null default ''
) on commit drop;

insert into _phase5d3_checks (check_name, passed, notes)
with expected_tables(table_name) as (
  values
    ('reviewer_source_snapshot_item_relationships')
), expected_columns(table_name, column_name) as (
  values
    ('canvas_source_preview_sessions', 'source_relationship_manifest'),
    ('canvas_source_preview_sessions', 'duplicate_analysis_version'),
    ('canvas_source_structure_sessions', 'source_relationship_manifest'),
    ('canvas_source_structure_sessions', 'duplicate_analysis_version'),
    ('reviewer_source_snapshot_item_relationships', 'id'),
    ('reviewer_source_snapshot_item_relationships', 'user_id'),
    ('reviewer_source_snapshot_item_relationships', 'source_snapshot_id'),
    ('reviewer_source_snapshot_item_relationships', 'source_snapshot_item_id'),
    (
      'reviewer_source_snapshot_item_relationships',
      'related_source_snapshot_item_id'
    ),
    ('reviewer_source_snapshot_item_relationships', 'relationship_type'),
    ('reviewer_source_snapshot_item_relationships', 'relationship_group_key'),
    ('reviewer_source_snapshot_item_relationships', 'reference_type'),
    ('reviewer_source_snapshot_item_relationships', 'reference_ordinal'),
    ('reviewer_source_snapshot_item_relationships', 'created_at')
), expected_indexes(index_name) as (
  values
    ('reviewer_source_snapshot_item_relationships_unique'),
    ('reviewer_source_snapshot_item_relationships_snapshot_idx'),
    ('reviewer_source_snapshot_item_relationships_item_idx'),
    ('reviewer_source_snapshot_item_relationships_related_idx'),
    ('reviewer_source_snapshot_item_relationships_user_idx')
), expected_constraints(conname) as (
  values
    ('canvas_source_preview_sessions_relationship_manifest_array'),
    ('canvas_source_preview_sessions_duplicate_version_length'),
    ('canvas_source_structure_sessions_relationship_manifest_array'),
    ('canvas_source_structure_sessions_duplicate_version_length'),
    ('reviewer_source_snapshot_item_relationships_snapshot_owner_fkey'),
    ('reviewer_source_snapshot_item_relationships_item_context_fkey'),
    ('reviewer_source_snapshot_item_relationships_related_context_fke'),
    ('reviewer_source_snapshot_item_relationships_type_allowed'),
    ('reviewer_source_snapshot_item_relationships_reference_type_allo'),
    ('reviewer_source_snapshot_item_relationships_group_key_length'),
    ('reviewer_source_snapshot_item_relationships_reference_consisten'),
    ('reviewer_source_snapshot_item_relationships_self_consistency')
), expected_functions(signature) as (
  values
    (
      'public.create_reviewer_source_snapshot(uuid,uuid,text,text,text,boolean)'::regprocedure
    )
)
select 'relationship_table_exists', count(*) = 1, 'private relationship table exists'
from information_schema.tables t
join expected_tables e on e.table_name = t.table_name
where t.table_schema = 'public'
union all
select 'expected_columns_exist', count(*) = 14, 'relationship and session columns exist'
from information_schema.columns c
join expected_columns e
  on e.table_name = c.table_name
  and e.column_name = c.column_name
where c.table_schema = 'public'
union all
select 'expected_indexes_exist', count(*) = 5, 'relationship lookup indexes exist'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected_indexes e on e.index_name = c.relname
where n.nspname = 'public'
union all
select 'expected_constraints_exist', count(*) = 12, 'ownership, type, reference, and manifest constraints exist'
from pg_constraint c
join expected_constraints e on e.conname = c.conname
union all
select 'rls_enabled', bool_and(c.relrowsecurity), 'RLS enabled on private relationship table'
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
    and p.grantee in ('PUBLIC', 'public', 'anon', 'authenticated')
    and p.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
), 'anon/authenticated/public have no direct relationship table access'
union all
select 'service_role_table_grants', not exists (
  select 1
  from expected_tables e
  where not has_table_privilege('service_role', format('public.%I', e.table_name), 'select')
     or not has_table_privilege('service_role', format('public.%I', e.table_name), 'insert')
     or not has_table_privilege('service_role', format('public.%I', e.table_name), 'delete')
     or has_table_privilege('service_role', format('public.%I', e.table_name), 'update')
), 'service role can read/insert/delete private relationship rows without update'
union all
select 'snapshot_rpc_not_public', not exists (
  select 1
  from expected_functions f
  where has_function_privilege('public', f.signature, 'execute')
     or has_function_privilege('anon', f.signature, 'execute')
     or has_function_privilege('authenticated', f.signature, 'execute')
), 'snapshot RPC is not executable by direct clients'
union all
select 'snapshot_rpc_service_role', not exists (
  select 1
  from expected_functions f
  where not has_function_privilege('service_role', f.signature, 'execute')
), 'service role can execute snapshot RPC';

create function pg_temp.source_manifest_json(
  p_ordinal integer,
  p_connection_id uuid,
  p_course_id uuid,
  p_canvas_course_id text,
  p_source_type text,
  p_source_title text,
  p_canvas_source_object_id text,
  p_hash text
)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'ordinal', p_ordinal,
    'source_type', p_source_type,
    'source_title', p_source_title,
    'source_row_id', null,
    'canvas_connection_id', p_connection_id,
    'course_id', p_course_id,
    'canvas_course_id', p_canvas_course_id,
    'canvas_source_object_id', p_canvas_source_object_id,
    'module_id', null,
    'module_item_id', null,
    'file_id', null,
    'file_kind', null,
    'mime_type', null,
    'page_count', null,
    'canvas_updated_at', now(),
    'local_synced_at', now(),
    'normalized_content_sha256', p_hash,
    'stored_content_sha256', null,
    'parser_version', 'canvas-html-visible-text-v1',
    'ocr_version', null
  );
$$;

do $$
declare
  v_user_a uuid := 'a5d30000-0000-4000-8000-000000000001';
  v_user_b uuid := 'a5d30000-0000-4000-8000-000000000002';
  v_connection_a uuid := 'b5d30000-0000-4000-8000-000000000001';
  v_connection_b uuid := 'b5d30000-0000-4000-8000-000000000002';
  v_course_a uuid := 'c5d30000-0000-4000-8000-000000000001';
  v_course_b uuid := 'c5d30000-0000-4000-8000-000000000002';
  v_preview_a uuid := 'd5d30000-0000-4000-8000-000000000001';
  v_preview_historical uuid := 'd5d30000-0000-4000-8000-000000000002';
  v_preview_b uuid := 'd5d30000-0000-4000-8000-000000000003';
  v_snapshot_a uuid;
  v_snapshot_historical uuid;
  v_snapshot_b uuid;
  v_item_a1 uuid;
  v_item_a2 uuid;
  v_item_historical uuid;
  v_item_b uuid;
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
      'phase5d3-user-a@example.invalid',
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
      'phase5d3-user-b@example.invalid',
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
    selected_block_manifest,
    source_relationship_manifest,
    duplicate_analysis_version,
    normalization_version,
    created_at,
    expires_at
  )
  values (
    v_preview_a,
    v_user_a,
    v_connection_a,
    v_course_a,
    'Fictional preview with duplicate relationships',
    v_hash_a,
    'Fictional Relationship Reviewer',
    2,
    jsonb_build_array(
      pg_temp.source_manifest_json(
        1,
        v_connection_a,
        v_course_a,
        '101',
        'page',
        'Fictional Page A',
        'page-a',
        v_hash_b
      ),
      pg_temp.source_manifest_json(
        2,
        v_connection_a,
        v_course_a,
        '101',
        'assignment',
        'Fictional Assignment B',
        'assignment-b',
        v_hash_b
      )
    ),
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'source_ordinal', 1,
        'related_source_ordinal', 2,
        'relationship_type', 'same_content',
        'relationship_group_key', 'same-content-1',
        'reference_type', 'none',
        'reference_ordinal', 0
      ),
      jsonb_build_object(
        'source_ordinal', 1,
        'related_source_ordinal', 1,
        'relationship_type', 'canvas_reference',
        'relationship_group_key', 'canvas-reference-1',
        'reference_type', 'module',
        'reference_ordinal', 1
      )
    ),
    'canvas-source-duplicate-analysis-v1',
    'canvas-source-preview-v1',
    v_now,
    v_now + interval '1 hour'
  );

  select snapshot.id
  into v_snapshot_a
  from public.create_reviewer_source_snapshot(
    v_user_a,
    v_preview_a,
    'Fictional Relationship Reviewer',
    'Fictional preview with duplicate relationships',
    v_hash_a,
    false
  ) snapshot;

  select id into v_item_a1
  from public.reviewer_source_snapshot_items
  where source_snapshot_id = v_snapshot_a
    and ordinal = 1;

  select id into v_item_a2
  from public.reviewer_source_snapshot_items
  where source_snapshot_id = v_snapshot_a
    and ordinal = 2;

  insert into _phase5d3_checks
  values (
    'relationships_copied_to_snapshot',
    (
      select count(*) = 2
      from public.reviewer_source_snapshot_item_relationships
      where source_snapshot_id = v_snapshot_a
        and user_id = v_user_a
    ),
    'snapshot RPC copies duplicate/reference manifest rows'
  );

  insert into _phase5d3_checks
  values (
    'same_snapshot_relationship_context',
    exists (
      select 1
      from public.reviewer_source_snapshot_item_relationships rel
      where rel.source_snapshot_id = v_snapshot_a
        and rel.user_id = v_user_a
        and rel.source_snapshot_item_id = v_item_a1
        and rel.related_source_snapshot_item_id = v_item_a2
        and rel.relationship_type = 'same_content'
        and rel.relationship_group_key = 'same-content-1'
        and rel.reference_type = 'none'
        and rel.reference_ordinal = 0
    ),
    'same-snapshot content relationship joins both immutable items'
  );

  v_denied := false;
  begin
    insert into public.reviewer_source_snapshot_item_relationships (
      user_id,
      source_snapshot_id,
      source_snapshot_item_id,
      related_source_snapshot_item_id,
      relationship_type,
      relationship_group_key,
      reference_type,
      reference_ordinal
    )
    values (
      v_user_a,
      v_snapshot_a,
      v_item_a1,
      v_item_a2,
      'same_content',
      'same-content-1',
      'none',
      0
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d3_checks
  values (
    'duplicate_relationship_rejected',
    v_denied,
    'deterministic unique index rejects duplicate relationship rows'
  );

  v_denied := false;
  begin
    insert into public.reviewer_source_snapshot_item_relationships (
      user_id,
      source_snapshot_id,
      source_snapshot_item_id,
      related_source_snapshot_item_id,
      relationship_type,
      relationship_group_key,
      reference_type,
      reference_ordinal
    )
    values (
      v_user_a,
      v_snapshot_a,
      v_item_a1,
      v_item_a2,
      'nearly_same',
      'invalid-type',
      'none',
      0
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d3_checks
  values (
    'invalid_relationship_type_rejected',
    v_denied,
    'relationship type check is enforced'
  );

  v_denied := false;
  begin
    update public.reviewer_source_snapshot_item_relationships
    set relationship_group_key = 'mutated'
    where source_snapshot_id = v_snapshot_a;
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d3_checks
  values (
    'relationship_update_rejected',
    v_denied,
    'immutable relationship update trigger fires'
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
    v_preview_historical,
    v_user_a,
    v_connection_a,
    v_course_a,
    'Historical fictional preview text',
    v_hash_c,
    'Historical Fictional Reviewer',
    1,
    jsonb_build_array(
      pg_temp.source_manifest_json(
        1,
        v_connection_a,
        v_course_a,
        '101',
        'page',
        'Historical Fictional Page',
        'page-historical',
        v_hash_c
      )
    ),
    '[]'::jsonb,
    'canvas-source-preview-v1',
    v_now,
    v_now + interval '1 hour'
  );

  select snapshot.id
  into v_snapshot_historical
  from public.create_reviewer_source_snapshot(
    v_user_a,
    v_preview_historical,
    'Historical Fictional Reviewer',
    'Historical fictional preview text',
    v_hash_c,
    false
  ) snapshot;

  select id into v_item_historical
  from public.reviewer_source_snapshot_items
  where source_snapshot_id = v_snapshot_historical
    and ordinal = 1;

  insert into _phase5d3_checks
  values (
    'historical_snapshot_without_relationships_valid',
    (
      exists (
        select 1
        from public.reviewer_source_snapshot_items
        where id = v_item_historical
      )
      and not exists (
        select 1
        from public.reviewer_source_snapshot_item_relationships
        where source_snapshot_id = v_snapshot_historical
      )
    ),
    'Phase 5D.1 snapshots without relationship manifests remain valid'
  );

  v_denied := false;
  begin
    insert into public.reviewer_source_snapshot_item_relationships (
      user_id,
      source_snapshot_id,
      source_snapshot_item_id,
      related_source_snapshot_item_id,
      relationship_type,
      relationship_group_key,
      reference_type,
      reference_ordinal
    )
    values (
      v_user_a,
      v_snapshot_a,
      v_item_a1,
      v_item_historical,
      'same_content',
      'cross-snapshot',
      'none',
      0
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d3_checks
  values (
    'cross_snapshot_relationship_rejected',
    v_denied,
    'composite item FK requires both items to belong to the same snapshot'
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
    v_preview_b,
    v_user_b,
    v_connection_b,
    v_course_b,
    'Cross-user fictional preview text',
    v_hash_b,
    'Cross-user Fictional Reviewer',
    1,
    jsonb_build_array(
      pg_temp.source_manifest_json(
        1,
        v_connection_b,
        v_course_b,
        '202',
        'page',
        'Cross-user Fictional Page',
        'page-cross-user',
        v_hash_b
      )
    ),
    '[]'::jsonb,
    'canvas-source-preview-v1',
    v_now,
    v_now + interval '1 hour'
  );

  select snapshot.id
  into v_snapshot_b
  from public.create_reviewer_source_snapshot(
    v_user_b,
    v_preview_b,
    'Cross-user Fictional Reviewer',
    'Cross-user fictional preview text',
    v_hash_b,
    false
  ) snapshot;

  select id into v_item_b
  from public.reviewer_source_snapshot_items
  where source_snapshot_id = v_snapshot_b
    and ordinal = 1;

  v_denied := false;
  begin
    insert into public.reviewer_source_snapshot_item_relationships (
      user_id,
      source_snapshot_id,
      source_snapshot_item_id,
      related_source_snapshot_item_id,
      relationship_type,
      relationship_group_key,
      reference_type,
      reference_ordinal
    )
    values (
      v_user_a,
      v_snapshot_a,
      v_item_a1,
      v_item_b,
      'same_content',
      'cross-user',
      'none',
      0
    );
  exception
    when others then
      v_denied := true;
  end;

  insert into _phase5d3_checks
  values (
    'cross_user_relationship_rejected',
    v_denied,
    'composite owner FKs reject cross-user relationship rows'
  );

  select count(*)
  into v_count
  from public.reviewer_source_snapshot_item_relationships
  where source_snapshot_id = v_snapshot_a;

  perform public.create_reviewer_source_snapshot(
    v_user_a,
    v_preview_a,
    'Fictional Relationship Reviewer',
    'Fictional preview with duplicate relationships',
    v_hash_a,
    false
  );

  insert into _phase5d3_checks
  values (
    'snapshot_reuse_does_not_duplicate_relationships',
    (
      select count(*) = v_count
      from public.reviewer_source_snapshot_item_relationships
      where source_snapshot_id = v_snapshot_a
    ),
    'reused exact snapshot does not duplicate relationship rows'
  );
end $$;

select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  notes
from _phase5d3_checks
order by check_name;

rollback;
