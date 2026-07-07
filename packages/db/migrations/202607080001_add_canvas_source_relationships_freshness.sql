create extension if not exists pgcrypto;

alter table public.canvas_source_preview_sessions
  add column if not exists source_relationship_manifest jsonb not null default '[]'::jsonb,
  add column if not exists duplicate_analysis_version text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_source_preview_sessions_relationship_manifest_array'
      and conrelid = 'public.canvas_source_preview_sessions'::regclass
  ) then
    alter table public.canvas_source_preview_sessions
      add constraint canvas_source_preview_sessions_relationship_manifest_array
      check (
        jsonb_typeof(source_relationship_manifest) = 'array'
        and jsonb_array_length(source_relationship_manifest) <= 400
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_source_preview_sessions_duplicate_version_length'
      and conrelid = 'public.canvas_source_preview_sessions'::regclass
  ) then
    alter table public.canvas_source_preview_sessions
      add constraint canvas_source_preview_sessions_duplicate_version_length
      check (
        duplicate_analysis_version is null
        or (
          char_length(btrim(duplicate_analysis_version)) > 0
          and char_length(duplicate_analysis_version) <= 80
        )
      );
  end if;
end;
$$;

alter table public.canvas_source_structure_sessions
  add column if not exists source_relationship_manifest jsonb not null default '[]'::jsonb,
  add column if not exists duplicate_analysis_version text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_source_structure_sessions_relationship_manifest_array'
      and conrelid = 'public.canvas_source_structure_sessions'::regclass
  ) then
    alter table public.canvas_source_structure_sessions
      add constraint canvas_source_structure_sessions_relationship_manifest_array
      check (
        jsonb_typeof(source_relationship_manifest) = 'array'
        and jsonb_array_length(source_relationship_manifest) <= 400
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'canvas_source_structure_sessions_duplicate_version_length'
      and conrelid = 'public.canvas_source_structure_sessions'::regclass
  ) then
    alter table public.canvas_source_structure_sessions
      add constraint canvas_source_structure_sessions_duplicate_version_length
      check (
        duplicate_analysis_version is null
        or (
          char_length(btrim(duplicate_analysis_version)) > 0
          and char_length(duplicate_analysis_version) <= 80
        )
      );
  end if;
end;
$$;

create table if not exists public.reviewer_source_snapshot_item_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_snapshot_id uuid not null,
  source_snapshot_item_id uuid not null,
  related_source_snapshot_item_id uuid not null,
  relationship_type text not null,
  relationship_group_key text not null,
  reference_type text not null default 'none',
  reference_ordinal integer not null default 0,
  created_at timestamptz not null default now(),
  constraint reviewer_source_snapshot_item_relationships_snapshot_owner_fkey
    foreign key (source_snapshot_id, user_id)
    references public.reviewer_source_snapshots (id, user_id)
    on delete cascade,
  constraint reviewer_source_snapshot_item_relationships_item_context_fkey
    foreign key (source_snapshot_item_id, source_snapshot_id, user_id)
    references public.reviewer_source_snapshot_items (
      id,
      source_snapshot_id,
      user_id
    )
    on delete cascade,
  constraint reviewer_source_snapshot_item_relationships_related_context_fkey
    foreign key (related_source_snapshot_item_id, source_snapshot_id, user_id)
    references public.reviewer_source_snapshot_items (
      id,
      source_snapshot_id,
      user_id
    )
    on delete cascade,
  constraint reviewer_source_snapshot_item_relationships_type_allowed
    check (
      relationship_type in (
        'same_source',
        'same_content',
        'canvas_reference'
      )
    ),
  constraint reviewer_source_snapshot_item_relationships_reference_type_allowed
    check (
      reference_type in (
        'none',
        'module',
        'page',
        'assignment',
        'announcement'
      )
    ),
  constraint reviewer_source_snapshot_item_relationships_group_key_length
    check (
      char_length(btrim(relationship_group_key)) > 0
      and char_length(relationship_group_key) <= 120
    ),
  constraint reviewer_source_snapshot_item_relationships_reference_consistency
    check (
      (
        relationship_type = 'canvas_reference'
        and reference_type <> 'none'
        and reference_ordinal > 0
      )
      or (
        relationship_type <> 'canvas_reference'
        and reference_type = 'none'
        and reference_ordinal = 0
      )
    ),
  constraint reviewer_source_snapshot_item_relationships_self_consistency
    check (
      source_snapshot_item_id <> related_source_snapshot_item_id
      or relationship_type = 'canvas_reference'
    )
);

create unique index if not exists reviewer_source_snapshot_item_relationships_unique
  on public.reviewer_source_snapshot_item_relationships (
    source_snapshot_id,
    source_snapshot_item_id,
    related_source_snapshot_item_id,
    relationship_type,
    relationship_group_key,
    reference_type,
    reference_ordinal
  );

create index if not exists reviewer_source_snapshot_item_relationships_snapshot_idx
  on public.reviewer_source_snapshot_item_relationships (
    source_snapshot_id,
    relationship_type
  );

create index if not exists reviewer_source_snapshot_item_relationships_item_idx
  on public.reviewer_source_snapshot_item_relationships (source_snapshot_item_id);

create index if not exists reviewer_source_snapshot_item_relationships_related_idx
  on public.reviewer_source_snapshot_item_relationships (
    related_source_snapshot_item_id
  );

create index if not exists reviewer_source_snapshot_item_relationships_user_idx
  on public.reviewer_source_snapshot_item_relationships (
    user_id,
    created_at desc
  );

drop trigger if exists reviewer_source_snapshot_item_relationships_no_update
  on public.reviewer_source_snapshot_item_relationships;
create trigger reviewer_source_snapshot_item_relationships_no_update
before update on public.reviewer_source_snapshot_item_relationships
for each row
execute function public.prevent_source_provenance_update();

create or replace function public.create_reviewer_source_snapshot(
  p_user_id uuid,
  p_preview_session_id uuid,
  p_source_title text,
  p_exact_source_text text,
  p_exact_source_sha256 text,
  p_was_edited boolean
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.canvas_source_preview_sessions%rowtype;
  v_snapshot public.reviewer_source_snapshots%rowtype;
  v_expected_block_count integer;
  v_inserted_block_count integer;
  v_expected_relationship_count integer;
  v_inserted_relationship_count integer;
begin
  if p_user_id is null
    or p_preview_session_id is null
    or nullif(btrim(p_source_title), '') is null
    or p_exact_source_text is null
    or p_exact_source_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception using errcode = 'P0001', message = 'source_snapshot_invalid';
  end if;

  select *
  into v_session
  from public.canvas_source_preview_sessions session
  where session.id = p_preview_session_id
    and session.user_id = p_user_id;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'canvas_preview_session_not_found';
  end if;

  if v_session.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'canvas_preview_session_expired';
  end if;

  insert into public.reviewer_source_snapshots (
    user_id,
    preview_session_id,
    canvas_connection_id,
    course_id,
    source_mode,
    source_title,
    original_preview_sha256,
    exact_source_text,
    exact_source_sha256,
    source_count,
    was_edited,
    normalization_version
  )
  values (
    p_user_id,
    p_preview_session_id,
    v_session.canvas_connection_id,
    v_session.course_id,
    'canvas',
    left(btrim(p_source_title), 120),
    v_session.original_preview_sha256,
    p_exact_source_text,
    p_exact_source_sha256,
    v_session.source_count,
    coalesce(p_was_edited, false),
    v_session.normalization_version
  )
  on conflict on constraint reviewer_source_snapshots_dedupe_unique
  do nothing
  returning *
  into v_snapshot;

  if v_snapshot.id is null then
    select *
    into v_snapshot
    from public.reviewer_source_snapshots snapshot
    where snapshot.user_id = p_user_id
      and snapshot.preview_session_id = p_preview_session_id
      and snapshot.exact_source_sha256 = p_exact_source_sha256
      and snapshot.source_title = left(btrim(p_source_title), 120);
  else
    insert into public.reviewer_source_snapshot_items (
      user_id,
      source_snapshot_id,
      ordinal,
      source_type,
      source_title,
      source_row_id,
      canvas_connection_id,
      course_id,
      canvas_course_id,
      canvas_source_object_id,
      module_id,
      module_item_id,
      file_id,
      file_kind,
      mime_type,
      page_count,
      canvas_updated_at,
      local_synced_at,
      normalized_content_sha256,
      stored_content_sha256,
      parser_version,
      ocr_version
    )
    select
      p_user_id,
      v_snapshot.id,
      manifest.ordinal,
      manifest.source_type,
      manifest.source_title,
      manifest.source_row_id,
      manifest.canvas_connection_id,
      manifest.course_id,
      manifest.canvas_course_id,
      manifest.canvas_source_object_id,
      manifest.module_id,
      manifest.module_item_id,
      manifest.file_id,
      manifest.file_kind,
      manifest.mime_type,
      manifest.page_count,
      manifest.canvas_updated_at,
      manifest.local_synced_at,
      manifest.normalized_content_sha256,
      manifest.stored_content_sha256,
      manifest.parser_version,
      manifest.ocr_version
    from jsonb_to_recordset(v_session.source_manifest) as manifest(
      ordinal integer,
      source_type text,
      source_title text,
      source_row_id uuid,
      canvas_connection_id uuid,
      course_id uuid,
      canvas_course_id text,
      canvas_source_object_id text,
      module_id text,
      module_item_id text,
      file_id text,
      file_kind text,
      mime_type text,
      page_count integer,
      canvas_updated_at timestamptz,
      local_synced_at timestamptz,
      normalized_content_sha256 text,
      stored_content_sha256 text,
      parser_version text,
      ocr_version text
    );

    v_expected_block_count :=
      jsonb_array_length(coalesce(v_session.selected_block_manifest, '[]'::jsonb));

    if v_expected_block_count > 0 then
      with inserted_blocks as (
        insert into public.reviewer_source_snapshot_blocks (
          user_id,
          source_snapshot_id,
          source_snapshot_item_id,
          ordinal,
          source_ordinal,
          block_ordinal,
          block_kind,
          block_text,
          block_sha256,
          heading_level,
          list_depth,
          list_style,
          table_structure,
          page_number,
          slide_number,
          module_position,
          parser_version,
          ocr_version
        )
        select
          p_user_id,
          v_snapshot.id,
          item.id,
          block.ordinal,
          block.source_ordinal,
          block.block_ordinal,
          block.block_kind,
          block.block_text,
          block.block_sha256,
          block.heading_level,
          block.list_depth,
          block.list_style,
          block.table_structure,
          block.page_number,
          block.slide_number,
          block.module_position,
          block.parser_version,
          block.ocr_version
        from jsonb_to_recordset(v_session.selected_block_manifest) as block(
          ordinal integer,
          source_ordinal integer,
          block_ordinal integer,
          block_kind text,
          block_text text,
          block_sha256 text,
          heading_level integer,
          list_depth integer,
          list_style text,
          table_structure jsonb,
          page_number integer,
          slide_number integer,
          module_position integer,
          parser_version text,
          ocr_version text
        )
        join public.reviewer_source_snapshot_items item
          on item.source_snapshot_id = v_snapshot.id
         and item.user_id = p_user_id
         and item.ordinal = block.source_ordinal
        returning 1
      )
      select count(*) into v_inserted_block_count
      from inserted_blocks;

      if v_inserted_block_count <> v_expected_block_count then
        raise exception using errcode = 'P0001', message = 'source_snapshot_failed';
      end if;
    end if;

    v_expected_relationship_count :=
      jsonb_array_length(coalesce(v_session.source_relationship_manifest, '[]'::jsonb));

    if v_expected_relationship_count > 0 then
      with inserted_relationships as (
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
        select
          p_user_id,
          v_snapshot.id,
          source_item.id,
          related_item.id,
          relationship.relationship_type,
          relationship.relationship_group_key,
          relationship.reference_type,
          relationship.reference_ordinal
        from jsonb_to_recordset(v_session.source_relationship_manifest) as relationship(
          source_ordinal integer,
          related_source_ordinal integer,
          relationship_type text,
          relationship_group_key text,
          reference_type text,
          reference_ordinal integer
        )
        join public.reviewer_source_snapshot_items source_item
          on source_item.source_snapshot_id = v_snapshot.id
         and source_item.user_id = p_user_id
         and source_item.ordinal = relationship.source_ordinal
        join public.reviewer_source_snapshot_items related_item
          on related_item.source_snapshot_id = v_snapshot.id
         and related_item.user_id = p_user_id
         and related_item.ordinal = relationship.related_source_ordinal
        returning 1
      )
      select count(*) into v_inserted_relationship_count
      from inserted_relationships;

      if v_inserted_relationship_count <> v_expected_relationship_count then
        raise exception using errcode = 'P0001', message = 'source_snapshot_failed';
      end if;
    end if;
  end if;

  if v_snapshot.id is null then
    raise exception using errcode = 'P0001', message = 'source_snapshot_failed';
  end if;

  return query select v_snapshot.id;
end;
$$;

alter table public.reviewer_source_snapshot_item_relationships enable row level security;

revoke all on table public.reviewer_source_snapshot_item_relationships from public;
revoke all on table public.reviewer_source_snapshot_item_relationships from anon;
revoke all on table public.reviewer_source_snapshot_item_relationships from authenticated;
grant select, insert, delete on table public.reviewer_source_snapshot_item_relationships
  to service_role;

revoke all on function public.create_reviewer_source_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean
) from public;
revoke all on function public.create_reviewer_source_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean
) from anon;
revoke all on function public.create_reviewer_source_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean
) from authenticated;
grant execute on function public.create_reviewer_source_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  boolean
) to service_role;
